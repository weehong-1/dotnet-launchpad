import reservedSegments from '@site/src/generated/reserved-name-segments.json';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

export type Delivery = 'manual' | 'tailscale' | 'other';

export type Project = {
  id: string;
  projectName: string;
  shortName: string;
  worker: boolean;
  auditing: boolean;
  apiVersioning: boolean | null;
  sonar: boolean;
  qodana: boolean;
  delivery: Delivery | null;
  createdAt: string;
  updatedAt: string;
};

/** Checked Done Condition ids, per project, per step. */
export type Progress = Record<string, Record<string, string[]>>;

export type ExportFile = {
  format: 'dotnet-project-setup';
  version: 1;
  exportedAt: string;
  projects: Project[];
  progress: Progress;
};

const KEYS = {
  projects: 'dps.projects.v1',
  active: 'dps.activeProject.v1',
  progress: 'dps.progress.v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** False when the value could not be stored (private mode, blocked site data, full storage). */
function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const DELIVERIES: readonly (Delivery | null)[] = ['manual', 'tailscale', 'other', null];

function isProject(x: unknown): x is Project {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.trim() !== '' &&
    typeof p.projectName === 'string' &&
    isValidProjectName(p.projectName) &&
    typeof p.shortName === 'string' &&
    isValidShortName(p.shortName) &&
    typeof p.worker === 'boolean' &&
    typeof p.auditing === 'boolean' &&
    (p.apiVersioning === null || typeof p.apiVersioning === 'boolean') &&
    typeof p.sonar === 'boolean' &&
    typeof p.qodana === 'boolean' &&
    DELIVERIES.includes(p.delivery as Delivery | null) &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

/** Projects and progress, or null when anything in them is malformed. */
export function validateProjects(x: unknown): Project[] | null {
  if (!Array.isArray(x) || !x.every(isProject)) return null;
  // Ids are Progress keys: they must be unique.
  return new Set(x.map((p) => p.id)).size === x.length ? x : null;
}

export function validateProgress(x: unknown): Progress | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  for (const steps of Object.values(x)) {
    if (typeof steps !== 'object' || steps === null || Array.isArray(steps)) return null;
    for (const checks of Object.values(steps)) {
      if (!Array.isArray(checks) || !checks.every((c) => typeof c === 'string')) return null;
    }
  }
  return x as Progress;
}

export const PROJECT_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*(\.[A-Z][A-Za-z0-9]*)*$/;
// At most 32 characters: the Short Name is also the Linux service account name.
export const SHORT_NAME_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

/** Existing Ubuntu, PostgreSQL and web server accounts: the service account must be a new, dedicated one. */
export const RESERVED_SHORT_NAMES = new Set([
  'root', 'daemon', 'bin', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news', 'uucp', 'proxy', 'www-data',
  'backup', 'list', 'irc', 'gnats', 'nobody', 'systemd-network', 'systemd-resolve', 'systemd-timesync',
  'messagebus', 'syslog', 'sshd', 'ubuntu', 'admin', 'sudo', 'postgres', 'nginx', 'certbot', 'docker', 'lxd',
]);

/** Type names the Boilerplate's C# uses (generated from the Reference by scripts/build-scaffold.mjs). */
const RESERVED_SEGMENTS = new Set<string>(reservedSegments);

/** The first segment of the Project Name that would shadow a Boilerplate type, if any. */
export function conflictingSegment(name: string): string | undefined {
  return name.split('.').find((s) => RESERVED_SEGMENTS.has(s));
}

export function isValidProjectName(name: string): boolean {
  return PROJECT_NAME_PATTERN.test(name) && conflictingSegment(name) === undefined;
}

export function isValidShortName(name: string): boolean {
  return SHORT_NAME_PATTERN.test(name) && !RESERVED_SHORT_NAMES.has(name);
}

export function deriveShortName(projectName: string): string {
  const last = projectName.split('.').filter(Boolean).pop() ?? '';
  return last.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function newProject(): Project {
  const now = new Date().toISOString();
  return {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    projectName: '',
    shortName: '',
    worker: true,
    auditing: true,
    apiVersioning: null,
    sonar: false,
    qodana: false,
    delivery: null,
    createdAt: now,
    updatedAt: now,
  };
}

type Store = {
  loaded: boolean;
  /** False once a change could not be stored: it then lasts only until the page is reloaded. */
  persistent: boolean;
  projects: Project[];
  active: Project | null;
  progress: Progress;
  saveProject: (project: Project) => boolean;
  deleteProject: (id: string) => void;
  setActive: (id: string | null) => void;
  toggleCheck: (stepId: string, checkId: string) => void;
  importFile: (file: ExportFile) => {count: number; persisted: boolean};
  exportFile: () => ExportFile;
};

const ProjectContext = createContext<Store | null>(null);

export function ProjectProvider({children}: {children: ReactNode}): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [persistent, setPersistent] = useState(true);
  const store = useCallback((key: string, value: unknown): boolean => {
    const ok = write(key, value);
    if (!ok) setPersistent(false);
    return ok;
  }, []);

  useEffect(() => {
    setProjects(validateProjects(read<unknown>(KEYS.projects, [])) ?? []);
    setActiveId(read<string | null>(KEYS.active, null));
    setProgress(validateProgress(read<unknown>(KEYS.progress, {})) ?? {});
    try {
      window.localStorage.setItem('dps.probe', '1');
      window.localStorage.removeItem('dps.probe');
    } catch {
      setPersistent(false);
    }
    setLoaded(true);
  }, []);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.projects) setProjects(validateProjects(read<unknown>(KEYS.projects, [])) ?? []);
      if (e.key === KEYS.active) setActiveId(read(KEYS.active, null));
      if (e.key === KEYS.progress) setProgress(validateProgress(read<unknown>(KEYS.progress, {})) ?? {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persistProjects = useCallback(
    (next: Project[]): boolean => {
      setProjects(next);
      return store(KEYS.projects, next);
    },
    [store],
  );

  const setActive = useCallback((id: string | null) => {
    setActiveId(id);
    store(KEYS.active, id);
  }, [store]);

  const saveProject = useCallback(
    (project: Project) => {
      const stamped = {...project, updatedAt: new Date().toISOString()};
      const exists = projects.some((p) => p.id === project.id);
      const ok = persistProjects(exists ? projects.map((p) => (p.id === project.id ? stamped : p)) : [...projects, stamped]);
      setActive(project.id);
      return ok;
    },
    [projects, persistProjects, setActive],
  );

  const deleteProject = useCallback(
    (id: string) => {
      persistProjects(projects.filter((p) => p.id !== id));
      const nextProgress = {...progress};
      delete nextProgress[id];
      setProgress(nextProgress);
      store(KEYS.progress, nextProgress);
      if (activeId === id) setActive(null);
    },
    [projects, progress, activeId, persistProjects, setActive],
  );

  const toggleCheck = useCallback(
    (stepId: string, checkId: string) => {
      if (!activeId) return;
      const forProject = {...(progress[activeId] ?? {})};
      const checked = new Set(forProject[stepId] ?? []);
      if (checked.has(checkId)) checked.delete(checkId);
      else checked.add(checkId);
      forProject[stepId] = [...checked];
      const next = {...progress, [activeId]: forProject};
      setProgress(next);
      store(KEYS.progress, next);
    },
    [activeId, progress],
  );

  const exportFile = useCallback(
    (): ExportFile => ({
      format: 'dotnet-project-setup',
      version: 1,
      exportedAt: new Date().toISOString(),
      projects,
      progress,
    }),
    [projects, progress],
  );

  const importFile = useCallback(
    (file: ExportFile): {count: number; persisted: boolean} => {
      // Validate everything before writing anything, so a bad file can never break stored data.
      const incoming = file?.format === 'dotnet-project-setup' && file.version === 1 ? validateProjects(file.projects) : null;
      const incomingProgress = validateProgress(file?.progress ?? {});
      if (!incoming || !incomingProgress) {
        throw new Error('Not a valid .NET Launchpad export file; nothing was imported.');
      }
      const byId = new Map(projects.map((p) => [p.id, p]));
      for (const p of incoming) byId.set(p.id, p);
      const projectsStored = persistProjects([...byId.values()]);
      const nextProgress = {...progress, ...incomingProgress};
      setProgress(nextProgress);
      const progressStored = store(KEYS.progress, nextProgress);
      return {count: incoming.length, persisted: projectsStored && progressStored};
    },
    [projects, progress, persistProjects],
  );

  const active = projects.find((p) => p.id === activeId) ?? null;

  const value = useMemo<Store>(
    () => ({loaded, persistent, projects, active, progress, saveProject, deleteProject, setActive, toggleCheck, importFile, exportFile}),
    [loaded, persistent, projects, active, progress, saveProject, deleteProject, setActive, toggleCheck, importFile, exportFile],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects(): Store {
  const store = useContext(ProjectContext);
  if (!store) throw new Error('useProjects must be used inside ProjectProvider');
  return store;
}

/** Optional Components and Project Decisions that switch content on or off. */
export type Flag = 'worker' | 'auditing' | 'sonar' | 'qodana';

/** With no project, every optional part is shown so the Reference reads complete. */
export function flagOn(project: Project | null, flag: Flag): boolean {
  if (!project) return true;
  return Boolean(project[flag]);
}

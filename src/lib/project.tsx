import reservedSegments from '@site/src/generated/reserved-name-segments.json';
import addonData from '@site/src/data/addons.json';
import {migrateProgress} from '@site/src/data/progress-migration';
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

export type Delivery = 'manual' | 'tailscale' | 'other';

export type Project = {
  id: string;
  projectName: string;
  shortName: string;
  // Add-ons (src/data/addons.json): off for a new project, switched on from the Add-ons pages
  postgres: boolean;
  messaging: boolean;
  worker: boolean;
  auditing: boolean;
  auth: boolean;
  golive: boolean;
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
  version: 1 | 2;
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
    ADDON_IDS.every((f) => typeof p[f] === 'boolean') &&
    (p.apiVersioning === null || typeof p.apiVersioning === 'boolean') &&
    typeof p.sonar === 'boolean' &&
    typeof p.qodana === 'boolean' &&
    DELIVERIES.includes(p.delivery as Delivery | null) &&
    typeof p.createdAt === 'string' &&
    typeof p.updatedAt === 'string'
  );
}

/**
 * Projects saved before add-ons existed (Boilerplate v1.0) had PostgreSQL, Messaging, Authentication
 * and Go live built in: they get those add-ons on, keep their Worker and Auditing choice, and are
 * marked so their Progress can be moved to the new steps once.
 */
function upgrade(x: unknown): {project: unknown; fromV1: boolean} {
  if (typeof x !== 'object' || x === null) return {project: x, fromV1: false};
  const p = x as Record<string, unknown>;
  if (typeof p.postgres === 'boolean') return {project: x, fromV1: false};
  const v1: Record<string, unknown> = {...p, postgres: true, messaging: true, auth: true, golive: true};
  return {project: withRequirements(v1 as Project), fromV1: true};
}

/** Projects, or null when anything in them is malformed; `upgraded` lists the ids of v1 projects. */
export function readProjects(x: unknown): {projects: Project[]; upgraded: string[]} | null {
  if (!Array.isArray(x)) return null;
  const read = x.map(upgrade);
  const projects = validateProjects(read.map((r) => r.project));
  if (!projects) return null;
  return {projects, upgraded: projects.filter((_, i) => read[i].fromV1).map((p) => p.id)};
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
    postgres: false,
    messaging: false,
    worker: false,
    auditing: false,
    auth: false,
    golive: false,
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
    const stored = readProjects(read<unknown>(KEYS.projects, []));
    const storedProgress = validateProgress(read<unknown>(KEYS.progress, {})) ?? {};
    setProjects(stored?.projects ?? []);
    setActiveId(read<string | null>(KEYS.active, null));
    if (stored?.upgraded.length) {
      // Saved before add-ons existed: write the upgraded projects and their moved Progress back once.
      const migrated = migrateProgress(storedProgress, stored.upgraded);
      write(KEYS.projects, stored.projects);
      write(KEYS.progress, migrated);
      setProgress(migrated);
    } else {
      setProgress(storedProgress);
    }
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
      if (e.key === KEYS.projects) setProjects(readProjects(read<unknown>(KEYS.projects, []))?.projects ?? []);
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
      version: 2,
      exportedAt: new Date().toISOString(),
      projects,
      progress,
    }),
    [projects, progress],
  );

  const importFile = useCallback(
    (file: ExportFile): {count: number; persisted: boolean} => {
      // Validate everything before writing anything, so a bad file can never break stored data.
      const read = file?.format === 'dotnet-project-setup' && (file.version === 1 || file.version === 2) ? readProjects(file.projects) : null;
      const rawProgress = validateProgress(file?.progress ?? {});
      if (!read || !rawProgress) {
        throw new Error('Not a valid .NET Launchpad export file; nothing was imported.');
      }
      const incoming = read.projects;
      const incomingProgress = migrateProgress(rawProgress, read.upgraded);
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

/** Add-ons and Project Decisions that switch content on or off. */
export type AddOn = 'postgres' | 'messaging' | 'worker' | 'auditing' | 'auth' | 'golive';
export type Flag = AddOn | 'sonar' | 'qodana';

type AddOnDef = {id: AddOn; letter: string; cli: string; requires: AddOn[]; label: {en: string; zh: string}};
export const ADDONS = addonData.addons as AddOnDef[];
const ADDON_IDS = ADDONS.map((a) => a.id);
export const FLAGS: Flag[] = [...ADDON_IDS, ...addonData.decisions.map((d) => d.id as Flag)];

/** The add-ons an add-on needs, directly or through another (Worker needs Messaging and PostgreSQL). */
export function requirementsOf(id: AddOn): AddOn[] {
  const direct = ADDONS.find((a) => a.id === id)?.requires ?? [];
  return [...new Set(direct.flatMap((r) => [r, ...requirementsOf(r)]))];
}

/** The add-ons that need this one, directly or through another. */
export function dependentsOf(id: AddOn): AddOn[] {
  return ADDONS.filter((a) => requirementsOf(a.id).includes(id)).map((a) => a.id);
}

/** Turns on everything the project's add-ons need. */
export function withRequirements(project: Project): Project {
  const next = {...project};
  for (const a of ADDONS) if (next[a.id]) for (const r of requirementsOf(a.id)) next[r] = true;
  return next;
}

/** Switches one add-on: on also turns on what it needs, off also turns off what needs it. */
export function withAddOn(project: Project, id: AddOn, on: boolean): Project {
  const next = {...project, [id]: on};
  for (const other of on ? requirementsOf(id) : dependentsOf(id)) next[other] = on;
  return next;
}

/** With no project, every optional part is shown so the Reference reads complete. */
export function flagOn(project: Project | null, flag: Flag): boolean {
  if (!project) return true;
  return Boolean(project[flag]);
}

import React, {useEffect, useRef, useState, type ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {useProjects, type ExportFile, type Project, type Progress} from '@site/src/lib/project';
import {useLocale} from '@site/src/lib/i18n';
import {applies, checksFor, pick, STEPS, type Step} from '@site/src/data/steps';
import styles from './projects.module.css';

type Summary = {done: number; total: number; next: Step | null};

function summarize(project: Project, progress: Progress): Summary {
  const checked = progress[project.id] ?? {};
  let done = 0;
  let total = 0;
  let next: Step | null = null;
  for (const step of STEPS) {
    if (!applies(step, project)) continue;
    const checks = checksFor(step, project);
    const ok = new Set(checked[step.id] ?? []);
    const stepDone = checks.filter((c) => ok.has(c.id)).length;
    done += stepDone;
    total += checks.length;
    if (!next && stepDone < checks.length) next = step;
  }
  return {done, total, next};
}

function download(file: ExportFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dotnet-launchpad-${file.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function ProjectsTable(): ReactNode {
  const {loaded, persistent, projects, active, progress, setActive, deleteProject, exportFile, importFile} = useProjects();
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  if (!loaded) return null;

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const {count, persisted} = importFile(JSON.parse(await f.text()) as ExportFile);
      setMessage(
        persisted
          ? translate({id: 'projects.imported', message: 'Imported {count} project(s).'}, {count})
          : translate(
              {id: 'projects.importedSessionOnly', message: 'Imported {count} project(s) for this session only: this browser is not storing site data, so they will be gone after a reload.'},
              {count},
            ),
      );
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err));
    }
  };


  return (
    <>
      {!persistent && (
        <p className={styles.warning} role="alert">
          <Translate id="projects.notPersistent">This browser is not storing site data (private mode, blocked or full storage): projects and progress will be lost on reload. Export JSON to keep them.</Translate>
        </p>
      )}
      <div className={styles.toolbar}>
        <Link className={`btn btn-primary ${styles.newButton}`} to="/docs/setup/project-settings?new=1">
          <Translate id="projects.new">New project</Translate>
        </Link>
        <button type="button" className="btn btn-secondary" disabled={projects.length === 0} onClick={() => download(exportFile())}>
          <Translate id="projects.export">Export JSON</Translate>
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()}>
          <Translate id="projects.import">Import JSON</Translate>
        </button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={onImport} />
        {message && <span role="status" className={styles.message}>{message}</span>}
      </div>

      {projects.length === 0 ? (
        <p className="text-muted">
          <Translate id="projects.empty">No projects yet. Progress is stored in this browser; export it to keep a backup or move to another machine.</Translate>
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={`table ${styles.table}`}>
            <thead>
              <tr>
                <th><Translate id="projects.col.project">Project</Translate></th>
                <th className={styles.progressCol}><Translate id="projects.col.progress">Progress</Translate></th>
                <th><Translate id="projects.col.next">Next step</Translate></th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const s = summarize(p, progress);
                const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
                const isActive = active?.id === p.id;
                return (
                  <tr key={p.id} className={isActive ? styles.activeRow : undefined}>
                    <td className={styles.projectCell}>
                      <div className={styles.name}>
                        <strong>{p.projectName}</strong>
                        {isActive && <span className="tag tag-accent"><Translate id="projects.active">Active</Translate></span>}
                      </div>
                      <div className={`${styles.meta} text-muted`}>
                        <code>{p.shortName}</code> · Worker {p.worker ? '✓' : '✗'} · {translate({id: 'projects.auditing', message: 'Auditing'})} {p.auditing ? '✓' : '✗'}
                      </div>
                    </td>
                    <td>
                      <div className={styles.progress}>
                        <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={s.total} aria-valuenow={s.done} aria-label={`${pct}%`}>
                          <div className={styles.progressFill} style={{width: `${pct}%`}} />
                        </div>
                        <span className={styles.progressCount}>{s.done}/{s.total}</span>
                      </div>
                    </td>
                    <td>
                      {s.next ? (
                        <Link to={`/docs/setup/${s.next.id}`} onClick={() => setActive(p.id)}>
                          {s.next.num} {pick(s.next.title, locale)}
                        </Link>
                      ) : (
                        <Translate id="projects.complete">Setup complete</Translate>
                      )}
                    </td>
                    <td className={styles.actions}>
                      {!isActive && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActive(p.id)}>
                          <Translate id="projects.makeActive">Make active</Translate>
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(p)}>
                        <Translate id="projects.delete">Delete</Translate>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {deleting && (
        <DeleteDialog
          project={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteProject(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function DeleteDialog({project, onCancel, onConfirm}: {project: Project; onCancel: () => void; onConfirm: () => void}): ReactNode {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const title = translate({id: 'projects.delete', message: 'Delete'});
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onClick={(e) => e.stopPropagation()}>
        <div id="delete-title" className="dialog-title">{title}</div>
        <div className="dialog-body">
          {translate({id: 'projects.confirmDelete', message: 'Delete {name} and its progress? This cannot be undone.'}, {name: project.projectName})}
        </div>
        <div className="dialog-actions">
          <button ref={cancel} type="button" className="btn btn-secondary" onClick={onCancel}>
            <Translate id="projects.cancel">Cancel</Translate>
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>{title}</button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage(): ReactNode {
  return (
    <Layout title={translate({id: 'projects.title', message: 'Projects'})} description="Every project set up with the Setup Flow and how far each has come.">
      <main className={styles.page}>
        <h1 className={styles.title}><Translate id="projects.title">Projects</Translate></h1>
        <p className={styles.intro}>
          <Translate id="projects.intro">Every project you are setting up and how far each has come. The active project personalises the code on every page.</Translate>
        </p>
        <ProjectsTable />
      </main>
    </Layout>
  );
}

import React, {useEffect, useState, type ReactNode} from 'react';
import {useLocation} from '@docusaurus/router';
import {
  deriveShortName,
  newProject,
  conflictingSegment,
  PROJECT_NAME_PATTERN,
  isValidShortName,
  useProjects,
  type Project,
} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import CheckRow from './CheckRow';
import styles from './styles.module.css';

export default function ProjectSettingsForm(): ReactNode {
  const {loaded, projects, active, saveProject} = useProjects();
  const t = useStrings();
  const [draft, setDraft] = useState<Project>(newProject);
  const [shortTouched, setShortTouched] = useState(false);
  const [saved, setSaved] = useState<'no' | 'stored' | 'session'>('no');

  // ?new=1 (from "New project") starts a blank draft; otherwise edit the active project once storage has loaded.
  const startNew = new URLSearchParams(useLocation().search).has('new');
  useEffect(() => {
    if (!loaded || !active) return;
    if (startNew && active.id !== draft.id) return;
    setDraft(active);
    setShortTouched(true);
  }, [loaded, active?.id]);

  const isNew = !active || active.id !== draft.id;
  const nameConflict = conflictingSegment(draft.projectName);
  const nameOk = PROJECT_NAME_PATTERN.test(draft.projectName) && nameConflict === undefined;
  const shortOk = isValidShortName(draft.shortName);

  const update = (patch: Partial<Project>) => {
    setSaved('no');
    setDraft((d) => ({...d, ...patch}));
  };

  const onName = (projectName: string) =>
    update(shortTouched ? {projectName} : {projectName, shortName: deriveShortName(projectName)});

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameOk || !shortOk) return;
    // Save only this form's fields on top of the latest stored project, so Project Decisions
    // changed meanwhile (for example in another tab) are kept.
    const latest = projects.find((p) => p.id === draft.id);
    const {projectName, shortName, worker, auditing} = draft;
    const ok = saveProject(latest ? {...latest, projectName, shortName, worker, auditing} : draft);
    setSaved(ok ? 'stored' : 'session');
  };

  const startAnother = () => {
    setDraft(newProject());
    setShortTouched(false);
    setSaved('no');
  };

  const nameError = draft.projectName !== '' && !nameOk;
  const shortError = draft.shortName !== '' && !shortOk;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.formTitle}>
        <strong>{isNew ? t.creating : `${t.editing}: ${active?.projectName}`}</strong>
        {!isNew && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={startAnother}>
            {t.newProject}
          </button>
        )}
      </div>

      <div className={styles.fields}>
        <label className={styles.field}>
          <span>{t.projectName}</span>
          <input className="input" value={draft.projectName} placeholder="Company.Product" onChange={(e) => onName(e.target.value.trim())} aria-invalid={nameError} />
          <small className={nameError ? styles.fieldError : undefined}>
            {!nameError ? t.projectNameHelp : nameConflict ? t.projectNameConflict(nameConflict) : t.invalidProjectName}
          </small>
        </label>

        <label className={styles.field}>
          <span>{t.shortName}</span>
          <input
            className="input"
            value={draft.shortName}
            placeholder="product"
            onChange={(e) => {
              setShortTouched(true);
              update({shortName: e.target.value.trim()});
            }}
            aria-invalid={shortError}
          />
          <small className={shortError ? styles.fieldError : undefined}>{shortError ? t.invalidShortName : t.shortNameHelp}</small>
        </label>
      </div>

      <CheckRow checked={draft.worker} onChange={(worker) => update({worker})}>
        <strong>{t.worker}</strong> · {t.workerHelp}
      </CheckRow>
      <CheckRow checked={draft.auditing} onChange={(auditing) => update({auditing})}>
        <strong>{t.auditing}</strong> · {t.auditingHelp}
      </CheckRow>

      <div className={styles.formActions}>
        <button type="submit" className="btn btn-primary" disabled={!nameOk || !shortOk}>
          {t.save}
        </button>
        {saved === 'stored' && <span role="status" className={styles.savedNote}>✓ {t.saved}</span>}
        {saved === 'session' && <span role="alert" className={styles.fieldError}>{t.savedSessionOnly}</span>}
      </div>
    </form>
  );
}

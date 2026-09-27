import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {useProjects} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import styles from './styles.module.css';

export default function ActiveProjectBar(): ReactNode {
  const {loaded, persistent, projects, active, setActive} = useProjects();
  const t = useStrings();
  if (!loaded) return <div className={styles.bar} aria-hidden="true" />;
  const warning = persistent ? null : (
    <div className={styles.storageWarning} role="alert">
      {t.notPersistent} <Link to="/projects">{t.manageProjects}</Link>
    </div>
  );

  if (!active) {
    return (
      <>
        {warning}
        <div className={styles.bar}>
          <span className={styles.barMain}>{t.noProject}</span>
          <span className={styles.barActions}>
            {projects.length > 0 && (
              <select className={`input ${styles.barSelect}`} aria-label={t.switchProject} value="" onChange={(e) => setActive(e.target.value)}>
                <option value="">{t.switchProject}…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>
            )}
            <Link to="/docs/setup/project-settings">{t.startProject}</Link>
          </span>
        </div>
      </>
    );
  }

  const flag = (label: string, on: boolean) => (
    <span className={on ? 'tag tag-accent' : 'tag tag-neutral'}>{label}: {on ? t.on : t.off}</span>
  );

  return (
    <>
      {warning}
      <div className={styles.bar}>
        <span className={styles.barMain}>
          <strong>{t.project}: {active.projectName}</strong>
          <code>{active.shortName}</code>
          {flag(t.worker, active.worker)}
          {flag(t.auditing, active.auditing)}
        </span>
        <span className={styles.barActions}>
          {projects.length > 1 && (
            <select className={`input ${styles.barSelect}`} aria-label={t.switchProject} value={active.id} onChange={(e) => setActive(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
          )}
          <Link to="/projects">{t.manageProjects}</Link>
        </span>
      </div>
    </>
  );
}

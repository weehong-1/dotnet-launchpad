import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useProjects} from '@site/src/lib/project';
import {useLocale} from '@site/src/lib/i18n';
import {PHASES, pick, statusLabel, stepStatus} from '@site/src/data/steps';
import styles from './styles.module.css';

/** The whole Setup Flow with the active project's progress per step. */
export default function StepList(): ReactNode {
  const {active, progress} = useProjects();
  const locale = useLocale();
  return (
    <div className={styles.phases}>
      {PHASES.map((phase) => (
        <div key={phase.id} className={styles.phaseRow}>
          <h3>
            {phase.num}. {pick(phase.title, locale)}
          </h3>
          <div>
            {phase.steps.map((s) => {
              const status = stepStatus(s, active, progress);
              return (
                <Link key={s.id} to={`/docs/setup/${s.id}`} className={clsx(styles.stepRow, status.skip && styles.stepSkipped)}>
                  <span className={styles.stepNum}>{s.num}</span>
                  <span>{pick(s.title, locale)}</span>
                  <span className={clsx(styles.stepStatus, status.complete && styles.stepComplete)}>{statusLabel(status, active)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

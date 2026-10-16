import React, {type ReactNode} from 'react';
import {useProjects} from '@site/src/lib/project';
import {useLocale, useStrings} from '@site/src/lib/i18n';
import {checksFor, pick, stepById, stepStatus} from '@site/src/data/steps';
import CheckRow from './CheckRow';
import RichText from './RichText';
import styles from './styles.module.css';

export default function DoneConditions({step: stepId}: {step: string}): ReactNode {
  const {active, progress, toggleCheck} = useProjects();
  const t = useStrings();
  const locale = useLocale();
  const step = stepById(stepId);
  const status = stepStatus(step, active, progress);
  if (status.skip) return null;

  const checks = checksFor(step, active);
  const checked = new Set(active ? progress[active.id]?.[step.id] ?? [] : []);

  return (
    <section className={status.complete ? `${styles.done} ${styles.doneComplete}` : styles.done} aria-labelledby={`done-${step.id}`}>
      <div className={styles.doneHeader}>
        <h2 id={`done-${step.id}`}>{t.doneConditions}</h2>
        {active && (
          <span className={styles.doneCount}>
            {status.complete ? `✓ ${t.stepDone}` : `${status.done} ${t.of} ${status.total}`}
          </span>
        )}
      </div>
      <ul className={styles.doneList}>
        {checks.map((c) => (
          <li key={c.id}>
            <CheckRow checked={checked.has(c.id)} disabled={!active} onChange={() => toggleCheck(step.id, c.id)}>
              <RichText text={pick(c.text, locale)} project={active} />
            </CheckRow>
          </li>
        ))}
      </ul>
      <p className={`${styles.doneHint} text-muted`}>{active ? t.doneHint : t.noProjectChecks}</p>
    </section>
  );
}

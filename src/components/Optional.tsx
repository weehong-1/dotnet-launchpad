import React, {type ReactNode} from 'react';
import {flagOn, useProjects, type Flag} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import styles from './styles.module.css';

type Props = {
  /** Comma separated flags; the content applies when any of them is on. */
  when: string;
  /** Marks a whole page (the Worker section) rather than a part of one. */
  page?: boolean;
  children: ReactNode;
};

/** Content for an Optional Component or Project Decision; collapsed when the active project does not use it. */
export default function Optional({when, page, children}: Props): ReactNode {
  const {active} = useProjects();
  const t = useStrings();
  const flags = when.split(',').map((f) => f.trim()) as Flag[];
  if (!active || flags.some((f) => flagOn(active, f))) return <>{children}</>;
  const label = flags.map((f) => t[f]).join(' / ');
  return (
    <details className={page ? styles.hiddenPage : styles.hidden}>
      <summary>{t.hiddenBecause(label, active.projectName)}</summary>
      {children}
    </details>
  );
}

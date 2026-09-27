import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {isActiveSidebarItem} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import isInternalUrl from '@docusaurus/isInternalUrl';
import IconExternalLink from '@theme/Icon/ExternalLink';
import type {Props} from '@theme/DocSidebarItem/Link';
import {useProjects} from '@site/src/lib/project';
import {STEPS, statusLabel, stepStatus} from '@site/src/data/steps';
import styles from './styles.module.css';

// Ejected from the classic theme: labels like "2.4 Api" or "A. Demo code" put the number in its own
// column, and Setup Flow steps show the active project's status on the right.
const NUMBERED = /^((?:\d+\.)*\d+\.?|[A-Z]\.)\s+(.+)$/;
const STEP_HREF = /\/docs\/setup\/([^/?#]+)\/?$/;

export default function DocSidebarItemLink({item, onItemClick, activePath, level, index, ...props}: Props): ReactNode {
  const {href, label, className, autoAddBaseUrl} = item;
  const isActive = isActiveSidebarItem(item, activePath);
  const isInternalLink = isInternalUrl(href);
  const numbered = NUMBERED.exec(label);
  const {active, progress} = useProjects();
  const step = STEPS.find((s) => s.id === STEP_HREF.exec(href)?.[1]);
  const status = step ? stepStatus(step, active, progress) : null;
  return (
    <li
      className={clsx(ThemeClassNames.docs.docSidebarItemLink, ThemeClassNames.docs.docSidebarItemLinkLevel(level), 'menu__list-item', className)}
      key={label}>
      <Link
        className={clsx('menu__link', styles.link, !isInternalLink && styles.menuExternalLink, status?.skip && styles.skipped, {'menu__link--active': isActive})}
        autoAddBaseUrl={autoAddBaseUrl}
        aria-current={isActive ? 'page' : undefined}
        to={href}
        {...(isInternalLink && {onClick: onItemClick ? () => onItemClick(item) : undefined})}
        {...props}>
        {numbered ? (
          <>
            <span className={styles.num}>{numbered[1].replace(/\.$/, '')}</span>
            <span className={styles.linkLabel}>{numbered[2]}</span>
          </>
        ) : (
          <span className={clsx(styles.linkLabel, styles.wide)}>{label}</span>
        )}
        {status && active && <span className={clsx(styles.status, status.complete && styles.complete)}>{statusLabel(status, active)}</span>}
        {!isInternalLink && <IconExternalLink />}
      </Link>
    </li>
  );
}

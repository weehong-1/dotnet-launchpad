import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {ADDONS, dependentsOf, requirementsOf, useProjects, withAddOn, type AddOn} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import styles from './styles.module.css';

/** Whether the active project includes an add-on, with a button to add or remove it. */
export default function AddOnSwitch({addon, href}: {addon: AddOn; href?: string}): ReactNode {
  const {loaded, active, saveProject} = useProjects();
  const t = useStrings();
  const def = ADDONS.find((a) => a.id === addon)!;
  const requires = requirementsOf(addon);
  const name = (id: AddOn) => t[id];

  const requiresLine = (
    <span className="text-muted">
      {requires.length ? `${t.addonRequires}: ${requires.map(name).join(', ')}` : t.addonRequiresNothing}
    </span>
  );

  if (!loaded) return null;
  if (!active) {
    return (
      <div className={styles.addonSwitch}>
        <strong>
          {def.letter}. {name(addon)}
        </strong>
        {requiresLine}
        {href && <Link to={href}>→</Link>}
      </div>
    );
  }

  const on = active[addon];
  const missing = requires.filter((r) => !active[r]);
  const dependents = dependentsOf(addon).filter((d) => active[d]);

  const toggle = () => {
    if (on && dependents.length && !window.confirm(t.addonConfirmOff(dependents.map(name).join(', ')))) return;
    saveProject(withAddOn(active, addon, !on));
  };

  return (
    <div className={on ? `${styles.addonSwitch} ${styles.addonOn}` : styles.addonSwitch}>
      <strong>
        {def.letter}. {name(addon)}
      </strong>
      <span className={on ? 'tag tag-accent' : 'tag tag-neutral'}>{on ? `✓ ${t.addonIncluded(active.projectName)}` : t.addonNotIncluded(active.projectName)}</span>
      {requiresLine}
      <span className={styles.addonActions}>
        {!on && missing.length > 0 && <small className="text-muted">{t.addonAlsoOn(missing.map(name).join(', '))}</small>}
        <button type="button" className={on ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'} onClick={toggle}>
          {on ? t.addonRemove : t.addonAdd}
        </button>
        {href && <Link to={href}>→</Link>}
      </span>
    </div>
  );
}

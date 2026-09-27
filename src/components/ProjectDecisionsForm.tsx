import React, {type ReactNode} from 'react';
import Admonition from '@theme/Admonition';
import {useProjects, type Delivery, type Project} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import CheckRow from './CheckRow';
import styles from './styles.module.css';

function RadioRow({name, checked, onChange, children}: {name: string; checked: boolean; onChange: () => void; children: ReactNode}): ReactNode {
  return (
    <div className={styles.radioRow}>
      <label className="radio">
        <input type="radio" name={name} checked={checked} onChange={onChange} />
        <span className="dot" aria-hidden="true" />
        {children}
      </label>
    </div>
  );
}

export default function ProjectDecisionsForm(): ReactNode {
  const {loaded, active, saveProject} = useProjects();
  const t = useStrings();
  if (!loaded) return null;
  if (!active) return <Admonition type="warning">{t.createFirst}</Admonition>;

  const set = (patch: Partial<Project>) => saveProject({...active, ...patch});
  const needsOwnWork = active.apiVersioning === true || active.delivery === 'tailscale' || active.delivery === 'other';

  return (
    <div className={styles.form}>
      <fieldset className={styles.fieldset}>
        <legend>{t.apiVersioning}</legend>
        {([null, false, true] as const).map((v) => (
          <RadioRow key={String(v)} name="apiVersioning" checked={active.apiVersioning === v} onChange={() => set({apiVersioning: v})}>
            {v === null ? t.undecided : v ? t.yes : t.no}
          </RadioRow>
        ))}
        <small className={`${styles.fieldHelp} text-muted`}>{t.apiVersioningHelp}</small>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>CI</legend>
        <CheckRow checked={active.sonar} onChange={(sonar) => set({sonar})}>
          <strong>{t.sonar}</strong> · {t.sonarHelp}
        </CheckRow>
        <CheckRow checked={active.qodana} onChange={(qodana) => set({qodana})}>
          <strong>{t.qodana}</strong> · {t.qodanaHelp}
        </CheckRow>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>{t.delivery}</legend>
        {(
          [
            ['manual', t.deliveryManual],
            ['tailscale', t.deliveryTailscale],
            ['other', t.deliveryOther],
          ] as [Delivery, string][]
        ).map(([v, label]) => (
          <RadioRow key={v} name="delivery" checked={active.delivery === v} onChange={() => set({delivery: v})}>
            {label}
          </RadioRow>
        ))}
      </fieldset>

      {needsOwnWork && <p className={styles.formNote}>{t.needsOwnWork}</p>}
    </div>
  );
}

import React, {type ReactNode} from 'react';
import styles from './styles.module.css';

type Props = {checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void; children: ReactNode};

/** A ruled row with the design's square checkbox; the native input stays in place for keyboard and screen readers. */
export default function CheckRow({checked, disabled, onChange, children}: Props): ReactNode {
  return (
    <label className={styles.checkRow}>
      <input type="checkbox" className="check-input" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="box" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

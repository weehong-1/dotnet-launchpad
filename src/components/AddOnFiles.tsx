import React, {type ReactNode} from 'react';
import {useProjects, type AddOn, type Flag} from '@site/src/lib/project';
import {useLocale, useStrings} from '@site/src/lib/i18n';
import {codeOf, FILES, previewFlags} from '@site/src/lib/boilerplate';
import {filterLines} from '@site/src/lib/substitute';
import {FileBlock} from './LayerFiles';
import styles from './styles.module.css';

/**
 * What an add-on brings: its new files in full, and the existing files it changes, in full with the
 * added lines highlighted. Everything is shown as it will look in the active project once the add-on
 * is in, so the page can be read before switching the add-on on.
 */
export default function AddOnFiles({addon}: {addon: AddOn}): ReactNode {
  const {active} = useProjects();
  const locale = useLocale();
  const t = useStrings();
  const flags = previewFlags(addon, active);
  const on = new Set<Flag>(flags);
  const exists = (when: Flag[]) => when.every((f) => on.has(f));

  const added = FILES.filter((f) => f.when.includes(addon) && exists(f.when));
  const changed = FILES.filter((f) => !f.when.includes(addon) && exists(f.when))
    .map((f) => {
      const h = {flag: addon as Flag, lines: [] as number[]};
      filterLines(codeOf(f, locale), on, h);
      return {file: f, count: h.lines.length};
    })
    .filter((c) => c.count > 0);

  return (
    <div className={styles.fileList}>
      <p className="text-muted">{active ? t.addonPreview(active.projectName) : t.addonPreviewNoProject}</p>
      {added.length > 0 && (
        <>
          <h3>{t.newFiles} ({added.length})</h3>
          {added.map((f) => (
            <FileBlock key={f.path} file={f} flags={flags} />
          ))}
        </>
      )}
      {changed.length > 0 && (
        <>
          <h3>{t.changedFiles} ({changed.length})</h3>
          {changed.map(({file, count}) => (
            <FileBlock key={file.path} file={file} flags={flags} highlight={addon} note={<span className={styles.fileAdded}>+{count}</span>} />
          ))}
        </>
      )}
    </div>
  );
}

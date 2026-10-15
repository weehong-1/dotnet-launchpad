import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import ThemeCodeBlock from '@theme/CodeBlock';
import {useLocale, useStrings} from '@site/src/lib/i18n';
import {codeOf, FILES, languageOf, referenceHref, type BoilerplateFile} from '@site/src/lib/boilerplate';
import {replacePlaceholders} from '@site/src/lib/substitute';
import {useProjects, type Flag} from '@site/src/lib/project';
import styles from './styles.module.css';

// The swizzled CodeBlock (src/theme/CodeBlock) also takes the flags to render a Boilerplate file with.
const CodeBlock = ThemeCodeBlock as unknown as React.ComponentType<{language: string; flags: readonly Flag[]; highlightFlag?: Flag; children: string}>;

/** One Boilerplate file, folded: its path, where the Reference explains it, and its code. */
export function FileBlock({file, flags, highlight, open, note}: {file: BoilerplateFile; flags: readonly Flag[]; highlight?: Flag; open?: boolean; note?: ReactNode}): ReactNode {
  const {active} = useProjects();
  const locale = useLocale();
  const t = useStrings();
  const path = replacePlaceholders(file.path, active);
  return (
    <details className={styles.fileBlock} open={open}>
      <summary>
        <code>{path}</code>
        {note}
        <span className={styles.fileRef}>
          <Link to={referenceHref(file)} onClick={(e) => e.stopPropagation()}>
            {t.fileDetail} {file.section}
          </Link>
        </span>
      </summary>
      <CodeBlock language={languageOf(file.path)} flags={flags} highlightFlag={highlight}>
        {codeOf(file, locale)}
      </CodeBlock>
    </details>
  );
}

type Props = {
  /** Domain, Application, Infrastructure, Api, Tests or Solution */
  project: string;
  /** Only these file names (the last path segment), in this order. */
  only?: string[];
};

/** The core files of one project, exactly as the scaffold script writes them. */
export default function LayerFiles({project, only}: Props): ReactNode {
  const t = useStrings();
  let files = FILES.filter((f) => f.project === project && f.when.length === 0);
  if (only) files = only.map((n) => files.find((f) => f.path.split('/').pop() === n)).filter((f): f is BoilerplateFile => !!f);
  if (!files.length) return <p className="text-muted">{t.noFiles}</p>;
  return (
    <div className={styles.fileList}>
      {files.map((f) => (
        <FileBlock key={f.path} file={f} flags={[]} />
      ))}
    </div>
  );
}

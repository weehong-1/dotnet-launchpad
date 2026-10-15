import React, {type ReactNode} from 'react';
import CodeBlock from '@theme-original/CodeBlock';
import type CodeBlockType from '@theme/CodeBlock';
import type {WrapperProps} from '@docusaurus/types';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useProjects, type Flag} from '@site/src/lib/project';
import {lineRanges, renderCode, renderWithFlags} from '@site/src/lib/substitute';
import {useFlagScope} from '@site/src/components/FlagScope';

type Props = WrapperProps<typeof CodeBlockType> & {
  /** Render as if exactly these flags were on, instead of the active project's (Boilerplate file views). */
  flags?: readonly Flag[];
  /** Highlight the lines that exist only because this flag is on. */
  highlightFlag?: Flag;
};

// Every code block is personalised: placeholders, Project Settings tokens and add-on lines.
export default function CodeBlockWrapper({flags: own, highlightFlag: ownHighlight, ...props}: Props): ReactNode {
  const {active} = useProjects();
  const {i18n} = useDocusaurusContext();
  const scope = useFlagScope();
  const flags = own ?? scope?.flags;
  const highlightFlag = own ? ownHighlight : scope?.highlight;
  if (typeof props.children !== 'string') return <CodeBlock {...props} />;
  if (!flags) return <CodeBlock {...props}>{renderCode(props.children, active, i18n.currentLocale)}</CodeBlock>;
  const {code, lines} = renderWithFlags(props.children, new Set(flags), active, i18n.currentLocale, highlightFlag);
  const metastring = lines.length ? `${props.metastring ?? ''} {${lineRanges(lines)}}`.trim() : props.metastring;
  return (
    <CodeBlock {...props} metastring={metastring}>
      {code}
    </CodeBlock>
  );
}

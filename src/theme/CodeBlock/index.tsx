import React, {type ReactNode} from 'react';
import CodeBlock from '@theme-original/CodeBlock';
import type CodeBlockType from '@theme/CodeBlock';
import type {WrapperProps} from '@docusaurus/types';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useProjects} from '@site/src/lib/project';
import {renderCode} from '@site/src/lib/substitute';

type Props = WrapperProps<typeof CodeBlockType>;

// Every code block is personalised: placeholders, Project Settings tokens and optional lines.
export default function CodeBlockWrapper(props: Props): ReactNode {
  const {active} = useProjects();
  const {i18n} = useDocusaurusContext();
  const children = typeof props.children === 'string' ? renderCode(props.children, active, i18n.currentLocale) : props.children;
  return <CodeBlock {...props}>{children}</CodeBlock>;
}

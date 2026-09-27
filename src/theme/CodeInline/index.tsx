import React, {type ReactNode} from 'react';
import CodeInline from '@theme-original/CodeInline';
import type CodeInlineType from '@theme/CodeInline';
import type {WrapperProps} from '@docusaurus/types';
import {useProjects} from '@site/src/lib/project';
import {replacePlaceholders} from '@site/src/lib/substitute';

type Props = WrapperProps<typeof CodeInlineType>;

export default function CodeInlineWrapper(props: Props): ReactNode {
  const {active} = useProjects();
  const children = typeof props.children === 'string' ? replacePlaceholders(props.children, active) : props.children;
  return <CodeInline {...props}>{children}</CodeInline>;
}

import React, {type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import {useProjects} from '@site/src/lib/project';

/** The one scaffold command, with flags from the active project's settings and decisions. */
export default function ScaffoldCommand(): ReactNode {
  const {active} = useProjects();
  const flags = ['--name ProductName', '--short productname'];
  if (active && !active.worker) flags.push('--no-worker');
  if (active && !active.auditing) flags.push('--no-auditing');
  if (active?.sonar) flags.push('--sonar');
  if (active?.qodana) flags.push('--qodana');
  const code = [
    'curl -fsSL https://dotnet-launchpad.vercel.app/scaffold.sh -o /tmp/scaffold.sh',
    `bash /tmp/scaffold.sh ${flags.join(' ')}`,
  ].join('\n');
  return <CodeBlock language="bash">{code}</CodeBlock>;
}

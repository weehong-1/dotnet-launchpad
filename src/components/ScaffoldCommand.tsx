import React, {type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import {ADDONS, useProjects} from '@site/src/lib/project';

/** The one scaffold command, with the active project's add-ons (and its CI decisions when it goes live). */
export default function ScaffoldCommand({core}: {core?: boolean}): ReactNode {
  const {active} = useProjects();
  const flags = ['--name ProductName', '--short productname'];
  if (active && !core) {
    for (const a of ADDONS) if (active[a.id]) flags.push(a.cli);
    if (active.golive && active.sonar) flags.push('--sonar');
    if (active.golive && active.qodana) flags.push('--qodana');
  }
  const code = [
    'curl -fsSL https://dotnet-launchpad.vercel.app/scaffold.sh -o /tmp/scaffold.sh',
    `bash /tmp/scaffold.sh ${flags.join(' ')}`,
  ].join('\n');
  return <CodeBlock language="bash">{code}</CodeBlock>;
}

import React, {type ReactNode} from 'react';
import CodeBlock from '@theme/CodeBlock';
import {ADDON_PACKAGES, PACKAGES, projectDir} from '@site/src/lib/boilerplate';
import type {AddOn} from '@site/src/lib/project';

const CORE_PROJECTS = ['Domain', 'Application', 'Infrastructure', 'Api', 'Domain.UnitTests', 'Application.UnitTests', 'Architecture.Tests', 'Api.IntegrationTests'];

/**
 * `dotnet add package` commands for the core 12.2 table, or for one add-on's packages. With central
 * package management the commands write the reference without a version; the version comes from
 * Directory.Packages.props.
 */
export default function PackageCommands({addon, projects}: {addon?: AddOn; projects?: string[]}): ReactNode {
  const source = addon ? ADDON_PACKAGES[addon] ?? {} : PACKAGES;
  const lines = (projects ?? (addon ? Object.keys(source) : CORE_PROJECTS))
    .filter((p) => source[p]?.length)
    .flatMap((p) => source[p].map((pkg) => `dotnet add ${projectDir(p)} package ${pkg}`));
  return <CodeBlock language="bash">{lines.join('\n')}</CodeBlock>;
}

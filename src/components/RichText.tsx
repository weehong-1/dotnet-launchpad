import React, {type ReactNode} from 'react';
import type {Project} from '@site/src/lib/project';

/** Renders `code` spans in short registry texts and fills <short name> / <Project Name>. Uses plain <code>,
 * not the substituting CodeInline, so an inserted name is never substituted a second time. */
export default function RichText({text, project}: {text: string; project: Project | null}): ReactNode {
  let s = text;
  if (project?.shortName) s = s.replace(/<short name>|<简短名称>/g, project.shortName);
  if (project?.projectName) s = s.replace(/<Project Name>|<项目名称>/g, project.projectName);
  return (
    <>
      {s.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') && part.endsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : <React.Fragment key={i}>{part}</React.Fragment>,
      )}
    </>
  );
}

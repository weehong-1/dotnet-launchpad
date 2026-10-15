import React, {createContext, useContext, type ReactNode} from 'react';
import {useProjects, type AddOn, type Flag} from '@site/src/lib/project';
import {previewFlags} from '@site/src/lib/boilerplate';

type Scope = {flags: readonly Flag[]; highlight?: Flag};

const FlagScopeContext = createContext<Scope | null>(null);

/** The flags code blocks inside a FlagScope render with, instead of the active project's. */
export function useFlagScope(): Scope | null {
  return useContext(FlagScopeContext);
}

/**
 * Renders every code block inside with fixed flags: `core` for the core Setup Flow (no add-on lines,
 * whatever the project has on), or `addon` for an add-on page (that add-on, what it needs and what
 * the project already has, with the add-on's own lines highlighted).
 */
export default function FlagScope({core, addon, children}: {core?: boolean; addon?: AddOn; children: ReactNode}): ReactNode {
  const {active} = useProjects();
  const scope: Scope = core || !addon ? {flags: []} : {flags: previewFlags(addon, active), highlight: addon};
  return <FlagScopeContext.Provider value={scope}>{children}</FlagScopeContext.Provider>;
}

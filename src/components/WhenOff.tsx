import React, {type ReactNode} from 'react';
import {useProjects, type AddOn} from '@site/src/lib/project';

/** Content for projects that do not include an add-on, such as a warning; hidden once it is in. */
export default function WhenOff({addon, children}: {addon: AddOn; children: ReactNode}): ReactNode {
  const {active} = useProjects();
  if (active?.[addon]) return null;
  return <>{children}</>;
}

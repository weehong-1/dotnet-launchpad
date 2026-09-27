import React, {type ReactNode} from 'react';
import {ProjectProvider} from '@site/src/lib/project';

export default function Root({children}: {children: ReactNode}): ReactNode {
  return <ProjectProvider>{children}</ProjectProvider>;
}

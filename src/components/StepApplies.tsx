import React, {type ReactNode} from 'react';
import Admonition from '@theme/Admonition';
import {useProjects} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import {applies, stepById} from '@site/src/data/steps';

/** Shows a skip notice on a step the active project does not need. */
export default function StepApplies({step, flag}: {step: string; flag: 'worker'}): ReactNode {
  const {active} = useProjects();
  const t = useStrings();
  if (!active || applies(stepById(step), active)) return null;
  return <Admonition type="info">{t.stepSkipped(t[flag], active.projectName)}</Admonition>;
}

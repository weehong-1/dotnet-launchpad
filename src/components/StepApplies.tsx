import React, {type ReactNode} from 'react';
import Admonition from '@theme/Admonition';
import {useProjects} from '@site/src/lib/project';
import {useStrings} from '@site/src/lib/i18n';
import {addonOfStep, applies, stepById} from '@site/src/data/steps';

/** Shows a notice on an add-on step the active project does not include. */
export default function StepApplies({step}: {step: string}): ReactNode {
  const {active} = useProjects();
  const t = useStrings();
  const addon = addonOfStep(step);
  if (!active || !addon || applies(stepById(step), active)) return null;
  return <Admonition type="info">{t.stepSkippedAddon(t[addon], active.projectName)}</Admonition>;
}

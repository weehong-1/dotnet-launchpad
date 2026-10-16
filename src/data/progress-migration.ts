import type {Progress} from '@site/src/lib/project';
import {STEPS} from './steps';

/**
 * Boilerplate v2.0 split the Setup Flow into a core flow and add-ons, so some Done Conditions moved to
 * another step. A project saved under v1.0 gets each target ticked when all of its sources were
 * ticked. Ticks are only ever added, so running this twice changes nothing.
 */
type Ref = readonly [step: string, check: string];
const MOVES: {to: Ref; from: Ref[]}[] = [
  // 0.3 Confirm licenses (v1) became part of 0.3 Prepare this machine; the MassTransit checks stay on B.1
  {to: ['local-environment', 'shell'], from: [['licenses', 'shell']]},
  {to: ['local-environment', 'mediatr'], from: [['licenses', 'mediatr']]},
  {to: ['local-environment', 'seq'], from: [['licenses', 'seq']]},
  // 1.2 and 1.3: Worker and Go live parts moved to their add-ons
  {to: ['worker', 'secrets'], from: [['empty-solution', 'secrets-worker'], ['local-services', 'mediatr-worker']]},
  {to: ['worker', 'project'], from: [['empty-solution', 'projects']]},
  {to: ['ci', 'files'], from: [['solution-files', 'deploy']]},
  {to: ['ci', 'workflow'], from: [['solution-files', 'ci']]},
  {to: ['ci', 'workflow-sonar'], from: [['solution-files', 'ci-sonar']]},
  {to: ['ci', 'workflow-qodana'], from: [['solution-files', 'ci-qodana']]},
  // 2.x: add-on parts of the layer steps
  {to: ['application', 'order'], from: [['application', 'order-audit']]},
  {to: ['infrastructure', 'core-only'], from: [['infrastructure', 'nothing-extra']]},
  {to: ['auditing', 'domain'], from: [['domain', 'audit']]},
  {to: ['auditing', 'application'], from: [['application', 'order-audit']]},
  {to: ['auditing', 'infrastructure'], from: [['infrastructure', 'audit']]},
  {to: ['auditing', 'build'], from: [['infrastructure', 'build']]},
  {to: ['auditing', 'migration'], from: [['api', 'migration-audit']]},
  {to: ['auditing', 'tests'], from: [['tests', 'test']]},
  {to: ['auditing', 'scope'], from: [['first-feature', 'audit-scope']]},
  {to: ['worker', 'outbox'], from: [['infrastructure', 'outbox-worker']]},
  {to: ['worker', 'layer-tests'], from: [['tests', 'files']]},
  {to: ['postgres', 'packages'], from: [['solution-files', 'packages']]},
  {to: ['postgres', 'files'], from: [['infrastructure', 'build'], ['api', 'build']]},
  {to: ['postgres', 'build'], from: [['infrastructure', 'build'], ['api', 'build']]},
  {to: ['postgres', 'migration'], from: [['api', 'migration']]},
  {to: ['postgres', 'migration'], from: [['api', 'migration-audit']]},
  {to: ['postgres', 'tests'], from: [['tests', 'test']]},
  {to: ['messaging', 'packages'], from: [['solution-files', 'packages']]},
  {to: ['messaging', 'files'], from: [['infrastructure', 'build']]},
  {to: ['messaging', 'build'], from: [['infrastructure', 'build']]},
  {to: ['messaging', 'migration'], from: [['api', 'migration']]},
  {to: ['messaging', 'migration'], from: [['api', 'migration-audit']]},
  {to: ['messaging', 'tests'], from: [['tests', 'test']]},
  {to: ['auth', 'files'], from: [['api', 'build']]},
  {to: ['auth', 'build'], from: [['api', 'build']]},
  {to: ['auth', 'tests'], from: [['tests', 'test']]},
  // 3.1 Start local services (v1) merged into 3.1 Run the Api and the add-on steps
  {to: ['run-locally', 'compose'], from: [['local-services', 'compose']]},
  {to: ['run-locally', 'mediatr'], from: [['local-services', 'mediatr']]},
  {to: ['postgres', 'compose'], from: [['local-services', 'compose']]},
  {to: ['messaging', 'compose'], from: [['local-services', 'compose']]},
  {to: ['messaging', 'ui'], from: [['local-services', 'uis']]},
  {to: ['auth', 'settings'], from: [['local-services', 'auth']]},
  // 3.2 Run the Api and Worker (v1)
  {to: ['postgres', 'migrate'], from: [['run-locally', 'migrate']]},
  {to: ['postgres', 'sit-fails'], from: [['run-locally', 'sit-fails']]},
  {to: ['messaging', 'run'], from: [['run-locally', 'health']]},
  {to: ['auth', 'anonymous'], from: [['run-locally', 'auth']]},
  {to: ['auth', 'token'], from: [['run-locally', 'token']]},
  {to: ['worker', 'runs'], from: [['run-locally', 'worker']]},
  // 3.3 Commit (v1)
  {to: ['ci', 'mt-secret'], from: [['commit', 'ci-secret']]},
  // 4.3 and 4.6: the license check split in two
  ...(['sit', 'prod'] as const).flatMap((env) => [
    {to: [`${env}-vm`, 'mediatr-key'] as Ref, from: [[`${env}-vm`, 'licenses'] as Ref]},
    {to: [`${env}-vm`, 'mt-license'] as Ref, from: [[`${env}-vm`, 'licenses'] as Ref]},
  ]),
];

// A typo in a target would silently drop a tick: fail the build instead.
for (const {to} of MOVES) {
  const step = STEPS.find((s) => s.id === to[0]);
  if (!step || !step.checks.some((c) => c.id === to[1])) throw new Error(`progress-migration: unknown target ${to.join('.')}`);
}

/** Moves the v1.0 ticks of the given projects to where those checks live now. */
export function migrateProgress(progress: Progress, projectIds: string[]): Progress {
  const next: Progress = {...progress};
  for (const id of projectIds) {
    const steps = {...(next[id] ?? {})};
    const has = ([step, check]: Ref) => steps[step]?.includes(check) ?? false;
    for (const {to, from} of MOVES) {
      if (!from.every(has) || has(to)) continue;
      steps[to[0]] = [...(steps[to[0]] ?? []), to[1]];
    }
    next[id] = steps;
  }
  return next;
}

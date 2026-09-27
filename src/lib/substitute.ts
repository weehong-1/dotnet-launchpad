import {flagOn, type Flag, type Project} from './project';

/**
 * Content conventions in code blocks (see CONTEXT.md for the terms):
 * - `ProductName` / `productname` are replaced by the Project Name / Short Name.
 * - `%%ProductName%%` / `%%productname%%` stay literal (text that talks about the placeholder itself).
 * - `{{projectName}}`, `{{shortName}}`, `{{worker}}`, `{{auditing}}`, `{{sonar}}`, `{{qodana}}` are
 *   Project Settings values, used in the AI common rules.
 * - A trailing comment `@@flag` keeps the line only when the flag is on; `@@!flag` only when off.
 *   A line holding only `@@flag-begin` / `@@flag-end` wraps a block the same way.
 */

const MARKER = /^(.*?)\s*(?:\/\/|#|<!--|--)\s*@@(!?)(worker|auditing|sonar|qodana)(-begin|-end)?\s*(?:-->)?\s*$/;

type Cond = {negate: boolean; flag: Flag};

function holds(project: Project | null, cond: Cond): boolean {
  if (!project) return !cond.negate; // no project: show the "with" variant of every optional part
  const on = flagOn(project, cond.flag);
  return cond.negate ? !on : on;
}

export function filterLines(text: string, project: Project | null): string {
  const out: string[] = [];
  const blocks: Cond[] = [];
  for (const line of text.split('\n')) {
    const m = MARKER.exec(line);
    if (!m) {
      if (blocks.every((c) => holds(project, c))) out.push(line);
      continue;
    }
    const cond: Cond = {negate: m[2] === '!', flag: m[3] as Flag};
    if (m[4] === '-begin') {
      blocks.push(cond);
      continue;
    }
    if (m[4] === '-end') {
      blocks.pop();
      continue;
    }
    if (blocks.every((c) => holds(project, c)) && holds(project, cond)) out.push(m[1]);
  }
  return out.join('\n');
}

const TOKENS_EMPTY: Record<string, Record<string, string>> = {
  en: {
    projectName: '<fill in, for example Company.Product>',
    shortName: '<lowercase, for example product>',
    flag: '<yes / no>',
    yes: 'yes',
    no: 'no',
  },
  'zh-Hans': {
    projectName: '<在此填入，例如 Company.Product>',
    shortName: '<小写，例如 product>',
    flag: '<要 / 不要>',
    yes: '要',
    no: '不要',
  },
};

function tokenValue(key: string, project: Project | null, locale: string): string {
  const t = TOKENS_EMPTY[locale] ?? TOKENS_EMPTY.en;
  if (key === 'projectName') return project?.projectName || t.projectName;
  if (key === 'shortName') return project?.shortName || t.shortName;
  if (!project) return t.flag;
  return project[key as Flag] ? t.yes : t.no;
}

// One pass over the text: an inserted value is never scanned again, so a Project Name that itself
// contains "ProductName" or "productname" stays as typed.
const PLACEHOLDERS = /%%ProductName%%|%%productname%%|ProductName|productname/g;
const PLACEHOLDERS_AND_TOKENS = /%%ProductName%%|%%productname%%|ProductName|productname|\{\{(projectName|shortName|worker|auditing|sonar|qodana)\}\}/g;

function placeholderValue(match: string, project: Project | null): string {
  if (match === '%%ProductName%%') return 'ProductName';
  if (match === '%%productname%%') return 'productname';
  if (match === 'ProductName') return project?.projectName || match;
  return project?.shortName || match;
}

export function replacePlaceholders(text: string, project: Project | null): string {
  return text.replace(PLACEHOLDERS, (m) => placeholderValue(m, project));
}

export function renderCode(text: string, project: Project | null, locale: string): string {
  return filterLines(text, project).replace(PLACEHOLDERS_AND_TOKENS, (m, key?: string) =>
    key ? tokenValue(key, project, locale) : placeholderValue(m, project),
  );
}

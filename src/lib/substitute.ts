import {FLAGS, flagOn, type Flag, type Project} from './project';

/**
 * Content conventions in code blocks (see CONTEXT.md for the terms):
 * - `ProductName` / `productname` are replaced by the Project Name / Short Name.
 * - `%%ProductName%%` / `%%productname%%` stay literal (text that talks about the placeholder itself).
 * - `{{projectName}}`, `{{shortName}}` and `{{<flag>}}` (an add-on or Project Decision, such as
 *   `{{postgres}}` or `{{sonar}}`) are Project Settings values, used in the AI common rules.
 * - A trailing comment `@@flag` keeps the line only when the flag is on; `@@!flag` only when off.
 *   A line holding only `@@flag-begin` / `@@flag-end` wraps a block the same way.
 */

const MARKER = new RegExp(`^(.*?)\\s*(?:\\/\\/|#|<!--|--)\\s*@@(!?)(${FLAGS.join('|')})(-begin|-end)?\\s*(?:-->)?\\s*$`);

type Cond = {negate: boolean; flag: Flag};

/** Which flags count as on: the active project's, or an explicit set (an add-on page's preview). */
export type FlagSource = Project | null | ReadonlySet<Flag>;

function isOn(source: FlagSource, flag: Flag): boolean | null {
  if (source instanceof Set) return source.has(flag);
  if (!source) return null;
  return flagOn(source as Project, flag);
}

function holds(source: FlagSource, cond: Cond): boolean {
  const on = isOn(source, cond.flag);
  if (on === null) return !cond.negate; // no project: show the "with" variant of every optional part
  return cond.negate ? !on : on;
}

/**
 * Keeps the lines that apply. `highlight` collects the 1-based output line numbers that exist only
 * because that flag is on, so an add-on page can highlight what the add-on adds to a file.
 */
export function filterLines(text: string, source: FlagSource, highlight?: {flag: Flag; lines: number[]}): string {
  const out: string[] = [];
  const blocks: Cond[] = [];
  const added = (conds: Cond[]) => !!highlight && conds.some((c) => !c.negate && c.flag === highlight.flag);
  for (const line of text.split('\n')) {
    const m = MARKER.exec(line);
    if (!m) {
      if (blocks.every((c) => holds(source, c))) {
        out.push(line);
        if (added(blocks)) highlight!.lines.push(out.length);
      }
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
    if (blocks.every((c) => holds(source, c)) && holds(source, cond)) {
      out.push(m[1]);
      if (added([...blocks, cond])) highlight!.lines.push(out.length);
    }
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
  return flagOn(project, key as Flag) ? t.yes : t.no;
}

// One pass over the text: an inserted value is never scanned again, so a Project Name that itself
// contains "ProductName" or "productname" stays as typed.
const PLACEHOLDERS = /%%ProductName%%|%%productname%%|ProductName|productname/g;
const PLACEHOLDERS_AND_TOKENS = new RegExp(`%%ProductName%%|%%productname%%|ProductName|productname|\\{\\{(projectName|shortName|${FLAGS.join('|')})\\}\\}`, 'g');

function placeholderValue(match: string, project: Project | null): string {
  if (match === '%%ProductName%%') return 'ProductName';
  if (match === '%%productname%%') return 'productname';
  if (match === 'ProductName') return project?.projectName || match;
  return project?.shortName || match;
}

export function replacePlaceholders(text: string, project: Project | null): string {
  return text.replace(PLACEHOLDERS, (m) => placeholderValue(m, project));
}

function fillIn(text: string, project: Project | null, locale: string): string {
  return text.replace(PLACEHOLDERS_AND_TOKENS, (m, key?: string) => (key ? tokenValue(key, project, locale) : placeholderValue(m, project)));
}

export function renderCode(text: string, project: Project | null, locale: string): string {
  return fillIn(filterLines(text, project), project, locale);
}

/**
 * Renders a Boilerplate file as it looks with exactly the given flags on, and the line numbers that
 * the `highlight` flag adds (for a `{1,4-6}` highlight range on the code block).
 */
export function renderWithFlags(
  text: string,
  flags: ReadonlySet<Flag>,
  project: Project | null,
  locale: string,
  highlight?: Flag,
): {code: string; lines: number[]} {
  const h = highlight ? {flag: highlight, lines: [] as number[]} : undefined;
  const code = fillIn(filterLines(text, flags, h), project, locale);
  return {code, lines: h?.lines ?? []};
}

/** `[1,2,3,7]` as `1-3,7`, the form Docusaurus code block metastrings take. */
export function lineRanges(lines: number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let j = i;
    while (j + 1 < lines.length && lines[j + 1] === lines[j] + 1) j++;
    parts.push(i === j ? `${lines[i]}` : `${lines[i]}-${lines[j]}`);
    i = j;
  }
  return parts.join(',');
}

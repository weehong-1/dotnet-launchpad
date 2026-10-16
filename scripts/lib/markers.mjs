// Line markers in Reference code blocks (see README): a trailing `@@flag` comment keeps the line only
// when the flag is on, `@@!flag` only when it is off, and lines holding only `@@flag-begin` /
// `@@flag-end` wrap a block. The flags are the add-ons and Project Decisions in src/data/addons.json.
import {readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(readFileSync(join(root, 'src/data/addons.json'), 'utf8'));

export const ADDONS = data.addons;
export const DECISIONS = data.decisions;
export const FLAGS = [...ADDONS, ...DECISIONS].map((a) => a.id);
for (const f of FLAGS) if (!/^[a-z]+$/.test(f)) throw new Error(`flag id must be lowercase letters only: ${f}`);

/** Every flag a flag needs, itself included (Messaging needs PostgreSQL, Worker needs both). */
export function closure(flag) {
  const def = [...ADDONS, ...DECISIONS].find((a) => a.id === flag);
  return [flag, ...(def?.requires ?? []).flatMap(closure)].filter((f, i, all) => all.indexOf(f) === i);
}

// Group 1: content; 2: comment opener; 3: "!" or ""; 4: flag; 5: "-begin" / "-end" or undefined.
export const MARKER = new RegExp(`^(.*?)\\s*(\\/\\/|#|<!--|--)\\s*@@(!?)(${FLAGS.join('|')})(-begin|-end)?\\s*(?:-->)?\\s*$`);

/** Any `@@word` marker, known or not, so unknown flags can fail the build. */
export const ANY_MARKER = /@@!?([a-z][a-z-]*)/g;

/** Keeps the lines that apply when exactly the flags in `on` are on. */
export function filterLines(text, on) {
  const holds = (neg, f) => (neg ? !on.has(f) : on.has(f));
  const out = [];
  const stack = [];
  for (const line of text.split('\n')) {
    const m = MARKER.exec(line);
    if (!m) {
      if (stack.every((c) => holds(c.neg, c.f))) out.push(line);
      continue;
    }
    const cond = {neg: m[3] === '!', f: m[4]};
    if (m[5] === '-begin') stack.push(cond);
    else if (m[5] === '-end') stack.pop();
    else if (stack.every((c) => holds(c.neg, c.f)) && holds(cond.neg, cond.f)) out.push(m[1]);
  }
  return out.join('\n');
}

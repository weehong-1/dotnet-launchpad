// Fails when an English doc or partial has no zh-Hans mirror. Docusaurus silently falls back to the
// English page, so a missing translation would otherwise go unnoticed.
import {existsSync, readdirSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const en = join(root, 'docs');
const zh = join(root, 'i18n/zh-Hans/docusaurus-plugin-content-docs/current');

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.mdx?$/.test(n) ? [p] : [];
  });
}

const missing = walk(en)
  .map((f) => relative(en, f))
  .filter((f) => !f.startsWith('adr/')) // ADRs are not part of the site
  .filter((f) => !existsSync(join(zh, f)));
const orphaned = walk(zh)
  .map((f) => relative(zh, f))
  .filter((f) => !existsSync(join(en, f)));

if (missing.length || orphaned.length) {
  for (const f of missing) console.error(`[i18n] no zh-Hans mirror for docs/${f}`);
  for (const f of orphaned) console.error(`[i18n] zh-Hans page without an English original: ${f}`);
  process.exit(1);
}
console.log('[i18n] every English page has a zh-Hans mirror');

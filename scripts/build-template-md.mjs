// Builds static/TEMPLATE.md (English) and static/TEMPLATE.zh.md from the Reference pages,
// so an AI coding agent can read the whole template as one file (Setup Flow step 1.1).
import {existsSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LOCALES = {
  en: {
    dir: join(root, 'docs/reference'),
    out: join(root, 'static/TEMPLATE.md'),
    title: '# .NET 10 Clean Architecture Project Template',
    header: [
      'Boilerplate v1.0. Generated from https://dotnet-launchpad.vercel.app/docs/reference; do not edit this copy.',
      '`ProductName` is the Project Name placeholder and `productname` the Short Name (lowercase) placeholder.',
      'Lines marked "(optional: X)" belong to optional component X; lines marked "(without X)" replace them when X is not used.',
    ],
    parts: {spec: '# Part 1: Architecture specification', code: '# Part 2: Boilerplate code', appendix: null},
    optional: (f) => `(optional: ${NAMES.en[f]})`,
    without: (f) => `(without ${NAMES.en[f]}, use this line instead)`,
    tokens: {projectName: '<fill in, for example Company.Product>', shortName: '<lowercase, for example product>', flag: '<yes / no>'},
  },
  'zh-Hans': {
    dir: join(root, 'i18n/zh-Hans/docusaurus-plugin-content-docs/current/reference'),
    out: join(root, 'static/TEMPLATE.zh.md'),
    title: '# .NET 10 Clean Architecture 项目模板',
    header: [
      'Boilerplate v1.0。由 https://dotnet-launchpad.vercel.app/zh/docs/reference 自动产生，请勿直接修改此文件。',
      '`ProductName` 是项目名称占位名称，`productname` 是简短名称（小写）占位名称。',
      '标有“（可选：X）”的行属于可选组件 X；标有“（没有 X 时改用此行）”的行在不使用 X 时取代前者。',
    ],
    parts: {spec: '# 第一部分：架构规范', code: '# 第二部分：Boilerplate 代码', appendix: null},
    optional: (f) => `（可选：${NAMES.zh[f]}）`,
    without: (f) => `（没有 ${NAMES.zh[f]} 时改用此行）`,
    tokens: {projectName: '<在此填入，例如 Company.Product>', shortName: '<小写，例如 product>', flag: '<要 / 不要>'},
  },
};

const NAMES = {
  en: {worker: 'Worker', auditing: 'auditing', sonar: 'SonarCloud', qodana: 'Qodana'},
  zh: {worker: 'Worker', auditing: '审计', sonar: 'SonarCloud', qodana: 'Qodana'},
};

const MARKER = /^(.*?)(\s*)(\/\/|#|<!--|--)\s*@@(!?)(worker|auditing|sonar|qodana)(-begin|-end)?\s*(?:-->)?\s*$/;

function walk(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name.startsWith('_') ? [] : walk(p);
      return name.endsWith('.mdx') && !name.startsWith('_') ? [p] : [];
    });
}

function convertCodeLine(line, cfg) {
  const m = MARKER.exec(line);
  if (!m) return line;
  const [, content, , comment, neg, flag, edge] = m;
  const close = comment === '<!--' ? ' -->' : '';
  if (edge === '-begin') return `${content}${comment} ${cfg.optional(flag)} begin${close}`;
  if (edge === '-end') return `${content}${comment} ${cfg.optional(flag)} end${close}`;
  if (!content.trim()) return '';
  const note = neg ? cfg.without(flag) : cfg.optional(flag);
  return `${content}${content.trim() ? '  ' : ''}${comment} ${note}${close}`;
}

function convertPage(file, cfg) {
  let text = readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  // inline partials
  const partials = {};
  text = text.replace(/^import (\w+) from '(\.[^']+)';\n/gm, (_, name, path) => {
    const p = resolve(dirname(file), path);
    if (existsSync(p)) partials[name] = readFileSync(p, 'utf8').trimEnd();
    return '';
  });
  text = text.replace(/^<(\w+) \/>$/gm, (whole, name) => partials[name] ?? '');
  const out = [];
  let inside = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      inside = !inside;
      out.push(line);
      continue;
    }
    if (inside) {
      out.push(convertCodeLine(line, cfg));
      continue;
    }
    if (/^<\/?Optional\b.*>$/.test(line) || /^<DocCardList \/>$/.test(line)) continue;
    let l = line
      .replace(/ \\?\{#[^}\\]+\\?\}$/, '')
      .replace(/\[([^\]]+)\]\((?:\.\.?\/)[^)]*\)/g, '$1')
      .replace(/\\([{}])/g, '$1')
      .replace(/&lt;/g, '<');
    if (/^#{1,5} /.test(l)) l = `#${l}`;
    out.push(l);
  }
  return out.join('\n').trim();
}

for (const [locale, cfg] of Object.entries(LOCALES)) {
  if (!existsSync(cfg.dir)) continue;
  const order = ['spec', 'code', 'appendix'];
  const pages = order.flatMap((d) => walk(join(cfg.dir, d)));
  const chunks = [cfg.title, '', ...cfg.header.map((h) => `> ${h}`), ''];
  let part = null;
  for (const f of pages) {
    const top = relative(cfg.dir, f).split('/')[0];
    if (top !== part) {
      part = top;
      if (cfg.parts[top]) chunks.push(cfg.parts[top], '');
    }
    chunks.push(convertPage(f, cfg), '');
  }
  let result = chunks.join('\n');
  result = result
    .replace(/%%ProductName%%/g, 'ProductName')
    .replace(/%%productname%%/g, 'productname')
    .replace(/\{\{projectName\}\}/g, cfg.tokens.projectName)
    .replace(/\{\{shortName\}\}/g, cfg.tokens.shortName)
    .replace(/\{\{(worker|auditing|sonar|qodana)\}\}/g, cfg.tokens.flag);
  writeFileSync(cfg.out, result.replace(/\n{3,}/g, '\n\n'));
  console.log(`[template] ${relative(root, cfg.out)}: ${pages.length} pages`);
}

// Builds static/scaffold.sh from the English Reference pages: one command that creates the core
// Skeleton Solution (Setup Flow steps 1.2 to 2.5) plus any add-ons chosen with flags. Every file's
// content comes from the Reference, so the script never drifts from the code shown on the site.
// It also writes src/generated/boilerplate.json (every file, in both languages, with the flags it
// needs) for the Setup Flow pages. The build fails if the Reference changes shape in a way this
// generator does not understand.
import {mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ADDONS, ANY_MARKER, DECISIONS, FLAGS, closure, filterLines} from './lib/markers.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF = {
  en: join(root, 'docs/reference'),
  zh: join(root, 'i18n/zh-Hans/docusaurus-plugin-content-docs/current/reference'),
};
const DELIM = '__DPS_EOF__';

function fail(msg) {
  console.error(`[scaffold] ${msg}`);
  process.exit(1);
}

const BY_LABEL = Object.fromEntries(ADDONS.map((a) => [a.label.en, a.id]));
function flagOfLabel(label) {
  const id = BY_LABEL[label.trim()];
  if (!id) fail(`unknown add-on label "${label}" (add it to src/data/addons.json)`);
  return id;
}

/** Sections of a page: heading text, anchor, level, and the fenced code blocks directly under it. */
const cache = {};
function sections(page, locale = 'en') {
  const key = `${locale}:${page}`;
  if (cache[key]) return cache[key];
  const lines = readFileSync(join(REF[locale], page), 'utf8').split('\n');
  const out = [];
  let cur = null;
  let fence = null;
  for (const line of lines) {
    if (fence) {
      if (line.startsWith('```')) {
        cur.blocks.push({lang: fence.lang, code: fence.lines.join('\n')});
        fence = null;
      } else fence.lines.push(line);
      continue;
    }
    if (line.startsWith('```')) {
      fence = {lang: line.slice(3).trim(), lines: []};
      continue;
    }
    const m = /^(#{1,4}) (.*?)(?: \\\{#([^}\\]+)\\\})?$/.exec(line);
    if (m) {
      cur = {level: m[1].length, text: m[2], anchor: m[3], blocks: []};
      out.push(cur);
    } else if (cur && line.trim()) {
      cur.prose = (cur.prose ?? []).concat(line);
    }
  }
  return (cache[key] = out);
}

function section(page, prefix) {
  const s = sections(page).find((x) => x.text.startsWith(prefix + ' '));
  if (!s) fail(`section ${prefix} not found in ${page}`);
  return s;
}

/** A code block plus where it came from, so the Chinese copy can be found by anchor and index. */
function block(page, prefix, index = 0, count) {
  const s = section(page, prefix);
  if (count !== undefined && s.blocks.length !== count) fail(`${prefix}: expected ${count} code block(s), found ${s.blocks.length}`);
  if (!s.blocks[index]) fail(`${prefix}: no code block #${index}`);
  return {content: s.blocks[index].code, src: {page, anchor: s.anchor, index, section: prefix}};
}

// ---------------------------------------------------------------- file lists from 11 (file overview)
const overview = readFileSync(join(REF.en, 'code/11-file-overview.mdx'), 'utf8').split('\n');
const lists = {};
let list = null;
for (const line of overview) {
  const h = /^\*\*(Domain|Application|Infrastructure|Api|Worker|Tests): \d+ files\*\*/.exec(line);
  if (h) {
    list = lists[h[1]] = [];
    continue;
  }
  if (line.startsWith('**') || line.startsWith('#')) list = null;
  const item = /^\d+\. `([^`]+)`/.exec(line);
  if (list && item) list.push(item[1]);
}
for (const p of ['Domain', 'Application', 'Infrastructure', 'Api', 'Worker', 'Tests']) if (!lists[p]?.length) fail(`file list for ${p} not found in 11`);

function pathFor(project, fileName) {
  const hits = lists[project].filter((p) => p.split('/').pop() === fileName);
  if (hits.length !== 1) fail(`${project}: expected one path for ${fileName}, found ${hits.length}`);
  return project === 'Tests' ? `tests/${hits[0]}` : `src/ProductName.${project}/${hits[0]}`;
}

// ---------------------------------------------------------------- layer files (13 to 18)
// {path, project, when: flags that must all be on, content, src}
const files = [];

function layer(page, num, project) {
  for (const s of sections(page)) {
    const m = new RegExp(`^${num}\\.(\\d+) (.+)$`).exec(s.text);
    if (!m || /AI coding agent prompt|conventions/i.test(m[2])) continue;
    if (/\(optional: /.test(m[2])) fail(`${num}.${m[1]}: "(optional: …)" is now "(add-on: …)"`);
    const tag = /\(add-on: ([^)]+)\)/.exec(m[2]);
    const when = tag ? closure(flagOfLabel(tag[1])) : project === 'Worker' ? closure('worker') : [];
    const names = m[2].replace(/\s*\(.*\)$/, '').split(' and ').map((n) => n.trim());
    if (!names.every((n) => /\.\w+$/.test(n))) continue; // sections without files, such as 16.12's parent
    if (s.blocks.length < names.length) fail(`${num}.${m[1]}: ${names.length} file(s) but ${s.blocks.length} code block(s)`);
    if (s.blocks.length > names.length) console.log(`[scaffold] ${num}.${m[1]}: using the first ${names.length} of ${s.blocks.length} code blocks (the rest are examples)`);
    names.forEach((n, i) =>
      files.push({path: pathFor(project, n), project, when, content: s.blocks[i].code, src: {page, anchor: s.anchor, index: i, section: `${num}.${m[1]}`}}),
    );
  }
}

layer('code/13-domain.mdx', 13, 'Domain');
layer('code/14-application.mdx', 14, 'Application');
layer('code/15-infrastructure.mdx', 15, 'Infrastructure');
layer('code/16-api.mdx', 16, 'Api');
layer('code/17-worker-optional.mdx', 17, 'Worker');
layer('code/18-tests.mdx', 18, 'Tests');

// 16.12: four settings files under ### sub headings
const apiSections = sections('code/16-api.mdx');
const settings = {};
for (const s of apiSections) {
  const m = /^(appsettings(?:\.\w+)?\.json)/.exec(s.text);
  if (m && s.level === 3) {
    settings[m[1]] = s.blocks[0].code;
    files.push({path: pathFor('Api', m[1]), project: 'Api', when: [], content: s.blocks[0].code, src: {page: 'code/16-api.mdx', anchor: s.anchor, index: 0, section: '16.12'}});
  }
}
if (Object.keys(settings).length !== 4) fail(`16.12: expected 4 settings files, found ${Object.keys(settings).length}`);

// Every combination of the flags that appear in the settings files must give valid JSON.
const settingsFlags = [...new Set(Object.values(settings).flatMap((t) => [...t.matchAll(ANY_MARKER)].map((m) => m[1].replace(/-(begin|end)$/, ''))))];
for (let bits = 0; bits < 1 << settingsFlags.length; bits++) {
  const on = new Set(settingsFlags.filter((_, i) => bits & (1 << i)));
  for (const [name, json] of Object.entries(settings)) {
    try {
      JSON.parse(filterLines(json, on));
    } catch (e) {
      fail(`16.12 ${name} is not valid JSON with [${[...on].join(', ')}] on: ${e.message}`);
    }
  }
}

// 17.1: the Worker's settings are the Api's minus the sections it does not use. The Worker needs
// PostgreSQL and Messaging; it never serves HTTP, so the Authentication section goes either way.
const workerFlags = new Set(closure('worker'));
for (const [name, json] of Object.entries(settings)) {
  const obj = JSON.parse(filterLines(json, workerFlags));
  for (const k of ['Cors', 'OpenApi', 'Migrations', 'Authentication', 'RateLimiting']) delete obj[k];
  if (obj.Serilog?.Properties?.Application) obj.Serilog.Properties.Application = 'ProductName.Worker';
  const text = JSON.stringify(obj, null, 2).replace(/\/api\/log-\.json/g, '/worker/log-.json');
  files.push({path: pathFor('Worker', name), project: 'Worker', when: closure('worker'), content: text, src: {page: 'code/17-worker-optional.mdx', anchor: '17-1-appsettings-files-4', derived: true, section: '17.1'}});
}

// 11.3: one GlobalUsings.cs per project, paired with the path line above each code block
const usings = section('code/11-file-overview.mdx', '11.3');
const usingPaths = (usings.prose ?? []).map((l) => /^`((?:src|tests)\/[^`]+\/GlobalUsings\.cs)`/.exec(l)?.[1]).filter(Boolean);
if (usingPaths.length !== usings.blocks.length || usingPaths.length < 9) fail(`11.3: ${usingPaths.length} paths but ${usings.blocks.length} code blocks`);
usingPaths.forEach((path, i) => {
  const project = /^(?:src|tests)\/ProductName\.([A-Za-z]+)/.exec(path)[1];
  files.push({
    path,
    project: path.startsWith('tests/') ? 'Tests' : project,
    when: path.includes('.Worker/') ? closure('worker') : [],
    content: usings.blocks[i].code,
    src: {page: 'code/11-file-overview.mdx', anchor: usings.anchor, index: i, section: '11.3'},
  });
});

// ---------------------------------------------------------------- solution level files (12)
const S = 'code/12-solution-level.mdx';
const golive = closure('golive');
const rootFiles = [
  {path: 'Directory.Build.props', when: [], ...block(S, '12.1', 0, 1)},
  {path: 'Directory.Packages.props', when: [], ...block(S, '12.2', 0, 1)},
  {path: 'global.json', when: [], ...block(S, '12.3', 0, 1)},
  {path: '.editorconfig', when: [], ...block(S, '12.4', 0, 1)},
  {path: 'docker-compose.yml', when: [], ...block(S, '12.5', 0, 1)},
  {path: 'BannedSymbols.txt', when: [], ...block(S, '12.6', 0, 1)},
  {path: 'deploy/systemd/productname-api.service', when: golive, ...block(S, '12.7', 0, 2)},
  {path: 'deploy/systemd/productname-worker.service', when: [...golive, ...closure('worker')], ...block(S, '12.7', 1, 2)},
  {path: 'deploy/nginx/productname-api.conf', when: golive, ...block(S, '12.8', 0, 1)},
  {path: 'deploy/env/api.env.example', when: golive, ...block(S, '12.9', 0, 2)},
  {path: 'deploy/env/worker.env.example', when: [...golive, ...closure('worker')], ...block(S, '12.9', 1, 2)},
  {path: '.github/workflows/ci.yml', when: golive, ...block(S, '12.10', 0, 3)},
  {path: 'qodana.yaml', when: [...golive, 'qodana'], ...block(S, '12.10', 2, 3)},
].map((f) => ({...f, project: 'Solution'}));
const ciExtra = block(S, '12.10', 1, 3);

// 12.2 tables: packages per project for the core, then per add-on
const PROJECTS = ['Domain', 'Application', 'Infrastructure', 'Api', 'Worker', 'Domain.UnitTests', 'Application.UnitTests', 'Architecture.Tests', 'Api.IntegrationTests'];
const prose = section(S, '12.2').prose;
const setLine = prose.find((l) => l.startsWith('The `xunit` set means'));
if (!setLine) fail('12.2: the sentence defining the `xunit` set is missing');
const xunitSet = [...setLine.split('. ')[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((n) => n !== 'xunit');
const names = (cell) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((n) => n !== 'xunit' && n !== 'Microsoft.AspNetCore.App');
const packages = {};
const addonPackages = {};
for (const row of prose.filter((l) => l.startsWith('| '))) {
  const cells = row.split('|').map((c) => c.trim());
  if (PROJECTS.includes(cells[1])) {
    packages[cells[1]] = [...(cells[3].includes('`xunit` set') ? xunitSet : []), ...names(cells[3])];
  } else if (BY_LABEL[cells[1]]) {
    if (!PROJECTS.includes(cells[2])) fail(`12.2 add-on table: unknown project ${cells[2]}`);
    const flag = BY_LABEL[cells[1]];
    ((addonPackages[flag] ??= {})[cells[2]] ??= []).push(...names(cells[3]));
  }
}
if (Object.keys(packages).length !== PROJECTS.length) fail(`12.2 core table: expected ${PROJECTS.length} projects, found ${Object.keys(packages).length}`);
if (!Object.keys(addonPackages).length) fail('12.2: the "Add-on packages" table is missing');

// Every package must have a PackageVersion that is there whenever the package is used.
const props = rootFiles.find((f) => f.path === 'Directory.Packages.props').content;
const versioned = (on) => new Set([...filterLines(props, on).matchAll(/<(?:PackageVersion|GlobalPackageReference) Include="([^"]+)"/g)].map((m) => m[1]));
const coreVersions = versioned(new Set());
for (const [project, list] of Object.entries(packages)) {
  for (const p of list) if (project !== 'Worker' && !coreVersions.has(p)) fail(`12.2: ${p} (${project}) has no PackageVersion in the core Directory.Packages.props`);
}
for (const [flag, byProject] of Object.entries(addonPackages)) {
  const have = versioned(new Set(closure(flag)));
  for (const list of Object.values(byProject)) for (const p of list) if (!have.has(p)) fail(`12.2: ${p} (${flag}) has no PackageVersion with ${flag} on`);
}

// ---------------------------------------------------------------- guards across both languages
// Every marker in a code block names a known flag, wherever code blocks are written (Reference, partials, Setup Flow).
function walk(dir, ext) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p, ext) : ext.some((e) => n.endsWith(e)) ? [p] : [];
  });
}
const docRoots = [join(root, 'docs'), join(root, 'i18n/zh-Hans/docusaurus-plugin-content-docs/current')];
for (const file of docRoots.flatMap((d) => walk(d, ['.md', '.mdx']))) {
  const fenced = [...readFileSync(file, 'utf8').matchAll(/^```[^\n]*\n([\s\S]*?)^```/gm)].map((m) => m[1]).join('\n');
  for (const m of fenced.matchAll(ANY_MARKER)) {
    const flag = m[1].replace(/-(begin|end)$/, '');
    if (!FLAGS.includes(flag)) fail(`${relative(root, file)}: unknown flag @@${m[1]} (known: ${FLAGS.join(', ')})`);
  }
}

// The Chinese Reference shows the same code: same files, same markers, only comments translated.
const markersOf = (code) => [...code.matchAll(ANY_MARKER)].map((m) => m[0]).join(' ');
function zhCode(f) {
  if (f.src.derived) return f.content;
  const s = sections(f.src.page, 'zh').find((x) => x.anchor === f.src.anchor);
  if (!s) fail(`zh ${f.src.page}: no section with anchor #${f.src.anchor} (${f.path})`);
  const b = s.blocks[f.src.index];
  if (!b) fail(`zh ${f.src.page}#${f.src.anchor}: no code block #${f.src.index} (${f.path})`);
  if (markersOf(b.code) !== markersOf(f.content)) fail(`zh ${f.src.page}#${f.src.anchor} block ${f.src.index} (${f.path}): markers differ from English\n  en: ${markersOf(f.content)}\n  zh: ${markersOf(b.code)}`);
  if (b.code.split('\n').length !== f.content.split('\n').length) fail(`zh ${f.src.page}#${f.src.anchor} block ${f.src.index} (${f.path}): line count differs from English`);
  return b.code;
}

// ---------------------------------------------------------------- data for the site
mkdirSync(join(root, 'src/generated'), {recursive: true});
const boilerplate = {
  files: [...rootFiles, ...files].map((f) => ({
    path: f.path,
    project: f.project,
    when: [...new Set(f.when)],
    page: f.src.page.replace(/\.mdx$/, ''),
    anchor: f.src.anchor,
    section: f.src.section,
    en: f.content,
    zh: zhCode(f),
  })),
  packages,
  addonPackages,
};
writeFileSync(join(root, 'src/generated/boilerplate.json'), JSON.stringify(boilerplate) + '\n');

// Project Name segments must not match a type name the Boilerplate uses unqualified: a namespace
// segment such as Acme.Task would shadow System.Threading.Tasks.Task inside the project's namespaces.
const identifiers = new Set();
for (const file of walk(join(REF.en, 'code'), ['.mdx'])) {
  for (const m of readFileSync(file, 'utf8').matchAll(/```csharp\n([\s\S]*?)\n```/g)) {
    const codeOnly = m[1].replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\]|\\.)*"/g, '');
    for (const id of codeOnly.matchAll(/\b[A-Z][A-Za-z0-9]*\b/g)) identifiers.add(id[0]);
  }
}
identifiers.delete('ProductName');
const reservedSegments = [...identifiers].sort();
writeFileSync(join(root, 'src/generated/reserved-name-segments.json'), JSON.stringify(reservedSegments) + '\n');

// Reserved Short Names come from the site's own list, so the script and the form agree.
const projectTs = readFileSync(join(root, 'src/lib/project.tsx'), 'utf8');
const reservedBlock = /RESERVED_SHORT_NAMES = new Set\(\[([\s\S]*?)\]\)/.exec(projectTs);
if (!reservedBlock) fail('RESERVED_SHORT_NAMES not found in src/lib/project.tsx');
const reserved = [...reservedBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

// ---------------------------------------------------------------- emit the bash script
for (const f of [...files, ...rootFiles]) if (f.content.includes(DELIM)) fail(`${f.path} contains the heredoc delimiter`);

const VAR = (f) => f.toUpperCase();
const onAll = (when) => [...new Set(when)].map((f) => `on ${f}`).join(' && ');

function emit(f) {
  const body = `emit '${f.path}' <<'${DELIM}'\n${f.content}\n${DELIM}`;
  return f.when.length ? `if ${onAll(f.when)}; then\n${body}\nfi` : body;
}

function pkgLines(project, dir) {
  const quote = (list) => list.map((p) => `'${p}'`).join(' ');
  const lines = [`pk=(${quote(packages[project])})`];
  for (const [flag, byProject] of Object.entries(addonPackages)) {
    if (byProject[project]) lines.push(`if on ${flag}; then pk+=(${quote(byProject[project])}); fi`);
  }
  lines.push(`add_packages "${dir}" "\${pk[@]}"`);
  return lines.join('\n');
}

const ALL = [...ADDONS, ...DECISIONS];
const usage = `bash scaffold.sh --name Company.Product [--short product] ${ADDONS.map((a) => `[${a.cli}]`).join(' ')} [--all] ${DECISIONS.map((a) => `[${a.cli}]`).join(' ')} [--test]`;
const requireChecks = ALL.flatMap((a) =>
  a.requires.map((r) => {
    const need = ALL.find((x) => x.id === r);
    return `if on ${a.id} && ! on ${r}; then die "${a.cli} needs ${need.cli} (${a.label.en} requires ${need.label.en})"; fi`;
  }),
).join('\n');

const script = `#!/usr/bin/env bash
# .NET Launchpad: scaffold a Skeleton Solution from Boilerplate v2.0 (Setup Flow steps 1.2 to 2.5).
# Generated from https://dotnet-launchpad.vercel.app/docs/reference by scripts/build-scaffold.mjs. Do not edit.
#
# Usage, inside the empty repository folder from Setup Flow step 1.1:
#   ${usage}
#   Without add-on flags it builds the core: Clean Architecture, DDD and CQRS with no database, broker or sign in.
#   ${ADDONS.map((a) => `${a.cli} adds ${a.label.en}`).join(', ')}; --all adds every add-on.
#   --test also runs dotnet test; PostgreSQL needs Docker, Messaging needs MT_LICENSE or MT_LICENSE_PATH.
set -euo pipefail

NAME=""; SHORT=""; RUN_TESTS=0
${FLAGS.map((f) => `${VAR(f)}=0`).join('; ')}
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --short) SHORT="$2"; shift 2 ;;
${ALL.map((a) => `    ${a.cli}) ${VAR(a.id)}=1; shift ;;`).join('\n')}
    --all) ${ADDONS.map((a) => `${VAR(a.id)}=1`).join('; ')}; shift ;;
    --no-worker|--no-auditing) echo "$1 was removed in Boilerplate v2.0: add-ons are now off unless you add them (${ADDONS.map((a) => a.cli).join(' ')})" >&2; exit 2 ;;
    --test) RUN_TESTS=1; shift ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

die() { echo "✗ $*" >&2; exit 1; }
step() { printf '\\n\\033[1m▶ %s\\033[0m\\n' "$*"; }

on() {
  case "$1" in
${FLAGS.map((f) => `    ${f}) [ "$${VAR(f)}" = 1 ] ;;`).join('\n')}
    *) return 1 ;;
  esac
}

[ -n "$NAME" ] || die "--name is required, for example --name Company.Product"
[[ "$NAME" =~ ^[A-Z][A-Za-z0-9]*(\\.[A-Z][A-Za-z0-9]*)*$ ]] || die "Project Name must be dot-separated PascalCase, for example Company.Product"
[ -n "$SHORT" ] || SHORT=$(printf '%s' "\${NAME##*.}" | tr '[:upper:]' '[:lower:]')
[[ "$SHORT" =~ ^[a-z][a-z0-9-]{0,31}$ ]] || die "Short Name must be at most 32 lowercase letters, digits or hyphens: $SHORT"
for seg in \${NAME//./ }; do
  case " ${reservedSegments.join(' ')} " in *" $seg "*) die "Project Name segment '$seg' is a type name the Boilerplate uses; it would shadow that type in the generated code. Choose another name" ;; esac
done
case " ${reserved.join(' ')} " in *" $SHORT "*) die "Short Name '$SHORT' is an existing system account; the service needs its own (use --short)" ;; esac
${requireChecks}
command -v dotnet >/dev/null || die "dotnet not found (Setup Flow step 0.3)"
command -v curl >/dev/null || die "curl not found"
SDK=$(dotnet --list-sdks | awk '$1 ~ /^10\\./ {v=$1} END {print v}')
[ -n "$SDK" ] || die ".NET 10 SDK not found (Setup Flow step 0.3)"
ls ./*.slnx >/dev/null 2>&1 && die "A solution already exists here; run this only once, in an empty repository"

# Keeps or drops lines marked with @@flag / @@!flag / @@flag-begin..end, then fills in the names.
render() {
  awk -v flags="${FLAGS.map((f) => `${f}=$${VAR(f)}`).join(' ')}" '
    BEGIN { n = split(flags, kv, " "); for (i = 1; i <= n; i++) { split(kv[i], p, "="); v[p[1]] = p[2] } depth = 0 }
    function holds(neg, f) { return neg ? v[f] != 1 : v[f] == 1 }
    function open_ok(   i, s, ng) {
      for (i = 1; i <= depth; i++) { s = stack[i]; ng = (substr(s, 1, 1) == "!"); if (ng) s = substr(s, 2); if (!holds(ng, s)) return 0 }
      return 1
    }
    {
      line = $0
      if (match(line, /[ \\t]*(\\/\\/|#|<!--|--)[ \\t]*@@!?(${FLAGS.join('|')})(-begin|-end)?[ \\t]*(-->)?[ \\t]*$/)) {
        content = substr(line, 1, RSTART - 1); m = substr(line, RSTART, RLENGTH)
        neg = (m ~ /@@!/); f = m; sub(/.*@@!?/, "", f); sub(/[^a-z].*$/, "", f)
        if (m ~ /-begin/) { stack[++depth] = (neg ? "!" : "") f; next }
        if (m ~ /-end/) { depth--; next }
        if (open_ok() && holds(neg, f)) print content
        next
      }
      if (open_ok()) print line
    }' | names
}

# Fills in the names in one pass: an inserted name is never replaced again.
names() {
  awk -v name="$NAME" -v short="$SHORT" '{ gsub(/ProductName/, "\\001"); gsub(/productname/, "\\002"); gsub(/\\001/, name); gsub(/\\002/, short); print }'
}

emit() {
  local path
  path=$(printf '%s\\n' "$1" | names)
  mkdir -p "$(dirname "$path")"
  render > "$path"
  echo "  + $path"
}

# Latest stable version of a NuGet package, optionally within one major version.
latest() {
  local id major
  id=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]'); major="\${2:-}"
  curl -fsSL "https://api.nuget.org/v3-flatcontainer/$id/index.json" \\
    | tr -d '[]{}" \\n\\r' | sed 's/^versions://' | tr ',' '\\n' | grep -v -- '-' \\
    | { if [ -n "$major" ]; then grep "^$major\\." || true; else cat; fi; } | sort -V | tail -1
}

# Removes versioned PackageReferences the project templates add (versions live only in Directory.Packages.props),
# then references the given packages without versions.
add_packages() {
  local proj="$1"; shift
  local csproj; csproj=$(ls "$proj"/*.csproj)
  sed -i.bak '/<PackageReference /d' "$csproj" && rm -f "$csproj.bak"
  [ $# -eq 0 ] && return 0
  local items=""
  for p in "$@"; do items="$items    <PackageReference Include=\\"$p\\" />\\n"; done
  insert_before_end "$csproj" "  <ItemGroup>\\n$items  </ItemGroup>"
}

insert_before_end() {
  local file="$1" text="$2"
  awk -v t="$text" '/<\\/Project>/ && !done { gsub(/\\\\n/, "\\n", t); printf "%s\\n", t; done = 1 } { print }' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

ADDED=""
${ADDONS.map((a) => `on ${a.id} && ADDED="$ADDED, ${a.label.en}"`).join('\n')}
echo "Scaffolding $NAME (short name $SHORT) · core\${ADDED} · .NET SDK $SDK"

step "Solution level files (Reference 12)"
[ -f .gitignore ] || { dotnet new gitignore >/dev/null && echo "  + .gitignore"; }
${rootFiles.map(emit).join('\n')}
sed -i.bak -E 's/"version": "[^"]+"/"version": "'"$SDK"'"/' global.json && rm -f global.json.bak
if on golive && { on sonar || on qodana; }; then
render <<'${DELIM}' >> .github/workflows/ci.yml
${ciExtra.content}
${DELIM}
echo "  + CI jobs:$(on sonar && echo ' SonarCloud')$(on qodana && echo ' Qodana')"
fi

step "Package versions (latest stable; Microsoft and EF Core packages stay on 10.x)"
for id in $(grep -oE 'Include="[^"]+" Version=""' Directory.Packages.props | sed -E 's/Include="([^"]+)".*/\\1/'); do
  case "$id" in
    Microsoft.EntityFrameworkCore*|Microsoft.AspNetCore.*|Microsoft.Extensions.*|Npgsql.EntityFrameworkCore.PostgreSQL) v=$(latest "$id" 10) ;;
    *) v=$(latest "$id") ;;
  esac
  [ -n "$v" ] || die "Could not find a stable version of $id on nuget.org"
  sed -i.bak "s|Include=\\"$id\\" Version=\\"\\"|Include=\\"$id\\" Version=\\"$v\\"|" Directory.Packages.props && rm -f Directory.Packages.props.bak
  echo "  $id $v"
done

step "Projects and references (Reference 5, 11.2, 12.2)"
P="$NAME"
dotnet new sln -n "$P" >/dev/null
dotnet new install xunit.v3.templates >/dev/null
dotnet new classlib -n "$P.Domain" -o "src/$P.Domain" >/dev/null
dotnet new classlib -n "$P.Application" -o "src/$P.Application" >/dev/null
dotnet new classlib -n "$P.Infrastructure" -o "src/$P.Infrastructure" >/dev/null
dotnet new web -n "$P.Api" -o "src/$P.Api" >/dev/null
if on worker; then dotnet new worker -n "$P.Worker" -o "src/$P.Worker" >/dev/null; fi
for t in Domain.UnitTests Application.UnitTests Architecture.Tests Api.IntegrationTests; do
  dotnet new xunit3 -n "$P.$t" -o "tests/$P.$t" >/dev/null
done
rm -f src/*/Class1.cs tests/*/UnitTest1.cs "src/$P.Worker/Worker.cs" src/*/*.http
# Target framework comes only from Directory.Build.props (the xUnit v3 template defaults to an older one)
for c in src/*/*.csproj tests/*/*.csproj; do sed -i.bak '/<TargetFramework>/d' "$c" && rm -f "$c.bak"; done
for p in src/*/*.csproj; do dotnet sln "$P.slnx" add "$p" --solution-folder src >/dev/null; done
for p in tests/*/*.csproj; do dotnet sln "$P.slnx" add "$p" --solution-folder tests >/dev/null; done
S="src/$P"; T="tests/$P"
dotnet add "$S.Application" reference "$S.Domain" >/dev/null
dotnet add "$S.Infrastructure" reference "$S.Application" >/dev/null
dotnet add "$S.Api" reference "$S.Application" "$S.Infrastructure" >/dev/null
if on worker; then dotnet add "$S.Worker" reference "$S.Application" "$S.Infrastructure" >/dev/null; fi
dotnet add "$T.Domain.UnitTests" reference "$S.Domain" >/dev/null
dotnet add "$T.Application.UnitTests" reference "$S.Application" >/dev/null
dotnet add "$T.Architecture.Tests" reference src/*/*.csproj >/dev/null
dotnet add "$T.Api.IntegrationTests" reference "$S.Api" "$S.Infrastructure" >/dev/null
echo "  $(dotnet sln "$P.slnx" list | tail -n +3 | wc -l | tr -d ' ') projects in $P.slnx"

${pkgLines('Domain', '$S.Domain')}
${pkgLines('Application', '$S.Application')}
${pkgLines('Infrastructure', '$S.Infrastructure')}
insert_before_end "$(ls "$S.Infrastructure"/*.csproj)" '  <ItemGroup>\\n    <FrameworkReference Include="Microsoft.AspNetCore.App" />\\n  </ItemGroup>'
${pkgLines('Api', '$S.Api')}
if on worker; then
${pkgLines('Worker', '$S.Worker')}
fi
${pkgLines('Domain.UnitTests', '$T.Domain.UnitTests')}
${pkgLines('Application.UnitTests', '$T.Application.UnitTests')}
${pkgLines('Architecture.Tests', '$T.Architecture.Tests')}
${pkgLines('Api.IntegrationTests', '$T.Api.IntegrationTests')}
for c in tests/*/*.csproj; do
  grep -q '<OutputType>Exe</OutputType>' "$c" || insert_before_end "$c" '  <PropertyGroup>\\n    <OutputType>Exe</OutputType>\\n  </PropertyGroup>'
done
echo "  packages referenced per the 12.2 tables"

if on postgres; then
  dotnet new tool-manifest --force >/dev/null
  dotnet tool install dotnet-ef >/dev/null && echo "  + dotnet-ef (local tool)"
fi
dotnet user-secrets init --project "$S.Api" >/dev/null
if on worker; then dotnet user-secrets init --project "$S.Worker" >/dev/null; fi
echo "  User Secrets initialised"

step "Boilerplate code (Reference 11.3 and 13 to 18)"
${files.map(emit).join('\n')}

step "Build"
if ! dotnet build "$P.slnx" -nologo -v quiet; then
  die "The build failed: fix the code, then correct the Reference so the next project starts clean."
fi

if on postgres; then
  step "First migration (Reference 8.11)"
  dotnet ef migrations add InitialCreate --project "$S.Infrastructure" --startup-project "$S.Api" --output-dir Database/Migrations
fi

if [ "$RUN_TESTS" = 1 ]; then
  step "Tests"
  if on postgres; then echo "  Docker must be running: the integration tests start PostgreSQL$(on messaging && echo ' and RabbitMQ') with Testcontainers"; fi
  if on messaging && [ -z "\${MT_LICENSE:-}\${MT_LICENSE_PATH:-}" ]; then echo "  ! MT_LICENSE / MT_LICENSE_PATH is not set: the integration tests will fail (Add-on B.1)"; fi
  dotnet test --solution "$P.slnx"
fi

printf '\\n✓ Skeleton Solution ready. Tick the Done Conditions of steps 1.2 to 2.5, then continue with step 3.1:\\n  https://dotnet-launchpad.vercel.app/docs/setup/run-locally\\n'
if [ -n "$ADDED" ]; then printf '  The add-on code is in too (%s): tick those add-on steps after the core flow.\\n' "\${ADDED#, }"; fi
`;

writeFileSync(join(root, 'static/scaffold.sh'), script, {mode: 0o755});
console.log(`[scaffold] static/scaffold.sh: ${files.length + rootFiles.length} files; ${reservedSegments.length} reserved name segments; flags ${FLAGS.join(', ')}`);

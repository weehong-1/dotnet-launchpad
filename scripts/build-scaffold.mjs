// Builds static/scaffold.sh from the English Reference pages: one command that creates the whole
// Skeleton Solution (Setup Flow steps 1.2 to 2.6). Every file's content comes from the Reference,
// so the script never drifts from the code shown on the site. The build fails if the Reference
// changes shape in a way this generator does not understand.
import {mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = join(root, 'docs/reference');
const DELIM = '__DPS_EOF__';

function fail(msg) {
  console.error(`[scaffold] ${msg}`);
  process.exit(1);
}

/** Sections of a page: heading text, level, and the fenced code blocks directly under it. */
function sections(page) {
  const lines = readFileSync(join(ref, page), 'utf8').split('\n');
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
    const m = /^(#{1,4}) (.*?)(?: \\\{#[^}\\]+\\\})?$/.exec(line);
    if (m) {
      cur = {level: m[1].length, text: m[2], blocks: []};
      out.push(cur);
    } else if (cur && line.trim()) {
      cur.prose = (cur.prose ?? []).concat(line);
    }
  }
  return out;
}

function section(page, prefix) {
  const s = sections(page).find((x) => x.text.startsWith(prefix + ' '));
  if (!s) fail(`section ${prefix} not found in ${page}`);
  return s;
}

function code(page, prefix, index = 0, count) {
  const s = section(page, prefix);
  if (count !== undefined && s.blocks.length !== count) fail(`${prefix}: expected ${count} code block(s), found ${s.blocks.length}`);
  if (!s.blocks[index]) fail(`${prefix}: no code block #${index}`);
  return s.blocks[index].code;
}

// ---------------------------------------------------------------- file lists from 11 (file overview)
const overview = readFileSync(join(ref, 'code/11-file-overview.mdx'), 'utf8').split('\n');
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
const files = []; // {path, when, content}

function layer(page, num, project) {
  for (const s of sections(page)) {
    const m = new RegExp(`^${num}\\.(\\d+) (.+)$`).exec(s.text);
    if (!m || /AI coding agent prompt|conventions/i.test(m[2])) continue;
    const when = /\(optional: auditing\)/.test(m[2]) ? 'auditing' : project === 'Worker' ? 'worker' : undefined;
    const names = m[2].replace(/\s*\(.*\)$/, '').split(' and ').map((n) => n.trim());
    if (!names.every((n) => /\.\w+$/.test(n))) continue; // sections without files, such as 16.12's parent
    if (s.blocks.length < names.length) fail(`${num}.${m[1]}: ${names.length} file(s) but ${s.blocks.length} code block(s)`);
    if (s.blocks.length > names.length) console.log(`[scaffold] ${num}.${m[1]}: using the first ${names.length} of ${s.blocks.length} code blocks (the rest are examples)`);
    names.forEach((n, i) => files.push({path: pathFor(project, n), when, content: s.blocks[i].code}));
  }
}

layer('code/13-domain.mdx', 13, 'Domain');
layer('code/14-application.mdx', 14, 'Application');
layer('code/15-infrastructure.mdx', 15, 'Infrastructure');
layer('code/16-api.mdx', 16, 'Api');
layer('code/17-worker-optional.mdx', 17, 'Worker');
layer('code/18-tests.mdx', 18, 'Tests');

// 16.12: four settings files under #### sub headings
const apiSections = sections('code/16-api.mdx');
const settings = {};
for (const s of apiSections) {
  const m = /^(appsettings(?:\.\w+)?\.json)/.exec(s.text);
  if (m && s.level === 3) {
    settings[m[1]] = s.blocks[0].code;
    files.push({path: pathFor('Api', m[1]), content: s.blocks[0].code});
  }
}
if (Object.keys(settings).length !== 4) fail(`16.12: expected 4 settings files, found ${Object.keys(settings).length}`);

// 17.1: the Worker's settings are the Api's minus the sections it does not use
for (const [name, json] of Object.entries(settings)) {
  const obj = JSON.parse(json);
  for (const k of ['Cors', 'OpenApi', 'Migrations', 'Authentication', 'RateLimiting']) delete obj[k];
  if (obj.Serilog?.Properties?.Application) obj.Serilog.Properties.Application = 'ProductName.Worker';
  const text = JSON.stringify(obj, null, 2).replace(/\/api\/log-\.json/g, '/worker/log-.json');
  files.push({path: pathFor('Worker', name), when: 'worker', content: text});
}


// 11.3: one GlobalUsings.cs per project, paired with the path line above each code block
const usings = section('code/11-file-overview.mdx', '11.3');
const usingPaths = (usings.prose ?? []).map((l) => /^`((?:src|tests)\/[^`]+\/GlobalUsings\.cs)`/.exec(l)?.[1]).filter(Boolean);
if (usingPaths.length !== usings.blocks.length || usingPaths.length < 9) fail(`11.3: ${usingPaths.length} paths but ${usings.blocks.length} code blocks`);
usingPaths.forEach((path, i) => files.push({path, when: path.includes('.Worker/') ? 'worker' : undefined, content: usings.blocks[i].code}));

// ---------------------------------------------------------------- solution level files (12)
const S = 'code/12-solution-level.mdx';
const rootFiles = [
  {path: 'Directory.Build.props', content: code(S, '12.1', 0, 1)},
  {path: 'Directory.Packages.props', content: code(S, '12.2', 0, 1)},
  {path: 'global.json', content: code(S, '12.3', 0, 1)},
  {path: '.editorconfig', content: code(S, '12.4', 0, 1)},
  {path: 'docker-compose.yml', content: code(S, '12.5', 0, 1)},
  {path: 'BannedSymbols.txt', content: code(S, '12.6', 0, 1)},
  {path: 'deploy/systemd/productname-api.service', content: code(S, '12.7', 0, 2)},
  {path: 'deploy/systemd/productname-worker.service', when: 'worker', content: code(S, '12.7', 1, 2)},
  {path: 'deploy/nginx/productname-api.conf', content: code(S, '12.8', 0, 1)},
  {path: 'deploy/env/api.env.example', content: code(S, '12.9', 0, 2)},
  {path: 'deploy/env/worker.env.example', when: 'worker', content: code(S, '12.9', 1, 2)},
  {path: '.github/workflows/ci.yml', content: code(S, '12.10', 0, 3)},
  {path: 'qodana.yaml', when: 'qodana', content: code(S, '12.10', 2, 3)},
];
const ciExtraJobs = code(S, '12.10', 1, 3);

// 12.2 table: packages per project
const table = section(S, '12.2').prose.filter((l) => /^\| (Domain|Application|Infrastructure|Api|Worker|Domain\.UnitTests|Application\.UnitTests|Architecture\.Tests|Api\.IntegrationTests) \|/.test(l));
const setLine = section(S, '12.2').prose.find((l) => l.startsWith('The `xunit` set means'));
if (!setLine) fail('12.2: the sentence defining the `xunit` set is missing');
const xunitSet = [...setLine.split('. ')[0].matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((n) => n !== 'xunit');
const packages = {};
for (const row of table) {
  const cells = row.split('|').map((c) => c.trim());
  const project = cells[1];
  const names = [...cells[3].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  packages[project] = [...(cells[3].includes('`xunit` set') ? xunitSet : []), ...names.filter((n) => n !== 'xunit')];
}
if (Object.keys(packages).length !== 9) fail(`12.2 table: expected 9 projects, found ${Object.keys(packages).length}`);

// Project Name segments must not match a type name the Boilerplate uses unqualified: a namespace
// segment such as Acme.Task would shadow System.Threading.Tasks.Task inside the project's namespaces.
function walkMdx(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walkMdx(p) : n.endsWith('.mdx') ? [p] : [];
  });
}
const identifiers = new Set();
for (const file of walkMdx(join(ref, 'code'))) {
  for (const m of readFileSync(file, 'utf8').matchAll(/```csharp\n([\s\S]*?)\n```/g)) {
    const codeOnly = m[1].replace(/\/\/.*$/gm, '').replace(/"(?:[^"\\]|\\.)*"/g, '');
    for (const id of codeOnly.matchAll(/\b[A-Z][A-Za-z0-9]*\b/g)) identifiers.add(id[0]);
  }
}
identifiers.delete('ProductName');
const reservedSegments = [...identifiers].sort();
mkdirSync(join(root, 'src/generated'), {recursive: true});
writeFileSync(join(root, 'src/generated/reserved-name-segments.json'), JSON.stringify(reservedSegments) + '\n');

// Reserved Short Names come from the site's own list, so the script and the form agree.
const projectTs = readFileSync(join(root, 'src/lib/project.tsx'), 'utf8');
const reservedBlock = /RESERVED_SHORT_NAMES = new Set\(\[([\s\S]*?)\]\)/.exec(projectTs);
if (!reservedBlock) fail('RESERVED_SHORT_NAMES not found in src/lib/project.tsx');
const reserved = [...reservedBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

// ---------------------------------------------------------------- emit the bash script
for (const f of [...files, ...rootFiles]) if (f.content.includes(DELIM)) fail(`${f.path} contains the heredoc delimiter`);

function emit(f) {
  const body = `emit '${f.path}' <<'${DELIM}'\n${f.content}\n${DELIM}`;
  return f.when ? `if on ${f.when}; then\n${body}\nfi` : body;
}

function pkgLine(project, dir) {
  const list = packages[project].filter((p) => p !== 'Microsoft.AspNetCore.App');
  return `add_packages "${dir}" ${list.map((p) => `'${p}'`).join(' ')}`;
}

const script = `#!/usr/bin/env bash
# .NET Launchpad: scaffold a Skeleton Solution from Boilerplate v1.0 (Setup Flow steps 1.2 to 2.6).
# Generated from https://dotnet-launchpad.vercel.app/docs/reference by scripts/build-scaffold.mjs. Do not edit.
#
# Usage, inside the empty repository folder from Setup Flow step 1.1:
#   bash scaffold.sh --name Company.Product [--short product] [--no-worker] [--no-auditing] [--sonar] [--qodana] [--test]
#   --test also runs dotnet test; it needs Docker and MT_LICENSE or MT_LICENSE_PATH (MassTransit v9 license).
set -euo pipefail

NAME=""; SHORT=""; WORKER=1; AUDITING=1; SONAR=0; QODANA=0; RUN_TESTS=0
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --short) SHORT="$2"; shift 2 ;;
    --worker) WORKER=1; shift ;;
    --no-worker) WORKER=0; shift ;;
    --auditing) AUDITING=1; shift ;;
    --no-auditing) AUDITING=0; shift ;;
    --sonar) SONAR=1; shift ;;
    --qodana) QODANA=1; shift ;;
    --test) RUN_TESTS=1; shift ;;
    -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

die() { echo "✗ $*" >&2; exit 1; }
step() { printf '\\n\\033[1m▶ %s\\033[0m\\n' "$*"; }

[ -n "$NAME" ] || die "--name is required, for example --name Company.Product"
[[ "$NAME" =~ ^[A-Z][A-Za-z0-9]*(\\.[A-Z][A-Za-z0-9]*)*$ ]] || die "Project Name must be dot-separated PascalCase, for example Company.Product"
[ -n "$SHORT" ] || SHORT=$(printf '%s' "\${NAME##*.}" | tr '[:upper:]' '[:lower:]')
[[ "$SHORT" =~ ^[a-z][a-z0-9-]{0,31}$ ]] || die "Short Name must be at most 32 lowercase letters, digits or hyphens: $SHORT"
for seg in \${NAME//./ }; do
  case " ${reservedSegments.join(' ')} " in *" $seg "*) die "Project Name segment '$seg' is a type name the Boilerplate uses; it would shadow that type in the generated code. Choose another name" ;; esac
done
case " ${reserved.join(' ')} " in *" $SHORT "*) die "Short Name '$SHORT' is an existing system account; the service needs its own (use --short)" ;; esac
command -v dotnet >/dev/null || die "dotnet not found (Setup Flow step 0.4)"
command -v curl >/dev/null || die "curl not found"
SDK=$(dotnet --list-sdks | awk '$1 ~ /^10\\./ {v=$1} END {print v}')
[ -n "$SDK" ] || die ".NET 10 SDK not found (Setup Flow step 0.4)"
ls ./*.slnx >/dev/null 2>&1 && die "A solution already exists here; run this only once, in an empty repository"

on() {
  case "$1" in
    worker) [ "$WORKER" = 1 ] ;;
    auditing) [ "$AUDITING" = 1 ] ;;
    sonar) [ "$SONAR" = 1 ] ;;
    qodana) [ "$QODANA" = 1 ] ;;
  esac
}

# Keeps or drops lines marked with @@flag / @@!flag / @@flag-begin..end, then fills in the names.
render() {
  awk -v worker="$WORKER" -v auditing="$AUDITING" -v sonar="$SONAR" -v qodana="$QODANA" '
    function holds(neg, f,   v) {
      v = (f == "worker") ? worker : (f == "auditing") ? auditing : (f == "sonar") ? sonar : qodana
      return neg ? v == 0 : v == 1
    }
    function open_ok(   i, s, ng) {
      for (i = 1; i <= n; i++) { s = stack[i]; ng = (substr(s, 1, 1) == "!"); if (ng) s = substr(s, 2); if (!holds(ng, s)) return 0 }
      return 1
    }
    {
      line = $0
      if (match(line, /[ \\t]*(\\/\\/|#|<!--|--)[ \\t]*@@!?(worker|auditing|sonar|qodana)(-begin|-end)?[ \\t]*(-->)?[ \\t]*$/)) {
        content = substr(line, 1, RSTART - 1); m = substr(line, RSTART, RLENGTH)
        neg = (m ~ /@@!/); f = m; sub(/.*@@!?/, "", f); sub(/[^a-z].*$/, "", f)
        if (m ~ /-begin/) { stack[++n] = (neg ? "!" : "") f; next }
        if (m ~ /-end/) { n--; next }
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
  path=$(printf '%s\n' "$1" | names)
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

echo "Scaffolding $NAME (short name $SHORT) · Worker $([ $WORKER = 1 ] && echo on || echo off) · Auditing $([ $AUDITING = 1 ] && echo on || echo off) · .NET SDK $SDK"

step "Solution level files (Reference 12)"
[ -f .gitignore ] || { dotnet new gitignore >/dev/null && echo "  + .gitignore"; }
${rootFiles.map(emit).join('\n')}
sed -i.bak -E 's/"version": "[^"]+"/"version": "'"$SDK"'"/' global.json && rm -f global.json.bak
if on sonar || on qodana; then
render <<'${DELIM}' >> .github/workflows/ci.yml
${ciExtraJobs}
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

${pkgLine('Domain', '$S.Domain')}
${pkgLine('Application', '$S.Application')}
${pkgLine('Infrastructure', '$S.Infrastructure')}
insert_before_end "$(ls "$S.Infrastructure"/*.csproj)" '  <ItemGroup>\\n    <FrameworkReference Include="Microsoft.AspNetCore.App" />\\n  </ItemGroup>'
${pkgLine('Api', '$S.Api')}
if on worker; then ${pkgLine('Worker', '$S.Worker')}; fi
${pkgLine('Domain.UnitTests', '$T.Domain.UnitTests')}
${pkgLine('Application.UnitTests', '$T.Application.UnitTests')}
${pkgLine('Architecture.Tests', '$T.Architecture.Tests')}
${pkgLine('Api.IntegrationTests', '$T.Api.IntegrationTests')}
for c in tests/*/*.csproj; do
  grep -q '<OutputType>Exe</OutputType>' "$c" || insert_before_end "$c" '  <PropertyGroup>\\n    <OutputType>Exe</OutputType>\\n  </PropertyGroup>'
done
echo "  packages referenced per the 12.2 table"

dotnet new tool-manifest --force >/dev/null
dotnet tool install dotnet-ef >/dev/null && echo "  + dotnet-ef (local tool)"
dotnet user-secrets init --project "$S.Api" >/dev/null
if on worker; then dotnet user-secrets init --project "$S.Worker" >/dev/null; fi
echo "  User Secrets initialised"

step "Boilerplate code (Reference 13 to 18)"
${files.map(emit).join('\n')}

step "Build"
if ! dotnet build "$P.slnx" -nologo -v quiet; then
  die "The build failed. Boilerplate v1.0 is not yet verified by a build: fix the code, then correct the Reference so the next project starts clean."
fi

step "First migration (Reference 8.11)"
dotnet ef migrations add InitialCreate --project "$S.Infrastructure" --startup-project "$S.Api" --output-dir Database/Migrations

if [ "$RUN_TESTS" = 1 ]; then
  step "Tests (Docker must be running for Testcontainers)"
  [ -n "\${MT_LICENSE:-}\${MT_LICENSE_PATH:-}" ] || echo "  ! MT_LICENSE / MT_LICENSE_PATH is not set: the integration tests will fail (Setup Flow step 0.3)"
  dotnet test --solution "$P.slnx"
fi

printf '\\n✓ Skeleton Solution ready. Tick the Done Conditions of steps 1.2 to 2.6, then continue with step 3.1:\\n  https://dotnet-launchpad.vercel.app/docs/setup/local-services\\n'
`;

writeFileSync(join(root, 'static/scaffold.sh'), script, {mode: 0o755});
console.log(`[scaffold] static/scaffold.sh: ${files.length + rootFiles.length} files; ${reservedSegments.length} reserved name segments`);

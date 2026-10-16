# .NET Launchpad

A bilingual (English, 简体中文) Docusaurus site that walks through setting up a new .NET 10 backend with Clean Architecture, DDD and CQRS, one step at a time. Live at https://dotnet-launchpad.vercel.app.

- **Setup Flow** (`docs/setup/`, sidebar `setup`): the core Steps, each with Done Conditions. Code steps open on the Manual route, which lists every file from `src/generated/boilerplate.json`.
- **Add-ons** (also `docs/setup/`, sidebar `addons`): PostgreSQL, Messaging, Worker, Auditing, Authentication and Go live, each with its own Steps. They are defined once in `src/data/addons.json` (id, letter, scaffold flag, requirements, labels).
- Done Conditions live in `src/data/steps.ts`; step ids are Progress keys and page slugs, so never rename them. When a check moves to another step, add it to `src/data/progress-migration.ts`.
- **Reference** (`docs/reference/`): the template itself, Boilerplate v2.0. Snippets shared with the Setup Flow live in `docs/reference/_partials/`.
- Chinese pages mirror the English ones under `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`.

Vocabulary is in `CONTEXT.md`; decisions are in `docs/adr/`.

## Content conventions in code blocks

| Write | Renders as |
| --- | --- |
| `ProductName` / `productname` | the active project's Project Name / Short Name |
| `%%ProductName%%` / `%%productname%%` | the literal placeholder (text about the placeholder itself) |
| `{{projectName}}`, `{{shortName}}`, `{{<flag>}}` such as `{{postgres}}` or `{{sonar}}` | Project Settings values |
| a line ending in `# @@postgres` (or `// @@auth`, `<!-- @@messaging -->`, `-- @@auditing`) | kept only when that add-on (or decision) is on |
| a line ending in `// @@!messaging` | kept only when it is off |
| lines `# @@postgres-begin` … `# @@postgres-end` | a block kept only when on; blocks nest |

The flags are the add-on ids plus `sonar` and `qodana`, lowercase letters only. `npm run generate` fails on an unknown flag.

- **Headings**: a Reference section that belongs to an add-on ends with `(add-on: <label>)`, its label from `addons.json`, and sits inside `<Optional when="<flag>">…</Optional>`. Keep the explicit `\{#anchor\}`, so links survive relabelling.
- **JSON**: an add-on line is never the last entry of an object. Where a trailing comma depends on a flag, write the line twice, as `// @@x` and `// @@!x`. The generator parses every appsettings file for every flag combination.
- **Highlighting**: the add-on pages highlight the lines that exist only because of that add-on. These are computed from the markers, so never write `highlight-next-line` comments in the Reference.
- **zh-Hans**: Chinese code blocks must have the same lines and markers as the English ones; only comments are translated. The generator checks it.
- Prose for one add-on goes inside `<Optional when="worker">…</Optional>` (comma separated flags mean "any of"). On Setup Flow pages, `<FlagScope core>` renders code as the core, and `<FlagScope addon="x">` renders it with that add-on in.

## Commands

```bash
npm install
npm start                      # English dev server
npm start -- --locale zh-Hans  # Chinese dev server
npm run build                  # both locales; broken links and anchors fail the build
```

`npm run build` and `npm start` first run `npm run generate`, which writes three files from the Reference:

- `static/TEMPLATE.md` and `static/TEMPLATE.zh.md` (`scripts/build-template-md.mjs`): the whole Reference as one file for AI coding agents (Setup Flow step 1.1).
- `static/scaffold.sh` (`scripts/build-scaffold.mjs`): the one command that builds the Skeleton Solution (Setup Flow step 1.2), with one flag per add-on. The generator reads file paths from Reference 11, packages from the two 12.2 tables and every file's code from sections 11.3 and 12 to 18; if the Reference changes shape in a way it does not understand, the build fails. It also writes `src/generated/boilerplate.json` for the site.

After changing Boilerplate code, verify it the way v2.0 was verified: run the generated script in empty folders and let it build, create the migration and test. Run each row in its own empty folder:

```bash
npm run generate
mkdir -p /tmp/try && cd /tmp/try && git init -q
bash <repo>/static/scaffold.sh --name Acme.Core --test                          # core: no Docker, no license
bash <repo>/static/scaffold.sh --name Acme.Store --postgres --test              # empty InitialCreate
bash <repo>/static/scaffold.sh --name Acme.Audit --postgres --auditing --test   # only the audit tables
bash <repo>/static/scaffold.sh --name Acme.Auth --auth --test
bash <repo>/static/scaffold.sh --name Acme.Bus --postgres --messaging --test    # Outbox and Inbox tables
bash <repo>/static/scaffold.sh --name Acme.Billing --all --sonar --qodana --test   # the v1.0 equivalent
bash <repo>/static/scaffold.sh --name Acme.Bad --messaging                      # must fail: needs --postgres
```

Every row must build with zero warnings. The PostgreSQL rows need Docker, and the Messaging rows a MassTransit v9 license (`MT_LICENSE` or `MT_LICENSE_PATH`).

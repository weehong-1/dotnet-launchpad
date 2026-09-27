# .NET Launchpad

A bilingual (English, 简体中文) Docusaurus site that walks through setting up a new .NET 10 Clean Architecture backend, one step at a time. Live at https://dotnet-launchpad.vercel.app.

- **Setup Flow** (`docs/setup/`): the ordered Steps, each with Done Conditions. The Done Conditions themselves live in `src/data/steps.ts`; step ids are Progress keys, so never rename them.
- **Reference** (`docs/reference/`): the template itself, Boilerplate v1.0. Snippets shared with the Setup Flow live in `docs/reference/_partials/`.
- Chinese pages mirror the English ones under `i18n/zh-Hans/docusaurus-plugin-content-docs/current/`.

Vocabulary is in `CONTEXT.md`; decisions are in `docs/adr/`.

## Content conventions in code blocks

| Write | Renders as |
| --- | --- |
| `ProductName` / `productname` | the active project's Project Name / Short Name |
| `%%ProductName%%` / `%%productname%%` | the literal placeholder (text about the placeholder itself) |
| `{{projectName}}`, `{{shortName}}`, `{{worker}}`, `{{auditing}}`, `{{sonar}}`, `{{qodana}}` | Project Settings values |
| a line ending in `# @@worker` (or `// @@auditing`, `-- @@auditing`) | kept only when that component is on |
| a line ending in `// @@!worker` | kept only when it is off |
| lines `# @@sonar-begin` … `# @@sonar-end` | a block kept only when on |

Prose that applies to one Optional Component goes inside `<Optional when="worker">…</Optional>` (comma separated flags mean "any of").

## Commands

```bash
npm install
npm start                      # English dev server
npm start -- --locale zh-Hans  # Chinese dev server
npm run build                  # both locales; broken links and anchors fail the build
```

`npm run build` and `npm start` first run `npm run generate`, which writes three files from the Reference:

- `static/TEMPLATE.md` and `static/TEMPLATE.zh.md` (`scripts/build-template-md.mjs`): the whole Reference as one file for AI coding agents (Setup Flow step 1.1).
- `static/scaffold.sh` (`scripts/build-scaffold.mjs`): the one command that builds the whole Skeleton Solution (Setup Flow step 1.2). The generator reads file paths from Reference 11, packages from the 12.2 table and every file's code from sections 11.3 and 12 to 18; if the Reference changes shape in a way it does not understand, the build fails.

After changing Boilerplate code, verify it the way v1.0 was verified: run the generated script in an empty folder and let it build, create the migration and test.

```bash
npm run generate
mkdir -p /tmp/try && cd /tmp/try && git init -q
bash <repo>/static/scaffold.sh --name Acme.Billing --test            # Worker and Auditing on
bash <repo>/static/scaffold.sh --name Acme.Lean --no-worker --no-auditing --test   # in another empty folder
```

The integration test needs Docker and a MassTransit v9 license (`MT_LICENSE` or `MT_LICENSE_PATH`).

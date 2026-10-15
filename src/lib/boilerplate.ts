import data from '@site/src/generated/boilerplate.json';
import {ADDONS, dependentsOf, FLAGS, requirementsOf, type AddOn, type Flag, type Project} from './project';

/** One Boilerplate file, as scripts/build-scaffold.mjs read it from the Reference. */
export type BoilerplateFile = {
  path: string;
  /** Domain, Application, Infrastructure, Api, Worker, Tests or Solution */
  project: string;
  /** Flags that must all be on for the file to exist; empty for a core file. */
  when: Flag[];
  /** Reference page (docs path without extension) and anchor of the section that explains it. */
  page: string;
  anchor: string;
  section: string;
  en: string;
  zh: string;
};

export const FILES = data.files as BoilerplateFile[];
/** NuGet packages per project in the core Skeleton Solution (12.2). */
export const PACKAGES = data.packages as Record<string, string[]>;
/** NuGet packages each add-on adds, per project (12.2 add-on table). */
export const ADDON_PACKAGES = data.addonPackages as Record<string, Record<string, string[]>>;

export function codeOf(file: BoilerplateFile, locale: string): string {
  return locale === 'zh-Hans' ? file.zh : file.en;
}

/** `Domain` → `src/ProductName.Domain`, `Domain.UnitTests` → `tests/ProductName.Domain.UnitTests`. */
export function projectDir(project: string): string {
  return /Tests$/.test(project) ? `tests/ProductName.${project}` : `src/ProductName.${project}`;
}

const LANGUAGES: [RegExp, string][] = [
  [/\.cs$/, 'csharp'],
  [/\.json$/, 'json'],
  [/\.(props|csproj|slnx)$/, 'xml'],
  [/\.ya?ml$/, 'yaml'],
  [/\.(service|example)$|\.editorconfig$/, 'ini'],
  [/\.conf$/, 'nginx'],
];

export function languageOf(path: string): string {
  return LANGUAGES.find(([re]) => re.test(path))?.[1] ?? 'text';
}

/** Reference link for a file. Docusaurus drops number prefixes from URLs: code/16-api is /docs/reference/code/api. */
export function referenceHref(file: BoilerplateFile): string {
  return `/docs/reference/${file.page.replace(/(^|\/)\d+-/g, '$1')}#${file.anchor}`;
}

const ADDON_SET = new Set<string>(ADDONS.map((a) => a.id));

/**
 * The flags an add-on page shows its files with: the add-on, what it needs, and whatever else the
 * active project already has on, except add-ons that depend on this one (they come after it).
 */
export function previewFlags(addon: AddOn, project: Project | null): Flag[] {
  const later = new Set<Flag>(dependentsOf(addon));
  const fromProject = project ? FLAGS.filter((f) => project[f] && !later.has(f)) : [];
  return [...new Set<Flag>([addon, ...requirementsOf(addon), ...fromProject])];
}

export function isAddOn(flag: string): flag is AddOn {
  return ADDON_SET.has(flag);
}

import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: '.NET Launchpad',
  tagline: 'Step by step from an empty folder to a deployed .NET 10 Clean Architecture skeleton',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://dotnet-launchpad.vercel.app',
  baseUrl: '/',
  trailingSlash: false,

  headTags: [
    {tagName: 'meta', attributes: {name: 'algolia-site-verification', content: '13895F099BB8CC98'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.googleapis.com'}},
    {tagName: 'link', attributes: {rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous'}},
  ],
  stylesheets: [
    {href: 'https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap'},
  ],

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      'zh-Hans': {label: '简体中文', htmlLang: 'zh-Hans', baseUrl: '/zh/'},
    },
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          exclude: ['adr/**', '**/_*.{md,mdx}', '**/_*/**'],
        },
        blog: false,
        theme: {
          customCss: ['./src/css/modernist.css', './src/css/custom.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {hideable: true},
    },
    // Algolia DocSearch, filled by the Algolia Crawler. The key is the search-only key, safe to publish.
    algolia: {
      appId: 'AT3A008MUS',
      apiKey: '6c765ee3592834de0bc41beb418856c1',
      indexName: '_net_launchpad_pages',
      contextualSearch: true,
    },
    navbar: {
      title: '.NET Launchpad',
      logo: {
        alt: '.NET Launchpad',
        src: 'img/logo.svg',
      },
      items: [
        {type: 'docSidebar', sidebarId: 'setup', position: 'left', label: 'Setup Flow'},
        {type: 'docSidebar', sidebarId: 'reference', position: 'left', label: 'Reference'},
        {to: '/projects', label: 'Projects', position: 'left'},
        {type: 'search', position: 'right'},
        {type: 'custom-localeSegment', position: 'right'},
      ],
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['csharp', 'bash', 'json', 'yaml', 'ini', 'nginx', 'sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

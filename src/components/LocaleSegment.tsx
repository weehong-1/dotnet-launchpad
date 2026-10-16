import React, {type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useAlternatePageUtils} from '@docusaurus/theme-common/internal';
import {useHistorySelector} from '@docusaurus/theme-common';

const SHORT_LABELS: Record<string, string> = {en: 'EN', 'zh-Hans': '中文'};

/** The language switch as a segmented control: one full-page link per locale, the current one filled. */
export default function LocaleSegment({mobile}: {mobile?: boolean}): ReactNode {
  const {
    i18n: {currentLocale, locales, localeConfigs},
  } = useDocusaurusContext();
  const alternatePageUtils = useAlternatePageUtils();
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);

  const seg = (
    <div className="seg" role="group" aria-label="Language">
      {locales.map((locale) => (
        <a
          key={locale}
          className="seg-opt"
          href={`${alternatePageUtils.createUrl({locale, fullyQualified: false})}${search}${hash}`}
          hrefLang={localeConfigs[locale]?.htmlLang}
          lang={localeConfigs[locale]?.htmlLang}
          aria-current={locale === currentLocale ? 'true' : undefined}
          title={localeConfigs[locale]?.label}>
          {SHORT_LABELS[locale] ?? localeConfigs[locale]?.label}
        </a>
      ))}
    </div>
  );

  if (mobile) {
    return <li className="menu__list-item" style={{padding: 'var(--space-2) var(--ifm-menu-link-padding-horizontal)'}}>{seg}</li>;
  }
  return <div className="navbar__item">{seg}</div>;
}

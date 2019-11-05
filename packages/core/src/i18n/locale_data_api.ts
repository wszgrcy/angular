/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { LOCALE_DATA, LocaleDataIndex } from './locale_data';
import localeEn from './locale_en';

/**
 * Retrieves the plural function used by ICU expressions to determine the plural case to use
 * for a given locale.
 * @param locale A locale code for the locale format rules to use.
 * @returns The plural function for the locale.
 * @see `NgPlural`
 * @see [Internationalization (i18n) Guide](https://angular.io/guide/i18n)
 */
export function getLocalePluralCase(locale: string): (value: number) => number {
  const data = findLocaleData(locale);
  return data[LocaleDataIndex.PluralCase];
}

/**
 * Finds the locale data for a given locale.
 * 通过地区查找本地化数据
 * @param locale The locale code.
 * @returns The locale data.
 * @see [Internationalization (i18n) Guide](https://angular.io/guide/i18n)
 */
export function findLocaleData(locale: string): any {
  const normalizedLocale = locale.toLowerCase().replace(/_/g, '-');
  /**优先取手动配置的 */
  let match = LOCALE_DATA[normalizedLocale];
  if (match) {
    return match;
  }

  // let's try to find a parent locale
  /**如果找不到,会再找父级地区 */
  const parentLocale = normalizedLocale.split('-')[0];
  match = LOCALE_DATA[parentLocale];

  if (match) {
    return match;
  }
  /**最后如果为en,使用默认的 */
  if (parentLocale === 'en') {
    return localeEn;
  }

  throw new Error(`Missing locale data for the locale "${locale}".`);
}

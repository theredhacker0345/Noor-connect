/**
 * Shared prayer display helpers.
 * Used by both the notification layer (rich notification text) and the
 * dashboard (hero card) so the localized name + Arabic name stay consistent.
 */

import i18n from './i18n-new';

/** Internal Aladhan prayer names → existing flat locale keys. */
export const PRAYER_NAME_I18N_KEYS: Record<string, string> = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
};

/** Arabic names of the five daily prayers (language-independent). */
export const PRAYER_ARABIC_NAMES: Record<string, string> = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
};

/** Prayer order used to derive the next prayer (→ end of the current window). */
export const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

/** Build "Dhuhr — الظهر" style display pair (Arabic part rendered RTL-safe). */
export function getPrayerDisplayPair(prayerName: string): { localized: string; arabic: string | null } {
  const key = PRAYER_NAME_I18N_KEYS[prayerName];
  let localized = prayerName;
  if (key) {
    const translated = i18n.t(key);
    if (translated && translated !== key) localized = translated;
  }
  const arabic = PRAYER_ARABIC_NAMES[prayerName] || null;
  return { localized, arabic };
}

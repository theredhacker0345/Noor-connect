import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '@/lib/language-config';

// Import all locale JSON files (bundled by Vite — no HTTP backend needed)
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';
import urTranslations from '../locales/ur.json';
import bnTranslations from '../locales/bn.json';
import ruTranslations from '../locales/ru.json';
import frTranslations from '../locales/fr.json';
import koTranslations from '../locales/ko.json';
import trTranslations from '../locales/tr.json';

// Build i18next resources object
const resources = {
  en: { translation: enTranslations },
  ar: { translation: arTranslations },
  ur: { translation: urTranslations },
  bn: { translation: bnTranslations },
  ru: { translation: ruTranslations },
  fr: { translation: frTranslations },
  ko: { translation: koTranslations },
  tr: { translation: trTranslations },
};

// LanguageDetector was removed: setting `lng` below made it dead code — it never
// ran, and its localStorage cache ("i18nextLng") never matched the app's
// Preferences-based language. The LanguageProvider (Capacitor Preferences →
// system language) is the single resolver of the app language.
//
// First-paint optimization: LanguageProvider resolves asynchronously, which
// flashed English for a moment on every launch. LanguageProvider mirrors the
// chosen language into localStorage synchronously, so reading that mirror here
// gives the correct language on the very first render after the first launch.
function initialLanguage(): string {
  try {
    const mirror = localStorage.getItem('app-language');
    if (mirror) return mirror;
    // Legacy web path: Capacitor Preferences shim writes to localStorage
    const shim = localStorage.getItem('CapacitorStorage.app-language');
    if (shim) return shim;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return DEFAULT_LANGUAGE;
}

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['en', 'ar', 'ur', 'bn', 'ru', 'fr', 'ko', 'tr'],
    debug: false,

    interpolation: {
      escapeValue: true, // Enable escaping for security
    },

    react: {
      useSuspense: false,
    },

    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;

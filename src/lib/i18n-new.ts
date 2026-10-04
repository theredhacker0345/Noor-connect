import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { SUPPORTED_CODES, DEFAULT_LANGUAGE } from '@/lib/language-config';

// Import all locale JSON files (bundled by Vite — no HTTP backend needed)
import enTranslations from '../locales/en.json';
import arTranslations from '../locales/ar.json';
import urTranslations from '../locales/ur.json';
import bnTranslations from '../locales/bn.json';
import ruTranslations from '../locales/ru.json';
import frTranslations from '../locales/fr.json';
import koTranslations from '../locales/ko.json';

// Build i18next resources object
const resources = {
  en: { translation: enTranslations },
  ar: { translation: arTranslations },
  ur: { translation: urTranslations },
  bn: { translation: bnTranslations },
  ru: { translation: ruTranslations },
  fr: { translation: frTranslations },
  ko: { translation: koTranslations },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_CODES,
    debug: false,
    showSupportNotice: false,

    interpolation: {
      escapeValue: true, // Enable escaping for security
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },

    react: {
      useSuspense: false,
    },

    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;

/**
 * language-config.ts — Single Source of Truth for all supported languages.
 *
 * Every language code is ISO 639-1 (2-letter, lowercase).
 * Import from here instead of hard-coding codes elsewhere.
 */

export type LanguageCode = 'en' | 'ar' | 'ur' | 'bn' | 'ru' | 'fr' | 'ko';
export type Direction = 'ltr' | 'rtl';

export interface LanguageTypography {
    /** Line-height multiplier — tall scripts like Nastaliq need more vertical room */
    lineHeight: number;
    /** Font-size percentage adjustment relative to the base (e.g. '110%' for Urdu) */
    fontSizeAdjust: string;
}

export interface LanguageConfig {
    /** ISO 639-1 code */
    code: LanguageCode;
    /** Label in the language itself (for the dropdown) */
    nativeLabel: string;
    /** English name */
    englishLabel: string;
    /** Text direction */
    dir: Direction;
    /** Code used when calling al-quran.cloud or similar Quran APIs */
    quranApiCode: string;
    /** Typographic settings for this script */
    typography: LanguageTypography;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
    en: {
        code: 'en',
        nativeLabel: 'English',
        englishLabel: 'English',
        dir: 'ltr',
        quranApiCode: 'en',
        typography: { lineHeight: 1.5, fontSizeAdjust: '100%' },
    },
    ar: {
        code: 'ar',
        nativeLabel: 'العربية',
        englishLabel: 'Arabic',
        dir: 'rtl',
        quranApiCode: 'ar',
        typography: { lineHeight: 1.5, fontSizeAdjust: '105%' },
    },
    ur: {
        code: 'ur',
        nativeLabel: 'اردو',
        englishLabel: 'Urdu',
        dir: 'rtl',
        quranApiCode: 'ur',
        typography: { lineHeight: 1.8, fontSizeAdjust: '110%' },
    },
    bn: {
        code: 'bn',
        nativeLabel: 'বাংলা',
        englishLabel: 'Bengali',
        dir: 'ltr',
        quranApiCode: 'bn',
        typography: { lineHeight: 1.6, fontSizeAdjust: '100%' },
    },
    ru: {
        code: 'ru',
        nativeLabel: 'Русский',
        englishLabel: 'Russian',
        dir: 'ltr',
        quranApiCode: 'ru',
        typography: { lineHeight: 1.5, fontSizeAdjust: '100%' },
    },
    fr: {
        code: 'fr',
        nativeLabel: 'Français',
        englishLabel: 'French',
        dir: 'ltr',
        quranApiCode: 'fr',
        typography: { lineHeight: 1.5, fontSizeAdjust: '100%' },
    },
    ko: {
        code: 'ko',
        nativeLabel: '한국어',
        englishLabel: 'Korean',
        dir: 'ltr',
        quranApiCode: 'ko',
        typography: { lineHeight: 1.5, fontSizeAdjust: '100%' },
    },
};

/** All supported language codes */
export const SUPPORTED_CODES: LanguageCode[] = Object.keys(LANGUAGES) as LanguageCode[];

/** Codes whose UI direction is right-to-left */
export const RTL_CODES: LanguageCode[] = SUPPORTED_CODES.filter(
    (c) => LANGUAGES[c].dir === 'rtl'
);

/** Default / fallback language */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/** Quick check: is the given code RTL? */
export function isRTL(code: LanguageCode): boolean {
    return LANGUAGES[code]?.dir === 'rtl';
}

/** Validate and normalise a raw string into a LanguageCode (or fallback) */
export function toLanguageCode(raw: string | null | undefined): LanguageCode {
    if (raw && SUPPORTED_CODES.includes(raw as LanguageCode)) {
        return raw as LanguageCode;
    }
    return DEFAULT_LANGUAGE;
}


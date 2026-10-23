// knowledge-i18n — per-locale translations of the Noor Cycle knowledge Q&As.
//
// The English source of truth stays in src/data/haidh/knowledge.ts
// (HAIDH_KNOWLEDGE — 50 curated entries). These per-language files override
// the question / answer / madhab note / category label for users who selected
// that app language. Every field falls back to English individually, so a
// partial translation can never blank out content.
//
// File shape (each locale JSON):
// {
//   "_categories": { "basics": "...", ... },        // optional category labels
//   "<qa-id>": { "q": "...", "a": "...", "mn": "..." } // mn only when English has madhabNotes
// }

import ar from './ar.json';
import bn from './bn.json';
import ur from './ur.json';
import ru from './ru.json';
import fr from './fr.json';
import ko from './ko.json';

export interface KnowledgeEntryTranslation {
  /** Translated question. */
  q?: string;
  /** Translated answer (paragraphs separated by \n\n, mirroring English). */
  a?: string;
  /** Translated madhab-difference note (only for entries that have one). */
  mn?: string;
}

export type KnowledgeLocaleDict = {
  _categories?: Record<string, string>;
} & Record<string, KnowledgeEntryTranslation | undefined>;

export const KNOWLEDGE_I18N: Record<string, KnowledgeLocaleDict> = {
  ar: ar as KnowledgeLocaleDict,
  bn: bn as KnowledgeLocaleDict,
  ur: ur as KnowledgeLocaleDict,
  ru: ru as KnowledgeLocaleDict,
  fr: fr as KnowledgeLocaleDict,
  ko: ko as KnowledgeLocaleDict,
};

/** Dict for the given language code (undefined → use English source data). */
export function getKnowledgeDict(language: string): KnowledgeLocaleDict | undefined {
  return KNOWLEDGE_I18N[language];
}

/** Localized category label with English fallback. */
export function getKnowledgeCategoryLabel(language: string, id: string, fallback: string): string {
  return getKnowledgeDict(language)?._categories?.[id] || fallback;
}

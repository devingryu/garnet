import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '@/locales/en/translation.json';
import ko from '@/locales/ko/translation.json';

export const SUPPORTED_LANGUAGES = ['en', 'ko'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** English is the source catalog: it types every key (see types/i18next.d.ts),
 *  so a missing Korean string falls back at runtime but a typo'd key fails to
 *  compile (AGENTS.md rule 12). */
export const resources = {
    en: {translation: en},
    ko: {translation: ko},
} as const;

const LANGUAGE_STORAGE_KEY = 'garnet.language';

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: SUPPORTED_LANGUAGES,
        fallbackLng: 'en',
        // The webview reports the OS locale as e.g. "ko-KR"; we only ship
        // base languages.
        load: 'languageOnly',
        // React escapes on render — escaping here too would double-encode.
        interpolation: {escapeValue: false},
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
    });

// Keep <html lang> in step so the webview applies the right font fallback and
// line-breaking rules for CJK.
function syncDocumentLanguage(language: string) {
    document.documentElement.lang = language;
}

syncDocumentLanguage(i18n.resolvedLanguage ?? 'en');
i18n.on('languageChanged', syncDocumentLanguage);

export default i18n;

import type en from '@/locales/en/translation.json';

// Types every translation key off the English catalog, so `t('issue.stauts')`
// is a compile error rather than a string that renders as its own key.
declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'translation';
        resources: {translation: typeof en};
    }
}

import {useTranslation} from 'react-i18next';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {SUPPORTED_LANGUAGES} from '@/lib/i18n';
import type {Language} from '@/lib/i18n';

/** Language names are written in their own language, by convention — these
 *  are autonyms, not translatable strings, so they don't belong in the
 *  catalog. */
const AUTONYMS: Record<Language, string> = {
    en: 'English',
    ko: '한국어',
};

export function LanguageSelect() {
    const {t, i18n} = useTranslation();
    const current = (i18n.resolvedLanguage ?? 'en') as Language;

    return (
        <Select
            value={current}
            onValueChange={(value) => value && void i18n.changeLanguage(String(value))}
        >
            <SelectTrigger size="sm" className="w-full" aria-label={t('app.language')}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {SUPPORTED_LANGUAGES.map((language) => (
                    <SelectItem key={language} value={language}>
                        {AUTONYMS[language]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

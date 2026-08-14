import {describe, expect, test} from 'bun:test';
import {createInstance} from 'i18next';
import {errorMessage} from '@/lib/errors';
import en from '@/locales/en/translation.json';
import ko from '@/locales/ko/translation.json';

// A standalone instance rather than the app's: lib/i18n.ts touches `document`
// on import, and none of this needs a DOM.
const i18n = createInstance();
await i18n.init({
    lng: 'en',
    resources: {en: {translation: en}},
    interpolation: {escapeValue: false},
});
const t = i18n.t;

/** What Wails delivers: workspace.EncodeError's JSON, as a bare string. */
function envelope(code: string, params?: Record<string, string>) {
    return JSON.stringify({garnet: 1, code, params, message: `go-side text for ${code}`});
}

describe('errorMessage', () => {
    test('translates a coded error and fills its params', () => {
        expect(errorMessage(t, envelope('invalid_transition', {from: 'todo', to: 'done'}))).toBe(
            'This issue can\'t move from "todo" to "done".'
        );
    });

    test('handles a coded error with no params', () => {
        expect(errorMessage(t, envelope('title_required'))).toBe('A title is required.');
    });

    test('falls back to the generic message for an uncoded error', () => {
        expect(errorMessage(t, 'open /tmp/x: permission denied')).toBe(
            'Something went wrong: open /tmp/x: permission denied'
        );
    });

    test('falls back for a code this build has no string for', () => {
        expect(errorMessage(t, envelope('invented_later'))).toBe(
            'Something went wrong: go-side text for invented_later'
        );
    });

    test('does not mistake ordinary JSON-looking text for an envelope', () => {
        expect(errorMessage(t, '{not json')).toBe('Something went wrong: {not json');
        expect(errorMessage(t, '{"code":"title_required"}')).toBe(
            'Something went wrong: {"code":"title_required"}'
        );
    });

    test('accepts an Error instance as well as a bare string', () => {
        expect(errorMessage(t, new Error(envelope('note_body_required')))).toBe(
            "A note can't be empty."
        );
    });
});

describe('catalogs', () => {
    function keyPaths(value: unknown, prefix = ''): string[] {
        if (typeof value !== 'object' || value === null) return [prefix];
        return Object.entries(value).flatMap(([key, child]) =>
            keyPaths(child, prefix ? `${prefix}.${key}` : key)
        );
    }

    test('ko covers every key in the source catalog', () => {
        // en carries _one/_other for plurals; Korean has a single plural
        // category, so only _other is expected there.
        const expected = keyPaths(en)
            .filter((key) => !key.endsWith('_one'))
            .sort();
        expect(keyPaths(ko).sort()).toEqual(expected);
    });

    test('every message is non-empty', () => {
        for (const catalog of [en, ko]) {
            for (const path of keyPaths(catalog)) {
                const value = path
                    .split('.')
                    .reduce<unknown>(
                        (node, key) => (node as Record<string, unknown>)[key],
                        catalog
                    );
                expect(value).not.toBe('');
            }
        }
    });
});

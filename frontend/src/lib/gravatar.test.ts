import {describe, expect, test} from 'bun:test';
import {avatarFallback, gravatarUrl} from '@/lib/gravatar';

describe('gravatarUrl', () => {
    // The canonical Gravatar test vector: sha256("myemailaddress@example.com").
    test('hashes a lowercased, trimmed email', async () => {
        const url = await gravatarUrl('  MyEmailAddress@example.com  ', 64);
        expect(url).toBe(
            'https://www.gravatar.com/avatar/' +
                '84059b07d4be67b806386c0aad8070a23f18836bbaae342275dc0a83414c32ee' +
                '?s=64&d=404'
        );
    });
});

describe('avatarFallback', () => {
    test('uses the first letter of the display name', () => {
        expect(avatarFallback('Ada Lovelace', 'ada@example.com')).toBe('A');
    });

    test('falls back to the email when there is no name', () => {
        expect(avatarFallback('', 'ada@example.com')).toBe('A');
    });

    test('is empty when both are blank', () => {
        expect(avatarFallback('', '')).toBe('');
    });
});

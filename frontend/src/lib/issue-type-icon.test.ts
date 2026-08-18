import {describe, expect, test} from 'bun:test';
import {Bug, Circle} from 'lucide-react';
import {issueTypeIcon} from '@/lib/issue-type-icon';

describe('issueTypeIcon', () => {
    test('maps a known type to its own icon', () => {
        expect(issueTypeIcon('bug')).toBe(Bug);
    });

    test('falls back to a plain circle for an undeclared/custom type', () => {
        expect(issueTypeIcon('spike')).toBe(Circle);
    });
});

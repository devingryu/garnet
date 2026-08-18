import {describe, expect, test} from 'bun:test';
import {statusCategoryClass} from '@/lib/status-style';

describe('statusCategoryClass', () => {
    test('gives active a distinct color from open/closed', () => {
        expect(statusCategoryClass('active')).toContain('blue');
    });

    test('gives closed a distinct color from open/active', () => {
        expect(statusCategoryClass('closed')).toContain('green');
    });

    test('falls back to the open treatment for an undeclared category', () => {
        expect(statusCategoryClass('open')).toBe(statusCategoryClass('anything-else'));
    });
});

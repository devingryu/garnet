import {describe, expect, test} from 'bun:test';
import {resolveMarkdownLink} from '@/lib/markdown-links';

describe('resolveMarkdownLink', () => {
    test('resolves a link into issues/ as an issue target', () => {
        expect(resolveMarkdownLink('decisions', '../issues/GRNT-3/')).toEqual({
            kind: 'issue',
            id: 'GRNT-3',
        });
    });

    test('resolves a link to another issue from an issue description', () => {
        expect(resolveMarkdownLink('issues/GRNT-1', '../GRNT-3/')).toEqual({
            kind: 'issue',
            id: 'GRNT-3',
        });
    });

    test('resolves a .md link outside the reserved directories as a document target', () => {
        expect(resolveMarkdownLink('issues/GRNT-1', '../../decisions/0001-x.md')).toEqual({
            kind: 'document',
            path: 'decisions/0001-x.md',
        });
    });

    test('ignores an external URL', () => {
        expect(resolveMarkdownLink('decisions', 'https://example.com/page')).toEqual({
            kind: 'external',
        });
    });

    test('ignores a link into repos/, same as the backend excludes it from Documents', () => {
        expect(resolveMarkdownLink('decisions', '../repos/some-repo/README.md')).toEqual({
            kind: 'unresolved',
        });
    });

    test('ignores a link that escapes the workspace root', () => {
        expect(resolveMarkdownLink('decisions', '../../../outside.md')).toEqual({
            kind: 'unresolved',
        });
    });

    test('ignores a non-.md link with no other meaning', () => {
        expect(resolveMarkdownLink('decisions', 'image.png')).toEqual({kind: 'unresolved'});
    });

    // resolveLinkTarget doesn't check the target exists either — that's left
    // to whatever handles the click (a missing issue just fails to open).
    test('resolves a link to a nonexistent issue directory the same as a real one', () => {
        expect(resolveMarkdownLink('decisions', '../issues/GRNT-999/')).toEqual({
            kind: 'issue',
            id: 'GRNT-999',
        });
    });
});

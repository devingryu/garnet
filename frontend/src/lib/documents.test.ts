import {describe, expect, test} from 'bun:test';
import {backlinksFor, buildDocumentTree} from '@/lib/documents';
import type {Workspace} from '@/lib/model';

const docs = (...paths: string[]) => paths.map((path) => ({path}));

describe('buildDocumentTree', () => {
    test('nests by path segment', () => {
        const [decisions] = buildDocumentTree(docs('decisions/0001-a.md', 'decisions/0002-b.md'));
        expect(decisions.name).toBe('decisions');
        expect(decisions.isFile).toBe(false);
        expect(decisions.path).toBe('decisions');
        expect(decisions.children.map((c) => c.path)).toEqual([
            'decisions/0001-a.md',
            'decisions/0002-b.md',
        ]);
    });

    test('sorts directories before files, then by name', () => {
        const tree = buildDocumentTree(docs('README.md', 'notes/a.md', 'guides/b.md'));
        expect(tree.map((n) => n.name)).toEqual(['guides', 'notes', 'README.md']);
    });

    test('keeps a file and a directory of the same name apart', () => {
        const tree = buildDocumentTree(docs('notes.md', 'notes/inner.md'));
        expect(tree.map((n) => [n.name, n.isFile])).toEqual([
            ['notes', false],
            ['notes.md', true],
        ]);
    });

    test('handles an empty workspace', () => {
        expect(buildDocumentTree([])).toEqual([]);
    });
});

describe('backlinksFor', () => {
    const ws = {
        backlinks: [
            {
                targetKind: 'issue',
                target: 'GRNT-1',
                sources: [{kind: 'document', id: 'notes/a.md'}],
            },
            {targetKind: 'document', target: 'GRNT-1', sources: [{kind: 'issue', id: 'GRNT-2'}]},
        ],
    } as Workspace;

    test('matches on kind as well as id', () => {
        expect(backlinksFor(ws, 'issue', 'GRNT-1')).toEqual([{kind: 'document', id: 'notes/a.md'}]);
        expect(backlinksFor(ws, 'document', 'GRNT-1')).toEqual([{kind: 'issue', id: 'GRNT-2'}]);
    });

    test('returns an empty list for an unreferenced target', () => {
        expect(backlinksFor(ws, 'issue', 'GRNT-9')).toEqual([]);
    });
});

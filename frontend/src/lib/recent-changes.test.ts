import {describe, expect, test} from 'bun:test';
import {recentChanges} from '@/lib/recent-changes';
import type {GitFileChange, GitStatus} from '@/lib/model';

function file(path: string): GitFileChange {
    return {path, status: 'modified', origPath: ''};
}

function status(staged: string[], unstaged: string[]): GitStatus {
    return {
        branch: 'main',
        hasUpstream: true,
        ahead: 0,
        behind: 0,
        staged: staged.map(file),
        unstaged: unstaged.map(file),
    };
}

describe('recentChanges', () => {
    test('is empty with no status yet', () => {
        expect(recentChanges(null)).toEqual([]);
    });

    test('resolves an issue from any file inside its directory', () => {
        expect(recentChanges(status([], ['issues/GARNET-10/.garnet.yaml']))).toEqual([
            {kind: 'issue', id: 'GARNET-10', path: 'issues/GARNET-10/.garnet.yaml'},
        ]);
    });

    test('collapses several files in one issue into a single entry', () => {
        const result = recentChanges(
            status([], ['issues/GARNET-10/.garnet.yaml', 'issues/GARNET-10/issue.md'])
        );
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('GARNET-10');
    });

    test('resolves a markdown document outside the reserved directories', () => {
        expect(recentChanges(status([], ['decisions/0009-x.md']))).toEqual([
            {kind: 'document', id: 'decisions/0009-x.md', path: 'decisions/0009-x.md'},
        ]);
    });

    test('covers staged and unstaged alike, without duplicating across them', () => {
        const result = recentChanges(status(['notes/a.md'], ['notes/a.md', 'notes/b.md']));
        expect(result.map((c) => c.id)).toEqual(['notes/a.md', 'notes/b.md']);
    });

    test('skips paths that are not navigable targets', () => {
        const result = recentChanges(
            status(
                [],
                [
                    'projects/GRNT/project.md', // reserved: a project definition
                    'repos/garnet/main.go', // reserved: cloned code
                    'README.md', // not reserved, but…
                    'scripts/build.sh', // …only .md is a document
                ]
            )
        );
        expect(result.map((c) => c.id)).toEqual(['README.md']);
    });
});

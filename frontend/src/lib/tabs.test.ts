import {describe, expect, test} from 'bun:test';
import {closeTab, nextActiveKey, openTab, setIssuesView, tabKey} from '@/lib/tabs';
import type {Tab} from '@/lib/tabs';

const issues: Tab = {kind: 'issues', projectKey: 'GRNT', view: 'board'};
const one: Tab = {kind: 'issue', issueId: 'GRNT-1'};
const two: Tab = {kind: 'issue', issueId: 'GRNT-2'};
const doc: Tab = {kind: 'document', docPath: 'decisions/0001-a.md'};

describe('tabKey', () => {
    test('is stable per target, not per object', () => {
        expect(tabKey({kind: 'issue', issueId: 'GRNT-1'})).toBe(tabKey(one));
    });

    test('does not collide across kinds', () => {
        const keys = [issues, one, doc].map(tabKey);
        expect(new Set(keys).size).toBe(3);
    });

    test('ignores the view, so a board and list tab are the same tab', () => {
        expect(tabKey({...issues, view: 'list'})).toBe(tabKey(issues));
    });
});

describe('openTab', () => {
    test('appends something new', () => {
        expect(openTab([one], two)).toEqual([one, two]);
    });

    test('is a no-op for something already open', () => {
        const tabs = [one, two];
        expect(openTab(tabs, {kind: 'issue', issueId: 'GRNT-1'})).toBe(tabs);
    });
});

describe('nextActiveKey', () => {
    test('focuses the tab that slides into the closed one place', () => {
        expect(nextActiveKey([one, two, doc], tabKey(two), tabKey(two))).toBe(tabKey(doc));
    });

    test('falls back to the previous tab when closing the last one', () => {
        expect(nextActiveKey([one, two], tabKey(two), tabKey(two))).toBe(tabKey(one));
    });

    test('clears the selection when the last tab closes', () => {
        expect(nextActiveKey([one], tabKey(one), tabKey(one))).toBeNull();
    });

    test('leaves the active tab alone when closing a different one', () => {
        expect(nextActiveKey([one, two], tabKey(one), tabKey(two))).toBe(tabKey(two));
    });
});

describe('setIssuesView', () => {
    test('switches only the matching project', () => {
        const other: Tab = {kind: 'issues', projectKey: 'OTHER', view: 'board'};
        const [updated, untouched] = setIssuesView([issues, other], 'GRNT', 'list');
        expect(updated).toEqual({...issues, view: 'list'});
        expect(untouched).toBe(other);
    });

    test('leaves non-issues tabs alone', () => {
        expect(setIssuesView([one, doc], 'GRNT', 'list')).toEqual([one, doc]);
    });
});

describe('closeTab', () => {
    test('removes by key', () => {
        expect(closeTab([one, two], tabKey(one))).toEqual([two]);
    });
});

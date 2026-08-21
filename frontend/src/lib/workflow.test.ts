import {describe, expect, test} from 'bun:test';
import {allowedNextStatuses, terminalStatuses, unreachableStatuses} from '@/lib/workflow';
import type {Workflow} from '@/lib/model';

const workflow: Workflow = {
    statuses: [
        {id: 'todo', name: 'To Do', category: 'open'},
        {id: 'doing', name: 'In Progress', category: 'active'},
        {id: 'done', name: 'Done', category: 'closed'},
    ],
    transitions: [
        {from: 'todo', to: ['doing']},
        {from: 'doing', to: ['done', 'todo']},
    ],
};

describe('allowedNextStatuses', () => {
    test('returns the statuses the workflow allows moving to', () => {
        expect(allowedNextStatuses(workflow, 'doing').map((s) => s.id)).toEqual(['todo', 'done']);
    });

    test('returns nothing from a terminal status', () => {
        expect(allowedNextStatuses(workflow, 'done')).toEqual([]);
    });

    test('returns nothing when there is no workflow to validate against', () => {
        expect(allowedNextStatuses(undefined, 'todo')).toEqual([]);
        expect(allowedNextStatuses(null, 'todo')).toEqual([]);
    });

    test('ignores transition targets that are not declared statuses', () => {
        const broken: Workflow = {
            statuses: [{id: 'todo', name: 'To Do', category: 'open'}],
            transitions: [{from: 'todo', to: ['todo', 'ghost']}],
        };
        expect(allowedNextStatuses(broken, 'todo').map((s) => s.id)).toEqual(['todo']);
    });
});

describe('unreachableStatuses', () => {
    test('the entry point never counts as unreachable, even with no incoming transition', () => {
        expect(unreachableStatuses(workflow.statuses, workflow.transitions)).toEqual([]);
    });

    test('flags a status nothing transitions into, other than the entry point', () => {
        const statuses = [...workflow.statuses, {id: 'blocked', name: 'Blocked', category: 'open'}];
        expect(unreachableStatuses(statuses, workflow.transitions).map((s) => s.id)).toEqual([
            'blocked',
        ]);
    });
});

describe('terminalStatuses', () => {
    test('flags a status with no outgoing transition', () => {
        expect(terminalStatuses(workflow.statuses, workflow.transitions).map((s) => s.id)).toEqual([
            'done',
        ]);
    });

    test('a status with only empty-target transitions is still terminal', () => {
        const statuses = [{id: 'todo', name: 'To Do', category: 'open'}];
        const transitions = [{from: 'todo', to: []}];
        expect(terminalStatuses(statuses, transitions).map((s) => s.id)).toEqual(['todo']);
    });
});

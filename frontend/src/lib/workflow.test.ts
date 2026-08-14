import {describe, expect, test} from 'bun:test';
import {allowedNextStatuses} from '@/lib/workflow';
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

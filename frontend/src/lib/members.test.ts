import {describe, expect, test} from 'bun:test';
import {memberName} from '@/lib/members';
import type {Project, User} from '@/lib/model';

const project = {members: [{name: 'Project Ada', email: 'ada@example.com'}]} as Project;
const users: User[] = [{email: 'ada@example.com', name: 'Registry Ada', github: '', atlassian: ''}];

describe('memberName', () => {
    test('is empty for no email', () => {
        expect(memberName(project, null)).toBe('');
        expect(memberName(project, undefined)).toBe('');
    });

    test('prefers the users.yaml registry over the project member list', () => {
        expect(memberName(project, 'ada@example.com', users)).toBe('Registry Ada');
    });

    test('falls back to the project member list when unregistered', () => {
        expect(memberName(project, 'ada@example.com', [])).toBe('Project Ada');
    });

    test('falls back to the raw email when neither knows it', () => {
        expect(memberName(project, 'nobody@example.com', users)).toBe('nobody@example.com');
    });
});

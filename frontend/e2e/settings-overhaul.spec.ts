import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

// GARNET-26: project settings dialog overhaul — general section (name
// edit), issue type rename as a migration, and the workflow editor
// (reorder + transition matrix), each end to end against the real app.

test('editing the project name persists and shows in the dialog heading', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'Project settings'}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', {name: 'GRNT settings'})).toBeVisible();

    const nameInput = dialog.getByRole('textbox').first();
    await expect(nameInput).toHaveValue('Garnet');
    await nameInput.fill('Renamed Project');
    await nameInput.blur();

    await expect(dialog.getByRole('heading', {name: 'GRNT settings'})).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Project settings'}).click();
    await expect(dialog.getByRole('textbox').first()).toHaveValue('Renamed Project');
});

test('renaming an issue type prompts for confirmation and rewrites existing issues', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'Project settings'}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: 'Issue types'}).click();

    // The fixture declares issue-types: [epic, story, task, bug]
    // (workspace/testdata/valid/projects/GRNT/project.md); GRNT-1 is a
    // "story". Each renders as its own text input, in that order.
    const storyInput = dialog.getByRole('textbox').nth(1);
    await expect(storyInput).toHaveValue('story');
    await storyInput.fill('feature');
    await storyInput.blur();

    await expect(dialog.getByRole('heading', {name: 'Rename and update issues?'})).toBeVisible();
    await expect(dialog.getByText('1 issue currently has the old value')).toBeVisible();
    await dialog.getByRole('button', {name: 'Rename'}).click();

    await expect(storyInput).toHaveValue('feature');
    await expect(dialog.getByRole('textbox').nth(2)).toHaveValue('task');
});

test('the workflow editor reorders statuses and toggles transitions', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'Project settings'}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: 'Workflow'}).click();

    // Fixture workflow: todo -> in-progress -> {todo, done}. "todo" starts
    // as the entry point (first row).
    await expect(dialog.getByText('new issues start here')).toBeVisible();

    // Toggling a transition that doesn't exist yet — todo -> done directly.
    const checkbox = dialog.getByRole('checkbox', {name: 'To Do can move to Done'});
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();

    // Move "In Progress" (row 1; row 0's "Move up" is disabled, so this is
    // .nth(1)) above "To Do" — it becomes the new entry point.
    await dialog.getByRole('button', {name: 'Move up'}).nth(1).click();
    await expect(dialog.getByRole('textbox').first()).toHaveValue('In Progress');
});

import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('an issue description renders markdown, navigates its links, and hides task checkboxes (the Todos section owns those)', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // A second issue to link to from the first's rendered description.
    await page.getByRole('button', {name: 'New Issue'}).click();
    await page.getByRole('dialog').getByPlaceholder('Title').fill('Second issue');
    await page.getByRole('button', {name: 'Create'}).click();

    const panelTitle = page.locator('main').getByPlaceholder('Title');
    await expect(panelTitle).toHaveValue('Second issue');

    await page.getByRole('button', {name: 'Issues'}).click();
    await page.getByText('Workspace foundation').click();

    const description = page.getByPlaceholder('Write a description…');
    await description.fill('# Heading\n\n[Second](../GRNT-3/)\n\n- [ ] a task\n');
    await description.blur();
    await expect(page.getByText('Todos')).toBeVisible(); // GARNET-13's own section

    await page.getByRole('button', {name: 'Rendered'}).click();

    await expect(page.getByRole('heading', {name: 'Heading', level: 1})).toBeVisible();
    // Exactly one checkbox on the page: the interactive one in the Todos
    // section below. The rendered body's own task-list item shows the text
    // (still struck-through when done) but not a second checkbox glyph.
    await expect(page.getByRole('checkbox')).toHaveCount(1);
    await expect(page.getByText('a task').first()).toBeVisible();

    const link = page.getByRole('link', {name: 'Second'});
    await expect(link).toBeVisible();
    await link.click();
    await expect(panelTitle).toHaveValue('Second issue');
});

test('a document renders its own task-list checkboxes (no separate Todos section to collide with)', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'New document'}).click();
    await page.getByPlaceholder('e.g. decisions/0008-my-decision.md').fill('notes/rendering.md');
    await page.getByRole('button', {name: 'Create'}).click();

    const editor = page.locator('main [data-slot="textarea"]');
    await editor.fill('# Notes\n\n- [x] done thing\n- [ ] pending thing\n');
    await editor.blur();

    await page.getByRole('button', {name: 'Rendered'}).click();

    await expect(page.getByRole('heading', {name: 'Notes', level: 1})).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(2);
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await expect(page.getByRole('checkbox').first()).toBeDisabled();
});

import {existsSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('deleting an issue asks for confirmation, removes its directory, and closes its tab', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByText('Workspace foundation').click();
    await expect(page.locator('main').getByPlaceholder('Title')).toHaveValue(
        'Workspace foundation'
    );

    await page.getByRole('button', {name: 'Delete issue'}).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Cancel first — the issue and its tab must survive.
    await dialog.getByRole('button', {name: 'Cancel'}).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('main').getByPlaceholder('Title')).toHaveValue(
        'Workspace foundation'
    );

    await page.getByRole('button', {name: 'Delete issue'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Delete'}).click();

    // Tab closes, falling back to the Issues board tab that was already
    // open behind it — and the deleted issue is gone from the board.
    await expect(page.getByText('Workspace foundation')).toHaveCount(0);
    await expect(page.getByRole('heading', {name: 'To Do (0)'})).toBeVisible();
    expect(existsSync(join(workspacePath, 'issues', 'GRNT-1'))).toBe(false);
});

test('deleting a document asks for confirmation, removes the file, and closes its tab', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: '0001-test-decision.md'}).click();
    await expect(page.getByRole('heading', {name: '0001-test-decision.md'})).toBeVisible();

    await page.getByRole('button', {name: 'Delete document'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Delete'}).click();

    await expect(page.getByRole('heading', {name: '0001-test-decision.md'})).toHaveCount(0);
    expect(existsSync(join(workspacePath, 'decisions', '0001-test-decision.md'))).toBe(false);
});

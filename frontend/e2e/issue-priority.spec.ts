import {readFileSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('setting an issue priority persists and shows on the board card', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByText('Workspace foundation').click();

    // The Select trigger carries no accessible name of its own (same as the
    // Status/Assignee/link-type selects elsewhere in this panel), so scope by
    // the Field it's rendered in (a labeled `div:has(> span)` wrapper) rather
    // than the combobox's displayed value — which is exactly what this test
    // is about to change.
    const priorityCombobox = page.locator(
        'div:has(> span:text-is("Priority")) [data-slot="select-trigger"]'
    );

    // Priority defaults to unset, same as Assignee's "Unassigned" default.
    await expect(priorityCombobox).toContainText('None');

    await priorityCombobox.click();
    await page.getByRole('option', {name: 'High', exact: true}).click();

    await expect
        .poll(() => readFileSync(join(workspacePath, 'issues', 'GRNT-1', '.garnet.yaml'), 'utf8'))
        .toContain('priority: high');

    await page.getByRole('button', {name: 'Issues'}).click();
    await page.getByRole('button', {name: 'Board'}).click();
    await expect(page.getByText('GRNT-1 · story · High')).toBeVisible();
});

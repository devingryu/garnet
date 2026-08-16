import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('toggling a todo survives a blur of the (now-stale) description textarea', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByText('Workspace foundation').click();

    const description = page.getByPlaceholder('Write a description…');
    await description.fill('- [ ] first\n- [ ] second\n');
    await description.blur();

    await expect(page.getByText('Todos')).toBeVisible();

    // .click() rather than .check(): the checkbox is fully controlled by
    // todo.done, which only flips after the ToggleTodo round-trip resolves,
    // so there's no synchronous/optimistic state change for .check()'s own
    // built-in check to observe. The expect() below retries instead.
    const firstCheckbox = page.getByRole('checkbox').first();
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();
    await expect(page.getByText('1/2')).toBeVisible();

    // Regression test for the bug found while building GARNET-13: the
    // description textarea holds its own draft state and doesn't remount on
    // a todo toggle (same issue.id), so without the resync effect in
    // issue-detail-panel.tsx, blurring it here would silently overwrite the
    // just-toggled checkbox back to unchecked.
    await description.click();
    await page.getByPlaceholder('Title').click();

    await expect(page.getByText('1/2')).toBeVisible();
    await expect(description).toHaveValue(/- \[x\] first/);
});

import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('a parent issue lists its children, and each one is navigable', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // A closed dialog stays mounted, so its own "Title" input keeps matching
    // alongside the detail panel's — scope to the panel rather than the page.
    const panelTitle = page.locator('main').getByPlaceholder('Title');

    // The fixture has one loadable issue (GRNT-1); make a second one and
    // parent it to GRNT-1, so GRNT-1 has a child to show.
    await page.getByRole('button', {name: 'New Issue'}).click();
    await page.getByRole('dialog').getByPlaceholder('Title').fill('Child issue');
    await page.getByRole('button', {name: 'Create'}).click();
    await expect(panelTitle).toHaveValue('Child issue');

    await page.getByPlaceholder('Search issues…').fill('Workspace');
    await page
        .getByRole('option', {name: /Workspace foundation/})
        .last()
        .click();
    await panelTitle.click(); // blur the picker to save

    // Children is derived at load time, so it shows up on the parent only
    // once the write's re-read has landed.
    await page.getByRole('button', {name: 'Issues'}).click();
    await page.getByText('Workspace foundation').click();

    const childButton = page.getByRole('button', {name: 'GRNT-3 · Child issue'});
    await expect(childButton).toBeVisible();

    // Clicking it navigates to that issue rather than just naming it — and
    // the child lists no children of its own, so the relation runs one way
    // only, not back up to its parent.
    await childButton.click();
    await expect(panelTitle).toHaveValue('Child issue');
    await expect(page.getByRole('button', {name: /GRNT-1 · Workspace foundation/})).toHaveCount(0);
});

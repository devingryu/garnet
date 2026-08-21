import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

// GARNET-28: there's no move/rename operation yet, so the cheap half of the
// fix is surfacing a link that points at nothing — the same signal a
// move/rename would need to leave behind for anyone who didn't rewrite it.
// Deleting the fixture's linked document is the easiest way to produce that
// state without a move feature existing.
test('a link to a deleted document surfaces as a workspace warning', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // The fixture already carries one unrelated warning (GRNT-2's
    // intentionally malformed .garnet.yaml, used elsewhere to test that a
    // single bad issue doesn't fail the whole load) — assert the count
    // increases by one, not that it starts at zero.
    await expect(page.getByText('1 item failed to load')).toBeVisible();

    await page.getByRole('button', {name: '0001-test-decision.md'}).click();
    await expect(page.getByRole('heading', {name: '0001-test-decision.md'})).toBeVisible();
    await page.getByRole('button', {name: 'Delete document'}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Delete'}).click();

    // GRNT-1's issue.md still links to the now-deleted document — that
    // should show up as a dangling-link warning, not vanish silently.
    await expect(page.getByText('2 items failed to load')).toBeVisible();
    await expect(page.getByText('decisions/0001-test-decision.md', {exact: false})).toBeVisible();
});

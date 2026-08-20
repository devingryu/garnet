import {writeFileSync, rmSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('regaining window focus re-reads the tree without a manual Reload click', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // Written outside the app, the way an editor, git, or an agent would —
    // not through any Garnet action, so the only thing that can pick it up
    // is the tree re-read this test is checking for.
    const docPath = join(workspacePath, 'decisions', 'added-externally.md');
    writeFileSync(docPath, '# Added externally\n');
    await expect(page.getByText('added-externally.md')).toHaveCount(0);

    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByText('added-externally.md')).toBeVisible();

    // And the reverse: a file removed externally disappears too, on the
    // same signal — visibilitychange, not just focus.
    rmSync(docPath);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(page.getByText('added-externally.md')).toHaveCount(0);
});

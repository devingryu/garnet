import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('opens a workspace and shows its issues', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // GRNT-1 loads normally; GRNT-2's fixture .garnet.yaml is deliberately
    // malformed (mirrors workspace_test.go's TestOpen_ValidWorkspace) — one
    // bad issue shouldn't block the rest of the workspace from loading.
    await expect(page.getByText('Workspace foundation')).toBeVisible();
    await expect(page.getByText('1 item failed to load')).toBeVisible();
});

import {readFileSync, rmSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

// Profiles are app-level, not workspace-scoped (GARNET-6) — they live at
// the fixed throwaway path playwright.config.ts points GARNET_PROFILES_PATH
// at, which (unlike makeFixtureWorkspace's fresh temp dir per test) persists
// across every test in this run. Clear it here so a profile another test
// added doesn't leak into this one's assertions.
const PROFILES_PATH = '/tmp/garnet-e2e-profiles.json';

test('migrates the legacy identity into a profile, and switching active profile changes the reporter', async ({
    page,
}) => {
    rmSync(PROFILES_PATH, {force: true});
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'Profiles'}).click();
    const dialog = page.getByRole('dialog');

    // The fixture's legacy `user: {name, email}` shape (fixtures.ts) should
    // show up as one migrated, active profile — not an empty list.
    await expect(dialog.getByText('E2E Test')).toBeVisible();
    await expect(dialog.getByText('e2e@example.com')).toBeVisible();
    await expect(dialog.getByRole('radio')).toBeChecked();

    // Add a second profile and switch to it.
    await dialog.getByPlaceholder('Name').fill('Work Account');
    await dialog.getByPlaceholder('Email').fill('work@example.com');
    await dialog.getByRole('button', {name: 'Add profile'}).click();
    await expect(dialog.getByText('Work Account')).toBeVisible();

    // .click() rather than .check(): the radio only flips once the
    // SetActiveProfile round-trip resolves and refresh() re-reads state, so
    // there's no synchronous/optimistic change for .check()'s own built-in
    // check to observe (same reasoning as the todo checkbox in todos.spec.ts).
    const radios = dialog.getByRole('radio');
    await expect(radios).toHaveCount(2);
    await radios.last().click();
    await expect(radios.last()).toBeChecked();

    await expect
        .poll(() => readFileSync(join(workspacePath, '.garnet.local.yaml'), 'utf8'))
        .toContain('activeProfile: work@example.com');

    // Close the dialog and confirm the new identity is actually used — a
    // freshly created issue's reporter should be the newly active profile,
    // not the migrated one.
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Issues'}).click();
    await page.getByRole('button', {name: 'New Issue'}).click();
    await page.getByRole('dialog').getByPlaceholder('Title').fill('Reporter check');
    await page.getByRole('button', {name: 'Create'}).click();
    await expect(page.locator('main').getByPlaceholder('Title')).toHaveValue('Reporter check');

    const created = readFileSync(join(workspacePath, 'issues', 'GRNT-3', '.garnet.yaml'), 'utf8');
    expect(created).toContain('reporter: work@example.com');
});

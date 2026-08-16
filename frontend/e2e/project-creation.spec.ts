import {readFileSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('creating a project writes projects/<key>/project.md', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await page.getByRole('button', {name: 'New project'}).click();
    await page.getByPlaceholder('Key, e.g. GRNT').fill('WIDG');
    await page.getByPlaceholder('Name').fill('Widgets');
    await page.getByRole('button', {name: 'Create'}).click();

    // The dialog closing and the switcher picking up the new project both
    // depend on the same round-trip (CreateProject, then a re-read of the
    // workspace) actually completing.
    await expect(page.getByRole('button', {name: 'New project'})).toBeVisible();
    await expect(page.getByText('WIDG — Widgets')).toBeVisible();

    const written = readFileSync(join(workspacePath, 'projects', 'WIDG', 'project.md'), 'utf8');
    expect(written).toContain('key: WIDG');
    expect(written).toContain('name: Widgets');
});

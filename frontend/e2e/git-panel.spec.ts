import {execFileSync} from 'child_process';
import {writeFileSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

function git(dir: string, ...args: string[]) {
    execFileSync('git', args, {
        cwd: dir,
        env: {
            ...process.env,
            GIT_AUTHOR_NAME: 'test',
            GIT_AUTHOR_EMAIL: 'test@example.com',
            GIT_COMMITTER_NAME: 'test',
            GIT_COMMITTER_EMAIL: 'test@example.com',
        },
    });
}

test('stages, commits, and reports a clean tree', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    git(workspacePath, 'init', '-q', '-b', 'main');
    git(workspacePath, 'add', '-A');
    git(workspacePath, 'commit', '-q', '-m', 'initial commit');

    // An edit made outside the app — the app's own git panel should pick
    // this up as an unstaged change, same as running `git status` would.
    writeFileSync(join(workspacePath, 'notes.md'), '# notes\n');

    await openWorkspace(page, workspacePath);
    await page.getByRole('button', {name: 'Git'}).click();

    const panel = page.getByRole('main');
    await expect(panel.getByText('main')).toBeVisible();
    // Scoped to the specific row's accessible name (label text + status),
    // not a bare "untracked" text search — opening this fixture's legacy
    // .garnet.local.yaml migrates it in place (GARNET-6), which also
    // creates .gitignore if it's missing, so notes.md isn't the only
    // untracked file on the tree by the time the panel renders.
    await expect(panel.getByRole('checkbox', {name: 'notes.md untracked'})).toBeVisible();

    await page.getByRole('button', {name: 'Stage all'}).click();
    // Staged now shows the file; Unstaged falls back to "None."
    await expect(panel.getByText('None.')).toBeVisible();

    await page.getByPlaceholder('Commit message…').fill('Add notes.md');
    await page.getByRole('button', {name: 'Commit'}).click();

    // Both lists read "None." once the commit lands on a clean tree.
    await expect(panel.getByText('None.')).toHaveCount(2);

    const log = execFileSync('git', ['log', '-1', '--format=%an <%ae> %s'], {
        cwd: workspacePath,
    }).toString();
    expect(log).toContain('E2E Test <e2e@example.com> Add notes.md');
});

test("a workspace that isn't a git repo yet shows a clear error, not a crash", async ({page}) => {
    const workspacePath = makeFixtureWorkspace(); // never git-init'd
    await openWorkspace(page, workspacePath);
    await page.getByRole('button', {name: 'Git'}).click();

    await expect(page.getByText("isn't a git repository")).toBeVisible();
});

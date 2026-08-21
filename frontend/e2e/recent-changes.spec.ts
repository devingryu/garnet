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

// GARNET-10: the sidebar's "Recently changed" section, driven by git status
// rather than mtime — the motivating case is an agent editing files while
// Garnet is in the background, then the user switching back.

test('uncommitted issue and document changes appear in the sidebar, and navigate', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    git(workspacePath, 'init', '-q', '-b', 'main');
    git(workspacePath, 'add', '-A');
    git(workspacePath, 'commit', '-q', '-m', 'initial commit');

    // Edits made outside the app, exactly as an agent would leave them.
    writeFileSync(join(workspacePath, 'decisions', '0001-test-decision.md'), '# Edited\n');
    writeFileSync(
        join(workspacePath, 'issues', 'GRNT-1', 'issue.md'),
        '# Workspace foundation\n\nEdited externally.\n'
    );

    await openWorkspace(page, workspacePath);

    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Recently changed')).toBeVisible();

    // The document shows as its filename; the issue as its ID.
    const doc = sidebar.getByRole('button', {name: '0001-test-decision.md'}).last();
    const issue = sidebar.getByRole('button', {name: 'GRNT-1'});
    await expect(doc).toBeVisible();
    await expect(issue).toBeVisible();

    // Clicking the issue entry opens that issue, same as anywhere else.
    await issue.click();
    await expect(page.locator('main').getByPlaceholder('Title')).toHaveValue(
        'Workspace foundation'
    );
});

test('a clean tree shows no Recently changed section at all', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    git(workspacePath, 'init', '-q', '-b', 'main');
    git(workspacePath, 'add', '-A');
    git(workspacePath, 'commit', '-q', '-m', 'initial commit');

    await openWorkspace(page, workspacePath);

    // The section is absent, not an empty heading — nothing changed, so
    // there's nothing to say.
    await expect(page.getByText('Recently changed')).toHaveCount(0);
});

test('a workspace that is not a git repo still loads, with no section and no error', async ({
    page,
}) => {
    // No git init at all: GitStatus errors with not_a_git_repo, which must
    // leave the section empty rather than raising an error banner.
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    await expect(page.getByRole('complementary').getByText('Documents')).toBeVisible();
    await expect(page.getByText('Recently changed')).toHaveCount(0);
    await expect(page.getByText("isn't a git repository")).toHaveCount(0);
});

test('an edit made while the window was away shows up on focus, without a manual reload', async ({
    page,
}) => {
    const workspacePath = makeFixtureWorkspace();
    git(workspacePath, 'init', '-q', '-b', 'main');
    git(workspacePath, 'add', '-A');
    git(workspacePath, 'commit', '-q', '-m', 'initial commit');

    await openWorkspace(page, workspacePath);
    await expect(page.getByText('Recently changed')).toHaveCount(0);

    // The motivating case: an agent edits the tree while Garnet is in the
    // background. Git status has to be re-fetched on the same focus signal
    // that already re-reads the tree (GARNET-29), not just on open.
    writeFileSync(join(workspacePath, 'decisions', '0001-test-decision.md'), '# Edited\n');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Recently changed')).toBeVisible();
    await expect(sidebar.getByRole('button', {name: '0001-test-decision.md'}).last()).toBeVisible();
});

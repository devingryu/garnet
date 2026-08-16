import {readFileSync} from 'fs';
import {join} from 'path';
import {test, expect} from '@playwright/test';
import {makeFixtureWorkspace, openWorkspace} from './fixtures';

test('parent/link pickers search real issues by title, and links are navigable', async ({page}) => {
    const workspacePath = makeFixtureWorkspace();
    await openWorkspace(page, workspacePath);

    // A second issue to relate GRNT-1 to — the fixture's only other issue,
    // GRNT-2, has a deliberately malformed .garnet.yaml (see workspace.spec.ts)
    // and never makes it into ws.issues, so it isn't pickable either.
    await page.getByRole('button', {name: 'New Issue'}).click();
    await page.getByPlaceholder('Title').fill('Second issue');
    await page.getByRole('button', {name: 'Create'}).click();
    await expect(page.getByText('Second issue')).toBeVisible();

    await page.getByRole('button', {name: 'Issues'}).click();
    await page.getByText('Workspace foundation').click();

    // Parent: search by (partial) title, not by typing an exact issue ID.
    // Asserted on disk below rather than on the input's displayed text —
    // Combobox doesn't resolve the input back to the item's label after a
    // fresh in-session select, only after a value supplied externally
    // (e.g. on mount from existing data); that's a cosmetic rough edge
    // tracked separately from the actual behavior this test cares about.
    await page.getByPlaceholder('Search issues…').fill('Second');
    // A closed Combobox's option list stays in the DOM (just not visible),
    // so once a second picker is opened later, the same option text matches
    // twice — .last() is the currently-open one.
    await page
        .getByRole('option', {name: /Second issue/})
        .last()
        .click();
    await page.getByPlaceholder('Title').click(); // blur the picker to save

    await expect
        .poll(() => readFileSync(join(workspacePath, 'issues', 'GRNT-1', '.garnet.yaml'), 'utf8'))
        .toContain('parent: GRNT-3');

    // Link: same picker, a different field — add a "blocks" link to it.
    await page.getByPlaceholder('Search issues to link…').fill('Second');
    await page
        .getByRole('option', {name: /Second issue/})
        .last()
        .click();
    await page.getByRole('button', {name: 'Add link'}).click();

    // The fixture's GRNT-1 already declares "blocks → GRNT-5" — target the
    // new link specifically, by the ID it actually points at (GRNT-3).
    const linkButton = page.getByRole('button', {name: /blocks → GRNT-3/});
    await expect(linkButton).toBeVisible();

    // Clicking the rendered link navigates to that issue, not just displays
    // its ID as static text.
    await linkButton.click();
    await expect(page.getByPlaceholder('Title')).toHaveValue('Second issue');
});

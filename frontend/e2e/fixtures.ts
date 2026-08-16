import {mkdtempSync, cpSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import {dirname, join, resolve} from 'path';
import {fileURLToPath} from 'url';
import type {Page} from '@playwright/test';

// package.json is "type": "module", so __dirname isn't available here.
const here = dirname(fileURLToPath(import.meta.url));

// The Go backend's own `valid` fixture (workspace/testdata/valid) — reused
// here rather than duplicated, so both suites describe the same workspace
// shape. It has one project (GRNT, with a workflow) and two issues.
const FIXTURE_SOURCE = resolve(here, '../../workspace/testdata/valid');

/**
 * Copies the shared fixture into a fresh OS temp directory, so a test can
 * create/edit/toggle things freely without ever touching this repo's real
 * dogfooding workspace. Every test that mutates state should call this
 * rather than pointing at a fixed path.
 */
export function makeFixtureWorkspace(): string {
    const dir = mkdtempSync(join(tmpdir(), 'garnet-e2e-'));
    cpSync(FIXTURE_SOURCE, dir, {recursive: true});
    // Without this, opening the workspace pops the "Who are you?" dialog
    // (Scenario 3 in requirements.md — by design), which then blocks every
    // other interaction in a test that isn't specifically testing that flow.
    writeFileSync(
        join(dir, '.garnet.local.yaml'),
        'user:\n  name: E2E Test\n  email: e2e@example.com\n'
    );
    return dir;
}

/**
 * Opens workspacePath through the real "Open Workspace" button, bypassing
 * the native OS folder dialog. SelectWorkspaceFolder can't be driven from a
 * plain browser tab — replacing the bound method before triggering the flow
 * that calls it is the standard workaround for testing an Electron/Wails-
 * style app with native dialogs from a browser.
 *
 * Call this as the first thing in a test — it navigates to "/" itself.
 */
export async function openWorkspace(page: Page, workspacePath: string) {
    // Runs before any app script on this and every subsequent navigation in
    // the test, so i18next always resolves to English regardless of the
    // host machine's locale — see src/lib/i18n.ts's localStorage detection.
    await page.addInitScript(() => {
        localStorage.setItem('garnet.language', 'en');
    });
    await page.goto('/');
    await page.evaluate((path) => {
        // @ts-expect-error -- window.go is injected by the Wails runtime,
        // not part of the app's own type surface.
        window.go.main.App.SelectWorkspaceFolder = () => Promise.resolve(path);
    }, workspacePath);
    await page.getByRole('button', {name: 'Open Workspace'}).click();
}

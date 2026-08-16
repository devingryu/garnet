import {defineConfig, devices} from '@playwright/test';

// Runs against `wails dev`'s own dev server (localhost:34115), which serves
// the real Go backend alongside the frontend — not a frontend-only preview.
// See .agents/skills/e2e-test/SKILL.md for why this exists and how to use it.
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    use: {
        baseURL: 'http://localhost:34115',
        trace: 'retain-on-failure',
    },
    // Boots the real app; reuses an already-running `wails dev` if one is up
    // (the common case while iterating), starts a fresh one otherwise. The
    // env var redirects the recent-workspaces list (workspace/recent.go) to
    // a throwaway file, so a test run never pollutes the real one sitting in
    // the developer's own OS config directory — but only takes effect for a
    // server this config actually starts. If you already had a `wails dev`
    // running before adding this, restart it once so it picks the var up.
    webServer: {
        command: 'wails dev',
        cwd: '..',
        url: 'http://localhost:34115',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {GARNET_RECENT_WORKSPACES_PATH: '/tmp/garnet-e2e-recent-workspaces.json'},
    },
    projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
});

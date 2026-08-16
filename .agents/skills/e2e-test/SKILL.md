---
name: e2e-test
description: Verify a UI change against the real running app via Playwright, instead of manually clicking through a Browser-tool screenshot loop. Use whenever you'd otherwise open wails dev and click around by hand to confirm something works.
---

# E2E test Garnet with Playwright

Screenshot-and-click verification (take a screenshot, guess a pixel
coordinate, click, repeat) is slow and flaky — popup/dropdown positions
shift slightly between renders, so the same click can miss depending on
timing. This was measured directly: transitioning one issue's status by
guessing coordinates from screenshots took several retries and minutes;
the equivalent Playwright test runs in under a second and doesn't guess
anything, because it selects elements by role/text instead of pixel
position.

Reach for this whenever you're about to verify a UI change by driving the
Browser tool interactively. Write a Playwright test instead — it's faster to
run, and it stays around as a regression check afterward instead of being
thrown away.

## Why this works: `wails dev` is already a web server

`wails dev` serves the real app — Go backend included — over plain HTTP at
`http://localhost:34115`. Any browser (or Playwright) can drive it directly;
no Wails-specific tooling is needed on the automation side. This is the
community-standard way to E2E-test a Wails v2 app (see the project's own
[E2E testing discussion](https://github.com/wailsapp/wails/discussions/4205)).

## Running the suite

```bash
cd frontend
bun run test:e2e
```

`playwright.config.ts`'s `webServer` starts `wails dev` for you if one isn't
already running (`reuseExistingServer` re-attaches to one that is — the
common case while iterating). First-time setup, if `@playwright/test`'s
browser isn't installed yet:

```bash
bunx playwright install chromium
```

## Writing a test

- Put spec files in `frontend/e2e/`, named `*.spec.ts`.
- **Never point a test at this repo's own dogfooding workspace.** Call
  `makeFixtureWorkspace()` from `frontend/e2e/fixtures.ts` — it copies the Go
  backend's own `workspace/testdata/valid` fixture into a fresh OS temp
  directory per test, and seeds a `.garnet.local.yaml` so the "Who are you?"
  identity dialog doesn't block every other interaction. Mutate that freely;
  it's thrown away, and the real workspace is never touched.
- Call `openWorkspace(page, path)` from the same file to open it — it
  replaces `window.go.main.App.SelectWorkspaceFolder` before clicking "Open
  Workspace", since a native OS folder dialog can't be driven from a browser
  tab at all. This is the standard workaround for testing any app with
  native dialogs from a browser, not a Garnet-specific hack.
- Select elements by role/text (`page.getByRole(...)`, `page.getByText(...)`,
  `page.getByPlaceholder(...)`), never by screenshot coordinates.
- For a checkbox (or anything else) whose visual state only updates after an
  async round-trip completes — not optimistically on click — use `.click()`
  plus a retrying `expect(locator).toBeChecked()`/`toHaveText()` assertion,
  not `.check()`. Playwright's `.check()` has its own built-in "did this
  actually toggle" check that fires immediately after the click and doesn't
  wait for a later async update, so it can report failure on a component
  that's actually working correctly, just not synchronously.
- Real files on disk (`projects/<key>/project.md`, `.garnet.yaml`, etc.) are
  fair game to assert on directly with Node's `fs`, since the test and the
  app run on the same machine — see `project-creation.spec.ts` for the
  pattern.
- Assert on **outcomes** (a file on disk, a rendered element, a value that
  survives a re-render), not on incidental UI state like an input's
  displayed text after a selection — some components (the Combobox-based
  `IssuePicker`, at least) don't resync their input text to the selected
  item's label after a fresh in-session pick, only on values supplied
  externally. Chasing that with the test is chasing a cosmetic rough edge,
  not the thing the test should actually be protecting.
- A closed `Combobox`'s option list stays in the DOM (just not visible) —
  `page.getByRole('option', {name: ...})` can match more than one instance
  once a second picker has been opened. Disambiguate with `.last()`
  (the currently-open one) rather than assuming there's only one.
- Any app-level state that isn't workspace data — like the recent-workspaces
  list in `workspace/recent.go`, which lives in the OS's per-user config
  directory — needs a way to redirect it during tests, or the suite will
  silently pollute *your own machine's* real state every run. `recent.go`
  checks `$GARNET_RECENT_WORKSPACES_PATH` before falling back to the real
  path; `playwright.config.ts`'s `webServer.env` sets it to a throwaway file.
  If you add another piece of app-level (not workspace-level) persistent
  state, give it the same treatment before writing a test that touches it.

## Scope

This isn't part of `./check.sh` — it boots the whole app and a real browser,
which is too slow for a pre-commit gate. Run it yourself after a UI change,
the way `check.sh`'s own note about this points back here.

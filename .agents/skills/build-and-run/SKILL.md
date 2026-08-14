---
name: build-and-run
description: Install dependencies, run Garnet in dev mode, build the desktop app, and verify before committing. Use whenever you need to see a change running, produce a build, or check the tree is clean before a commit.
---

# Build and run Garnet

Garnet is a Wails app: Go backend (`workspace/` + `app.go` as the Wails-bound
struct) and a React/Vite frontend under `frontend/`. This skill covers the
commands, not the architecture — see [AGENTS.md](../../../AGENTS.md) for that.

Run everything from the repo root (`repos/garnet/`) unless noted.

## Prerequisites

- `wails` CLI on PATH (this workspace has it at `~/go/bin/wails`)
- `bun` for the frontend
- Go 1.23+

## Install dependencies

```bash
cd frontend && bun install
```

Only needed after a fresh clone or when `frontend/package.json` changes.

## Dev mode (hot reload)

```bash
wails dev
```

Opens the app with a live Vite dev server — frontend edits hot-reload, Go
edits trigger a rebuild. This is how to interactively check a UI change.

## Verify before committing

```bash
./check.sh
```

Runs gofmt, go vet, go test, then the frontend's prettier check, eslint,
tsc, and bun test. This is the one command AGENTS.md rule 13 requires to
pass before a commit — run it, don't run the pieces individually.

**Why not `go test ./...`:** `frontend/node_modules` ships a Go package
(`flatted`), so `./...` picks it up as part of this module and fails.
`check.sh` names the Go packages explicitly (`. ./workspace/...`) instead.
`go.mod`'s `ignore` directive would be the proper fix, but the Wails CLI's
config parser doesn't understand that directive and refuses to build if
it's present — don't add it back.

## Production build

```bash
wails build
```

Produces `build/bin/garnet.app` (macOS). Open it directly to check the
packaged app, not just the dev-mode webview — asset embedding and the
native title bar only show up in a real build.

## After changing an `App` method signature

Any change to a method on the `App` struct in `app.go` (new method, changed
params, changed return type) needs the generated bindings refreshed before
the frontend can see it:

```bash
wails generate module
```

This regenerates `frontend/wailsjs/go/main/App.d.ts` and `.js`. Do this
*before* updating the frontend call site — otherwise `tsc` will flag the
call against the stale signature. Never hand-edit anything under
`frontend/wailsjs/` (AGENTS.md rule 14) — it's overwritten by this command
and by every `wails build`/`wails dev`.

## Common pitfalls

- **`wails build` fails with `unknown directive: ignore`** — something added
  an `ignore` directive to `go.mod`. Remove it; see the note above.
- **`eslint`/`prettier` throw a module-resolution error after switching
  branches or editing `package.json`** — `node_modules` is out of sync with
  the lockfile. Run `cd frontend && bun install`.
- **A frontend call to an `App` method shows a stale-signature type error**
  — the bindings weren't regenerated after a Go-side signature change; run
  `wails generate module`.

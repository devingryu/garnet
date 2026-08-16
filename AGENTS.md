# AGENTS.md

Garnet — a local-first, file-based project management app (issues, docs, code in one git tree) built as a Wails desktop app (Go backend, React + Vite + shadcn/ui frontend, bun package manager).

## Principles

- Keep this file minimal. Don't write repeatable procedures here — extract them as a skill in [.agents/skills](.agents/skills) and link it instead. Conventions are not procedures: rules that constrain *how* code is written belong below, step-by-step *how to run something* belongs in a skill.
- When a new repeatable task appears (build, run, applying design, etc.), consider extracting it into a skill first.

This repo is the code checkout for a Garnet workspace — it's normally opened as `repos/garnet/` beneath that workspace's root, not on its own. The workspace root's own `AGENTS.md`/`CLAUDE.md` has the product docs and decisions links (`notes/gh-1/requirements.md`, `decisions/`) and governs when working from there.

## Product

Product requirements and ADRs live in the containing workspace, not here — see its `AGENTS.md`.

## Design

- [DESIGN.md](DESIGN.md) — design system tokens and component definitions for the frontend.

## Conventions

These are the ground rules. Each exists because breaking it already caused a bug or a mess in this codebase.

### Architecture

1. **`app.go` is binding-only.** Every method is a one-line delegation to `workspace`. No logic, no validation, no error wrapping — the only exception is `coded()`, which normalizes errors for the wire. Business rules that live here are invisible to `go test`.
2. **Derived data has exactly one owner.** Anything computed rather than stored (backlinks, the document tree) is either recomputed by the backend on every read or derived by the frontend from raw state — never computed by one and hand-cached by the other. Backlinks going stale after every edit was this rule not existing.
3. **Mutations are read-modify-write with no locking.** Two Wails calls touching the same `.garnet.yaml` concurrently can clobber each other; the timeline is append-only, so a lost entry is silent. Known limitation, single-user local app. Don't add a mutation path that widens the window.

### Frontend state & types

4. **Wails-generated classes stay at the boundary.** `wailsjs/go/models` exports *classes* with a `convertValues` method, so object literals never satisfy them. Application state uses `Plain<T>` from [lib/model.ts](frontend/src/lib/model.ts). **No `as workspace.X` casts** — they don't convert anything, they only silence the compiler, and they are why rule 2's bug was invisible.
5. **State that changes together is one value.** `path` and the loaded workspace are set in the same place and cleared in the same place, so they are one object. No `!` non-null assertions and no `?? ''` fallbacks to paper over an invariant the type should express.
6. **Reset local state with `key`, not `useEffect`.** `<IssueDetailPanel key={issue.id} …/>` remounts; an effect that reassigns four `useState`s on `[issue.id]` is a dependency-array bug waiting to happen.
7. **One async-action helper.** All Wails calls from components go through `useAsyncAction` ([lib/use-async-action.ts](frontend/src/lib/use-async-action.ts)). Not four hand-rolled `try`/`catch` dialects, and never a raw Go error string in the UI — see rule 9.
8. **Pure logic lives in `lib/` and is tested.** Components render. If a function can be called without a DOM, it belongs in `lib/` with a test next to it.

### Errors & i18n

9. **Go returns error codes; the frontend renders the words.** User-facing failures are a `*workspace.CodedError` with a stable `Code` and `Params` ([workspace/errors.go](workspace/errors.go)); the English `Message` is for logs and tests only. Codes are an API — renaming one is a breaking change. Uncoded errors (unexpected I/O) fall back to a generic message.
10. **Every string a person can see comes from the catalog.** Including `aria-label`, `placeholder`, `title`, and `sr-only` text — those are the ones that get missed. Dates and numbers go through `Intl` with the active language.
11. **Workspace data is never translated.** Issue titles, status names, project keys, issue types, and file paths are the user's content. Only app chrome is translatable. When app-defined values are displayed (link types), translate the label and keep the stored value.
12. **`en` is the source catalog.** `locales/en/translation.json` types every key via module augmentation, so a missing `ko` key is a runtime fallback but a typo'd key is a compile error. Add to `en` first.

### Tooling

13. **Formatter and linter are build gates, not suggestions.** `./check.sh` — gofmt, go vet, go test, then prettier, eslint, tsc, bun test — must pass before a commit. Config lives in `.prettierrc` and `eslint.config.js`. Note that `go ./...` also matches `frontend/node_modules`, so `check.sh` names the Go packages explicitly; add new ones there.
14. **Generated code is never hand-edited; vendored code is edited only when a rule above forces it.** `frontend/wailsjs/**` is regenerated by Wails — edits there are lost. `frontend/src/components/ui/**` and `lib/utils.ts` are vendored from shadcn and are yours to change, but keep changes minimal and commented so re-running `shadcn add` is easy to reconcile (today: the dialog close label, which rule 10 requires). All of it is excluded from lint/format on purpose — that, and not carelessness, is why it uses a different style.

## Skills

- [.agents/skills](.agents/skills) — skills shared across agent tools (Claude Code, etc.).
- Claude Code picks up the same skills via `.claude/skills` (symlink → `.agents/skills`).
- [build-and-run](.agents/skills/build-and-run/SKILL.md) — install deps, run dev mode, build the desktop app, and verify before committing.
- [e2e-test](.agents/skills/e2e-test/SKILL.md) — verify a UI change with Playwright against the real app, instead of clicking through screenshots by hand.

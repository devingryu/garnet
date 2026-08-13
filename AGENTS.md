# AGENTS.md

Garnet — a local-first, file-based project management app (issues, docs, code in one git tree) built as a Wails desktop app (Go backend, React + Vite + shadcn/ui frontend, bun package manager).

## Principles

- Keep this file minimal. Don't write repeatable procedures here — extract them as a skill in [.agents/skills](.agents/skills) and link it instead.
- When a new repeatable task appears (build, run, applying design, etc.), consider extracting it into a skill first.

## Product

- [docs/issues/gh-1/requirements.md](docs/issues/gh-1/requirements.md) — what Garnet is, the data model, and the milestone plan (M1–M6). Read this before implementing any milestone work.
- [docs/decisions/](docs/decisions/) — architecture decisions (ADRs) with the alternatives considered, not just the outcome. Check here before revisiting something that looks already decided.

## Design

- [DESIGN.md](DESIGN.md) — design system tokens and component definitions for the frontend.

## Skills

- [.agents/skills](.agents/skills) — skills shared across agent tools (Claude Code, etc.).
- Claude Code picks up the same skills via `.claude/skills` (symlink → `.agents/skills`).

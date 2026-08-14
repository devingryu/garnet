# AGENTS.md

Garnet — a local-first, file-based project management app (issues, docs, code in one git tree) built as a Wails desktop app (Go backend, React + Vite + shadcn/ui frontend, bun package manager).

## Principles

- Keep this file minimal. Don't write repeatable procedures here — extract them as a skill in [.agents/skills](.agents/skills) and link it instead.
- When a new repeatable task appears (build, run, applying design, etc.), consider extracting it into a skill first.

This repo is the code checkout for a Garnet workspace — it's normally opened as `repos/garnet/` beneath that workspace's root, not on its own. The workspace root's own `AGENTS.md`/`CLAUDE.md` has the product docs and decisions links (`notes/gh-1/requirements.md`, `decisions/`) and governs when working from there.

## Product

Product requirements and ADRs live in the containing workspace, not here — see its `AGENTS.md`.

## Design

- [DESIGN.md](DESIGN.md) — design system tokens and component definitions for the frontend.

## Skills

- [.agents/skills](.agents/skills) — skills shared across agent tools (Claude Code, etc.).
- Claude Code picks up the same skills via `.claude/skills` (symlink → `.agents/skills`).

# AGENTS.md

Wails desktop app (Go backend, React + Vite + shadcn/ui frontend, bun package manager).

## Principles

- Keep this file minimal. Don't write repeatable procedures here — extract them as a skill in [.agents/skills](.agents/skills) and link it instead.
- When a new repeatable task appears (build, run, applying design, etc.), consider extracting it into a skill first.

## Design

- [DESIGN.md](DESIGN.md) — design system tokens and component definitions for the frontend.

## Skills

- [.agents/skills](.agents/skills) — skills shared across agent tools (Claude Code, etc.).
- Claude Code picks up the same skills via `.claude/skills` (symlink → `.agents/skills`).

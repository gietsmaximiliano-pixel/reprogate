# Agent Guide

## Repository structure

- `packages/spec`: Evidence Manifest types, Zod schema, JSON Schema export, normalization, hashing, scoring, receipts, and Markdown rendering.
- `packages/cli`: `reprogate` command-line interface.
- `packages/github-action`: issue-body parser, validator, label selection, and marker-comment logic.
- `packages/dashboard`: static receipt dashboard generator.
- `packages/ai-adapters`: optional advisory mock AI interface only.
- `examples`: harmless demo reports.
- `docs`: specification, threat model, maintainer guides, and release checklist.

## Required verification commands

Run these before publication:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter "./packages/**" -r pack
```

## Security boundaries

- Never execute untrusted issue content.
- Never use `pull_request_target` for public issue validation.
- Never expose repository secrets to report parsing.
- Never pass host environment variables into safe-run by default.
- Never add an AI API dependency to the core validation path.
- Safe-run must remain opt-in, Docker-only, network-disabled, non-root, resource-limited, and confirmation-gated.

## Coding conventions

- TypeScript strict mode.
- Prefer deterministic pure functions for validation and scoring.
- Keep CLI output readable and actionable.
- Use comments only when they clarify a non-obvious security or compatibility decision.

## Tests

Add tests when changing schema behavior, scoring, hashing, receipt generation, path handling, safe-run construction, GitHub Action parsing, label selection, duplicate-comment behavior, or dashboard generation.

## Release checklist

Follow `docs/RELEASE_CHECKLIST.md` and update `docs/RELEASE_STATUS.md` with exact command results.

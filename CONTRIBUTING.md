# Contributing

Thanks for helping improve ReproGate.

Before opening a pull request:

1. Keep the core validation path deterministic and local-first.
2. Add tests for schema, CLI, GitHub Action, dashboard, or security-boundary changes.
3. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
4. Update docs when user-facing behavior changes.

Do not add telemetry, paid service dependencies, or AI API requirements to the core validation path.

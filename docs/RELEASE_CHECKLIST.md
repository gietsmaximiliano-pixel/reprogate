# Release Checklist

Before publishing:

- Confirm `README.md`, `docs/SPEC.md`, and `docs/THREAT_MODEL.md` are current.
- Run `pnpm install --frozen-lockfile`.
- Run `pnpm format:check`.
- Run `pnpm lint`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build`.
- Run `pnpm --filter "./packages/**" -r pack`.
- Validate `examples/basic-node-bug/reprogate.yml`.
- Render the example Markdown summary.
- Generate the example receipt.
- Generate a dashboard from receipts.
- Update `docs/RELEASE_STATUS.md`.

Do not publish if public issue automation can execute untrusted commands or if the core path requires an AI API key.

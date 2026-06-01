# Threat Model

## Assets

- Maintainer machines and credentials.
- Repository secrets.
- GitHub issue workflows and labels.
- Evidence manifests and receipts.

## Untrusted inputs

- Public issue bodies.
- Manifest YAML and JSON.
- Evidence file paths.
- Reproduction commands.
- External evidence links.

## Boundaries

The GitHub Action parses issue text only and must never execute commands. It uses minimal permissions and should only need `issues: write` and `contents: read`.

The CLI may read local files chosen by the maintainer. `verify-safe-run` is opt-in and only runs after explicit confirmation or `--yes`.

## Controls

- Safe relative evidence paths.
- Deterministic parsing and validation.
- Docker-only safe-run.
- Network disabled for safe-run containers.
- Non-root container user.
- Read-only repository mount.
- Temporary writable directory.
- CPU, memory, and timeout limits.
- In-container timeout wrapper plus parent-process timeout guard.
- Linux capabilities dropped, `no-new-privileges` enabled, and a PID limit applied.
- No host environment passthrough by default.

## Residual risk

Docker isolation is not a perfect security boundary. Maintainers should run safe-run only for reports they have reviewed and trusted enough for local verification.

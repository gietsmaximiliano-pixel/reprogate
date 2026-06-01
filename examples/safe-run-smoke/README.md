# Safe-run smoke example

This example is a harmless Docker verification fixture for maintainers.

It checks that ReproGate safe-run executes inside Docker with a non-root user, no host secret passthrough, no outbound network, a read-only workspace mount, a writable tmpfs scratch directory, and visible cgroup resource limits.

Run from the repository root:

```sh
node packages/cli/dist/index.js verify-safe-run examples/safe-run-smoke/reprogate.yml --yes --timeout 60 --cpus 1 --memory 512m
```

The `reprogate-timeout.yml` fixture is intentionally long-running. It is used during release verification with `--timeout 1` to confirm the in-container timeout wrapper terminates commands.

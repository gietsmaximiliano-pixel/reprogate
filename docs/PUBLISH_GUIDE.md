# Publishing ReproGate v0.1.0

This guide assumes the local release-readiness audit has passed and the initial commit exists locally.

## Suggested repository metadata

Suggested GitHub repository description:

> Evidence-first intake tooling for reproducible open-source bug and security reports.

Suggested topics:

- `open-source`
- `maintainers`
- `bug-reports`
- `triage`
- `security-reports`
- `typescript`
- `github-actions`
- `cli`
- `json-schema`
- `zod`

## Create the public GitHub repository

1. Open GitHub in a browser.
2. Choose **New repository**.
3. Name the repository `reprogate`.
4. Add the description above.
5. Set visibility to **Public**.
6. Do not initialize with a README, license, or `.gitignore`; those already exist locally.
7. Create the repository.

## Connect the local repository

Replace `YOUR_ORG_OR_USER` with the GitHub account or organization that owns the new repository:

```sh
git remote add origin https://github.com/YOUR_ORG_OR_USER/reprogate.git
git branch -M main
git push -u origin main
```

Do not run these commands until you are ready to publish publicly.

## Enable GitHub Actions

1. Open the repository on GitHub.
2. Go to **Actions**.
3. Enable workflows if GitHub asks for confirmation.
4. Confirm the `CI` workflow runs on the initial push.

The issue-validation Action is provided from `packages/github-action`. Pilot repositories can use it after the `v0.1.0` tag exists.

## Create the v0.1.0 release

After CI passes on `main`:

```sh
git tag v0.1.0
git push origin v0.1.0
```

Then create a GitHub release for tag `v0.1.0`.

Draft release title:

> ReproGate v0.1.0 MVP

Draft release notes:

```md
## ReproGate v0.1.0

Initial MVP release of ReproGate, an evidence-first intake toolkit for open-source maintainers.

Included:

- ReproGate Evidence Manifest schema version 0.1
- TypeScript types, Zod validation, and JSON Schema export
- YAML input and deterministic normalized JSON output
- SHA-256 manifest and evidence hashing
- `reprogate` CLI for init, create, validate, receipt, render, safe-run, and dashboard generation
- GitHub Action for static issue validation from fenced `reprogate` YAML blocks
- Static dashboard generator for local receipt folders
- Optional mock AI adapter interface
- Harmless examples, maintainer docs, threat model, and release checklist

Known limitation:

- Live Docker safe-run execution still needs verification on a machine with Docker Desktop installed.
```

## Test installation from a clean folder

After publishing to npm, test in a new empty folder:

```sh
mkdir reprogate-install-test
cd reprogate-install-test
corepack enable
npm create -y
npm install reprogate@0.1.0
npx reprogate --version
npx reprogate init
npx reprogate validate ../reprogate/examples/basic-node-bug/reprogate.yml
```

If publishing to npm is not part of the first pilot, test from the packed tarball instead:

```sh
mkdir reprogate-tarball-test
cd reprogate-tarball-test
npm create -y
npm install ../reprogate/reprogate-0.1.0.tgz
npx reprogate --version
```

## Invite pilot maintainers

For pilot repositories:

1. Ask maintainers to add the generated issue template and issue workflow with `reprogate init`.
2. Ask them to open one test issue containing a fenced `reprogate` YAML block.
3. Confirm the Action labels the issue and posts one ReproGate comment.
4. Ask what fields confused reporters and update examples before broader rollout.

Do not ask pilot maintainers to enable `verify-safe-run` until they have reviewed the threat model.

## Docker verification after Docker Desktop is installed

Run this from the repository root on a machine with Docker Desktop available:

```sh
node packages/cli/dist/index.js verify-safe-run examples/basic-node-bug/reprogate.yml --yes --timeout 60 --cpus 1 --memory 512m
```

Expected behavior:

- ReproGate prints the exact Docker command before execution.
- The Docker command includes `--network none`, `--user 1000:1000`, `--read-only`, `--cpus 1`, `--memory 512m`, `--cap-drop ALL`, `--security-opt no-new-privileges`, a read-only repository mount, and an in-container timeout.
- Docker runs the harmless example command inside the container.

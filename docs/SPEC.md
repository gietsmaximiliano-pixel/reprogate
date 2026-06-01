# ReproGate Evidence Manifest Specification

The ReproGate Evidence Manifest is a JSON-compatible structure for describing a report with reproducible evidence. Version `0.1` is the first supported schema version.

## Format

Manifests may be authored as YAML for readability or JSON for machine processing. ReproGate normalizes valid manifests into deterministic JSON by sorting object keys and preserving array order.

## Required fields

- `schemaVersion`: currently `0.1`.
- `reportType`: one of `bug`, `regression`, `performance`, `compatibility`, or `security`.
- `projectName`: affected project.
- `affectedVersion`: affected version or range.
- `environment.os`: operating system and version.
- `summary`: concise report summary.
- `expectedBehavior`: what should happen.
- `actualBehavior`: what happened instead.
- `stepsToReproduce`: deterministic reproduction steps.
- `aiAssisted`: whether AI assistance was used while preparing the report.
- `humanReviewed`: whether the reporter manually reviewed and understood the report.
- `createdAt`: ISO timestamp with offset.

## Optional fields

- `environment.runtime`: runtime and version.
- `environment.dependencies`: dependency version map.
- `commands`: reproduction commands. These are data, not permission to execute.
- `safeFixturePaths`: safe relative fixture paths.
- `logFiles`: safe relative log paths.
- `screenshots`: safe relative screenshot paths.
- `externalEvidenceLinks`: external evidence URLs.
- `redactionNotes`: notes about removed secrets or private data.
- `evidenceFiles`: local evidence file path, SHA-256 hash, kind, and optional description.

## Receipts

A receipt records the normalized manifest hash, evidence verification results, validation timestamp, CLI version, actionability score, and receipt hash. Receipts are immutable evidence of what ReproGate validated at a point in time.

## Non-goals

ReproGate does not detect whether content was written by AI, does not use blockchain technology, does not require a cloud service, and does not execute public issue commands.

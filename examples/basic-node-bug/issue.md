# basic-node-bug: Calculator add returns one more than the expected sum

- **Report type:** bug
- **Affected version:** 1.0.0
- **Schema version:** 0.1
- **Created:** 2026-06-01T00:00:00.000Z
- **AI assistance disclosed:** no
- **Reporter manually reviewed:** yes

## Actionability Score

100/100

## Environment

- **OS:** Ubuntu 24.04
- **Runtime:** Node.js 20
- **Dependencies:**
  - basic-node-bug: 1.0.0

## Expected Behavior

Calling add(2, 2) should return 4.

## Actual Behavior

Calling add(2, 2) returns 5.

## Steps to Reproduce

1. Open the example project.
2. Run npm test.
3. Observe the failing assertion output.

## Commands

```sh
npm test
```

## Evidence Files

- evidence/output.log (log, sha256: `266f085c81f0431054a77bbc01ced14a845506a1632ff45a2ae345ac7f3677a0`)

## Redaction Notes

No secrets, tokens, or personal data are included.

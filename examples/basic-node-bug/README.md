# Basic Node Bug Example

This harmless example contains a deliberate non-security bug: `add(2, 2)` returns `5`.

Validate and render it:

```sh
reprogate validate examples/basic-node-bug/reprogate.yml
reprogate render examples/basic-node-bug/reprogate.yml
```

Generate a receipt:

```sh
reprogate receipt examples/basic-node-bug/reprogate.yml --output examples/basic-node-bug/reprogate.yml.receipt.json
```

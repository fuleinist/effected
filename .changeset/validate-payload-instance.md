---
"@effected/schemastore": minor
"@effected/schemastore-cli": minor
---

## Features

### Payload validation against a published document

`@effected/schemastore` gains the `InstanceValidator` contract — the question `SchemaValidator` does not answer: not "is this document valid JSON Schema", but "does this instance conform to the published document it names in `$schema`". `InstanceFinding` carries the engine's report (a JSON pointer into the instance, the keyword, the message) as values; the error channel stays reserved for a mechanism failure (`InstanceValidatorError`). Like `SchemaValidator`, the package ships the contract and its doubles only (`InstanceValidator.noop`, `InstanceValidator.layerTest`), so no application gains an engine dependency.

`@effected/schemastore-cli` ships the one real implementation, `AjvInstanceValidator.layer` — the same ajv strict-mode setup `AjvValidator` gates documents with, now shared through one internal `makeAjv`, so a document the `check` gate admits always compiles in the instance engine too and the two verdicts cannot drift.

### `schemastore validate`

New CLI command: `schemastore validate <payload.json> [--schema <path|$id>]`. The reference is the `--schema` flag or the payload's own `$schema`, resolved file-first and then against every identity a config schema derives (a target `$id`, a frozen version's `$id`/`url`, the catalog `url`) — so CI validates an action's output against the committed document with no third-party tool and no network fetch. A top-level string `$schema` on the payload is the pointer naming the document, not contract data, so the command strips it before validating — generated documents set `additionalProperties: false`, which would otherwise reject the very self-reference that names them. A non-conforming payload exits `1` with pointer-and-keyword findings; `--format json` writes one report document to stdout and moves the human lines to stderr, exactly as `build`/`check` do.

Closes #857.

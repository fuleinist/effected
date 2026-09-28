---
"@effected/schemastore": patch
---

## Bug Fixes

- `StoreDocument.fromSchema` now collapses a uniform Draft-07 tuple — every `items` element content-equal to the open `additionalItems` rest schema, which is how `Schema.NonEmptyArray` always lowers — to the equivalent `items` + `minItems` shape. The tuple form was valid Draft-07 but ajv's strictTuples rule rejects an open tail by construction, so a schema using `NonEmptyArray` could not be published through `schemastore build` or `schemastore check` at all. The collapsed form carries the same assertions (core's `minItems` is kept exactly as emitted, so optional head elements stay optional) and keeps any declared-family annotation on the uniform elements; documents for every other array shape are unchanged.
- A heterogeneous head with an open rest (`Schema.TupleWithRest` with differing element and rest schemas) keeps the tuple form — what the strict gate should do with that shape is a gate-policy decision, not a lowering one. A closed tuple (pinned by `maxItems`/`minItems` at the tuple length, no `additionalItems`) already passed the gate and is untouched.

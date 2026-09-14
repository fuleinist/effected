---
"@effected/schemastore": patch
---

## Bug Fixes

- `DocumentLint.checkRef` decodes local `$ref` pointers the way ajv does — split on `/`, then percent-decode and pointer-unescape each token — so a percent-encoded pointer (core emits `encodeURI(escapeToken(name))`, e.g. `#/$defs/My%20Foo~1BarEncoded` for the class identifier `My Foo/BarEncoded`) resolves against the literal `$defs` key instead of linting as `UnresolvedRef`. Pointer-escaped (`~1`/`~0`) names and subpath refs resolve exactly as before, and a `$ref` that is not a well-formed URI fragment (a raw space, non-ASCII, `#`) resolves as the engine resolves it; only malformed percent-encoding, which ajv also refuses, warns. A `#/definitions/...` pointer stays a warning.

## Other

- The duplicate pointer-segment escapers in `DocumentLint` and `CanonicalJson` are folded onto `JsonPointer.escapeToken` (identical semantics; lint/error `path` strings unchanged).

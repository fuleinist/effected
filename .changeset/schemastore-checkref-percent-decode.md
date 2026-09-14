---
"@effected/schemastore": patch
---

## Bug Fixes

- `DocumentLint.checkRef` decodes `$ref` tokens through `JsonPointer.parseUriFragment` — the same decoding assembly and the engine apply — so a percent-encoded pointer (core emits `encodeURI(escapeToken(name))`, e.g. `#/$defs/My%20Foo~1BarEncoded` for the class identifier `My Foo/BarEncoded`) resolves against the literal `$defs` key instead of linting as `UnresolvedRef`. Pointer-escaped (`~1`/`~0`) names and subpath refs resolve exactly as before; a ref that is not a valid URI fragment now warns even if a literal `$defs` key happens to match.

## Other

- The duplicate pointer-segment escapers in `DocumentLint` and `CanonicalJson` are folded onto `JsonPointer.escapeToken` (identical semantics; lint/error `path` strings unchanged).

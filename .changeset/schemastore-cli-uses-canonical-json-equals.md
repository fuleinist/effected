---
"@effected/schemastore-cli": patch
---

## Other

- The catalog write-if-different comparison now calls `CanonicalJson.equals` from `@effected/schemastore` instead of the `Runner`'s local 15-line `jsonEqual` copy — same semantics (key order never decides, element order always does), one owner. No behavior change.

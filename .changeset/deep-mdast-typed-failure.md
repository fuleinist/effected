---
"@effected/markdown": patch
---

## Bug Fixes

- `Mdast.fromMdastResult` returns a typed `Failure(MdastDecodeError)` instead of throwing on deeply nested foreign mdast. The recursive normalize walk now enforces `MAX_NESTING_DEPTH` and any error (depth guard or stack overflow) converts to the typed failure, matching the parser-hardening contract at the untrusted boundary.

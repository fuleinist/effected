---
"@effected/markdown": patch
---

## Bug Fixes

- `Mdast.fromMdastResult` returns a typed `Failure(MdastDecodeError)` instead of throwing on deeply nested foreign mdast. The recursive normalize walk enforces `MAX_NESTING_DEPTH`; when the guard trips, `NestingDepthExceededError` is caught and wrapped as `SchemaIssue.InvalidValue`. Other errors propagate unchanged.

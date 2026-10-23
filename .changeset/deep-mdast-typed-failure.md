---
"@effected/markdown": patch
---

## Bug Fixes

- `Mdast.fromMdastResult` and `Mdast.fromMdast` now fail typed with `MdastDecodeError` on deeply nested foreign mdast instead of throwing. Any node nested more than 256 levels below the root is refused with a `SchemaIssue.InvalidValue` issue naming the depth, the same cap the parser and `Markdown.stringify` enforce. Because leaves count toward the cap, a parsed tree whose innermost text sits past it (for example 255 nested blockquotes) is refused here, as `Markdown.stringify` already refuses it.

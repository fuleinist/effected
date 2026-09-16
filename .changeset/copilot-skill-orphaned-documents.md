---
"@effected/copilot-plugin": patch
---

## Other

- Skill references now document `check`'s orphaned-document failure: a file left at a sibling shape of a derived path that no target, frozen version, or catalog path claims (an `appendVersion` flip or a `layout` change moved it; nothing else in `outputDir` is inspected) fails `check`, and its remedy is deleting the file by hand — `build` reports orphans and never deletes them.

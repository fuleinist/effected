---
"@effected/claude-code-plugin": patch
---

## Other

- Skill references now document `check`'s orphaned-document failure: a `*.json` file in a directory the config writes into that no target, frozen version, or catalog path claims (left behind when a rename moved its derived path) fails `check`, and its remedy is deleting the file by hand — `build` reports orphans and never deletes them.

---
"@effected/markdown": minor
---

## Bug Fixes

* `Markdown.stringify` no longer breaks a GFM table when a cell's inline code or HTML holds an escaped backslash before a pipe (`a\\|b`). The pipe is now escaped, so the cell stays whole and its value round-trips. Previously the extra column meant the whole table re-parsed as a paragraph. Output for every other table is unchanged.

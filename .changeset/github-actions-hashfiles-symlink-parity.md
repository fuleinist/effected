---
"@effected/github-actions": patch
---

## Bug Fixes

### `CacheKey.matchingFiles` follows symlinked directories, matching the runner's `hashFiles()`

- The `descend` walk now runs with `followSymlinks: true`, so a file reachable only through a symlinked directory contributes to the cache key — `@actions/glob` (the runner's `hashFiles()`) follows links by default (`followSymbolicLinks: true`), and the previously documented knowing divergence silently produced a different key than the runner for such a workspace. `descend`'s per-branch `traversalChain` cycle guard keeps link loops finite, and — as with `@actions/glob` — a link resolving outside the workspace is followed: the "never hash a file outside the workspace" property is lexical (literals climbing above it are dropped), not physical through links.

---
"@effected/walker": minor
---

## Features

### `descend` accepts `followSymlinks` to enter symlinked directories under a real-path cycle guard

- `DescendOptions.followSymlinks` (default `false`, preserving today's never-descend behaviour) makes `descend` enter symlinked directories. The cycle guard stays underneath the switch, in `@actions/glob`'s `traversalChain` semantics: each descended directory records its real path (`FileSystem.realPath`) on its own branch's ancestor chain, and a directory whose real path is already an ancestor of the current branch closes a cycle and is skipped — so link loops terminate while two sibling links resolving to the same target both enumerate. A link whose real path cannot be resolved is skipped: the guard cannot reason about it. Following links matches `@actions/glob`'s default `followSymbolicLinks: true` and Node's `fs.promises.readdir(path, { recursive: true })`, so a file reachable only through a symlinked directory is no longer silently absent from the answer — but the cycle guard is `@actions/glob`'s alone: Node's recursive `readdir` keeps no traversal chain and recurses without bound on a link loop.

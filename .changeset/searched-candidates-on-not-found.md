---
"@effected/config-file": minor
---

## Breaking Changes

`ConfigFileNotFoundError` gains `candidates: ReadonlyArray<string>` as a **required** schema field — the paths the resolver chain actually checked on disk, in probe order. Code that constructs the error by hand (a test double, a mock service, a re-raise) must now supply `candidates`, and a payload encoded by an earlier release no longer decodes through the error's schema. One `searched` entry can hide many candidates since `upwardWalk` grew its `filenames`/`subpaths` forms, so "nothing found, here is what I looked for" under-reported the search (#651). The message names the candidate count; the field carries the list.

## Features

Resolvers gain an optional `resolveProbe` member reporting `ConfigProbe` — the match plus the probed prefix (a short-circuiting walk lists what it checked, not everything it could have). Every built-in derives `resolve`/`resolveMatch` from it through `fromProbe`, so the three cannot drift; a hand-rolled resolver that omits it degrades to contributing no candidates, exactly as it degrades to a bare-path match today. The failure path is now as informative as the success path's `ConfigMatch`.

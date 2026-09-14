---
"@effected/config-file": minor
---

## Features

`ConfigFileNotFoundError` now carries `candidates`: the paths the resolver chain actually checked on disk, in probe order. One `searched` entry can hide many candidates since `upwardWalk` grew its `filenames`/`subpaths` forms, so "nothing found, here is what I looked for" under-reported the search (#651). The failure path is now as informative as the success path's `ConfigMatch`.

Resolvers gain an optional `resolveProbe` member reporting `ConfigProbe` — the match plus the probed prefix (a short-circuiting walk lists what it checked, not everything it could have). Every built-in derives `resolve`/`resolveMatch` from it through `fromProbe`, so the three cannot drift; a hand-rolled resolver that omits it degrades to contributing no candidates, exactly as it degrades to a bare-path match today. The error message names the candidate count; the field carries the list.

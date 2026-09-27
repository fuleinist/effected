---
"@effected/lockfiles": patch
---

## Bug Fixes

- pnpm peer suffixes are now split off `file:` resolutions as they are off registry versions. pnpm suffixes a `file:` directory or tarball whenever the package declares peers (`lib@file:vendor/lib(react@18.3.1)`), and such an instance previously parsed as name `lib@file:vendor/lib(react` at version `18.3.1)`, with its `packages:` entry re-emitted as a second, orphan instance. It now parses as `lib` at `file:vendor/lib`, one instance, with its peer declarations joined. Importer dependency versions split the same way into `version` and `peerSuffix`.
- The suffix is the trailing run of balanced parenthesized groups, as pnpm itself reads it, so a nested chain splits whole and a parenthesis followed by more path stays in the path. A `link:` resolution, which pnpm never suffixes, is left whole.
- A `name@version` key is split at the first `@` after a scoped name's own, so an `@` inside the version part (`file:../@scope/lib`) no longer moves the boundary. This applies to pnpm and bun.

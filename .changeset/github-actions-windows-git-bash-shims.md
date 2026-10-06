---
"@effected/github-actions": patch
---

## Bug Fixes

- On Windows, `PackageManagerInstaller` now writes an extensionless `#!/bin/sh` Git Bash shim beside every `.cmd` package-manager shim. Git Bash does not apply `PATHEXT`, so a `shell: bash` workflow step could not resolve a bare `pnpm` against the `.cmd`-only `binDir` and failed with `command not found` (exit 127). The sibling renders its target path with forward slashes, applies the same node-vs-direct rule as the `.cmd` — including pnpm 12's native-binary/alias distinction — and the cache-hit regeneration path adds a missing sibling file by file without rewriting a `.cmd` a previous writer owns. POSIX shim writing is unchanged.

---
"@effected/env": patch
---

## Bug Fixes

- `ShellExports` rejects `PIPESTATUS`. Bash drops an exported `PIPESTATUS` unless that export is the first command of a fresh shell. A sourced file then lost the variable silently in every other position. The dialect promises what bash exports, so it cannot accept the name. `parse` and `parseBytes` fail with `special-variable`, and `format` throws `RangeError`.
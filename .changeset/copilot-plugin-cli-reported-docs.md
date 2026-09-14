---
"@effected/copilot-plugin": patch
---

## Bug Fixes

- `skills/effected-packages/references/cli.md` no longer states `CliRuntime.reported` unconditionally returns `Error`. It now documents the overloaded contract — a typed `Error` argument comes back as its own type, any other value is wrapped in a plain `Error` — matching `@effected/cli`'s widened return type.

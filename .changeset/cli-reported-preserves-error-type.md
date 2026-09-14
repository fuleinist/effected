---
"@effected/cli": minor
---

## Features

- `CliRuntime.reported` now preserves the error's type: a new `<E extends Error>(error: E, exitCode?: number): E` overload returns the very instance a typed caller passed (the marks are added in place), so a program can `Effect.fail(CliRuntime.reported(typedError, code))` and keep `catchTags` narrowing downstream without an `as typeof error` cast. The `unknown -> Error` fallback is unchanged: a non-`Error` value is still wrapped in a plain marked `Error`, and the exit code still defaults to `1`. `schemastore-cli` drops its three casts and its local re-typing wrapper.

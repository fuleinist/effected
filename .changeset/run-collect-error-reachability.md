---
"@effected/commands": patch
---

## Other

- `Run.collect`'s TSDoc now states which arms of its error union are reachable under which options: a no-options call has exactly two failure modes (`CommandFailedError` kind `"spawn"`, `CommandOutputError` kind `"tooLarge"`), setting `timeout` adds kind `"timeout"`, kind `"nonZero"` never fires from `collect` (a non-zero exit is a result), and kinds `"notJson"` / `"schema"` are exclusive to `Run.json` / `Run.jsonLine`. Kind `"spawn"` is documented as the catch-all it is — it absorbs every `PlatformError`, including one raised after the child started. `Run.collectTee` shares that reachability, but notes the tee adds a second *source* for `"spawn"`: a failing `Stdio` sink. The union stays as-is; this is the documentation fix issue #653 proposed so consumers can see at a glance what a catch must actually handle.

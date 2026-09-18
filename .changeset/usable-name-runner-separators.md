---
"@effected/github-actions": patch
---

## Bug Fixes

### Runner-file names may no longer carry the parser separators `=` and `<<` or end in `<`

- `isUsableName` now refuses a name containing `=` or `<<`, or ending in `<`, so `ActionOutputs.set` / `exportVariable` / `setJson` fail typed with `InvalidOutputNameError` and `ActionState.save` fails typed with `writeFailed` instead of appending a block the runner would misparse. The runner's file-command parser reads each line up to its first `=` or `<<`, whichever comes first: a name carrying `=` parses as a `key=value` property before the block ever opens, and a name carrying `<<` splits at the wrong delimiter — either way every entry after the malformed block is corrupted. A name ending in `<` corrupts the composed header the same way (`a<` writes `a<<<DELIM`, whose first `<<` matches one character early, leaving a delimiter the terminating line can never match); an interior `<` remains accepted.

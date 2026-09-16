---
"@effected/schemastore-cli": minor
---

## Other

- `check` and `build` now report an orphaned document: a file left behind at a sibling shape of a derived path (`<name>.json`, `<name>-<v>.json`, `<v>/<name>.json`, `<v>/<name>-<v>.json`) for a label the config still declares, that no target, frozen version, or catalog path claims — the file an `appendVersion` flip or a `layout` change leaves under the old name. Stale (exit 1) under `check`, reported and never deleted under `build`; the report carries the paths in `orphaned` and the human line names the remedy. Only those derived shapes are probed — `outputDir` is never listed, so sharing it with another config, a deploy folder, or the repository root does not fail `check` (short of two configs deriving one schema name and label under different layouts into the same directory). Minor because a repository holding such a file now fails a previously-passing `check` — the failure is the point (for a published label the advertised URL was serving a stale document with no report), and the remedy is deleting the orphan by hand. Closes #747.

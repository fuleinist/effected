---
"@effected/schemastore-cli": minor
---

## Other

- `check` and `build` now report an orphaned document: any `*.json` file in a directory the config writes into (each version directory a versioned target or frozen file lands in, and `outputDir` itself for flat or unversioned ones) that no target, frozen version, or catalog path claims — the file a rename leaves behind when an `appendVersion` flip, a `name` change, or a `layout` change moves a document's derived path. Stale (exit 1) under `check`, reported and never deleted under `build`; the report carries the paths in `orphaned`, the human line names the remedy, and the walk never leaves a directory the config owns. Minor because a repository holding such a file now fails a previously-passing `check` — the failure is the point (for a published label the advertised URL was serving a stale document with no report), and the remedy is deleting the orphan by hand. Closes #747.

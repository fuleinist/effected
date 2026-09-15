---
"@effected/schemastore-cli": minor
---

## Features

- `schemastore check` now fails with `OrphanedCatalogError` (exit `1`) when a file sits at the configured `catalogPath` but no schema declares a `catalog` block — the state left behind when the last `catalog` block is removed from a config, which previously passed `check` even though the tree no longer matched the config. The orphan is reported (an `ORPHANED catalog` human line, `outcome: "orphaned"` in the JSON document and the step summary) and never deleted: the CLI does not remove a file it may not have written, and a hand-authored catalog can live at the same path. `build` is unchanged — it neither reports nor removes the orphan.

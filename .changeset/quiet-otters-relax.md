---
"@effected/memfs": patch
---

## Documentation

- `MemoryFileSystem.layerInspectableWith` now documents the per-provide re-seed consequence for write assertions: resolving `Volume` under a second `Effect.provide` of the same layer value observes a fresh volume holding only the seed, so a post-run "nothing was written" assertion passes vacuously. Resolve `Volume` inside the provided program, or pin identity with `MemoryFileSystem.makeInspectableWith`.

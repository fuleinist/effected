---
type: Limitation
title: memfs's volume is invisible to anything that does not ask for the FileSystem service
description: memfs installs no hooks and patches no module registry, so direct node:fs calls, spawned processes, native-binding IO, and process.cwd() all silently bypass the volume.
status: stable
bounds: ../modules/memfs.md
tags:
  - testing
sources:
  - id: memfs-claude-md
    resource: ../../packages/memfs/CLAUDE.md
  - id: memfs-readme
    resource: ../../packages/memfs/README.md
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 3e257e5116d4fb40a5a4220e946832261e661daaadc5573d6dd561f333355072
---

# memfs's volume is invisible to anything that does not ask for the FileSystem service

## Condition

`@effected/memfs` implements exactly one thing — core's `FileSystem`
service. It installs no hooks, patches no module registry and
intercepts nothing globally. The volume is visible only to code that
*asks for the service* through `R`, and invisible to everything else in
the same process.

## Symptom

Four call shapes silently bypass the volume rather than erroring or
warning:

1. **A direct `node:fs` call** reads and writes the real host filesystem
   in the same process, ignoring whatever the volume holds.
2. **A spawned child process** inherits the host filesystem, not the
   volume — a command seam that touches files must be tested with a
   `ChildProcessSpawner` double instead, since memfs has nothing to do
   with subprocess IO.
3. **Native-binding IO** — `@effect/sql-sqlite-node` is the usual
   case — never reaches the `FileSystem` service at all, so an in-memory
   database is the right double there, not memfs.
4. **`process.cwd()`** is not modeled by the volume. Code that consults
   it internally silently leaves the volume's model behind, and nothing
   fails loudly to flag the mismatch.

## Why this is acceptable

Closing any of the four would mean either patching global module
resolution (turning memfs into the kind of ambient-hook test double the
package was built specifically to avoid, since ambient patching is
exactly the deny-by-default surprise class `layerNoop` already produces
in a different form) or building an adapter that lets code bypass the
service injection discipline entirely — which the package's own
[sync filesystem port](../modules/memfs.md#the-sync-filesystem-port)
already declined once, for a related reason: a bypass-shaped facade
legitimizes call sites that never inject `FileSystem` at all, growing a
second, weaker sanctioned path alongside the real one. No adapter is
offered to close any of the four, for the same reason.

## The check

Confirm any test exercising one of the four call shapes does not use
memfs as its double — a `ChildProcessSpawner` fault-injection double for
subprocess IO, an in-memory database driver for native-binding IO, and a
real tmpdir (or an explicit `process.cwd()`-aware fixture) for anything
that consults the working directory. A green test asserting on volume
state after a code path that spawns, calls `node:fs` directly, or reads
`process.cwd()` is not evidence the code path is correct — it is
evidence the assertion never reached the real IO.

`packages/memfs/README.md` states all four for consumers
directly.[^memfs-readme]

[^memfs-readme]: `packages/memfs/README.md:138-141` — the four
    invisibility cases stated for consumers.

---
type: Convention
title: Keep the tree resolved to one effect copy
description: The whole workspace and its build toolchain must resolve to exactly one installed copy of effect, on the prerelease the catalogs pin.
status: stable
stale_after: 2027-03-13T00:00:00Z
tags:
  - architecture
  - compat
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: f7965787672b3f890b11bf42e80a2aa2466d9d6c8e5b124a2e5cfa594a915bab
---

# Keep the tree resolved to one effect copy

Always treat a second resolved `effect` copy anywhere in the tree — this workspace or its build toolchain (`@savvy-web/*`, rolldown-pnpm-config, vitest-agent) — as a defect to fix at its entry point (the pin, the catalog, or upstream), never as something to route around locally.

This is a correctness requirement, not hygiene. A `Context.Service` tag is an identity: two resolved copies of the same package are two distinct tags, so a layer built from one copy does not satisfy a requirement expressed against the other, and the type system is right to reject it even though the diagnostic rarely says so in those terms. A duplicated `effect` inside one Schema decode pipeline has crashed every package's build with a type error surfacing deep inside a parser (`TypeError: text.charCodeAt is not a function`), and a stale caret across a consumer's own packages has produced `Layer<…> is not assignable to Layer<…>` diagnostics that read like a signature change but are duplicate identity — checking the `.d.ts` diff first (finding it clean) is what points at duplication instead. Never chase this class of error as an API signature bug before ruling out a second resolved copy: the tell is a stack or a lockfile entry naming two different `effect@…` paths.

**Never advance the `effect` pin without a bridge**, because doing so strands every previously-published `@effected/*` package on the old exact pin the moment the catalog moves — every package advertises an exact peer, so the whole prior closure becomes unsatisfiable in one step. Pick the bridge shape by asking one question: does the previously-published `@effected/*` closure still run on the new `effect`?

- **Runtime-compatible advance:** bridge old→new with a `pnpm-workspace.yaml` `overrides` block, one entry per stranded package (`effect`, and any platform packages such as `@effect/platform-node` / `@effect/sql-sqlite-node` also stranded at the old pin), rewriting the old exact spec to the new one. This collapses the tree back to one copy immediately.
- **Runtime-incompatible advance:** an `overrides` block would run old-pin-built code against the new `effect` and crash at module initialization if the new pin removed or renamed an API the published closure calls at import time. Bridge instead with a `packageExtensions` block that pins the **toolchain's own peers** (the `@effected/*` packages the toolchain takes as peers, e.g. via `@savvy-web/tsdown-plugins`) to regular dependencies on the toolchain's still-old `effect`, so the toolchain runs a homogeneous old-pin world while it compiles new-pin source it never executes. Accept two `effect` copies in the lockfile for this window — the tree does not collapse to one until the toolchain republishes.

Never let a `packageExtensions` key match a workspace package's own current version — pnpm applies extensions to local packages too, and an extension matching a workspace package's exact version has silently rewritten that package's own `workspace:*` edge to a published version, or added a dependency it should not have. Diff the lockfile's `importers:` section against the pre-bridge copy on every edit to the block; it must be empty. Retire either bridge only once the packages-section-scoped count of the old pin reaches zero with the block removed — a bare `grep -c` across the whole lockfile is not sufficient, because an `overrides` block's own redirect line (`effect@<old>: <new>`) matches the old pin string without being a second copy.

Full re-pin mechanics are in [advance the effect pin](../runbooks/advance-the-effect-pin.md).

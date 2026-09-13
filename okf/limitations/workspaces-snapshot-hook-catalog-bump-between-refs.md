---
type: Limitation
title: A hook-injected catalog's range bump between two refs is invisible to a snapshot diff
description: WorkspaceStateSnapshot.crossSeed cannot surface a range change made purely by editing a config-dependency pnpmfile between two refs, because neither ref's committed sources declare the catalog.
status: stable
bounds: ../interfaces/workspaces-snapshots.md
tags:
  - architecture
sources:
  - id: workspace-state-snapshot-ts
    resource: ../../packages/workspaces/src/WorkspaceStateSnapshot.ts
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 373de34988bf57252266d1389b892885de10a37bb592edaf9cc579591f069f33
---

# A hook-injected catalog's range bump between two refs is invisible to a snapshot diff

## Condition

`WorkspaceStateSnapshot.crossSeed(before, after)` gives each side of a
two-ref diff the other side's committed catalogs as a seed, so a
`catalog:` specifier resolved against a hook-injected catalog (one that
exists only because a pnpm config-dependency pnpmfile injects it, never
recorded in `pnpm-workspace.yaml` or the lockfile's `catalogs:` block) can
still resolve to a concrete version on both sides of a diff.[^workspace-state-snapshot-ts]
That fallback answers with a version, not a declared range.

## Symptom

When a config-dependency's pnpmfile changes the declared range of a
hook-injected catalog entry between the two refs being diffed — with no
other change to either ref's committed sources — the diff reports no row
for that catalog specifier. The dependency table looks unchanged even
though the effective policy genuinely moved.

## Why this is acceptable

Surfacing the range change would require replaying the pinned
config-dependency code at one or both refs, and an at-ref read
(`WorkspaceSnapshots.at(ref)`) executes no historical code by design — it
reads through `git show` with no checkout, which is what makes it safe to
call against an arbitrary ref with no network access and no side effects.
Widening that contract to replay a historical pnpmfile would reopen the
exact class of risk (network fetch, arbitrary historical code execution)
the read-with-no-checkout design exists to avoid, for a case with a
narrow, identifiable blast radius: the catalog is not declared anywhere
git can already see.

## What the fix would take

Nothing changes within the snapshot's own committed-sources contract; the
one committed artifact that does carry evidence of this change is the
`configDependencies` block in `pnpm-workspace.yaml`, which names the
config-dependency package and its pinned version. A consumer that must
catch this class of change diffs that block directly rather than relying
on `WorkspaceStateSnapshot`'s catalog diff, since a config-dependency
version bump is the only committed signal that a hook-injected catalog's
policy might have moved.

[^workspace-state-snapshot-ts]: `packages/workspaces/src/WorkspaceStateSnapshot.ts` —
    `crossSeed`, `withSeededCatalogs`, `seededCatalogs`.

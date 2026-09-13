---
type: Limitation
title: PeerCheck cannot answer yarn, and only applies one suppression axis
description: PeerCheck reports supported false for yarn's virtual-locator peers, and applies only allowedVersions among pnpm's three peerDependencyRules suppression axes.
status: stable
bounds: ../interfaces/workspaces-peer-check.md
tags:
  - architecture
  - testing
sources:
  - id: peer-check-ts
    resource: ../../packages/workspaces/src/PeerCheck.ts
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 50b177e4e69b1add364952c25f995ff7f065e7022d660d5f511bcb35fd65e763
---

# PeerCheck cannot answer yarn, and only applies one suppression axis

## Condition

`PeerCheck.run` reads a parsed `@effected/lockfiles` `Lockfile` and reports
unsatisfied peer dependencies through `instanceId`, `resolved`, and
`peerDependencies` alone, with no per-format branch.[^peer-check-ts] Two
independent facts about the lockfile it reads limit what the report can
say: yarn resolves peers virtually, giving a peer-bearing package one
`@virtual:` locator per consumer with no record of which instance satisfied
which peer; and pnpm's own `peerDependencyRules.allowedVersions` suppresses
some findings, but two further suppression axes on that same config block —
`ignoreMissing` and `allowAny` — are never applied.

## Symptom

A caller running `PeerCheck.run` against a yarn lockfile gets back
`supported: false` rather than a populated `unsatisfied` list — there is no
row-level detail to inspect, because the lockfile carries no join key
between a peer declaration and the instance that satisfied it. A caller
supplying `peerDependencyRules` whose `ignoreMissing` or `allowAny` entries
are non-empty gets back `unverified: "peerRulesNotApplied"` rather than a
clean report, even when every `allowedVersions` rule the caller cares about
is applied correctly.

## Why this is acceptable

Yarn's plug-and-play resolution genuinely does not record what a checker
would need: the lockfile-only design this checker commits to (reading the
resolved graph rather than shelling out to a package manager's own peer
command, which does not exist for bun and hard-fails before inspection for
npm) cannot manufacture a join yarn itself does not persist. `supported:
false` states that limit rather than returning an empty, falsely-clean
result — a bare array would make "yarn cannot be checked" indistinguishable
from "yarn has no violations", which is the more dangerous failure.

The two unmeasured suppression axes are unmeasured, not merely unimplemented:
an unmeasured suppression rule is exactly the failure class this checker
exists to remove (a checker computing something pnpm calls clean, or the
reverse), so shipping an implementation of `ignoreMissing` or `allowAny`
without a committed oracle proving it matches pnpm 11's behaviour would
reintroduce the same risk in a new place. Degrading to `unverified` when
either axis is non-empty converts "this axis is not measured" into a
fail-closed signal a gate can act on, rather than a silent gap that reads
as a clean result.

## What the fix would take

Yarn support has no fix within this checker's architecture: it would
require a different, format-specific data source than the lockfile, which
is exactly the per-format branch this module's design forbids. Applying
`ignoreMissing` and `allowAny` is a bounded, known task: measure pnpm's
behaviour for each axis against crafted fixtures the way `allowedVersions`
was measured (see [the peer-check
interface](../interfaces/workspaces-peer-check.md#how-pnpm-matches-an-allowedversions-key)),
commit the oracle output, implement the matching rule, and only then widen
what the two-reason `unverified` union covers — a third reason is deliberately
not open for casual addition, since the union was closed at two "by
measurement" and reopening it should follow the same discipline.

[^peer-check-ts]: `packages/workspaces/src/PeerCheck.ts` — `PeerCheck.run`,
    `UnverifiedReason`.

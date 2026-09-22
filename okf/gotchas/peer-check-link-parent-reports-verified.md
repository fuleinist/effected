---
type: Gotcha
title: "PeerCheck never joins the peers of a link:-resolved parent and still reports verified"
description: "Under linkWorkspacePackages: deep, a workspace dependency resolved as link: has no packages: row, so PeerCheck.run skips its peerDependencies without raising unresolvedEdge — a gate reads a clean, verified report while pnpm peers check reports unmet peers."
status: stable
resource: ../../packages/workspaces/src/PeerCheck.ts
stale_after: "2027-03-21T00:00:00Z"
tags:
  - deps
  - testing
sources:
  - id: peer-check-ts
    resource: ../../packages/workspaces/src/PeerCheck.ts
  - id: issue-800
    resource: https://github.com/spencerbeggs/effected/issues/800
generated:
  by: "okfit/claude-code"
  at: 2026-09-22T01:21:07Z
  body_sha256: c76784459e8febb80a7a0175af73c951583da4b1c0d2cbbc9fb4b99c8d2583b6
---

# PeerCheck never joins the peers of a link:-resolved parent and still reports verified

## What a reader sees

`PeerCheck.run(lockfile, { peerDependencyRules })` on a workspace using
`linkWorkspacePackages: deep` returns `unverified: []`, `supported: true`,
and an `unsatisfied` list that is missing rows `pnpm peers check` reports
on the same tree — a parent's unmet `typescript` or `vitest` peer, say —
where that parent is a workspace dependency the importer resolved as
`link:../../packages/<pkg>/dist/dev/pkg`.[^issue-800]

## What they would wrongly conclude

That the workspace is clean and the report is verified: the value's whole
contract is that a limit it cannot answer lands in `unverified`,
`supported`, or `unresolvedImporters` rather than vanishing, so an empty
`unverified` reads as "every peer was checked".

## What is actually true

A `link:` importer entry has no `packages:` row in the lockfile, so the
parent's `peerDependencies` are never joined by the walk in
`src/PeerCheck.ts` — the instance simply does not exist in the instance
index. `unresolvedEdge` fires only for an edge an instance records under
`unresolvedEdges`, and nothing marks a missing parent that way, so the
report raises no reason.[^peer-check-ts] Where the kit does look it agrees
with pnpm; the gap is the parent it never looks at. This is the
silent-success shape the report exists to prevent, and it is open as
issue 800: either join a `link:` parent's peers from its manifest on disk
(which makes `PeerCheck` no longer a pure value over the lockfile alone,
a design decision) or emit `unresolvedEdge` for every `link:` edge so the
report fails closed.

## The check

A gate on a `linkWorkspacePackages: deep` workspace must not treat
`unverified: []` as proof until issue 800 closes; run `pnpm peers check`
beside it, or confirm no importer entry resolves a peer-declaring parent as
`link:`. When the fix lands, the report either grows rows for the linked
parent or names the edge in `unverified`, and this concept is retired.

[^peer-check-ts]: `packages/workspaces/src/PeerCheck.ts` — the
    `unresolvedEdges` arm that declines rather than reports, and the
    instance index a `link:` parent never enters.
[^issue-800]: <https://github.com/spencerbeggs/effected/issues/800> — the
    savvy-web/systems dogfood finding, with the probe fixture and oracle.

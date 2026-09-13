---
type: Module
title: pnpm-plugin-effect
description: The kit's companion pnpm config dependency — publishes the effect and effected catalogs that pin the whole ecosystem's versions.
status: stable
kind: package
resource: ../../packages/pnpm-plugin-effect
tags:
  - release
  - architecture
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 4eb2c61fdc8d105f6c3a6188b8152e7203f92b08aeccb9d7c7e5da4eee801ab0
---

# pnpm-plugin-effect

## Purpose

`@effected/pnpm-plugin-effect` is the kit's [companion](../glossary/companion-package.md)
package — published and installable, but not a library. It is a pnpm
**config dependency** (installed with `pnpm add --config`, not as a
normal dependency) that centralizes Effect-ecosystem versioning by
publishing pnpm catalogs. It is the single source of truth for what "the
current Effect version" means: every `@effected/*` package references
`catalog:effect` / `catalog:effect:peers`, and so can any external
workspace that installs it. It carries the kit's own version surface too,
so one installed config dependency pins both halves of what a consumer
builds against.

Four catalogs, and this is the whole set: `effect` (every `effect` /
`@effect/*` package on the v4 line, pinned to the current prerelease),
`effect:peers` (the same set as the advertised peer range), `effected`
(the kit's own packages, at the version each will next publish) and
`effected:peers` (the same set as the advertised peer range). Every name
is colon-form — see
[the retired effect3 interop catalogs](../decisions/effect3-catalogs-retired.md)
for the pair that must not come back.

Nothing can depend on this package — there is nothing to import and
nothing to call — so tier answers a question that does not apply. It is
a real npm-targeted package that publishes with the kit on the release
gate like every other package: being a companion makes it structurally
free to release on its own schedule, but the release is coordinated by
design so consumers get one internally consistent graph. **Installing it
is optional for the consumer** — a workspace can pin Effect by hand — but
shipping it is not optional for the release: it is a supported, shipped
option, not an internal tool that happens to be publishable.

## How it generates the catalogs

The catalog strategy is declared in
`packages/pnpm-plugin-effect/savvy.build.ts` via `rolldown-pnpm-config`'s
`PnpmConfigPlugin`. Each package entry carries a `range` (the pinned
version), a `peer` (the input to the floor computation) and a `strategy`.
Memberships, versions and strategies all live in that one file. See
[the effected catalog literal](../models/effected-catalog-literal.md) for
its shape and load-bearing constraints.

The `effect` (v4) catalog pins exact versions, never a caret — a caret on
a prerelease floats across the release line and desynchronizes the
installed `effect` from the `.repos/effect` submodule that is
authoritative on what v4 exports — and uses the `lock` strategy, so every
consumer resolves to the same pinned version on install and the `peer`
inputs equal the pinned versions under that strategy, which is why
`effect:peers` holds the same exact pin rather than a caret floor.

`src/index.ts` and `src/pnpmfile.ts` are one-line re-exports over
`rolldown-pnpm-config` virtual modules; all real configuration lives in
`savvy.build.ts`. The build sets `bundleNodeModules: true` and uses
`looseFiles` to ship the pnpmfile (`pnpmfile.mjs` / `pnpmfile.cjs`) that
pnpm loads as the config dependency's hook.

The v4 `effect` catalog deliberately carries no entries for packages
Effect v4 absorbed into core (`@effect/platform`, `@effect/cluster`,
`@effect/rpc`, `@effect/sql`, `@effect/workflow`, `@effect/experimental`).
That absence *is* the removal signal — a consumer or migration agent
looking one of these up and finding nothing should read it as "this
package no longer exists on the v4 line; its functionality lives in
`effect` core," not as an oversight. The suffixed packages that still
ship on v4 (`@effect/platform-node`, the `@effect/sql-*` drivers) stay in
the catalog; only the bare absorbed names are gone.

## The effected catalog: the kit's own version surface

The `effected` / `effected:peers` catalogs list every publishable kit
package but one, in object form with a `range`, a `peer`,
`strategy: "lock-minor"` and `source: "workspace"`. They exist for
consumers, not for this workspace: internal edges stay `workspace:*`, and
these catalogs are not exported into the root `pnpm-workspace.yaml` the
way the Effect ones are. `@effected/pnpm-plugin-effect` is deliberately
absent from its own catalog — see
[the plugin is never in its own catalog](../decisions/plugin-never-in-its-own-catalog.md).
Publishability for membership purposes is always
`publishConfig.access === "public"`, never `private === false` — see
[the publishability-signal convention](../conventions/publishability-signal.md).
Entries hold **next-release** versions; see
[the effected catalog holds next-release versions](../decisions/catalog-holds-next-release-versions.md)
for what follows from that. Keeping the catalog current is automated —
see [the catalog:sync / catalog:check CLI](../interfaces/catalog-sync-cli.md).

## The retired effect3 interop catalogs

See [effect3 catalogs are retired](../decisions/effect3-catalogs-retired.md).

## The generated allowed-versions table

Every catalog advance strands previously-published artifacts: under
`lock`, a registry package peers on the exact version it was built
against, so the moment the workspace installs the next pin, that peer
goes unmet and `pnpm peers check` gains a warning. The structural fix is
a `peerDependencyRules.allowedVersions` table in the root
`pnpm-workspace.yaml` declaring the lock catalog's current pin an
acceptable resolution, retiring the warning class rather than documenting
each occupant by hand.

The table is derived, never hand-written. `PnpmConfigPlugin`'s
`peerDependencyRules.allowedVersionsFromCatalogs` option names the source
catalog and the peer each rule targets, and `rolldown-pnpm-config export`
emits one rule per lock-catalog package into the workspace file. Rules
are version-qualified parent selectors (`"<satellite>@<its pin>>effect"`),
never blanket and never name-only, so pnpm applies a qualified rule only
when the actual parent instance's version satisfies the qualifier — any
other instance of the same satellite name, such as a toolchain-carried
older prerelease, still warns on a genuinely unmet peer. The scope is
effect's own satellites, never the kit's own `@effected/*` members,
because the kit controls its own artifacts and the republish cycle
repairs their stranding properly — covering them here would mask a real
defect.

The table suppresses reporting only; it does not change resolution, so
`autoInstallPeers` may still materialize an older `effect` instance for a
stranded artifact's subgraph. A second copy is not always inert — a
lagging toolchain has mixed two `effect` copies into one `Schema` decode
pipeline and crashed every build — so keeping the workspace and toolchain
resolved to one `effect` copy remains the invariant this table's own
package does not solve.

## Maintainer workflows

Three root scripts drive catalog maintenance and are **user-run only** —
they rewrite this package's `savvy.build.ts` and the root
`pnpm-workspace.yaml`, mutating the lockfile on the next install:
`pnpm pnpm:up` (pin each Effect package to its latest v4 release and
recompute the peer floor), `pnpm pnpm:export` (write the generated
catalogs and allowed-versions table into `pnpm-workspace.yaml`, and
surface drift) and `pnpm pnpm:preview` (preview without writing).
Advancing the Effect pin is `pnpm:up` then `pnpm:export`, with the
`.repos/effect` submodule re-pinned in the same commit — see
[advance the effect pin](../runbooks/advance-the-effect-pin.md).

The two `catalog:` scripts are a different class and **agents may run
them**: `pnpm catalog:sync` and `pnpm catalog:check` touch only
`savvy.build.ts` and one fixed-name changeset, never the lockfile or
`pnpm-workspace.yaml`, and CI runs them on every pull request to `main`
and to `changeset-release/main` — see
[the catalog:sync / catalog:check CLI](../interfaces/catalog-sync-cli.md).

## Consumer usage

Installing the config dependency gives a workspace the catalogs.
Applications reference the pinned versions directly in `dependencies`
(`"effect": "catalog:effect"`), so the app always runs the current
Effect. Libraries pin the dev version and declare the calculated floor as
the peer range: `catalog:effect` in `devDependencies`,
`catalog:effect:peers` in `peerDependencies`.

## Relationship to the peer discipline

These catalogs are the mechanism behind the kit's peer-dependency
discipline. Root `pnpm-workspace.yaml` sets exactly one
resolver-relevant key, `autoInstallPeers: true` — no
`dedupePeerDependents`, no `dedupeDirectDeps`, no `.npmrc`. The direct
`effect` (`catalog:effect`) devDependency on this package is load-bearing
and must not be removed as unused: without an `effect` of its own, this
package would let pnpm bind the bundler's `@effected/*` peers to
whatever older `effect` copy the toolchain carries, loading v4 code
against it at build time. The devDependency exists purely to give the
resolver the right version to bind; the companion still ships no
`effect`-importing code.

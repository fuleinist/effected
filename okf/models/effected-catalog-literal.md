---
type: DataModel
title: The effected catalog literal
description: "The inline PnpmConfigPlugin call in savvy.build.ts declaring the catalogs object that every kit catalog and the derived allowed-versions table is generated from."
status: stable
resource: ../../packages/pnpm-plugin-effect/savvy.build.ts
tags:
  - release
  - architecture
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 5809adbc2784f5cce8b02097a9b4683e09639c0ce8e05e4fc6bab37961bde0a4
---

# The effected catalog literal

## Shape

`packages/pnpm-plugin-effect/savvy.build.ts` calls `PnpmConfigPlugin({ ... })`
with a `catalogs` object carrying four named catalogs — `effect`,
`effect:peers` (folded into `effect` under the `lock` strategy, since
`peer` equals `range` there), `effected` and `effected:peers`. Each
catalog's `packages` map holds one entry per package name, and every
entry is an object of the same three fields: `range` (the version pinned
in this catalog, or for `effected` the package's next-release version),
`peer` (the input the peer-floor computation reads) and `strategy`
(`"lock"` for the Effect catalogs — pin exact, peer equals range;
`"lock-minor"` for `effected` — floor the peer to the minor). `effected`
entries additionally carry `source: "workspace"`, telling the upgrade CLI
to resolve the version from this workspace rather than treating `range`
as an already-final value.

A `peerDependencyRules.allowedVersionsFromCatalogs` block sits alongside
`catalogs`, naming the source catalog (`effect`) and the peer each rule
targets (`effect`) for [the generated allowed-versions
table](../modules/pnpm-plugin-effect.md#the-generated-allowed-versions-table).

## What derives from it

`rolldown-pnpm-config export` reads this literal and writes the root
`pnpm-workspace.yaml`'s Effect catalogs and the derived
`peerDependencyRules.allowedVersions` table. `rolldown-pnpm-config
upgrade` (the CLI behind [`catalog:sync` /
`catalog:check`](../interfaces/catalog-sync-cli.md)) reads and rewrites
the `effected` catalog's entries in place, resolving each `source:
"workspace"` package's next-release version. The published npm package's
`catalogs` and `hooks` virtual modules — what a consumer's pnpm actually
installs as `catalog:effect`, `catalog:effected`, and so on — are built
from this same literal.

## What breaks if an entry is wrong

An entry with the wrong `range` under the `effect` catalog's `lock`
strategy desynchronizes every `@effected/*` package's devDependency pin
from what `.repos/effect` actually vendors, which is the authority on
what v4 exports — see [the effect catalog pins exact
versions](../decisions/effect-catalog-exact-pins.md). An entry missing
from the `effected` catalog entirely is invisible to `rolldown-pnpm-config
upgrade`, which walks the literal and can only report on packages it
already names — see [the catalog:sync / catalog:check
CLI](../interfaces/catalog-sync-cli.md) for how the sync script's own
membership computation catches that gap instead. An entry with a stale
`range` under `effected` — one that was bumped only as a dependency
ripple and never wrote its own changeset — makes a consumer's resolved
`@effected/*` range look satisfied while actually excluding the release
that motivated the bump; see [the effected catalog holds next-release
versions](../decisions/catalog-holds-next-release-versions.md).

## Why it must stay inline

`rolldown-pnpm-config upgrade`'s CLI finds the catalog by statically
walking the `PnpmConfigPlugin(...)` call argument for
`.catalogs.<name>.packages`. Hoisting the literal into an exported
`const` makes it invisible to that static walk. `savvy.build.ts` is
itself a top-level `await build({...})` call, so a test cannot import it
either — the package's own `__test__/catalog.test.ts` reads the source
text the same way the CLI does, which is why that parsing approach exists
at all rather than importing a value.

## Why the plugin never appears in its own catalog

See [the plugin is never in its own catalog](../decisions/plugin-never-in-its-own-catalog.md).

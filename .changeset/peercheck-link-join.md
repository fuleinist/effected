---
"@effected/workspaces": minor
---

## Features

`PeerCheck.run` accepts two new options that close the `link:` blind spot in peer verification (effected#800): under pnpm, every `workspace:` dependency resolves through `link:`, and pnpm records no peer declarations for a workspace project, so a linked parent's peers were invisible to the report even though `pnpm peers check` reads them from the manifest on disk. Without these options, a pnpm monorepo with internal dependencies now reports `unverified` where it previously reported clean — pass both to restore a "proven clean" answer:

```ts
const report = PeerCheck.run(lockfile, {
	peerDependencyRules: yield* catalogs.peerDependencyRules(),
	workspacePackages: yield* discovery.listPackages(),
	catalogs: yield* catalogs.set(),
});
```

- `workspacePackages` — the packages `WorkspaceDiscovery` already returns. Joins a `link:`-resolved parent's manifest peers into the walk (the root importer's linked targets included), naming the parent from its manifest (`probe-a@1.0.0`, not the lockfile row's `packages/a@0.0.0`) and judging its peers against the *importer's own* dependency set, which is where pnpm resolves them from. Presence of the key is the assertion: `"unresolvedEdge"` still fires for any `link:` target the supplied set does not cover, and for every target when the key is omitted, so the option answers only for what it covers.
- A `link:` target matches a supplied package at its own directory or, when `publishConfig.directory` is set and `linkDirectory` is not `false` (pnpm's default), at that publish directory — the layout a workspace that links built output uses. A linked package's peers are judged for its direct consumer only, and a workspace package's own dependencies belong to its own importer, matching where `pnpm peers check` reports them.
- `catalogs` — the workspace's `CatalogSet`, from `WorkspaceCatalogs.set()`. A joined manifest may declare a peer as `catalog:` or `catalog:<name>` rather than a plain range; with this key supplied, the specifier resolves through the set and the resolved range is judged and reported as `wanted` — the same value `pnpm peers check` reports as `wantedRange`.
- A new `UnverifiedReason`, `"peerRangeUnresolved"`, fires when a joined peer's range is a protocol specifier (a `catalog:` entry the supplied set names nothing for, `catalogs` omitted, or any other protocol such as `workspace:*`) while something resolved for that peer, so the comparison was never performed. A peer with no provider at all is unaffected and is still reported as usual.

## Other

- New committed oracle fixtures under `__test__/fixtures/peers/` (the `linkdeep*` and `linkchain*` sets) recording real pnpm 12.5.1/12.6.0 `peers check --json` output alongside the lockfile, covering the root importer's own linked dependencies, publish-directory links, and chains of linked workspace packages.

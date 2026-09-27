---
"@effected/workspaces": minor
---

## Features

- `PeerCheck.run` accepts `workspacePackages` — the packages `WorkspaceDiscovery` already returns — and joins a `link:`-resolved parent's manifest peers into the walk, closing the joining side of effected#800's option 1 without reading the disk: `PeerCheck` stays a pure value over its inputs. A matched manifest's declared peers are walked, named from the manifest in `parents` (`probe-a@1.0.0`, not the row's `packages/a@0.0.0`, which is the only place those two facts exist), and judged against the **importer's own** dependency set. Measured one variable at a time against pnpm 12.5.1 and 12.6.0 — see `__test__/fixtures/peers/README.md`: the consumer's own `react@18.3.1` satisfies a linked parent's `^18.0.0` peer, the same version installed only by a sibling importer does not, and the consumer's own `react@17.0.2` is a `bad` row carrying the version that resolved.
- **Presence of the key is the assertion**, the same rule `peerDependencyRules` follows: `"unresolvedEdge"` fires for every `link:` target the supplied set does not cover, and for every target when the key is omitted, so the option answers only for what it covers and a gate can still tell "clean" from "unchecked".

## Other

- A supplied manifest range that is a protocol specifier rather than a range (`catalog:effected:peers`, `workspace:*`) is carried through verbatim and, with a provider present, declined rather than resolved — resolving it needs the workspace catalog map, which is not an input yet. `pnpm peers check` resolves those through the workspace config, so a catalog-sourced peer with a provider outside the catalog's range under-reports here until that input lands. Named rather than papered over: the alternative would be guessing a range no input supplied.
- Three committed oracle fixtures — `__test__/fixtures/peers/linkdeep-provided/`, `linkdeep-sibling/` and `linkdeep-bad/` — record the provider rule in real pnpm 12.5.1 output, and the fixtures README records the catalog-peer measurement pass (byte-identical lockfile and verdict to `linkdeep/`, so no duplicate directory) alongside the abort that a plain catalog does NOT reproduce.
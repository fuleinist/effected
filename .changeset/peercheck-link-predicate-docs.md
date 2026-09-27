---
"@effected/claude-code-plugin": patch
"@effected/copilot-plugin": patch
---

## Other

- The workspaces skill reference now teaches all three `PeerCheck.run` `UnverifiedReason` values — `"peerRulesNotApplied"`, `"unresolvedEdge"`, and the new `"peerRangeUnresolved"` — and shows the "proven clean" predicate reachable under pnpm for a monorepo with internal dependencies: pass both `workspacePackages` (joins a `link:`-resolved parent's manifest peers) and `catalogs` (resolves a joined `catalog:` peer range) alongside `peerDependencyRules`. It also names `"peerRangeUnresolved"`'s trigger — a joined manifest peer whose range is a protocol specifier that could not be resolved while something resolved for that peer — so a consumer reading `unverified` in a gate knows what each reason means and how to clear it, rather than reaching for a fail-closed workaround.

---
type: Module
title: lockfiles
description: Pure lockfile parsing for bun, npm, pnpm and yarn Berry, normalized into one unified model, plus pure integrity checking.
status: stable
kind: package
resource: ../../packages/lockfiles
tags:
  - dx
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 963de10714218a0afc21b3cdb0e574d6ad42f16da046d849ba846075542b8bfd
---

# lockfiles

## Purpose

`@effected/lockfiles` is lockfile parsing as pure string→model decoding. It holds the four package-manager lockfile parsers — bun's JSONC, npm's JSON, pnpm's YAML and yarn Berry's YAML — the unified `Lockfile` model they all normalize into, and pure integrity checking of that model against workspace manifests. Its consumer is `workspaces`, whose `LockfileReader` service does the root find, package-manager detection and file read, then calls into this package; the `LockfileReader` service itself lives in the consumer, never here.

## Tier and dependency posture

[Pure tier](../glossary/library-tier.md). No services, no layers, no IO, no `R` anywhere — a lockfile parser that reached for the filesystem would be boundary tier, so the IO stays out by construction: every entrypoint takes content as a string, and integrity checking takes manifests as input rather than reading them. Peers are `effect` plus four pure-to-pure `workspace:^` edges — `jsonc` for bun, `yaml` for pnpm and yarn Berry, `semver` for integrity's range satisfaction, and `npm` for the shared specifier, dependency-field and integrity-hash vocabulary — each mirrored by a plain `workspace:*` devDependency, the two specifiers deliberately differing so a published patch floats. Zero external runtime dependencies: the text-parsing engines arrive through the sibling packages, so unlike `glob` and `toml` there is nothing to vendor here.

## The supported input domain

The package parses **pnpm `lockfileVersion` 9+ and npm `lockfileVersion` 3+**; an older format fails typed. This is a deliberate narrowing of the supported input domain, recorded as contract rather than implementation detail: a consumer parsing some other repository's older lockfile receives a typed failure by design, not by accident. Pre-v9 pnpm and pre-v3 npm record resolution in shapes this model does not describe, and parsing them would hand a consumer rows that silently cannot answer a resolution question. The gate is on the lockfile *format* version, and the docs say so — a lockfile records no package-manager version, and the mapping is many-to-one (pnpm 9, 10 and 11 all write format `9.0`), so a "requires pnpm 11+" claim is unenforceable and unstated; the manager versions the suite is tested against are listed separately. The gate reads the version and nothing else, never whether `snapshots:` exists or has entries — a dependency-free v9 workspace legitimately records zero snapshots, and an emptiness guard would reject that valid lockfile; both directions are mutation-checked. The gate runs **before** the shape decode, so the oldest formats report as too old rather than as malformed. bun and yarn are ungated, recording no comparable format-version line.

## The model

`Lockfile` is a `Schema.Class` carrying the format, the lockfile version, the resolved packages, the workspace dependency edges, the importers and an optional per-format extension. `Lockfile.parse` is the package's **only fallible boundary** — everything else is total: the importer-name rewrite, name/importer/instance-id lookup (all backed by lazily built private indexes outside the schema), the workspace-packages getter, and integrity comparison.

`packageByInstanceId` is the index edge-walking consumers were rebuilding: `ResolvedPackage.instanceId` is what a resolved edge points at, so peer and dependency resolution is a lookup, not a scan. It mirrors `importer` exactly and deliberately — lazily built so a consumer that never walks edges pays nothing, `Map`-backed so an id colliding with an `Object` member name (`__proto__`, `constructor`) neither pollutes nor false-matches, and first-wins on a duplicate id so a malformed lockfile gets a stable answer rather than one depending on iteration order.

**A row is an instance, not a package.** `ResolvedPackage` rows are package *instances* in every format — one row per lockfile key for npm and bun, one row per *snapshot* for pnpm rather than per declaration — so one format-agnostic resolution algorithm can serve all four downstream. `instanceId` is the format's own canonical identity, verbatim and opaque (pnpm's snapshot key, npm's full entry key, bun's `packages` key, yarn's locator) — no scheme is synthesized. `resolved` maps a dependency (and, where the format records it, peer) name to the `instanceId` that name resolved to in this instance's context.

**Every edge in `resolved` is verified against the lockfile's own id set before it is emitted**, and an edge that cannot be named honestly is omitted rather than guessed. `unresolvedEdges` names dependencies whose edge the lockfile records but the model could not name — distinct from genuine absence. npm and bun contribute nothing to `unresolvedEdges`, since their sections are declarations resolved positionally and "the walk found nothing" there is genuine absence; pnpm's `link:` targets into non-importer directories (a `publishConfig.linkDirectory` build-output path) are the shape that populates it. A `link:` target only resolves to an ancestor importer path under a `workspace:` specifier, since that specifier is the evidence the target belongs to a workspace package at all, and the root importer is excluded as an ancestor of everything. A consumer reading an absent `resolved` key as "nothing is there" instead of "recorded but unnameable" converts this package's honest gap into its own false positive — `workspaces`' peer check is the worked case, where an unnameable but satisfied `link:` peer would otherwise read as an unsatisfied peer.

Every format records peer declarations, held as `peerDependencies` (name→range) and `peerDependenciesMeta` (name→`{ optional: boolean }`), both defaulting to `{}` at construction and on decode — an absent section is an empty record, never `undefined`. These fields hold declarations only, distinct from `resolved`'s per-instance verified answer. pnpm records no peer declarations for workspace projects at all (probed against pnpm, with and without `autoInstallPeers`); yarn's peer data is populated even though the downstream peer check does not consume it, since populating it is nearly free and a normalized model that silently drops one format's data is a trap for the next consumer.

## Document framing: a lockfile is a YAML stream

A lockfile is not always one YAML document — see [a lockfile is a YAML stream](../decisions/lockfile-is-a-yaml-stream.md) for the framing rule, why it is deterministic rather than heuristic, and the per-format behavior it produces.

## Importers

The importers field records each workspace importer's *declared* dependencies — the data a before/after lockfile diff needs, which is what `silk-update-action` parses two texts through this pure boundary to compare. `ImporterDependency` holds one declared dependency: its specifier is `npm`'s branded specifier via that package's string codec, so a decoded value is tag-matchable while encoding round-trips the exact original string; its version is **pnpm-only**, since pnpm records a specifier-and-version pair per importer dependency while bun and npm record resolved versions on package entries, so consumers there join by name against the packages array. That version is always the plain version — pnpm's peer-disambiguation context splits off into a separate optional `peerSuffix` field holding the raw parenthesized chain, with one shared implementation for the split so the pnpm package-key parser and the importer-dependency parser cannot disagree about where a version ends. `LockfileImporter` holds the root-relative importer path plus the dependencies. pnpm, bun and npm populate importers off a shared dependency-sections table; yarn always yields an empty array, since yarn records no importers; and the importer-name rewrite deliberately does not touch importers, since they stay keyed by path, the join key.

## Hardening

This package's position is unusually good: it adds no new text-parsing engine and no new recursion surface, since text parsing is delegated to already-hardened sibling packages, with npm's native parse wrapped so its throw on hostile input lands in the typed channel. The transforms that remain are single-pass iterations over flat records, and they still owe: prototype-pollution discipline (key-bearing intermediates stay `Map`s and `Set`s, records are built with own-property semantics rather than manual assignment); total string surgery (the `name@version` splitters and yarn's descriptor extractors are total — malformed keys are skipped, never thrown on); and scope honesty (yarn support is Berry only — classic v1 content must exit through the typed parse error and never mis-normalize).

## Observability

Pure-tier house rule: a named `Effect.fn` span on the single public fallible boundary (`Lockfile.parse`) and nothing else. The total methods are span-free. Operational logging belongs to the consumer's reader, which owns the IO story. No metrics, telemetry-agnostic.

## Testing

`@effect/vitest`, `it.effect`, `assert.*` — never `expect`. No platform packages, no mock layers, no `TestClock`. Four families: per-format fixture tests across each manager's lockfile versions, asserted against the unified model (package identification, integrity, workspace dependency edges, extension payloads); seam-property tests (the importer-name rewrite renames pnpm workspace packages and rewrites both edge ends while leaving unmapped entries, non-pnpm lockfiles and importers untouched; integrity comparison covers valid, missing, extra, unsatisfied and skipped cases, fed by in-memory manifests, so there is no IO anywhere in the suite); a hostility suite (malformed text and wrong shape each landing on their own stage, yarn classic content, dunder and hostile `name@version` keys, nesting bombs); and codec round-trips via `it.effect.prop` over derived arbitraries, asserting encode-decode identity.

## Build

Scaffolded from a pure sibling, model paths under `website/lib/models/lockfiles`. The model and error classes are class factories, so `savvy.build.ts` carries the narrow `_base` API Extractor suppression. Because it has workspace peers, the package needs a `prepare` script so turbo's upstream-build ordering applies.

## Consumer contract

`workspaces`' `LockfileReader` finds the root, detects the package manager, reads the file (its read error stays there), and calls `Lockfile.parse` directly, because document framing is this package's job, not the reader's. For pnpm it then reads the workspace manifests and applies the importer-name rewrite; integrity is manifest IO plus the comparison; resolved-version lookup is the name index. `workspaces` defines its **own** package-manager literal rather than aliasing this package's format literal — the two are structurally identical and assign freely, but they are different concepts (which manager drives this workspace, versus which lockfile grammar to parse), and a separate name avoids colliding with `package-json`'s package-manager class in a consumer's imports.

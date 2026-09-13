---
type: Runbook
title: Advance the effect pin
description: Move the whole kit onto a new Effect v4 prerelease, in one coordinated commit sequence.
status: stable
tags:
  - architecture
  - compat
  - release
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 3ec3b625b9fc0823ee4e064d52488496b4f52f9c61b39fcf841bf1851677261f
---

# Advance the effect pin

## Trigger

Effect ships a new v4 prerelease (`4.0.0-rc.<n>`) that the kit needs to track. Only a human runs this procedure's catalog-mutating steps — agents surface the commands and let the user run them.

## Steps

1. **Advance the catalogs.** The user runs `pnpm pnpm:up` (`rolldown-pnpm-config upgrade savvy.build.ts` inside `packages/pnpm-plugin-effect`) followed by `pnpm pnpm:export`, which mutates `pnpm-workspace.yaml`'s `effect` / `effect:peers` catalogs and the lockfile. Agents must not invoke either command directly; only surface them.
2. **Re-pin `.repos/effect` in the same commit.** Run `savvy repos pin effect effect@<new-tag>` (or the `repos_manage` MCP tool with `action:"pin"`) so the vendored source and the installed version move together by construction — never let the pin land in a separate commit from the catalog bump. Review any `staleNoteIds` the pin flags.
3. **Decide the toolchain bridge shape.** Determine whether the previously-published `@effected/*` closure still runs on the new `effect`. If yes, write an `overrides` block mapping each stranded old-exact spec to the new one (`effect`, plus any stranded platform packages). If no — the new prerelease removed or renamed an API the published closure calls at module init — write a `packageExtensions` block pinning the toolchain's own `@effected/*` peers to regular dependencies on the toolchain's still-old `effect` instead. See [one resolved effect copy](../conventions/one-resolved-effect-copy.md) for the full shape of both bridges and the diagnostic that picks between them.
4. **Install, and confirm the bridge closed what it was meant to close.** For an `overrides` bridge, confirm the packages-section-scoped count of the old pin reaches zero. For a `packageExtensions` bridge, confirm no published kit package resolves against the new pin while the toolchain still builds on the old one, and diff the lockfile's `importers:` section against the pre-bridge copy to confirm no workspace package's own edges were rewritten.
5. **Run a full-kit build and test pass** (`pnpm build`, then the workspace test suite) to catch anything the bridge did not anticipate before the advance lands.
6. **Check the lockfile diff.** Confirm platform binaries (turbo, biome, tsgo) were not stripped by the install, and note the bridge's removal condition in the PR description so a later reader knows when it is safe to take back out.

## Observable end state

`pnpm-workspace.yaml`'s `effect` / `effect:peers` catalogs, `.repos/effect`'s pinned tag, and the installed `effect` version all agree on the same new prerelease. The chosen bridge (`overrides` or `packageExtensions`) is present only if the closure genuinely needs it, is scoped to exactly the stranded packages, and its removal condition is recorded. A full-kit build and test run passes.

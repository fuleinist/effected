---
type: Convention
title: Build through turbo, never by invoking the bundler script directly
description: "Always build with `pnpm build --filter <pkg>`, which drives turbo's full task graph, and never invoke a package's savvy.build.ts directly or list @savvy-web/bundler as a runtime dependency."
status: stable
stale_after: 2027-03-13T00:00:00Z
tags:
  - dx
  - ci
sources:
  - id: claude-md
    resource: ../../CLAUDE.md
  - id: claude-build-and-test
    resource: ../../CLAUDE.build-and-test.md
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 24c3212d956d3565b10aaa42921e86b66c763484376b78d5e80f51ed1af842a7
---

# Build through turbo, never by invoking the bundler script directly

Always build a package with `pnpm build --filter <pkg>`, which drives
turbo's task graph (`types:check` → `build:dev` → `build:prod`,
transitively over `^build:dev` for upstream workspace
dependencies).[^claude-md][^claude-build-and-test] Never run `node savvy.build.ts --target prod`
directly — see [the gotcha this shortcut
produces](../gotchas/direct-prod-build-fakes-a-clean-gate.md) for the
truncated, clean-looking output it leaves behind.

`@savvy-web/bundler` is a `devDependency` of every package that builds, and
must never move into `dependencies`.[^claude-md] It is what `savvy.build.ts`
imports to run the build; declaring it as a runtime dependency would ship a
build tool inside the published package rather than using it only to
produce that package's artifacts.

A turbo cache hit can replay a stale artifact's log verbatim — see [the
matching gotcha](../gotchas/turbo-cache-hit-replays-clean-log.md) for the
`generatedAt` check that distinguishes a genuine build from a replay.

[^claude-md]: `CLAUDE.md` — "Build Pipeline": the `pnpm build --filter
    <pkg>` rule and the `@savvy-web/bundler` devDependency rule.
[^claude-build-and-test]: `CLAUDE.build-and-test.md` — "Build pipeline":
    the turbo task graph (`build:prod` depends on `types:check` and
    `build:dev`).

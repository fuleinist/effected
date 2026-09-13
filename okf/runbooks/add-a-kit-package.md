---
type: Runbook
title: Add a kit package
description: The end-to-end cycle for adding a new @effected library — design as an okf Module concept first, then scaffold, build, test, document and advance the package roster.
status: stable
tags:
  - dx
  - architecture
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 2dc17ea23f8e8eb79ae70214e57400878e81929303d84bbac58310434d9406a0
---

# Add a kit package

## Trigger

A consumer survey or roadmap decision scopes a new `@effected/*` library
that does not yet exist.

## Steps

1. **Analyze** the target surface — API, dependencies, IO boundaries —
   from the consumer survey that scoped the package.
2. **Design.** Write the package's `okf/modules/<pkg>.md` Module concept
   before building anything, stating its target class-based API and tier
   (see the tier taxonomy), with the module-per-concept layout described
   in [module layout is module-per-concept](../conventions/module-per-concept-layout.md).
   Any durable choice with rejected alternatives that the design surfaces
   becomes its own Decision concept at this step, not prose buried in the
   Module.
3. **Build** against Effect v4.
4. **Test** with `@effect/vitest`, following the `__test__/` convention
   (tests never co-located in `src/`) and sibling suites.
5. **Document** — wire the api-extractor model (`website/lib/models/`)
   and website docs.
6. **Distill** lessons into plugin skills. This is the point of the
   cycle: best practices that emerge from a build get recorded in the
   "effected" Claude Code plugin — see
   [the claude-code-plugin Module](../modules/claude-code-plugin.md).
7. **Advance** — add the package's row to the package table in the
   [Project concept](../project.md).

Step 2's mechanical half — creating the workspace package skeleton — is
[add a workspace package](add-a-workspace-package.md), the ordered
scaffold procedure. This runbook covers the end-to-end cycle around it;
that one covers the package skeleton itself.

## Fixtures carry a provenance README

When a package commits fixtures, it commits a `README.md` beside them —
see [fixtures carry a provenance README](../conventions/fixtures-carry-provenance-readme.md)
for what that file must state.

## End state

The package has a Module concept in `okf/modules/`, a working
`packages/X` directory that builds and tests cleanly, a wired
api-extractor model, any durable design lessons distilled into plugin
skills, and a row in the Project concept's package table.

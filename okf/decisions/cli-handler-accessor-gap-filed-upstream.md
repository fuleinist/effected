---
type: Decision
title: "cli files the Command handler-accessor gap upstream rather than shimming it"
description: Why a missing accessor on effect/unstable/cli's Command type is reported to core instead of patched locally.
status: draft
tags: [dx]
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: e50f598c62911ad174ac8ad9b03be5f11a4c1db32a16228a2fdb3536a0373380
---

# cli files the Command handler-accessor gap upstream rather than shimming it

## Context

While building `@effected/cli`'s test surface, a gap surfaced in
`effect/unstable/cli`'s `Command` type: there is no supported accessor for
a command's handler, which would otherwise make certain testing patterns
more convenient to write.

## Decision

The gap is filed upstream against core, not shimmed inside
`@effected/cli`. This package's whole claim is that it owns the
*boundary* — presentation over a CLI program — rather than patching the
framework `effect/unstable/cli` itself provides.

## Alternatives rejected

- **Shimming the internal accessor locally.** Rejected because it buys a
  testing convenience at the cost of owing maintenance against a moving,
  unstable internal — exactly the kind of implementation-of-core's-contract
  work this package's sibling, `@effected/commands`, is built specifically
  to avoid for subprocess handling.

## Consequences

`@effected/cli`'s test surface works around the gap without touching
`effect/unstable/cli`'s internals, and the fix — if and when core ships
one — lands upstream rather than as a local patch this package would then
have to un-shim later.

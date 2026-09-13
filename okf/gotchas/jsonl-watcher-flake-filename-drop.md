---
type: Gotcha
title: A flaky jsonl watcher is probably a dropped null-filename event, not an unreliable platform watch
description: The instinct to blame the platform file watch as generically unreliable leads to an unjustified polling timer; the known, reproducible cause is a directory-watch event drop under load.
status: stable
stale_after: 2027-03-13T00:00:00Z
resource: ../../packages/jsonl/src/Journal.ts
tags:
  - architecture
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 3888a9e27830c84b21035f128138d119ad739e4c323fcb30ae7d066bc1bd35d7
---

# A flaky `jsonl` watcher is probably a dropped null-filename event, not an unreliable platform watch

## What a reader sees

A `Journal`'s subscription occasionally misses an external append, or a
consumer report describes the watcher as "unreliable" or "flaky" under
load or on some filesystems.

## What they will wrongly conclude

That the underlying platform file watch cannot be trusted in general, and
that the fix is a polling fallback timer layered on top of the watch to
paper over its unreliability.

## What is actually true

The node watch backend silently drops events whose filename is `null` — a
case the platform genuinely produces under load and on some filesystems —
and maps only a change event to an update, re-stating on a rename to decide
what happened. That is a real, reproducible defect, but it is specifically
a **directory-watch** property, and it is not what the one real failure
this package hit turned out to be: the file watch proved reliable once
armed, and the actual cause was activation ordering (the watch must be
armed *before* the catch-up read; see the [journal
interface](../interfaces/jsonl-journal.md#the-watcher-and-activation)). The
dropped null-filename event and the related create-as-remove misreport on
directory watches are both real, upstream-attributable behaviors, but
reaching for "the platform watch is unreliable" as the first hypothesis
sends a debugging session to the wrong layer and toward an unjustified
polling timer that would not even close the actual activation-ordering
window.

## The check

Before adding any timer or polling fallback, verify which watch is
involved: a **direct watch on an existing file** is the steady-state
mechanism and has proven reliable once armed; a **directory watch** is
activation-only and is where the null-filename drop and create-as-remove
misreport are real. If the symptom is on the file watch after activation,
suspect the dropped null-filename event first — treat it as hypothesis #1
rather than "the platform is unreliable" — and if a future platform is
found to drop events even after being properly armed, the sanctioned escape
hatch is core's `WatchBackend` synchronous registration seam, not a timer.

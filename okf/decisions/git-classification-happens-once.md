---
type: Decision
title: Git failure classification happens once, in one private function
description: No consumer of @effected/git ever string-matches stderr; a single private classify step in Git.ts is the only place that inspects stderr, stdout or exitCode.
status: draft
tags:
  - architecture
  - security
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 3a86c17b2866aecec121b5f882513b33998ec30dda12775162d0ba77cde7c1cf
---

# Git failure classification happens once, in one private function

## Context

git communicates failure through exit codes and unstructured stderr text.
Every consumer of a git-spawning library that has to interpret that text
itself risks re-deriving — and re-getting-wrong — the same classification
logic, and a change to git's own wording can silently break every
independent implementation at once.

## Decision

No consumer of `@effected/git` ever string-matches stderr. Git's failure
modes are classified in a single private `classify` step in `Git.ts` —
nowhere else in the package inspects `stderr`, `stdout` or `exitCode`.
The base taxonomy is three typed errors carried through every surface the
service has:

- **`GitCommandError`** — git ran and failed in a way that is not a
  recognized domain case, the spawn itself failed, or a pre-spawn guard
  refused the invocation. A required `kind` discriminant
  (`"refused" | "failed"`) splits pre-spawn refusals from genuine git
  failures structurally, so composed retry/fallback logic routes on
  `kind` rather than parsing the `detail` prose.
- **`NotARepositoryError`** — the `cwd` is not inside a git work tree.
  Every consumer branches on this, so it is a distinct tag rather than a
  `GitCommandError` a caller regex-matches.
- **`UnknownRefError`** — the ref does not resolve. Actionable and
  user-facing, so it is distinct from mechanics; the ref-fetching trio's
  failures land here typed, which is the signal `fetchAny`'s
  tag-then-plain fallback branches on.

Three more errors exist on the rule that **a typed error exists only
where a consumer branches**, each raised only by the members introduced
with it: `NonFastForwardError` (`push` rejected because the remote
moved), `DirtyWorktreeError` (git refused before touching anything) and
`MergeConflictError` (git wrote conflict markers). These three are
kind-gated, so adding them changed no other member's error union —
`checkout` failing on dirty-worktree stderr still surfaces as
`GitCommandError`, pinned by a regression test rather than by intent.

`classify` is gated by a `ClassifyKind` selecting which method-specific
rows apply on top of the shared taxonomy — the absent-at-ref degrade for
`show`, the exit-1-is-false degrade for `refExists`, a silent-exit-1
degrade to absence for `defaultBranch`/`configGet`/`configGetAll`/`checkIgnore`,
and the `"push"`/`"merge"` kinds above. Both `PlatformError` and
`Cause.TimeoutError` are absorbed inside `runClassified`, so a `Git`
method's error channel only ever sees this package's own typed errors,
never core's raw plumbing.

The stderr matching itself is unanchored substring matching against
`LC_ALL=C`-pinned phrases, an accepted, recorded tradeoff — a path or ref
name that literally contains one of these phrases could theoretically
misclassify, and anchoring is deferred until a real collision is
observed.

## Alternatives rejected

**Let each consumer classify git's stderr for its own needs.**
Rejected because it is the exact failure mode this package exists to
prevent: `@effected/workspaces`' snapshot reader, and every other
consumer spawning `git` directly, would each independently interpret
exit codes and stderr text, and a wording change in a future git release
would silently break every one of them differently.

**One flat `GitError` class with a string `reason`.** Rejected for the
same reason the kit's [per-reason tagged error
decision](github-actions-per-reason-tagged-errors.md) applies elsewhere:
a caller plausibly recovers from `NonFastForwardError` differently than
from `DirtyWorktreeError`, and collapsing them into one class with a
string discriminant removes `catchTag`'s ability to route on the
distinction structurally.

## Consequences

Adding a new typed error must ship with a control test: a test asserting
the error fires on its own member, and a control asserting another
member fed the identical stderr still fails generically — without the
control, kind-gating is an intention rather than a guarantee. Widening an
existing member's typed errors is a silent breaking change to every
`catchTag` written against it, so a new error tag is scoped as narrowly
as the member that needs it.

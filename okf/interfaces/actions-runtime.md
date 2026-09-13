---
type: Interface
title: actions-runtime
description: The runner runtime a GitHub Action composes through Action.run — environment, config-backed inputs, logging, outputs/state, secrets and the App-token bridge.
status: stable
kind: runtime
resource: ../../packages/github-actions/src/Action.ts
tags:
  - architecture
  - security
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 084affa22977f40c779df786c17f08609d1c7d03f254d3d06ed09e28b211d451
---

# actions-runtime

## Contract

`Action.run(program, options?)` (`packages/github-actions/src/Action.ts`) is
the entry point every action calls: it provides the runtime layer, renders
a failure, sets the exit code and never rejects. The runtime layer provides
the environment, the logger (plus the workflow-command `Logger`), outputs,
state, the platform services and an HTTP client, and deliberately excludes
the cache, artifact and blob services — see
[bundle reachability](../modules/github-actions.md#bundle-reachability).

The layer option a caller passes is **not** self-contained: it is typed so
it may require anything the runtime already provides (the platform, the
HTTP client, every runner service), which lets a consumer's own
requirements travel upward instead of being sub-provided redundantly. The
composition inside is `provideMerge`, not a flat merge, because state
needs outputs (it masks before it persists) and outputs needs the
environment.

Failure rendering is one error line carrying tag and message, plus the
exit code, with the full pretty-printed cause behind the runner's own
debug switch — never a JS stack spliced into the visible error, since in a
bundled action it points at one line of the bundle. `Action.run` does not
wrap the program in a log buffer: an unhandled defect inside such a buffer
would swallow the whole transcript.

### `ActionEnvironment`

The webhook payload's `R` carries no `FileSystem` requirement: the layer
resolves it once at construction. A scoped environment override never
touches the process environment — it seeds an immutable map once at
construction, held in a `Context.Reference` (v4's replacement for a v3
`FiberRef`), so an override is fiber-scoped and two fibers overriding the
same variable concurrently never see each other's values. The trade-off is
explicit: a variable exported mid-run, or set by a child process, is not
observed by an already-seeded reader — the correct trade, since an
action's environment is fixed at start by GitHub's own model.

### `ActionInput`

Inputs are read through a `ConfigProvider` that owns the `INPUT_` name
mangling — never through the process environment directly, which closes a
production bug where a consumer read `INPUT_SBOM_CONFIG` and silently got
nothing because the runner uppercases the name and replaces **spaces**
with underscores while leaving dashes alone.

Beyond the toolkit-faithful accessors: a **list** accessor absorbing JSON
arrays, bullet lists and comma-separated values in one implementation, and
a **key-value pairs** accessor whose key is validated unconditionally (an
empty key like `=value` is rejected, because the damage lands far from the
typo) while its value is accepted empty by default (`requireValue` opts
into rejecting it). Every rejection names the offending line.

Absence is one rule across every accessor: a missing input and an input
set to empty are both *missing data*, because the runner writes an empty
string for an input the workflow omitted. An input whose contract is
"empty disables it" needs the option form, not a default, because empty
is classified missing *before* a default is consulted — deleting a
manifest default silently flips every unsupplied run onto the disabled
branch rather than restoring a fallback.

`Action.run` installs an input-aware `ConfigProvider` by default, so a
program that bypasses the typed accessors degrades to the right answer
rather than to the default. It resolves a flat, single string-segment path
first through the `INPUT_` derivation, then through the ambient provider
unchanged; nested and numeric paths pass through untouched. A
caller-supplied provider in the layer option wins by normal last-wins
precedence. Never compose a bare environment provider beneath the input
accessors — it uppercases the config path and the read silently falls
back to its default.

### Logging and the workflow-command protocol

`WorkflowCommand` is pure: it renders the wire protocol with the required
escaping and nothing else, and is the one piece of this package a
non-Actions consumer might legitimately want. `ActionLogger` owns groups,
the buffered step renderer and annotations, and ships the `Logger` that
maps every kit package's `Effect.log*` calls onto workflow commands — the
mapping belongs to one `Logger` at the edge, not to each library.

A silent layer is a named constant, not a no-arg factory (which would mint
a fresh layer per call and defeat memoization). Buffering is opt-in and
flushes on every exit path including a defect; only a **success** is ever
discarded. `withStep` buffers with discard-on-success, prints one summary
line on success (emitted **outside** the buffered region, or it would be
discarded with the transcript it replaces) and a failure header ahead of
the spilled transcript. Log annotations use a readable property
vocabulary set through a combinator, never a spelled-out wire key.

### Outputs and state

Reporting a failure emits the annotation but does not set the exit code —
that belongs to `Action.run`, so a recovered failure is not doomed by a
side effect it cannot undo. Runner-file delimiters are derived, never
random, so a value containing the delimiter cannot terminate its block
early. `ActionOutputError` and `DetachedProcessError` are per-reason
tagged unions (see [errors](../modules/github-actions.md#errors)). State
round-trips through the real runner file in tests, in a temp directory.

### Secrets: the declassification seam

`Redacted` cannot survive serialization by design, so declassification is
made explicit, auditable and hard to do quietly: one module,
`Secret.ts`, is the only place `Redacted.value` appears in `src/` — a
structural test asserts it — and it masks through the runner's own secret
command before returning plaintext. State persistence gets the same
treatment: the save-a-secret path masks then persists, because the
runner's state file is plaintext by GitHub's protocol. A detached worker
inverts the ordering rather than the invariant: it composes
`ActionOutputs.layerDetached` (the mask a documented no-op, since a
detached worker's stdout is a log file no runner parses) and the parent
masks **before** the spawn via `Secret.forChildEnv`.

### The App-token bridge

Five phase-oriented statics over [`github`](../modules/github.md)'s App
service: provision a token in `pre`, build a client layer from the
persisted token in `main`, read it, project a bot identity, dispose in
`post`. Failed provisioning revokes (an `acquireUseRelease` whose release
arm revokes on any failure), so a retried failing `pre` does not leave
unreferenced write tokens behind. The token is masked before it is
persisted, through the seam, so the ordering is structural. Reading an
expired token fails typed, naming the expiry, rather than silently
starting to answer 401 — the App's private key never reaches the
persisted state, because that would trade a one-hour token for a
permanent one.

### Detached processes and the bare-pid guard

`DetachedProcess.reap` takes a plain `number` and guards it: signalling
pid `0` hits the entire process group and `-1` hits every process the
user owns, so a pid round-tripped through the runner's plaintext state
file that decodes to `0` would, unguarded, kill the runner. Reaping
refuses any non-positive pid as a typed failure on the way in **and** the
way out of state. The fd-level detached spawn and `process.kill` are both
sanctioned `node:` imports here because core cannot route a detached
child's stdio to a file descriptor. `ChildEnv.prependPath` returns the
additions and an extend flag together, because handing a child an
environment block without extending the parent's silently replaces the
child's entire environment.

## Stability

This is the runner-shaped half every action always pays for, so it stays
light: the cache, artifact, blob, reporting and attestation surfaces are
opt-in layers a consumer composes on top (see
[actions-storage](actions-storage.md), [actions-reporting](actions-reporting.md)
and [actions-attestation](actions-attestation.md)). `ActionInput`,
`ActionOutputs`, `ActionState`, `ActionEnvironment`, `ActionLogger`,
`WorkflowCommand`, `Secret`, `DetachedProcess`, `ChildEnv` and `GitHubToken`
are the stable surface; `internal/` is not part of the contract.

---
type: Decision
title: The jsonl Journal service is a per-registry factory, not a generic key
description: "`Journal.Service<Self>()(id, { events })` produces one class per event registry, matching the pattern @effected/config-file already established."
status: draft
tags:
  - architecture
  - dx
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: e2f3863f88bfc50a48bf55a92bb5b5a70237e0c30ac604c991002e93867b5a12
---

# The jsonl `Journal` service is a per-registry factory, not a generic key

## Context

`@effected/jsonl` needed a service shape that lets several distinct
journals — each declaring its own set of events via its own registry —
coexist in one Effect layer graph, each one typed by its own registry
rather than a shared, widened shape.

## Decision

`Journal` is not a `Context.Service` generic over the registry.
`Context.Service` binds a concrete shape at declaration, and the resulting
key cannot be parameterized at retrieval — there is no form in which
`yield* Journal` returns something typed by a registry supplied at the use
site. Instead the package follows the pattern `@effected/config-file`
already established: a per-registry service-class factory plus a
layer-returning function. Each registry gets its own uniquely-keyed service
class, so several journals coexist in one layer graph and each one's
operations are typed by its own registry. The registry rides on the
class-definition site and is inferred, so `Self` is the only explicit type
parameter:

```ts
class MailJournal extends Journal.Service<MailJournal>()("dogfood/MailJournal", { events: MailEvents }) {}

// Bind the layer ONCE, at module scope, and provide this const everywhere.
export const layer = MailJournal.layer({ path });
```

This is a sanctioned exception to the kit's general "avoid
layer-producing functions" guidance, on the same grounds
`@effected/config-file`'s is: the layer is genuinely parameterized, by a
registry the library cannot know in advance. It is not license to add a
second layer-producing function elsewhere in the package.

Two consequences follow directly from the shape and are recorded rather
than left to be discovered. First, the const-binding hazard is inherited
with the pattern: layers memoize by reference, so calling the layer
function at each provide site mints two independent journal instances over
one file, each with its own semaphore, watcher and hub — the appends are
no longer serialized against each other, the in-process version of the bug
the cooperative-writer rules exist to prevent. The library's obligation is
a TSDoc warning and a test; the consumer's obligation is the one-line
bind-once rule, which belongs in the first README example. Second, this
pattern is the one place in the package where a layer-producing function is
acceptable at all.

## Alternatives rejected

**A non-generic service plus a generic client factory**, the shape core's
`eventlog` uses to solve the same problem. Recorded as the escape hatch if
the per-registry factory ever proves unworkable, but rejected as the
primary shape: the registry has to type the service's own operations, not
a wrapper's, and splitting them into a separate client would put the typed
surface one indirection away from the thing consumers actually hold.

## Consequences

A consumer defining a new journal writes one small class declaration rather
than reaching for a generic parameter at every call site, and the compiler
enforces that a journal's operations are typed by exactly the registry it
was declared with. The cost is the const-binding discipline: a code
reviewer checking a new `Journal.Service` subclass must confirm its
`.layer(...)` call is bound to a module-scope const and provided from
there, not called inline at each provide site.

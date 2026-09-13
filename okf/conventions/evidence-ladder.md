---
type: Convention
title: Climb the evidence ladder in order — renames, then source, then a probe
description: Settle a claim about Effect v4 at the cheapest rung that actually answers the question -- migration notes and skill guides for renames, vendored or installed source for existence and signature, and only a probe from inside a package for semantics.
status: stable
stale_after: "2027-03-13T00:00:00Z"
tags:
  - dx
sources:
  - id: scratchpad-claude-md
    resource: ../../scratchpad/CLAUDE.md
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: f1368fbaed55e40f5219dc01393405980bdea8ea8b8fd90b793e3bcfba07a9e5
---

# Climb the evidence ladder in order — renames, then source, then a probe

The `.claude/skills/improve` project-level skill closes the loop the
plugin's ethos implies: real work falsifies skill claims, and something
has to turn those falsifications back into skill edits. It is aware of
`plugins/claude-code/skills/` and edits them; the plugin itself carries
no self-improvement machinery, because a tool does not grade itself.

- **Harvest** runs at the end of a work cycle. It reads recorded
  retractions and PR review threads and files a ticket for each skill
  claim that turned out false, carrying the claim and the artifact that
  killed it.
- **Tune** runs against those open tickets. For each, it climbs the
  evidence ladder only as far as the claim requires, then amends the
  skill and closes the ticket citing what it found.

## The evidence ladder

The rungs are ordered by cost, and each answers a strictly different
class of question:

1. **Migration notes and skill guides.** Cheap, and authoritative for the
   **rename** class only.
2. **Source** — either the vendored Effect submodule or the installed
   `node_modules/effect/src`. Authoritative for **existence and
   signature**.
3. **A probe run from inside a package**, using the
   [scratchpad workspace](../modules/scratchpad.md) when one exists in
   the repo. The only rung that settles **semantics**.

One document sits between rungs 1 and 2 in this repo, named rung 1.5: the
vendored tree ships `SCHEMA.md` at the pin — upstream Schema
documentation versioned with the source rather than floating like a
website, so unlike the migration notes it describes the surface actually
installed. That makes it a cheap, version-exact diff oracle: when it
disagrees with a skill, the skill is usually what is wrong, but it is
still a document and does not outrank a declaration.

Rung 2 has two roots that can drift, so the tiebreak is: **the installed
source wins.** `node_modules` is what the code links against; the
vendored tree is what someone pinned last. Because exact-pin catalogs and
a re-pin folded into every catalog-bump commit keep the two in sync by
construction, the two agree in practice — the tiebreak still costs
nothing and catches the next divergence.

Rung 1 is deliberately not the last rung, because the migration notes are
prescriptive rather than exhaustive: they can be silent about a primitive
a port needs, and — the sharper failure — they can assert something the
source refutes in either direction, documenting a method with zero
occurrences anywhere in the tree, or listing a module as removed that is
alive and mapped elsewhere in the same corpus. A confident wrong answer
costs more than an absent one, because nothing prompts the reader to
climb further. So a positive claim in the notes about what a symbol *is
or does* is exactly as unsettled as their silence — an edit must cite the
highest rung that actually settles its claim.

## Probe preconditions

Encoded as skill preconditions because each was learned by being burned:

- **Probes run from the scratchpad workspace** in this repo, or from
  inside the package elsewhere — never from the harness's own private
  scratch directory, which has no `node_modules`. Every probe prints its
  resolved `effect` version, because a wrong resolution is otherwise
  indistinguishable from a right one.
- **A probe file must be inside the compilation program.** A package
  tsconfig whose `include` uses `${configDir}/*.ts` does not match
  subdirectories, so a probe placed in one silently leaves the program
  and false-passes its control.
- **The control assertion runs first.** A probe that cannot fail is worse
  than no probe.

## Recorded coupling: the vendored path

This plugin's agents and skills may assume the vendored tree exists once
the repo's reference repos are synced, since a submodule checkout starts
empty in a fresh clone, CI runner or new worktree. In a published
consumer's tree that path is absent, and a skill that cannot find its
evidence source must not fall back on memory — silent fallback is the
exact failure this ladder exists to prevent. The evidence-ladder skill
implements a resolution order instead: an explicit environment override,
then the vendored tree, then the installed `node_modules/effect/src`
gated on a resolved v4 version (refusing a v3 resolution rather than
reporting it), stopping loudly only when every root is absent. Rung 1
deliberately has no fallback: the npm package does not ship the migration
notes, and the skill says so instead of degrading silently.

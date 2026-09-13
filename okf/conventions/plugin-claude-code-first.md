---
type: Convention
title: Change the Claude Code plugin first, then port to Copilot
description: Author every skill, agent and hook change in plugins/claude-code/ and prove it there before copying and refactoring it into plugins/copilot/'s format, never the reverse.
status: stable
stale_after: "2027-03-13T00:00:00Z"
tags:
  - dx
sources:
  - id: plugins-claude-md
    resource: ../../plugins/CLAUDE.md
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 6d68948c1511202ac67232f2806e89ad236c9d5b71805a09dd08adeec23eb59c
---

# Change the Claude Code plugin first, then port to Copilot

Claude Code and Copilot have similar but divergent formats for
`SKILL.md` files and for hooks, so skill and agent content is maintained
in two versions. The team overwhelmingly uses Claude Code, so the
canonical flow is one-directional:

1. Make the change in `plugins/claude-code/` and prove it there (the bats
   suite, dogfooding).
2. Copy it into `plugins/copilot/` and refactor it into Copilot's format.

`plugins/claude-code/` is authoritative; `plugins/copilot/` is a port
that trails it. A change originating in the Copilot tree is a smell: it
means the two trees will diverge in content as well as in format, and
content divergence is the failure this ordering exists to prevent. The
`improve` skill (see
[the evidence-ladder convention](evidence-ladder.md)) and the plugin's
bats suite both target the Claude Code tree only — neither one is aware
of `plugins/copilot/` at all.

Never author content in `plugins/copilot/` and back-port it into
`plugins/claude-code/`.

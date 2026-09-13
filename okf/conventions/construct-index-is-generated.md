---
type: Convention
title: Never hand-edit the construct index — regenerate it
description: The construct-index tables under skills/effected-packages/references/constructs/ are generated output; edit construct-annotations.json and rerun the generator instead of touching a table directly.
status: stable
stale_after: "2027-03-13T00:00:00Z"
tags:
  - dx
sources:
  - id: generate-constructs-mts
    resource: ../../plugins/claude-code/scripts/generate-constructs.mts
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 1f999e057fdc20968baa18557122baa05bbc8db705fdc924a51e7ce1f0ffbc85
---

# Never hand-edit the construct index — regenerate it

The tables under
`plugins/claude-code/skills/effected-packages/references/constructs/<pkg>.md`
are generated output, joined from each package's api-extractor doc model
and the authored intent annotations in
[construct-annotations.json](../models/construct-annotations.md). Never
edit one of these tables by hand: the next regeneration silently
overwrites it, and a hand-edit that adds an intent string or a
cross-reference outside the annotations sidecar has nowhere durable to
live.

To change what the index says:

1. Build the target package if its doc model is missing or stale: `pnpm
   build --filter @effected/<pkg>`.
2. Edit the intent keywords or `implements` link in
   `plugins/claude-code/scripts/construct-annotations.json`.
3. Regenerate with bare Node:
   `node plugins/claude-code/scripts/generate-constructs.mts generate`.
4. Confirm coverage with `... check --require-intent`, which fails
   naming any Class, Function or Variable construct still missing an
   intent annotation.

`plugins/claude-code/__test__/construct-index.bats`'s drift test
regenerates the committed index into a temp directory and diffs it
against the committed one — a hand-edit that has drifted from what the
generator would produce fails that test rather than merging quietly.

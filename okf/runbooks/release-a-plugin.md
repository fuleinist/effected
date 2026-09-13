---
type: Runbook
title: Release a plugin
description: Cut a version for the Claude Code or Copilot plugin through its private tracking package's changeset, ending in a git tag and GitHub release with no npm publish.
status: stable
tags:
  - release
sources:
  - id: plugins-claude-md
    resource: ../../plugins/CLAUDE.md
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 5066d82a97bc40e5c41b23a13060e4424205aa8302429a4d75038ee0a1afcde7
---

# Release a plugin

## Trigger

A change under `plugins/claude-code/` or `plugins/copilot/` is ready to
ship as a new plugin version — a skill, agent or hook change, or the
Copilot port catching up.

## Steps

1. Add a changeset naming the tracking package directly:
   `@effected/claude-code-plugin` for the Claude Code plugin, or
   `@effected/copilot-plugin` for the Copilot plugin. A changeset naming
   any other package does nothing for either plugin — see
   [each plugin versions via its own private tracking package](../decisions/plugins-version-via-private-tracking-packages.md).
2. When the release runs, CI bumps the tracking package's `package.json`
   **and** the plugin manifest it drives in lockstep, through the
   `.changeset/config.json` `versionFiles` mapping (`plugin.json`'s
   `$.version` for both plugins).
3. CI cuts a git tag named `<tracking-package>@<version>` — for example
   `@effected/copilot-plugin@0.1.0` — and a GitHub release. Neither
   tracking package has a `publishConfig`, so **no npm publish** happens
   for either plugin, ever.
4. For the Claude Code plugin, the `spencerbeggs/bot` marketplace's
   sha-pinned `git-subdir` entry bumps automatically on release. For the
   Copilot plugin, the marketplace ref is **not** automated yet — bump it
   by hand in `spencerbeggs/bot`'s `.github/plugin/marketplace.json`
   after the tag lands.

## End state

The released plugin's tracking package and manifest carry the new
version, a git tag and GitHub release exist for it, no npm package was
published, and (for the Claude Code plugin) the marketplace pin already
points at the new sha; the Copilot marketplace pin needs the manual bump
in step 4.

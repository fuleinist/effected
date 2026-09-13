---
type: Module
title: copilot-plugin
description: An experimental GitHub Copilot port of the Claude Code plugin's skills, agents and session-start hook, trailing it downstream rather than an independent product.
status: stable
kind: plugin
resource: ../../plugins/copilot
tags:
  - architecture
  - dx
sources:
  - id: copilot-plugin-json
    resource: ../../plugins/copilot/plugin.json
  - id: copilot-package-json
    resource: ../../plugins/copilot/package.json
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: 538e5791aa05b7b5aecd022cf8d7370ca92dccf420dc03328e8f7e4b860df262
---

# copilot-plugin

## Overview

`plugins/copilot/` is an experimental GitHub Copilot plugin: a port of
the same skills, agents and session-start hook that
[claude-code-plugin](claude-code-plugin.md) ships, refactored into
Copilot's own formats (`*.agent.md` agents, a root `plugin.json`, a
`hooks.json` with a `sessionStart` entry). It exists because the team
wants to trial Copilot for effected development; it is a downstream port
of the Claude Code plugin, not an independent product, and nothing here
claims parity with it. Everything about skill content, the skill shape
and the evidence ladder is owned by the Claude Code tree — see
[Claude Code first, then port](../conventions/plugin-claude-code-first.md).

## Layout

```text
plugins/copilot/
  plugin.json          # manifest, at the directory root (not a dot-directory)
  package.json         # @effected/copilot-plugin (private, versioning only)
  hooks.json            # sessionStart -> hooks/session-start/orientation.sh
  skills/ agents/ hooks/
```

Copilot reads `plugin.json` at the plugin root rather than under a dot
directory — Claude Code and Copilot disagree on manifest placement by
upstream's own choice, and that asymmetry is not repaired.

## Versioning

`@effected/copilot-plugin` is the private tracking package that gives
changesets something to version for this plugin — see
[plugins version via private tracking packages](../decisions/plugins-version-via-private-tracking-packages.md).
It is `"private": true` with no `publishConfig`, so it never publishes to
npm regardless of changeset activity.

## Distribution

Ships from `spencerbeggs/bot`'s `.github/plugin/marketplace.json`, a
`github` source (`repo: spencerbeggs/effected`, `path: plugins/copilot`).
Unlike the Claude Code marketplace entry, this one's ref is bumped **by
hand** — there is no automation for the initial versions. The Copilot
plugin is experimental and for the team's own trial only, not
advertised or promoted.

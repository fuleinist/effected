---
type: Decision
title: No bin — the package is a library, not a CLI
description: schemastore ships no bin entry; it is a library consumed by a generator script the caller owns, not a command-line tool.
status: draft
sources:
  - id: package-json
    resource: ../../packages/schemastore/package.json
generated:
  by: "okfit/claude-code"
  at: 2026-09-13T05:33:04Z
  body_sha256: b3b9f6f49d448c8636b63eb2aa21afb5ec5cb87d6255aca1e1a134599dc80a6d
---

# No bin — the package is a library, not a CLI

## Context

A package that builds and validates artifacts is sometimes packaged as
a CLI a consumer invokes directly, rather than as a library a consumer's
own script imports. `@effected/schemastore` needed to pick one shape.

## Decision

The package ships no `bin` entry.[^package-json] It is a library
consumed by a generator script the caller owns, not a CLI.

## Alternatives rejected

**Ship a `bin` entry running `SchemaPipeline` over a config file.**
Rejected because the pipeline's inputs — the set of `SchemaTarget`s, the
gating policy, the contract-change policy — are naturally expressed as
TypeScript values a consumer's own script constructs, not as a
configuration file format this package would then have to own and
version. A CLI would also need its own argument-parsing and exit-code
contract layered over a package whose entire value is composability
through `R`, undermining the "plain statics, not a service" design of
`SchemaPipeline` itself.

## Consequences

The `packages/schemastore-cli/` directory on disk holds only build
residue (`dist/`, `node_modules/`) with no manifest, and is not read as
evidence that a CLI was ever shipped or is planned — it is an ignored
ghost, not a package under active development.

[^package-json]: `packages/schemastore/package.json` — no `bin` field.

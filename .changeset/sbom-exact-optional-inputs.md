---
"@effected/sbom": patch
---

## Bug Fixes

- `SbomMetadataSource.ComponentInput`'s optional fields (`version`, `license`, `description`, `type`) are now typed `?: T | undefined` instead of `?: T`. Under `exactOptionalPropertyTypes: true` a caller forwarding a statically optional value — the shape `@effected/workspaces` hands out for `WorkspacePackage.version` — was refused with TS2379 and had to reinvent a conditional spread at every call site. Explicit `undefined` was always a supported, meaningful input (the `version` doc comment says absence produces a component with no version and no purl version segment); the type now lets callers say it. Closes effected#664.
- Purely widening: accepts strictly more callers, breaks none, and needs no runtime change — `componentFor` already treated a missing key and an explicit `undefined` identically.

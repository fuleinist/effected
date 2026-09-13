---
"@effected/sbom": patch
---

## Bug Fixes

- Every optional field on the package's public input interfaces — `SbomMetadataSource.ComponentInput`, `SbomMetadataOptions` and `CopyrightYears`, `Sbom.SbomInput` and `SbomJsonOptions`, `SigstoreSignerOptions`, and `InTotoStatement.toJson`'s options — is now typed `?: T | undefined` instead of `?: T`. Under `exactOptionalPropertyTypes: true` a caller forwarding a statically optional value (the shape `@effected/workspaces` hands out for `WorkspacePackage.version`, or a Fulcio/Rekor URL read out of config) was refused with TS2379 and had to reinvent a conditional spread at every call site. Explicit `undefined` was always a supported, meaningful input; the type now lets callers say it. Closes #664.

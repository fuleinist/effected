---
"@effected/mcp": patch
---

### Fixes

#### `McpProcess.readUntilResponse` drops interleaved notifications from `seen`

`readUntilResponse` now skips JSON-RPC notifications (frames with `method` and no `id`) when building the `seen` array, so callers see only responses and error frames. Previously, a server that emitted a `notifications/resources/list_changed` between the handshake and the assertion would race the test's frame collection and break the assertion under CI load. Closes #1093.

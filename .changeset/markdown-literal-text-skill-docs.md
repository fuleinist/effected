---
"@effected/claude-code-plugin": patch
"@effected/copilot-plugin": patch
---

## Documentation

- The `effected-packages` markdown reference now teaches `Text.escapeStyle: "literal"`: a text node whose value the caller vouches is already safe emits verbatim, keeping only the escapes that protect block and table structure, which suits generated tables such as changeset dependency rows.

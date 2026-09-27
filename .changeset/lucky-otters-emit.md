---
"@effected/markdown": minor
---

## Features

### Literal text escaping

`Text` gains an optional `escapeStyle: "canonical" | "literal"` field. `Markdown.stringify` still escapes canonically by default — `~0.2.1` in a table cell emits as `\~0.2.1` — but a `Text` node carrying `escapeStyle: "literal"` opts out: the emitter writes `value` verbatim, dropping every escape aimed at inline syntax (`*`, `_`, `[`, `]`, `~`, `&`, `\`, the backtick, autolink-shaped text). That suits generated content such as a dependency table, where `~0.2.1`, `^1.0.0` and `@scope/pkg` should read as written instead of arriving backslash-escaped.

```ts
import { Markdown, Mdast } from "@effected/markdown";
import { Result } from "effect";

const cell = (value: string) => ({ type: "tableCell", children: [{ type: "text", value, escapeStyle: "literal" }] });
const tree = Mdast.fromMdastResult({
  type: "root",
  children: [{ type: "table", children: [{ type: "tableRow", children: [cell("Range"), cell("~0.2.1 | ^1.0.0")] }] }],
});
if (Result.isSuccess(tree)) {
  console.log(Result.getOrThrow(Markdown.stringifyResult(tree.success)));
  // | Range | ~0.2.1 \| ^1.0.0 |
  // | --- | --- |
}
```

Escapes that protect the surrounding block still apply even in literal mode — a table cell's `|`, a newline in a cell or heading, a heading's closing `#` run, line-start block openers, and `{`/`<` in a tree carrying MDX nodes — since dropping those would corrupt the document rather than add formatting. A literal value that itself parses as markdown does not round-trip (`*a*` emits verbatim and re-parses as emphasis); keeping the value free of inline syntax is the caller's promise, not something the emitter checks.

`Mdast.fromMdast` admits `escapeStyle` on a `text` node — the one fidelity field a plain mdast tree can carry in, since it is an instruction to the emitter rather than a record of source spelling — and `Mdast.toMdast` projects it back out when set. The opt-out is additive: a tree that never sets the field serializes byte-identically to the existing canonical form.

---
"@effected/schemastore": minor
---

## Features

- `CanonicalJson.equals(left, right)` — parsed-content equality with the serializer's own semantics, exported so consumers never re-spell the deep-equal walk: object key order is a serialization detail and never decides, array element order is data and always does, primitives compare exactly (`NaN` never equals, JSON has no `NaN`), and an identical reference short-circuits equal. Values the serializer refuses — non-plain objects, `undefined`, functions, symbols, `bigint`s — have no canonical bytes, so distinct such values compare unequal (the conservative direction), and nesting past a generous stack guard (8× the serializer's 256-level cap) answers unequal rather than overflowing. Closes #718.

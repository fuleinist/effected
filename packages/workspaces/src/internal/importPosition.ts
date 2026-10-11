// Whether an `import("x")` call sits in a type position — `typeof import("x")`,
// an annotation, a type alias right-hand side, a generic argument — where the
// compiler erases it, or in a value position where it loads at runtime.
//
// Deliberately NOT a parser, like the lexer it reads: it works on the code
// view (comments and literal contents blanked) and resolves the one question
// that decides erasure, which is the construct enclosing the call. A single
// token before `import` is not enough: `:` opens a type annotation but also
// separates an object literal's property value and a ternary's else branch,
// `=` starts a type alias's right-hand side but also an initializer, and
// `=>` returns a function type's result but also an arrow function's body. So
// each ambiguous token is resolved by what encloses it — the statement
// keyword, the opener of the group it sits in, the signature it belongs to —
// walking backward and skipping balanced groups, until a decisive token.
//
// The scan errs toward runtime: an unmatched bracket, a statement boundary or
// the file start reads as value, so a shape it cannot place is reported, not
// skipped. Documented misreads: a semicolon-free expression statement that
// directly follows a type alias and does not begin with an identifier
// (`type A = 1` then `(cond ? import("x") : y)`) reads as the alias's
// right-hand side, and a parenthesized true branch after a bare identifier
// at statement start (`a ? (b) : import("x")`) reads as an optional method.

import { isIdentifierChar, wordEndingAt } from "./sourceText.js";

const SPACE = /\s/;

/**
 * Keywords that place the scan in value code: the first one a backward walk
 * meets ends it on the runtime side.
 */
const VALUE_KEYWORDS = new Set([
	"const",
	"let",
	"var",
	"using",
	"class",
	"function",
	"return",
	"await",
	"yield",
	"new",
	"delete",
	"void",
	"throw",
	"case",
	"default",
	"if",
	"while",
	"for",
	"switch",
	"catch",
	"do",
	"else",
	"try",
	"finally",
	"enum",
	"namespace",
	"module",
	"of",
	"in",
	"instanceof",
	"this",
	"super",
	"async",
	"export",
]);

/** Keywords a type (and nothing at runtime) can follow directly. */
const TYPE_OPERATORS = new Set([
	"typeof",
	"keyof",
	"infer",
	"readonly",
	"unique",
	"as",
	"satisfies",
	"is",
	"implements",
]);

/** Modifiers that precede a member or binding name whose `:` is then an annotation. */
const MEMBER_MODIFIERS = new Set([
	"const",
	"let",
	"var",
	"using",
	"readonly",
	"public",
	"private",
	"protected",
	"static",
	"declare",
	"abstract",
	"override",
	"accessor",
]);

/** Keywords before a method name that make its parenthesized list a signature, not a call. */
const METHOD_PREFIXES = new Set([
	"function",
	"async",
	"get",
	"set",
	"static",
	"public",
	"private",
	"protected",
	"abstract",
	"override",
	"readonly",
	"declare",
	"export",
]);

/** The characters that complete a comparison or compound assignment when they precede `=`. */
const BEFORE_EQUALS = "=!<>+-*/%&|^";

const OPENER: Readonly<Record<string, string>> = { ")": "(", "]": "[", "}": "{" };

/** The last non-space offset at or before `j`; `-1` when there is none. */
const back = (code: string, j: number): number => {
	let k = j;
	while (k >= 0 && SPACE.test(code[k] ?? "")) k--;
	return k;
};

/** The start of the identifier (or number) ending at `end`. */
const wordStart = (code: string, end: number): number => {
	let start = end;
	while (start >= 0 && isIdentifierChar(code[start])) start--;
	return start + 1;
};

const isQuote = (char: string): boolean => char === '"' || char === "'" || char === "`";

/** The offset of the opening quote of the literal closing at `close`, or `-1`. */
const literalStart = (code: string, close: number): number => code.lastIndexOf(code[close] ?? "", close - 1);

/** The opener matching the `)`, `]` or `}` at `close`, counting its own kind only; `-1` when unmatched. */
const matching = (code: string, close: number): number => {
	const closer = code[close] ?? "";
	const opener = OPENER[closer];
	if (opener === undefined) return -1;
	let depth = 0;
	for (let j = close; j >= 0; j--) {
		const char = code[j];
		if (char === closer) depth++;
		else if (char === opener && --depth === 0) return j;
	}
	return -1;
};

/** The `<` matching the `>` at `close`, or `-1`; gives up at a statement boundary and steps over `=>`. */
const matchingAngle = (code: string, close: number): number => {
	let depth = 0;
	for (let j = close; j >= 0; j--) {
		const char = code[j];
		if (char === ">") {
			if (code[j - 1] === "=") {
				j--;
				continue;
			}
			depth++;
		} else if (char === "<") {
			if (--depth === 0) return j;
		} else if (char === ";" || char === "{" || char === "}") return -1;
	}
	return -1;
};

/** Whether the `=` at `j` is the plain operator: not `==`, `!=`, `<=`, `>=` or a compound assignment. */
const isPlainEquals = (code: string, j: number): boolean =>
	!BEFORE_EQUALS.includes(code[j - 1] ?? "") && code[j + 1] !== "=";

/** Whether the `|` or `&` at `j` is a type operator: not `||`, `&&`, `|=` or `&=`. */
const isTypeJoin = (code: string, j: number): boolean => {
	const char = code[j] ?? "";
	return code[j - 1] !== char && code[j + 1] !== char && code[j + 1] !== "=";
};

/**
 * Whether the word at `start..end` is the declaration keyword (`type X`,
 * `interface X`, `declare const`): not a member access, and followed by a
 * name. A variable or property named `type` is not.
 */
const isDeclarationKeyword = (code: string, start: number, end: number): boolean => {
	if (code[back(code, start - 1)] === ".") return false;
	let n = end + 1;
	while (n < code.length && SPACE.test(code[n] ?? "")) n++;
	return isIdentifierChar(code[n]);
};

/** The unmatched `(`, `[` or `{` enclosing `from`, skipping balanced groups and crossing `;`; `-1` at top level. */
const enclosingOpener = (code: string, from: number): number => {
	let j = from;
	while (j >= 0) {
		const char = code[j] ?? "";
		if (char === "(" || char === "[" || char === "{") return j;
		if (char === ")" || char === "]" || char === "}") {
			const open = matching(code, j);
			if (open < 0) return -1;
			j = open - 1;
			continue;
		}
		j--;
	}
	return -1;
};

/** Whether `[` at `open` .. `]` at `close` holds a `:` or an `in` at its own depth: an index signature or a mapped type. */
const isSignatureBracket = (code: string, open: number, close: number): boolean => {
	let depth = 0;
	for (let j = open + 1; j < close; j++) {
		const char = code[j] ?? "";
		if (char === "(" || char === "[" || char === "{") depth++;
		else if (char === ")" || char === "]" || char === "}") depth--;
		else if (depth === 0) {
			if (char === ":") return true;
			if (char === "n" && code[j - 1] === "i" && !isIdentifierChar(code[j - 2]) && !isIdentifierChar(code[j + 1]))
				return true;
		}
	}
	return false;
};

/** Whether the token ending at `end` closes a decorator expression (`@dec`, `@dec()`, `@ns.dec()`). */
const isDecorator = (code: string, end: number): boolean => {
	let j = end;
	for (;;) {
		if (code[j] === ")") {
			const open = matching(code, j);
			if (open < 0) return false;
			j = back(code, open - 1);
		}
		if (!isIdentifierChar(code[j])) return false;
		const start = wordStart(code, j);
		const before = back(code, start - 1);
		if (code[before] === "@") return true;
		if (code[before] !== ".") return false;
		j = back(code, before - 1);
	}
};

/** Whether the `extends` whose word ends just after `before` belongs to a class declaration: its clause is a value. */
const isClassHeritage = (code: string, before: number): boolean => {
	let j = back(code, before);
	if (code[j] === ">") {
		const open = matchingAngle(code, j);
		if (open < 0) return false;
		j = back(code, open - 1);
	}
	if (!isIdentifierChar(code[j])) return false;
	const word = code.slice(wordStart(code, j), j + 1);
	if (word === "class") return true;
	return wordEndingAt(code, wordStart(code, j) - 1) === "class";
};

type Statement = "type" | "class" | "value";

/**
 * The keyword governing the statement the identifier ending at `from` is
 * part of: `type`, `interface` or `declare` is type, `class` is a class
 * body, and any value keyword, a statement boundary or the file start is
 * value.
 */
const statementOf = (code: string, from: number): Statement => {
	let j = from;
	while (j >= 0) {
		j = back(code, j);
		if (j < 0) return "value";
		const char = code[j] ?? "";
		if (char === ";" || char === "{" || char === "=" || char === ":" || char === "(" || char === "[" || char === "?")
			return "value";
		if (char === ")" || char === "]" || char === "}") {
			const open = matching(code, j);
			if (open < 0) return "value";
			j = open - 1;
			continue;
		}
		if (char === ">") {
			if (code[j - 1] === "=") return "value";
			const open = matchingAngle(code, j);
			if (open < 0) return "value";
			j = open - 1;
			continue;
		}
		if (isIdentifierChar(char)) {
			const start = wordStart(code, j);
			const word = code.slice(start, j + 1);
			if (code[back(code, start - 1)] === ".") {
				j = start - 1;
				continue;
			}
			if ((word === "type" || word === "interface" || word === "declare") && isDeclarationKeyword(code, start, j))
				return "type";
			if (word === "class") return "class";
			if (VALUE_KEYWORDS.has(word)) return "value";
			j = start - 1;
			continue;
		}
		j--;
	}
	return "value";
};

/**
 * Whether the plain `=` whose left-hand side ends at `from` opens a type
 * alias (`type T = `) or a type parameter default (`<T = `), as opposed to
 * an initializer, an assignment or a default value.
 */
const isAliasEquals = (code: string, from: number): boolean => {
	let j = from;
	while (j >= 0) {
		j = back(code, j);
		if (j < 0) return false;
		const char = code[j] ?? "";
		if (char === "<") return true;
		if (char === ")" || char === "]" || char === "}") {
			const open = matching(code, j);
			if (open < 0) return false;
			j = open - 1;
			continue;
		}
		if (char === ">") {
			if (code[j - 1] === "=") return false;
			const open = matchingAngle(code, j);
			if (open < 0) return false;
			j = open - 1;
			continue;
		}
		if (char === ":" || char === ";" || char === "{" || char === "(" || char === "," || char === "[" || char === "=")
			return false;
		if (isQuote(char)) return false;
		if (isIdentifierChar(char)) {
			const start = wordStart(code, j);
			const word = code.slice(start, j + 1);
			if (code[back(code, start - 1)] === ".") {
				j = start - 1;
				continue;
			}
			if (word === "type" && isDeclarationKeyword(code, start, j)) return true;
			if (VALUE_KEYWORDS.has(word)) return false;
			j = start - 1;
			continue;
		}
		j--;
	}
	return false;
};

/**
 * Whether the `=>` whose left-hand side ends at `from` returns a function
 * type's result (type) or opens an arrow function's body (value): decided by
 * what precedes the parameter list, past any return-type annotation.
 */
const isTypeArrow = (code: string, from: number): boolean => {
	let j = from;
	for (;;) {
		j = back(code, j);
		if (j < 0) return false;
		const char = code[j] ?? "";
		if (char === ":") {
			const close = back(code, j - 1);
			if (code[close] !== ")") return false;
			const open = matching(code, close);
			return open >= 0 && isTypeSignature(code, back(code, open - 1));
		}
		if (char === ")" || char === "]" || char === "}") {
			const open = matching(code, j);
			if (open < 0) return false;
			const before = back(code, open - 1);
			if (char === ")" && code[before] !== ":") return isTypeSignature(code, before);
			j = open - 1;
			continue;
		}
		if (char === ">") {
			if (code[j - 1] === "=") return false;
			const open = matchingAngle(code, j);
			if (open < 0) return false;
			j = open - 1;
			continue;
		}
		if (char === ";" || char === "{" || char === "=" || char === "," || char === "(" || char === "[") return false;
		if (isQuote(char)) return false;
		j = isIdentifierChar(char) ? wordStart(code, j) - 1 : j - 1;
	}
};

/** Whether the parameter list whose `(` follows the token at `from` belongs to a function type rather than an arrow function. */
const isTypeSignature = (code: string, from: number): boolean => {
	let j = from;
	if (code[j] === ">") {
		if (code[j - 1] === "=") return isTypeArrow(code, j - 2);
		const open = matchingAngle(code, j);
		if (open < 0) return false;
		j = back(code, open - 1);
	}
	if (j < 0) return false;
	const char = code[j] ?? "";
	if (char === "=") return isPlainEquals(code, j) && isAliasEquals(code, j - 1);
	if (char === ":") return isAnnotationColon(code, j);
	if (char === "|" || char === "&") return isTypeJoin(code, j);
	if (char === "<") return true;
	if (char === "?") return isTypeContext(code, j - 1);
	if (char === ",") {
		const open = enclosingOpener(code, j - 1);
		return open >= 0 && isTypeGroup(code, open);
	}
	if (char === "(" || char === "[") return isTypeGroup(code, j);
	if (isIdentifierChar(char)) {
		const start = wordStart(code, j);
		const word = code.slice(start, j + 1);
		if (code[back(code, start - 1)] === ".") return false;
		if (word === "extends") return !isClassHeritage(code, start - 1);
		if (word === "new" || word === "abstract") return true;
		return TYPE_OPERATORS.has(word);
	}
	return false;
};

/**
 * Whether the group opened by the `(`, `[`, `{` or `<` at `open` sits in a
 * type: a parenthesized type, a tuple, a type literal or a generic argument
 * list, as opposed to a call, an array, an object literal or a block.
 */
const isTypeGroup = (code: string, open: number): boolean => {
	const opener = code[open] ?? "";
	if (opener === "<") return true;
	if (opener === "{") return isTypeMemberList(code, back(code, open - 1));
	const v = back(code, open - 1);
	if (v < 0) return false;
	const char = code[v] ?? "";
	if (char === ">") {
		if (code[v - 1] === "=") return isTypeArrow(code, v - 2);
		const angle = matchingAngle(code, v);
		if (angle < 0 || opener === "(") return false;
		return isTypeContext(code, back(code, angle - 1));
	}
	if (char === "=") return isPlainEquals(code, v) && isAliasEquals(code, v - 1);
	if (char === ":") return isAnnotationColon(code, v);
	if (char === "|" || char === "&") return isTypeJoin(code, v);
	if (char === "<") return true;
	if (char === "?") return isTypeContext(code, v - 1);
	if (char === ",") {
		const enclosing = enclosingOpener(code, v - 1);
		return enclosing >= 0 && isTypeGroup(code, enclosing);
	}
	if (char === "(" || char === "[") return isTypeGroup(code, v);
	if (char === "." && code[v - 1] === "." && code[v - 2] === ".") return isTypeContext(code, v - 3);
	if (isIdentifierChar(char)) {
		const start = wordStart(code, v);
		const word = code.slice(start, v + 1);
		if (code[back(code, start - 1)] === ".") return false;
		if (word === "extends") return !isClassHeritage(code, start - 1);
		if (TYPE_OPERATORS.has(word) && word !== "typeof") return true;
		if (VALUE_KEYWORDS.has(word) || opener === "(") return false;
		return isTypeContext(code, start - 1);
	}
	return false;
};

/**
 * Whether the `{` preceded by the token at `v` opens a member list whose
 * `name:` entries are annotations — an interface, class or type-literal
 * body — rather than an object literal or a block.
 */
const isTypeMemberList = (code: string, v: number): boolean => {
	if (v < 0) return false;
	const char = code[v] ?? "";
	if (char === ">") {
		if (code[v - 1] === "=") return isTypeArrow(code, v - 2);
		const open = matchingAngle(code, v);
		return open >= 0 && isTypeMemberList(code, back(code, open - 1));
	}
	if (char === "=") return isPlainEquals(code, v) && isAliasEquals(code, v - 1);
	if (char === ":") return isAnnotationColon(code, v);
	if (char === "|" || char === "&") return isTypeJoin(code, v);
	if (char === "<") return true;
	if (char === "?") return isTypeContext(code, v - 1);
	if (char === ",") {
		const open = enclosingOpener(code, v - 1);
		return open >= 0 && isTypeGroup(code, open);
	}
	if (char === "(" || char === "[") return isTypeGroup(code, v);
	if (isIdentifierChar(char)) {
		const start = wordStart(code, v);
		const word = code.slice(start, v + 1);
		if (code[back(code, start - 1)] === ".") return false;
		if (TYPE_OPERATORS.has(word) && word !== "typeof") return true;
		if (VALUE_KEYWORDS.has(word) && word !== "class") return false;
		return statementOf(code, v) !== "value";
	}
	return false;
};

/**
 * Whether the member or binding name preceded by the token at `u` carries
 * an annotation — a parameter, a variable, an interface, class, tuple or
 * type-literal member — rather than an object-literal key, a ternary branch,
 * a label or a `case`.
 */
const isAnnotatedName = (code: string, u: number): boolean => {
	if (u < 0) return false;
	const char = code[u] ?? "";
	if (char === "?") return isTypeContext(code, u - 1);
	if (char === "(" || char === "[" || char === "<") return true;
	if (char === "{") return isTypeMemberList(code, back(code, u - 1));
	if (char === "," || char === ";" || char === "}") {
		const open = enclosingOpener(code, char === "}" ? u : u - 1);
		return open >= 0 && (code[open] !== "{" || isTypeMemberList(code, back(code, open - 1)));
	}
	if (char === ")") return isDecorator(code, u);
	if (isIdentifierChar(char)) {
		if (isDecorator(code, u)) return true;
		return MEMBER_MODIFIERS.has(code.slice(wordStart(code, u), u + 1));
	}
	return false;
};

/**
 * Whether the parenthesized list whose `(` follows the token at `w` is a
 * signature — a function, method or arrow parameter list, whose following
 * `:` is a return type — rather than a call expression in a ternary.
 */
const isSignatureParens = (code: string, w: number): boolean => {
	if (w < 0) return false;
	let j = w;
	if (code[j] === ">") {
		if (code[j - 1] === "=") return false;
		const open = matchingAngle(code, j);
		if (open < 0) return false;
		j = back(code, open - 1);
		if (j < 0) return false;
	}
	const char = code[j] ?? "";
	if (char === "=") return isPlainEquals(code, j);
	if (char === ":" || char === "," || char === "(" || char === "[") return true;
	if (char === ")") return isDecorator(code, j);
	if (char === "?") {
		const name = back(code, j - 1);
		return isIdentifierChar(code[name]) && isMemberStart(code, back(code, wordStart(code, name) - 1));
	}
	if (char === "]") {
		const open = matching(code, j);
		return open >= 0 && isMemberStart(code, back(code, open - 1));
	}
	if (isQuote(char)) {
		const open = literalStart(code, j);
		return open >= 0 && isMemberStart(code, back(code, open - 1));
	}
	if (isIdentifierChar(char)) {
		const start = wordStart(code, j);
		const word = code.slice(start, j + 1);
		if (word === "function" || word === "async") return true;
		if (VALUE_KEYWORDS.has(word)) return false;
		const x = back(code, start - 1);
		if (code[x] === "*") return isMemberStart(code, back(code, x - 1));
		return isMemberStart(code, x);
	}
	return false;
};

/** Whether the token at `x` can precede a member or function name: a body boundary, a modifier or a decorator. */
const isMemberStart = (code: string, x: number): boolean => {
	if (x < 0) return false;
	const char = code[x] ?? "";
	if (char === "{" || char === ";" || char === "}" || char === ",") return true;
	if (char === ")") return isDecorator(code, x);
	if (!isIdentifierChar(char)) return false;
	if (isDecorator(code, x)) return true;
	return METHOD_PREFIXES.has(code.slice(wordStart(code, x), x + 1));
};

/**
 * Whether the `:` at `c` opens a type annotation (`name: T`, `(): T`,
 * `[k: string]: T`, `{ a }: T`) rather than separating an object-literal
 * property, a ternary's branches, a label or a `case`.
 */
const isAnnotationColon = (code: string, c: number): boolean => {
	let j = back(code, c - 1);
	if (j < 0) return false;
	if (code[j] === "?") j = back(code, j - 1);
	const char = code[j] ?? "";
	if (char === ")") {
		const open = matching(code, j);
		return open >= 0 && isSignatureParens(code, back(code, open - 1));
	}
	if (char === "]") {
		const open = matching(code, j);
		if (open < 0) return false;
		return isSignatureBracket(code, open, j) || isAnnotatedName(code, back(code, open - 1));
	}
	if (char === "}") {
		const open = matching(code, j);
		if (open < 0) return false;
		const b = back(code, open - 1);
		if (code[b] === "(" || code[b] === ",") return true;
		return isIdentifierChar(code[b]) && MEMBER_MODIFIERS.has(code.slice(wordStart(code, b), b + 1));
	}
	if (isQuote(char)) {
		const open = literalStart(code, j);
		return open >= 0 && isAnnotatedName(code, back(code, open - 1));
	}
	if (isIdentifierChar(char)) return isAnnotatedName(code, back(code, wordStart(code, j) - 1));
	return false;
};

/**
 * Whether the position after the token at `from` is inside a type: a
 * backward walk, skipping balanced groups, to the first decisive token — a
 * `:`, `=`, `=>`, `|`, `&`, a keyword, a `;`, or the opener of the group the
 * position sits in, which is decided as a group so a walk inside a function
 * body never reaches the signature in front of it.
 */
const isTypeContext = (code: string, from: number): boolean => {
	let j = from;
	while (j >= 0) {
		j = back(code, j);
		if (j < 0) return false;
		const char = code[j] ?? "";
		if (char === ";") return false;
		// An unmatched opener is the group this position sits in: a call, an
		// array, a block or a type group decides, never the signature in front.
		if (char === "(" || char === "[" || char === "{") return isTypeGroup(code, j);
		if (char === ")" || char === "]" || char === "}") {
			const open = matching(code, j);
			if (open < 0) return false;
			j = open - 1;
			continue;
		}
		if (char === ":") return isAnnotationColon(code, j);
		if (char === "=") return isPlainEquals(code, j) && isAliasEquals(code, j - 1);
		if (char === ">" && code[j - 1] === "=") return isTypeArrow(code, j - 2);
		if (char === "|" || char === "&") return isTypeJoin(code, j);
		if (isQuote(char)) {
			j = literalStart(code, j) - 1;
			continue;
		}
		if (isIdentifierChar(char)) {
			const start = wordStart(code, j);
			const word = code.slice(start, j + 1);
			if (code[back(code, start - 1)] === ".") {
				j = start - 1;
				continue;
			}
			if (word === "extends") return !isClassHeritage(code, start - 1);
			if (word === "keyof" || word === "infer" || word === "readonly" || word === "implements") return true;
			if ((word === "type" || word === "interface" || word === "declare") && isDeclarationKeyword(code, start, j))
				return true;
			if (VALUE_KEYWORDS.has(word)) return false;
			j = start - 1;
			continue;
		}
		j--;
	}
	return false;
};

/** Whether the `in` ending at `end` is a mapped type's (`{ [K in ...]`) rather than the operator or a `for...in`. */
const isMappedIn = (code: string, end: number): boolean => {
	const open = enclosingOpener(code, wordStart(code, end) - 1);
	if (open < 0 || code[open] !== "[") return false;
	const b = back(code, open - 1);
	return code[b] === "{" || code[b] === "+" || code[b] === "-" || wordEndingAt(code, b) === "readonly";
};

/**
 * Whether the `import(` call whose `(` sits at `open` is in a type position,
 * where the compiler erases it: `typeof import("x")`, an annotation, a
 * union or intersection member, a generic argument, an `extends` heritage or
 * bound, a type alias right-hand side, a function type's return, a tuple or
 * type-literal member. A runtime dynamic import — `await import("x")`, an
 * initializer, an object property value, a ternary branch, a call argument
 * — and every `require()` are not.
 */
export const isTypePositionImport = (code: string, open: number): boolean => {
	const calleeEnd = back(code, open - 1);
	const calleeStart = wordStart(code, calleeEnd);
	if (code.slice(calleeStart, calleeEnd + 1) !== "import") return false;
	const j = back(code, calleeStart - 1);
	if (j < 0) return false;
	const char = code[j] ?? "";
	if (char === "<") return true;
	if (char === "|" || char === "&") return isTypeJoin(code, j);
	if (char === "?") return code[j - 1] !== "?" && isTypeContext(code, j - 1);
	if (char === "(" || char === "[") return isTypeGroup(code, j);
	if (char === ".") return code[j - 1] === "." && code[j - 2] === "." && isTypeContext(code, j - 3);
	if (char === "!" || char === "{") return false;
	if (isIdentifierChar(char)) {
		const start = wordStart(code, j);
		const word = code.slice(start, j + 1);
		if (code[back(code, start - 1)] === ".") return false;
		if (TYPE_OPERATORS.has(word)) return true;
		if (word === "extends") return !isClassHeritage(code, start - 1);
		if (word === "in") return isMappedIn(code, j);
		if (VALUE_KEYWORDS.has(word)) return false;
	}
	return isTypeContext(code, j);
};

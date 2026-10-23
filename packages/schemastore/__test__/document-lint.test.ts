import { assert, describe, it } from "@effect/vitest";
import { Effect, Schema } from "effect";
import type { DocumentLintFinding } from "../src/index.js";
import { DocumentLint, StoreDocument } from "../src/index.js";

const document = (root: Record<string, unknown>, defs: Record<string, unknown> = {}): StoreDocument =>
	StoreDocument.make({
		$schema: "http://json-schema.org/draft-07/schema#",
		$id: "https://example.com/x.schema.json",
		root,
		defs,
	});

const checks = (findings: ReadonlyArray<DocumentLintFinding>): ReadonlyArray<string> =>
	findings.map((finding) => finding.check);

describe("DocumentLint", () => {
	describe("UnresolvedRef", () => {
		it("fires when a $ref names a missing definition", () => {
			const findings = DocumentLint.lint(
				document({ type: "object", properties: { a: { $ref: "#/$defs/Missing" } } }, { Present: { type: "string" } }),
			);
			assert.deepStrictEqual(checks(findings), ["UnresolvedRef"]);
			assert.strictEqual(findings[0]?.path, "/properties/a/$ref");
		});

		it("fires on a surviving #/definitions pointer", () => {
			const findings = DocumentLint.lint(
				document({ properties: { a: { $ref: "#/definitions/Thing" } } }, { Thing: { type: "string" } }),
			);
			assert.deepStrictEqual(checks(findings), ["UnresolvedRef"]);
		});

		it("passes clean on resolvable refs, subpath refs and # self-refs", () => {
			const findings = DocumentLint.lint(
				document(
					{
						properties: {
							a: { $ref: "#/$defs/Thing" },
							b: { $ref: "#/$defs/Thing/properties/inner" },
							self: { $ref: "#" },
						},
					},
					{ Thing: { type: "object", properties: { inner: { type: "string" } } } },
				),
			);
			assert.deepStrictEqual(findings, []);
		});

		// Core emits $ref tokens as encodeURI(escapeToken(name)), so a class
		// identifier with a space reaches the document percent-encoded while
		// the $defs key stays literal (#731). The lint must decode the token
		// the same way assembly and the engine do.
		it("resolves a percent-encoded $ref naming a defs key with a space", () => {
			const findings = DocumentLint.lint(
				document(
					{ properties: { a: { $ref: "#/$defs/My%20Foo" }, b: { $ref: "#/$defs/My%20Foo/type" } } },
					{ "My Foo": { type: "string" } },
				),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("resolves pointer-escaped (~1/~0) $ref names", () => {
			const findings = DocumentLint.lint(
				document(
					{ properties: { a: { $ref: "#/$defs/a~1b" }, b: { $ref: "#/$defs/c~0d" } } },
					{ "a/b": { type: "string" }, "c~d": { type: "string" } },
				),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("still fires when the decoded name is absent from the pool", () => {
			const findings = DocumentLint.lint(
				document({ properties: { a: { $ref: "#/$defs/My%20Missing" } } }, { "My Foo": { type: "string" } }),
			);
			assert.deepStrictEqual(checks(findings), ["UnresolvedRef"]);
		});

		// A hand-assembled or read-back document may carry a $ref that is not a
		// well-formed URI fragment (a raw space, non-ASCII, `#`, `|`, `{}`).
		// ajv resolves those — it percent-decodes the token leniently and
		// unescapes it — so the lint must too, or it is stricter than the gate
		// it tracks.
		it("resolves an unencoded $ref the engine resolves", () => {
			const findings = DocumentLint.lint(
				document(
					{
						properties: {
							a: { $ref: "#/$defs/Café" },
							b: { $ref: "#/$defs/My Foo" },
							c: { $ref: "#/$defs/a#b" },
							d: { $ref: "#/$defs/A|B" },
							e: { $ref: "#/$defs/A{B}/type" },
							// ajv splits before it percent-decodes, so `%2F` stays inside the token.
							f: { $ref: "#/$defs/a%2Fb" },
						},
					},
					{
						Café: { type: "string" },
						"My Foo": { type: "string" },
						"a#b": { type: "string" },
						"A|B": { type: "string" },
						"A{B}": { type: "string" },
						"a/b": { type: "string" },
					},
				),
			);
			assert.deepStrictEqual(findings, []);
		});

		// The one unencoded shape ajv refuses: malformed percent-encoding.
		it("fires on malformed percent-encoding, even if a literal key matches", () => {
			const findings = DocumentLint.lint(
				document({ properties: { a: { $ref: "#/$defs/100%" } } }, { "100%": { type: "string" } }),
			);
			assert.deepStrictEqual(checks(findings), ["UnresolvedRef"]);
		});

		it("checks refs inside the $defs pool too", () => {
			const findings = DocumentLint.lint(document({ type: "object" }, { A: { $ref: "#/$defs/Nope" } }));
			assert.deepStrictEqual(checks(findings), ["UnresolvedRef"]);
			assert.strictEqual(findings[0]?.path, "/$defs/A/$ref");
		});
	});

	describe("UnknownKeyword", () => {
		it("fires on a keyword outside Draft-07 and the declared families", () => {
			const findings = DocumentLint.lint(document({ type: "object", unevaluatedProperties: false }));
			assert.deepStrictEqual(checks(findings), ["UnknownKeyword"]);
			assert.strictEqual(findings[0]?.path, "/unevaluatedProperties");
		});

		it("does NOT fire on a property NAMED like a keyword-lookalike (keyword-position awareness)", () => {
			const findings = DocumentLint.lint(
				document({
					type: "object",
					properties: { unevaluatedProperties: { type: "string" }, "x-custom-thing": { type: "number" } },
				}),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("does not descend into data positions (enum, const, default, examples)", () => {
			const findings = DocumentLint.lint(
				document({
					type: "string",
					enum: [{ bogusKeyword: 1 }],
					const: { anotherBogus: 2 },
					default: { yetMore: 3 },
					examples: [{ andMore: 4 }],
				}),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("allows every declared non-standard family", () => {
			const findings = DocumentLint.lint(
				document({
					type: "object",
					markdownDescription: "**doc**",
					allowTrailingCommas: true,
					defaultSnippets: [],
					enumDescriptions: [],
					markdownEnumDescriptions: [],
					"x-taplo": { hidden: true },
					"x-taplo-info": {},
					"x-tombi-toml-version": "1.0.0",
					"x-tombi-table-keys-order": "ascending",
					"x-intellij-language-injection": "SQL",
					"x-ai-hint": "h",
				}),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("fires inside nested schema positions (items, oneOf, dependencies)", () => {
			const findings = DocumentLint.lint(
				document({
					type: "object",
					dependencies: { a: { bogus: 1 }, b: ["c"] },
					properties: { list: { type: "array", items: [{ oneOf: [{ nope: true }] }] } },
				}),
			);
			// Both findings, pinned by PATH: the count alone cannot tell a
			// walk that reached both nested positions from one that fired
			// twice in the same place.
			assert.deepStrictEqual(
				findings.map((finding) => [finding.check, finding.path]).sort((a, b) => (a[1] ?? "").localeCompare(b[1] ?? "")),
				[
					["UnknownKeyword", "/dependencies/a/bogus"],
					["UnknownKeyword", "/properties/list/items/0/oneOf/0/nope"],
				],
			);
		});
	});

	describe("DescriptionWithoutUrl", () => {
		it("advises when the root description lacks a trailing docs URL", () => {
			const findings = DocumentLint.lint(document({ type: "object", description: "A config file" }));
			assert.deepStrictEqual(checks(findings), ["DescriptionWithoutUrl"]);
			assert.strictEqual(findings[0]?.severity, "advisory");
		});

		it("passes clean when the description ends with a URL line", () => {
			const findings = DocumentLint.lint(
				document({ type: "object", description: "A config file\nhttps://example.com/docs" }),
			);
			assert.deepStrictEqual(findings, []);
		});

		// Assembly places a bare-$ref root's annotations on the $defs entry
		// (#624), so the advisory must read the description from there too.
		it("advises on the $defs entry a bare $ref root names, at the entry's path", () => {
			const findings = DocumentLint.lint(
				StoreDocument.draft07({
					$id: "https://example.com/x.schema.json",
					root: { $ref: "#/$defs/X~1Y" },
					defs: { "X/Y": { type: "object", description: "A config file" } },
				}),
			);
			assert.deepStrictEqual(checks(findings), ["DescriptionWithoutUrl"]);
			assert.strictEqual(findings[0]?.path, "/$defs/X~1Y/description");
		});

		it("passes clean when the $defs entry a bare $ref root names ends with a URL line", () => {
			const findings = DocumentLint.lint(
				StoreDocument.draft07({
					$id: "https://example.com/x.schema.json",
					root: { $ref: "#/$defs/X" },
					defs: { X: { type: "object", description: "A config file\nhttps://example.com/docs" } },
				}),
			);
			assert.deepStrictEqual(findings, []);
		});

		it("stays silent when there is no description at all", () => {
			assert.deepStrictEqual(DocumentLint.lint(document({ type: "object" })), []);
		});
	});

	describe("DepthExceeded", () => {
		it("degrades to a finding instead of overflowing the stack", () => {
			let node: Record<string, unknown> = { type: "string" };
			for (let index = 0; index < 300; index++) {
				node = { type: "object", properties: { inner: node } };
			}
			const findings = DocumentLint.lint(document(node));
			assert.isTrue(findings.some((finding) => finding.check === "DepthExceeded"));
		});
	});

	describe("end to end over a built document", () => {
		it.effect("a fromSchema document with a described root lints to only the advisory", () =>
			Effect.gen(function* () {
				class Item extends Schema.Class<Item>("Item")({ id: Schema.String }) {}
				const Manifest = Schema.Struct({
					items: Schema.Array(Item),
				}).annotate({ description: "A manifest\nhttps://example.com/manifest-docs" });
				const built = yield* StoreDocument.fromSchema(Manifest, {
					$id: "https://example.com/manifest.schema.json",
				});
				assert.deepStrictEqual(DocumentLint.lint(built), []);
			}),
		);

		// The pin #731 asks for: a class identifier with a space (and a
		// slash) goes through assembly as a percent-encoded root $ref over a
		// literal $defs key; the engine resolves it, so the lint must too.
		it.effect("a fromSchema document whose class identifier contains a space lints clean", () =>
			Effect.gen(function* () {
				class Foo extends Schema.Class<Foo>("My Foo/Bar")({ a: Schema.String }) {}
				const built = yield* StoreDocument.fromSchema(Foo, {
					$id: "https://example.com/foo.schema.json",
				});
				assert.deepStrictEqual(built.root, { $ref: "#/$defs/My%20Foo~1BarEncoded" }, "core encodes the token");
				assert.deepStrictEqual(DocumentLint.lint(built), []);
			}),
		);
	});
});

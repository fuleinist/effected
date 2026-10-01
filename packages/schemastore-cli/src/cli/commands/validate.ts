// `schemastore validate`: answer the question the publication story exists
// for — does THIS payload conform to the published document it names? The
// check gate proves a document is valid JSON Schema and matches its source;
// nothing proved an instance matches the committed document consumers
// actually fetch, so CI had to shell out to a third-party validator. The
// schema reference resolves against the config's derived identities
// (`$id`, frozen `$id`/`url`, catalog `url`) so the payload's `$schema` —
// the URL an application emits via its `HostedSchema` — names the local
// committed document, no network involved.

import { CliRuntime } from "@effected/cli";
import type { InstanceFinding, SchemastoreConfig } from "@effected/schemastore";
import { InstanceValidator } from "@effected/schemastore";
import { Console, Effect, FileSystem, Option, Path, Predicate, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { AjvInstanceValidator } from "../../AjvInstanceValidator.js";
import { ConfigLoader } from "../../ConfigLoader.js";
import type { ExecuteDeps } from "../execute.js";
import { configArgument, formatFlag } from "../flags.js";

/**
 * The payload file could not be read or parsed: it does not exist, the
 * filesystem refused it, or its contents are not JSON. Nothing was
 * validated. Exit `2`.
 *
 * @public
 */
export class PayloadError extends Schema.TaggedError<PayloadError>()("PayloadError", {
	path: Schema.String,
	reason: Schema.String,
}) {
	override get message(): string {
		return `Failed to read payload ${this.path}: ${this.reason}`;
	}
}

/**
 * The payload names no schema and `--schema` was not given, so there is
 * nothing to validate against. A usage error — the remedy is in how the
 * command is invoked. Exit `64`.
 *
 * @public
 */
export class MissingSchemaRefError extends Schema.TaggedError<MissingSchemaRefError>()("MissingSchemaRefError", {
	path: Schema.String,
}) {
	override get message(): string {
		return `Payload ${this.path} has no "$schema" property; pass --schema <path|$id> to name the document to validate against.`;
	}
}

/**
 * The schema reference — `--schema` or the payload's `$schema` — resolved to
 * no readable document: it is neither an existing file nor an identity any
 * config schema derives (`$id`, a frozen `$id`/`url`, a catalog `url`), or
 * the document it names could not be read or parsed. Exit `2`.
 *
 * @public
 */
export class SchemaResolutionError extends Schema.TaggedError<SchemaResolutionError>()("SchemaResolutionError", {
	$ref: Schema.String,
	reason: Schema.String,
}) {
	override get message(): string {
		return `Failed to resolve schema "${this.$ref}": ${this.reason}`;
	}
}

/**
 * The payload does not conform to the resolved document: the engine
 * answered findings, each already reported. Exit `1` — a validation
 * verdict, the reason CI runs the command.
 *
 * @public
 */
export class ValidationFailedError extends Schema.TaggedError<ValidationFailedError>()("ValidationFailedError", {
	count: Schema.Number,
	payload: Schema.String,
	schema: Schema.String,
}) {
	override get message(): string {
		return `${this.count} finding(s): ${this.payload} does not conform to ${this.schema}`;
	}
}

/** The parsed flags and argument of `validate`. @public */
export interface ValidateInput {
	readonly payload: string;
	readonly schema: Option.Option<string>;
	readonly config: Option.Option<string>;
	readonly format: "human" | "json";
}

// A JSON file that could not be read or parsed. Internal plumbing: each
// call site re-marks it as the subject-specific public error (PayloadError,
// SchemaResolutionError) with the exit code that subject carries.
class ReadJsonError extends Schema.TaggedError<ReadJsonError>()("ReadJsonError", {
	path: Schema.String,
	reason: Schema.String,
}) {}

// One JSON file, read and parsed or a typed ReadJsonError naming it.
const readJson = Effect.fn("schemastore.validate.readJson")(function* (file: string) {
	const fs = yield* FileSystem.FileSystem;
	const text = yield* fs
		.readFileString(file)
		.pipe(Effect.mapError((cause) => new ReadJsonError({ path: file, reason: cause.message })));
	return yield* Effect.try({
		try: () => JSON.parse(text) as unknown,
		catch: (cause) => new ReadJsonError({ path: file, reason: cause instanceof Error ? cause.message : String(cause) }),
	});
});

// Every identity a config schema derives, mapped to the local document that
// carries it: the current target's `$id`, each frozen version's `$id` and
// catalog `url`, and the current catalog `url` (distinct from `$id` only
// under SchemaStore hosting). First registration wins; `defineConfig`
// already rejects two schemas deriving one output path.
const identityMap = (config: SchemastoreConfig): Map<string, { readonly name: string; readonly path: string }> => {
	const identities = new Map<string, { name: string; path: string }>();
	const add = (identity: string | undefined, name: string, path: string): void => {
		if (identity !== undefined && !identities.has(identity)) {
			identities.set(identity, { name, path });
		}
	};
	for (const schema of config.schemas) {
		add(schema.target.$id, schema.name, schema.target.path);
		for (const frozen of schema.frozen) {
			add(frozen.$id, schema.name, frozen.path);
			add(frozen.url, schema.name, frozen.path);
		}
		add(schema.catalog?.url, schema.name, schema.target.path);
	}
	return identities;
};

// The reference resolves file-first (an existing path wins — deterministic,
// and needs no config), then as a config-derived identity. The returned
// `source` is what the report names: the document's resolved path.
const resolveDocument = Effect.fn("schemastore.validate.resolveDocument")(function* (
	$ref: string,
	input: ValidateInput,
	deps: ExecuteDeps,
) {
	const path = yield* Path.Path;
	const fs = yield* FileSystem.FileSystem;
	const unresolved = (reason: string) =>
		Effect.fail(CliRuntime.reported(new SchemaResolutionError({ $ref, reason }), 2));
	const candidate = path.resolve(deps.cwd, $ref);
	if (yield* fs.exists(candidate).pipe(Effect.orElseSucceed(() => false))) {
		const parsed = yield* readJson(candidate).pipe(
			Effect.catchTag("ReadJsonError", ({ reason }) => unresolved(reason)),
		);
		return { parsed, source: candidate };
	}
	const loaded = yield* ConfigLoader.load({
		cwd: deps.cwd,
		...(Option.isSome(input.config) ? { explicit: input.config.value } : {}),
		...(deps.importModule !== undefined ? { importModule: deps.importModule } : {}),
	});
	const match = identityMap(loaded.config).get($ref);
	if (match === undefined) {
		return yield* unresolved("not an existing file, and no schema in the config derives this $id or url");
	}
	const parsed = yield* readJson(match.path).pipe(
		Effect.catchTag("ReadJsonError", ({ reason }) =>
			unresolved(`schema "${match.name}" resolves to ${match.path}, which ${reason}`),
		),
	);
	return { parsed, source: match.path };
});

const findingLine = (finding: InstanceFinding): string =>
	`  ${finding.path === "" ? "(root)" : finding.path}: ${finding.message}${finding.keyword !== undefined ? ` [${finding.keyword}]` : ""}`;

const jsonReport = (payload: string, $ref: string, source: string, findings: ReadonlyArray<InstanceFinding>): string =>
	JSON.stringify({
		payload,
		schema: $ref,
		document: source,
		valid: findings.length === 0,
		findings: findings.map((finding) => ({
			path: finding.path,
			message: finding.message,
			...(finding.keyword !== undefined ? { keyword: finding.keyword } : {}),
		})),
	});

// The payload's own `$schema`, when it carries one: a string property on a
// JSON object. Anything else (absent, non-string, non-object payload) means
// "names nothing" and defers to `--schema` or the usage error.
const schemaPropertyOf = (payload: unknown): string | undefined =>
	Predicate.isObject(payload) && !Array.isArray(payload) && typeof payload.$schema === "string"
		? payload.$schema
		: undefined;

// The `$schema` self-reference is the pointer this command consumed to find
// the document, not contract data: documents the kit generates set
// `additionalProperties: false`, so leaving the key in the instance would
// fail EVERY payload that names its own document — the flagship flow. Strip
// it (top level, string-valued, in either reference mode) and validate the
// rest of the payload verbatim.
const withoutSchemaRef = (payload: unknown): unknown => {
	if (schemaPropertyOf(payload) === undefined) {
		return payload;
	}
	const rest: Record<string, unknown> = { ...(payload as Record<string, unknown>) };
	delete rest.$schema;
	return rest;
};

/**
 * Run one `schemastore validate`.
 *
 * @remarks
 * Reads the payload, resolves the schema reference (`--schema`, else the
 * payload's `$schema`) file-first then against the config's derived
 * identities, validates with `deps.instanceValidator` or the real engine,
 * and reports. A top-level string `$schema` on the payload is the pointer
 * naming the document, not contract data, so it is stripped from the
 * instance before validating — the rest goes verbatim. Findings fail
 * `ValidationFailedError` at exit `1`; a
 * payload that cannot be read or parsed is `PayloadError` at `2`, an
 * unresolvable reference `SchemaResolutionError` at `2`, a payload naming
 * nothing `MissingSchemaRefError` at `64`, and an engine mechanism failure
 * (`InstanceValidatorError`) flows unmarked to the runtime's exit `3`.
 * `--format json` writes one report document to stdout and moves the human
 * lines to stderr, exactly as `build`/`check` do.
 *
 * @public
 */
export const runValidate = Effect.fn("schemastore.validate")(function* (input: ValidateInput, deps: ExecuteDeps) {
	const path = yield* Path.Path;
	const payloadPath = path.resolve(deps.cwd, input.payload);
	const payload = yield* readJson(payloadPath).pipe(
		Effect.catchTag("ReadJsonError", ({ reason }) =>
			Effect.fail(CliRuntime.reported(new PayloadError({ path: payloadPath, reason }), 2)),
		),
	);
	const $ref = Option.getOrUndefined(input.schema) ?? schemaPropertyOf(payload);
	if ($ref === undefined) {
		return yield* Effect.fail(CliRuntime.reported(new MissingSchemaRefError({ path: payloadPath }), 64));
	}
	const resolved = yield* resolveDocument($ref, input, deps);
	const document = resolved.parsed;
	if (!Predicate.isObject(document) || Array.isArray(document)) {
		return yield* Effect.fail(
			CliRuntime.reported(new SchemaResolutionError({ $ref, reason: `${resolved.source} is not a JSON object` }), 2),
		);
	}
	const findings = yield* Effect.gen(function* () {
		const validator = yield* InstanceValidator;
		return yield* validator.validate(document as Record<string, unknown>, withoutSchemaRef(payload));
	}).pipe(Effect.provide(deps.instanceValidator ?? AjvInstanceValidator.layer));
	const human: ReadonlyArray<string> =
		findings.length === 0
			? [`valid ${payloadPath} against ${resolved.source}`]
			: [...findings.map(findingLine), `${findings.length} finding(s): ${payloadPath} does not conform to ${$ref}`];
	if (input.format === "json") {
		yield* Console.log(jsonReport(payloadPath, $ref, resolved.source, findings));
		for (const line of human) {
			yield* Effect.logInfo(line);
		}
	} else {
		for (const line of human) {
			yield* Console.log(line);
		}
	}
	if (findings.length > 0) {
		return yield* Effect.fail(
			CliRuntime.reported(new ValidationFailedError({ count: findings.length, payload: payloadPath, schema: $ref }), 1),
		);
	}
});

/**
 * `schemastore validate`: check a payload against a published schema
 * document. The reference (`--schema`, else the payload's `$schema`) is an
 * existing file path or an identity the config derives — a schema's `$id`,
 * a frozen version's `$id`/`url`, or a catalog `url` — so CI validates an
 * action's output against the committed document without a third-party
 * tool or a network fetch. A top-level string `$schema` on the payload is
 * consumed as that pointer and stripped before validating, since the
 * generated documents' `additionalProperties: false` would otherwise
 * reject the very self-reference that names them.
 *
 * @public
 */
export const makeValidateCommand = (deps: ExecuteDeps) =>
	Command.make(
		"validate",
		{
			payload: Argument.String("payload").pipe(Argument.withDescription("Path to the JSON payload to validate")),
			schema: Flag.String("schema").pipe(
				Flag.optional,
				Flag.withDescription(
					"The document to validate against: a file path, or a $id/url a config schema derives; omitted, the payload's own $schema property",
				),
			),
			config: configArgument,
			format: formatFlag,
		},
		(input) => runValidate(input, deps),
	).pipe(
		Command.withDescription(
			"Validate a JSON payload against a published schema document, resolved by path or by the config's derived $id/url identities",
		),
	);

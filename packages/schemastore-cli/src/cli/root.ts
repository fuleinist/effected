import { Command } from "effect/cli";
import { makeBuildCommand } from "./commands/build.js";
import { makeCheckCommand } from "./commands/check.js";
import { makeValidateCommand } from "./commands/validate.js";
import type { ExecuteDeps } from "./execute.js";

/**
 * The command tree, closed over the process boundary it runs against:
 * `main.ts` hands in the process values, tests hand in their own.
 *
 * @public
 */
export const makeCommands = (deps: ExecuteDeps) => {
	const build = makeBuildCommand(deps);
	const check = makeCheckCommand(deps);
	const validate = makeValidateCommand(deps);
	const root = Command.make("schemastore", {}).pipe(
		Command.withDescription(
			"Build and check SchemaStore-shaped JSON Schema documents from a schemastore.config.ts, and validate payloads against them",
		),
		Command.withSubcommands([build, check, validate]),
	);
	return { root, build, check, validate };
};

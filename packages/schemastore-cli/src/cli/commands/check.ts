import { Command } from "effect/unstable/cli";
import type { ExecuteDeps } from "../execute.js";
import { execute } from "../execute.js";
import { commandFlags } from "../flags.js";

/**
 * `schemastore check`: the same walk as `build`, reported and never written.
 * The CI drift gate: it also fails when the committed documents are stale,
 * i.e. whenever `build` would write anything — and on the outputs nothing
 * claims (an orphaned catalog file, or a `*.json` document left behind in a
 * directory the config writes into), which `build` never deletes: remove
 * them by hand.
 *
 * @public
 */
export const makeCheckCommand = (deps: ExecuteDeps) =>
	Command.make("check", commandFlags, (input) => execute("check", input, deps)).pipe(
		Command.withDescription(
			"Report what build would do, fail when it would write anything or refuse to, or when a catalog file or document is orphaned, and write nothing",
		),
	);

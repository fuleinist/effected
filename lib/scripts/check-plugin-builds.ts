/**
 * Fail when `plugin/builds` holds paths the commit cannot see.
 *
 * The `plugin:check` gate runs `pluginfinity build --check`, which compares
 * source against the builds on disk, and then `git diff --exit-code`, which
 * compares tracked builds against HEAD. Neither notices a build that ADDED
 * files which were never committed: the new files match on disk, and `git
 * diff` ignores untracked paths. This script closes that hole — any output
 * from `git status --porcelain --untracked-files=all -- plugin/builds`
 * (untracked additions, staged or unstaged edits) fails the check. The explicit
 * `--untracked-files=all` overrides a contributor's `status.showUntrackedFiles`
 * config and lists every file inside a new directory, so neither can hide an
 * addition. Porcelain status respects `.gitignore`, so ignored artifacts can
 * never false-fail the gate.
 */
import { execFileSync } from "node:child_process";

const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "plugin/builds"], {
	encoding: "utf8",
});

if (status.trim() !== "") {
	process.stderr.write("plugin/builds has untracked or modified paths; commit them or clean the tree:\n");
	process.stderr.write(status);
	process.exitCode = 1;
}

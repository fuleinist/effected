import { isNodeScript } from "./pnpmExe.js";

/**
 * The POSIX shim body: an `exec` wrapper so the shim's process *becomes* the
 * target, and `"$@"` so arguments survive quoting intact. A Node script
 * (`.js`/`.mjs`/`.cjs`) runs under `node`; anything else — pnpm 12's native
 * binary, its `#!/bin/sh` alias scripts — is exec'd directly, because handing
 * a shell script or a Mach-O to node is exactly the "Invalid or unexpected
 * token" failure this rule exists to prevent.
 */
export const posixShim = (target: string): string =>
	isNodeScript(target) ? `#!/bin/sh\nexec node "${target}" "$@"\n` : `#!/bin/sh\nexec "${target}" "$@"\n`;

/** The Windows shim body, CRLF-terminated as cmd expects; same node-vs-direct rule. */
export const cmdShim = (target: string): string =>
	isNodeScript(target) ? `@echo off\r\nnode "${target}" %*\r\n` : `@echo off\r\n"${target}" %*\r\n`;

/**
 * The Git Bash shim body written beside every Windows `.cmd` shim: the POSIX
 * wrapper's own shape — same shebang, same `exec`, same `"$@"`, same
 * node-vs-direct rule — with the target rendered in forward slashes. Inside
 * double quotes `/bin/sh` consumes a backslash only before `$`, a backtick,
 * `"`, another `\` or a newline, and a trailing backslash would escape the
 * closing quote — enough to mangle a verbatim Windows path (a doubled UNC
 * lead, a segment before `$`), while Git Bash resolves `C:/…` paths as-is.
 * Git Bash does not apply `PATHEXT`, so a bare name never finds the `.cmd`
 * twin on its own; npm's global installs write the same extensionless sibling
 * for the same reason.
 */
export const gitBashShim = (target: string): string => posixShim(target.replaceAll("\\", "/"));

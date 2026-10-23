import { assert, describe, it } from "@effect/vitest";
import { gitBashShim, posixShim } from "../src/internal/shim.js";

describe("internal/shim", () => {
	describe("gitBashShim", () => {
		it("rewrites every backslash to a forward slash, pinning the Windows target verbatim", () => {
			// CI runs Linux only, where `Path` is posix: no installer-driven test
			// can hand the builders a backslash, so the rewrite — the whole reason
			// gitBashShim exists beside posixShim — is pinned here directly.
			assert.strictEqual(
				gitBashShim("C:\\hostedtoolcache\\pnpm\\12.0.0\\x64\\pnpm.exe"),
				'#!/bin/sh\nexec "C:/hostedtoolcache/pnpm/12.0.0/x64/pnpm.exe" "$@"\n',
			);
		});

		it("dispatches a Node script through node after the same rewrite", () => {
			assert.strictEqual(
				gitBashShim("C:\\hostedtoolcache\\pnpm\\11.6.0\\x64\\bin\\pnpm.cjs"),
				'#!/bin/sh\nexec node "C:/hostedtoolcache/pnpm/11.6.0/x64/bin/pnpm.cjs" "$@"\n',
			);
		});

		it("collapses a UNC target's doubled leading backslash into the share form sh can quote", () => {
			assert.strictEqual(
				gitBashShim("\\\\runner\\share\\pnpm.exe"),
				'#!/bin/sh\nexec "//runner/share/pnpm.exe" "$@"\n',
			);
		});
	});

	describe("posixShim", () => {
		it("leaves a backslash verbatim — the rewrite is gitBashShim's alone", () => {
			// A backslash is a legal POSIX filename character; only the Git Bash
			// builder rewrites it, so shimming it out on POSIX would corrupt paths.
			assert.strictEqual(
				posixShim("/opt/hostedtoolcache/we\\ird/pnpm"),
				'#!/bin/sh\nexec "/opt/hostedtoolcache/we\\ird/pnpm" "$@"\n',
			);
		});
	});
});

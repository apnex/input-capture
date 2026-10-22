// public-types - I11 (CONTRACT.md IC9): input-capture's published types, compiled from a consumer in
// test/types/ with tsc --noEmit under strict settings, with and without exactOptionalPropertyTypes, and with
// the DOM library a page has: a browser's SVG element, canvas element and window are passed where IC3 asks,
// the hit and focus types reach the fact, and the consumer's expected-error lines -- focus without keys, a
// fact's property written -- must fail to compile, so a type that admitted them fails the compile.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const tsc = path.join(root, "node_modules", ".bin", "tsc");
const consumer = path.join(root, "test", "types", "capture-consumer.mts");
const base = ["--noEmit", "--strict", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--target", "ES2022", "--lib", "ES2022,DOM", "--skipLibCheck", "false", consumer];

for (const [label, extra] of [["strict", []], ["strict, exactOptionalPropertyTypes", ["--exactOptionalPropertyTypes"]]]) {
	test(`I11: a consumer type-checks against the public entry point (${label})`, () => {
		try {
			execFileSync(tsc, [...extra, ...base], { cwd: root, encoding: "utf8", stdio: "pipe" });
		} catch (e) {
			assert.fail(`the consumer does not compile:\n${e.stdout}${e.stderr}`);
		}
	});
}

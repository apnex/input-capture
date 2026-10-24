// contract-coverage - one test file per row of CONTRACT.md's capability table, so the contract reads as a
// list of tests (the design's section 4: "one file per capability").
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { contractRows } from "../../tools/check-export-map.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const rows = contractRows(fs.readFileSync(path.join(here, "..", "..", "CONTRACT.md"), "utf8"));

test("CONTRACT.md has its five capabilities, focus-loss-facts the row 0.2.0 adds", () => {
	assert.deepEqual(rows, ["declared-capture", "pointer-facts", "key-facts", "focus-loss-facts", "fact-reply"]);
});

for (const row of rows) {
	test(`${row} has its contract test file`, () => {
		assert.ok(fs.existsSync(path.join(here, `${row}.test.js`)), `test/contract/${row}.test.js is missing`);
	});
}

test("CONTRACT.md carries the six headings of a component entry, in order", () => {
	const text = fs.readFileSync(path.join(here, "..", "..", "CONTRACT.md"), "utf8");
	const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
	assert.deepEqual(headings, ["Duty", "Contract", "Reference", "Fit criteria", "Adjustment policy", "Edges"]);
	for (const field of ["id: unminted", "category: component", "status: draft", "sovereignty: internal", "supersedes: []", "related: [C0, A3]"]) {
		assert.ok(text.includes(`\n${field}\n`), `the frontmatter holds ${field}`);
	}
});

test("CONTRACT.md states every rule, IC1 to IC9, and every invariant, I1 to I18", () => {
	const text = fs.readFileSync(path.join(here, "..", "..", "CONTRACT.md"), "utf8");
	for (let n = 1; n <= 9; n++) assert.match(text, new RegExp(`\\*\\*IC${n} -- `), `IC${n}`);
	for (let n = 1; n <= 18; n++) assert.match(text, new RegExp(`^\\| I${n} \\|`, "m"), `I${n}`);
});

test("CONTRACT.md names no file or design of draw's but its one provenance line (RD15, GR4)", () => {
	const text = fs.readFileSync(path.join(here, "..", "..", "CONTRACT.md"), "utf8");
	const lines = text.split("\n");
	const naming = lines.filter((line) => /drawv2|[A-Z][A-Z0-9.-]+\.md\b(?<!CONTRACT\.md|README\.md|VISION\.md|DECISIONS\.md)|app\/src|dev\/design|the design's|section \d/.test(line));
	assert.equal(naming.length, 1, naming.join("\n"));
	assert.match(naming[0], /design of record/);
	assert.match(naming[0], /`apnex\/drawv2`/);
});

test("the tests the contract names are where it names them: the contract's beside the capability files, I18's beside 0.1.0, I10's page in test/browser/, I11's consumer in test/types/", () => {
	for (const file of ["returned-values-and-errors.test.js", "public-types.test.js", "beside-0.1.0.test.js"]) assert.ok(fs.existsSync(path.join(here, file)), file);
	for (const file of ["browser/real-chrome.test.js", "browser/i10-page.html", "browser/i10-page.js", "types/capture-consumer.mts"]) assert.ok(fs.existsSync(path.join(here, "..", file)), file);
});

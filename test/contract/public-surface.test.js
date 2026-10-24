// public-surface - the package exposes exactly what export-map.json names (zorg's EM14; IC9).
//
// Every path in package.json's exports is named in the map; a module path is imported by its public name
// and its runtime exports compared with the map; and every capability row of CONTRACT.md is served by
// some export or deferred with a ruling. tools/check-export-map.mjs makes the same judgement for the gate,
// and fails on a map that is wrong.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { findClockAndChance } from "../../tools/check-clock-and-chance.mjs";
import { contractRows, exportMapProblems } from "../../tools/check-export-map.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const map = JSON.parse(fs.readFileSync(path.join(root, "export-map.json"), "utf8"));
const publicName = (p) => (p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}`);

test("the export map names the package and exactly its exported paths", () => {
	assert.equal(map.package, pkg.name);
	assert.deepEqual(Object.keys(map.paths).sort(), Object.keys(pkg.exports).sort());
});

for (const [p, entry] of Object.entries(map.paths)) {
	test(`${publicName(p)} exposes what the map names`, async () => {
		assert.ok(entry.exports, `${p} is a module path`);
		const mod = await import(publicName(p));
		assert.deepEqual(Object.keys(mod).sort(), Object.keys(entry.exports).sort());
	});
}

test("IC9: the package exports openCapture, and nothing else -- the 0.2.0 fact types being types alone; it has no subpath", async () => {
	assert.deepEqual(Object.keys(await import("@apnex/input-capture")), ["openCapture"]);
	assert.deepEqual(pkg.exports, { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } });
	await assert.rejects(import("@apnex/input-capture/dist/reply.js"), "no file is reachable by a subpath");
});

test("IC9: no built file reads a clock or randomness, holds a timer, or reaches a network (tools/check-clock-and-chance.mjs, whose falsifiers are in test/tools/gate-checks.test.js)", () => {
	const dist = path.join(root, "dist");
	const files = fs.readdirSync(dist).filter((f) => f.endsWith(".js"));
	assert.ok(files.length >= 8);
	for (const file of files) assert.deepEqual(findClockAndChance(fs.readFileSync(path.join(dist, file), "utf8"), file), [], file);
});

test("the export map: one path, openCapture serving all five capabilities -- focus-loss-facts the row 0.2.0 adds, the wheel and the context menu widening pointer-facts -- { part: 'input-capture', serves }, nothing deferred", () => {
	assert.deepEqual(map, {
		package: "@apnex/input-capture",
		paths: {
			".": {
				exports: {
					openCapture: { part: "input-capture", serves: ["declared-capture", "pointer-facts", "key-facts", "focus-loss-facts", "fact-reply"] },
				},
			},
		},
		deferred: {},
	});
});

test("every contract row is served by an export or deferred with a ruling", () => {
	const rows = contractRows(fs.readFileSync(path.join(root, "CONTRACT.md"), "utf8"));
	assert.equal(rows.length, 5);
	const served = new Set(Object.values(map.paths).flatMap((e) => Object.values(e.exports ?? {})).flatMap((x) => x.serves));
	for (const row of rows) assert.ok(served.has(row) || map.deferred[row], `${row} is neither served nor deferred`);
	for (const [row, ruling] of Object.entries(map.deferred)) assert.match(ruling, /^D\d+$/, `${row} is deferred without a ruling`);
});

test("the package declares no dependency, and pins TypeScript", () => {
	assert.equal(pkg.dependencies, undefined);
	assert.equal(pkg.devDependencies.typescript, "5.9.3");
	assert.equal(pkg.type, "module");
	assert.equal(pkg.engines.node, ">=22");
	assert.equal(pkg.name, "@apnex/input-capture");
	assert.equal(pkg.version, "0.2.0");
	assert.equal(pkg.repository.url, "git+https://github.com/apnex/input-capture.git");
	assert.deepEqual(pkg.files.sort(), ["CONTRACT.md", "LICENSE", "README.md", "VISION.md", "dist"]);
});

test("the export-map check passes here, and fails on a map that names an export the package lacks or misses a row", async () => {
	assert.deepEqual(await exportMapProblems(root), []);
	const copy = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-map-"));
	try {
		for (const f of ["package.json", "CONTRACT.md", "export-map.json"]) fs.copyFileSync(path.join(root, f), path.join(copy, f));
		fs.mkdirSync(path.join(copy, "docs"));
		fs.copyFileSync(path.join(root, "docs", "DECISIONS.md"), path.join(copy, "docs", "DECISIONS.md"));
		fs.cpSync(path.join(root, "dist"), path.join(copy, "dist"), { recursive: true });
		const broken = structuredClone(map);
		broken.paths["."].exports.extraThing = { part: "input-capture", serves: ["declared-capture"] };
		broken.paths["."].exports.openCapture.serves = ["no-such-row", "pointer-facts"];
		fs.writeFileSync(path.join(copy, "export-map.json"), JSON.stringify(broken));
		const problems = await exportMapProblems(copy);
		assert.ok(problems.some((p) => p.startsWith(". exports") && p.includes("extraThing")), problems.join("\n"));
		assert.ok(problems.some((p) => p.includes("no-such-row")), problems.join("\n"));
		assert.ok(problems.some((p) => p === "key-facts is neither served nor deferred"), problems.join("\n"));
		assert.ok(problems.some((p) => p === "focus-loss-facts is neither served nor deferred"), problems.join("\n"));
		assert.ok(problems.some((p) => p === "fact-reply is neither served nor deferred"), problems.join("\n"));
	} finally {
		fs.rmSync(copy, { recursive: true, force: true });
	}
});

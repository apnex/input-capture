// gate-checks - the gate's own checks (I12) can fail: the vocabulary check and the runtime check
// (SNAP-GRID.md section 7.2), input-binding's clock and chance check, adopted as written, and the source
// check (INPUT-CAPTURE.md section 7) each pass over this repository and fail over a copy holding what it
// exists to refuse.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { candidateWords, findVocabulary, readVocabulary, splitWords } from "../../tools/check-vocabulary.mjs";
import { findClockAndChance } from "../../tools/check-clock-and-chance.mjs";
import { findRuntimeUses } from "../../tools/check-runtime.mjs";
import { findConfigProblems, findSourceProblems, sourceProblems } from "../../tools/check-source.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const run = (tool, ...args) => spawnSync(process.execPath, [path.join(root, "tools", tool), ...args], { encoding: "utf8" });
const scratch = (files) => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-check-"));
	for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
	return dir;
};

test("I12: the vocabulary check splits identifiers at case changes, underscores, hyphens and digits, and also compares each whole", () => {
	assert.deepEqual(splitWords("nodeCount NODE_EXT zone-keys HTMLLayout zone2 drawV2"), ["node", "count", "node", "ext", "zone", "keys", "html", "layout", "zone", "2", "draw", "v", "2"]);
	assert.deepEqual(candidateWords("draw_V2"), ["draw_v2", "drawv2", "draw", "v", "2"]);
	const lists = readVocabulary();
	assert.deepEqual(findVocabulary("// the anchor of a thing", lists).map((f) => f.word), ["anchor"]);
	assert.deepEqual(findVocabulary('const s = "Keyboard";', lists).map((f) => [f.word, f.consumer]), [["keyboard", "gesture-tester"]]);
	assert.deepEqual(findVocabulary("const route = group(key, mouse, bend, draw, nodal, linkage, keys, groups);", lists), [], "ordinary words, and words that merely contain a listed one, pass");
});

test("I12: plurals, digits and a case change inside a word are caught; a run of lower-case letters is not", () => {
	const lists = readVocabulary();
	const caught = (text) => findVocabulary(text, lists).map((f) => f.listed);
	assert.deepEqual(caught("const zones = [];"), ["zone"]);
	assert.deepEqual(caught("// nodes and glyphes"), ["node", "glyph"]);
	assert.deepEqual(caught("export const drawV2 = 1;"), ["drawv2"]);
	assert.deepEqual(caught("const draw_v2 = 1;"), ["drawv2"]);
	assert.deepEqual(caught("let zone2 = 0;"), ["zone"]);
	assert.deepEqual(caught("class ZoneGrid {}"), ["zone"]);
	assert.deepEqual(caught("const zonegrid = 0;"), [], "a listed word inside one run of lower-case letters is not caught: no dictionary splits it");
	for (const control of ["group", "route", "key", "nodal", "keys", "drawing", "linked"]) assert.deepEqual(caught(`const ${control} = 1;`), [], control);
});

test("I12: the vocabulary check passes over src, and fails on a word of draw's in a comment, a string or code", () => {
	assert.equal(run("check-vocabulary.mjs").status, 0);
	for (const text of ["// snaps a waypoint\nexport const a = 1;\n", 'export const a = "zone";\n', "export const layoutName = 1;\n", "/* the DIAGRAM */\n"]) {
		const dir = scratch({ "a.ts": text });
		try {
			const r = run("check-vocabulary.mjs", dir);
			assert.equal(r.status, 1, text);
			assert.match(r.stdout, /FAIL/);
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}
});

test("I12: the traps section 7 names for a component touching the DOM are caught, and no contract name of section 3 holds a listed word", () => {
	const lists = readVocabulary();
	const caught = (text) => findVocabulary(text, lists).map((f) => f.listed);
	assert.deepEqual(caught("// a keyboard shortcut"), ["keyboard"]);
	assert.deepEqual(caught("// a KeyboardEvent's fields"), ["keyboard"], "the platform's own name for a key event");
	assert.deepEqual(caught("// not a DOM Node"), ["node"]);
	assert.deepEqual(caught("// an <a> element is a link or an anchor"), ["link", "anchor"]);
	assert.deepEqual(caught("// a key layout"), ["layout"]);
	assert.deepEqual(caught("// keycaps"), ["keycap"]);
	assert.deepEqual(caught("// runs in Node.js and a browser"), ["node"]);
	assert.deepEqual(caught("// see https://example.com/link/page"), ["link"]);
	assert.deepEqual(caught("// pipes the fact through"), ["pipe"]);
	assert.deepEqual(caught("const anchorPoint = 1; // layout"), ["anchor", "layout"]);
	assert.deepEqual(caught("// a server runtime, a key, a press, a point"), []);
	const names = `openCapture surface keys toDrawing hit focus deliver addEventListener removeEventListener setPointerCapture
clientX clientY button buttons pointerId pointerType shiftKey ctrlKey altKey metaKey target preventDefault key code repeat
pointerleave pointerdown pointermove pointerup pointercancel pointerover pointerout dblclick keydown keyup
leave down move up cancel over out double key-down key-up type at screen ok capture problems close claim takePointer
pointer problem not-an-object unknown-property missing-property invalid-value platform key source open event fact point
screen point conversion delivery reply modifiers declared-capture pointer-facts key-facts fact-reply input-capture`;
	assert.deepEqual(findVocabulary(names, lists), []);
});

test("I12: the runtime check passes over dist, and fails on a bare or node: import, a dynamic import, or a runtime's global", () => {
	assert.equal(run("check-runtime.mjs").status, 0);
	const bad = [
		'import fs from "node:fs";\n',
		'import { x } from "some-package";\n',
		'export { y } from "@scope/pkg/sub";\n',
		'import "side-effect";\n',
		'const m = await import("./a.js");\n',
		"export const g = globalThis;\n",
		"export const p = process.env;\n",
		"const r = require;\n",
		"const b = Buffer.from([]);\n",
		"export const w = typeof window;\n",
		"export const d = document;\n",
		"export const s = self;\n",
		"export const t = `${global.x}`;\n",
		"const r = /'/; const p = process.env;\n",
		"if (Math.PI) /'/.test(''); globalThis.x = 1; //'\n",
		"{} /'/.test(''); process.exit(); //'\n",
		"export const o = { self: 1 };\n",
	];
	// every plant a file of its own in one copy, run through the tool once: each must be reported
	const dir = scratch(Object.fromEntries(bad.map((text, i) => [`plant-${String(i).padStart(2, "0")}.js`, text])));
	try {
		const r = run("check-runtime.mjs", dir);
		assert.equal(r.status, 1);
		bad.forEach((text, i) => assert.match(r.stdout, new RegExp(`plant-${String(i).padStart(2, "0")}\\.js:`), text));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("I12: the runtime check reads names in code only, never in comments or strings, nor as members", () => {
	const clean = '// globalThis, process and require( in a comment\nimport { a } from "./a.js";\nexport * from "../b.js";\nconst s = "window document self";\nconst q = \'process\';\nconst t = `import("x") ${a.process}`;\nconst o = { x: options.self };\nconst d = a / b / c;\nconst r = [/"/g, /\\//];\n/* Buffer */\n';
	assert.deepEqual(findRuntimeUses(clean), []);
	assert.deepEqual(findRuntimeUses("const t = `a ${globalThis.x} b`;\n").map((f) => f.finding), ["names globalThis"]);
	assert.deepEqual(findRuntimeUses("const r = /'/; const p = process.env;\n").map((f) => f.finding), ["names process"], "a quote inside a regular expression begins no string");
	assert.deepEqual(findRuntimeUses("const s = 'process';\n"), [], "a name inside a string is not a finding");
	assert.deepEqual(findRuntimeUses("const g = global; const r = require;\n").map((f) => f.finding), ["names global", "names require"], "contextual keywords are names too");
	assert.deepEqual(findRuntimeUses("if (Math.PI) /'/.test(''); globalThis.x = 1; //'\n").map((f) => f.finding), ["names globalThis"], "a regular expression after ) is no division");
	assert.deepEqual(findRuntimeUses("{} /'/.test(''); process.exit(); //'\n").map((f) => f.finding), ["names process"], "a regular expression after a block's } is no division");
	assert.deepEqual(findRuntimeUses("const o = { self: 1 };\n").map((f) => f.finding), ["names self"], "an object-literal key is counted");
	assert.deepEqual(findRuntimeUses("const m = import.meta.url; const n = a?.process;\n"), [], "import.meta is no dynamic import, and an optional member is a member");
	assert.throws(() => findRuntimeUses('const s = "open;\n'), /could not parse/);
});

test("I12: the clock and chance check passes over dist, and fails on a clock, a timer, chance or a network planted in a built file -- by bracket or by destructuring too", () => {
	assert.equal(run("check-clock-and-chance.mjs").status, 0);
	const bad = [
		"export const a = Date.now();\n",
		"export const b = Math.random();\n",
		'export const c = Math["random"]();\n',
		"const { random } = Math; export const d = random();\n",
		"const { random: chance } = Math; export const e = chance();\n",
		"let r; ({ random: r } = Math); export const f = r();\n",
		"const m = Math; export const g = m.random();\n",
		'export const h = Math["max"](1, 2);\n',
		"export const i = [Math][0].random();\n",
		"const { now } = Date; export const j = now();\n",
		"const { now } = performance; export const k = now();\n",
		"export const l = performance.now();\n",
		"setTimeout(() => 0, 1);\n",
		"queueMicrotask(() => 0);\n",
		"export const n = crypto.getRandomValues(new Uint8Array(1));\n",
		"export const o = new Date();\n",
		"export const p = `${Math[`random`]()}`;\n",
		"function q({ random } = Math) { return random(); }\nexport { q };\n",
	];
	for (const text of bad) assert.ok(findClockAndChance(text).length > 0, text);
	// every plant a file of its own in one copy, run through the tool once: each must be reported
	const dir = scratch(Object.fromEntries(bad.map((text, i) => [`plant-${String(i).padStart(2, "0")}.js`, text])));
	try {
		const r = run("check-clock-and-chance.mjs", dir);
		assert.equal(r.status, 1);
		assert.match(r.stdout, /FAIL/);
		bad.forEach((text, i) => assert.match(r.stdout, new RegExp(`plant-${String(i).padStart(2, "0")}\\.js:`), text));
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("I12: the clock and chance check reads code only, and passes a direct member access by identifier", () => {
	const clean = [
		"export const a = Math.max(1, 2);\n",
		"export const b = Math.min(...[3, 4]) + Math.floor(1.5) + Math.abs(-1);\n",
		"// Date.now(), Math.random() and setTimeout in a comment\nexport const c = 'Math.random() and Date.now()';\n",
		"export const d = options.Date + record.performance + x.random;\n",
		"const { random } = other; export const e = random;\n",
	];
	for (const text of clean) assert.deepEqual(findClockAndChance(text), [], text);
	assert.deepEqual(findClockAndChance('export const c = Math["random"]();\n').map((f) => f.finding), ["reads Math.random by brackets", "uses Math as a value, not as a direct member access by identifier"]);
	assert.deepEqual(findClockAndChance("const { random } = Math; random();\n").map((f) => f.finding), ["destructures from Math", "uses Math as a value, not as a direct member access by identifier"]);
	assert.throws(() => findClockAndChance('const s = "open;\n'), /could not parse/);
});

/** A copy of the repository's src/ and tsconfig.json, with `plant` applied, checked by the source check. */
function sourceCheckOf(plant) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-source-"));
	try {
		fs.cpSync(path.join(root, "src"), path.join(dir, "src"), { recursive: true });
		fs.copyFileSync(path.join(root, "tsconfig.json"), path.join(dir, "tsconfig.json"));
		plant(dir);
		return { problems: sourceProblems(dir), run: run("check-source.mjs", dir) };
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

test("I12: the source check passes over this repository", () => {
	assert.deepEqual(sourceProblems(root), []);
	assert.equal(run("check-source.mjs").status, 0);
});

test("I12: the source check fails on every declare form planted in src -- var, let, const, function, class, enum, namespace, module, global, type, interface, a class field", () => {
	const forms = [
		["const", "declare const window: any;\nexport {};\n"],
		["let", "declare let x: number;\nexport {};\n"],
		["var", "declare var x: number;\nexport {};\n"],
		["function", "declare function f(): void;\nexport {};\n"],
		["class", "declare class C {}\nexport {};\n"],
		["enum", "declare enum E { A }\nexport {};\n"],
		["namespace", "declare namespace N {}\nexport {};\n"],
		["module", "declare module \"m\" {}\nexport {};\n"],
		["global", "declare global { var x: number; }\nexport {};\n"],
		["type", "declare type T = number;\nexport {};\n"],
		["interface", "declare interface I {}\nexport {};\n"],
		["class field", "export class C { declare x: number; }\n"],
	];
	for (const [kind, text] of forms) assert.deepEqual(findSourceProblems(text).map((f) => f.finding), [`declares with \`declare\` (${kind})`], kind);
	// three of them planted in a copy of the repository and run through the tool, as the gate runs it
	for (const [kind, text] of forms.filter(([kind]) => ["const", "global", "class field"].includes(kind))) {
		const { problems, run: r } = sourceCheckOf((dir) => fs.writeFileSync(path.join(dir, "src", "planted.ts"), text));
		assert.ok(problems.some((p) => p.startsWith("src/planted.ts:") && p.includes("declare")), `${kind}: ${problems.join("; ")}`);
		assert.equal(r.status, 1);
		assert.match(r.stdout, /FAIL/);
	}
});

test("I12: the source check fails on `declare const window: any;` and `/// <reference lib=\"dom\" />` planted in an existing src file", () => {
	for (const plant of ["declare const window: any;\n", '/// <reference lib="dom" />\n']) {
		const { problems, run: r } = sourceCheckOf((dir) => {
			const file = path.join(dir, "src", "reply.ts");
			fs.writeFileSync(file, plant + fs.readFileSync(file, "utf8"));
		});
		assert.equal(r.status, 1, plant);
		assert.ok(problems.some((p) => p.startsWith("src/reply.ts:1:")), problems.join("; "));
		if (plant.startsWith("///")) assert.ok(problems.some((p) => p.includes("lib.dom.d.ts, a platform library")), "TypeScript's own program would compile the DOM library");
	}
});

test("I12: the source check fails on every triple-slash directive, a declaration file, and a file that is no ES module", () => {
	for (const text of ['/// <reference lib="dom" />\nexport {};\n', '/// <reference types="web" />\nexport {};\n', '/// <reference path="./x.d.ts" />\nexport {};\n', '/// <reference no-default-lib="true" />\nexport {};\n', 'export const a = 1;\n/// <reference lib="dom" />\n']) {
		assert.ok(findSourceProblems(text).some((f) => f.finding.includes("triple-slash")), text);
	}
	assert.deepEqual(findSourceProblems('export const s = "/// <reference lib=\\"dom\\" />";\n'), [], "the form inside a string is no directive");
	assert.ok(findSourceProblems("interface Window { x: number }\n").some((f) => f.finding.includes("no ES module")));
	assert.ok(findSourceProblems("const s = ;\nexport {};\n").some((f) => f.finding.includes("could not parse")));
	const { problems } = sourceCheckOf((dir) => fs.writeFileSync(path.join(dir, "src", "globals.d.ts"), "export {};\n"));
	assert.ok(problems.includes("src/globals.d.ts: is a declaration file"), problems.join("; "));
});

test("I12: the source check fails on tsconfig settings that would bring a DOM library back", () => {
	const good = { compilerOptions: { lib: ["ES2022"], types: [] }, include: ["src"] };
	assert.deepEqual(findConfigProblems(good), []);
	const bad = [
		{ ...good, compilerOptions: { lib: ["ES2022", "DOM"], types: [] } },
		{ ...good, compilerOptions: { types: [] } },
		{ ...good, compilerOptions: { lib: ["ES2022"] } },
		{ ...good, compilerOptions: { lib: ["ES2022"], types: ["web"] } },
		{ ...good, compilerOptions: { lib: ["ES2022"], types: [], typeRoots: ["./types"] } },
		{ ...good, extends: "./base.json" },
		{ ...good, files: ["globals.d.ts"] },
		{ ...good, include: ["src", "globals.d.ts"] },
		{ ...good, references: [{ path: "../other" }] },
	];
	for (const config of bad) assert.ok(findConfigProblems(config).length > 0, JSON.stringify(config));
	const { problems, run: r } = sourceCheckOf((dir) => {
		const file = path.join(dir, "tsconfig.json");
		const config = JSON.parse(fs.readFileSync(file, "utf8"));
		delete config.compilerOptions.lib;
		fs.writeFileSync(file, JSON.stringify(config));
	});
	assert.equal(r.status, 1);
	assert.ok(problems.some((p) => p.startsWith("tsconfig.json: compilerOptions.lib")), problems.join("; "));
	assert.ok(problems.some((p) => p.includes("lib.dom.d.ts")), "with no lib, the target's default libraries bring the DOM back, and the program check sees it");
});

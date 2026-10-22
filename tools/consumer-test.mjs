#!/usr/bin/env node
// consumer-test - the consumer test (SNAP-GRID.md section 7.3, as INPUT-CAPTURE.md section 7 adapts it):
// the package as a consumer receives it.
//
// It packs the package -- or takes a tarball already packed, such as the one a release attaches --
// installs the file into an empty project with --omit=dev, imports every export by name in Node, then
// serves the installed files with a small static server and loads every export in headless Chrome
// through an import map made as draw makes its own: one entry per export, never a trailing-slash prefix,
// each export's address carrying the package's version. In Node and in the page alike, the exercise
// below opens a capture, delivers a pointer press and a key press through it, claims both and takes the
// pointer, closes it, and finds one more press delivers nothing: in Node over plain-object fakes, whose
// setPointerCapture agrees, and in the page over an element, dispatching a constructed PointerEvent and
// a constructed key event -- real event objects, whose fields are inherited accessors -- where the
// element's setPointerCapture refuses the synthetic pointer, so takePointer answers false.
//
// Chrome is $CHROME, or google-chrome on PATH. It runs with a profile of its own in a scratch directory,
// so it never touches another Chrome on the machine. Nothing here needs an npm dependency.
//
// Usage:  node tools/consumer-test.mjs [--tarball FILE] [--keep]    (or INPUT_CAPTURE_TARBALL=FILE)
import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const keep = process.argv.includes("--keep");
const tarballAt = process.argv.indexOf("--tarball");
const given = tarballAt > -1 ? process.argv[tarballAt + 1] : process.env.INPUT_CAPTURE_TARBALL || null;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "input-capture-consumer-"));
const fail = (message) => {
	console.log(`consumer-test: FAIL -- ${message}`);
	process.exitCode = 1;
	throw new Error(message);
};
const step = (message) => console.log(`  ${message}`);

/**
 * What a consumer does with the package, run in Node and in Chrome alike: open a capture on the platform's
 * surface and key source, deliver a pointer press and a key press, claim both and take the pointer, close
 * the capture, and press again. `platform` makes and dispatches the events. Answers a summary, or throws.
 */
function exercise(openCapture, platform) {
	const facts = [];
	const opened = openCapture({
		surface: platform.surface,
		keys: platform.keys,
		toDrawing: (screen) => ({ x: screen.x / 2, y: screen.y / 2 }),
		hit: (target) => (target === platform.surface ? "surface" : "elsewhere"),
		focus: () => "focused",
		deliver: (fact, reply) => {
			facts.push(fact);
			reply.claim();
			if (fact.type === "down") facts.push(reply.takePointer());
		},
	});
	if (!opened.ok) throw new Error("openCapture refused: " + JSON.stringify(opened.problems));
	const down = platform.press({ clientX: 10, clientY: 20, button: 0, buttons: 1, pointerId: 42, pointerType: "mouse", shiftKey: true });
	const key = platform.key({ key: "a", code: "KeyA", repeat: true });
	opened.capture.close();
	platform.press({ clientX: 1, clientY: 1, button: 0, buttons: 1, pointerId: 43, pointerType: "mouse" });
	const [pointer, taken, keyed] = facts;
	const wrong = [];
	if (facts.length !== 3) wrong.push(facts.length + " deliveries");
	if (!pointer || pointer.type !== "down" || pointer.at.x !== 5 || pointer.at.y !== 10 || pointer.screen.x !== 10 || pointer.hit !== "surface" || pointer.button !== 0 || pointer.buttons !== 1 || pointer.pointerId !== 42 || pointer.pointerType !== "mouse" || pointer.shiftKey !== true || pointer.key !== null) wrong.push("the pointer fact " + JSON.stringify(pointer));
	if (!keyed || keyed.type !== "key-down" || keyed.key !== "a" || keyed.code !== "KeyA" || keyed.repeat !== true || keyed.focus !== "focused" || keyed.at !== null || keyed.button !== null) wrong.push("the key fact " + JSON.stringify(keyed));
	if (!Object.isFrozen(pointer) || !Object.isFrozen(pointer.at) || !Object.isFrozen(keyed)) wrong.push("a fact not frozen");
	if (!down.defaultPrevented || !key.defaultPrevented) wrong.push("a claim not done");
	if (taken !== platform.takes) wrong.push("takePointer answered " + taken);
	if (wrong.length) throw new Error("the package answered wrongly: " + wrong.join("; "));
	return ["down:" + pointer.at.x + "," + pointer.at.y + ":" + pointer.hit + ":" + pointer.pointerType + ":" + pointer.pointerId, "taken=" + taken, "key-down:" + keyed.key + ":" + keyed.code + ":repeat", "claimed", "closed"].join(",");
}

/** The Node platform: plain-object fakes, whose setPointerCapture agrees. */
const NODE_PLATFORM = `const listeners = new Map();
const fake = (tag) => ({ addEventListener: (name, listener) => listeners.set(tag + ":" + name, listener), removeEventListener: (name, listener) => { if (listeners.get(tag + ":" + name) === listener) listeners.delete(tag + ":" + name); }, setPointerCapture: () => undefined });
const surface = fake("surface"), keys = fake("keys");
const dispatch = (key, init) => { const event = { ...init, target: surface, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; const listener = listeners.get(key); if (listener) listener(event); return event; };
const platform = { surface, keys, takes: true, press: (init) => dispatch("surface:pointerdown", init), key: (init) => dispatch("keys:keydown", init) };`;

/** The page's platform: an element, constructed events dispatched on it, and its setPointerCapture refusing the synthetic pointer. */
const PAGE_PLATFORM = `const element = document.getElementById("surface");
const dispatch = (event) => { element.dispatchEvent(event); return event; };
const platform = { surface: element, keys: element, takes: false, press: (init) => dispatch(new PointerEvent("pointerdown", { ...init, bubbles: true, cancelable: true })), key: (init) => dispatch(new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true })) };`;

async function main() {
	// 1. the tarball given, or build and pack one, as a release does
	let tarball, shipped;
	if (given) {
		tarball = path.resolve(given);
		if (!fs.existsSync(tarball) || !fs.statSync(tarball).isFile()) fail(`no tarball at ${tarball}`);
		const entries = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).split("\n").filter((e) => e && !e.endsWith("/"));
		if (entries.some((e) => !e.startsWith("package/"))) fail(`${tarball} is not an npm package tarball`);
		shipped = entries.map((e) => e.slice("package/".length)).sort();
		step(`took the tarball given, ${path.basename(tarball)}: ${shipped.length} files`);
	} else {
		execFileSync("npm", ["run", "build"], { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
		const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", scratch], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }));
		tarball = path.join(scratch, packed[0].filename);
		shipped = packed[0].files.map((f) => f.path).sort();
		step(`packed ${packed[0].filename}: ${shipped.length} files`);
	}
	const stray = shipped.filter((f) => !f.startsWith("dist/") && !["CONTRACT.md", "LICENSE", "README.md", "VISION.md", "package.json"].includes(f));
	if (stray.length) fail(`the tarball holds files outside dist and the documents: ${stray.join(", ")}`);
	if (shipped.some((f) => f.endsWith(".d.ts.map"))) fail("the tarball holds a declaration map");

	// 2. install the file into an empty project, without development dependencies
	const project = path.join(scratch, "project");
	fs.mkdirSync(project);
	fs.writeFileSync(path.join(project, "package.json"), JSON.stringify({ name: "input-capture-consumer", version: "0.0.0", private: true, type: "module" }, null, 2));
	execFileSync("npm", ["install", tarball, "--omit=dev", "--no-audit", "--no-fund"], { cwd: project, stdio: ["ignore", "ignore", "inherit"] });
	const installed = path.join(project, "node_modules", "@apnex", "input-capture");
	const pkg = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf8"));
	const others = fs.readdirSync(path.join(project, "node_modules")).filter((d) => d !== "@apnex" && !d.startsWith("."));
	if (others.length) fail(`installing brought other packages: ${others.join(", ")}`);
	step(`installed ${pkg.name}@${pkg.version} into an empty project, with nothing else`);

	// 3. import every export by name in Node
	const map = JSON.parse(fs.readFileSync(path.join(root, "export-map.json"), "utf8"));
	const specifiers = Object.keys(pkg.exports).map((p) => (p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}`));
	const imports = Object.entries(map.paths).map(([p, e], i) => `import { ${Object.keys(e.exports).join(", ")} } from "${p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}`}"; const m${i} = { ${Object.keys(e.exports).join(", ")} };`);
	const nodeCheck = [
		...imports,
		"const all = Object.assign({}, " + Object.keys(map.paths).map((_, i) => `m${i}`).join(", ") + ");",
		'for (const [name, value] of Object.entries(all)) if (value === undefined) throw new Error(name + " is undefined");',
		exercise.toString(),
		NODE_PLATFORM,
		"const summary = exercise(all.openCapture, platform);",
		'console.log("node-ok " + Object.keys(all).sort().join(",") + " " + summary);',
	].join("\n");
	fs.writeFileSync(path.join(project, "node-check.mjs"), nodeCheck);
	const { stdout: nodeOut } = await run(process.execPath, ["node-check.mjs"], { cwd: project });
	if (!nodeOut.startsWith("node-ok ")) fail(`Node: ${nodeOut}`);
	const [names, summary] = nodeOut.trim().slice(8).split(" ");
	step(`Node ${process.version} imported ${names} by name, and the exercise answered ${summary}`);

	// 4. an import map, one entry per export, each into the vendored files at the installed version
	const base = `/vendor/${pkg.name}@${pkg.version}/`;
	const entries = {};
	for (const [p, target] of Object.entries(pkg.exports)) {
		const file = typeof target === "string" ? target : target.default;
		const conditions = typeof target === "string" ? [] : Object.keys(target);
		if (conditions.some((c) => c !== "types" && c !== "default") || p.includes("*") || typeof file !== "string" || !file.startsWith("./dist/")) fail(`an exports form the map does not support: ${p}`);
		entries[p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}`] = base + file.slice("./dist/".length);
	}
	if (Object.keys(entries).some((k) => k.endsWith("/"))) fail("a trailing-slash entry in the import map");
	const bindings = Object.entries(map.paths).flatMap(([p, e]) => Object.keys(e.exports).map((name) => ({ name, from: p === "." ? pkg.name : `${pkg.name}/${p.slice(2)}` })));
	const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>input-capture consumer</title>
<script type="importmap">${JSON.stringify({ imports: entries })}</script>
<script type="module">
${[...new Set(bindings.map((b) => b.from))].map((from) => `import { ${bindings.filter((b) => b.from === from).map((b) => b.name).join(", ")} } from "${from}";`).join("\n")}
const names = { ${bindings.map((b) => b.name).join(", ")} };
const out = document.getElementById("result");
try {
	const missing = Object.entries(names).filter(([, v]) => v === undefined).map(([k]) => k);
	${PAGE_PLATFORM}
	const summary = exercise(openCapture, platform);
	out.textContent = missing.length === 0 ? "input-capture-ok " + Object.keys(names).sort().join(",") + " " + summary : "input-capture-wrong " + missing.join(",");
} catch (e) {
	out.textContent = "input-capture-error " + e.message;
}
${exercise.toString()}
</script></head><body><div id="surface" style="width:200px;height:100px"></div><pre id="result">input-capture-pending</pre></body></html>
`;

	// 5. a static server: the page, and the installed package's files under its versioned address
	const requests = [];
	const server = http.createServer((req, res) => {
		const url = new URL(req.url, "http://localhost");
		let status = 404, body = "not found", type = "text/plain";
		if (url.pathname === "/" || url.pathname === "/index.html") {
			status = 200;
			body = page;
			type = "text/html; charset=utf-8";
		} else if (url.pathname.startsWith(base)) {
			const rel = decodeURIComponent(url.pathname.slice(base.length));
			const file = path.resolve(installed, "dist", rel);
			if (file.startsWith(path.join(installed, "dist") + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
				status = 200;
				body = fs.readFileSync(file);
				type = file.endsWith(".js") ? "text/javascript; charset=utf-8" : file.endsWith(".map") ? "application/json" : "text/plain";
			}
		}
		requests.push({ path: url.pathname, status });
		res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
		res.end(body);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = `http://127.0.0.1:${server.address().port}/`;
	step(`serving the page and ${base} at ${address}`);

	// 6. headless Chrome, a profile of its own
	try {
		const chrome = process.env.CHROME || "google-chrome";
		const profile = path.join(scratch, "chrome-profile");
		const args = ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", `--user-data-dir=${profile}`, "--virtual-time-budget=10000", "--dump-dom", address];
		const { stdout: dom } = await run(chrome, args, { timeout: 90000, maxBuffer: 1 << 24 });
		const result = dom.match(/<pre id="result">([^<]*)<\/pre>/)?.[1] ?? "";
		const missed = requests.filter((r) => r.status !== 200 && r.path !== "/favicon.ico");
		if (missed.length) fail(`requests not answered 200: ${missed.map((r) => `${r.path} ${r.status}`).join(", ")}`);
		for (const address of Object.values(entries)) if (!requests.some((r) => r.path === address)) fail(`Chrome never asked for ${address}`);
		if (!result.startsWith("input-capture-ok ")) fail(`Chrome's page says: ${result || dom.slice(0, 400)}`);
		const { stdout: version } = await run(chrome, ["--version"]);
		step(`${version.trim()} loaded ${specifiers.join(" and ")} through the import map: ${requests.length} requests, every one asked of the page answered 200`);
		step(`the page says: ${result}`);
	} finally {
		server.close();
	}
	console.log("consumer-test: PASS");
}

try {
	await main();
} catch (e) {
	if (!process.exitCode) {
		console.log(`consumer-test: FAIL -- ${e.message}`);
		process.exitCode = 1;
	}
} finally {
	if (!keep) fs.rmSync(scratch, { recursive: true, force: true });
	else console.log(`  kept ${scratch}`);
}

// real-chrome - I10 (CONTRACT.md; INPUT-CAPTURE.md section 4 and section 7): in headless Chrome, with trusted
// input dispatched through the DevTools protocol's Input domain, on a page whose surface is an SVG element
// (i10-page.html), what the platform delivers becomes facts as IC4 to IC8 say. The surface is offset on the
// page and scales a viewBox, so the conversion's answer, read through the element's own screen transform,
// differs from the screen point at every event, and at is held to the answer, not to screen.
//
// The gate runs it on every push: Chrome is launched as the consumer test launches it, with a profile and
// a debugging port of its own (chrome-driver.js), and driven over Node.js's global WebSocket. Where a
// Node.js has no global WebSocket -- 22.0 to 22.3, which keep it behind a flag -- the file runs itself
// again with --experimental-websocket.
//
// Every test and hook has a timeout, so a hang fails rather than runs on; the after hook ends Chrome's
// whole process group and closes the server in finally blocks, so its cleanup can neither fail the run
// nor leave a handle holding it open.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { launchChrome, serveRepository, sleep } from "./chrome-driver.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

if (typeof globalThis.WebSocket !== "function") {
	test("I10, run again with --experimental-websocket, since this Node.js keeps its WebSocket behind the flag", () => {
		const run = spawnSync(process.execPath, ["--experimental-websocket", "--test", fileURLToPath(import.meta.url)], { stdio: "inherit", timeout: 300000, killSignal: "SIGKILL" });
		assert.equal(run.status, 0);
	});
} else {
	let chrome, server;
	const TEST = { timeout: 30000 };

	before(async () => {
		server = await serveRepository(root);
		chrome = await launchChrome();
		await chrome.send("Page.enable");
		await chrome.send("Emulation.setDeviceMetricsOverride", { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
		await chrome.send("Page.navigate", { url: `${server.origin}/test/browser/i10-page.html` });
		for (let i = 0; i < 200 && !(await chrome.evaluate("globalThis.page?.ready === true")); i++) await sleep(50);
		assert.equal(await chrome.evaluate("globalThis.page?.ready === true"), true, "the page opened its capture");
		assert.equal(await chrome.evaluate("JSON.stringify(page.refused)"), "null", "openCapture accepted an SVG element and the window");
	}, { timeout: 60000 });

	after(async () => {
		try {
			await chrome?.close();
		} finally {
			await server?.close();
		}
	}, { timeout: 30000 });

	const mouse = (type, x, y, button = "none", buttons = 0, clickCount = 0) => chrome.send("Input.dispatchMouseEvent", { type, x, y, button, buttons, clickCount });
	const touch = async (type, touchPoints) => {
		await chrome.send("Input.dispatchTouchEvent", { type, touchPoints });
		await sleep(30);
	};
	const key = (type, k, code, extra = {}) => chrome.send("Input.dispatchKeyEvent", { type, key: k, code, ...extra });
	/**
	 * The facts delivered since the last call, each as the page recorded it: read once the count has held
	 * still for 100 milliseconds, or after 3 seconds, so a slow runner's input pipeline is waited for.
	 */
	const facts = async () => {
		let count = -1;
		for (let waited = 0; waited < 3000; waited += 50) {
			await sleep(50);
			const now = await chrome.evaluate("page.facts.length");
			if (now === count && waited >= 100) break;
			count = now;
		}
		return JSON.parse(await chrome.evaluate("JSON.stringify(page.facts.splice(0))"));
	};
	const policy = (value) => chrome.evaluate(`page.policy = ${JSON.stringify(value)}`);
	/** Whether a screen point lies on the surface: 400 by 300 pixels from (40, 20). */
	const ON = (screen) => screen[0] >= 40 && screen[0] <= 440 && screen[1] >= 20 && screen[1] <= 320;
	/** Where a screen point lies in the drawing: the surface's offset taken away, its viewBox's scale of 1/2 and its origin at (-100, -50). */
	const drawn = ([x, y]) => [(x - 40) / 2 - 100, (y - 20) / 2 - 50];
	/** Every fact's at is the conversion's answer for its screen point, and so is not its screen point. */
	const converted = (list) => list.every((f) => f.at === null || (f.at[0] === drawn(f.screen)[0] && f.at[1] === drawn(f.screen)[1] && (f.at[0] !== f.screen[0] || f.at[1] !== f.screen[1])));
	const only = (list, ...types) => list.filter((f) => types.includes(f.type));

	/** A left press on the surface's child at (100, 100), moves to (300, 200) on the surface and (600, 500) off it, and a release there. */
	async function dragOffTheSurface(take) {
		await mouse("mouseMoved", 390, 290);
		await policy({ take, claim: [] });
		await mouse("mouseMoved", 100, 100);
		await facts();
		await mouse("mousePressed", 100, 100, "left", 1, 1);
		await mouse("mouseMoved", 300, 200, "left", 1);
		await mouse("mouseMoved", 600, 500, "left", 1);
		await mouse("mouseReleased", 600, 500, "left", 0, 1);
		return facts();
	}

	test("I10: a left press whose pointer is taken -- every move and the release delivered, off the surface too, each fact frozen, at a DOMPoint's numbers", TEST, async () => {
		const got = await dragOffTheSurface(true);
		const moves = only(got, "down", "move", "up");
		assert.deepEqual(moves.map((f) => [f.type, ...f.screen]), [["down", 100, 100], ["move", 300, 200], ["move", 600, 500], ["up", 600, 500]]);
		assert.equal(moves[0].taken, true, "takePointer answered true for a trusted press");
		assert.equal(moves[0].hit, "child", "the press's target is the child it landed on");
		assert.deepEqual(moves.map((f) => f.hit), ["child", "surface", "surface", "surface"], "once taken, the platform retargets the pointer's events to the surface");
		assert.deepEqual(moves.map((f) => [f.button, f.buttons, f.pointerType]), [[0, 1, "mouse"], [-1, 1, "mouse"], [-1, 1, "mouse"], [0, 0, "mouse"]]);
		assert.ok(moves.every((f) => f.pointerId === moves[0].pointerId && Number.isSafeInteger(f.pointerId)));
		assert.ok(got.every((f) => f.frozen), "each fact frozen");
		assert.deepEqual(moves.map((f) => f.at), [[-70, -10], [30, 40], [180, 190], [180, 190]], "at is the conversion's answer through the viewBox, a DOMPoint read through its getters");
		assert.ok(converted(got), "every fact's at is its screen point converted, never the screen point itself");
		assert.ok(got.every((f) => f.key === null && f.code === null && f.repeat === null && f.focus === null));
	});

	test("I10: the same press not taken -- nothing delivered off the surface but the out and the leave reporting the exit", TEST, async () => {
		const got = await dragOffTheSurface(false);
		assert.deepEqual(only(got, "down", "move", "up").map((f) => [f.type, ...f.screen]), [["down", 100, 100], ["move", 300, 200]]);
		assert.deepEqual(got.filter((f) => !ON(f.screen)).map((f) => f.type), ["out", "leave"], "off the surface, only the exit is reported");
		assert.equal(got.at(-1).type, "leave");
		assert.ok(converted(got));
	});

	test("I10: a right press and release, button 2; a move with no button, button -1 and buttons 0", TEST, async () => {
		await mouse("mouseMoved", 200, 200);
		await facts();
		await mouse("mousePressed", 200, 200, "right", 2, 1);
		await mouse("mouseReleased", 200, 200, "right", 0, 1);
		const right = await facts();
		assert.deepEqual(right.map((f) => [f.type, f.button, f.buttons]), [["down", 2, 2], ["up", 2, 0]]);
		await mouse("mouseMoved", 220, 210);
		const move = await facts();
		assert.deepEqual(move.map((f) => [f.type, f.button, f.buttons, ...f.screen, ...f.at]), [["move", -1, 0, 220, 210, -10, 45]]);
		assert.ok(converted([...right, ...move]));
	});

	test("I10: a double click -- one double after its presses and releases, pointerId and pointerType null", TEST, async () => {
		await mouse("mouseMoved", 250, 250);
		await facts();
		for (const n of [1, 2]) {
			await mouse("mousePressed", 250, 250, "left", 1, n);
			await mouse("mouseReleased", 250, 250, "left", 0, n);
		}
		const got = await facts();
		assert.deepEqual(got.map((f) => f.type), ["down", "up", "down", "up", "double"]);
		const double = got.at(-1);
		assert.deepEqual([double.pointerId, double.pointerType, double.button, double.screen, double.at], [null, null, 0, [250, 250], [5, 65]], "a double click is the platform's MouseEvent, carrying no pointerId");
		assert.ok(converted(got));
	});

	test("I10: a leave when the pointer leaves the surface", TEST, async () => {
		await mouse("mouseMoved", 250, 250);
		await facts();
		await mouse("mouseMoved", 600, 500);
		const got = await facts();
		assert.deepEqual(got.map((f) => [f.type, ...f.screen]), [["out", 600, 500], ["leave", 600, 500]]);
		assert.ok(converted(got), "the conversion runs on a leave too");
	});

	test("I10: touch -- a touch pressed on a child and not taken, its moves and release off the surface delivered with the child as target", TEST, async () => {
		await chrome.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
		await sleep(100);
		await facts();
		await touch("touchStart", [{ x: 100, y: 100, id: 1 }]);
		await touch("touchMove", [{ x: 300, y: 200, id: 1 }]);
		await touch("touchMove", [{ x: 600, y: 500, id: 1 }]);
		await touch("touchEnd", []);
		const got = only(await facts(), "down", "move", "up");
		assert.deepEqual(got.map((f) => [f.type, ...f.screen, f.hit, f.pointerType]), [["down", 100, 100, "child", "touch"], ["move", 300, 200, "child", "touch"], ["move", 600, 500, "child", "touch"], ["up", 600, 500, "child", "touch"]]);
		assert.equal(got[0].button, 0, "a touch's press is button 0");
		assert.ok(converted(got));
	});

	test("I10: two touch contacts, two pointerId values, pointerType touch; a touch cancelled, a cancel", TEST, async () => {
		await touch("touchStart", [{ x: 100, y: 200, id: 1 }]);
		await touch("touchStart", [{ x: 100, y: 200, id: 1 }, { x: 300, y: 200, id: 2 }]);
		await touch("touchEnd", []);
		const downs = only(await facts(), "down");
		assert.equal(downs.length, 2);
		assert.ok(downs.every((f) => f.pointerType === "touch" && Number.isSafeInteger(f.pointerId)));
		assert.notEqual(downs[0].pointerId, downs[1].pointerId, "each contact is a pointer of its own");
		await touch("touchStart", [{ x: 200, y: 250, id: 3 }]);
		await touch("touchCancel", []);
		const got = await facts();
		assert.deepEqual(only(got, "down", "cancel").map((f) => [f.type, f.pointerType]), [["down", "touch"], ["cancel", "touch"]]);
		await chrome.send("Emulation.setTouchEmulationEnabled", { enabled: false });
		await sleep(100);
	});

	test("I10: a key held to repeat, its key and code, and a key-up; a claimed key-down seen defaultPrevented by a later listener", TEST, async () => {
		await policy({ take: false, claim: ["q"] });
		await facts();
		await chrome.evaluate("page.later.length = 0");
		await key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
		await key("keyDown", "a", "KeyA", { text: "a", autoRepeat: true, windowsVirtualKeyCode: 65 });
		await key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
		await key("keyDown", "q", "KeyQ", { text: "q", windowsVirtualKeyCode: 81 });
		await key("keyUp", "q", "KeyQ", { windowsVirtualKeyCode: 81 });
		const got = await facts();
		assert.deepEqual(got.map((f) => [f.type, f.key, f.code, f.repeat]), [["key-down", "a", "KeyA", false], ["key-down", "a", "KeyA", true], ["key-up", "a", "KeyA", false], ["key-down", "q", "KeyQ", false], ["key-up", "q", "KeyQ", false]]);
		assert.ok(got.every((f) => f.at === null && f.screen === null && f.hit === null && f.button === null && f.buttons === null && f.pointerId === null && f.pointerType === null && f.frozen));
		assert.ok(got.every((f) => f.focus === "BODY"), "the focus reading is handed the event's target");
		assert.deepEqual(JSON.parse(await chrome.evaluate("JSON.stringify(page.later)")), [{ key: "a", defaultPrevented: false }, { key: "a", defaultPrevented: false }, { key: "q", defaultPrevented: true }]);
	});

	test("I10: nothing after close -- close answers undefined, and no press, move, release or key delivers a fact", TEST, async () => {
		assert.equal(await chrome.evaluate("String(page.capture.close())"), "undefined");
		assert.equal(await chrome.evaluate("String(page.capture.close())"), "undefined", "a second close does nothing");
		await mouse("mouseMoved", 100, 100);
		await mouse("mousePressed", 100, 100, "left", 1, 1);
		await mouse("mouseMoved", 150, 120, "left", 1);
		await mouse("mouseReleased", 150, 120, "left", 0, 1);
		await mouse("mouseMoved", 600, 500);
		await key("keyDown", "a", "KeyA", { text: "a", windowsVirtualKeyCode: 65 });
		await key("keyUp", "a", "KeyA", { windowsVirtualKeyCode: 65 });
		assert.deepEqual(await facts(), []);
	});
}

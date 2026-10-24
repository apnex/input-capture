// key-facts - IC4 to IC7 for key events (I4, I5, I9): each key-down and key-up on the key source as one fact,
// with the application's focus; every reading of IC5 for a key event; the reading stopping at the first
// refusal; no coordinate or button ever read; and the focus reading's answer held by reference.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openCapture } from "@apnex/input-capture";
import { declarationOver, fakePlatform, keyEvent, PlatformKeyEvent } from "../support/fakes.js";
import { recorded } from "../support/recording-proxy.js";

const FIELDS = ["key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "timeStamp", "target", "preventDefault"];
const refused = (name, call, also = () => true) => assert.throws(call, (e) => e instanceof TypeError && e.message.startsWith(`${name}: `) && also(e), `refused with a TypeError beginning "${name}: "`);

function opened(extra = {}) {
	const platform = fakePlatform();
	const { declaration, delivered } = declarationOver(platform, extra);
	const result = openCapture(declaration);
	assert.equal(result.ok, true);
	return { platform, delivered, capture: result.capture };
}

test("IC4: a keydown and a keyup on the key source become key-down and key-up facts; with no key source, no key listener is added", () => {
	const { platform, delivered } = opened();
	platform.keys.fire("keydown", keyEvent());
	platform.keys.fire("keyup", keyEvent());
	assert.deepEqual(delivered.map((d) => d.fact.type), ["key-down", "key-up"]);
	const none = fakePlatform();
	const { declaration } = declarationOver(none);
	delete declaration.keys;
	openCapture(declaration);
	assert.equal(none.keys.live.size, 0);
	assert.ok(!none.surface.live.has("keydown"));
});

test("IC5: a key fact holds exactly its twenty-one properties, in order, its pointer and wheel fields null, its time the event's timeStamp", () => {
	const { platform, delivered } = opened({ focus: () => "the focus" });
	platform.keys.fire("keydown", keyEvent({ key: "Shift", code: "ShiftLeft", repeat: true, shiftKey: true, altKey: "yes", timeStamp: 812.5, deltaX: 3, deltaMode: 1 }));
	const { fact } = delivered[0];
	assert.deepEqual(Object.keys(fact), ["type", "at", "screen", "hit", "focus", "button", "buttons", "pointerId", "pointerType", "key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "deltaX", "deltaY", "deltaZ", "deltaMode", "time"]);
	assert.deepEqual(fact, { type: "key-down", at: null, screen: null, hit: null, focus: "the focus", button: null, buttons: null, pointerId: null, pointerType: null, key: "Shift", code: "ShiftLeft", repeat: true, shiftKey: true, ctrlKey: false, altKey: true, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 812.5 });
});

test("I4: every reading of IC5 for a key event -- key and code absent or of another type, repeat and the modifiers of every truthiness; an ordinary key event holding no pointer field", () => {
	const { platform, delivered } = opened();
	const fire = (fields, drop = []) => {
		const event = keyEvent(fields);
		for (const name of drop) delete event[name];
		platform.keys.fire("keyup", event);
		return delivered.at(-1).fact;
	};
	for (const name of ["key", "code"]) {
		assert.equal(fire({}, [name])[name], null, `${name} absent`);
		for (const value of [5, null, undefined, {}, true, Symbol("k")]) assert.equal(fire({ [name]: value })[name], null, `${name} ${String(value)}`);
		assert.equal(fire({ [name]: "" })[name], "", "any string, the empty one among them");
		assert.equal(fire({ [name]: "Enter" })[name], "Enter");
	}
	for (const name of ["repeat", "shiftKey", "ctrlKey", "altKey", "metaKey"]) {
		assert.equal(fire({}, [name])[name], false, `${name} absent`);
		for (const value of [0, "", null, undefined, false, NaN]) assert.equal(fire({ [name]: value })[name], false, `${name} ${String(value)}`);
		for (const value of [1, "x", {}, true]) assert.equal(fire({ [name]: value })[name], true, `${name} ${typeof value}`);
	}
	const ordinary = { key: "z", code: "KeyZ", repeat: false, target: null, preventDefault() {} };
	platform.keys.fire("keydown", ordinary);
	assert.deepEqual(delivered.at(-1).fact, { type: "key-down", at: null, screen: null, hit: null, focus: null, button: null, buttons: null, pointerId: null, pointerType: null, key: "z", code: "KeyZ", repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: null });
});

test("IC6 step 2: a key event's coordinates and button are never read or judged, and a key fact carries none of them", () => {
	const reads = [];
	const { platform, delivered } = opened({ toDrawing: () => assert.fail("the conversion was asked for a key event") });
	const event = keyEvent({ button: 2, buttons: 3, pointerId: 4, pointerType: "pen" });
	for (const field of ["clientX", "clientY"]) Object.defineProperty(event, field, { get: () => (reads.push(field), NaN) });
	platform.keys.fire("keydown", event);
	assert.deepEqual(reads, []);
	const { fact } = delivered[0];
	assert.deepEqual([fact.button, fact.buttons, fact.pointerId, fact.pointerType, fact.at, fact.screen], [null, null, null, null, null, null]);
});

test("I5: spies log a key event's reads in IC6's order, then focus and the delivery; hit is never called for a key fact", () => {
	const log = [];
	const { platform } = opened({ toDrawing: () => log.push("toDrawing"), hit: () => log.push("hit"), focus: () => (log.push("focus"), 1), deliver: () => log.push("deliver") });
	platform.keys.fire("keydown", recorded(keyEvent(), "event", log));
	assert.deepEqual(log, [...FIELDS.map((f) => `event get ${f}`), "focus", "deliver"]);
});

test("I5: a key event refused at each place stops the reading there, no later field read and no application function called", () => {
	for (const value of [undefined, {}, 5, "f"]) {
		const log = [];
		const { platform } = opened({ focus: () => log.push("focus"), deliver: () => log.push("deliver") });
		refused("keydown", () => platform.keys.fire("keydown", recorded(keyEvent({ preventDefault: value }), "event", log)));
		assert.deepEqual(log, FIELDS.map((f) => `event get ${f}`));
	}
	for (const field of FIELDS) {
		const log = [];
		const { platform } = opened({ focus: () => log.push("focus"), deliver: () => log.push("deliver") });
		const hooks = { get: (t, k) => (k === field ? (() => { throw `no ${field}`; })() : t[k]) };
		refused("keyup", () => platform.keys.fire("keyup", recorded(keyEvent(), "event", log, hooks)), (e) => e.message.includes(`could not be read: no ${field}`));
		assert.deepEqual(log, FIELDS.slice(0, FIELDS.indexOf(field) + 1).map((f) => `event get ${f}`), `a getter throwing at ${field}`);
	}
	for (const event of [null, 7, "k", () => keyEvent()]) {
		const { platform, delivered } = opened();
		refused("keydown", () => platform.keys.fire("keydown", event));
		assert.equal(delivered.length, 0);
	}
});

test("IC6 step 4: focus is handed the target and the fact so far -- focus null -- and the delivered fact holds its answer by reference", () => {
	const answer = { typing: false };
	const target = { the: "target" };
	let handed;
	const { platform, delivered } = opened({ focus: (t, fact) => ((handed = [t, fact]), answer), hit: () => assert.fail("hit asked for a key fact") });
	platform.keys.fire("keydown", keyEvent({ target }));
	assert.equal(handed[0], target);
	assert.equal(handed[1].focus, null);
	assert.ok(Object.isFrozen(handed[1]));
	assert.equal(delivered[0].fact.focus, answer);
	assert.notEqual(delivered[0].fact, handed[1]);
	assert.ok(!Object.isFrozen(answer));
	const { platform: other, delivered: without } = opened();
	other.keys.fire("keydown", keyEvent());
	assert.equal(without[0].fact.focus, null, "no focus function: focus null");
});

test("I9: an exception from focus propagates unchanged, nothing delivered", () => {
	const thrown = new Error("focus's own");
	const { platform, delivered } = opened({ focus: () => { throw thrown; } });
	assert.throws(() => platform.keys.fire("keydown", keyEvent()), (e) => e === thrown);
	assert.equal(delivered.length, 0);
});

test("IC1: the key source's own event objects -- Node.js's EventTarget with key events whose fields are inherited accessors -- and the surface as its own key source", () => {
	const source = new EventTarget();
	const seen = [];
	const surface = { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} };
	const result = openCapture({ surface, keys: source, toDrawing: (s) => s, focus: (target) => target === source, deliver: (fact, reply) => {
		seen.push([fact.type, fact.key, fact.code, fact.repeat, fact.focus]);
		if (fact.key === "q") reply.claim();
	} });
	const later = [];
	source.addEventListener("keydown", (event) => later.push(event.defaultPrevented));
	source.dispatchEvent(new PlatformKeyEvent("keydown", { key: "a", code: "KeyA", repeat: true }));
	source.dispatchEvent(new PlatformKeyEvent("keydown", { key: "q", code: "KeyQ" }));
	source.dispatchEvent(new PlatformKeyEvent("keyup", { key: "q", code: "KeyQ" }));
	assert.deepEqual(seen, [["key-down", "a", "KeyA", true, true], ["key-down", "q", "KeyQ", false, true], ["key-up", "q", "KeyQ", false, true]]);
	assert.deepEqual(later, [false, true]);
	result.capture.close();
	source.dispatchEvent(new PlatformKeyEvent("keydown"));
	assert.equal(seen.length, 3);
});

test("I16: every key fact's time is its event's timeStamp under Object.is when a finite number, and null for NaN, an infinity, a string or an absent field; read after the modifiers, a throwing getter refusing the event", () => {
	const { platform, delivered } = opened();
	const time = (name, timeStamp, drop = false) => {
		const event = keyEvent({ timeStamp });
		if (drop) delete event.timeStamp;
		platform.keys.fire(name, event);
		return delivered.at(-1).fact.time;
	};
	for (const name of ["keydown", "keyup"]) {
		for (const value of [0, -0, 99.999, 1e300, -1]) assert.ok(Object.is(time(name, value), value), `${name} ${value}`);
		for (const value of [NaN, Infinity, -Infinity, "5", null, undefined, 5n]) assert.equal(time(name, value), null, `${name} ${String(value)}`);
		assert.equal(time(name, undefined, true), null, `${name}: absent`);
	}
	const log = [];
	const { platform: throwing } = opened({ focus: () => log.push("focus"), deliver: () => log.push("deliver") });
	const hooks = { get: (t, k) => (k === "timeStamp" ? (() => { throw "no time"; })() : t[k]) };
	refused("keydown", () => throwing.keys.fire("keydown", recorded(keyEvent(), "event", log, hooks)), (e) => e.message === "keydown: the event's timeStamp could not be read: no time");
	assert.deepEqual(log, FIELDS.slice(0, FIELDS.indexOf("timeStamp") + 1).map((f) => `event get ${f}`));
	const handed = [];
	const { platform: focusing } = opened({ focus: (t, fact) => (handed.push(fact), 1) });
	focusing.keys.fire("keyup", keyEvent({ timeStamp: 8 }));
	assert.deepEqual([handed[0].focus, handed[0].time, handed[0].deltaX, handed[0].deltaY, handed[0].deltaZ, handed[0].deltaMode], [null, 8, null, null, null, null], "step 4's fact holds the new properties");
	const source = new EventTarget();
	const seen = [];
	openCapture({ surface: { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} }, keys: source, toDrawing: (s) => s, deliver: (fact) => seen.push(fact.time) });
	source.dispatchEvent(new PlatformKeyEvent("keydown"));
	assert.ok(typeof seen[0] === "number" && Number.isFinite(seen[0]), "an Event's own timeStamp");
});

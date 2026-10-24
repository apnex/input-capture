// focus-loss-facts - IC3 to IC6 and IC8 for the key source's focus loss (I17): a blur on the key source as one
// fact, listened for only when the declaration lists 'blur', which requires keys; the fact holding its time,
// every modifier false and every other property null; its event's timeStamp and preventDefault read, in that
// order, and no target; neither hit nor focus asked; and a claim calling preventDefault once.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openCapture } from "@apnex/input-capture";
import { blurEvent, declarationOver, fakePlatform, keyEvent, pointerEvent } from "../support/fakes.js";
import { isFrozenToDepth } from "../support/frozen.js";
import { recorded } from "../support/recording-proxy.js";

const refused = (call, also = () => true) => assert.throws(call, (e) => e instanceof TypeError && e.message.startsWith("blur: ") && also(e), 'refused with a TypeError beginning "blur: "');
const BLUR = { type: "blur", at: null, screen: null, hit: null, focus: null, button: null, buttons: null, pointerId: null, pointerType: null, key: null, code: null, repeat: null, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null };

/** An open capture listing 'blur' over fresh fakes; `extra` overrides the declaration. */
function opened(extra = {}) {
	const platform = fakePlatform();
	const { declaration, delivered } = declarationOver(platform, { listen: ["blur"], ...extra });
	const result = openCapture(declaration);
	assert.equal(result.ok, true);
	return { platform, delivered, capture: result.capture };
}

test("IC4: a blur on the key source becomes one blur fact, delivered before the listener returns; with 'blur' not listed, no blur listener is added", () => {
	const { platform, delivered } = opened();
	assert.equal(platform.keys.fire("blur", blurEvent()), undefined);
	assert.deepEqual(delivered.map((d) => d.fact.type), ["blur"]);
	assert.ok(!platform.surface.live.has("blur"), "listened on the key source, not the surface");
	const none = fakePlatform();
	openCapture(declarationOver(none, { listen: ["wheel", "context-menu"] }).declaration);
	assert.ok(!none.keys.live.has("blur") && !none.surface.live.has("blur"));
	const absent = fakePlatform();
	openCapture(declarationOver(absent).declaration);
	assert.ok(!absent.keys.live.has("blur"));
});

test("I17, IC5: a blur fact holds its time, every modifier false and every other property null, in IC5's order, whatever the event carries", () => {
	const { platform, delivered } = opened();
	platform.keys.fire("blur", blurEvent({ timeStamp: 4321.5, shiftKey: true, ctrlKey: true, altKey: true, metaKey: true, key: "a", code: "KeyA", clientX: 1, clientY: 2, button: 0, pointerId: 3, deltaX: 9, deltaMode: 1, repeat: true }));
	const { fact } = delivered[0];
	assert.deepEqual(Object.keys(fact), ["type", "at", "screen", "hit", "focus", "button", "buttons", "pointerId", "pointerType", "key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "deltaX", "deltaY", "deltaZ", "deltaMode", "time"]);
	assert.deepEqual(fact, { ...BLUR, time: 4321.5 });
	assert.ok(isFrozenToDepth(fact));
});

test("I17, IC5: a blur fact's time is its event's timeStamp under Object.is when a finite number, else null", () => {
	const { platform, delivered } = opened();
	const time = (timeStamp, drop = false) => {
		const event = blurEvent({ timeStamp });
		if (drop) delete event.timeStamp;
		platform.keys.fire("blur", event);
		return delivered.at(-1).fact.time;
	};
	for (const value of [0, -0, 17.25, 1e-300]) assert.ok(Object.is(time(value), value), String(value));
	for (const value of [NaN, Infinity, -Infinity, "17", null, undefined, 17n, {}]) assert.equal(time(value), null, String(value));
	assert.equal(time(undefined, true), null, "absent");
});

test("I17, IC6: a blur's reads in order -- timeStamp, then preventDefault -- its target never read, neither hit nor focus asked, nor the conversion", () => {
	const log = [];
	const targetLog = [];
	const target = recorded({}, "target", targetLog);
	const { platform } = opened({ toDrawing: () => log.push("toDrawing"), hit: () => log.push("hit"), focus: () => log.push("focus"), deliver: () => log.push("deliver") });
	platform.keys.fire("blur", recorded(blurEvent({ target }), "event", log));
	assert.deepEqual(log, ["event get timeStamp", "event get preventDefault", "deliver"]);
	assert.deepEqual(targetLog, [], "the target's log is empty");
});

test("I17, IC6: a blur is refused unless an object, or unless its preventDefault is a function; a getter that throws refuses it; nothing is delivered", () => {
	for (const event of [undefined, null, 5, "blur", true, Symbol("b"), () => blurEvent()]) {
		const { platform, delivered } = opened();
		refused(() => platform.keys.fire("blur", event), (e) => e.message.startsWith("blur: the event must be an object"));
		assert.equal(delivered.length, 0);
	}
	for (const preventDefault of [undefined, null, {}, "f", 1]) {
		const log = [];
		const { platform, delivered } = opened();
		refused(() => platform.keys.fire("blur", recorded(blurEvent({ preventDefault }), "event", log)), (e) => e.message === "blur: the event's preventDefault must be a function");
		assert.deepEqual(log, ["event get timeStamp", "event get preventDefault"]);
		assert.equal(delivered.length, 0);
	}
	for (const field of ["timeStamp", "preventDefault"]) {
		const log = [];
		const { platform, delivered } = opened();
		const hooks = { get: (t, k) => (k === field ? (() => { throw `no ${field}`; })() : t[k]) };
		refused(() => platform.keys.fire("blur", recorded(blurEvent(), "event", log, hooks)), (e) => e.message === `blur: the event's ${field} could not be read: no ${field}`);
		assert.deepEqual(log, ["event get timeStamp", "event get preventDefault"].slice(0, field === "timeStamp" ? 1 : 2));
		assert.equal(delivered.length, 0);
	}
});

test("I17, IC8: a claim on a blur fact calls preventDefault once, with the event as receiver; takePointer answers false and calls nothing", () => {
	const answers = [];
	const event = blurEvent();
	const { platform } = opened({ deliver: (fact, reply) => {
		answers.push(reply.claim(), reply.claim(), reply.takePointer(), reply.takePointer());
	} });
	platform.log.length = 0;
	platform.keys.fire("blur", event);
	assert.deepEqual(answers, [undefined, undefined, false, false]);
	assert.equal(event.prevented, 1, "preventDefault called once, with the event as receiver");
	assert.deepEqual(platform.log.filter((c) => c.call === "surface.setPointerCapture"), []);
});

test("IC7: a blur's delivery is called with no receiver; an exception from it propagates unchanged; a delivery that closes the capture keeps its reply live", () => {
	const seen = [];
	const { platform } = opened({ deliver: function (...args) {
		seen.push([this, args.length]);
	} });
	platform.keys.fire("blur", blurEvent());
	assert.deepEqual(seen, [[undefined, 2]]);
	const thrown = new Error("the delivery's own");
	const { platform: throwing } = opened({ deliver: () => {
		throw thrown;
	} });
	assert.throws(() => throwing.keys.fire("blur", blurEvent()), (e) => e === thrown);
	let capture;
	const event = blurEvent();
	const platformClosing = fakePlatform();
	({ capture } = openCapture({ ...declarationOver(platformClosing, { listen: ["blur"] }).declaration, deliver: (fact, reply) => {
		capture.close();
		reply.claim();
	} }));
	platformClosing.keys.fire("blur", event);
	assert.equal(event.prevented, 1);
	assert.equal(platformClosing.keys.live.size, 0, "closed");
});

test("IC3: a capture listing 'blur' with the surface as its own key source hears the surface's blur; key and pointer facts are unchanged beside it", () => {
	const log = [];
	const delivered = [];
	const live = new Map();
	const surface = {
		addEventListener: (name, listener) => live.set(name, listener),
		removeEventListener() {},
		setPointerCapture: () => log.push("setPointerCapture"),
	};
	openCapture({ surface, keys: surface, toDrawing: (s) => s, focus: () => "focus", deliver: (fact) => delivered.push(fact.type), listen: ["blur"] });
	live.get("blur")(blurEvent());
	live.get("keydown")(keyEvent());
	live.get("pointerdown")(pointerEvent());
	assert.deepEqual(delivered, ["blur", "key-down", "down"]);
});

test("IC1: over Node.js's own EventTarget, a dispatched blur makes one fact whose time is the event's own timeStamp; after close, none", () => {
	const source = new EventTarget();
	const seen = [];
	const surface = { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} };
	const { capture } = openCapture({ surface, keys: source, toDrawing: (s) => s, deliver: (fact, reply) => {
		seen.push(fact);
		reply.claim();
	}, listen: ["blur"] });
	const event = new Event("blur");
	source.dispatchEvent(event);
	assert.equal(seen.length, 1);
	assert.deepEqual({ ...seen[0], time: null }, { ...BLUR, time: null });
	assert.ok(Object.is(seen[0].time, event.timeStamp), "the event's own timeStamp");
	assert.equal(event.defaultPrevented, false, "a blur is not cancelable, so a claim changes nothing");
	capture.close();
	source.dispatchEvent(new Event("blur"));
	assert.equal(seen.length, 1);
});

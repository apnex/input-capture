// returned-values-and-errors - CONTRACT.md's "Errors" and "What is returned" (I7, I9): openCapture refusing
// rather than throwing while it judges; each listener refusing an event with a TypeError beginning with the
// platform event's name, or "toDrawing: "; a reply's misuse an Error of the base constructor; every other
// exception propagating unchanged; every value capture makes fresh and frozen to its depth, not into the
// application's answers; and a fact surviving a JSON round trip but for -0.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openCapture } from "@apnex/input-capture";
import { blurEvent, declarationOver, fakePlatform, keyEvent, pointerEvent, wheelEvent } from "../support/fakes.js";
import { describe, isFrozenToDepth } from "../support/frozen.js";
import { recorded, revoked, trapping } from "../support/recording-proxy.js";

const POINTER_NAMES = ["pointerleave", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerover", "pointerout", "dblclick"];
const throwingGetter = (name) => Object.defineProperty({}, name, { get() {
	throw new RangeError("the getter's own");
}, enumerable: true });

function opened(extra = {}) {
	const platform = fakePlatform();
	const { declaration, delivered } = declarationOver(platform, extra);
	return { platform, delivered, capture: openCapture(declaration).capture };
}

test("Errors: openCapture never throws while it reads and judges a declaration, whatever its getters and traps do", () => {
	const surfaceWithThrowingMember = Object.defineProperty({ addEventListener() {}, removeEventListener() {} }, "setPointerCapture", { get() {
		throw new Error("no member");
	} });
	const values = [undefined, null, 0, NaN, "", true, Symbol("s"), 1n, [], {}, () => ({}), revoked({}), trapping({}, "ownKeys"), throwingGetter("surface"), { surface: surfaceWithThrowingMember, toDrawing: () => 0, deliver() {} }, { surface: revoked({}), keys: trapping({}, "get"), toDrawing: 1, deliver: null }, new Proxy({}, { getPrototypeOf() {
		throw new Error("trap");
	} })];
	for (const value of values) {
		assert.doesNotThrow(() => openCapture(value));
		assert.equal(openCapture(value).ok, false);
	}
});

test("Errors: openCapture throws only the error an addEventListener threw, unchanged, after taking back what it added", () => {
	const thrown = new TypeError("the platform's own");
	const surface = { addEventListener(name) {
		if (name === "pointermove") throw thrown;
	}, removeEventListener() {}, setPointerCapture() {} };
	assert.throws(() => openCapture({ surface, toDrawing: (s) => s, deliver() {} }), (e) => e === thrown);
});

test("Errors: each listener refuses an event that is no object with a TypeError beginning with the platform event's name and a colon, before deliver is called", () => {
	const { platform, delivered } = opened();
	for (const name of POINTER_NAMES) assert.throws(() => platform.surface.fire(name, 5), (e) => e.constructor === TypeError && e.message.startsWith(`${name}: `), name);
	for (const name of ["keydown", "keyup"]) assert.throws(() => platform.keys.fire(name, null), (e) => e.constructor === TypeError && e.message.startsWith(`${name}: `), name);
	assert.equal(delivered.length, 0);
});

test("Errors: a refused conversion answer, or one whose reading throws, is a TypeError beginning \"toDrawing: \"; a getter's or a trap's error is named after \"could not be read:\"", () => {
	let answer = null;
	const { platform, delivered } = opened({ toDrawing: () => answer });
	assert.throws(() => platform.surface.fire("pointerdown", pointerEvent()), (e) => e.constructor === TypeError && e.message.startsWith("toDrawing: "));
	answer = throwingGetter("x");
	assert.throws(() => platform.surface.fire("pointerdown", pointerEvent()), (e) => e.constructor === TypeError && /^toDrawing: .*could not be read: an object$/.test(e.message));
	const event = pointerEvent();
	Object.defineProperty(event, "buttons", { get() {
		throw new RangeError("the getter's own");
	} });
	assert.throws(() => platform.surface.fire("pointerdown", event), (e) => e.constructor === TypeError && /^pointerdown: .*could not be read: an object$/.test(e.message));
	assert.equal(delivered.length, 0);
});

test("Errors: a thrown value is named without running its code -- a thrown Proxy's traps never run, a thrown object's message getter never runs, a primitive written as String writes it", () => {
	const trapLog = [];
	const thrownProxy = recorded(new Error("hidden"), "thrown", trapLog);
	const field = (thrown) => {
		const event = pointerEvent();
		Object.defineProperty(event, "pointerType", { get() {
			throw thrown;
		} });
		return event;
	};
	const { platform, delivered } = opened();
	assert.throws(() => platform.surface.fire("pointerdown", field(thrownProxy)), (e) => e.constructor === TypeError && e.message.startsWith("pointerdown: ") && e.message.endsWith("could not be read: an object"));
	assert.deepEqual(trapLog, [], "no trap of the thrown Proxy ran");
	// a thrown object whose message getter would close the capture: never read, so the capture stays open
	let capture;
	let read = false;
	const fakes = fakePlatform();
	({ capture } = openCapture({ ...declarationOver(fakes).declaration, toDrawing: () => ({ get x() {
		throw { get message() {
			read = true;
			capture.close();
			return "closed";
		}, toString() {
			read = true;
			return "string form";
		} };
	} }) }));
	assert.throws(() => fakes.surface.fire("pointermove", pointerEvent()), (e) => e.constructor === TypeError && e.message === "toDrawing: the answer could not be read: an object");
	assert.equal(read, false, "neither its message nor its string form was read");
	assert.equal(fakes.surface.live.size + fakes.keys.live.size, 10, "the capture is still open");
	assert.throws(() => platform.surface.fire("pointerup", field(Object.assign(() => 0, { message: "m" }))), (e) => e.message.endsWith("could not be read: a function"));
	for (const [thrown, name] of [["boom", "boom"], [404, "404"], [null, "null"], [undefined, "undefined"], [Symbol("s"), "Symbol(s)"], [7n, "7"], [false, "false"]]) {
		assert.throws(() => platform.surface.fire("pointermove", field(thrown)), (e) => e.message.endsWith(`could not be read: ${name}`), name);
	}
	assert.equal(delivered.length, 0);
});

test("Errors: a reply's method called once its delivery has ended, or takePointer called again before its first call returns, throws an Error of the base constructor", () => {
	let reply;
	const { platform } = opened({ deliver: (f, r) => (reply = r) });
	platform.surface.fire("pointerdown", pointerEvent());
	for (const [name, call] of [["claim", () => reply.claim()], ["takePointer", () => reply.takePointer()]]) {
		assert.throws(call, (e) => Object.getPrototypeOf(e) === Error.prototype && e.message.startsWith(`${name}: `));
	}
});

test("Errors: any other exception propagates unchanged -- an application function's, preventDefault's when claimed, and a removal's from close", () => {
	const thrown = new Error("the application's own");
	for (const name of ["toDrawing", "hit", "deliver"]) {
		const { platform } = opened({ [name]: () => {
			throw thrown;
		} });
		assert.throws(() => platform.surface.fire("pointerdown", pointerEvent()), (e) => e === thrown, name);
	}
	const { platform: keyed } = opened({ focus: () => {
		throw thrown;
	} });
	assert.throws(() => keyed.keys.fire("keydown", keyEvent()), (e) => e === thrown, "focus");
	const { platform: claiming } = opened({ deliver: (f, r) => r.claim() });
	assert.throws(() => claiming.surface.fire("pointerdown", pointerEvent({ preventDefault() {
		throw thrown;
	} })), (e) => e === thrown);
	const platform = fakePlatform({ surface: { throwOnRemove: [5] } });
	const { capture } = openCapture(declarationOver(platform).declaration);
	assert.throws(() => capture.close(), (e) => e.message === "surface refused to remove pointermove", "the surface's sixth removal, in reverse order");
});

test("I7: every fact, its at and screen, and every reply are fresh and frozen to their depth, not into hit or focus, which are the very values answered", () => {
	const hitAnswer = { deep: { list: [1] } };
	const focusAnswer = [{ deep: true }];
	const { platform, delivered } = opened({ hit: () => hitAnswer, focus: () => focusAnswer });
	platform.surface.fire("pointerdown", pointerEvent());
	platform.surface.fire("pointerdown", pointerEvent());
	platform.keys.fire("keydown", keyEvent());
	const [a, b, k] = delivered;
	for (const { fact, reply } of delivered) {
		assert.ok(isFrozenToDepth(fact, new Set([hitAnswer, focusAnswer])), describe(fact));
		assert.ok(isFrozenToDepth(reply));
	}
	assert.notEqual(a.fact, b.fact);
	assert.notEqual(a.fact.at, b.fact.at);
	assert.notEqual(a.fact.screen, b.fact.screen);
	assert.notEqual(a.reply, b.reply);
	assert.equal(a.fact.hit, hitAnswer);
	assert.equal(k.fact.focus, focusAnswer);
	assert.ok(!Object.isFrozen(hitAnswer) && !Object.isFrozen(hitAnswer.deep) && !Object.isFrozen(focusAnswer), "the application's values are never frozen");
});

test("I7: a fact made from plain data survives a JSON round trip, but for -0, which JSON writes as 0", () => {
	const { platform, delivered } = opened({ hit: () => ({ kind: "box", id: 3 }), focus: () => ({ typing: false }), toDrawing: (s) => ({ x: s.x * 3, y: s.y }) });
	platform.surface.fire("pointermove", pointerEvent({ clientX: 1.5, clientY: 2 }));
	platform.keys.fire("keyup", keyEvent({ key: "Escape", code: "Escape" }));
	for (const { fact } of delivered) assert.deepEqual(JSON.parse(JSON.stringify(fact)), fact);
	platform.surface.fire("pointermove", pointerEvent({ clientX: -0, clientY: 2 }));
	const { fact } = delivered.at(-1);
	const back = JSON.parse(JSON.stringify(fact));
	assert.ok(Object.is(fact.screen.x, -0) && Object.is(fact.at.x, -0));
	assert.ok(Object.is(back.screen.x, 0) && Object.is(back.at.x, 0));
	assert.deepEqual({ ...back, at: fact.at, screen: fact.screen }, fact, "nothing else lost");
});

test("What is returned: every record holds its properties in its written order, and no function capture makes needs a receiver", () => {
	const listeners = [];
	const surface = { addEventListener: (n, l) => listeners.push([n, l]), removeEventListener() {}, setPointerCapture() {} };
	const delivered = [];
	const result = openCapture({ surface, toDrawing: (s) => s, deliver: (fact, reply) => delivered.push(Object.keys(fact).join(",")) });
	assert.deepEqual(Object.keys(result), ["ok", "capture"]);
	const [, listener] = listeners.find(([n]) => n === "pointerdown");
	listener.call({ not: "the surface" }, pointerEvent());
	Reflect.apply(listener, undefined, [pointerEvent()]);
	assert.equal(delivered.length, 2, "a listener needs no receiver: the platform calls it with its own");
	assert.equal(delivered[0], "type,at,screen,hit,focus,button,buttons,pointerId,pointerType,key,code,repeat,shiftKey,ctrlKey,altKey,metaKey,deltaX,deltaY,deltaZ,deltaMode,time");
	assert.equal(listener.length, 1, "a listener reads one argument");
	assert.equal(listener(pointerEvent(), "extra", "arguments"), undefined);
});

test("Errors: the listeners `listen` adds refuse with a TypeError beginning with their platform event's name -- wheel, contextmenu, blur -- before deliver is called", () => {
	const { platform, delivered } = opened({ listen: ["wheel", "context-menu", "blur"] });
	for (const [on, name] of [["surface", "wheel"], ["surface", "contextmenu"], ["keys", "blur"]]) {
		assert.throws(() => platform[on].fire(name, 5), (e) => e.constructor === TypeError && e.message.startsWith(`${name}: `), name);
	}
	assert.throws(() => platform.surface.fire("wheel", wheelEvent({ deltaY: NaN })), (e) => e.constructor === TypeError && e.message.startsWith("wheel: the event's deltaY"));
	const event = blurEvent();
	Object.defineProperty(event, "timeStamp", { get() {
		throw new RangeError("the getter's own");
	} });
	assert.throws(() => platform.keys.fire("blur", event), (e) => e.constructor === TypeError && e.message === "blur: the event's timeStamp could not be read: an object");
	assert.equal(delivered.length, 0);
});

test("I7: wheel, context-menu and blur facts are fresh and frozen to their depth, keys in their written order, and survive a JSON round trip but for -0", () => {
	const hitAnswer = { deep: [1] };
	const { platform, delivered } = opened({ listen: ["blur", "wheel", "context-menu"], hit: () => hitAnswer });
	platform.surface.fire("wheel", wheelEvent({ deltaX: 1.5, deltaY: -2, deltaZ: 0, deltaMode: 1, timeStamp: 10 }));
	platform.surface.fire("contextmenu", pointerEvent({ button: 2, timeStamp: 11 }));
	platform.keys.fire("blur", blurEvent({ timeStamp: 12 }));
	platform.surface.fire("wheel", wheelEvent({ deltaX: 1.5, deltaY: -2, deltaZ: 0, deltaMode: 1, timeStamp: 10 }));
	assert.deepEqual(delivered.map((d) => d.fact.type), ["wheel", "context-menu", "blur", "wheel"]);
	for (const { fact, reply } of delivered) {
		assert.ok(isFrozenToDepth(fact, new Set([hitAnswer])), describe(fact));
		assert.ok(isFrozenToDepth(reply));
		assert.equal(Object.keys(fact).join(","), "type,at,screen,hit,focus,button,buttons,pointerId,pointerType,key,code,repeat,shiftKey,ctrlKey,altKey,metaKey,deltaX,deltaY,deltaZ,deltaMode,time");
		assert.deepEqual(JSON.parse(JSON.stringify(fact)), fact);
	}
	assert.notEqual(delivered[0].fact, delivered[3].fact);
	assert.equal(delivered[0].fact.hit, hitAnswer);
	assert.equal(delivered[2].fact.hit, null, "no hit is asked for a blur");
	platform.surface.fire("wheel", wheelEvent({ deltaX: -0, deltaY: -0, deltaZ: -0, timeStamp: -0 }));
	const { fact } = delivered.at(-1);
	const back = JSON.parse(JSON.stringify(fact));
	assert.ok(Object.is(fact.deltaX, -0) && Object.is(back.deltaX, 0));
	assert.deepEqual({ ...back, at: fact.at, screen: fact.screen, deltaX: -0, deltaY: -0, deltaZ: -0, time: -0 }, fact, "nothing else lost");
});

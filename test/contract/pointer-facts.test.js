// pointer-facts - IC1 and IC4 to IC7 for pointer and double-click events (I3, I4, I5, I6, I9): each event on
// the surface as one fact, in the conversion's coordinates, with the application's hit; capture touching
// nothing of the platform outside IC1, recorded through Proxies; every reading of IC5; the reading stopping
// at the first refusal; and what each application function's code may do.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openCapture } from "@apnex/input-capture";
import { declarationOver, fakePlatform, keyEvent, PlatformPointerEvent, PlatformSurface, PlatformWheelEvent, pointerEvent, wheelEvent } from "../support/fakes.js";
import { recorded } from "../support/recording-proxy.js";

const POINTER = [["pointerleave", "leave"], ["pointerdown", "down"], ["pointermove", "move"], ["pointerup", "up"], ["pointercancel", "cancel"], ["pointerover", "over"], ["pointerout", "out"], ["dblclick", "double"]];
const FIELDS = ["clientX", "clientY", "button", "buttons", "pointerId", "pointerType", "shiftKey", "ctrlKey", "altKey", "metaKey", "timeStamp", "target", "preventDefault"];
const WHEEL_FIELDS = ["clientX", "clientY", "button", "buttons", "pointerId", "pointerType", "shiftKey", "ctrlKey", "altKey", "metaKey", "deltaX", "deltaY", "deltaZ", "deltaMode", "timeStamp", "target", "preventDefault"];
const KEYS_OF_A_FACT = ["type", "at", "screen", "hit", "focus", "button", "buttons", "pointerId", "pointerType", "key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "deltaX", "deltaY", "deltaZ", "deltaMode", "time"];
const refused = (name, call, also = () => true) => assert.throws(call, (e) => e instanceof TypeError && e.message.startsWith(`${name}: `) && also(e), `refused with a TypeError beginning "${name}: "`);

/** An open capture over fresh fakes; `extra` overrides the declaration. */
function opened(extra = {}) {
	const platform = fakePlatform();
	const { declaration, delivered } = declarationOver(platform, extra);
	const result = openCapture(declaration);
	assert.equal(result.ok, true);
	return { platform, delivered, capture: result.capture };
}

/** A point whose x and y are getters on its prototype, as a browser's DOMPoint holds them. */
class GetterPoint {
	#x;
	#y;
	constructor(x, y) {
		this.#x = x;
		this.#y = y;
	}
	get x() {
		return this.#x;
	}
	get y() {
		return this.#y;
	}
}

test("IC4: each of the eight pointer events on the surface becomes one fact of its type, delivered before the listener returns", () => {
	const { platform, delivered } = opened();
	for (const [name, type] of POINTER) {
		const before = delivered.length;
		assert.equal(platform.surface.fire(name, pointerEvent()), undefined, "the listener answers undefined");
		assert.equal(delivered.length, before + 1);
		assert.equal(delivered.at(-1).fact.type, type);
	}
});

test("IC5: a pointer fact holds exactly its twenty-one properties, in order, its key and wheel fields null, its time the event's timeStamp", () => {
	const target = { kind: "child" };
	const { platform, delivered } = opened({ hit: () => "the hit" });
	platform.surface.fire("pointerdown", pointerEvent({ clientX: 10.25, clientY: -3, button: 0, buttons: 1, pointerId: 9, pointerType: "pen", shiftKey: true, metaKey: 1, target, key: "x", code: "KeyX", repeat: true, deltaX: 4, deltaY: 5, deltaZ: 6, deltaMode: 1, timeStamp: 1234.125 }));
	const { fact } = delivered[0];
	assert.deepEqual(Object.keys(fact), ["type", "at", "screen", "hit", "focus", "button", "buttons", "pointerId", "pointerType", "key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "deltaX", "deltaY", "deltaZ", "deltaMode", "time"]);
	assert.deepEqual(fact, { type: "down", at: { x: 20.5, y: -6 }, screen: { x: 10.25, y: -3 }, hit: "the hit", focus: null, button: 0, buttons: 1, pointerId: 9, pointerType: "pen", key: null, code: null, repeat: null, shiftKey: true, ctrlKey: false, altKey: false, metaKey: true, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 1234.125 });
	assert.deepEqual(Object.keys(fact.at), ["x", "y"]);
	assert.deepEqual(Object.keys(fact.screen), ["x", "y"]);
});

test("I4: every reading of IC5 for a pointer event -- button absent, null, -1 and 2; buttons, pointerId and pointerType absent or of another type; modifiers of every truthiness", () => {
	const { platform, delivered } = opened();
	const fire = (fields, drop = []) => {
		const event = pointerEvent(fields);
		for (const name of drop) delete event[name];
		platform.surface.fire("pointermove", event);
		return delivered.at(-1).fact;
	};
	assert.equal(fire({}, ["button"]).button, 0, "button absent");
	assert.equal(fire({ button: undefined }).button, 0);
	assert.equal(fire({ button: null }).button, 0, "button null");
	assert.equal(fire({ button: -1 }).button, -1);
	assert.equal(fire({ button: 2 }).button, 2);
	assert.ok(Object.is(fire({ button: -0 }).button, -0), "the event's own number, verbatim");
	for (const name of ["buttons", "pointerId"]) {
		assert.equal(fire({}, [name])[name], null, `${name} absent`);
		for (const value of ["1", 1.5, NaN, Infinity, null, 2 ** 53, {}, true]) assert.equal(fire({ [name]: value })[name], null, `${name} ${String(value)}`);
		assert.equal(fire({ [name]: 3 })[name], 3);
		assert.equal(fire({ [name]: -5 })[name], -5);
	}
	assert.equal(fire({}, ["pointerType"]).pointerType, null);
	for (const value of [5, null, {}, true]) assert.equal(fire({ pointerType: value }).pointerType, null);
	assert.equal(fire({ pointerType: "" }).pointerType, "", "any string, the empty one among them");
	assert.equal(fire({ pointerType: "touch" }).pointerType, "touch");
	for (const name of ["shiftKey", "ctrlKey", "altKey", "metaKey"]) {
		for (const value of [0, "", null, undefined, false, NaN, 0n]) assert.equal(fire({ [name]: value })[name], false, `${name} ${String(value)}`);
		assert.equal(fire({}, [name])[name], false, `${name} absent`);
		for (const value of [1, "x", {}, [], true, -1, 1n, () => 0]) assert.equal(fire({ [name]: value })[name], true, `${name} ${typeof value}`);
	}
	const fractional = fire({ clientX: 0.1 + 0.2, clientY: 1e-300 });
	assert.ok(fractional.screen.x === 0.1 + 0.2 && fractional.screen.y === 1e-300, "a fractional clientX, exactly");
});

test("I6: screen holds exactly the event's numbers and at exactly the conversion's, under Object.is, -0 and a getter-backed point among them", () => {
	let answer;
	const { platform, delivered } = opened({ toDrawing: () => answer });
	for (const [clientX, clientY, x, y] of [[-0, 0, -0, -0], [1.5, -2.25, 1 / 3, 2 ** -1074], [Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MIN_VALUE, 1e308]]) {
		answer = new GetterPoint(x, y);
		platform.surface.fire("pointermove", pointerEvent({ clientX, clientY }));
		const { fact } = delivered.at(-1);
		assert.ok(Object.is(fact.screen.x, clientX) && Object.is(fact.screen.y, clientY), `screen ${clientX}, ${clientY}`);
		assert.ok(Object.is(fact.at.x, x) && Object.is(fact.at.y, y), `at ${x}, ${y}`);
		assert.notEqual(fact.at, answer, "a fresh frozen record of the answer's numbers, never the answer");
	}
});

test("I6, IC2 rule 4: the conversion is handed a fresh frozen screen point; its answer's x and y are both read before either is judged", () => {
	const handed = [];
	const reads = [];
	let answer = { x: 1, y: 2 };
	const { platform, delivered } = opened({ toDrawing: (screen) => (handed.push(screen), answer) });
	platform.surface.fire("pointermove", pointerEvent({ clientX: 4, clientY: 5 }));
	platform.surface.fire("pointermove", pointerEvent({ clientX: 4, clientY: 5 }));
	assert.ok(Object.isFrozen(handed[0]) && handed[0] !== handed[1], "fresh and frozen each time");
	assert.deepEqual(handed[0], { x: 4, y: 5 });
	assert.equal(delivered[0].fact.screen, handed[0], "the very screen point the fact holds");
	answer = {
		get x() {
			reads.push("x");
			return NaN;
		},
		get y() {
			reads.push("y");
			return 0;
		},
	};
	refused("toDrawing", () => platform.surface.fire("pointermove", pointerEvent()));
	assert.deepEqual(reads, ["x", "y"], "y read though x is refused, as a point is read");
	// a function is no object, even one holding finite x and y (IC2 rule 5)
	for (const bad of [Object.assign(() => 0, { x: 1, y: 1 }), () => ({ x: 1, y: 1 }), null, undefined, 5, "p", { x: 1 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: "1", y: 1 }, { x: 1n, y: 1 }]) {
		answer = bad;
		refused("toDrawing", () => platform.surface.fire("pointermove", pointerEvent()));
	}
	answer = {
		get x() {
			throw new RangeError("no x");
		},
	};
	refused("toDrawing", () => platform.surface.fire("pointermove", pointerEvent()), (e) => e.message.endsWith("could not be read: an object"));
	assert.equal(delivered.length, 2, "nothing delivered for a refused answer");
});

test("I5: spies log each event's reads and calls in IC6's order -- the fields, the conversion, the hit, the delivery", () => {
	const log = [];
	const { platform } = opened({
		toDrawing: (s) => (log.push("toDrawing"), s),
		hit: () => (log.push("hit"), null),
		focus: () => (log.push("focus"), null),
		deliver: () => log.push("deliver"),
	});
	platform.surface.fire("pointerup", recorded(pointerEvent(), "event", log));
	assert.deepEqual(log, [...FIELDS.map((f) => `event get ${f}`), "toDrawing", "hit", "deliver"], "hit asked for a pointer fact, focus never");
});

test("I5: an event refused at each place stops the reading there, no later field read and no application function called", () => {
	const throwing = (field) => ({ get: (t, k) => (k === field ? (() => { throw `no ${field}`; })() : t[k]) });
	const cases = [
		["clientX", { clientX: NaN }],
		["clientX", { clientX: "1" }],
		["clientX", { clientX: Infinity }],
		["clientY", { clientY: -Infinity }],
		["clientY", { clientY: null }],
		["button", { button: 0.5 }],
		["button", { button: "0" }],
		["button", { button: 2 ** 53 }],
		["button", { button: NaN }],
		["preventDefault", { preventDefault: undefined }],
		["preventDefault", { preventDefault: {} }],
	];
	for (const [stop, fields] of cases) {
		const log = [];
		const { platform } = opened({ toDrawing: () => (log.push("toDrawing"), { x: 0, y: 0 }), hit: () => log.push("hit"), deliver: () => log.push("deliver") });
		refused("pointerdown", () => platform.surface.fire("pointerdown", recorded(pointerEvent(fields), "event", log)));
		assert.deepEqual(log, FIELDS.slice(0, FIELDS.indexOf(stop) + 1).map((f) => `event get ${f}`), `stopped at ${stop}: ${JSON.stringify(fields)}`);
	}
	for (const field of FIELDS) {
		const log = [];
		const { platform } = opened({ toDrawing: () => (log.push("toDrawing"), { x: 0, y: 0 }), deliver: () => log.push("deliver") });
		refused("pointerdown", () => platform.surface.fire("pointerdown", recorded(pointerEvent(), "event", log, throwing(field))), (e) => e.message.includes(`could not be read: no ${field}`));
		assert.deepEqual(log, FIELDS.slice(0, FIELDS.indexOf(field) + 1).map((f) => `event get ${f}`), `a getter throwing at ${field}`);
	}
	for (const event of [undefined, null, 5, "event", true, Symbol("e"), () => pointerEvent()]) {
		const { platform, delivered } = opened();
		refused("pointerover", () => platform.surface.fire("pointerover", event));
		assert.equal(delivered.length, 0);
	}
});

test("I5: a clientX refused leaves a clientY getter that would close the capture unread", () => {
	const { platform, capture } = opened();
	let read = false;
	const event = pointerEvent({ clientX: NaN });
	Object.defineProperty(event, "clientY", {
		get() {
			read = true;
			capture.close();
			return 0;
		},
	});
	refused("pointerdown", () => platform.surface.fire("pointerdown", event));
	assert.equal(read, false);
	assert.equal(platform.surface.live.size, 8, "the capture is still open, all eight listeners added");
});

test("IC2 rule 3: an event is judged by typeof alone, its prototype never read; a browser's fields, inherited accessors, are read through ordinary access", () => {
	const log = [];
	const { platform, delivered } = opened();
	// fields as a browser holds them: accessors on the prototype, read with the event as receiver
	const fields = { clientX: 3, clientY: 4, button: 0, buttons: 0, pointerId: 11, pointerType: "mouse", shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, target: null };
	const proto = Object.defineProperties({ preventDefault() {} }, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { get() { return v; } }])));
	const event = recorded(Object.create(proto), "event", log);
	platform.surface.fire("pointerdown", event);
	assert.ok(!log.some((l) => /getPrototypeOf|ownKeys|getOwnPropertyDescriptor|has /.test(l)), log.join("\n"));
	assert.deepEqual(delivered[0].fact.screen, { x: 3, y: 4 });
	assert.equal(delivered[0].fact.pointerId, 11);
});

test("IC7: each application function is called with no receiver, once for each event, at IC6's step; deliver's answer is ignored", () => {
	const seen = [];
	const strict = (name, answer) =>
		function (...args) {
			// module code is strict, so this is undefined when the function is called with no receiver
			seen.push([name, this, args.length]);
			return answer;
		};
	const { platform } = opened({ toDrawing: strict("toDrawing", { x: 0, y: 0 }), hit: strict("hit", 1), deliver: strict("deliver", "ignored") });
	assert.equal(platform.surface.fire("pointerdown", pointerEvent()), undefined);
	assert.deepEqual(seen, [["toDrawing", undefined, 1], ["hit", undefined, 2], ["deliver", undefined, 2]]);
});

test("IC6 step 4: hit is handed the target and the fact so far -- hit null -- and the delivered fact is a fresh record holding the answer by reference", () => {
	const answer = { mine: true };
	const target = { the: "target" };
	let handed;
	const { platform, delivered } = opened({ hit: (t, fact) => ((handed = [t, fact]), answer) });
	platform.surface.fire("pointerdown", pointerEvent({ target }));
	const [t, before] = handed;
	assert.equal(t, target);
	assert.equal(before.hit, null);
	assert.ok(Object.isFrozen(before));
	const { fact } = delivered[0];
	assert.notEqual(fact, before);
	assert.equal(fact.hit, answer, "the very value answered");
	assert.ok(!Object.isFrozen(answer), "never frozen");
	assert.deepEqual({ ...fact, hit: null }, before, "of the same form, the answer apart");
	assert.equal(fact.at, before.at, "the same frozen point");
	const { platform: other, delivered: without } = opened();
	other.surface.fire("pointerdown", pointerEvent({ target }));
	assert.equal(without[0].fact.hit, null, "no hit function: hit null");
});

test("IC2 rule 3, D1: the target is handed to hit and never read by capture; a fact holds no event, target or function", () => {
	const log = [];
	const target = recorded({}, "target", log);
	const { platform, delivered } = opened({ hit: () => 0 });
	platform.surface.fire("pointerdown", pointerEvent({ target }));
	assert.deepEqual(log, []);
	assert.ok(Object.values(delivered[0].fact).every((v) => v !== target && typeof v !== "function"));
});

test("I3: capture touches nothing of the platform outside IC1 -- opening, a pointerdown whose delivery claims and takes the pointer, a keydown whose delivery claims, and close log exactly IC1's reads and each call once", () => {
	const log = [];
	const targetLog = [];
	const listeners = new Map();
	let surface, keys, pointer, key;
	// each fake method logs its call and whether its receiver is its own object, touching nothing of it
	const call = (name, self, own, args = []) => log.push(`call ${name}${args.length ? ` ${args.join(" ")}` : ""}${self === own() ? "" : " WRONG RECEIVER"}`);
	surface = recorded({
		addEventListener(name, listener) {
			listeners.set(`surface ${name}`, listener);
			call("surface.addEventListener", this, () => surface, [name, typeof listener]);
		},
		removeEventListener(name, listener) {
			call("surface.removeEventListener", this, () => surface, [name, listener === listeners.get(`surface ${name}`)]);
		},
		setPointerCapture(pointerId) {
			call("surface.setPointerCapture", this, () => surface, [pointerId]);
		},
	}, "surface", log);
	keys = recorded({
		addEventListener(name, listener) {
			listeners.set(`keys ${name}`, listener);
			call("keys.addEventListener", this, () => keys, [name, typeof listener]);
		},
		removeEventListener(name, listener) {
			call("keys.removeEventListener", this, () => keys, [name, listener === listeners.get(`keys ${name}`)]);
		},
	}, "keys", log);
	const target = recorded({}, "target", targetLog);
	const modifiers = { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, target };
	pointer = recorded({ clientX: 1, clientY: 2, button: 0, buttons: 1, pointerId: 3, pointerType: "mouse", ...modifiers, preventDefault() { call("pointer.preventDefault", this, () => pointer); } }, "pointer", log);
	key = recorded({ key: "a", code: "KeyA", repeat: false, ...modifiers, preventDefault() { call("key.preventDefault", this, () => key); } }, "key", log);
	const result = openCapture({
		surface,
		keys,
		toDrawing: (s) => s,
		hit: () => "hit",
		focus: () => "focus",
		deliver: (fact, reply) => {
			reply.claim();
			if (fact.type === "down") reply.takePointer();
		},
	});
	assert.equal(result.ok, true);
	listeners.get("surface pointerdown")(pointer);
	listeners.get("keys keydown")(key);
	result.capture.close();
	const POINTER_NAMES = POINTER.map(([n]) => n);
	assert.deepEqual(log, [
		"surface get addEventListener",
		"surface get removeEventListener",
		"surface get setPointerCapture",
		"keys get addEventListener",
		"keys get removeEventListener",
		...POINTER_NAMES.map((n) => `call surface.addEventListener ${n} function`),
		"call keys.addEventListener keydown function",
		"call keys.addEventListener keyup function",
		...FIELDS.map((f) => `pointer get ${f}`),
		"call pointer.preventDefault",
		"call surface.setPointerCapture 3",
		...["key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "timeStamp", "target", "preventDefault"].map((f) => `key get ${f}`),
		"call key.preventDefault",
		"call keys.removeEventListener keyup true",
		"call keys.removeEventListener keydown true",
		...[...POINTER_NAMES].reverse().map((n) => `call surface.removeEventListener ${n} true`),
	]);
	assert.deepEqual(targetLog, [], "the targets' logs are empty");
});

test("I9: an exception from each application function propagates out of the listener unchanged, nothing delivered after a throw before deliver", () => {
	for (const name of ["toDrawing", "hit", "deliver"]) {
		const thrown = new SyntaxError(`${name}'s own`);
		const calls = [];
		const fn = (answer) => (...args) => {
			calls.push(args.length);
			return answer;
		};
		const { platform } = opened({
			toDrawing: name === "toDrawing" ? () => { throw thrown; } : fn({ x: 0, y: 0 }),
			hit: name === "hit" ? () => { throw thrown; } : fn(null),
			deliver: name === "deliver" ? () => { throw thrown; } : () => calls.push("delivered"),
		});
		assert.throws(() => platform.surface.fire("pointermove", pointerEvent()), (e) => e === thrown, name);
		if (name !== "deliver") assert.ok(!calls.includes("delivered"));
	}
	const notAnError = { not: "an Error" };
	const { platform } = opened({ hit: () => { throw notAnError; } });
	assert.throws(() => platform.surface.fire("pointerdown", pointerEvent()), (e) => e === notAnError, "a thrown value that is no Error propagates too");
});

test("I9: a getter or trap throwing while an event is read is rethrown as the listener's TypeError, beginning with the event's name", () => {
	const { platform } = opened();
	const event = new Proxy(pointerEvent(), { get() { throw new Error("trap"); } });
	refused("pointerout", () => platform.surface.fire("pointerout", event), (e) => e.message.endsWith("could not be read: an object"));
	const { proxy, revoke } = Proxy.revocable(pointerEvent(), {});
	revoke();
	refused("dblclick", () => platform.surface.fire("dblclick", proxy), (e) => e.message.includes("could not be read:"));
	const unreadable = { get message() { throw new Error("no message"); } };
	const weird = new Proxy(pointerEvent(), { get() { throw unreadable; } });
	refused("pointerup", () => platform.surface.fire("pointerup", weird), (e) => e.message.includes("could not be read:"));
});

test("I9, IC7: a delivery that closes its own capture -- the reply stays live, later events make no fact", () => {
	let capture;
	const answers = [];
	const platform = fakePlatform();
	({ capture } = openCapture({ ...declarationOver(platform).declaration, deliver: (fact, reply) => {
		capture.close();
		reply.claim();
		answers.push([fact.type, reply.takePointer()]);
	} }));
	const listener = platform.log.find((c) => c.args[0] === "pointerdown").args[1];
	const event = pointerEvent();
	listener(event);
	assert.deepEqual(answers, [["down", true]]);
	assert.equal(event.prevented, 1);
	listener(pointerEvent());
	assert.equal(answers.length, 1);
});

test("I9, IC7: a delivery that closes another capture, and one that dispatches a nested event, follow IC3 and IC7", () => {
	const order = [];
	const first = fakePlatform();
	const second = fakePlatform();
	let other;
	({ capture: other } = openCapture({ ...declarationOver(second).declaration, deliver: (f) => order.push(`second ${f.type}`) }));
	const outerReplies = [];
	openCapture({ ...declarationOver(first).declaration, deliver: (fact, reply) => {
		order.push(`first ${fact.type} begins`);
		if (fact.type === "down") {
			second.surface.fire("pointermove", pointerEvent());
			other.close();
			second.log.find((c) => c.args[0] === "pointermove").args[1](pointerEvent());
			first.surface.fire("pointerup", pointerEvent());
			outerReplies.push(reply);
			assert.equal(reply.takePointer(), true, "the outer reply is still live after a nested delivery");
		}
		order.push(`first ${fact.type} ends`);
	} });
	first.surface.fire("pointerdown", pointerEvent());
	assert.deepEqual(order, ["first down begins", "second move", "first up begins", "first up ends", "first down ends"]);
	assert.throws(() => outerReplies[0].claim(), (e) => e.constructor === Error && e.message.startsWith("claim: "), "once its delivery ended");
});

test("IC2, a browser's dispatch: over Node.js's own EventTarget, every listener runs, a claim is seen by a later listener, and the target is the platform's", () => {
	const surface = new PlatformSurface();
	const seen = [];
	const result = openCapture({
		surface,
		toDrawing: (s) => ({ x: s.x + 0.5, y: s.y }),
		hit: (target) => target === surface,
		deliver: (fact, reply) => {
			seen.push([fact.type, fact.at.x, fact.hit, fact.pointerId]);
			if (fact.type === "down") {
				reply.claim();
				reply.takePointer();
			}
		},
	});
	assert.equal(result.ok, true);
	const later = [];
	surface.addEventListener("pointerdown", (event) => later.push(event.defaultPrevented));
	const down = new PlatformPointerEvent("pointerdown", { clientX: 2, pointerId: 5 });
	surface.dispatchEvent(down);
	surface.dispatchEvent(new PlatformPointerEvent("pointermove", { clientX: 3, pointerId: 5 }));
	assert.deepEqual(seen, [["down", 2.5, true, 5], ["move", 3.5, true, 5]]);
	assert.deepEqual(later, [true], "the later listener saw the claim");
	assert.equal(down.defaultPrevented, true);
	assert.deepEqual(surface.captured, [5]);
	result.capture.close();
	surface.dispatchEvent(new PlatformPointerEvent("pointermove", { clientX: 4 }));
	assert.equal(seen.length, 2, "removed from the EventTarget");
});

test("IC4: capture queues and merges nothing -- a key event delivered to a pointer listener is read as a pointer event, and refused for its coordinates", () => {
	const { platform, delivered } = opened();
	refused("pointermove", () => platform.surface.fire("pointermove", keyEvent()));
	assert.equal(delivered.length, 0);
});

// ---- 0.2.0: the wheel and the context menu as pointer facts (IC4, IC5, IC6), and every fact's time ----

test("I15: a wheel event's fact holds its deltas under Object.is, -0 among them, and ctrlKey as given; its keys in IC5's order", () => {
	const { platform, delivered } = opened({ listen: ["wheel"], hit: () => "under" });
	const cases = [[0, 120, 0], [-0, -0, -0], [1.5, -2.9597661495, 1e-300], [-Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE], [0.1 + 0.2, -3.316395998, 7]];
	for (const [deltaX, deltaY, deltaZ] of cases) {
		for (const ctrlKey of [false, true]) {
			platform.surface.fire("wheel", wheelEvent({ deltaX, deltaY, deltaZ, ctrlKey, clientX: 3, clientY: 4, timeStamp: 55.5 }));
			const { fact } = delivered.at(-1);
			assert.deepEqual(Object.keys(fact), KEYS_OF_A_FACT);
			assert.equal(fact.type, "wheel");
			assert.ok(Object.is(fact.deltaX, deltaX) && Object.is(fact.deltaY, deltaY) && Object.is(fact.deltaZ, deltaZ), `${deltaX}, ${deltaY}, ${deltaZ}`);
			assert.equal(fact.ctrlKey, ctrlKey, "ctrlKey as given: a pinch and Ctrl with the wheel alike");
		}
	}
	platform.surface.fire("wheel", wheelEvent({ deltaX: -0, deltaY: 30, deltaZ: 0, deltaMode: 1, clientX: 3, clientY: 4, timeStamp: 55.5, buttons: 1, shiftKey: true }));
	assert.deepEqual(delivered.at(-1).fact, { type: "wheel", at: { x: 6, y: 8 }, screen: { x: 3, y: 4 }, hit: "under", focus: null, button: 0, buttons: 1, pointerId: null, pointerType: null, key: null, code: null, repeat: null, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, deltaX: -0, deltaY: 30, deltaZ: 0, deltaMode: 1, time: 55.5 });
});

test("I15: deltaMode 0, 1, 2 and -0 give 0, 1, 2 and 0; any other value null, never refusing", () => {
	const { platform, delivered } = opened({ listen: ["wheel"] });
	const mode = (deltaMode, drop = false) => {
		const event = wheelEvent({ deltaMode });
		if (drop) delete event.deltaMode;
		platform.surface.fire("wheel", event);
		return delivered.at(-1).fact.deltaMode;
	};
	assert.equal(mode(0), 0);
	assert.equal(mode(1), 1);
	assert.equal(mode(2), 2);
	assert.ok(Object.is(mode(-0), 0), "-0 gives 0, written v + 0");
	for (const other of [3, -1, 0.5, 1.0000001, NaN, Infinity, "1", "0", null, undefined, true, false, 1n, {}, [1]]) assert.equal(mode(other), null, String(other));
	assert.equal(mode(undefined, true), null, "absent");
});

test("I15: a non-finite delta refuses the event with no later field read and nothing called; deltaMode is read, never refusing, after the deltas", () => {
	for (const field of ["deltaX", "deltaY", "deltaZ"]) {
		for (const bad of [NaN, Infinity, -Infinity, "1", null, undefined, 1n, {}]) {
			const log = [];
			const { platform } = opened({ listen: ["wheel"], toDrawing: () => (log.push("toDrawing"), { x: 0, y: 0 }), hit: () => log.push("hit"), deliver: () => log.push("deliver") });
			refused("wheel", () => platform.surface.fire("wheel", recorded(wheelEvent({ [field]: bad }), "event", log)), (e) => e.message.includes(field));
			assert.deepEqual(log, WHEEL_FIELDS.slice(0, WHEEL_FIELDS.indexOf(field) + 1).map((f) => `event get ${f}`), `${field} ${String(bad)}: stopped there`);
		}
	}
	for (const field of WHEEL_FIELDS) {
		const log = [];
		const { platform } = opened({ listen: ["wheel"], deliver: () => log.push("deliver") });
		const hooks = { get: (t, k) => (k === field ? (() => { throw `no ${field}`; })() : t[k]) };
		refused("wheel", () => platform.surface.fire("wheel", recorded(wheelEvent(), "event", log, hooks)), (e) => e.message.includes(`could not be read: no ${field}`));
		assert.deepEqual(log, WHEEL_FIELDS.slice(0, WHEEL_FIELDS.indexOf(field) + 1).map((f) => `event get ${f}`), `a getter throwing at ${field}`);
	}
});

test("I15, IC6: a wheel event's reads in order -- the pointer fields, the modifiers, deltaX, deltaY, deltaZ, deltaMode, timeStamp, target, preventDefault -- then the conversion, the hit and the delivery", () => {
	const log = [];
	const { platform } = opened({ listen: ["wheel"], toDrawing: (s) => (log.push("toDrawing"), s), hit: () => (log.push("hit"), null), focus: () => log.push("focus"), deliver: () => log.push("deliver") });
	platform.surface.fire("wheel", recorded(wheelEvent(), "event", log));
	assert.deepEqual(log, [...WHEEL_FIELDS.map((f) => `event get ${f}`), "toDrawing", "hit", "deliver"]);
	const other = [];
	const { platform: noWheel } = opened({ listen: ["wheel", "context-menu"] });
	for (const name of ["pointerdown", "contextmenu", "dblclick"]) noWheel.surface.fire(name, recorded(pointerEvent({ deltaX: NaN }), "event", other));
	assert.ok(!other.some((l) => /delta/.test(l)), "no delta is read of any event but a wheel's");
});

test("I15: a browser's wheel event, its fields inherited accessors, over Node.js's own EventTarget: its deltas and unit read through ordinary access", () => {
	const surface = new PlatformSurface();
	const seen = [];
	const { capture } = openCapture({ surface, toDrawing: (s) => s, deliver: (fact) => seen.push(fact), listen: ["wheel"] });
	surface.dispatchEvent(new PlatformWheelEvent("wheel", { deltaX: 1, deltaY: -2.5, deltaZ: 0, deltaMode: 2, ctrlKey: true, clientX: 9 }));
	assert.deepEqual([seen[0].type, seen[0].deltaX, seen[0].deltaY, seen[0].deltaZ, seen[0].deltaMode, seen[0].ctrlKey, seen[0].screen.x, seen[0].pointerId], ["wheel", 1, -2.5, 0, 2, true, 9, null]);
	assert.ok(typeof seen[0].time === "number" && Number.isFinite(seen[0].time), "an Event's own timeStamp, a number the platform gave");
	capture.close();
});

test("I17: a context-menu fact is a pointer fact -- its fields read as a pointer event's, the conversion and the hit asked, its deltas and deltaMode null", () => {
	const log = [];
	const target = { kind: "pressed" };
	const { platform, delivered } = opened({ listen: ["context-menu"], toDrawing: (s) => (log.push("toDrawing"), { x: s.x + 1, y: s.y }), hit: (t, fact) => (log.push(["hit", t === target, fact.type, fact.hit]), "hit"), focus: () => log.push("focus"), deliver: () => log.push("deliver") });
	platform.surface.fire("contextmenu", recorded(pointerEvent({ button: 2, buttons: 2, pointerId: 1, pointerType: "mouse", target, clientX: 5, clientY: 6, timeStamp: 77, deltaX: 1, deltaMode: 1 }), "event", log));
	assert.deepEqual(log, [...FIELDS.map((f) => `event get ${f}`), "toDrawing", ["hit", true, "context-menu", null], "deliver"], "hit asked with the target and the fact so far; focus never");
	const delivering = opened({ listen: ["context-menu"], hit: () => "hit" });
	delivering.platform.surface.fire("contextmenu", pointerEvent({ button: 2, buttons: 2, pointerId: 1, clientX: 5, clientY: 6, timeStamp: 77 }));
	assert.deepEqual(delivering.delivered[0].fact, { type: "context-menu", at: { x: 10, y: 12 }, screen: { x: 5, y: 6 }, hit: "hit", focus: null, button: 2, buttons: 2, pointerId: 1, pointerType: "mouse", key: null, code: null, repeat: null, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, deltaX: null, deltaY: null, deltaZ: null, deltaMode: null, time: 77 });
	const mouse = pointerEvent({ button: 2, clientX: 1, clientY: 1 });
	delete mouse.pointerId;
	delete mouse.pointerType;
	delivering.platform.surface.fire("contextmenu", mouse);
	assert.deepEqual([delivering.delivered[1].fact.pointerId, delivering.delivered[1].fact.pointerType], [null, null], "a MouseEvent's menu, as some systems deliver it, carries no pointerId");
	refused("contextmenu", () => delivering.platform.surface.fire("contextmenu", pointerEvent({ clientX: NaN })), (e) => e.message.startsWith("contextmenu: the event's clientX"));
});

test("I16: every pointer fact's time is its event's timeStamp under Object.is when a finite number, and null for NaN, an infinity, a string or an absent field", () => {
	const { platform, delivered } = opened({ listen: ["wheel", "context-menu"] });
	const time = (name, timeStamp, drop = false) => {
		const event = name === "wheel" ? wheelEvent({ timeStamp }) : pointerEvent({ timeStamp });
		if (drop) delete event.timeStamp;
		platform.surface.fire(name, event);
		return delivered.at(-1).fact.time;
	};
	for (const [name] of [...POINTER, ["wheel"], ["contextmenu"]]) {
		for (const value of [0, -0, 1234.567, 1e-300, Number.MAX_VALUE, -5, 2 ** 53 + 2]) assert.ok(Object.is(time(name, value), value), `${name} ${value}`);
		for (const value of [NaN, Infinity, -Infinity, "12", null, undefined, 12n, {}, true]) assert.equal(time(name, value), null, `${name} ${String(value)}`);
		assert.equal(time(name, undefined, true), null, `${name}: absent`);
	}
});

test("I16: timeStamp is read after the modifiers and before target, a getter that throws refusing the event; step 4's fact, handed to hit, holds the five new properties", () => {
	const log = [];
	const { platform } = opened({ deliver: () => log.push("deliver") });
	const hooks = { get: (t, k) => (k === "timeStamp" ? (() => { throw new RangeError("no time"); })() : t[k]) };
	refused("pointermove", () => platform.surface.fire("pointermove", recorded(pointerEvent({ timeStamp: 1 }), "event", log, hooks)), (e) => e.message === "pointermove: the event's timeStamp could not be read: an object");
	assert.deepEqual(log, FIELDS.slice(0, FIELDS.indexOf("timeStamp") + 1).map((f) => `event get ${f}`), "stopped at timeStamp: target and preventDefault unread, nothing delivered");
	const handed = [];
	const { platform: hitting, delivered } = opened({ listen: ["wheel"], hit: (t, fact) => (handed.push(fact), "answer") });
	hitting.surface.fire("pointerdown", pointerEvent({ timeStamp: 31 }));
	hitting.surface.fire("wheel", wheelEvent({ timeStamp: 32, deltaX: -0, deltaMode: 2 }));
	assert.deepEqual(Object.keys(handed[0]), KEYS_OF_A_FACT);
	assert.deepEqual([handed[0].hit, handed[0].focus, handed[0].time, handed[0].deltaX, handed[0].deltaMode], [null, null, 31, null, null]);
	assert.deepEqual([handed[1].type, handed[1].hit, handed[1].time, handed[1].deltaMode], ["wheel", null, 32, 2]);
	assert.ok(Object.is(handed[1].deltaX, -0));
	assert.deepEqual({ ...delivered[1].fact, hit: null }, handed[1], "the delivered fact, the answer apart");
});

test("I3, IC1: with listen naming all three, opening, a wheel, a context menu and a blur each claimed, and close log exactly IC1's reads -- the wheel's deltas and every event's timeStamp among them -- and each platform call once; no target is read", () => {
	const log = [];
	const targetLog = [];
	const listeners = new Map();
	let surface, keys;
	const call = (name, self, own, args = []) => log.push(`call ${name}${args.length ? ` ${args.join(" ")}` : ""}${self === own() ? "" : " WRONG RECEIVER"}`);
	surface = recorded({
		addEventListener(name, listener, ...rest) {
			listeners.set(`surface ${name}`, listener);
			call("surface.addEventListener", this, () => surface, [name, typeof listener, ...rest.map((o) => JSON.stringify(o))]);
		},
		removeEventListener(name, listener, ...rest) {
			call("surface.removeEventListener", this, () => surface, [name, listener === listeners.get(`surface ${name}`), ...rest]);
		},
		setPointerCapture(pointerId) {
			call("surface.setPointerCapture", this, () => surface, [pointerId]);
		},
	}, "surface", log);
	keys = recorded({
		addEventListener(name, listener, ...rest) {
			listeners.set(`keys ${name}`, listener);
			call("keys.addEventListener", this, () => keys, [name, typeof listener, ...rest]);
		},
		removeEventListener(name, listener, ...rest) {
			call("keys.removeEventListener", this, () => keys, [name, listener === listeners.get(`keys ${name}`), ...rest]);
		},
	}, "keys", log);
	const target = recorded({}, "target", targetLog);
	const modifiers = { shiftKey: false, ctrlKey: true, altKey: false, metaKey: false, timeStamp: 5, target };
	let wheel, menu, blur;
	wheel = recorded({ clientX: 1, clientY: 2, button: 0, buttons: 0, ...modifiers, deltaX: 0, deltaY: -1.5, deltaZ: 0, deltaMode: 0, preventDefault() { call("wheel.preventDefault", this, () => wheel); } }, "wheel", log);
	menu = recorded({ clientX: 1, clientY: 2, button: 2, buttons: 2, pointerId: 3, pointerType: "mouse", ...modifiers, preventDefault() { call("menu.preventDefault", this, () => menu); } }, "menu", log);
	blur = recorded({ timeStamp: 6, target, preventDefault() { call("blur.preventDefault", this, () => blur); } }, "blur", log);
	const result = openCapture({ surface, keys, toDrawing: (s) => s, hit: () => "hit", focus: () => "focus", listen: ["blur", "context-menu", "wheel"], deliver: (fact, reply) => reply.claim() });
	assert.equal(result.ok, true);
	listeners.get("surface wheel")(wheel);
	listeners.get("surface contextmenu")(menu);
	listeners.get("keys blur")(blur);
	result.capture.close();
	const POINTER_NAMES = POINTER.map(([n]) => n);
	const pointerReads = (label, extra = []) => ["clientX", "clientY", "button", "buttons", "pointerId", "pointerType", "shiftKey", "ctrlKey", "altKey", "metaKey", ...extra, "timeStamp", "target", "preventDefault"].map((f) => `${label} get ${f}`);
	assert.deepEqual(log, [
		"surface get addEventListener",
		"surface get removeEventListener",
		"surface get setPointerCapture",
		"keys get addEventListener",
		"keys get removeEventListener",
		...POINTER_NAMES.map((n) => `call surface.addEventListener ${n} function`),
		"call keys.addEventListener keydown function",
		"call keys.addEventListener keyup function",
		'call surface.addEventListener wheel function {"passive":false}',
		"call surface.addEventListener contextmenu function",
		"call keys.addEventListener blur function",
		...pointerReads("wheel", ["deltaX", "deltaY", "deltaZ", "deltaMode"]),
		"call wheel.preventDefault",
		...pointerReads("menu"),
		"call menu.preventDefault",
		"blur get timeStamp",
		"blur get preventDefault",
		"call blur.preventDefault",
		"call keys.removeEventListener blur true",
		"call surface.removeEventListener contextmenu true",
		"call surface.removeEventListener wheel true",
		"call keys.removeEventListener keyup true",
		"call keys.removeEventListener keydown true",
		...[...POINTER_NAMES].reverse().map((n) => `call surface.removeEventListener ${n} true`),
	]);
	assert.deepEqual(targetLog, [], "the targets' logs are empty");
});

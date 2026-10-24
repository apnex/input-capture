// beside-0.1.0 - I18 (CONTRACT.md; the compatibility guardrail, as RELEASES-0.2.md section 3.1 scopes it): 0.1.0's
// contract tables -- the declarations of I1 and IC3, the listeners of I2, the events of I4, I5 and I6, the
// replies of I8 and the lifecycle of IC3 -- run against the 0.1.0 release, as published, and against this
// release, give the same listeners, calls, reads and facts' first sixteen properties, but for the changes
// IC9's closing list names: a declaration with an own listen property is judged, every event's timeStamp is
// read -- so an event whose timeStamp getter throws is refused -- and every fact gains five properties after
// metaKey. Each run records a transcript -- every trap a recording Proxy runs, every platform call, every
// application function's arguments, every fact in full, every throw -- and this release's transcript, its
// timeStamp reads and its facts' last five properties taken out, must equal 0.1.0's; the listed changes are
// then each shown with both answers.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";
import vm from "node:vm";

import { openCapture as current } from "@apnex/input-capture";
import { keyEvent, pointerEvent } from "../support/fakes.js";
import { importReleased, integrityOf, RELEASED, untar } from "../support/released.js";
import { phantom, recorded, revoked, trapping } from "../support/recording-proxy.js";

let released;
let remove;
before(async () => {
	const loaded = await importReleased();
	released = loaded.module.openCapture;
	remove = loaded.remove;
});
after(() => remove?.());

const POINTER = ["pointerleave", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerover", "pointerout", "dblclick"];
const KEYS = ["keydown", "keyup"];
const POINTER_FIELDS = ["clientX", "clientY", "button", "buttons", "pointerId", "pointerType", "shiftKey", "ctrlKey", "altKey", "metaKey", "target", "preventDefault"];
const KEY_FIELDS = ["key", "code", "repeat", "shiftKey", "ctrlKey", "altKey", "metaKey", "target", "preventDefault"];
const NEW_KEYS = ["deltaX", "deltaY", "deltaZ", "deltaMode", "time"];

/** A fact as a transcript entry: its own properties, in order, compared under Object.is to their depth. */
const entryOf = (label, fact) => ({ [label]: Object.entries(fact) });
/** A throw as a transcript entry: its constructor's name and its message, or the value itself. */
const thrownEntry = (error) => (error instanceof Error ? `threw ${error.constructor.name}: ${error.message}` : `threw ${typeof error}`);

/** A surface and a key source, each a recording Proxy over methods that log every call, its arguments' count and whether its listener is the one added. */
function recordingPlatform(log, { throwOnAdd = -1, addThenThrow = false, throwOnRemove = [], refuse = false } = {}) {
	const live = new Map();
	let adds = 0;
	let removes = 0;
	const make = (label, withCapture) => {
		const object = {
			addEventListener(name, listener, ...rest) {
				log.push(`${label}.addEventListener ${name} ${typeof listener} ${2 + rest.length}`);
				const throwing = adds++ === throwOnAdd;
				if (throwing && !addThenThrow) throw new Error(`${label} refused ${name}`);
				live.set(`${label} ${name}`, listener);
				if (throwing) throw new Error(`${label} added ${name}, then refused`);
			},
			removeEventListener(name, listener, ...rest) {
				log.push(`${label}.removeEventListener ${name} ${live.get(`${label} ${name}`) === listener} ${2 + rest.length}`);
				if (throwOnRemove.includes(removes++)) throw new Error(`${label} refused to remove ${name}`);
			},
		};
		if (withCapture) {
			object.setPointerCapture = (pointerId) => {
				log.push(`${label}.setPointerCapture ${String(pointerId)}`);
				if (refuse) throw new Error("the pointer is not active");
			};
		}
		return recorded(object, label, log);
	};
	const surface = make("surface", true);
	const keys = make("keys", false);
	const fire = (on, name, event) => {
		const listener = live.get(`${on} ${name}`);
		if (listener === undefined) {
			log.push(`no listener for ${name} on ${on}`);
			return;
		}
		try {
			log.push(`listener answered ${String(listener(event))}`);
		} catch (error) {
			log.push(thrownEntry(error));
		}
	};
	return { surface, keys, fire };
}

/** The application's functions, each logging what it is handed. */
function application(log, { answer = (screen) => ({ x: screen.x * 2, y: screen.y - 1 }), reply = () => {} } = {}) {
	return {
		toDrawing: (screen) => {
			log.push({ toDrawing: [screen.x, screen.y, Object.isFrozen(screen)] });
			return answer(screen);
		},
		hit: (target, fact) => {
			log.push({ hitTarget: target }, entryOf("hit handed", fact));
			return { hit: fact.type };
		},
		focus: (target, fact) => {
			log.push({ focusTarget: target }, entryOf("focus handed", fact));
			return { focus: fact.key };
		},
		deliver: (fact, given) => {
			log.push(entryOf("delivered", fact));
			reply(fact, given, log);
		},
	};
}

/** One scenario's transcript, run against one release. */
function transcript(openCapture, scenario) {
	const log = [];
	try {
		scenario(openCapture, log);
	} catch (error) {
		log.push(thrownEntry(error));
	}
	return log;
}

/** This release's transcript as 0.1.0's would read: its timeStamp reads taken out, and its facts' last five properties, which must be IC5's five. */
function asReleased(log, counts) {
	const out = [];
	for (const entry of log) {
		if (typeof entry === "string" && entry.endsWith(" get timeStamp")) {
			counts.timeStamp++;
			continue;
		}
		const label = typeof entry === "object" && entry !== null ? Object.keys(entry).find((k) => ["delivered", "hit handed", "focus handed"].includes(k)) : undefined;
		if (label !== undefined) {
			const properties = entry[label];
			assert.deepEqual(properties.slice(16).map(([key]) => key), NEW_KEYS, "the five properties after metaKey");
			counts.facts++;
			out.push({ [label]: properties.slice(0, 16) });
			continue;
		}
		out.push(entry);
	}
	return out;
}

/** Runs every scenario against both releases and holds each pair of transcripts equal but for the listed changes. */
function sameBesideReleased(scenarios) {
	const counts = { timeStamp: 0, facts: 0, entries: 0 };
	for (const [label, scenario] of scenarios) {
		const before = transcript(released, scenario);
		const now = transcript(current, scenario);
		counts.entries += before.length;
		assert.deepEqual(asReleased(now, counts), before, label);
	}
	return counts;
}

// ---- the declarations of I1 and IC3 ----

const surfaceFake = () => ({ addEventListener() {}, removeEventListener() {}, setPointerCapture() {} });
const keysFake = () => ({ addEventListener() {}, removeEventListener() {} });
const accessor = (target, name) => Object.defineProperty(target, name, { get() {
	throw new Error("a declaration's getter was called");
}, enumerable: true, configurable: true });
const without = (object, name) => {
	const copy = { ...object };
	delete copy[name];
	return copy;
};

/** A declaration scenario: the declaration built over recording Proxies, opened, its answer and every read logged. */
const declaring = (build) => (openCapture, log) => {
	const result = openCapture(build(log));
	log.push(result.ok ? "opened" : JSON.stringify(result.problems));
	if (result.ok) result.capture.close();
};

function declarationScenarios() {
	const valid = (log) => ({ surface: recorded(surfaceFake(), "surface", log), toDrawing: (s) => s, deliver() {} });
	class Declaration {}
	const scenarios = [];
	const notPlain = [undefined, null, 0, "surface", true, 1n, Symbol("d"), [], () => ({}), new Date(0), new Declaration()];
	for (const value of notPlain) scenarios.push([`not a plain object: ${typeof value}`, declaring(() => value)]);
	scenarios.push(["inherits a valid declaration", declaring((log) => Object.create(valid(log)))]);
	scenarios.push(["a revoked Proxy", declaring((log) => revoked(valid(log)))]);
	for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]) scenarios.push([`a trapping ${trap}`, declaring((log) => trapping(valid(log), trap))]);
	scenarios.push(["another realm's declaration", declaring(() => vm.runInNewContext("({ surface: { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} }, toDrawing: (s) => s, deliver() {} })"))]);
	scenarios.push(["a null prototype", declaring((log) => Object.assign(Object.create(null), valid(log)))]);
	scenarios.push(["a symbol-named property", declaring((log) => ({ ...valid(log), [Symbol("s")]: 1 }))]);
	scenarios.push(["empty", declaring(() => ({}))]);
	scenarios.push(["unknown properties", declaring((log) => ({ ...valid(log), extra: 1, "a/b": 2, "c~d": 3, "": 4 }))]);
	for (const name of ["surface", "keys", "toDrawing", "hit", "focus", "deliver"]) {
		scenarios.push([`${name} present as undefined`, declaring((log) => ({ ...valid(log), keys: recorded(keysFake(), "keys", log), [name]: undefined }))]);
		scenarios.push([`${name} an accessor`, declaring((log) => accessor(without({ ...valid(log), keys: recorded(keysFake(), "keys", log) }, name), name))]);
	}
	scenarios.push(["a phantom surface", declaring(() => phantom({ toDrawing: (s) => s, deliver() {} }, "surface"))]);
	scenarios.push(["a phantom unknown key", declaring((log) => phantom(valid(log), "zz"))]);
	scenarios.push(["phantom keys and hit", declaring((log) => phantom(valid(log), "keys", "hit"))]);
	scenarios.push(["a phantom keys beside focus", declaring((log) => phantom({ ...valid(log), focus: () => 1 }, "keys"))]);
	const surfaces = [5, "s", null, () => ({}), Object.assign(() => ({}), surfaceFake()), revoked(surfaceFake()), trapping(surfaceFake(), "get"), without(surfaceFake(), "addEventListener"), without(surfaceFake(), "removeEventListener"), without(surfaceFake(), "setPointerCapture"), { ...surfaceFake(), setPointerCapture: 1 }];
	surfaces.forEach((surface, i) => scenarios.push([`surface ${i}`, declaring((log) => ({ ...valid(log), surface: typeof surface === "object" && surface !== null && !Array.isArray(surface) ? recorded(surface, "surface", log) : surface }))]));
	const sources = [5, null, () => ({}), revoked(keysFake()), trapping(keysFake(), "get"), without(keysFake(), "addEventListener"), without(keysFake(), "removeEventListener"), { addEventListener: "no", removeEventListener() {} }, keysFake()];
	sources.forEach((keys, i) => scenarios.push([`keys ${i}`, declaring((log) => ({ ...valid(log), keys: typeof keys === "object" && keys !== null ? recorded(keys, "keys", log) : keys }))]));
	scenarios.push(["the surface as key source", declaring((log) => {
		const surface = recorded(surfaceFake(), "surface", log);
		return { surface, keys: surface, toDrawing: (s) => s, deliver() {} };
	})]);
	scenarios.push(["inherited members", declaring((log) => ({ ...valid(log), surface: recorded(Object.create(surfaceFake()), "surface", log) }))]);
	scenarios.push(["a member that is no function stops the reading", declaring((log) => ({ ...valid(log), surface: recorded({ addEventListener: 0, removeEventListener() {}, setPointerCapture() {} }, "surface", log), keys: recorded(keysFake(), "keys", log) }))]);
	for (const name of ["toDrawing", "hit", "deliver"]) for (const value of [5, "f", null, {}, [], Symbol("f")]) scenarios.push([`${name} ${String(typeof value)}`, declaring((log) => ({ ...valid(log), [name]: value }))]);
	scenarios.push(["focus without keys", declaring((log) => ({ ...valid(log), focus: () => 1 }))]);
	scenarios.push(["focus 5 without keys", declaring((log) => ({ ...valid(log), focus: 5 }))]);
	scenarios.push(["keys 5 beside focus", declaring((log) => ({ ...valid(log), keys: 5, focus: () => 1 }))]);
	scenarios.push(["keys undefined beside focus", declaring((log) => ({ ...valid(log), keys: undefined, focus: () => 1 }))]);
	scenarios.push(["every problem, ordered", declaring(() => ({ surface: 5, keys: null, focus: 1, hit: 2, Z: 1, a: 1, "\u00e9": 1, B: 1 }))]);
	scenarios.push(["the whole reading order", declaring((log) => recorded({ deliver() {}, focus: () => 1, hit: () => 1, toDrawing: (s) => s, keys: recorded(keysFake(), "keys", log), surface: recorded(surfaceFake(), "surface", log), extra: 1 }, "declaration", log))]);
	scenarios.push(["a declaration whose descriptor read throws", declaring((log) => recorded({ ...valid(log), hit: () => 1 }, "declaration", log, { getOwnPropertyDescriptor: (t, key) => {
		if (key === "toDrawing") throw new Error("no descriptor");
		return Reflect.getOwnPropertyDescriptor(t, key);
	} }))]);
	scenarios.push(["a class and an async function", declaring((log) => ({ ...valid(log), toDrawing: class {}, deliver: async () => {} }))]);
	return scenarios;
}

test("I18: the declarations of I1 and IC3 give the same answer, the same reads and the same platform calls in both releases", () => {
	const counts = sameBesideReleased(declarationScenarios());
	assert.ok(counts.entries > 250, `${counts.entries} transcript entries compared`);
});

// ---- the listeners of I2 and the lifecycle of IC3 ----

/** An opening scenario: a capture over a recording platform, the platform's behaviour given, then closed, twice. */
const opening = (platformOptions, { keys = true, closing = true } = {}) => (openCapture, log) => {
	const platform = recordingPlatform(log, platformOptions);
	const declaration = { surface: platform.surface, toDrawing: (s) => s, deliver: () => log.push("delivered") };
	if (keys) declaration.keys = platform.keys;
	const result = openCapture(declaration);
	log.push(result.ok ? "opened" : JSON.stringify(result.problems));
	for (const name of [...POINTER, "wheel", "contextmenu"]) platform.fire("surface", name, pointerEvent());
	for (const name of [...KEYS, "blur"]) platform.fire("keys", name, keyEvent());
	if (closing && result.ok) {
		try {
			log.push(`close answered ${String(result.capture.close())}`);
		} catch (error) {
			log.push(thrownEntry(error));
		}
		log.push(`close again answered ${String(result.capture.close())}`);
	}
};

test("I18: the listeners of I2 -- added, in order, on the right object, with two arguments, no wheel, contextmenu or blur among them -- and their removal, and an addEventListener throwing at each place, are the same in both releases", () => {
	const scenarios = [["with a key source", opening({})], ["without a key source", opening({}, { keys: false })]];
	for (const addThenThrow of [false, true]) for (let at = 0; at < 10; at++) scenarios.push([`adding throws at ${at}${addThenThrow ? ", after adding" : ""}`, opening({ throwOnAdd: at, addThenThrow })]);
	scenarios.push(["removals throw while closing", opening({ throwOnRemove: [0, 3] })]);
	scenarios.push(["a removal throws while a failed opening takes back", opening({ throwOnAdd: 4, throwOnRemove: [0, 2] })]);
	const counts = sameBesideReleased(scenarios);
	assert.ok(counts.entries > 500);
	const log = transcript(current, opening({}));
	assert.deepEqual(log.filter((l) => typeof l === "string" && /^no listener/.test(l)), ["no listener for wheel on surface", "no listener for contextmenu on surface", "no listener for blur on keys"], "with listen absent, none of the three is listened for");
});

// ---- the events of I4, I5 and I6, and the replies of I8 ----

/** An event scenario: a capture over a recording platform with every application function, the given events fired at it in turn. */
const firing = (events, { answer, reply, refuse } = {}) => (openCapture, log) => {
	const platform = recordingPlatform(log, { refuse });
	const result = openCapture({ surface: platform.surface, keys: platform.keys, ...application(log, { answer, reply }) });
	for (const [on, name, make] of events) platform.fire(on, name, make(log));
	result.capture.close();
};

/** An event of the given fields, as a recording Proxy logging its reads; `drop` names fields deleted. */
const pointer = (fields = {}, drop = []) => (log) => {
	const event = pointerEvent(fields);
	for (const name of drop) delete event[name];
	return recorded(event, "event", log);
};
const key = (fields = {}, drop = []) => (log) => {
	const event = keyEvent(fields);
	for (const name of drop) delete event[name];
	return recorded(event, "event", log);
};
/** An event whose getter for `field` throws, as a recording Proxy logging its reads. */
const throwingAt = (make, field) => (log) => recorded(make(), "event", log, { get: (t, k) => (k === field ? (() => { throw `no ${field}`; })() : t[k]) });

function pointerEventTable() {
	const rows = [{}, { button: undefined }, { button: null }, { button: -1 }, { button: 2 }, { button: -0 }, { clientX: 0.1 + 0.2, clientY: 1e-300 }, { clientX: -0, clientY: 0 }, { clientX: Number.MAX_VALUE, clientY: -Number.MAX_VALUE }, { timeStamp: 12.5 }, { timeStamp: NaN }, { timeStamp: "late" }, { deltaX: 3, deltaY: NaN, deltaMode: 1 }];
	for (const name of ["buttons", "pointerId"]) for (const value of ["1", 1.5, NaN, Infinity, null, 2 ** 53, {}, true, 3, -5]) rows.push({ [name]: value });
	for (const value of [5, null, {}, true, "", "touch"]) rows.push({ pointerType: value });
	for (const name of ["shiftKey", "ctrlKey", "altKey", "metaKey"]) for (const value of [0, "", null, NaN, 0n, 1, "x", {}, [], true, -1, 1n]) rows.push({ [name]: value });
	const refusals = [{ clientX: NaN }, { clientX: "1" }, { clientX: Infinity }, { clientY: -Infinity }, { clientY: null }, { button: 0.5 }, { button: "0" }, { button: 2 ** 53 }, { button: NaN }, { preventDefault: undefined }, { preventDefault: {} }];
	const events = [];
	for (const name of POINTER) {
		for (const fields of [...rows, ...refusals]) events.push(["surface", name, pointer(fields)]);
		for (const drop of ["button", "buttons", "pointerId", "pointerType", "shiftKey"]) events.push(["surface", name, pointer({}, [drop])]);
		for (const field of POINTER_FIELDS) events.push(["surface", name, throwingAt(() => pointerEvent(), field)]);
		for (const value of [undefined, null, 5, "event", true, Symbol("e"), () => pointerEvent()]) events.push(["surface", name, () => value]);
	}
	return events;
}

function keyEventTable() {
	const rows = [{}, { timeStamp: 3 }, { timeStamp: Infinity }, { button: 2, buttons: 3, pointerId: 4, pointerType: "pen", clientX: NaN }];
	for (const name of ["key", "code"]) for (const value of [5, null, undefined, {}, true, Symbol("k"), "", "Enter"]) rows.push({ [name]: value });
	for (const name of ["repeat", "shiftKey", "ctrlKey", "altKey", "metaKey"]) for (const value of [0, "", null, undefined, false, NaN, 1, "x", {}, true]) rows.push({ [name]: value });
	const events = [];
	for (const name of KEYS) {
		for (const fields of [...rows, { preventDefault: undefined }, { preventDefault: {} }, { preventDefault: 5 }, { preventDefault: "f" }]) events.push(["keys", name, key(fields)]);
		for (const drop of ["key", "code", "repeat", "metaKey"]) events.push(["keys", name, key({}, [drop])]);
		for (const field of KEY_FIELDS) events.push(["keys", name, throwingAt(() => keyEvent(), field)]);
		for (const value of [null, 7, "k", () => keyEvent()]) events.push(["keys", name, () => value]);
	}
	return events;
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

test("I18: the events of I4 and I5 -- every reading, every refusal, a getter throwing at each field -- give the same reads, calls and facts' first sixteen properties in both releases", () => {
	const counts = sameBesideReleased([["pointer events", firing(pointerEventTable())], ["key events", firing(keyEventTable())]]);
	assert.ok(counts.timeStamp > 500, `${counts.timeStamp} timeStamp reads taken out of this release's transcripts`);
	assert.ok(counts.facts > 1000, `${counts.facts} facts compared in their first sixteen properties`);
});

test("I18: the conversions of I6 -- exact numbers, a getter-backed point, every refused answer -- are the same in both releases", () => {
	const answers = [new GetterPoint(-0, -0), new GetterPoint(1 / 3, 2 ** -1074), { x: -Number.MIN_VALUE, y: 1e308 }, Object.assign(() => 0, { x: 1, y: 1 }), null, undefined, 5, "p", { x: 1 }, { x: NaN, y: 0 }, { x: 0, y: Infinity }, { x: "1", y: 1 }, { x: 1n, y: 1 }, { get x() {
		throw new RangeError("no x");
	} }];
	const scenarios = answers.map((answer, i) => [`answer ${i}`, firing([["surface", "pointermove", pointer({ clientX: 4, clientY: 5 })], ["surface", "dblclick", pointer()]], { answer: () => answer })]);
	sameBesideReleased(scenarios);
});

test("I18: the replies of I8 -- claims, pointers taken and refused, replies used after their delivery -- are the same in both releases", () => {
	const kept = [];
	const policies = [
		["claim twice", (fact, reply, log) => log.push(`claim ${String(reply.claim())} ${String(reply.claim())}`)],
		["take twice", (fact, reply, log) => log.push(`take ${reply.takePointer()} ${reply.takePointer()}`)],
		["claim, take, then throw", (fact, reply, log) => {
			reply.claim();
			log.push(`take ${reply.takePointer()}`);
			throw new Error("after asking");
		}],
		["kept for later", (fact, reply) => kept.push(reply)],
	];
	const events = [["surface", "pointerdown", pointer({ pointerId: 41 })], ["surface", "dblclick", pointer({}, ["pointerId"])], ["surface", "pointerdown", pointer({ pointerId: "7" })], ["keys", "keydown", key()], ["surface", "pointerup", pointer({ preventDefault() {
		throw new Error("refused");
	} })]];
	const scenarios = [];
	for (const [label, reply] of policies) for (const refuse of [false, true]) scenarios.push([`${label}${refuse ? ", the pointer refused" : ""}`, firing(events, { reply, refuse })]);
	scenarios.push(["replies used after their delivery", (openCapture, log) => {
		kept.length = 0;
		firing(events, { reply: (fact, reply) => kept.push(reply) })(openCapture, log);
		for (const reply of kept) {
			for (const method of ["claim", "takePointer"]) {
				try {
					reply[method]();
				} catch (error) {
					log.push(thrownEntry(error));
				}
			}
		}
	}]);
	sameBesideReleased(scenarios);
});

// ---- the changes IC9's closing list names, each with both answers ----

test("I18, a listed change: a declaration with an own listen property, which 0.1.0 refused as unknown-property, is judged", () => {
	const base = () => ({ surface: surfaceFake(), keys: keysFake(), toDrawing: (s) => s, deliver() {} });
	for (const listen of [[], ["wheel"], ["context-menu", "blur"], undefined, "wheel", ["nope"]]) {
		assert.deepEqual(released({ ...base(), listen }).problems?.map((x) => ({ ...x })), [{ pointer: "/listen", problem: "unknown-property" }], `0.1.0: ${String(listen)}`);
	}
	assert.equal(current({ ...base(), listen: [] }).ok, true);
	assert.equal(current({ ...base(), listen: ["wheel"] }).ok, true);
	assert.equal(current({ ...base(), listen: ["context-menu", "blur"] }).ok, true);
	assert.deepEqual(current({ ...base(), listen: undefined }).problems.map((x) => ({ ...x })), [{ pointer: "/listen", problem: "invalid-value" }]);
	assert.deepEqual(current({ ...base(), listen: ["nope"] }).problems.map((x) => ({ ...x })), [{ pointer: "/listen/0", problem: "invalid-value" }]);
});

test("I18, a listed change: an event whose timeStamp getter throws, which 0.1.0 delivered, is refused", () => {
	for (const [on, name, make] of [["surface", "pointerdown", () => pointerEvent()], ["surface", "dblclick", () => pointerEvent()], ["keys", "keydown", () => keyEvent()]]) {
		const answers = {};
		for (const [label, openCapture] of [["0.1.0", released], ["0.2.0", current]]) {
			const log = [];
			const platform = recordingPlatform(log);
			openCapture({ surface: platform.surface, keys: platform.keys, toDrawing: (s) => s, deliver: (fact) => log.push(`delivered ${fact.type}`) });
			const event = Object.defineProperty(make(), "timeStamp", { get() {
				throw new RangeError("no time");
			} });
			platform.fire(on, name, event);
			answers[label] = log.filter((entry) => /^(delivered|threw) /.test(entry)).join("; ");
		}
		assert.match(answers["0.1.0"], /^delivered /, `0.1.0 delivered the ${name}`);
		assert.equal(answers["0.2.0"], `threw TypeError: ${name}: the event's timeStamp could not be read: an object`, `0.2.0 refused the ${name}`);
	}
});

test("I18, a listed change: every fact gains five properties after metaKey, its first sixteen 0.1.0's", () => {
	const facts = {};
	for (const [label, openCapture] of [["0.1.0", released], ["0.2.0", current]]) {
		const log = [];
		const platform = recordingPlatform(log);
		openCapture({ surface: platform.surface, keys: platform.keys, toDrawing: (s) => s, deliver: (fact) => log.push(fact) });
		platform.fire("surface", "pointerdown", pointerEvent({ timeStamp: 9 }));
		platform.fire("keys", "keyup", keyEvent({ timeStamp: 10 }));
		facts[label] = log.filter((entry) => typeof entry === "object");
	}
	for (const [index, fact] of facts["0.1.0"].entries()) {
		const now = facts["0.2.0"][index];
		assert.equal(Object.keys(fact).length, 16);
		assert.deepEqual(Object.keys(now), [...Object.keys(fact), ...NEW_KEYS]);
		assert.deepEqual(Object.fromEntries(Object.entries(now).slice(0, 16)), { ...fact });
	}
	assert.deepEqual(facts["0.2.0"].map((f) => f.time), [9, 10]);
});

test("I18: the fixture is the 0.1.0 release, as published: its SHA-512 is the release's integrity, and it holds the package's built files", () => {
	const bytes = fs.readFileSync(RELEASED.file);
	assert.equal(integrityOf(bytes), RELEASED.integrity);
	const files = untar(bytes);
	for (const name of ["package/package.json", "package/dist/index.js", "package/dist/open-capture.js", "package/dist/declaration-reading.js", "package/dist/event-reading.js", "package/dist/fact.js", "package/dist/reply.js", "package/dist/declaration-problems.js", "package/dist/types.js"]) assert.ok(files.has(name), name);
	assert.equal(JSON.parse(files.get("package/package.json")).version, "0.1.0");
	assert.notEqual(released, current, "two releases, side by side");
});

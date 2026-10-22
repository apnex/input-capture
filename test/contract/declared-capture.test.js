// declared-capture - IC2 and IC3 (I1, I2): a declaration opened into a capture, or refused with every problem
// it has, each at its pointer; the order in which a declaration and the platform's objects are read, held
// by Proxies that record each trap; the listeners added in IC4's order, taken back when an adding throws,
// and removed by close; and which events, by the lifecycle, make facts.
import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";

import { openCapture } from "@apnex/input-capture";
import { declarationOver, fakeObject, fakePlatform, keyEvent, pointerEvent } from "../support/fakes.js";
import { isFrozenToDepth } from "../support/frozen.js";
import { phantom, recorded, revoked, trapping } from "../support/recording-proxy.js";

const p = (pointer, problem) => ({ pointer, problem });
const POINTER = ["pointerleave", "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerover", "pointerout", "dblclick"];
const KEYS = ["keydown", "keyup"];
const surfaceFake = () => ({ addEventListener() {}, removeEventListener() {}, setPointerCapture() {} });
const keysFake = () => ({ addEventListener() {}, removeEventListener() {} });
const valid = () => ({ surface: surfaceFake(), toDrawing: (s) => s, deliver() {} });
const neverCalled = (name) => () => assert.fail(`${name} was called`);
const accessor = (target, name, get = neverCalled(`the getter of ${name}`)) => Object.defineProperty(target, name, { get, enumerable: true, configurable: true });
const label = (value) => {
	try {
		return String(value);
	} catch {
		return "a value String cannot show";
	}
};

/** The problems a declaration is refused with; fails when it opens. */
function problemsOf(declaration) {
	const result = openCapture(declaration);
	assert.equal(result.ok, false, "the declaration is refused");
	return result.problems.map((x) => ({ pointer: x.pointer, problem: x.problem }));
}

test("I1: openCapture never throws while it judges, and refuses a value that is not a plain object -- or whose reflection throws -- at \"\" alone", () => {
	class Declaration {}
	const values = [undefined, null, 0, "surface", true, 1n, Symbol("d"), [], () => ({}), new Date(0), Object.create({ ...valid() }), new Declaration(), revoked(valid()), trapping(valid(), "getPrototypeOf"), trapping(valid(), "ownKeys"), trapping(valid(), "getOwnPropertyDescriptor")];
	for (const value of values) assert.deepEqual(problemsOf(value), [p("", "not-an-object")], label(typeof value));
	assert.deepEqual(problemsOf(), [p("", "not-an-object")], "no argument at all");
	assert.equal(openCapture(Object.assign(Object.create(null), valid())).ok, true, "a null prototype is plain");
	assert.equal(openCapture({ ...valid(), [Symbol("s")]: 1 }).ok, true, "a symbol-named property is ignored");
});

test("IC2 rule 1: a declaration from another realm has that realm's Object.prototype, so it is not a plain object; its surface may come from anywhere", () => {
	const foreign = vm.runInNewContext("({ surface: { addEventListener() {}, removeEventListener() {}, setPointerCapture() {} }, toDrawing: (s) => s, deliver() {} })");
	assert.deepEqual(problemsOf(foreign), [p("", "not-an-object")]);
	assert.equal(openCapture({ surface: foreign.surface, toDrawing: (s) => s, deliver() {} }).ok, true, "a foreign surface is an object like any other");
});

test("I1: a declaration whose descriptor read throws is not-an-object at \"\", no later descriptor read and no member read", () => {
	const log = [];
	const surface = recorded(surfaceFake(), "surface", log);
	const declaration = recorded({ surface, toDrawing: (s) => s, hit: () => 1, deliver() {} }, "declaration", log, {
		getOwnPropertyDescriptor: (t, key) => {
			if (key === "toDrawing") throw new Error("no descriptor");
			return Reflect.getOwnPropertyDescriptor(t, key);
		},
	});
	assert.deepEqual(problemsOf(declaration), [p("", "not-an-object")]);
	assert.deepEqual(log, ["declaration getPrototypeOf", "declaration ownKeys", "declaration getOwnPropertyDescriptor surface", "declaration getOwnPropertyDescriptor toDrawing"]);
});

test("IC3 step 2: an unknown property each, escaped; surface, toDrawing and deliver absent; an inherited property absent", () => {
	assert.deepEqual(problemsOf({}), [p("/deliver", "missing-property"), p("/surface", "missing-property"), p("/toDrawing", "missing-property")]);
	assert.deepEqual(problemsOf({ ...valid(), extra: 1, "a/b": 2, "c~d": 3, "": 4 }), [p("/", "unknown-property"), p("/a~1b", "unknown-property"), p("/c~0d", "unknown-property"), p("/extra", "unknown-property")]);
	Object.prototype.deliver = () => {};
	try {
		assert.deepEqual(problemsOf({ surface: surfaceFake(), toDrawing: (s) => s }), [p("/deliver", "missing-property")]);
	} finally {
		delete Object.prototype.deliver;
	}
});

test("IC2 rule 1: present undefined and accessors are of no form, and no getter of the declaration is called", () => {
	for (const name of ["surface", "keys", "toDrawing", "hit", "deliver"]) {
		assert.deepEqual(problemsOf({ ...valid(), [name]: undefined }), [p(`/${name}`, "invalid-value")], `${name} present as undefined`);
		const declaration = valid();
		delete declaration[name];
		assert.deepEqual(problemsOf(accessor(declaration, name)), [p(`/${name}`, "invalid-value")], `${name} an accessor`);
	}
	assert.deepEqual(problemsOf({ ...valid(), keys: keysFake(), focus: undefined }), [p("/focus", "invalid-value")]);
	assert.deepEqual(problemsOf(accessor({ ...valid(), keys: keysFake() }, "focus")), [p("/focus", "invalid-value")]);
});

test("IC2 rule 1: a phantom key -- listed by its own keys, its descriptor undefined -- is absent where its descriptor is read, and known by its key alone where it is not", () => {
	assert.deepEqual(problemsOf(phantom({ toDrawing: (s) => s, deliver() {} }, "surface")), [p("/surface", "missing-property")]);
	assert.deepEqual(problemsOf(phantom(valid(), "zz")), [p("/zz", "unknown-property")]);
	assert.equal(openCapture(phantom(valid(), "keys", "hit")).ok, true, "optional properties whose descriptors read undefined are absent");
	assert.deepEqual(problemsOf(phantom({ ...valid(), focus: () => 1 }, "keys")), [p("/focus", "invalid-value")], "a phantom keys is absent, so focus lacks keys");
});

test("IC3 steps 3 and 4: the surface and the key source -- not an object, a function, a Proxy that cannot be read, a member missing or no function", () => {
	const lacking = (base, name) => {
		const object = { ...base };
		delete object[name];
		return object;
	};
	const surfaces = [5, "s", null, () => ({}), Object.assign(() => ({}), surfaceFake()), revoked(surfaceFake()), trapping(surfaceFake(), "get"), ...["addEventListener", "removeEventListener", "setPointerCapture"].map((n) => lacking(surfaceFake(), n)), { ...surfaceFake(), setPointerCapture: 1 }, accessor(lacking(surfaceFake(), "removeEventListener"), "removeEventListener", () => {
		throw new Error("unreadable");
	})];
	for (const surface of surfaces) assert.deepEqual(problemsOf({ ...valid(), surface }), [p("/surface", "invalid-value")], label(surface));
	const sources = [5, null, () => ({}), revoked(keysFake()), trapping(keysFake(), "get"), lacking(keysFake(), "addEventListener"), lacking(keysFake(), "removeEventListener"), { addEventListener: "no", removeEventListener() {} }];
	for (const keys of sources) assert.deepEqual(problemsOf({ ...valid(), keys }), [p("/keys", "invalid-value")], label(keys));
	assert.equal(openCapture({ ...valid(), keys: keysFake() }).ok, true, "a key source needs no setPointerCapture");
	const surface = surfaceFake();
	assert.equal(openCapture({ ...valid(), surface, keys: surface }).ok, true, "the surface itself is allowed as the key source");
	assert.equal(openCapture({ ...valid(), surface: Object.assign(Object.create({ addEventListener() {}, removeEventListener() {}, setPointerCapture() {} })) }).ok, true, "members are read through ordinary access, so inherited ones answer, as a browser element's do");
});

test("IC2 rule 2: a member that is not a function stops the reading of its object -- a later member whose getter would change the key source is never read", () => {
	const keys = keysFake();
	const surface = {
		addEventListener: 0,
		get removeEventListener() {
			keys.addEventListener = 1;
			return () => {};
		},
		setPointerCapture() {},
	};
	assert.deepEqual(problemsOf({ ...valid(), surface, keys }), [p("/surface", "invalid-value")]);
	assert.equal(typeof keys.addEventListener, "function", "the getter never ran");
});

test("IC3 steps 5 and 6: the application's functions; focus without keys", () => {
	for (const name of ["toDrawing", "hit", "deliver"]) for (const value of [5, "f", null, {}, [], Symbol("f")]) assert.deepEqual(problemsOf({ ...valid(), [name]: value }), [p(`/${name}`, "invalid-value")], `${name}: ${label(value)}`);
	assert.deepEqual(problemsOf({ ...valid(), focus: () => 1 }), [p("/focus", "invalid-value")]);
	assert.deepEqual(problemsOf({ ...valid(), focus: 5 }), [p("/focus", "invalid-value")], "a focus both no function and without keys is one record");
	assert.deepEqual(problemsOf({ ...valid(), keys: 5, focus: () => 1 }), [p("/keys", "invalid-value")], "keys present, though refused, so focus has keys");
	assert.deepEqual(problemsOf({ ...valid(), keys: undefined, focus: () => 1 }), [p("/keys", "invalid-value")], "keys present as undefined is present, of no form");
	assert.equal(openCapture({ ...valid(), keys: keysFake(), hit: () => 1, focus: () => 2 }).ok, true);
	class Conversion {
		static of() {}
	}
	assert.equal(openCapture({ ...valid(), toDrawing: Conversion, deliver: async () => {} }).ok, true, "a class and an async function are functions: typeof judges them");
});

test("IC3: every problem, ordered by pointer and then by problem by UTF-16 code unit, no record twice", () => {
	assert.deepEqual(problemsOf({ surface: 5, keys: null, focus: 1, hit: 2, Z: 1, a: 1, "\u00e9": 1, B: 1 }), [
		p("/B", "unknown-property"),
		p("/Z", "unknown-property"),
		p("/a", "unknown-property"),
		p("/deliver", "missing-property"),
		p("/focus", "invalid-value"),
		p("/hit", "invalid-value"),
		p("/keys", "invalid-value"),
		p("/surface", "invalid-value"),
		p("/toDrawing", "missing-property"),
		p("/\u00e9", "unknown-property"),
	]);
});

test("IC2 rule 2: the reading order -- prototype, own keys, the six descriptors held in order, then the surface's three members and the key source's two, each through ordinary access", () => {
	const log = [];
	const surface = recorded(surfaceFake(), "surface", log);
	const keys = recorded(keysFake(), "keys", log);
	const declaration = recorded({ deliver() {}, focus: () => 1, hit: () => 1, toDrawing: (s) => s, keys, surface, extra: 1 }, "declaration", log);
	assert.deepEqual(problemsOf(declaration), [p("/extra", "unknown-property")]);
	assert.deepEqual(log, [
		"declaration getPrototypeOf",
		"declaration ownKeys",
		...["surface", "keys", "toDrawing", "hit", "focus", "deliver"].map((n) => `declaration getOwnPropertyDescriptor ${n}`),
		"surface get addEventListener",
		"surface get removeEventListener",
		"surface get setPointerCapture",
		"keys get addEventListener",
		"keys get removeEventListener",
	], "an unknown property is known by its key alone; the members are read even when the declaration has another problem");
	const refused = [];
	const badSurface = recorded({ addEventListener() {}, removeEventListener: 7, setPointerCapture() {} }, "surface", refused);
	const goodKeys = recorded(keysFake(), "keys", refused);
	problemsOf({ surface: badSurface, keys: goodKeys, toDrawing: (s) => s, deliver() {} });
	assert.deepEqual(refused, ["surface get addEventListener", "surface get removeEventListener", "keys get addEventListener", "keys get removeEventListener"], "the surface's reading stops at its refused member; the key source's is read whatever the surface's were");
	const accessorSurface = [];
	problemsOf(accessor({ toDrawing: (s) => s, deliver() {}, keys: recorded(keysFake(), "keys", accessorSurface) }, "surface"));
	assert.deepEqual(accessorSurface, ["keys get addEventListener", "keys get removeEventListener"], "an accessor surface holds no object, so none of its members is read");
});

test("I2: an open capture has added exactly IC4's listeners, in order, on the right object, with two arguments, before openCapture returns; eight without a key source", () => {
	const platform = fakePlatform();
	const { declaration } = declarationOver(platform);
	const opened = openCapture(declaration);
	assert.equal(opened.ok, true);
	assert.deepEqual(platform.log.map((c) => [c.call, c.args[0], c.args.length, c.self === (c.call.startsWith("surface") ? platform.surface.object : platform.keys.object), typeof c.args[1]]), [...POINTER.map((n) => ["surface.addEventListener", n, 2, true, "function"]), ...KEYS.map((n) => ["keys.addEventListener", n, 2, true, "function"])]);
	assert.equal(new Set(platform.log.map((c) => c.args[1])).size, 10, "a listener of its own for each event");
	assert.ok(platform.log.every((c) => Object.isFrozen(c.args[1])), "each listener frozen");
	const eight = fakePlatform();
	const { declaration: without } = declarationOver(eight);
	delete without.keys;
	openCapture(without);
	assert.deepEqual(eight.log.map((c) => [c.call, c.args[0]]), POINTER.map((n) => ["surface.addEventListener", n]));
	const same = fakePlatform();
	openCapture({ ...declarationOver(same).declaration, keys: same.surface.object });
	assert.deepEqual(same.log.map((c) => [c.call, c.args[0]]), [...POINTER, ...KEYS].map((n) => ["surface.addEventListener", n]), "the surface as key source takes the key listeners too");
});

test("IC3 rule 2: openCapture calls no platform method until the declaration is judged; a refused declaration calls none", () => {
	const platform = fakePlatform();
	const { declaration } = declarationOver(platform, { deliver: undefined });
	assert.equal(openCapture(declaration).ok, false);
	assert.deepEqual(platform.log, []);
});

test("I2, IC3 rule 3: an addEventListener throwing at each place, before or after adding its listener, leaves none added, attempts every removal and throws its error unchanged", () => {
	for (const addThenThrow of [false, true]) {
		for (let at = 0; at < 10; at++) {
			const onSurface = at < 8;
			const platform = fakePlatform(onSurface ? { surface: { throwOnAdd: at, addThenThrow } } : { keys: { throwOnAdd: at - 8, addThenThrow } });
			const { declaration, delivered } = declarationOver(platform);
			let thrown;
			assert.throws(() => openCapture(declaration), (e) => ((thrown = e), e instanceof Error && e.constructor === Error && /refused/.test(e.message)));
			assert.equal(platform.surface.live.size + platform.keys.live.size, 0, `throw at ${at}, ${addThenThrow ? "after" : "before"} adding: none left`);
			const adds = platform.log.filter((c) => c.call.endsWith("addEventListener"));
			const removes = platform.log.filter((c) => c.call.endsWith("removeEventListener"));
			assert.equal(adds.length, at + 1);
			assert.deepEqual(removes.map((c) => [c.args[0], c.args[1]]), [adds[at], ...adds.slice(0, at).reverse()].map((c) => [c.args[0], c.args[1]]), "that very listener first, then the rest in reverse");
			assert.ok(removes.every((c) => c.args.length === 2 && c.self === (c.call.startsWith("surface") ? platform.surface.object : platform.keys.object)));
			// the listener the platform kept despite its refusal is never open: it makes no fact
			if (addThenThrow) adds[at].args[1](onSurface ? pointerEvent() : keyEvent());
			assert.equal(delivered.length, 0);
			assert.ok(thrown);
		}
	}
});

test("IC3 rule 3: a removal that throws while opening is taken back is held, every other removal attempted, and the addEventListener's error thrown", () => {
	const platform = fakePlatform({ surface: { throwOnAdd: 4, throwOnRemove: [0, 2] } });
	assert.throws(() => openCapture(declarationOver(platform).declaration), /surface refused to add pointercancel/);
	assert.deepEqual(platform.log.filter((c) => c.call.endsWith("removeEventListener")).map((c) => c.args[0]), ["pointercancel", "pointerup", "pointermove", "pointerdown", "pointerleave"]);
	assert.deepEqual([...platform.surface.live.keys()], ["pointermove"], "only the listener whose removal threw is left");
});

test("I2, IC3 rule 5: close removes every listener in reverse, through the removeEventListener read as it opened, and answers undefined; a second close calls nothing", () => {
	const platform = fakePlatform();
	const { capture } = openCapture(declarationOver(platform).declaration);
	const adds = platform.log.splice(0);
	platform.surface.object.removeEventListener = neverCalled("a removeEventListener replaced after opening");
	assert.equal(capture.close(), undefined);
	assert.deepEqual(platform.log.map((c) => [c.call, c.args[0], c.args[1], c.args.length]), adds.reverse().map((c) => [c.call.replace("add", "remove"), c.args[0], c.args[1], 2]));
	assert.equal(platform.surface.live.size + platform.keys.live.size, 0);
	assert.equal(capture.close(), undefined);
	assert.equal(platform.log.length, 10, "the second close called nothing");
});

test("I2, IC3 rule 5: close attempts every removal when one throws, and then throws the first error; a later close calls nothing", () => {
	const platform = fakePlatform({ keys: { throwOnRemove: [0] }, surface: { throwOnRemove: [3] } });
	const { capture } = openCapture(declarationOver(platform).declaration);
	platform.log.length = 0;
	assert.throws(() => capture.close(), (e) => e.message === "keys refused to remove keyup");
	assert.equal(platform.log.length, 10, "every removal attempted");
	assert.deepEqual([...platform.keys.live.keys(), ...platform.surface.live.keys()], ["keyup", "pointercancel"]);
	assert.equal(capture.close(), undefined);
	assert.equal(platform.log.length, 10);
	// a listener so left makes no fact
	const delivered = [];
	const left = fakePlatform({ surface: { throwOnRemove: [0] } });
	const { capture: other } = openCapture({ ...declarationOver(left).declaration, deliver: (f) => delivered.push(f) });
	assert.throws(() => other.close());
	left.surface.fire("dblclick", pointerEvent());
	assert.deepEqual(delivered, []);
});

test("I2, IC3 rule 5: a close made from inside a removal returns undefined and calls nothing", () => {
	const platform = fakePlatform();
	let capture;
	let entered = false;
	let inner = "unset";
	const remove = platform.surface.object.removeEventListener;
	platform.surface.object.removeEventListener = function (...args) {
		if (!entered) {
			entered = true;
			inner = capture.close();
		}
		return remove.apply(this, args);
	};
	({ capture } = openCapture(declarationOver(platform).declaration));
	platform.log.length = 0;
	assert.equal(capture.close(), undefined);
	assert.equal(inner, undefined);
	assert.equal(platform.log.filter((c) => c.call.endsWith("removeEventListener")).length, 10, "each listener removed once");
});

test("I2, IC3 rule 1: a listener called during opening makes no fact and reads nothing; one called after close makes none", () => {
	const platform = fakePlatform();
	const reads = [];
	const event = new Proxy(pointerEvent(), { get: (t, k) => (reads.push(String(k)), t[k]) });
	const add = platform.surface.object.addEventListener;
	platform.surface.object.addEventListener = function (name, listener) {
		listener(event);
		return add.call(this, name, listener);
	};
	const { declaration, delivered } = declarationOver(platform);
	const { capture } = openCapture(declaration);
	assert.deepEqual(reads, [], "the event was not read");
	assert.equal(delivered.length, 0);
	platform.surface.fire("pointerdown", pointerEvent());
	assert.equal(delivered.length, 1, "open: a fact");
	capture.close();
	const held = platform.log.find((c) => c.args[0] === "pointermove").args[1];
	held(event);
	assert.deepEqual(reads, []);
	assert.equal(delivered.length, 1);
});

test("I2, IC3 rule 1: a fact begun before close is made and delivered with a live reply; the next event makes none", () => {
	const platform = fakePlatform();
	let capture;
	const answers = [];
	({ capture } = openCapture({
		...declarationOver(platform).declaration,
		hit: () => {
			capture.close();
			return "hit";
		},
		deliver: (fact, reply) => answers.push([fact.type, fact.hit, reply.takePointer()]),
	}));
	platform.surface.fire("pointerdown", pointerEvent());
	assert.deepEqual(answers, [["down", "hit", true]]);
	assert.ok(platform.log.some((c) => c.call === "surface.setPointerCapture"), "the reply acted on the platform after close");
	const held = platform.log.find((c) => c.args[0] === "pointerdown").args[1];
	held(pointerEvent());
	assert.equal(answers.length, 1);
});

test("IC3 rule 4 and What is returned: the open result is a frozen { ok, capture }, the capture a frozen { close }, close needing no receiver", () => {
	const platform = fakePlatform();
	const opened = openCapture(declarationOver(platform).declaration);
	assert.deepEqual(Object.keys(opened), ["ok", "capture"]);
	assert.deepEqual(Object.keys(opened.capture), ["close"]);
	assert.ok(isFrozenToDepth(opened));
	const { close } = opened.capture;
	assert.equal(close.length, 0, "close takes no argument");
	assert.equal(close.call(undefined, "ignored"), undefined);
	assert.equal(platform.surface.live.size, 0);
	const refused = openCapture({});
	assert.deepEqual(Object.keys(refused), ["ok", "problems"]);
	assert.ok(isFrozenToDepth(refused));
	assert.deepEqual(Object.keys(refused.problems[0]), ["pointer", "problem"]);
	assert.notEqual(openCapture({}), refused, "a fresh answer each call");
});

test("IC3: two captures on one surface are independent; a capture opened from inside an addEventListener opens on its own", () => {
	const log = [];
	const shared = fakeObject("shared", log);
	const first = [], second = [];
	const a = openCapture({ surface: shared.object, toDrawing: (s) => s, deliver: (f) => first.push(f.type) });
	const b = openCapture({ surface: shared.object, toDrawing: (s) => s, deliver: (f) => second.push(f.type) });
	const listeners = log.filter((c) => c.args[0] === "pointerdown").map((c) => c.args[1]);
	listeners[0](pointerEvent());
	listeners[1](pointerEvent());
	a.capture.close();
	listeners[0](pointerEvent());
	listeners[1](pointerEvent());
	assert.deepEqual([first, second], [["down"], ["down", "down"]]);
	b.capture.close();
});

// declared-capture - IC2 and IC3 (I1, I2): a declaration opened into a capture, or refused with every problem
// it has, each at its pointer; the order in which a declaration and the platform's objects are read, held
// by Proxies that record each trap; the listeners added in IC4's order, taken back when an adding throws,
// and removed by close; and which events, by the lifecycle, make facts.
import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";

import { openCapture } from "@apnex/input-capture";
import { blurEvent, declarationOver, fakeObject, fakePlatform, keyEvent, PlatformSurface, PlatformWheelEvent, pointerEvent, wheelEvent } from "../support/fakes.js";
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

// ---- 0.2.0: listen (IC3 steps 7 to 9, IC2 rule 2) and the listeners it adds (IC4) ----

const LISTENED = [["wheel", "wheel", "surface"], ["context-menu", "contextmenu", "surface"], ["blur", "blur", "keys"]];
/** Every ordering of every subset of the three names. */
function orderings(names = ["wheel", "context-menu", "blur"]) {
	const out = [[]];
	for (const name of names) for (const rest of orderings(names.filter((n) => n !== name))) out.push([name, ...rest]);
	return [...new Map(out.map((o) => [o.join(","), o])).values()];
}

test("I13: listen absent, empty, or naming each name opens; 'blur' with keys opens", () => {
	assert.equal(openCapture(valid()).ok, true, "absent");
	assert.equal(openCapture({ ...valid(), listen: [] }).ok, true, "empty");
	assert.equal(openCapture({ ...valid(), listen: ["wheel"] }).ok, true);
	assert.equal(openCapture({ ...valid(), listen: ["context-menu"] }).ok, true);
	assert.equal(openCapture({ ...valid(), keys: keysFake(), listen: ["blur"] }).ok, true);
	for (const listen of orderings()) assert.equal(openCapture({ ...valid(), keys: keysFake(), listen }).ok, true, listen.join(","));
	assert.equal(openCapture(phantom(valid(), "listen")).ok, true, "a phantom listen -- its descriptor undefined -- is absent");
	assert.equal(openCapture({ ...valid(), listen: Object.assign(["wheel"], { [Symbol("s")]: 1 }) }).ok, true, "a symbol-named property of the array is ignored");
});

test("I13, IC3 step 2: listen is the seventh property, so it is no unknown property; an eighth is", () => {
	assert.deepEqual(problemsOf({ ...valid(), listen: ["wheel"], listens: ["wheel"] }), [p("/listens", "unknown-property")]);
});

test("I13, IC3 step 7: an accessor, undefined, a value that is no array of this realm's Array.prototype, a sparse array or one holding another string-named property is invalid-value at /listen, nothing beneath it reported", () => {
	const base = { ...valid(), keys: keysFake() };
	const sparse = ["wheel", , "blur"]; // eslint-disable-line no-sparse-arrays
	const holed = ["wheel", "blur"];
	delete holed[0];
	class Names extends Array {}
	const cases = [
		["present as undefined", undefined],
		["null", null],
		["a string", "wheel"],
		["an object shaped like an array", { 0: "wheel", length: 1 }],
		["a function", Object.assign(() => 0, { 0: "wheel" })],
		["a sparse array", sparse],
		["an array with a hole made by delete", holed],
		["an array holding another string-named property", Object.assign(["wheel"], { extra: 1 })],
		["an array of another prototype", Object.setPrototypeOf(["wheel"], Object.prototype)],
		["an Array subclass", Names.from(["wheel"])],
		["another realm's array", vm.runInNewContext("['wheel']")],
		["a revoked Proxy of an array", revoked(["wheel"])],
		["a Proxy whose ownKeys throws", trapping(["wheel"], "ownKeys")],
		["a Proxy whose getPrototypeOf throws", trapping(["wheel"], "getPrototypeOf")],
		["a Proxy whose getOwnPropertyDescriptor throws", trapping(["wheel"], "getOwnPropertyDescriptor")],
		["an accessor element", Object.defineProperty(["wheel", "blur"], 1, { get: neverCalled("an element's getter"), enumerable: true })],
		["a Proxy listing an index whose descriptor reads undefined", phantom([], "0")],
		["unknown names before an accessor element", Object.defineProperty(["nope", "wheel", "wheel"], 3, { get: neverCalled("an element's getter"), enumerable: true })],
	];
	for (const [label, listen] of cases) assert.deepEqual(problemsOf({ ...base, listen }), [p("/listen", "invalid-value")], label);
	assert.deepEqual(problemsOf(accessor({ ...base }, "listen")), [p("/listen", "invalid-value")], "an accessor, its getter never called");
	assert.deepEqual(problemsOf({ surface: 5, listen: null }), [p("/deliver", "missing-property"), p("/listen", "invalid-value"), p("/surface", "invalid-value"), p("/toDrawing", "missing-property")], "beside every other problem");
});

test("I13, IC3 step 8: an element none of the three names, or equal to an earlier element, is invalid-value at /listen/<i>", () => {
	const base = { ...valid(), keys: keysFake() };
	for (const element of ["scroll", "Wheel", "contextmenu", "focus", "", 0, null, undefined, {}, ["wheel"], true, 1n]) {
		assert.deepEqual(problemsOf({ ...base, listen: ["wheel", element] }), [p("/listen/1", "invalid-value")], label(element));
	}
	assert.deepEqual(problemsOf({ ...base, listen: ["wheel", "wheel"] }), [p("/listen/1", "invalid-value")], "a duplicate");
	assert.deepEqual(problemsOf({ ...base, listen: ["blur", "context-menu", "blur"] }), [p("/listen/2", "invalid-value")], "a duplicate blur");
	assert.deepEqual(problemsOf({ ...base, listen: ["x", "wheel", "wheel", "y", "context-menu", "wheel"] }), [p("/listen/0", "invalid-value"), p("/listen/2", "invalid-value"), p("/listen/3", "invalid-value"), p("/listen/5", "invalid-value")], "each refused element at its own index, the list ordered by pointer");
	const many = Array.from({ length: 12 }, (_, i) => (i === 0 ? "wheel" : "wheel"));
	assert.deepEqual(problemsOf({ ...base, listen: many }), Array.from({ length: 11 }, (_, i) => `/listen/${i + 1}`).sort().map((pointer) => p(pointer, "invalid-value")), "pointers ordered by UTF-16 code unit, so /listen/10 before /listen/2");
});

test("I13, IC3 step 9: 'blur' with keys absent is invalid-value at its index; keys undefined and keys 5 are refused at /keys alone; a duplicate blur without keys by step 8 alone; focus without keys beside it", () => {
	assert.deepEqual(problemsOf({ ...valid(), listen: ["blur"] }), [p("/listen/0", "invalid-value")], "keys absent");
	assert.deepEqual(problemsOf({ ...valid(), listen: ["wheel", "blur"] }), [p("/listen/1", "invalid-value")]);
	assert.deepEqual(problemsOf(phantom({ ...valid(), listen: ["blur"] }, "keys")), [p("/listen/0", "invalid-value")], "a phantom keys is absent, as step 6 tests it");
	assert.deepEqual(problemsOf({ ...valid(), keys: undefined, listen: ["blur"] }), [p("/keys", "invalid-value")], "keys present as undefined: step 4 alone");
	assert.deepEqual(problemsOf({ ...valid(), keys: 5, listen: ["blur"] }), [p("/keys", "invalid-value")], "keys 5: step 4 alone");
	assert.deepEqual(problemsOf({ ...valid(), listen: ["blur", "blur"] }), [p("/listen/0", "invalid-value"), p("/listen/1", "invalid-value")], "the first by step 9, the second by step 8 alone");
	assert.deepEqual(problemsOf({ ...valid(), focus: () => 1, listen: ["blur"] }), [p("/focus", "invalid-value"), p("/listen/0", "invalid-value")], "focus without keys beside it");
	assert.equal(openCapture({ ...valid(), keys: keysFake(), listen: ["blur"] }).ok, true);
	const surface = surfaceFake();
	assert.equal(openCapture({ ...valid(), surface, keys: surface, listen: ["blur"] }).ok, true, "the surface as its own key source");
});

test("I13, IC2 rule 2: the reads in order -- prototype, own keys, the seven descriptors held, the surface's three members, the key source's two, then listen's array: Array.isArray, its prototype, its own keys, its length's descriptor and each index's in order", () => {
	const log = [];
	const surface = recorded(surfaceFake(), "surface", log);
	const keys = recorded(keysFake(), "keys", log);
	const listen = recorded(["blur", "wheel"], "listen", log);
	const declaration = recorded({ listen, deliver() {}, focus: () => 1, hit: () => 1, toDrawing: (s) => s, keys, surface }, "declaration", log);
	assert.equal(openCapture(declaration).ok, true);
	const opening = log.splice(0, log.findIndex((l) => l.startsWith("listen ")) + 6);
	assert.deepEqual(opening, [
		"declaration getPrototypeOf",
		"declaration ownKeys",
		...["surface", "keys", "toDrawing", "hit", "focus", "deliver", "listen"].map((n) => `declaration getOwnPropertyDescriptor ${n}`),
		"surface get addEventListener",
		"surface get removeEventListener",
		"surface get setPointerCapture",
		"keys get addEventListener",
		"keys get removeEventListener",
		"listen getPrototypeOf",
		"listen ownKeys",
		"listen getOwnPropertyDescriptor length",
		"listen getOwnPropertyDescriptor 0",
		"listen getOwnPropertyDescriptor 1",
	], "Array.isArray runs no trap; nothing of the array is read twice and no element's value is read but through its descriptor");
	assert.ok(!log.some((l) => l.startsWith("listen ") || l.startsWith("declaration ")), "nothing more of the declaration or the array is read once it opens");
	const refused = [];
	const sparse = recorded(["wheel", , "blur"], "listen", refused); // eslint-disable-line no-sparse-arrays
	problemsOf({ ...valid(), keys: keysFake(), listen: sparse });
	assert.deepEqual(refused, ["listen getPrototypeOf", "listen ownKeys", "listen getOwnPropertyDescriptor length"], "a sparse array is refused once its length is read: no index's descriptor is read");
	const stopped = [];
	const extra = recorded(Object.assign(["wheel"], { extra: 1 }), "listen", stopped);
	problemsOf({ ...valid(), listen: extra });
	assert.deepEqual(stopped, ["listen getPrototypeOf", "listen ownKeys"], "a key that is neither length nor an index refuses it at its own keys");
	const foreign = [];
	problemsOf({ ...valid(), listen: recorded(vm.runInNewContext("['wheel']"), "listen", foreign) });
	assert.deepEqual(foreign, ["listen getPrototypeOf"], "another realm's array is refused at its prototype");
	const accessorElement = [];
	problemsOf({ ...valid(), listen: recorded(Object.defineProperty(["context-menu", "wheel", "x"], 1, { get: neverCalled("an element's getter"), enumerable: true }), "listen", accessorElement) });
	assert.deepEqual(accessorElement.slice(-2), ["listen getOwnPropertyDescriptor 0", "listen getOwnPropertyDescriptor 1"], "the reading stops at the accessor element: index 2 is never read");
	const unreadDeclaration = [];
	const notRead = recorded(["wheel"], "listen", unreadDeclaration);
	problemsOf(recorded({ ...valid(), listen: notRead }, "declaration", unreadDeclaration, { getOwnPropertyDescriptor: (t, key) => {
		if (key === "listen") throw new Error("no descriptor");
		return Reflect.getOwnPropertyDescriptor(t, key);
	} }));
	assert.ok(!unreadDeclaration.some((l) => l.startsWith("listen ")), "a declaration whose listen descriptor cannot be read is not-an-object at \"\", and its array is never read");
});

test("I13: listen's array is read last, so a surface member's getter that appends to it is seen; the array is read whatever else the declaration's problems are", () => {
	const listen = [];
	const surface = {
		get addEventListener() {
			listen.push("wheel");
			return () => {};
		},
		removeEventListener() {},
		setPointerCapture() {},
	};
	const adds = [];
	const opened = openCapture({ surface: Object.create(surface), toDrawing: (s) => s, deliver() {}, listen });
	assert.equal(opened.ok, true);
	assert.deepEqual(listen, ["wheel"], "the getter ran before the array was read");
	const seen = [];
	const keysWithGetter = {
		addEventListener(...args) {
			seen.push(args[0]);
		},
		get removeEventListener() {
			listenTwo.push("nope");
			return () => {};
		},
	};
	const listenTwo = ["blur"];
	assert.deepEqual(problemsOf({ ...valid(), keys: keysWithGetter, listen: listenTwo }), [p("/listen/1", "invalid-value")], "an element the key source's getter appended is judged");
	const third = ["wheel"];
	const surfaceAdding = { addEventListener: (name, listener, options) => adds.push([name, options]), removeEventListener() {}, get setPointerCapture() {
		third.push("context-menu");
		return () => {};
	} };
	assert.equal(openCapture({ surface: surfaceAdding, toDrawing: (s) => s, deliver() {}, listen: third }).ok, true);
	assert.deepEqual(adds.slice(8).map(([name]) => name), ["wheel", "contextmenu"], "the appended name is listened for");
	const log = [];
	problemsOf({ surface: recorded(surfaceFake(), "surface", log), listen: recorded(["nope"], "listen", log) });
	assert.deepEqual(log.filter((l) => l.startsWith("listen ")), ["listen getPrototypeOf", "listen ownKeys", "listen getOwnPropertyDescriptor length", "listen getOwnPropertyDescriptor 0"], "read though toDrawing and deliver are missing");
});

test("I14: with listen absent or empty, exactly I2's listeners, arguments and calls", () => {
	for (const extra of [{}, { listen: [] }]) {
		const platform = fakePlatform();
		openCapture(declarationOver(platform, extra).declaration);
		assert.deepEqual(platform.log.map((c) => [c.call, c.args[0], c.args.length]), [...POINTER.map((n) => ["surface.addEventListener", n, 2]), ...KEYS.map((n) => ["keys.addEventListener", n, 2])]);
	}
});

test("I14: the names listed in every order add their listeners after IC4's ten, in the table's order -- wheel's with a fresh frozen { passive: false } as third argument, the others with two", () => {
	const options = new Set();
	for (const listen of orderings()) {
		const platform = fakePlatform();
		const { declaration, delivered } = declarationOver(platform, { listen });
		assert.equal(openCapture(declaration).ok, true, listen.join(","));
		const expected = LISTENED.filter(([n]) => listen.includes(n));
		assert.deepEqual(platform.log.slice(0, 10).map((c) => [c.call, c.args[0], c.args.length]), [...POINTER.map((n) => ["surface.addEventListener", n, 2]), ...KEYS.map((n) => ["keys.addEventListener", n, 2])], "IC4's ten first");
		const after = platform.log.slice(10);
		assert.deepEqual(after.map((c) => [c.call, c.args[0], c.args.length]), expected.map(([n, event, on]) => [`${on}.addEventListener`, event, n === "wheel" ? 3 : 2]), `${listen.join(",")}: the table's order`);
		for (const c of after) {
			assert.equal(c.self, c.call.startsWith("surface") ? platform.surface.object : platform.keys.object, "on the right object");
			assert.equal(typeof c.args[1], "function");
			assert.ok(Object.isFrozen(c.args[1]));
			if (c.args[0] === "wheel") {
				const third = c.args[2];
				assert.deepEqual(Object.keys(third), ["passive"]);
				assert.equal(third.passive, false);
				assert.equal(Object.getPrototypeOf(third), Object.prototype);
				assert.ok(Object.isFrozen(third), "frozen");
				assert.ok(!options.has(third), "fresh: made for that call");
				options.add(third);
			}
		}
		assert.equal(new Set(platform.log.map((c) => c.args[1])).size, 10 + expected.length, "a listener of its own for each event");
		for (const [n, event, on] of expected) {
			platform[on].fire(event, n === "wheel" ? wheelEvent() : n === "blur" ? blurEvent() : pointerEvent());
			assert.equal(delivered.at(-1).fact.type, n, `${event} makes a ${n} fact`);
		}
	}
	assert.ok(options.size >= 2);
});

test("I14: without a key source, wheel and context-menu are added to the surface; the surface as key source takes the blur listener through the key source's reading", () => {
	const platform = fakePlatform();
	const { declaration } = declarationOver(platform, { listen: ["context-menu", "wheel"] });
	delete declaration.keys;
	openCapture(declaration);
	assert.deepEqual(platform.log.map((c) => [c.call, c.args[0], c.args.length]), [...POINTER.map((n) => ["surface.addEventListener", n, 2]), ["surface.addEventListener", "wheel", 3], ["surface.addEventListener", "contextmenu", 2]]);
	const log = [];
	const keyReading = [];
	const own = { addEventListener: (...args) => log.push(["surface's own", args[0]]), removeEventListener() {}, setPointerCapture() {} };
	let reads = 0;
	const same = Object.defineProperty({ ...own }, "addEventListener", { get() {
		reads++;
		const role = reads === 1 ? "as surface" : "as key source";
		return (...args) => keyReading.push([role, args[0], args.length]);
	} });
	openCapture({ surface: same, keys: same, toDrawing: (s) => s, deliver() {}, listen: ["blur", "wheel"] });
	assert.deepEqual(keyReading.filter(([, name]) => ["wheel", "blur", "keydown", "keyup"].includes(name)), [["as key source", "keydown", 2], ["as key source", "keyup", 2], ["as surface", "wheel", 3], ["as key source", "blur", 2]]);
});

test("I14: an addEventListener throwing at each of the new listeners, before or after adding it, takes back every listener with two arguments and throws its error", () => {
	for (const addThenThrow of [false, true]) {
		for (const at of [10, 11, 12]) {
			const onSurface = at < 12;
			const platform = fakePlatform(onSurface ? { surface: { throwOnAdd: at - 2, addThenThrow } } : { keys: { throwOnAdd: 2, addThenThrow } });
			const { declaration, delivered } = declarationOver(platform, { listen: ["blur", "context-menu", "wheel"] });
			assert.throws(() => openCapture(declaration), (e) => e instanceof Error && /refused/.test(e.message));
			assert.equal(platform.surface.live.size + platform.keys.live.size, 0, `throw at ${at}: none left`);
			const adds = platform.log.filter((c) => c.call.endsWith("addEventListener"));
			const removes = platform.log.filter((c) => c.call.endsWith("removeEventListener"));
			assert.equal(adds.length, at + 1);
			assert.deepEqual(removes.map((c) => [c.call.replace("remove", "add"), c.args[0], c.args[1]]), [adds[at], ...adds.slice(0, at).reverse()].map((c) => [c.call, c.args[0], c.args[1]]), "that very listener first, then the rest in reverse");
			assert.ok(removes.every((c) => c.args.length === 2), "every removal with two arguments, wheel's included");
			if (addThenThrow) adds[at].args[1](at === 10 ? wheelEvent() : at === 11 ? pointerEvent() : blurEvent());
			assert.equal(delivered.length, 0, "a listener the platform kept makes no fact");
		}
	}
});

test("I14: close removes every listener in reverse, each with two arguments, wheel's included", () => {
	const platform = fakePlatform();
	const { capture } = openCapture(declarationOver(platform, { listen: ["wheel", "blur", "context-menu"] }).declaration);
	const adds = platform.log.splice(0);
	assert.equal(adds.length, 13);
	assert.equal(capture.close(), undefined);
	assert.deepEqual(platform.log.map((c) => [c.call, c.args[0], c.args[1], c.args.length]), adds.reverse().map((c) => [c.call.replace("add", "remove"), c.args[0], c.args[1], 2]));
	assert.equal(platform.surface.live.size + platform.keys.live.size, 0);
	assert.equal(capture.close(), undefined);
	assert.equal(platform.log.length, 13, "a second close calls nothing");
});

test("I14, IC4: over Node.js's own EventTarget, a listener added with { passive: false } is removed by close with two arguments, since a platform matches a listener by its type, function and capture flag alone", () => {
	const surface = new PlatformSurface();
	const seen = [];
	const { capture } = openCapture({ surface, toDrawing: (s) => s, deliver: (fact, reply) => {
		seen.push(fact.type);
		reply.claim();
	}, listen: ["wheel"] });
	const wheel = new PlatformWheelEvent("wheel", { deltaY: 3 });
	surface.dispatchEvent(wheel);
	assert.deepEqual(seen, ["wheel"]);
	assert.equal(wheel.defaultPrevented, true, "a claim on a non-passive listener prevents");
	capture.close();
	surface.dispatchEvent(new PlatformWheelEvent("wheel", { deltaY: 3 }));
	assert.deepEqual(seen, ["wheel"], "removed");
});

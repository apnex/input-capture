// fact-reply - IC8 (I8): what the application asks of a fact while it is delivered -- the event claimed, the
// pointer taken -- done to that fact's event at once, the reply live only while its delivery runs.
import assert from "node:assert/strict";
import { test } from "node:test";

import { openCapture } from "@apnex/input-capture";
import { declarationOver, fakePlatform, keyEvent, pointerEvent } from "../support/fakes.js";
import { isFrozenToDepth } from "../support/frozen.js";

const ended = (name) => (e) => e.constructor === Error && e.message.startsWith(`${name}: `);

/** An open capture whose delivery runs `deliver`; answers the platform and the replies handed. */
function opened(deliver, platformOptions) {
	const platform = fakePlatform(platformOptions);
	const replies = [];
	const result = openCapture({ ...declarationOver(platform).declaration, deliver: (fact, reply) => {
		replies.push(reply);
		return deliver(fact, reply, platform);
	} });
	assert.equal(result.ok, true);
	platform.log.length = 0;
	return { platform, replies, capture: result.capture };
}

const calls = (platform, name) => platform.log.filter((c) => c.call === name);

test("I8: claim calls the event's preventDefault once, at once, with the event as its receiver; later calls answer undefined and call nothing", () => {
	const order = [];
	const event = pointerEvent({ preventDefault() {
		order.push(["preventDefault", this === event]);
	} });
	opened((fact, reply) => {
		order.push(["claim", reply.claim()]);
		order.push(["claim again", reply.claim()]);
		order.push(["after"]);
	}).platform.surface.fire("pointerdown", event);
	assert.deepEqual(order, [["preventDefault", true], ["claim", undefined], ["claim again", undefined], ["after"]]);
});

test("I8: a claim calls the preventDefault read with the event's fields, not one put there later; a key event's claim alike", () => {
	const called = [];
	const event = pointerEvent({ preventDefault: () => called.push("read at IC6") });
	opened((fact, reply) => {
		event.preventDefault = () => called.push("put there later");
		reply.claim();
	}).platform.surface.fire("pointermove", event);
	assert.deepEqual(called, ["read at IC6"]);
	const key = keyEvent();
	opened((fact, reply) => reply.claim()).platform.keys.fire("keydown", key);
	assert.equal(key.prevented, 1);
});

test("I8: a preventDefault that throws propagates, and the claim is spent; a claim made from inside it does nothing", () => {
	const thrown = new Error("refused");
	let attempts = 0;
	const event = pointerEvent({ preventDefault() {
		attempts++;
		throw thrown;
	} });
	const answers = [];
	opened((fact, reply) => {
		try {
			reply.claim();
		} catch (e) {
			answers.push(e === thrown);
		}
		answers.push(reply.claim());
	}).platform.surface.fire("pointerdown", event);
	assert.deepEqual(answers, [true, undefined]);
	assert.equal(attempts, 1);
	let reply;
	let inner = "unset";
	const reentrant = pointerEvent({ preventDefault() {
		attempts++;
		inner = reply.claim();
	} });
	opened((fact, r) => {
		reply = r;
		r.claim();
	}).platform.surface.fire("pointerdown", reentrant);
	assert.equal(inner, undefined);
	assert.equal(attempts, 2, "called once");
});

test("I8: takePointer calls setPointerCapture once, with the surface as receiver and the fact's pointerId, answering true; later calls answer it again and call nothing", () => {
	const answers = [];
	const { platform } = opened((fact, reply) => answers.push(reply.takePointer(), reply.takePointer()));
	platform.surface.fire("pointerdown", pointerEvent({ pointerId: 41 }));
	assert.deepEqual(answers, [true, true]);
	const captures = calls(platform, "surface.setPointerCapture");
	assert.deepEqual(captures.map((c) => [c.args, c.self === platform.surface.object]), [[[41], true]]);
});

test("I8: a setPointerCapture that throws -- whatever it throws -- answers false, and later calls answer false and call nothing", () => {
	for (const thrown of [new Error("not active"), "a string", undefined, { not: "an Error" }]) {
		const answers = [];
		const listeners = new Map();
		let count = 0;
		openCapture({
			surface: {
				addEventListener: (n, l) => listeners.set(n, l),
				removeEventListener() {},
				setPointerCapture() {
					count++;
					throw thrown;
				},
			},
			toDrawing: (s) => s,
			deliver: (fact, reply) => answers.push(reply.takePointer(), reply.takePointer()),
		});
		listeners.get("pointerdown")(pointerEvent({ pointerId: 3 }));
		assert.deepEqual(answers, [false, false], String(thrown));
		assert.equal(count, 1);
	}
});

test("I8: takePointer answers false and calls nothing when the fact's pointerId is null -- a double click, a pointerId of another type, a key fact", () => {
	const answers = [];
	const { platform } = opened((fact, reply) => answers.push(reply.takePointer(), reply.takePointer()));
	const noId = pointerEvent();
	delete noId.pointerId;
	platform.surface.fire("dblclick", noId);
	platform.surface.fire("pointerdown", pointerEvent({ pointerId: "7" }));
	platform.surface.fire("pointerdown", pointerEvent({ pointerId: 1.5 }));
	platform.keys.fire("keydown", keyEvent());
	assert.deepEqual(answers, [false, false, false, false, false, false, false, false]);
	assert.equal(calls(platform, "surface.setPointerCapture").length, 0);
});

test("I8: takePointer calls the setPointerCapture read as the capture opened, not one put there later", () => {
	const { platform } = opened((fact, reply) => reply.takePointer());
	platform.surface.object.setPointerCapture = () => assert.fail("a setPointerCapture put there after opening");
	platform.surface.fire("pointerdown", pointerEvent());
	assert.equal(calls(platform, "surface.setPointerCapture").length, 1);
});

test("I8: a takePointer made again from inside setPointerCapture's body throws and calls nothing, the outer call answering as setPointerCapture returned or threw", () => {
	for (const swallow of [true, false]) {
		let reply;
		let inner = null;
		let count = 0;
		const listeners = new Map();
		const outer = [];
		openCapture({
			surface: {
				addEventListener: (n, l) => listeners.set(n, l),
				removeEventListener() {},
				setPointerCapture() {
					count++;
					try {
						reply.takePointer();
					} catch (e) {
						inner = e;
						if (!swallow) throw e;
					}
				},
			},
			toDrawing: (s) => s,
			deliver: (fact, r) => {
				reply = r;
				outer.push(r.takePointer());
				outer.push(r.takePointer());
			},
		});
		listeners.get("pointerdown")(pointerEvent());
		assert.ok(inner !== null && ended("takePointer")(inner), "the inner call threw the Error");
		assert.equal(count, 1, "and called nothing");
		assert.deepEqual(outer, swallow ? [true, true] : [false, false], swallow ? "setPointerCapture returned" : "setPointerCapture threw");
	}
});

test("I8: a takePointer made again through a setPointerCapture that is a Proxy whose apply trap calls it, throws and calls nothing", () => {
	let reply;
	let inner = null;
	let count = 0;
	const listeners = new Map();
	const setPointerCapture = new Proxy(function () {}, {
		apply() {
			count++;
			try {
				reply.takePointer();
			} catch (e) {
				inner = e;
			}
		},
	});
	const answers = [];
	openCapture({ surface: { addEventListener: (n, l) => listeners.set(n, l), removeEventListener() {}, setPointerCapture }, toDrawing: (s) => s, deliver: (fact, r) => {
		reply = r;
		answers.push(r.takePointer());
	} });
	listeners.get("pointerdown")(pointerEvent());
	assert.ok(ended("takePointer")(inner));
	assert.equal(count, 1);
	assert.deepEqual(answers, [true]);
});

test("I8: both methods throw an Error, beginning with their names, once delivery has ended -- after deliver returns and after it throws", () => {
	const { platform, replies } = opened(() => {});
	platform.surface.fire("pointerdown", pointerEvent());
	const thrown = new Error("delivery threw");
	const { platform: throwing, replies: thrownReplies } = opened(() => {
		throw thrown;
	});
	assert.throws(() => throwing.surface.fire("pointerdown", pointerEvent()), (e) => e === thrown);
	for (const reply of [replies[0], thrownReplies[0]]) {
		assert.throws(() => reply.claim(), ended("claim"));
		assert.throws(() => reply.takePointer(), ended("takePointer"));
	}
	assert.equal(calls(platform, "surface.setPointerCapture").length, 0);
	// a reply spent while live still throws once its delivery has ended
	const { platform: spent, replies: spentReplies } = opened((fact, reply) => {
		reply.claim();
		reply.takePointer();
	});
	spent.surface.fire("pointerdown", pointerEvent());
	assert.throws(() => spentReplies[0].claim(), ended("claim"));
	assert.throws(() => spentReplies[0].takePointer(), ended("takePointer"));
});

test("I8: what a throwing delivery asked before it threw is done", () => {
	const thrown = new Error("after asking");
	const event = pointerEvent({ pointerId: 12 });
	const { platform } = opened((fact, reply) => {
		reply.claim();
		reply.takePointer();
		throw thrown;
	});
	assert.throws(() => platform.surface.fire("pointerdown", event), (e) => e === thrown);
	assert.equal(event.prevented, 1);
	assert.deepEqual(calls(platform, "surface.setPointerCapture").map((c) => c.args), [[12]]);
});

test("IC8, What is returned: a reply is a fresh frozen { claim, takePointer } for each fact, its methods needing no receiver and reading no argument", () => {
	const { platform, replies } = opened((fact, reply) => {
		const { claim, takePointer } = reply;
		claim.call({ not: "the reply" }, "ignored");
		takePointer.call(undefined, 99);
	});
	const event = pointerEvent({ pointerId: 5 });
	platform.surface.fire("pointerdown", event);
	platform.surface.fire("pointerdown", pointerEvent());
	const [first, second] = replies;
	assert.notEqual(first, second);
	assert.deepEqual(Object.keys(first), ["claim", "takePointer"]);
	assert.ok(isFrozenToDepth(first));
	assert.equal(first.claim.length, 0);
	assert.equal(first.takePointer.length, 0);
	assert.equal(event.prevented, 1);
	assert.deepEqual(calls(platform, "surface.setPointerCapture")[0].args, [5], "the fact's pointerId, never the argument given");
});

test("IC8: a nested delivery has its own reply, and the outer reply stays live while it runs", () => {
	const events = { outer: pointerEvent({ pointerId: 1 }), inner: pointerEvent({ pointerId: 2 }) };
	const seen = [];
	const { platform } = opened((fact, reply, p) => {
		if (fact.pointerId === 1) {
			p.surface.fire("pointermove", events.inner);
			seen.push(["outer", reply.takePointer()]);
			reply.claim();
		} else {
			seen.push(["inner", reply.takePointer()]);
		}
	});
	platform.surface.fire("pointerdown", events.outer);
	assert.deepEqual(seen, [["inner", true], ["outer", true]]);
	assert.deepEqual(calls(platform, "surface.setPointerCapture").map((c) => c.args[0]), [2, 1]);
	assert.deepEqual([events.outer.prevented, events.inner.prevented], [1, 0]);
});

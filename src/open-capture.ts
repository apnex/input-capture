/**
 * Opening and closing a capture, and the listeners (CONTRACT.md, IC3, IC4, IC6 and IC7).
 *
 * openCapture reads and judges the declaration first, calling no platform method; it then adds the
 * listeners in IC4's order, each through the addEventListener read as the capture opened, with two
 * arguments. If an addEventListener throws, it removes that very listener -- which the platform may have
 * added before throwing -- and then the listeners already added, in the reverse of the order added,
 * attempting every removal, and throws the error the addEventListener threw; the capture is never open.
 * close, on its first call, closes the capture and then removes every listener in reverse, attempting
 * every removal, and throws the first error a removal threw; every later call does nothing.
 *
 * A listener of a capture not open reads nothing and calls nothing. A listener of an open capture makes
 * one fact from the event, synchronously, and delivers it with a fresh reply before it returns; capture
 * queues, merges, defers and synthesizes nothing, and keeps no state between events but whether it is
 * open. Every application function is called with no receiver, at most once for each event.
 */
import { judgeDeclaration, type JudgedDeclaration, type PlatformMethod, type PlatformObject } from "./declaration-reading.js";
import { readConvertedPoint, readKeyFields, readPointerFields } from "./event-reading.js";
import { frozenPoint, makeKeyFact, makePointerFact } from "./fact.js";
import { makeReply } from "./reply.js";
import type { Capture, CaptureDeclaration, CaptureListener, KeyFactType, OpenCaptureResult, PointerFactType } from "./types.js";

/** IC4: the events that become pointer facts, in the order their listeners are added to the surface. */
const POINTER_EVENTS: readonly (readonly [string, PointerFactType])[] = [
	["pointerleave", "leave"],
	["pointerdown", "down"],
	["pointermove", "move"],
	["pointerup", "up"],
	["pointercancel", "cancel"],
	["pointerover", "over"],
	["pointerout", "out"],
	["dblclick", "double"],
];

/** IC4: the events that become key facts, in the order their listeners are added to the key source. */
const KEY_EVENTS: readonly (readonly [string, KeyFactType])[] = [
	["keydown", "key-down"],
	["keyup", "key-up"],
];

/** One listener as added: the object it was added to, the removeEventListener read from that object, the event's name and the listener. */
interface AddedListener {
	readonly on: object;
	readonly removeEventListener: PlatformMethod;
	readonly name: string;
	readonly listener: CaptureListener;
}

/** The lifecycle: opening while the listeners are added, open once every one is, closed from close's first call or a failed opening. */
type CaptureState = "opening" | "open" | "closed";

/** IC6: one pointer or double-click event into one fact, delivered with its reply. */
function deliverPointerFact(judged: JudgedDeclaration, name: string, type: PointerFactType, event: unknown): void {
	const fields = readPointerFields(name, event);
	const screen = frozenPoint(fields.clientX, fields.clientY);
	const converted = readConvertedPoint(Reflect.apply(judged.toDrawing, undefined, [screen]));
	const at = frozenPoint(converted.x, converted.y);
	let fact = makePointerFact<unknown>(type, at, screen, null, fields);
	if (judged.hit !== null) fact = makePointerFact(type, at, screen, Reflect.apply(judged.hit, undefined, [fields.target, fact]), fields);
	const { reply, end } = makeReply(event as object, fields.preventDefault, judged.surface, fact.pointerId);
	try {
		Reflect.apply(judged.deliver, undefined, [fact, reply]);
	} finally {
		end();
	}
}

/** IC6: one key event into one fact, delivered with its reply. */
function deliverKeyFact(judged: JudgedDeclaration, name: string, type: KeyFactType, event: unknown): void {
	const fields = readKeyFields(name, event);
	let fact = makeKeyFact<unknown>(type, null, fields);
	if (judged.focus !== null) fact = makeKeyFact(type, Reflect.apply(judged.focus, undefined, [fields.target, fact]), fields);
	const { reply, end } = makeReply(event as object, fields.preventDefault, judged.surface, null);
	try {
		Reflect.apply(judged.deliver, undefined, [fact, reply]);
	} finally {
		end();
	}
}

/** Calls a platform method with its object as receiver. */
const callPlatform = (method: PlatformMethod, on: object, args: readonly unknown[]): unknown => Reflect.apply(method, on, args);

/**
 * IC3: opens a capture on a surface, and optionally a key source, from the application's functions; or
 * refuses the declaration with every problem it has. Never throws while it judges the declaration; it
 * throws only the error an addEventListener threw, after taking back the listeners it added.
 */
export function openCapture<Hit = null, Focus = null>(declaration: CaptureDeclaration<Hit, Focus>): OpenCaptureResult {
	const judged = judgeDeclaration(declaration);
	if (!judged.ok) return judged.refusal;

	let state: CaptureState = "opening";
	const added: AddedListener[] = [];
	const plan: { readonly on: PlatformObject; readonly name: string; readonly handle: (event: unknown) => void }[] = [
		...POINTER_EVENTS.map(([name, type]) => ({ on: judged.surface, name, handle: (event: unknown) => deliverPointerFact(judged, name, type, event) })),
		...(judged.keys === null ? [] : KEY_EVENTS.map(([name, type]) => ({ on: judged.keys as PlatformObject, name, handle: (event: unknown) => deliverKeyFact(judged, name, type, event) }))),
	];

	for (const { on, name, handle } of plan) {
		const listener: CaptureListener = (event: unknown): void => {
			// IC3 rule 1: a listener of a capture not open reads nothing and calls nothing
			if (state !== "open") return;
			handle(event);
		};
		Object.freeze(listener);
		try {
			callPlatform(on.addEventListener, on.object, [name, listener]);
		} catch (error) {
			state = "closed";
			// the listener whose adding threw first -- the platform may have added it before throwing -- then the rest in reverse
			const takeBack: AddedListener[] = [{ on: on.object, removeEventListener: on.removeEventListener, name, listener }, ...[...added].reverse()];
			for (const entry of takeBack) {
				try {
					callPlatform(entry.removeEventListener, entry.on, [entry.name, entry.listener]);
				} catch {
					// every removal is attempted; the error thrown is the addEventListener's
				}
			}
			throw error;
		}
		added.push({ on: on.object, removeEventListener: on.removeEventListener, name, listener });
	}
	state = "open";

	const close = (): undefined => {
		if (state === "closed") return undefined;
		state = "closed";
		let failed = false;
		let first: unknown;
		for (const entry of [...added].reverse()) {
			try {
				callPlatform(entry.removeEventListener, entry.on, [entry.name, entry.listener]);
			} catch (error) {
				if (!failed) {
					failed = true;
					first = error;
				}
			}
		}
		if (failed) throw first;
		return undefined;
	};
	Object.freeze(close);
	const capture: Capture = Object.freeze({ close });
	return Object.freeze({ ok: true as const, capture });
}


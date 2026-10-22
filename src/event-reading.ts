/**
 * Reading an event's fields, and the conversion's answer (CONTRACT.md, IC2 rules 3 and 4, and IC6).
 *
 * An event is judged by typeof alone, which runs no trap, and its prototype is never read. Its fields are
 * read once each through ordinary property access -- a browser's being inherited accessors -- in IC6's
 * order, each judged as it is read, the reading stopping at the first refused: clientX is judged before
 * clientY is read, since an event is not a point. The conversion's answer is a point: its x and then its
 * y are read, both before either is judged, so a point with getters answers.
 *
 * A refusal is a TypeError whose message begins with the platform event's name and a colon, or with
 * "toDrawing: " for the conversion's answer; an error a getter or a trap threw is named after
 * "could not be read:".
 */
import type { PlatformMethod } from "./declaration-reading.js";

/** The fields of a pointer or double-click event, as read: each but the judged ones exactly as the event held it. */
export interface PointerFields {
	readonly clientX: number;
	readonly clientY: number;
	readonly button: number | null | undefined;
	readonly buttons: unknown;
	readonly pointerId: unknown;
	readonly pointerType: unknown;
	readonly shiftKey: unknown;
	readonly ctrlKey: unknown;
	readonly altKey: unknown;
	readonly metaKey: unknown;
	readonly target: unknown;
	readonly preventDefault: PlatformMethod;
}

/** The fields of a key event, as read. */
export interface KeyFields {
	readonly key: unknown;
	readonly code: unknown;
	readonly repeat: unknown;
	readonly shiftKey: unknown;
	readonly ctrlKey: unknown;
	readonly altKey: unknown;
	readonly metaKey: unknown;
	readonly target: unknown;
	readonly preventDefault: PlatformMethod;
}

/** The message of an error a getter or a trap threw, or a stand-in when even that cannot be read. */
export function messageOf(error: unknown): string {
	try {
		return error instanceof Error ? error.message : String(error);
	} catch {
		return "an unreadable error";
	}
}

/** IC2 rule 5: an object is a non-null value whose typeof is 'object', so a function never is one. */
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** IC6 step 1: the event, judged by typeof alone. */
function requireEvent(name: string, event: unknown): object {
	if (!isObject(event)) throw new TypeError(`${name}: the event must be an object, not a function or a primitive`);
	return event;
}

/** One field of the event, read once through ordinary property access; a getter's or a trap's error rethrown as the listener's TypeError. */
function readField(name: string, event: object, field: string): unknown {
	try {
		return (event as Record<string, unknown>)[field];
	} catch (error) {
		throw new TypeError(`${name}: the event's ${field} could not be read: ${messageOf(error)}`);
	}
}

/** The event's preventDefault, read last and refused unless it is a function. */
function readPreventDefault(name: string, event: object): PlatformMethod {
	const preventDefault = readField(name, event, "preventDefault");
	if (typeof preventDefault !== "function") throw new TypeError(`${name}: the event's preventDefault must be a function`);
	return preventDefault as PlatformMethod;
}

/**
 * IC6 steps 1 and 2 for a pointer or double-click event: clientX, clientY, button, buttons, pointerId,
 * pointerType, the modifiers, target and preventDefault, each read once and judged as it is read.
 */
export function readPointerFields(name: string, given: unknown): PointerFields {
	const event = requireEvent(name, given);
	const clientX = readField(name, event, "clientX");
	if (!isFiniteNumber(clientX)) throw new TypeError(`${name}: the event's clientX must be a finite number`);
	const clientY = readField(name, event, "clientY");
	if (!isFiniteNumber(clientY)) throw new TypeError(`${name}: the event's clientY must be a finite number`);
	const button = readField(name, event, "button");
	if (button !== undefined && button !== null && !(typeof button === "number" && Number.isSafeInteger(button))) throw new TypeError(`${name}: the event's button must be undefined, null or a safe integer`);
	const buttons = readField(name, event, "buttons");
	const pointerId = readField(name, event, "pointerId");
	const pointerType = readField(name, event, "pointerType");
	const shiftKey = readField(name, event, "shiftKey");
	const ctrlKey = readField(name, event, "ctrlKey");
	const altKey = readField(name, event, "altKey");
	const metaKey = readField(name, event, "metaKey");
	const target = readField(name, event, "target");
	const preventDefault = readPreventDefault(name, event);
	return { clientX, clientY, button: button as number | null | undefined, buttons, pointerId, pointerType, shiftKey, ctrlKey, altKey, metaKey, target, preventDefault };
}

/** IC6 steps 1 and 2 for a key event: key, code, repeat, the modifiers, target and preventDefault; no coordinate and no button. */
export function readKeyFields(name: string, given: unknown): KeyFields {
	const event = requireEvent(name, given);
	const key = readField(name, event, "key");
	const code = readField(name, event, "code");
	const repeat = readField(name, event, "repeat");
	const shiftKey = readField(name, event, "shiftKey");
	const ctrlKey = readField(name, event, "ctrlKey");
	const altKey = readField(name, event, "altKey");
	const metaKey = readField(name, event, "metaKey");
	const target = readField(name, event, "target");
	const preventDefault = readPreventDefault(name, event);
	return { key, code, repeat, shiftKey, ctrlKey, altKey, metaKey, target, preventDefault };
}

/** IC2 rule 4 and IC6 step 3: the conversion's answer, judged by typeof, its x then its y read, both before either is judged. */
export function readConvertedPoint(answer: unknown): { readonly x: number; readonly y: number } {
	if (!isObject(answer)) throw new TypeError("toDrawing: the answer must be an object, not a function or a primitive");
	let x: unknown, y: unknown;
	try {
		x = (answer as Record<string, unknown>)["x"];
		y = (answer as Record<string, unknown>)["y"];
	} catch (error) {
		throw new TypeError(`toDrawing: the answer could not be read: ${messageOf(error)}`);
	}
	if (!isFiniteNumber(x) || !isFiniteNumber(y)) throw new TypeError("toDrawing: the answer must hold finite numbers x and y");
	return { x, y };
}

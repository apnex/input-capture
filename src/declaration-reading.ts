/**
 * A capture's declaration, read and judged (CONTRACT.md, IC2 and IC3): every problem it has, each at its
 * pointer, or the values a capture is opened from.
 *
 * The declaration is read as input-binding reads one, in this order: its prototype; its own keys; the
 * descriptors of surface, keys, toDrawing, hit, focus and deliver its own keys hold, in that order --
 * never a getter of it, an inherited property absent, a symbol-named property ignored, a key whose
 * descriptor reads undefined absent, and a reflection that throws refusing the whole declaration,
 * nothing further read. Then, when surface holds an object, its addEventListener, removeEventListener
 * and setPointerCapture, and when keys holds one, its addEventListener and removeEventListener, each
 * through ordinary property access, judged as it is read, the reading of that object stopping at the
 * first member whose read throws or which is not a function. Nothing here calls a platform method.
 */
import { childPointer, notAnObject, ProblemList } from "./declaration-problems.js";
import type { OpenCaptureResult } from "./types.js";

/** One own property of the declaration, read through its descriptor: its value when it is a data property, none for an accessor. */
type OwnProperty = { readonly data: true; readonly value: unknown } | { readonly data: false };

/** A platform method as read when the capture opens: the function, called with its object as receiver every time. */
export type PlatformMethod = (...args: unknown[]) => unknown;

/** An object capture reaches the platform through, with the methods read from it as the capture opened. */
export interface PlatformObject {
	readonly object: object;
	readonly addEventListener: PlatformMethod;
	readonly removeEventListener: PlatformMethod;
}

/** The surface, with its setPointerCapture read beside the other two. */
export interface PlatformSurface extends PlatformObject {
	readonly setPointerCapture: PlatformMethod;
}

/** An application function, called with no receiver (IC7). */
export type ApplicationFunction = (...args: unknown[]) => unknown;

/** A declaration with no problem: what a capture is opened from. */
export interface JudgedDeclaration {
	readonly ok: true;
	readonly surface: PlatformSurface;
	readonly keys: PlatformObject | null;
	readonly toDrawing: ApplicationFunction;
	readonly hit: ApplicationFunction | null;
	readonly focus: ApplicationFunction | null;
	readonly deliver: ApplicationFunction;
}

const NAMES: readonly string[] = ["surface", "keys", "toDrawing", "hit", "focus", "deliver"];
const REQUIRED: readonly string[] = ["surface", "toDrawing", "deliver"];
const SURFACE_MEMBERS = ["addEventListener", "removeEventListener", "setPointerCapture"] as const;
const KEY_SOURCE_MEMBERS = ["addEventListener", "removeEventListener"] as const;

/** IC2 rule 5: an object is a non-null value whose typeof is 'object', so a function never is one. */
const isObject = (value: unknown): value is object => typeof value === "object" && value !== null;
const isFunction = (value: unknown): value is ApplicationFunction => typeof value === "function";

/** The value an own property holds when it is a data property; undefined for an accessor. */
const dataValue = (property: OwnProperty | undefined): unknown => (property !== undefined && property.data ? property.value : undefined);

/**
 * IC2 rule 2: the named members of a platform object, each read through ordinary property access and
 * judged as it is read; null at the first whose read throws or which is not a function, nothing after
 * it read.
 */
function readMembers<Name extends string>(object: object, names: readonly Name[]): Record<Name, PlatformMethod> | null {
	const members = {} as Record<Name, PlatformMethod>;
	for (const name of names) {
		let member: unknown;
		try {
			member = (object as Record<string, unknown>)[name];
		} catch {
			return null;
		}
		if (!isFunction(member)) return null;
		members[name] = member as PlatformMethod;
	}
	return members;
}

/** IC2 and IC3: every problem a declaration has, or what a capture is opened from. Never throws. */
export function judgeDeclaration(declaration: unknown): JudgedDeclaration | { readonly ok: false; readonly refusal: OpenCaptureResult } {
	// step 1: a plain object, its prototype, own keys and every descriptor read, or not-an-object at "" and nothing further read
	if (!isObject(declaration)) return { ok: false, refusal: notAnObject() };
	let keys: (string | symbol)[];
	try {
		const proto: unknown = Object.getPrototypeOf(declaration);
		if (proto !== Object.prototype && proto !== null) return { ok: false, refusal: notAnObject() };
		keys = Reflect.ownKeys(declaration);
	} catch {
		return { ok: false, refusal: notAnObject() };
	}
	const held = new Set<string>();
	const unknown: string[] = [];
	for (const key of keys) {
		if (typeof key !== "string") continue;
		held.add(key);
		if (!NAMES.includes(key)) unknown.push(key);
	}
	const properties = new Map<string, OwnProperty>();
	for (const name of NAMES) {
		if (!held.has(name)) continue;
		let descriptor: PropertyDescriptor | undefined;
		try {
			descriptor = Reflect.getOwnPropertyDescriptor(declaration, name);
		} catch {
			return { ok: false, refusal: notAnObject() };
		}
		// a key its own keys list whose descriptor reads undefined -- which only a Proxy can give -- is absent
		if (descriptor === undefined) continue;
		properties.set(name, "value" in descriptor ? { data: true, value: descriptor.value } : { data: false });
	}

	const problems = new ProblemList();
	// step 2
	for (const name of unknown) problems.add(childPointer(name), "unknown-property");
	for (const name of REQUIRED) if (!properties.has(name)) problems.add(childPointer(name), "missing-property");

	// step 3: the surface, its three members read and judged as read when it holds an object
	let surface: PlatformSurface | null = null;
	const surfaceProperty = properties.get("surface");
	if (surfaceProperty !== undefined) {
		const object = dataValue(surfaceProperty);
		const members = surfaceProperty.data && isObject(object) ? readMembers(object, SURFACE_MEMBERS) : null;
		if (members === null) problems.add("/surface", "invalid-value");
		else surface = { object: object as object, ...members };
	}

	// step 4: the key source, its two members read whatever the surface's were
	let keySource: PlatformObject | null = null;
	const keysProperty = properties.get("keys");
	if (keysProperty !== undefined) {
		const object = dataValue(keysProperty);
		const members = keysProperty.data && isObject(object) ? readMembers(object, KEY_SOURCE_MEMBERS) : null;
		if (members === null) problems.add("/keys", "invalid-value");
		else keySource = { object: object as object, ...members };
	}

	// step 5: the application's functions
	const functions = new Map<string, ApplicationFunction>();
	for (const name of ["toDrawing", "hit", "focus", "deliver"]) {
		const property = properties.get(name);
		if (property === undefined) continue;
		const value = dataValue(property);
		if (property.data && isFunction(value)) functions.set(name, value);
		else problems.add(childPointer(name), "invalid-value");
	}

	// step 6: focus requires keys
	if (properties.has("focus") && !properties.has("keys")) problems.add("/focus", "invalid-value");

	if (problems.size > 0 || surface === null) return { ok: false, refusal: problems.refusal() };
	return {
		ok: true,
		surface,
		keys: keySource,
		toDrawing: functions.get("toDrawing") as ApplicationFunction,
		hit: functions.get("hit") ?? null,
		focus: functions.get("focus") ?? null,
		deliver: functions.get("deliver") as ApplicationFunction,
	};
}

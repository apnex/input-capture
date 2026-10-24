/**
 * The fact (CONTRACT.md, IC5): a frozen record of exactly twenty-one properties, in one order, each null where
 * its family carries none.
 *
 * at and screen hold exactly the numbers read, -0 kept, and every other number is the event's own: capture
 * computes no number. A wheel's deltas are carried as delivered, -0 kept, and its deltaMode only when it names
 * a unit, 0, 1 or 2, written v + 0 so -0 gives 0. time is the event's own timeStamp when a finite number: a
 * fact holds no clock reading, no event, no target and no function.
 */
import type { BlurFields, KeyFields, PointerFields } from "./event-reading.js";
import type { BlurFact, CapturePoint, ContextMenuFact, KeyFact, KeyFactType, PointerFact, PointerFactType, WheelFact } from "./types.js";

const safeIntegerOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) ? value : null);
const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);
/** IC5's time: the event's timeStamp when a finite number, exactly, else null. */
const timeOf = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
/** IC5's deltaMode: 0, 1 or 2 when the event's value is one, written v + 0 so -0 gives 0, else null. */
const unitOf = (value: unknown): 0 | 1 | 2 | null => (value === 0 || value === 1 || value === 2 ? ((value + 0) as 0 | 1 | 2) : null);

/** The type of a fact made from a pointer-family event: the eight always listened for, and the two `listen` adds. */
export type PointerFamilyType = PointerFactType | "wheel" | "context-menu";

/** A point: a fresh frozen record of the two numbers given, exactly. */
export const frozenPoint = (x: number, y: number): CapturePoint => Object.freeze({ x, y });

/** A pointer fact -- a wheel's and a context menu's among them: the event's fields, the converted point and the screen point, and the hit answer given. */
export function makePointerFact<Hit>(type: PointerFamilyType, at: CapturePoint, screen: CapturePoint, hit: Hit, fields: PointerFields): PointerFact<Hit> | WheelFact<Hit> | ContextMenuFact<Hit> {
	const fact = {
		type,
		at,
		screen,
		hit,
		focus: null,
		button: fields.button ?? 0,
		buttons: safeIntegerOrNull(fields.buttons),
		pointerId: safeIntegerOrNull(fields.pointerId),
		pointerType: stringOrNull(fields.pointerType),
		key: null,
		code: null,
		repeat: null,
		shiftKey: !!fields.shiftKey,
		ctrlKey: !!fields.ctrlKey,
		altKey: !!fields.altKey,
		metaKey: !!fields.metaKey,
		deltaX: fields.deltaX,
		deltaY: fields.deltaY,
		deltaZ: fields.deltaZ,
		deltaMode: unitOf(fields.deltaMode),
		time: timeOf(fields.timeStamp),
	};
	return Object.freeze(fact) as PointerFact<Hit> | WheelFact<Hit> | ContextMenuFact<Hit>;
}

/** A key fact: the event's fields and the focus answer given. */
export function makeKeyFact<Focus>(type: KeyFactType, focus: Focus, fields: KeyFields): KeyFact<Focus> {
	return Object.freeze({
		type,
		at: null,
		screen: null,
		hit: null,
		focus,
		button: null,
		buttons: null,
		pointerId: null,
		pointerType: null,
		key: stringOrNull(fields.key),
		code: stringOrNull(fields.code),
		repeat: !!fields.repeat,
		shiftKey: !!fields.shiftKey,
		ctrlKey: !!fields.ctrlKey,
		altKey: !!fields.altKey,
		metaKey: !!fields.metaKey,
		deltaX: null,
		deltaY: null,
		deltaZ: null,
		deltaMode: null,
		time: timeOf(fields.timeStamp),
	});
}

/** A blur fact: its time, every modifier false, and every other property null. */
export function makeBlurFact(fields: BlurFields): BlurFact {
	return Object.freeze({
		type: "blur",
		at: null,
		screen: null,
		hit: null,
		focus: null,
		button: null,
		buttons: null,
		pointerId: null,
		pointerType: null,
		key: null,
		code: null,
		repeat: null,
		shiftKey: false,
		ctrlKey: false,
		altKey: false,
		metaKey: false,
		deltaX: null,
		deltaY: null,
		deltaZ: null,
		deltaMode: null,
		time: timeOf(fields.timeStamp),
	});
}

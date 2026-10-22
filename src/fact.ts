/**
 * The fact (CONTRACT.md, IC5): a frozen record of exactly sixteen properties, in one order, each null where
 * its family carries none.
 *
 * at and screen hold exactly the numbers read, -0 kept, and every other number is the event's own: capture
 * computes no number. A fact holds no time, no event, no target and no function.
 */
import type { KeyFields, PointerFields } from "./event-reading.js";
import type { CapturePoint, KeyFact, KeyFactType, PointerFact, PointerFactType } from "./types.js";

const safeIntegerOrNull = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) ? value : null);
const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** A point: a fresh frozen record of the two numbers given, exactly. */
export const frozenPoint = (x: number, y: number): CapturePoint => Object.freeze({ x, y });

/** A pointer fact: the event's fields, the converted point and the screen point, and the hit answer given. */
export function makePointerFact<Hit>(type: PointerFactType, at: CapturePoint, screen: CapturePoint, hit: Hit, fields: PointerFields): PointerFact<Hit> {
	return Object.freeze({
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
	});
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
	});
}

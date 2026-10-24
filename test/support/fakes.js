// fakes - plain-object platforms for the contract's tests (INPUT-CAPTURE.md section 4): a surface and a key
// source whose addEventListener records each listener, events of a browser's shape, and Node.js's own
// EventTarget for a dispatch that runs every listener.

/**
 * A fake platform object: addEventListener and removeEventListener record each call, with its receiver and
 * its arguments, into `log`, and keep the live listeners by event name. `throwOnAdd` names the 0-based add
 * that throws, and `addThenThrow` whether it adds its listener first; `throwOnRemove` names the 0-based
 * removals that throw, leaving their listener added. A surface also has setPointerCapture, recorded, which throws when `refuse` is set.
 */
export function fakeObject(label, log, { surface = true, throwOnAdd = -1, addThenThrow = false, throwOnRemove = [], refuse = false } = {}) {
	const live = new Map();
	let adds = 0, removes = 0;
	const object = {
		addEventListener(...args) {
			log.push({ call: `${label}.addEventListener`, self: this, args });
			const [name, listener] = args;
			const throwing = adds++ === throwOnAdd;
			if (throwing && !addThenThrow) throw new Error(`${label} refused to add ${name}`);
			live.set(name, listener);
			if (throwing) throw new Error(`${label} added ${name}, then refused`);
		},
		removeEventListener(...args) {
			log.push({ call: `${label}.removeEventListener`, self: this, args });
			const [name, listener] = args;
			if (throwOnRemove.includes(removes++)) throw new Error(`${label} refused to remove ${name}`);
			if (live.get(name) === listener) live.delete(name);
		},
	};
	if (surface) {
		object.setPointerCapture = function (...args) {
			log.push({ call: `${label}.setPointerCapture`, self: this, args });
			if (refuse) throw new Error("the pointer is not active");
		};
	}
	return { object, live, fire: (name, event) => live.get(name)(event) };
}

/** A surface and a key source, sharing one log. */
export function fakePlatform(options = {}) {
	const log = [];
	const surface = fakeObject("surface", log, options.surface ?? {});
	const keys = fakeObject("keys", log, { surface: false, ...(options.keys ?? {}) });
	return { log, surface, keys };
}

/** A pointer event of a browser's shape, as plain data; preventDefault records its receiver. */
export function pointerEvent(fields = {}) {
	const event = { clientX: 10, clientY: 20, button: 0, buttons: 1, pointerId: 7, pointerType: "mouse", shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, target: { kind: "target" }, prevented: 0, ...fields };
	if (!("preventDefault" in fields)) event.preventDefault = function () {
		this.prevented++;
	};
	return event;
}

/** A wheel event of a browser's shape, as plain data: a pointer event's fields but pointerId and pointerType, and its deltas and unit. */
export function wheelEvent(fields = {}) {
	const event = pointerEvent({ button: 0, buttons: 0, deltaX: 0, deltaY: 120, deltaZ: 0, deltaMode: 0, timeStamp: 100, ...fields });
	if (!("pointerId" in fields)) delete event.pointerId;
	if (!("pointerType" in fields)) delete event.pointerType;
	return event;
}

/** The key source's blur, of a browser's shape, as plain data: its timeStamp and preventDefault, and a target capture never reads. */
export function blurEvent(fields = {}) {
	const event = { timeStamp: 200, target: { kind: "target" }, prevented: 0, ...fields };
	if (!("preventDefault" in fields)) event.preventDefault = function () {
		this.prevented++;
	};
	return event;
}

/** A key event of a browser's shape, as plain data; preventDefault records its receiver. */
export function keyEvent(fields = {}) {
	const event = { key: "a", code: "KeyA", repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, target: { kind: "target" }, prevented: 0, ...fields };
	if (!("preventDefault" in fields)) event.preventDefault = function () {
		this.prevented++;
	};
	return event;
}

/** A declaration over a fake platform, delivering every fact into `delivered` with its reply. */
export function declarationOver(platform, extra = {}) {
	const delivered = [];
	const declaration = {
		surface: platform.surface.object,
		keys: platform.keys.object,
		toDrawing: (screen) => ({ x: screen.x * 2, y: screen.y * 2 }),
		deliver: (fact, reply) => delivered.push({ fact, reply }),
		...extra,
	};
	return { declaration, delivered };
}

/**
 * An event of Node.js's own EventTarget whose fields are inherited accessors, as a browser's are, and whose
 * preventDefault and defaultPrevented are the platform's own.
 */
export class PlatformPointerEvent extends Event {
	#fields;
	constructor(type, fields = {}) {
		super(type, { cancelable: true });
		this.#fields = { clientX: 0, clientY: 0, button: 0, buttons: 0, pointerId: 1, pointerType: "mouse", shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...fields };
	}
	get clientX() { return this.#fields.clientX; }
	get clientY() { return this.#fields.clientY; }
	get button() { return this.#fields.button; }
	get buttons() { return this.#fields.buttons; }
	get pointerId() { return this.#fields.pointerId; }
	get pointerType() { return this.#fields.pointerType; }
	get shiftKey() { return this.#fields.shiftKey; }
	get ctrlKey() { return this.#fields.ctrlKey; }
	get altKey() { return this.#fields.altKey; }
	get metaKey() { return this.#fields.metaKey; }
}

/** A wheel event of Node.js's own EventTarget, its fields -- the deltas and their unit among them -- inherited accessors. */
export class PlatformWheelEvent extends PlatformPointerEvent {
	#deltas;
	constructor(type, fields = {}) {
		super(type, { pointerId: undefined, pointerType: undefined, ...fields });
		this.#deltas = { deltaX: 0, deltaY: 0, deltaZ: 0, deltaMode: 0, ...fields };
	}
	get deltaX() { return this.#deltas.deltaX; }
	get deltaY() { return this.#deltas.deltaY; }
	get deltaZ() { return this.#deltas.deltaZ; }
	get deltaMode() { return this.#deltas.deltaMode; }
}

/** A key event of Node.js's own EventTarget, its fields inherited accessors. */
export class PlatformKeyEvent extends Event {
	#fields;
	constructor(type, fields = {}) {
		super(type, { cancelable: true });
		this.#fields = { key: "a", code: "KeyA", repeat: false, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...fields };
	}
	get key() { return this.#fields.key; }
	get code() { return this.#fields.code; }
	get repeat() { return this.#fields.repeat; }
	get shiftKey() { return this.#fields.shiftKey; }
	get ctrlKey() { return this.#fields.ctrlKey; }
	get altKey() { return this.#fields.altKey; }
	get metaKey() { return this.#fields.metaKey; }
}

/** A surface that is Node.js's own EventTarget, with a setPointerCapture that records its pointerId. */
export class PlatformSurface extends EventTarget {
	captured = [];
	setPointerCapture(pointerId) {
		this.captured.push(pointerId);
	}
}

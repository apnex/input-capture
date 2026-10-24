/**
 * The public types of input-capture, one per noun of CONTRACT.md's vocabulary (IC9).
 *
 * The platform slice IC1 touches is stated here as input-capture's own structural types, with no DOM
 * library: a browser's elements, its window and its events are assignable to them, and so are plain
 * objects of their shape. Every value capture makes is frozen, so every property here is read-only.
 * The types are generic in the application's hit and focus answers.
 */

/** A point: a frozen record of finite numbers x and y. */
export interface CapturePoint {
	readonly x: number;
	readonly y: number;
}

/** What the conversion answers: an object whose x and y are finite numbers, read through ordinary access, so a point with getters answers. */
export interface ConvertedPoint {
	readonly x: number;
	readonly y: number;
}

/** A listener capture hands the platform: it takes any value, and judges it before reading anything (IC6). */
export type CaptureListener = (event: unknown) => void;

/** The name of an event family a capture listens for only when its declaration lists it in `listen` (IC3, IC4). */
export type ListenName = "wheel" | "context-menu" | "blur";

/**
 * The surface (IC1): the element whose pointer events capture listens to, and on which it takes the pointer.
 * Its addEventListener is handed a third argument for the wheel alone, a fresh frozen { passive: false } (IC4).
 */
export interface CaptureSurface {
	addEventListener(type: string, listener: CaptureListener, options?: { readonly passive: false }): void;
	removeEventListener(type: string, listener: CaptureListener): void;
	setPointerCapture(pointerId: number): void;
}

/** The key source (IC1): what capture listens to for key events, and for its own focus loss when `listen` names it, which the application chooses. */
export interface CaptureKeySource {
	addEventListener(type: string, listener: CaptureListener): void;
	removeEventListener(type: string, listener: CaptureListener): void;
}

/**
 * A pointer, double-click or context-menu event, as capture reads one (IC1, IC6): every field it reads and no
 * other. Fields capture accepts absent are optional; a double click carries no pointerId or pointerType.
 */
export interface CapturePointerEvent {
	readonly clientX: number;
	readonly clientY: number;
	readonly button?: number | null | undefined;
	readonly buttons?: number | undefined;
	readonly pointerId?: number | undefined;
	readonly pointerType?: string | undefined;
	readonly shiftKey?: boolean | undefined;
	readonly ctrlKey?: boolean | undefined;
	readonly altKey?: boolean | undefined;
	readonly metaKey?: boolean | undefined;
	readonly timeStamp?: number | undefined;
	readonly target?: unknown;
	preventDefault(): void;
}

/** A wheel event, as capture reads one (IC1, IC6): a pointer event's fields, and its deltas and their unit. */
export interface CaptureWheelEvent extends CapturePointerEvent {
	readonly deltaX: number;
	readonly deltaY: number;
	readonly deltaZ: number;
	readonly deltaMode?: number | undefined;
}

/** A key event, as capture reads one (IC1, IC6): every field it reads and no other. */
export interface CaptureKeyEvent {
	readonly key?: string | undefined;
	readonly code?: string | undefined;
	readonly repeat?: boolean | undefined;
	readonly shiftKey?: boolean | undefined;
	readonly ctrlKey?: boolean | undefined;
	readonly altKey?: boolean | undefined;
	readonly metaKey?: boolean | undefined;
	readonly timeStamp?: number | undefined;
	readonly target?: unknown;
	preventDefault(): void;
}

/** The key source's focus loss, as capture reads it (IC1, IC6): its timeStamp and preventDefault, and no target. */
export interface CaptureBlurEvent {
	readonly timeStamp?: number | undefined;
	preventDefault(): void;
}

/** The type of a pointer fact, one per pointer or double-click event capture always listens for (IC4). */
export type PointerFactType = "leave" | "down" | "move" | "up" | "cancel" | "over" | "out" | "double";

/** The type of a key fact (IC4). */
export type KeyFactType = "key-down" | "key-up";

/**
 * A fact made from a pointer or double-click event (IC5); `hit` is the application's answer, or null when it
 * gives no hit function; `time` is the event's own timeStamp when a finite number, never a clock reading.
 */
export interface PointerFact<Hit = null> {
	readonly type: PointerFactType;
	readonly at: CapturePoint;
	readonly screen: CapturePoint;
	readonly hit: Hit;
	readonly focus: null;
	readonly button: number;
	readonly buttons: number | null;
	readonly pointerId: number | null;
	readonly pointerType: string | null;
	readonly key: null;
	readonly code: null;
	readonly repeat: null;
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	readonly deltaX: null;
	readonly deltaY: null;
	readonly deltaZ: null;
	readonly deltaMode: null;
	readonly time: number | null;
}

/**
 * A fact made from a wheel event, a pointer fact a capture delivers only when its declaration lists 'wheel'
 * (IC4, IC5): the deltas exactly as delivered, `-0` kept, in the unit `deltaMode` names -- 0 pixels, 1 lines,
 * 2 pages -- never converted. A touchpad's pinch arrives as one with `ctrlKey` true, alike to Ctrl and the wheel.
 */
export interface WheelFact<Hit = null> {
	readonly type: "wheel";
	readonly at: CapturePoint;
	readonly screen: CapturePoint;
	readonly hit: Hit;
	readonly focus: null;
	readonly button: number;
	readonly buttons: number | null;
	readonly pointerId: number | null;
	readonly pointerType: string | null;
	readonly key: null;
	readonly code: null;
	readonly repeat: null;
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	readonly deltaX: number;
	readonly deltaY: number;
	readonly deltaZ: number;
	readonly deltaMode: 0 | 1 | 2 | null;
	readonly time: number | null;
}

/** A fact made from a context-menu event, a pointer fact a capture delivers only when its declaration lists 'context-menu' (IC4, IC5). */
export interface ContextMenuFact<Hit = null> {
	readonly type: "context-menu";
	readonly at: CapturePoint;
	readonly screen: CapturePoint;
	readonly hit: Hit;
	readonly focus: null;
	readonly button: number;
	readonly buttons: number | null;
	readonly pointerId: number | null;
	readonly pointerType: string | null;
	readonly key: null;
	readonly code: null;
	readonly repeat: null;
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	readonly deltaX: null;
	readonly deltaY: null;
	readonly deltaZ: null;
	readonly deltaMode: null;
	readonly time: number | null;
}

/** A fact made from a key event (IC5); `focus` is the application's answer, or null when it gives no focus function. */
export interface KeyFact<Focus = null> {
	readonly type: KeyFactType;
	readonly at: null;
	readonly screen: null;
	readonly hit: null;
	readonly focus: Focus;
	readonly button: null;
	readonly buttons: null;
	readonly pointerId: null;
	readonly pointerType: null;
	readonly key: string | null;
	readonly code: string | null;
	readonly repeat: boolean;
	readonly shiftKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly metaKey: boolean;
	readonly deltaX: null;
	readonly deltaY: null;
	readonly deltaZ: null;
	readonly deltaMode: null;
	readonly time: number | null;
}

/**
 * A fact made from the key source's focus loss, delivered only when the declaration lists 'blur' (IC4, IC5): its
 * time, every modifier false and every other property null; neither hit nor focus is asked for it.
 */
export interface BlurFact {
	readonly type: "blur";
	readonly at: null;
	readonly screen: null;
	readonly hit: null;
	readonly focus: null;
	readonly button: null;
	readonly buttons: null;
	readonly pointerId: null;
	readonly pointerType: null;
	readonly key: null;
	readonly code: null;
	readonly repeat: null;
	readonly shiftKey: false;
	readonly ctrlKey: false;
	readonly altKey: false;
	readonly metaKey: false;
	readonly deltaX: null;
	readonly deltaY: null;
	readonly deltaZ: null;
	readonly deltaMode: null;
	readonly time: number | null;
}

/** The pointer facts a declaration's `listen` adds: a WheelFact for 'wheel' and a ContextMenuFact for 'context-menu'. */
type ListenedPointerFact<Hit, Listen extends ListenName> = ("wheel" extends Listen ? WheelFact<Hit> : never) | ("context-menu" extends Listen ? ContextMenuFact<Hit> : never);

/**
 * The frozen record capture makes from one event (IC5): a pointer or key fact, and a fact of each family the
 * declaration lists in `listen`, `Listen` being the names it lists -- none by default.
 */
export type CaptureFact<Hit = null, Focus = null, Listen extends ListenName = never> = PointerFact<Hit> | KeyFact<Focus> | ListenedPointerFact<Hit, Listen> | ("blur" extends Listen ? BlurFact : never);

/** What the application may ask of one fact while it is delivered (IC8). */
export interface CaptureReply {
	/** Prevents the platform's default action for the event, at once; later calls do nothing. */
	readonly claim: () => undefined;
	/** Takes the pointer on the surface, at once: true when the platform agreed, false when it refused or the fact has no pointerId. */
	readonly takePointer: () => boolean;
}

/** An open capture (IC3). */
export interface Capture {
	/** Closes the capture and removes every listener it added; later calls do nothing. */
	readonly close: () => undefined;
}

/** What every declaration holds, whether or not it gives a key source. */
interface CaptureDeclarationBase<Hit, Focus, Listen extends ListenName> {
	/** The element whose pointer events capture listens to. */
	readonly surface: CaptureSurface;
	/** The conversion: where a screen point lies in the application's coordinates (IC7). */
	readonly toDrawing: (screen: CapturePoint) => ConvertedPoint;
	/** The hit test, asked for every pointer fact with the platform's target and the fact so far (IC7). */
	readonly hit?: (target: unknown, fact: PointerFact<null> | ListenedPointerFact<null, Listen>) => Hit;
	/** The delivery, handed every fact with its reply; its answer is ignored (IC7). */
	readonly deliver: (fact: CaptureFact<Hit, Focus, Listen>, reply: CaptureReply) => unknown;
	/** The event families listened for beyond the pointer and key events, each named once; absent, none (IC3, IC4). */
	readonly listen?: readonly Listen[];
}

/** A declaration giving a key source, and optionally the focus reading and its focus loss. */
export interface CaptureDeclarationWithKeys<Hit, Focus, Listen extends ListenName = never> extends CaptureDeclarationBase<Hit, Focus, Listen> {
	/** What capture listens to for key events: the surface itself is allowed. */
	readonly keys: CaptureKeySource;
	/** The focus reading, asked for every key fact with the platform's target and the fact so far (IC7). */
	readonly focus?: (target: unknown, fact: KeyFact<null>) => Focus;
}

/** A declaration giving no key source, and so no focus reading and no focus loss. */
export interface CaptureDeclarationWithoutKeys<Hit, Listen extends Exclude<ListenName, "blur"> = never> extends CaptureDeclarationBase<Hit, null, Listen> {
	readonly keys?: never;
	readonly focus?: never;
}

/** A capture's declaration (IC3): `focus`, and 'blur' in `listen`, require `keys`; `Listen` is inferred from `listen`'s elements. */
export type CaptureDeclaration<Hit = null, Focus = null, Listen extends ListenName = never> = CaptureDeclarationWithKeys<Hit, Focus, Listen> | CaptureDeclarationWithoutKeys<Hit, Exclude<Listen, "blur">>;

/** The codes a refused declaration's problems carry (IC3). */
export type DeclarationProblemCode = "not-an-object" | "unknown-property" | "missing-property" | "invalid-value";

/** One problem of a refused declaration: an RFC 6901 pointer into it, and a code. */
export interface DeclarationProblem {
	readonly pointer: string;
	readonly problem: DeclarationProblemCode;
}

/** What openCapture returns: the open capture, or every problem of its declaration (IC3). */
export type OpenCaptureResult = { readonly ok: true; readonly capture: Capture } | { readonly ok: false; readonly problems: readonly DeclarationProblem[] };

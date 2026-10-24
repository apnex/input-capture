// A TypeScript consumer of input-capture's public entry point, compiled by public-types.test.js under strict
// settings, with and without exactOptionalPropertyTypes, and with the DOM library a page has (I11): a
// browser's SVG element, canvas element and window are passed where IC3 asks; the hit and focus types
// reach fact.hit and fact.focus, and null when they are omitted; the families `listen` names reach the
// delivered fact and the hit's, and no other (IC9). Each line marked as an expected error must fail to
// compile, or the compile fails.
import {
	openCapture,
	type BlurFact,
	type CaptureBlurEvent,
	type CaptureFact,
	type CaptureKeyEvent,
	type CaptureKeySource,
	type CapturePointerEvent,
	type CaptureReply,
	type CaptureSurface,
	type CaptureWheelEvent,
	type ContextMenuFact,
	type KeyFact,
	type ListenName,
	type PointerFact,
	type WheelFact,
} from "@apnex/input-capture";

declare const svg: SVGSVGElement;
declare const canvas: HTMLCanvasElement;
declare const page: Window;
declare const pointerEvent: PointerEvent;
declare const mouseEvent: MouseEvent;
declare const keyEvent: KeyboardEvent;
declare const wheelEvent: WheelEvent;
declare const focusEvent: FocusEvent;

// A browser's elements, window and events are assignable to the platform slice.
const surfaces: readonly CaptureSurface[] = [svg, canvas];
const sources: readonly CaptureKeySource[] = [page, svg, canvas];
const pointerEvents: readonly CapturePointerEvent[] = [pointerEvent, mouseEvent, wheelEvent];
const keyEvents: readonly CaptureKeyEvent[] = [keyEvent];
const wheelEvents: readonly CaptureWheelEvent[] = [wheelEvent];
const blurEvents: readonly CaptureBlurEvent[] = [focusEvent, keyEvent, pointerEvent];

interface Hit {
	readonly on: string | null;
	readonly region: number | null;
}
interface Focus {
	readonly typing: boolean;
}

// An SVG element and the window, with hit and focus: their types reach the delivered fact.
const full = openCapture({
	surface: svg,
	keys: page,
	toDrawing: (screen) => new DOMPoint(screen.x, screen.y).matrixTransform(svg.getScreenCTM()?.inverse()),
	hit: (target, fact): Hit => ({ on: target === svg ? "surface" : null, region: fact.type === "down" ? 1 : null }),
	focus: (target, fact): Focus => ({ typing: target !== page && fact.key !== null }),
	deliver: (fact, reply) => {
		if (fact.at !== null) {
			const hit: Hit = fact.hit;
			const x: number = fact.at.x + fact.screen.x;
			const button: number = fact.button;
			const pointerId: number | null = fact.pointerId;
			const focus: null = fact.focus;
			const taken: boolean = reply.takePointer();
			void [hit, x, button, pointerId, focus, taken];
		} else {
			const focus: Focus = fact.focus;
			const key: string | null = fact.key;
			const repeat: boolean = fact.repeat;
			const hit: null = fact.hit;
			const claimed: undefined = reply.claim();
			void [focus, key, repeat, hit, claimed];
		}
		// @ts-expect-error -- a fact's property cannot be written
		fact.type = "down";
		if (fact.at !== null) {
			// @ts-expect-error -- nor its point's
			fact.at.x = 0;
		}
		// @ts-expect-error -- nor a reply's
		reply.claim = () => undefined;
	},
});

// A canvas element with no key source and no hit or focus: both read null.
const bare = openCapture({
	surface: canvas,
	toDrawing: (screen) => ({ x: screen.x, y: screen.y }),
	deliver: (fact: CaptureFact) => {
		const hit: null = fact.hit;
		const focus: null = fact.focus;
		void [hit, focus];
	},
});

// The same inferred, the fact unannotated, and with a key source but no focus: still null.
const inferred = openCapture({
	surface: svg,
	keys: svg,
	toDrawing: (screen) => screen,
	deliver: (fact) => {
		const hit: null = fact.hit;
		const focus: null = fact.focus;
		// @ts-expect-error -- null is no string
		const wrong: string = fact.hit;
		void [hit, focus, wrong];
	},
});

// The declaration's type refuses focus without keys.
// @ts-expect-error -- focus requires keys
openCapture({ surface: svg, toDrawing: (screen) => screen, focus: () => true, deliver: () => undefined });

// A window is no surface: it has no setPointerCapture.
// @ts-expect-error -- the surface must take the pointer
openCapture({ surface: page, toDrawing: (screen) => screen, deliver: () => undefined });

// The conversion must answer a point.
// @ts-expect-error -- an answer with no y
openCapture({ surface: svg, toDrawing: (screen) => ({ x: screen.x }), deliver: () => undefined });

// deliver is required.
// @ts-expect-error -- no delivery
openCapture({ surface: svg, toDrawing: (screen) => screen });

// The result is told apart by ok.
if (full.ok) {
	const closed: undefined = full.capture.close();
	void closed;
} else {
	const pointers: readonly string[] = full.problems.map((p) => p.pointer);
	void pointers;
}

// A fact's families, named.
declare const pointerFact: PointerFact<Hit>;
declare const keyFact: KeyFact<Focus>;
const facts: readonly CaptureFact<Hit, Focus>[] = [pointerFact, keyFact];
declare const reply: CaptureReply;

// listen: each family it names reaches the delivered fact, inferred from its elements, with its own shape.
const listening = openCapture({
	surface: svg,
	keys: page,
	toDrawing: (screen) => screen,
	hit: (target, fact): Hit => ({ on: target === svg ? "surface" : null, region: fact.type === "wheel" ? fact.deltaY : fact.type === "context-menu" ? fact.button : null }),
	listen: ["blur", "wheel", "context-menu"],
	deliver: (fact, reply) => {
		const time: number | null = fact.time;
		if (fact.type === "wheel") {
			const deltas: readonly number[] = [fact.deltaX, fact.deltaY, fact.deltaZ];
			const unit: 0 | 1 | 2 | null = fact.deltaMode;
			const pinchOrCtrl: boolean = fact.ctrlKey;
			const hit: Hit = fact.hit;
			const claimed: undefined = reply.claim();
			void [deltas, unit, pinchOrCtrl, hit, claimed];
		} else if (fact.type === "context-menu") {
			const button: number = fact.button;
			const pointerId: number | null = fact.pointerId;
			const deltaX: null = fact.deltaX;
			void [button, pointerId, deltaX];
		} else if (fact.type === "blur") {
			const shift: false = fact.shiftKey;
			const nothing: readonly null[] = [fact.at, fact.screen, fact.hit, fact.focus, fact.key, fact.code, fact.repeat, fact.deltaX, fact.deltaMode];
			const whole: BlurFact = fact;
			void [shift, nothing, whole];
		} else if (fact.at !== null) {
			const deltaX: null = fact.deltaX;
			const deltaMode: null = fact.deltaMode;
			void [deltaX, deltaMode];
		} else {
			const repeat: boolean = fact.repeat;
			void repeat;
		}
		void time;
	},
});

// Every fact holds a time, a number or null, and the families' fields null where they carry none.
const pointerTime: number | null = pointerFact.time;
const keyTime: number | null = keyFact.time;
const keyDelta: null = keyFact.deltaY;
declare const wheelFact: WheelFact<Hit>;
declare const menuFact: ContextMenuFact<Hit>;
declare const blurFact: BlurFact;
const listed: readonly CaptureFact<Hit, Focus, ListenName>[] = [pointerFact, keyFact, wheelFact, menuFact, blurFact];
const names: readonly ListenName[] = ["wheel", "context-menu", "blur"];

// A declaration that lists no wheel delivers none: comparing a fact's type with 'wheel' fails to compile.
openCapture({
	surface: svg,
	keys: page,
	toDrawing: (screen) => screen,
	listen: ["context-menu"],
	deliver: (fact) => {
		// @ts-expect-error -- 'wheel' is not listed, so no fact's type is 'wheel'
		if (fact.type === "wheel") void fact;
		// @ts-expect-error -- nor 'blur'
		if (fact.type === "blur") void fact;
		if (fact.type === "context-menu") void fact.button;
	},
});
openCapture({
	surface: canvas,
	toDrawing: (screen) => screen,
	deliver: (fact) => {
		// @ts-expect-error -- with no listen at all, no fact's type is 'wheel'
		if (fact.type === "wheel") void fact;
		// @ts-expect-error -- and no fact's deltaX is a number
		const deltaX: number = fact.deltaX;
		void deltaX;
	},
});

// A listen array made apart keeps its names with `as const`; one widened to string[] is refused.
const apart = ["wheel"] as const;
openCapture({ surface: svg, toDrawing: (screen) => screen, listen: apart, deliver: (fact) => void (fact.type === "wheel" ? fact.deltaY : 0) });
const widened: string[] = ["wheel"];
// @ts-expect-error -- a string[] is no list of the three names
openCapture({ surface: svg, toDrawing: (screen) => screen, listen: widened, deliver: () => undefined });

// @ts-expect-error -- 'blur' requires keys
openCapture({ surface: svg, toDrawing: (screen) => screen, listen: ["blur"], deliver: () => undefined });

// @ts-expect-error -- an unknown name
openCapture({ surface: svg, keys: page, toDrawing: (screen) => screen, listen: ["scroll"], deliver: () => undefined });

void [surfaces, sources, pointerEvents, keyEvents, wheelEvents, blurEvents, bare, inferred, facts, reply, listening, pointerTime, keyTime, keyDelta, listed, names];

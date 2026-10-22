// A TypeScript consumer of input-capture's public entry point, compiled by public-types.test.js under strict
// settings, with and without exactOptionalPropertyTypes, and with the DOM library a page has (I11): a
// browser's SVG element, canvas element and window are passed where IC3 asks; the hit and focus types
// reach fact.hit and fact.focus, and null when they are omitted. Each line marked as an expected error must
// fail to compile, or the compile fails.
import { openCapture, type CaptureFact, type CaptureKeyEvent, type CaptureKeySource, type CapturePointerEvent, type CaptureReply, type CaptureSurface, type KeyFact, type PointerFact } from "@apnex/input-capture";

declare const svg: SVGSVGElement;
declare const canvas: HTMLCanvasElement;
declare const page: Window;
declare const pointerEvent: PointerEvent;
declare const mouseEvent: MouseEvent;
declare const keyEvent: KeyboardEvent;

// A browser's elements, window and events are assignable to the platform slice.
const surfaces: readonly CaptureSurface[] = [svg, canvas];
const sources: readonly CaptureKeySource[] = [page, svg, canvas];
const pointerEvents: readonly CapturePointerEvent[] = [pointerEvent, mouseEvent];
const keyEvents: readonly CaptureKeyEvent[] = [keyEvent];

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

void [surfaces, sources, pointerEvents, keyEvents, bare, inferred, facts, reply];

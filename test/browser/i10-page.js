// i10-page - the page I10 drives (CONTRACT.md I10): a capture opened on an SVG element, with the window as
// its key source, listening also for the wheel, the context menu and focus loss, its conversion through the
// element's screen transform answering a DOMPoint, and a delivery that records each fact and, as the page's
// policy says, takes the pointer on a press, claims a key-down, a wheel or a context menu. Later listeners on
// the window and the surface record whether a key-down or a context menu they see was claimed.
import { openCapture } from "@apnex/input-capture";

const surface = document.getElementById("surface");
const describe = (target) => (target && (target.id || target.nodeName)) || String(target);
const page = (globalThis.page = { facts: [], times: [], later: [], laterMenu: [], policy: { take: false, claim: [], claimWheel: false, claimMenu: false }, capture: null, refused: null });

/** A fact as the page records it, every property IC5 gives, its points as pairs. */
const recordOf = (fact) => ({
	type: fact.type,
	at: fact.at && [fact.at.x, fact.at.y],
	screen: fact.screen && [fact.screen.x, fact.screen.y],
	hit: fact.hit,
	focus: fact.focus,
	button: fact.button,
	buttons: fact.buttons,
	pointerId: fact.pointerId,
	pointerType: fact.pointerType,
	key: fact.key,
	code: fact.code,
	repeat: fact.repeat,
	modifiers: [fact.shiftKey, fact.ctrlKey, fact.altKey, fact.metaKey],
	deltas: [fact.deltaX, fact.deltaY, fact.deltaZ],
	deltaMode: fact.deltaMode,
	time: fact.time,
	keys: Object.keys(fact).length,
	frozen: Object.isFrozen(fact) && (fact.at === null || Object.isFrozen(fact.at)),
});

const opened = openCapture({
	surface,
	keys: window,
	listen: ["wheel", "context-menu", "blur"],
	toDrawing: (screen) => new DOMPoint(screen.x, screen.y).matrixTransform(surface.getScreenCTM().inverse()),
	hit: (target) => describe(target),
	focus: (target) => describe(target),
	deliver: (fact, reply) => {
		const record = recordOf(fact);
		page.times.push(fact.time);
		if (fact.type === "down" && page.policy.take) record.taken = reply.takePointer();
		if ((fact.type === "key-down" && page.policy.claim.includes(fact.key)) || (fact.type === "wheel" && page.policy.claimWheel) || (fact.type === "context-menu" && page.policy.claimMenu)) {
			reply.claim();
			record.claimed = true;
		}
		page.facts.push(record);
	},
});
if (opened.ok) page.capture = opened.capture;
else page.refused = opened.problems;

// added after the capture's own listeners, so each sees what the capture's delivery did
window.addEventListener("keydown", (event) => page.later.push({ key: event.key, defaultPrevented: event.defaultPrevented }));
surface.addEventListener("contextmenu", (event) => page.laterMenu.push({ defaultPrevented: event.defaultPrevented, kind: event.constructor.name }));
page.ready = true;

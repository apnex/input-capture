// i10-page - the page I10 drives (CONTRACT.md I10): a capture opened on an SVG element, with the window as
// its key source, its conversion through the element's screen transform answering a DOMPoint, and a
// delivery that records each fact and, as the page's policy says, takes the pointer on a press or claims
// a key-down. A later listener on the window records whether a key-down it sees was claimed.
import { openCapture } from "@apnex/input-capture";

const surface = document.getElementById("surface");
const describe = (target) => (target && (target.id || target.nodeName)) || String(target);
const page = (globalThis.page = { facts: [], later: [], policy: { take: false, claim: [] }, capture: null, closed: undefined, refused: null });

const opened = openCapture({
	surface,
	keys: window,
	toDrawing: (screen) => new DOMPoint(screen.x, screen.y).matrixTransform(surface.getScreenCTM().inverse()),
	hit: (target) => describe(target),
	focus: (target) => describe(target),
	deliver: (fact, reply) => {
		const record = {
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
			frozen: Object.isFrozen(fact) && (fact.at === null || Object.isFrozen(fact.at)),
		};
		if (fact.type === "down" && page.policy.take) record.taken = reply.takePointer();
		if (fact.type === "key-down" && page.policy.claim.includes(fact.key)) {
			reply.claim();
			record.claimed = true;
		}
		page.facts.push(record);
	},
});
if (opened.ok) page.capture = opened.capture;
else page.refused = opened.problems;

// added after the capture's own key-down listener, so it sees what the capture's delivery did
window.addEventListener("keydown", (event) => page.later.push({ key: event.key, defaultPrevented: event.defaultPrevented }));
page.ready = true;

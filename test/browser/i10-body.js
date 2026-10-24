// i10-body - the fresh page I10's body case drives (CONTRACT.md I10, IC4): a browser makes a wheel listener on the
// window, the document or the body passive unless it is added with { passive: false }, so a claim there prevents
// nothing. With `?mode=capture` a capture opens on the body, listing the wheel and claiming every wheel; with
// `?mode=two-args`, the control, the page adds its own listener on the body with two arguments, calling
// preventDefault. A later listener records whether each wheel it sees was cancelable and prevented.
import { openCapture } from "@apnex/input-capture";

const mode = new URL(location.href).searchParams.get("mode");
const page = (globalThis.page = { mode, facts: [], seen: [], refused: null, ready: false });

if (mode === "capture") {
	const opened = openCapture({
		surface: document.body,
		listen: ["wheel"],
		toDrawing: (screen) => ({ x: screen.x, y: screen.y }),
		deliver: (fact, reply) => {
			if (fact.type !== "wheel") return;
			reply.claim();
			page.facts.push([fact.type, fact.deltaY, fact.deltaMode]);
		},
	});
	if (!opened.ok) page.refused = opened.problems;
} else if (mode === "two-args") {
	document.body.addEventListener("wheel", (event) => event.preventDefault());
}

// added after the listener under test, so it sees what that listener did
document.body.addEventListener("wheel", (event) => page.seen.push({ cancelable: event.cancelable, defaultPrevented: event.defaultPrevented }), { passive: true });
page.ready = true;

# Decisions

One ruling per entry, append-only.\
A ruling is never edited; a later one supersedes it and says so.

Rulings that shape this component together with its first consumer are held in draw's `dev/DECISIONS.md` (`apnex/drawv2`), and cited here as "draw's `Hn-m`".

---

## D1 - The component stands in its own public repository

**Ruled by:** the director, 2026-10-20 (draw's `H26-1` and `H26-2`).\
**Affects:** this repository, its package and its releases.

**Ruling.**\
input-capture is a component of its own, in the public repository `apnex/input-capture`, its package `@apnex/input-capture`, released from its own CI and taken by draw as a release file pinned by its hash.\
Its versions are `0.x` until mission-kit admits it to the component registry.

**Why.**\
Each component holds its own boundary and its own history from the start, so a consumer composes it through a declared contract rather than a copy, and a second consumer can adopt it without a fork.

---

## D2 - The contract of record is draw's ratified design

**Ruled by:** the director, 2026-10-22 (draw's `H26-8`).\
**Affects:** `CONTRACT.md`, `VISION.md`, `src/`, `test/`, `tools/` and `.github/workflows/`.

**Ruling.**\
The contract of record is section 3 of draw's `dev/design/components/INPUT-CAPTURE.md`, revision 3, ratified with all eleven of its decisions as recommended, D6 (no wheel listener until the wheel's first consumer is designed) and D7 (the screen point, `pointerId`, `pointerType`, `buttons` and `code` carried) as the director answered them; `CONTRACT.md` carries it, its section 4 holds the invariants and tests, and its section 7 states where this repository differs from the shared parts `snap-grid` settled and `input-binding` built again.\
`VISION.md` is that design's appendix A, ratified as written.

**Choices made at build, each confirmed by the recorder.**\
Where section 3 was silent or left a choice open, the build made these; each that a test can hold is held by one, and each that a consumer can observe is stated here:
- The surface's and the key source's members are read whenever `surface` or `keys` holds an object, whatever else the declaration's problems are -- an unknown property or a missing `deliver` among them -- since IC2 rule 2's order is unconditional; nothing is called until the declaration is judged.
- When the key source is the surface itself, its `addEventListener` and `removeEventListener` are read twice, once as the surface and once as the key source, each role reading its own as IC2 rule 2 lists them, and the key listeners are added and removed through the key source's reading.
- A key its own keys list whose descriptor reads `undefined` is absent where IC2 reads its descriptor -- a missing `surface`, an absent `keys` -- and an unknown property where it reads none, as `input-binding`'s D2 records the rule IC2 rule 1 adopts.
- `keys` present as `undefined` is present, of no form: it is refused at `/keys`, and `focus` beside it is not refused for lacking `keys`.
- A function is no surface and no key source, and no declaration: each is judged by `typeof` (IC2 rule 5); a class and an async function are functions to `toDrawing`, `hit`, `focus` and `deliver`.
- An error a removal throws while a failed opening takes back its listeners is attempted past and discarded: the error thrown is the `addEventListener`'s, as lifecycle rule 3 says.
- Each listener capture hands the platform is a frozen function of its own, one per event, reading only its first argument and needing no receiver, so the platform's `this` is never read.
- The screen point handed to `toDrawing` is the very `screen` the fact holds; the record handed to `hit` or `focus` and the delivered one share the same frozen `at` and `screen`.
- When no `hit` or `focus` function is given, the record made with them `null` is the fact delivered, fresh since nothing was handed it before; when one is given, the delivered fact is a second, fresh record holding the answer.
- A fact's `button`, `buttons` and `pointerId` are the event's own numbers, `-0` kept as `at` and `screen` keep it, since D7 carries them verbatim and capture computes no number; so a JSON round trip loses `-0` wherever the platform gave it, which I7 states as "loses only `-0`" and IC5 states for a coordinate, the only place a browser gives one.
- A listener's refusals read `<event name>: the event must be an object...`, `<event name>: the event's <field> must be...` and `<event name>: the event's <field> could not be read: <the thrown value's name>`; the conversion's, `toDrawing: the answer...`; a reply's, `claim: the fact's delivery has ended...`, `takePointer: the fact's delivery has ended...` and `takePointer: called again before its first call returned`. Only each beginning is the contract.
- A reply checks that it is live before anything else, so a claim or a pointer spent while live still throws once its delivery has ended.
- I8's "a `takePointer` made again from inside `setPointerCapture`, through its getter or its body": with `setPointerCapture` read once as the capture opens (IC1), no getter of it runs at `takePointer`; the tests hold the body and a `setPointerCapture` that is a `Proxy` whose `apply` trap calls `takePointer`, the one other route by which code runs inside the call.
- The TypeScript declarations state the platform slice as `CaptureSurface`, `CaptureKeySource`, `CapturePointerEvent` and `CaptureKeyEvent`; a listener's type is `(event: unknown) => void`, which is what makes a browser's `addEventListener` assignable, and the listener judges what it is handed, so the event types serve a consumer's fakes and are held assignable from a browser's `PointerEvent`, `MouseEvent` and key event by I11's consumer.
- A fact's type is the union `PointerFact<Hit> | KeyFact<Focus>`, each family's fields typed `null` where it carries none, so a consumer narrows by `type` or by `at !== null`; `hit` and `focus` are typed as the functions' answers, `null` when omitted, through type parameters defaulting to `null`; the functions are handed `PointerFact<null>` and `KeyFact<null>`, the fact so far.
- The declaration's type is the union of one with `keys`, whose `focus` is optional, and one with `keys?: never` and `focus?: never`; without `exactOptionalPropertyTypes` a consumer may write `keys: undefined` or `hit: undefined`, which the types admit and `openCapture` refuses as present and of no form.
- A reply's `claim` is typed `() => undefined` and `takePointer` `() => boolean`; a capture's `close` `() => undefined`.
- The source check (`tools/check-source.mjs`) refuses beyond section 7's list: a `declare` on a type alias, an interface or a class field, since any declaration carrying `declare` is refused; any comment of a triple-slash directive's form, wherever it stands; a file that is no ES module, whose top-level declarations would be globals; and a file TypeScript cannot parse. Beyond `lib` and `types` it refuses a tsconfig that extends another, names `files`, `typeRoots`, `noLib` or project references, or includes more than `src`; and it makes TypeScript's own program from the configuration and fails if a DOM, web worker or script host library, or any file outside `src/` and TypeScript's libraries, is among the files compiled -- so any route that brings a DOM library back is caught where it lands.
- The source check runs in the gate after the vocabulary check and before the runtime check; the runtime check and `input-binding`'s clock and chance check were copied as written, their header comments naming this component, and then each widened by the run-verifier's F2, below.
- I10's test is `test/browser/real-chrome.test.js`, matched by the gate's test glob, so it runs on Node 22 and on Node 24 in the gate's matrix and in the release's gate. Chrome is `$CHROME` or `google-chrome`, launched headless with a profile of its own and `--remote-debugging-port=0`, the port read from the profile's `DevToolsActivePort`, so no port is guessed and none is shared; a static server of its own answers `dist/` and `test/browser/` to the page, which loads the built package through an import map.
- I10 speaks the DevTools protocol over Node.js's global `WebSocket`, which Node.js 22.4 and later and Node.js 24 hold unflagged (22.22.2 here, and the latest 22 that `setup-node` installs); on a Node.js 22.0 to 22.3, which keeps it behind a flag, the test runs its own file again with `--experimental-websocket`.
- I10's page converts through the element's screen transform, answering a `DOMPoint`, so the getter-backed point of IC2 rule 4 is a browser's own; its touch scenarios enable the protocol's touch emulation, with two touch points, and disable it after.
- I10's surface lies 40 pixels right and 20 down the page and shows a `viewBox` of 200 by 150 drawing units from (-100, -50) in 400 by 300 pixels, so the conversion halves and shifts every screen point, and I10 holds each fact's `at` to the point so converted and different from its `screen` (the run-verifier's F1: with the identity transform the first build used, a capture that copied `screen` into `at` passed I10; that mutant now fails six of I10's nine tests).
- I10's "the same with the pointer not taken, nothing delivered off the surface" is held as: no move and no release whose screen point lies off the surface is delivered, while the `out` and the `leave` the platform fires as the pointer leaves -- at the first point beyond it -- are, as they report the exit.
- I10's double click asserts the `double` fact's `pointerId` and `pointerType` both `null`: Chrome's `dblclick` is a `MouseEvent`, carrying neither.
- I10 reads the page's facts once their count has held still for 100 milliseconds, waiting at most 3 seconds, rather than after a fixed pause, so a slow runner's input pipeline is waited for.
- The consumer test's exercise opens a capture whose surface and key source are both the page's element, since a constructed key event is dispatched on that element, and finds `takePointer` answering `false` there, and `true` over the Node.js fakes, whose `setPointerCapture` agrees.
- Beyond the four capability files the design's section 4 names, `test/contract/` holds `returned-values-and-errors.test.js`, `public-types.test.js`, `public-surface.test.js` and `contract-coverage.test.js`; the I3 recording test is in `pointer-facts.test.js`, since it drives a key event beside a pointer event; the fakes are in `test/support/fakes.js`, plain objects and Node.js's own `EventTarget`.
- `CONTRACT.md` carries section 3 with the design's section and decision references written "the design's", section 3.3's Requires and Trait columns as the design gives them, section 4's invariants, and section 3.5's Reference under its own heading, as SC6 orders the six.
- There is no corpus: section 4 asks for none of the component, the old capture against the new being draw's acceptance step 4.
- The vocabulary lists are snap-grid's, both of them, unchanged; no word of either is needed, so no allowance is asked.
- `tools/measure-size.mjs` measures the built size, every built module being loaded together through the one export path.
- The gate's test files that spawn the runtime and clock and chance checks write every plant as a file of its own in one scratch copy and run the tool once, each plant asserted reported, rather than once per plant.

**After the run-verifier's seal of `3f250e4`.**\
An independent run-verifier sealed the build and left seven notes; each is settled here:
- F1 -- I10's page scales and offsets its surface, as the I10 bullet above says.
- F2 -- the clock and chance check also refuses `Intl`, whose `DateTimeFormat` reads the clock, `Temporal`, and `WeakRef` and `FinalizationRegistry`, whose answers follow the collector's timing; the runtime check also refuses `eval` and `Function`, and a call or `new` through a property named `constructor`, the same route to `Function` by any function -- each with falsifiers and controls in `test/tools/gate-checks.test.js`. A note: the run-verifier will carry the same widening to `input-binding` and `snap-grid`, whose copies of both checks lack it today.
- F3 -- a value a getter or a trap threw is named without running any of its code: a primitive as `String` writes it, an object as "an object" and a function as "a function", nothing of either read beyond its `typeof`; the first build read an `Error`'s `message`, and `instanceof` ran a thrown `Proxy`'s `getPrototypeOf` trap, application code after the point of refusal. The contract promises only a message's beginning, so the name a real `Error`'s message gave in the prose is the one thing given up; `CONTRACT.md`'s Errors paragraph states the rule, and a thrown `Proxy` and a thrown object whose `message` getter would close the capture hold it.
- F4 -- four of the design's sentences read otherwise than the build, and are errata to raise against draw's design, listed below.
- F5 and F7 -- `README.md` says that without `exactOptionalPropertyTypes` the types accept `undefined` for an optional member that `openCapture` refuses, and that a declaration made in another realm is refused as not a plain object, its surface free to come from anywhere; a test holds the second with a declaration `node:vm` makes.
- F6 -- accepted, and a note: I10 pins Chrome's `dblclick` as a `MouseEvent`, carrying no `pointerId` or `pointerType`; were Chrome to make it a `PointerEvent`, the gate would turn red with no commit here, the fact then carrying both as IC5 says, and the remedy is I10's expectation, not the component.

**Errata to raise against draw's design** (`INPUT-CAPTURE.md`, for its section 11):
1. I10 says that with the pointer not taken "nothing" is delivered off the surface; Chrome fires `pointerout` and `pointerleave` at the first point beyond it, which capture delivers as IC4 says. The sentence should read: no move and no release off the surface, the exit's `out` and `leave` aside.
2. I8 says a re-entrant `takePointer` comes "through its getter or its body"; since IC1 reads `setPointerCapture` once, as the capture opens, no getter of it runs at `takePointer`. The sentence should name the body, and a `setPointerCapture` that is a `Proxy` whose `apply` trap calls `takePointer`.
3. IC1 says the surface's and the key source's members are each "read once"; when the key source is the surface, its `addEventListener` and `removeEventListener` are read twice, once in each role, as IC2 rule 2 orders the reads. The sentence should say once for each role.
4. IC8 says a spent claim's "every later call returns `undefined`" and a decided `takePointer`'s "every later call answers the first call's answer", and also that "once the reply is no longer live, each throws"; for a call made after delivery has ended on a reply spent while it was live, the build lets the second rule win, the reply checking that it is live before anything else. The sentences should say so.

**The built size.**\
Measured by `tools/measure-size.mjs` over `dist/` as built after the run-verifier's notes, as the design's section 7 asks: every built module is loaded wherever `openCapture` is imported.\
Bytes as shipped, comments included, then with comments removed, each also gzipped at level 9:

| Files | Bytes | Gzip | No comments | Gzip |
|---|---|---|---|---|
| `open-capture.js` | 6,379 | 1,972 | 4,072 | 1,146 |
| `declaration-reading.js` | 6,242 | 1,958 | 4,183 | 1,169 |
| `event-reading.js` | 4,794 | 1,289 | 3,623 | 816 |
| `reply.js`, `fact.js`, `declaration-problems.js`, `index.js`, `types.js` | 5,660 | 2,374 | 3,837 | 1,407 |
| every built module | 23,075 | 7,593 | 15,715 | 4,538 |

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

**After the release run of `v0.1.0` failed.**\
The first release run passed all nine I10 tests and then failed in I10's after hook: `fs.rmSync` of Chrome's profile threw `ENOTEMPTY` for its `Default` directory, since a kill of Chrome's main process alone left its storage, network, GPU and renderer processes alive and writing there; the throw skipped the static server's close, whose listening socket held the test process open, and the job hung until it was cancelled.\
A fake browser whose writer outlives its leader reproduced both locally -- the old teardown failed with `ENOTEMPTY` in two of five rounds, left the writer alive in all five, and its after hook's process was still running five seconds on -- and the teardown now holds against it:
- Chrome is spawned detached, the leader of a process group of its own, and unreferenced; the whole group is killed with `SIGKILL`, falling back to the main process alone where the group cannot be signalled, and the wait for the group to end is bounded at five seconds. Chrome's crash handlers are in sessions of their own and outside the group, but they name no profile, write their database elsewhere, and end with their client.
- The profile is removed with ten retries 100 milliseconds apart; one that still cannot be removed is a warning on stderr, never a failure, since a leftover scratch directory is no fault of the component.
- The static server is unreferenced and its kept-alive connections closed with it, the close bounded at two seconds and never throwing; the session's socket is closed, and every call still waiting on it failed; the after hook closes Chrome and then the server in a `finally`.
- Every I10 test has a 30-second timeout, the before hook 60 seconds and the after hook 30, and the run of the file again with `--experimental-websocket` 300 seconds, so a hang fails rather than runs on; each job of `gate.yml` and `release.yml` has `timeout-minutes: 15` as a backstop.
- `test/browser/teardown.test.js` holds it over `fake-browser.mjs`: stopping the group ends a writer that outlives its leader and the profile is then removed; a profile that cannot be removed is a warning, never an exception; and the server's close ends kept-alive connections at once and never throws.
- The consumer test runs Chrome the same way -- detached, its group killed once it answers or after 90 seconds -- closes the server's connections, and warns rather than fails over a scratch directory it cannot remove.

**The tag `v0.1.0`, moved before any release.**\
`v0.1.0` was first pushed at `2312478`; its release run failed in I10's teardown before it drafted anything, so no release of `v0.1.0` ever existed, published or draft, and no consumer could have pinned its file.\
The tag was deleted and pushed again at the commit holding the teardown's fix, by the repository's administrator, the one bypass the tag ruleset allows; a release, once published, is never replaced (draw's design, D9).

Measured by `tools/measure-size.mjs` over `dist/` as built after the run-verifier's notes, as the design's section 7 asks: every built module is loaded wherever `openCapture` is imported.\
Bytes as shipped, comments included, then with comments removed, each also gzipped at level 9:

| Files | Bytes | Gzip | No comments | Gzip |
|---|---|---|---|---|
| `open-capture.js` | 6,379 | 1,972 | 4,072 | 1,146 |
| `declaration-reading.js` | 6,242 | 1,958 | 4,183 | 1,169 |
| `event-reading.js` | 4,794 | 1,289 | 3,623 | 816 |
| `reply.js`, `fact.js`, `declaration-problems.js`, `index.js`, `types.js` | 5,660 | 2,374 | 3,837 | 1,407 |
| every built module | 23,075 | 7,593 | 15,715 | 4,538 |

---

## D3 - The contract of record for 0.2.0 is the components' next releases, section 3.1

**Ruled by:** the director, 2026-10-24 (draw's `H26-14`).\
**Affects:** `CONTRACT.md`, `README.md`, `src/`, `test/`, `tools/`, `.github/workflows/`, `export-map.json`, `package.json` and `.gitignore`.

**Ruling.**\
The contract of record for `0.2.0` is section 3.1 of draw's `dev/design/components/RELEASES-0.2.md`, revision 4, ratified with every decision RD1 to RD19 at its recommendation, together with what its section 3.5 asks of this repository: the contract freed of draw, the consumer reference, the gates of B424 and the vocabulary list renamed.\
`CONTRACT.md` carries it, amended rule by rule and stated on its own terms, its Reference keeping one provenance line; `D2`'s rulings and choices stand wherever `0.2.0` does not change them, but its choice that the vocabulary lists are `snap-grid`'s unchanged, which this ruling supersedes: the list named `gesture-tester` is renamed `input-tester`, its words kept.

**Choices made at build, each confirmed by the recorder.**\
Where section 3.1 was silent or left a choice open, the build made these; each that a test can hold is held by one:
- `listen`'s array is judged as `input-binding` judges an array: an array index is a canonical integer string below 2^32 - 1; an own key that is neither `length` nor an index refuses the array at its own keys, before `length` is read; a sparse array is refused once `length`'s descriptor is read, before any index's; an empty array is of its form and adds nothing.
- An array refused at `/listen` reports nothing beneath it, though elements before an accessor or a phantom index were read, by descriptor, and judged; the reads stop at the refusal (the erratum E4 below).
- Step 8 compares an element with every earlier element, refused or not, so the second of two `'blur'` elements with no `keys` is refused by step 8 alone, as the design says; an element that is no string is none of the three names.
- A refusal of a listed family's event begins with the platform event's name, as every listener's does: `wheel: `, `contextmenu: ` and `blur: `; a delta refused reads `<name>: the event's deltaX must be a finite number`.
- A `blur` fact's reply answers `takePointer` with `false`, its `pointerId` being `null`, and its `claim` calls `preventDefault`, as IC8 says of every fact.
- The listener plan is one table in `src/open-capture.ts` -- the ten, then the three in the table's order filtered by `listen` -- and the wheel's options object is made inside the loop, at the call, so no two calls share one.
- The types state the slice IC1 now touches: `timeStamp` optional on every event type, `CaptureWheelEvent` extending `CapturePointerEvent` with the deltas and an optional `deltaMode`, `CaptureBlurEvent` holding an optional `timeStamp` and `preventDefault`, both exported beside the design's `WheelFact`, `ContextMenuFact`, `BlurFact` and `ListenName`, and the surface's `addEventListener` taking an optional third argument `{ readonly passive: false }`; a browser's `WheelEvent`, `FocusEvent` and elements stay assignable (I11).
- The declaration's type refuses `'blur'` in `listen` without `keys`, as it refuses `focus` without `keys`: `CaptureDeclarationWithoutKeys`'s `Listen` excludes `'blur'`; `BlurFact`'s modifiers are typed `false`; the union of listed pointer facts is a local type, not exported, so the package's types name nothing more than the design's four and the two event types.
- `Listen` is inferred from `listen` written in the call or `as const`; one typed `string[]` fails to compile, a trap `README.md` states.
- I11's test compiles the consumer again with every `@ts-expect-error` taken out and finds each expected error on its own line and no other line failing, as `vector-scene`'s does, so no expected error passes for a reason not its own.
- I18 runs the `0.1.0` release as published: its tarball, the very release asset, is kept as `test/fixtures/apnex-input-capture-0.1.0.tgz`, un-ignored in `.gitignore`, its SHA-512 checked against the integrity a consumer's lockfile records for it, `sha512-CWfGWhjx6zcWs4Bhqb/DpISr3by63Wm1v1zzzkK2xzpakU+ODH1QWv4utwLHhNjco3G5pyYhyWTdvsA8+ASSkQ==`, and its built files extracted by the test's own tar reader (`test/support/released.js`) and imported; it is no dependency, since npm does not check a `file:` tarball's integrity -- a tampered copy installed without complaint (measured) -- and the release's address reaches a network.
- I18 compares transcripts -- every trap a recording `Proxy` runs, every platform call and its arguments' count, every application function's arguments, every fact in full and every throw -- over `0.1.0`'s contract tables, rebuilt as factories so each release receives fresh and equal inputs; from this release's transcript it takes out its `timeStamp` reads and its facts' last five properties, which must be IC5's five, and requires the rest equal; each of the closing list's changes is then shown with both releases' answers.
- I10's page lists all three families on its one capture, so 0.1.0's right-press test filters its `down` and `up`, a `context-menu` fact now falling between them; the page is made scrollable by a block 3000 pixels tall beneath the surface; a later listener on the surface records whether a context menu was claimed; and every fact's `time` is kept for the closing check.
- I10's second tab is opened by `Target.createTarget` on the page's own session, after `Page.bringToFront`, and closed by `Target.closeTarget`, the page brought to the front again: a page focused by trusted input alone kept `document.hasFocus()` true, and heard no `blur`, when a second tab opened, and brought to the front heard one in every run (measured, eight runs).
- I10 restores the page's scale with `Emulation.setPageScaleFactor` after the unclaimed pinch, since `Emulation.resetPageScaleFactor` left it at 2 (measured), and scrolls back with `window.scrollTo`.
- Each of I10's claimed wheel tests first waits a second with no wheel: Chrome latched a wheel 390 milliseconds after an unclaimed one to that one's scroll sequence and dispatched it uncancelable (measured), so a claim of it could prevent nothing; the out and leave Chrome fires as the scrolling page moves the surface from under the still pointer are filtered from the unclaimed wheel's facts.
- I10's closing test also turns a wheel, presses the right button and opens a second tab after `close`, and finds nothing delivered.
- RD2's `{ passive: false }` is held by I14's third argument and I3's recording test, not by I10: Chrome never makes an element's wheel listener passive, so the claimed wheel on I10's SVG surface passes with two arguments too; a second capture on the page's body was tried, but a blocking wheel listener on the body -- the capture's or a page's own -- heard no wheel, or an uncancelable one, varying from run to run in headless Chrome 136 (measured), so it is not gated (the erratum E2 below).
- The runtime check is `vector-scene`'s, its built-ins the design's thirteen, of which this build names ten -- `Array`, `Error`, `Map`, `Number`, `Object`, `Reflect`, `Set`, `String`, `TypeError` and `undefined` -- the test holding every global the build names to the thirteen and stating the ten, not `vector-scene`'s exact list, since the design states the thirteen.
- Its platform-member pass reads `lib.dom.d.ts`'s members of the ten interfaces the design names and every interface they extend, and allows exactly the design's twenty-eight names, `PLATFORM_SLICE`; `findRuntimeUses` takes an optional allowed set, so a test narrows it by the build's own names and finds exactly `focus`, `name` and `length` -- on `0.1.0`'s build too (measured) -- and its falsifiers are an event's `composedPath` and a target's `tagName`, with `getModifierState`, `relatedTarget`, `type` and `defaultPrevented` beside them, each by dot, brackets, destructuring, `in` and a reflection's literal key.
- The source check takes `vector-scene`'s fix, every comment found from the parsed tree, with its test planting the form after a template literal in `src/event-reading.ts`.
- I10's teardown takes `vector-scene`'s removal of Chrome's singleton socket's directory, with its unit test, and a test launching a real Chrome and finding neither its profile nor that directory left, the link to it asserted present.
- The release workflow takes `vector-scene`'s retried lookup of the draft, twelve tries five seconds apart; no test holds it, the workflow running only on a pushed tag.
- The consumer test's exercise lists the wheel and focus loss, and delivers a wheel and a focus loss beside its press and key, in Node.js over fakes and in Chrome over a constructed `WheelEvent` and `FocusEvent`.
- `test/contract/focus-loss-facts.test.js` is the new capability's contract test; `test/contract/contract-coverage.test.js` also holds that `CONTRACT.md` names no file or design of draw's but its provenance line (GR4).
- `CONTRACT.md` drops every "the design's" reference and every draw file, keeping `input-binding`'s IB2 and IB3 as that component's published contract; IC2 gains rule 6, the array's form, which IC3's step 7 cites; the fit criteria's two rows "now read: listen for them" are written in the table's right column as "not the wrong tool: listen for them (`listen`, IC3)", the context menu's adding "and claim its fact (IC8)"; "What is returned" counts the wheel's options object among the values capture makes, frozen.
- `D2`'s four errata against draw's design -- I10's "nothing", I8's getter, IC1's "read once" and IC8's live check -- are not folded into `CONTRACT.md`, since the design of record does not amend those sentences; they stay raised against it.
- `README.md` names `index.js` in the package's `dist` folder for the one export path, and the vendored path a strict browser rule needs; its Use section is the consumer reference -- the function, the declaration, the problems, the fact by family, the reply and the errors, with the traps where they bite -- the status in a section of its own before Documents, and the guide linked.

**Errata against draw's design** (`RELEASES-0.2.md`, revision 4):
- E1. I10's unclaimed pinch "makes it 2": Chrome's synthesized pinch took `visualViewport.scale` to 1.9999996, short of 2 in its seventh decimal place, in one run and to 2 in another (measured); I10 holds it within 0.01 of 2, which no claimed pinch, leaving it 1, can meet.
- E2. RD2's `{ passive: false }` (N1) cannot be shown by I10 as written: on an element surface Chrome never makes the listener passive, and on the body headless Chrome dispatches the wheel inconsistently; the sentence should hold RD2 by the listener's arguments, as I14 does.
- E3. `VISION.md` says "Not a clock: a fact holds no time." and "receive one frozen fact for each pointer, double-click and key event"; the design amends IC5's sentence to "A fact holds no clock reading, only the event's own `timeStamp`" but names no change to the vision, which the director ratified as written, so it is left unchanged and raised: its meaning, that capture reads no clock, holds.
- E4. IC3's step 7 says an array refused at `/listen` has "nothing beneath it read"; an array whose later element is an accessor has had the elements before it read, by descriptor, no getter run, before the refusal is known; the build reports nothing beneath it, and the sentence should say "nothing beneath it reported".
- E5. I10's "a second tab opened over the protocol makes one `blur` fact" holds only once the page holds the window's focus, which `Page.bringToFront` gives and trusted input alone does not (measured).

**Mutants planted (GR2).**\
Each new rule's tests were run against a mutant of it planted in the working tree, rebuilt, and each mutant failed them; the runner restored every file after:

| # | The rule | The mutant | Failed |
|---|---|---|---|
| M1 | IC3 step 2 | `listen` not among the seven | 35 of 140 contract tests: I13, I18 |
| M2 | IC3 step 7 | another realm's array accepted, its prototype unchecked | 3: I13 |
| M3 | IC3 step 7 | a sparse array refused only when its missing index is read | 2: I13's cases and reading order |
| M4 | IC3 step 7 | elements refused before a later accessor element reported beside `/listen` | 1: I13 |
| M5 | IC3 step 8 | a duplicate accepted | 1: I13 |
| M6 | IC3 step 9 | `'blur'` without `keys` accepted | 1: I13 |
| M7 | IC2 rule 2 | `listen`'s array read before the surface's members | 2: I13's order and the getter appending, seen |
| M8 | IC4 | the listed listeners added in `listen`'s order | 4: I14 |
| M9 | IC4 | the wheel's listener added with two arguments | 3: I14, I3 |
| M10 | IC4 | one options object shared by every call | 1: I14 |
| M11 | IC4 | the options object not frozen | 1: I14 |
| M12 | IC3 rule 5 | the wheel removed with three arguments | 2: I14, I3 |
| M13 | IC5 | `deltaMode` `-0` kept as `-0` | 1: I15 |
| M14 | IC5 | `deltaMode` any number | 1: I15 |
| M15 | IC6 | a non-finite delta not refused | 2: I15, Errors |
| M16 | IC5 | `time` kept when not finite | 3: I16, I17 |
| M17 | IC6 | a pointer event's `timeStamp` read after its `target` | 8: I3, I5, I16 |
| M18 | IC6 | a key event's `timeStamp` not read | 7: IC5, I16, I18 |
| M19 | IC6 | a blur's `target` read | 3: I17, I3 |
| M20 | IC6 | `focus` asked for a blur | 1: I17 |
| M21 | IC5 | a blur fact's `repeat` `false` | 2: I17 |
| M22 | IC5 | `time` before the deltas | 9: IC5, I15, I18 |
| M23 | IC6 | a context menu's deltas read as a wheel's | 7: I14, I15, I17 |
| M24 | IC9 | every `CaptureFact` holds a `WheelFact`, listed or not | 4 of 5: I11 |
| M25 | IC9 | `'blur'` without `keys` admitted by the types | 4 of 5: I11 |
| M26 | IC9 | the `focus-loss-facts` row taken out of the export map | 3 of 8: the export map's tests |
| M27 | GR1 | with `listen` absent, a wheel listener added anyway | 4 of 9: I18 |
| M28 | GR1 | an event's `button` read twice | 3 of 9: I18 |
| M29 | B424 | `composedPath` allowed by the member pass | 3 of 19 gate-check tests |
| M30 | B424 | the member pass skipped | 3 of 19 |
| M31 | B424 | a fourteenth built-in allowed | 1 of 19 |
| M32 | B424 | the source check's comments found by a bare scanner again | 1 of 19 |
| M33 | B424 | Chrome's singleton directory left by the teardown | 1 of 5 teardown tests |
| M34 | 3.5 | the vocabulary list still named `gesture-tester` | 1 of 19 |
| M35 | I10 | the blur listened for as `focusout` | 1 of 14 I10 tests |
| M36 | I10 | every fact's `time` null but a negative one's | 2 of 14 |
| M37 | GR4 | `CONTRACT.md` naming a design file of draw's beside its provenance line | 1 of 10 coverage tests |

Measured by `tools/measure-size.mjs` over `dist/` as built for `0.2.0`: every built module is loaded wherever `openCapture` is imported.\
Bytes as shipped, comments included, then with comments removed, each also gzipped at level 9:

| Files | Bytes | Gzip | No comments | Gzip |
|---|---|---|---|---|
| `declaration-reading.js` | 10,420 | 3,097 | 6,675 | 1,790 |
| `open-capture.js` | 8,367 | 2,498 | 5,129 | 1,357 |
| `event-reading.js` | 6,142 | 1,552 | 4,615 | 963 |
| `fact.js`, `reply.js`, `declaration-problems.js`, `index.js`, `types.js` | 7,059 | 2,688 | 4,920 | 1,578 |
| every built module | 31,988 | 9,835 | 21,339 | 5,688 |

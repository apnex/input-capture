---
id: unminted
category: component
title: input-capture - turn each platform input event on one surface into one uniform fact, and carry the application's answer back
status: draft
hydrate-when: An application turns a browser's pointer and key events into its own values in more than one place, or must test its input without a browser
sovereignty: internal
supersedes: []
related: [C0, A3]
---

# input-capture

The contract of record for input-capture, ratified by the director (`docs/DECISIONS.md` here: `D2` for its first release, `D3` for the wheel, the context menu, focus loss and every fact's time).\
It also carries the fields of a mission-kit registry entry, and that entry is generated from this file when the component is filed, never written as a second copy.\
The registry id is unminted on purpose; one is minted only when the entry is admitted to the registry.

---

## Duty

Turn each input event a platform delivers on one surface into one uniform fact, in the application's coordinates, and carry the application's answer for that fact back to the platform.

That is the whole duty: one boundary, crossed both ways for each event.\
It does not decide what an input means, find what lies under a pointer, convert coordinates, read a clock, or draw anything -- each is `input-binding`'s, the application's or another component's.\
A wheel turn and a context menu are input events on the surface; a `blur` is the key source's own event saying its input has stopped, as a `pointerleave` says the surface's hover has.\
An event's `timeStamp` is a field the platform delivered, read as data: capture reads no clock.

---

## Contract

**Vocabulary.**\
These are the only nouns input-capture's source uses for what it handles.

| Word | Meaning |
|---|---|
| platform | what delivers input events and owns the surface: a browser, or anything of the same shape |
| surface | the element whose pointer events capture listens to, and on which it takes the pointer |
| key source | what capture listens to for key events, and for its focus loss when listed, which the application chooses |
| open | a capture whose listeners are all added and whose `close` has not been called; only an open capture makes facts (IC3) |
| event | one value the platform delivers to a listener; capture reads only the fields IC1 names |
| target | the platform's own object an event names; capture never reads it, and hands it to the application |
| fact | the frozen record capture makes from one event (IC5) |
| point | a frozen record of finite numbers `x` and `y` |
| screen point | the event's own `clientX` and `clientY`, as a point |
| conversion | the application's function from a screen point to its own coordinates |
| hit | the application's answer for what lies under a pointer |
| focus | the application's answer about where a key event arrived |
| listen | the event families a capture listens for beyond its pointer and key events -- the wheel, the context menu and focus loss -- each only when the declaration names it |
| delta | how far a wheel turned along one axis, in the unit its `deltaMode` names: pixels, lines or pages |
| focus loss | the key source's `blur`: its input has stopped, and no release of a key held is promised to reach it |
| time | the event's own `timeStamp`, milliseconds from the page's time origin, as the platform delivered it |
| delivery | handing one fact, with its reply, to the application |
| reply | what the application may ask of one fact while it is delivered: claim it, take the pointer |
| claim | the platform's default action for the event prevented |
| pointer | one contact or cursor the platform tracks, named by its `pointerId` |
| modifiers | `shiftKey`, `ctrlKey`, `altKey` and `metaKey`, in that order, as an event carries them |

**Capabilities.**\
What a consumer can depend on, one capability per row.\
A capability is named for what it offers, not for who offers it, so two components that provide the same capability share its name, and the overlap is visible.\
**Provides** means this component implements the capability.\
**Requires** names the capabilities of other components a row depends on, as `component:capability`.\
The trait column names any trait a system takes on by using the capability.

| Capability | Relation | Requires | What a consumer can depend on | Trait |
|---|---|---|---|---|
| `declared-capture` | provides | none | A capture opened on a surface, and optionally a key source, from the application's functions and the event families it lists, or refused with every problem; closed by removing exactly the listeners it added (IC2, IC3). | stateful |
| `pointer-facts` | provides | none | Each pointer and double-click event on the surface, and each wheel turn and context menu when listed, as one fact, in the coordinates the application's conversion gives, with the application's hit (IC4 to IC7). | none |
| `key-facts` | provides | none | Each key-down and key-up on the key source as one fact, with the application's focus (IC4 to IC7). | none |
| `focus-loss-facts` | provides | none | The key source's focus loss as one fact, when listed (IC4 to IC6). | none |
| `fact-reply` | provides | none | What the application asks of a fact while it is delivered -- the event claimed, the pointer taken -- done to that fact's event at once (IC8). | none |

One capability per row; none requires another component's capability.\
A capture holds one state between events, open or closed, with the listeners it added; its owner relies on it -- no fact once `close` is called -- so `declared-capture` is stateful in T1's sense, narrowly, and the rest are not.

**Errors.**\
`openCapture` never throws while it reads and judges a declaration: it refuses with problems; it throws only an error a platform method threw while it added a listener, after taking back those it added (IC3).\
A listener throws a `TypeError` before `deliver` is called, so nothing is delivered: one whose message begins with the platform event's name and a colon -- `pointerdown: `, `wheel: `, `contextmenu: `, `blur: ` -- when the event is not an object, a field is refused (IC6) or reading a field throws; one beginning `toDrawing: ` when the conversion's answer is refused or reading it throws; an error a getter or a trap threw is named in the prose after "could not be read:".\
A reply's method called once its delivery has ended, or `takePointer` called again before its first call returns, throws an `Error`, the base constructor, beginning `claim: ` or `takePointer: `.\
Any other exception -- from an application function, or from a platform method capture calls -- propagates unchanged: beyond the readings above, capture catches only what `setPointerCapture` throws (IC8), and what a removal throws, which it holds until the other removals are attempted (IC3).\
A message's beginning is the contract and the rest is prose, as `input-binding` settled.\
A value a getter or a trap threw is named without running any of its code: a primitive as `String` writes it, an object as "an object" and a function as "a function", nothing of either read beyond its `typeof`, so no getter, trap or `toString` of the thrown value runs after the point of refusal (`docs/DECISIONS.md`, `D2`).\
Tested by: `test/contract/returned-values-and-errors.test.js`, and each capability's own file.

**What is returned.**\
Every value capture makes -- an open result, a problem list, a capture, a fact, its `at` and `screen`, a reply, and the options object it hands the wheel's `addEventListener` -- is made afresh and frozen to its depth, down to but not into the application's own values it holds, the `hit` and `focus` answers, which it holds by reference and never reads, copies or freezes.\
Every record holds its properties in the order its form is written in this section, and nothing else; an open result holds `ok`, then `capture` or `problems`.\
Every function capture makes needs no receiver and reads no argument beyond those its form names, so `close` and a reply's methods read none.\
Tested by: `test/contract/returned-values-and-errors.test.js` (I7), and each capability's own file.

**IC1 -- What capture touches of the platform.**\
Capture reaches the platform only through the values the application hands it, and touches of them exactly:
- of the surface: `addEventListener`, `removeEventListener` and `setPointerCapture`, each read once, as the capture opens (IC2), the function read being the one it calls, with the surface as its receiver, every time, and `addEventListener` called with a third argument for the wheel alone (IC4);
- of the key source: `addEventListener` and `removeEventListener`, likewise, always with two arguments;
- of a pointer, double-click or context-menu event: `clientX`, `clientY`, `button`, `buttons`, `pointerId`, `pointerType`, the modifiers, `timeStamp`, `target` and `preventDefault`, each read once, in IC6's order, `preventDefault` called with the event as its receiver only by `claim`;
- of a wheel event: those, and `deltaX`, `deltaY`, `deltaZ` and `deltaMode` after the modifiers, likewise;
- of a key event: `key`, `code`, `repeat`, the modifiers, `timeStamp`, `target` and `preventDefault`, likewise;
- of the key source's `blur`: `timeStamp` and `preventDefault`, likewise, and no `target`, which nothing would be handed.

It reads no other member, never reads a target's members or an event's prototype, and names no global: no `window`, no `document`, no constructor of the platform's.\
So it cannot reach beyond the surface and the key source it is given, and the same code runs over a browser's objects and over plain objects of their shape.\
So also a `visibilitychange`, which is fired at the document, is not listened for: a key source's `blur` precedes it when the page's tab is left, measured in headless Chrome for a page holding the window's focus, with the window and with a focused element as key source; a page focused only by trusted input heard no `blur` when another tab opened, and minimising a window or locking the screen is not measured.\
Tested by: `test/contract/pointer-facts.test.js` (I3, the recording tests over the surface, the key source, the events and their targets, one of them with every family listed).

**IC2 -- How values are read.**\
These are the rules `snap-grid` and `input-binding` settled, each in its decision record's `D2`:
1. The declaration is read as `input-binding` reads one (its IB2 rules 1 to 3 and 6): a plain object's own data properties by descriptor, a property read only when its own keys hold it, an accessor of no form, an inherited property absent, a symbol-named property ignored, a property present as `undefined` of no form, and a key its own keys list whose descriptor reads `undefined` absent; and reading a value stops at the first reflection that refuses it, a reflection that throws refusing the value it was made on, as `input-binding` reads a record -- so a declaration whose prototype, own keys or descriptor cannot be read is `not-an-object` at `""`, nothing further read, a surface or key source whose member cannot be read is refused at its own pointer, and a `listen` whose reflection throws is refused at `/listen`.
2. Its order: its prototype; its own keys; the descriptors of `surface`, `keys`, `toDrawing`, `hit`, `focus`, `deliver` and `listen` its own keys hold, in that order; then, when `surface` holds an object, its `addEventListener`, `removeEventListener` and `setPointerCapture`, and when `keys` holds one, its `addEventListener` and `removeEventListener` -- each through ordinary property access, judged as it is read, the reading of that object stopping at the first member whose read throws or which is not a function; the key source's members are read whatever the surface's were; then, when `listen` is a data property, its array, as rule 6 reads one, each element judged as it is read -- last, so a member's getter that changes the array is seen.
3. An event is judged by `typeof` alone, which runs no trap, and its prototype is never read; its fields are read once each through ordinary property access, a browser's being inherited accessors, in IC6's order, each judged as it is read, the reading stopping at the first refused -- `clientX` judged before `clientY` is read, since an event is not a point, and a wheel's `deltaX` before its `deltaY`.
4. The conversion's answer is judged by `typeof`, and its `x` and then its `y` are read through ordinary property access, so a `DOMPoint`'s getters answer, both before either is judged, as `snap-grid` reads a point.
5. An object is a non-null value whose `typeof` is `'object'`, so a function never is one; a function is a value whose `typeof` is `'function'`.
6. An array is read as `input-binding` reads one (its IB2 rules 1, 4 and 8): `Array.isArray` first, then its prototype, its own keys, its `length`'s descriptor, then each index's descriptor in order; it is of its form only when `Array.isArray` accepts it, its prototype is this realm's `Array.prototype`, it is dense -- every index from 0 to `length - 1` an own data property -- and it holds no own string-named property but those indices and `length`, a symbol-named property ignored; so another realm's array, a subclass's and a sparse one are of no form, and no element's getter is ever called.

Tested by: `test/contract/declared-capture.test.js` (the declaration, `listen` and the platform's objects), `test/contract/pointer-facts.test.js`, `test/contract/key-facts.test.js` and `test/contract/focus-loss-facts.test.js` (events and the conversion's answer), each reading order held by a `Proxy` that records each trap.

**IC3 -- Opening and closing.**\
`openCapture(declaration)` returns `{ ok: true, capture }` or `{ ok: false, problems }`.\
A declaration is a plain object holding:
- `surface`, an object whose `addEventListener`, `removeEventListener` and `setPointerCapture` are functions;
- optionally `keys`, an object whose `addEventListener` and `removeEventListener` are functions, the surface itself allowed;
- `toDrawing`, a function: the conversion (IC7);
- optionally `hit`, a function, asked for every pointer fact, and `focus`, a function, asked for every key fact, which requires `keys`;
- `deliver`, a function, handed every fact with its reply;
- optionally `listen`, an array of distinct strings, each one of `'wheel'`, `'context-menu'` and `'blur'`, `'blur'` requiring `keys`; absent, the capture listens for nothing beyond IC4's first table.

A problem is `{ pointer, problem }` as `input-binding`'s IB3 defines one, ordered by pointer and then by problem by UTF-16 code unit, no record twice:

| Step | When | Problem, at pointer |
|---|---|---|
| 1 | the declaration is not a plain object, or a reflection on it throws | `not-an-object` at `""`, and nothing else |
| 2 | an own property other than the seven; `surface`, `toDrawing` or `deliver` absent | `unknown-property` at `/<name>`, one each; `missing-property` at `/<name>` |
| 3 | `surface` an accessor or not an object, or a member of it refused as IC2 reads it | `invalid-value` at `/surface` |
| 4 | `keys` present and an accessor or not an object, or a member of it refused | `invalid-value` at `/keys` |
| 5 | `toDrawing`, `hit`, `focus` or `deliver` present and an accessor or not a function | `invalid-value` at its pointer |
| 6 | `focus` present and `keys` absent | `invalid-value` at `/focus` |
| 7 | `listen` present and an accessor, or not an array of IC2 rule 6's form | `invalid-value` at `/listen`, nothing beneath it reported |
| 8 | an element of `listen` not one of the three names, or equal to an earlier element | `invalid-value` at `/listen/<i>` |
| 9 | an element `'blur'` that step 8 did not refuse, and `keys` absent -- step 6's test | `invalid-value` at `/listen/<i>` |

So `keys: undefined` and `keys: 5` are refused at `/keys` by step 4 alone, and a second `'blur'` by step 8 alone; and an array refused at `/listen` -- a later element an accessor among the reasons -- reports no element refused before it.

**The lifecycle,** each rule stated here once:
1. A capture is *opening* while `openCapture` adds its listeners, *open* once every one is added, and *closed* from the moment `close` is first called; a listener of a capture not open reads nothing and calls nothing, so an event the platform delivers during opening, or once `close` has begun, makes no fact; a fact begun while the capture was open is made and delivered even if `close` is called meanwhile.
2. `openCapture` calls no platform method until the declaration is judged; it then adds the listeners IC4 lists, in its order, each through the `addEventListener` read as it opened, with two arguments, the event's name and the listener -- the wheel's with a third, a fresh frozen `{ passive: false }` made for that call.
3. If an `addEventListener` throws, it removes that very listener -- which the platform may have added before throwing, and whose removal is harmless if not -- and then the listeners already added, in the reverse of the order added, attempting every removal, each with two arguments, and then throws the error the `addEventListener` threw, unchanged; the capture is never open.
4. Otherwise it returns `{ ok: true, capture }`, `capture` a frozen `{ close }`.
5. `close()`, on its first call, closes the capture, then removes every listener it added, in the reverse of the order added, through the `removeEventListener` read as it opened, attempting every removal; it then throws the first error a removal threw, unchanged, or returns `undefined`; every later call, one from inside a removal among them, returns `undefined` and calls nothing.

Every removal passes two arguments, the name and the listener, the wheel's included, since a platform matches a listener for removal by its type, its function and its capture flag alone.\
So an operation that calls the platform more than once attempts every call it owes and then throws the first error met; no listener of a capture that failed to open, or that closed, is left on the platform unless a removal threw; and a listener so left makes no fact.\
Tested by: `test/contract/declared-capture.test.js` (I1, I2, I13, I14).

**IC4 -- Which events become facts.**\
Each listener of an open capture makes one fact from the event it is called with, synchronously, and delivers it before it returns, unless it refuses the event (IC6); capture queues, merges, defers and synthesizes nothing, so the platform's own sequence -- a second mouse button as a move, a touch contact as a pointer of its own -- is the facts' sequence.

| Platform event | Listened on | Fact `type` |
|---|---|---|
| `pointerleave` | surface | `leave` |
| `pointerdown` | surface | `down` |
| `pointermove` | surface | `move` |
| `pointerup` | surface | `up` |
| `pointercancel` | surface | `cancel` |
| `pointerover` | surface | `over` |
| `pointerout` | surface | `out` |
| `dblclick` | surface | `double` |
| `keydown` | key source, when given | `key-down` |
| `keyup` | key source, when given | `key-up` |

The first eight make pointer facts and the last two key facts.\
After those ten, each only when `listen` names it, in this table's order whatever order `listen` names them:

| Platform event | Listened on | Fact `type` | Added with |
|---|---|---|---|
| `wheel` | surface | `wheel` | three arguments, the third a fresh frozen `{ passive: false }` made for that call, so a claim prevents the scroll on any surface, a browser making a wheel listener on the window, the document or the body passive otherwise |
| `contextmenu` | surface | `context-menu` | two arguments |
| `blur` | key source | `blur` | two arguments |

A `wheel` and a `context-menu` fact are pointer facts; a `blur` fact is of neither family.\
Capture listens for nothing else: no `click`, `auxclick`, `pointerenter`, `gotpointercapture`, `lostpointercapture`, `focus`, `visibilitychange`, touch, gesture or composition event; and with `listen` absent, none of the three above.\
Tested by: `test/contract/declared-capture.test.js`, `test/contract/pointer-facts.test.js`, `test/contract/key-facts.test.js` and `test/contract/focus-loss-facts.test.js`.

**IC5 -- The fact.**\
A fact is a frozen record of exactly these properties, in this order, each `null` where the table says so:

| Property | A pointer fact | A key fact | A `blur` fact |
|---|---|---|---|
| `type` | as IC4 gives | as IC4 gives | `'blur'` |
| `at` | a point: the `x` and `y` the conversion answered for `screen` (IC7) | `null` | `null` |
| `screen` | a point: the event's `clientX` and `clientY` | `null` | `null` |
| `hit` | the `hit` function's answer, or `null` when none is given | `null` | `null` |
| `focus` | `null` | the `focus` function's answer, or `null` when none is given | `null` |
| `button` | the event's `button`, `0` when it is `undefined` or `null` | `null` | `null` |
| `buttons` | the event's `buttons` when a safe integer, else `null` | `null` | `null` |
| `pointerId` | the event's `pointerId` when a safe integer, else `null` | `null` | `null` |
| `pointerType` | the event's `pointerType` when a string, else `null` | `null` | `null` |
| `key` | `null` | the event's `key` when a string, else `null` | `null` |
| `code` | `null` | the event's `code` when a string, else `null` | `null` |
| `repeat` | `null` | whether the event's `repeat` is truthy | `null` |
| `shiftKey`, `ctrlKey`, `altKey`, `metaKey` | whether each is truthy | whether each is truthy | `false` |
| `deltaX`, `deltaY`, `deltaZ` | a `wheel` fact: the event's numbers, `-0` kept; otherwise `null` | `null` | `null` |
| `deltaMode` | a `wheel` fact: `0`, `1` or `2` -- pixels, lines, pages -- when the event's value is one, written `v + 0` so `-0` gives `0`, else `null`; otherwise `null` | `null` | `null` |
| `time` | the event's `timeStamp` when a finite number, else `null` | likewise | likewise |

`at`, `screen` and the deltas hold exactly the numbers read, `-0` kept: capture computes no number.\
The deltas are carried as delivered, never converted, since a line's or a page's height is no field of the event.\
A touchpad's pinch arrives as a `wheel` with `ctrlKey` true and fractional deltas, and a mouse wheel turned with Ctrl held as a `wheel` with `ctrlKey` true; capture names neither a pinch, since what the platform delivers does not tell them apart.\
`time` is the platform's own number, milliseconds from the page's time origin; capture compares and orders nothing by it.\
A fact holds no clock reading, only the event's own `timeStamp`, and no event, no target and no function, so a fact made from plain data survives a JSON round trip but for its `hit` and `focus` answers and a `-0`, which JSON writes as `0`.\
Tested by: `test/contract/pointer-facts.test.js`, `test/contract/key-facts.test.js` and `test/contract/focus-loss-facts.test.js` (I4, I6, I15, I16, I17), `test/contract/returned-values-and-errors.test.js` (I7).

**IC6 -- Making a fact.**\
For each event a listener of an open capture receives, in this order, refusing the event -- Errors' `TypeError`, nothing after it read or called -- where a step says so:
1. it refuses the event unless it is an object;
2. for a pointer event it reads `clientX`, refusing the event unless it is a finite number, then `clientY`, likewise; then `button`, refusing it unless `undefined`, `null` or a safe integer; then `buttons`, `pointerId`, `pointerType` and the modifiers; for a `wheel` event then `deltaX`, refusing the event unless a finite number, then `deltaY` and `deltaZ` likewise, each judged as read, then `deltaMode`, never refusing; then `timeStamp`, `target` and `preventDefault`, refusing it unless `preventDefault` is a function; for a key event it reads `key`, `code`, `repeat`, the modifiers, `timeStamp`, `target` and `preventDefault`, refusing it likewise, and reads and judges no coordinate and no button; for a `blur` it reads `timeStamp`, then `preventDefault`, refusing it likewise, and no `target`;
3. for a pointer event it calls the conversion with the screen point, a fresh frozen point, and reads the answer as IC2 rule 4 says, refusing the event unless it is an object whose `x` and `y` are finite numbers;
4. it makes the fact with `hit` and `focus` `null`, hands it with the target to `hit` for a pointer fact or to `focus` for a key fact, when that function is given, and makes the fact to deliver, a fresh frozen record of the same form holding the answer; for a `blur` it asks neither;
5. it calls `deliver` with the fact and a fresh reply.

A `timeStamp` that is no finite number gives `time` `null`; a getter that throws refuses the event, as every read does.\
Step 4's fact, handed to `hit` or `focus`, holds every property of the fact delivered, the five after the modifiers among them, `hit` and `focus` `null`.\
Tested by: `test/contract/pointer-facts.test.js`, `test/contract/key-facts.test.js` and `test/contract/focus-loss-facts.test.js` (I5, I15, I16, I17).

**IC7 -- The application's functions.**\
Each is called synchronously, with no receiver -- as `Reflect.apply(fn, undefined, args)` calls it -- at most once for each event, at the step IC6 gives:
- `toDrawing(screen)` answers where the screen point lies in the application's coordinates;
- `hit(target, fact)` and `focus(target, fact)` answer any value, which capture holds in the delivered fact by reference and never reads;
- `deliver(fact, reply)`'s answer is ignored.

Each is the application's code, as is a getter of an event, of a platform object or of the conversion's answer, and any trap of a `Proxy` capture is handed; any may call `close`, open another capture or make the platform dispatch another event, whose fact is made and delivered within that call, with its own reply, when its capture is open (IC3).\
Capture keeps no state between events but whether it is open, so nothing they do changes how a later event is read; for events whose fields, and application functions whose answers, are alike, the same sequence of events gives the same facts.\
Tested by: `test/contract/pointer-facts.test.js`, `test/contract/key-facts.test.js` and `test/contract/focus-loss-facts.test.js` (I9).

**IC8 -- The reply.**\
A reply is a frozen `{ claim, takePointer }`, fresh for each fact and *live* from its delivery's start until `deliver` returns or throws, whether or not the capture closes meanwhile:
- `claim()`, on its first call, marks the fact claimed and then calls the event's `preventDefault`, read at IC6, with the event as its receiver; what that call throws propagates, and the claim is spent; every later call returns `undefined` and calls nothing;
- `takePointer()`, on its first call, answers `false` and calls nothing when the fact's `pointerId` is `null`; otherwise it marks the call in progress and calls the surface's `setPointerCapture`, read as the capture opened, with the surface as its receiver and that `pointerId`, answering `true` when it returns and `false` when it throws, whatever it throws -- the platform refusing a pointer that is not active, as for a synthetic event; a call made while the first is in progress throws Errors' `Error`; every later call answers the first call's answer;
- once the reply is no longer live, each throws Errors' `Error`.

Each acts at once, so what a delivery asked before it threw is done.\
Claiming a `wheel` fact prevents its scroll and a touchpad pinch's zoom: a pinch synthesized over an unclaimed surface took the page's `visualViewport.scale` from 1 to 2, and over a claimed one left it 1 (measured in headless Chrome); a browser's page zoom on Ctrl and a mouse wheel does not happen in headless Chrome at all, so its prevention is not measured.\
Claiming a `context-menu` fact prevents the menu: measured in headless Chrome on Linux, which delivers `contextmenu` as a `PointerEvent` with a `pointerId`, after the `pointerdown` and before the `pointerup`; on other systems the menu's event may follow the release, not measured.\
Claiming a `blur` fact calls `preventDefault`, which changes nothing, the event not being cancelable; a `blur` fact's `takePointer` answers `false`, its `pointerId` being `null`, and so does a `wheel` fact's when its event carries no `pointerId`, as a browser's `WheelEvent` carries none, while a `wheel` event that carries one makes a fact holding it, whose pointer `takePointer` takes.\
Tested by: `test/contract/fact-reply.test.js` (I8, I17) and `test/contract/focus-loss-facts.test.js` (I17).

**IC9 -- Exports.**\
`@apnex/input-capture` exports `openCapture`, and nothing else; it has no subpath.\
It imports no package and no module particular to one runtime, names and declares no global, touches no platform object but those IC1 names, and reads no clock and no randomness and holds no timer, so it runs over a browser's elements and events and, where there is no browser, over plain objects of their shape.\
Its TypeScript declarations state the platform slice IC1 touches as its own structural types -- `CaptureSurface`, `CaptureKeySource`, `CapturePointerEvent`, `CaptureWheelEvent`, `CaptureKeyEvent` and `CaptureBlurEvent` -- so a browser's elements and events are assignable to them; they are generic in the hit and the focus, a fact's properties are read-only, and the declaration's type refuses `focus` without `keys`, and `'blur'` in `listen` without `keys`.\
Every fact type holds `time: number | null`; the package's types also name `WheelFact`, `ContextMenuFact`, `BlurFact` and `ListenName`:

| Type | `type` | The deltas | `deltaMode` |
|---|---|---|---|
| `PointerFact<Hit>`, its eight types | `PointerFactType` | `null` | `null` |
| `WheelFact<Hit>` | `'wheel'` | `number` | `0 \| 1 \| 2 \| null` |
| `ContextMenuFact<Hit>` | `'context-menu'` | `null` | `null` |
| `KeyFact<Focus>` | `KeyFactType` | `null` | `null` |
| `BlurFact` | `'blur'` | `null` | `null` |

`CaptureFact`, `openCapture` and the declaration types take a third type parameter, `Listen extends ListenName`, defaulting to `never` and inferred from `listen`'s elements; `CaptureFact` adds `WheelFact` and `ContextMenuFact` for each listed, and `BlurFact` for `'blur'`; `hit`'s fact parameter is `PointerFact<null>` and each listed pointer-family type with its `Hit` `null`.\
So a delivery whose declaration lists no `'wheel'` and compares `fact.type` with `'wheel'` fails to compile.\
Tested by: `test/contract/public-surface.test.js`, `test/contract/public-types.test.js` (I11, compiled from `test/types/`), the source check (`tools/check-source.mjs`), the runtime check (`tools/check-runtime.mjs`), the clock and chance check (`tools/check-clock-and-chance.mjs`), the real-Chrome test (`test/browser/`, I10) and the consumer test (`tools/consumer-test.mjs`).

**Invariants.**\
There is no conformance kit: nothing in input-capture is a port another party implements.\
*input-capture* marks what the component's own tests hold; *gate* what its gate holds.

| # | Invariant | Held by |
|---|---|---|
| I1 | `openCapture` never throws while it judges a declaration, and answers every declaration with exactly IC3's problems, from a table of cases: present `undefined`, accessors, a phantom key, a revoked and a trapping `Proxy`, a function as the surface, a surface lacking each member in turn, a member that is not a function followed by one whose getter would change the key source -- never read -- a declaration whose descriptor read throws -- `not-an-object` at `""`, no later descriptor read -- and `focus` without `keys`. | input-capture |
| I2 | An open capture has added exactly IC4's listeners, in its order, on the right object, with two arguments, before `openCapture` returns, and eight without a key source; an `addEventListener` throwing at each place in turn, before or after adding its listener, leaves none added and throws its error; `close` removes every listener in reverse order, attempting each when one throws and then throwing the first error; a second `close`, and one made from inside a removal, calls nothing; a listener called during opening or after `close` makes no fact, while a fact begun before `close` is delivered with a live reply. | input-capture |
| I3 | Capture touches nothing of the platform outside IC1: with a surface, key source, events and targets that are recording `Proxy` values and spies, opening, a `pointerdown` whose delivery claims and takes the pointer, a `keydown` whose delivery claims, and `close` log exactly IC1's reads in IC2's and IC6's orders and each platform call once, in IC3's and IC8's orders, the targets' logs empty; and the same with `listen` naming all three, a claimed `wheel`, `contextmenu` and `blur` among the events. | input-capture |
| I4 | Every reading of IC5 from a table of events: `button` absent, `null`, `-1` and `2`; `buttons`, `pointerId`, `pointerType`, `key` and `code` absent or of another type; modifiers and `repeat` of every truthiness; a fractional `clientX`; an ordinary key event, holding no pointer field. | input-capture |
| I5 | Spies log each event's reads and calls in IC6's order; an event refused at each place stops the reading there, no later field read and no application function called -- a `clientX` refused leaves a `clientY` getter that would close the capture unread; `hit` is never called for a key fact, nor `focus` for a pointer fact. | input-capture |
| I6 | `screen` holds exactly the event's numbers and `at` exactly the conversion's, under `Object.is`, `-0` and a getter-backed point among them, `x` and `y` both read before either is judged; a conversion answering a function, `null`, `NaN` or an infinity refuses the event. | input-capture |
| I7 | Every fact, its `at` and `screen`, every reply and every open result are fresh and frozen to their depth, not into `hit` or `focus`, which are the very values answered; keys in their written order; no function needs a receiver; a fact's JSON round trip loses only `-0`. | input-capture |
| I8 | `claim` calls `preventDefault` once, at once, and a throwing one spends it; `takePointer` calls `setPointerCapture` once with the fact's `pointerId`, answering `false` when it throws and calling nothing when `pointerId` is `null`; a `takePointer` made again from inside `setPointerCapture`, through its getter or its body, throws and calls nothing, the outer call then answering as IC8 says; both throw once delivery has ended; what a throwing delivery asked is done. | input-capture |
| I9 | An exception from each application function propagates out of the listener unchanged, nothing delivered after a throw before `deliver`; a getter or trap throwing while an event or the conversion's answer is read is rethrown as the Errors paragraph's `TypeError`; a delivery that closes its own capture, one that closes another, and one that dispatches a nested event each follow IC3 and IC7. | input-capture |
| I10 | In headless Chrome, with trusted input dispatched through the DevTools protocol's `Input` domain on a page whose surface is an SVG element: a left press, moves leaving the surface and a release, the pointer taken on the press, every move and the release delivered; the same with the pointer not taken, nothing delivered off the surface; a touch pressed on a child of the surface and not taken, its moves and release off the surface delivered with the child as target; a right press and release, `button` 2; a move with no button, `button` -1 and `buttons` 0; a double click, one `double` after its presses and releases, `pointerId` `null`; two touch contacts, two `pointerId` values, `pointerType` `touch`; a touch cancelled, a `cancel`; a key held to repeat, its `key` and `code`, and a key-up; a claimed key-down seen `defaultPrevented` by a later listener; a `leave` when the pointer leaves; a claimed `wheel` over the surface of a scrollable page leaves it unscrolled; a pinch synthesized by `Input.synthesizePinchGesture` with `gestureSourceType` `mouse` arrives as `wheel` facts with `ctrlKey` true, and leaves `visualViewport.scale` 1 when claimed and makes it 2 when not, the positive control; a right press's `context-menu` fact, claimed, is seen `defaultPrevented` by a later listener; a second tab opened over the protocol makes one `blur` fact on a window key source; `time` never decreases across the run; nothing after `close`; and on a fresh page, a capture on the body, listing the wheel and claiming it, leaves the page unscrolled, where the page's own body listener added with two arguments, the control, is made passive and the page scrolls. | gate |
| I11 | A consumer compiled with `tsc --noEmit` under strict settings, with and without `exactOptionalPropertyTypes`, passes an `SVGSVGElement`, an `HTMLCanvasElement` and a `Window` where IC3 asks; its `hit` and `focus` types reach `fact.hit` and `fact.focus`, and `null` when it omits them; the families `listen` names reach the delivered fact, with their own shapes; and lines that give `focus` without `keys`, write a fact's property, compare a fact's `type` with a family not listed, or list `'blur'` without `keys` must fail to compile, each on its own line. | input-capture |
| I12 | The source names no consumer's vocabulary and declares no global; the built files import no package, name no runtime global, no global but the thirteen built-ins the runtime check allows, no platform member outside IC1's slice, its five added reads, the conversion's `x` and `y` and its own names `focus`, `name` and `length`, and no clock, timer or source of chance. | gate |
| I13 | `listen` judged as IC3's steps 7 to 9 say, from a table of cases: absent; empty; each name; an unknown name; a duplicate; a duplicate `'blur'` without `keys`; an accessor; a sparse array; another realm's array; `'blur'` with `keys` absent, `undefined` and `5`; `focus` without `keys` beside it; a surface member's getter appending to `listen`, seen; the reads in IC2 rule 2's order, held by recording proxies. | input-capture |
| I14 | With `listen` absent, exactly I2's listeners, arguments and calls; with the names listed in every order, the listeners added after IC4's in the table's order, `wheel`'s with a fresh frozen `{ passive: false }` as third argument and the others with two; a throw at each new `addEventListener` takes back every listener with two arguments; `close` removes all in reverse with two. | input-capture |
| I15 | A `wheel` event's fact holds its deltas under `Object.is`, `-0` among them, `deltaMode` `0`, `1`, `2` and `-0` giving `0`, `1`, `2`, `0` and `null` for any other value, `ctrlKey` as given; a non-finite delta refuses the event with no later field read; the fact's keys in IC5's order. | input-capture |
| I16 | Every fact's `time` is its event's `timeStamp` under `Object.is` when a finite number, and `null` for `NaN`, an infinity, a string or an absent field; read in IC6's order, a throwing getter refusing the event; step 4's fact holds the new properties. | input-capture |
| I17 | A `context-menu` fact is a pointer fact; a `blur` fact holds what IC5 gives it, its event's `target` never read; `claim` on each calls `preventDefault` once; `hit` and `focus` are never asked for a `blur`. | input-capture |
| I18 | Beside the first release, `0.1.0`, as published: its contract tables run against both releases give the same listeners, calls, reads and facts' first sixteen properties, but for the changes that release's closing list names -- a declaration with an own `listen` property, which it refused as `unknown-property`, judged; every event's `timeStamp` read, so an event whose `timeStamp` getter throws, which it delivered, refused; and every fact's five properties after `metaKey`. | input-capture |

I10 is held by `test/browser/real-chrome.test.js`, which the gate runs; I12 by `tools/check-vocabulary.mjs`, `tools/check-source.mjs`, `tools/check-runtime.mjs` and `tools/check-clock-and-chance.mjs`, whose own tests are `test/tools/gate-checks.test.js`; I13 and I14 by `test/contract/declared-capture.test.js`; I15 and I16 by `test/contract/pointer-facts.test.js` and `test/contract/key-facts.test.js`; I17 by `test/contract/focus-loss-facts.test.js`, `test/contract/pointer-facts.test.js` and `test/contract/fact-reply.test.js`; I18 by `test/contract/beside-0.1.0.test.js`, which checks the release's tarball, kept in `test/fixtures/`, against its integrity before it runs it.

---

## Reference

This repository, `apnex/input-capture`, and its package `@apnex/input-capture`, released only by its own CI as a tarball attached to a GitHub release, drafted, verified and then published (`.github/workflows/release.yml`).\
The package exports `openCapture` from its one path, `dist/index.js`, as `export-map.json` records.\
The code is TypeScript in `src/`, built to `dist/`, which only a release holds.\
The tests are in `test/`: one file per capability in `test/contract/`, with `returned-values-and-errors.test.js`, `public-types.test.js`, `public-surface.test.js`, `contract-coverage.test.js` and `beside-0.1.0.test.js` beside them; I10's page and its test in `test/browser/`; I11's consumer in `test/types/`; the first release's tarball in `test/fixtures/`; and the gate checks' own tests in `test/tools/`.\
The gate, `npm run gate`, builds, runs the tests -- the real-Chrome test among them -- then the vocabulary, source, runtime, clock and chance, and export-map checks in `tools/`, and mission-kit's style checks.\
The design of record and the rulings that made this contract are kept in draw's records, `apnex/drawv2`, and `docs/DECISIONS.md` here cites each.

---

## Fit criteria

**Does my project want this at all?**
- An application turns a browser's pointer and key events into its own values in more than one place, or tests its input without a browser.
- A gesture needs the pointer captured, or the default action prevented, and the code deciding so should not hold the event.
- An application will pan or zoom, and its input must follow the view without its listeners changing.

**It is the wrong tool when:**

| You need | Reach elsewhere, because input-capture is |
|---|---|
| what an input means, a click told from a drag, a gesture's phases | not a binder: that is `input-binding` |
| what lies under a point, or where a screen point lies in a drawing | not a hit tester or a view: the application supplies both, from `vector-scene` or its own |
| the wheel or a pinch as facts | not the wrong tool: listen for them (`listen`, IC3) |
| the context menu suppressed | not the wrong tool: listen for it (`listen`, IC3) and claim its fact (IC8) |
| a touchpad's pinch told from Ctrl and the wheel | not a reader of hardware: the platform delivers both alike |
| composition and lock state | not yet: held until an application needs either as facts |
| events from the whole page, or from controls outside the surface | not a page listener: one capture listens to one surface and one key source |
| a hold, a sequence or a double click decided by time | not a clock: a double click is the platform's own event, and a fact's `time` is the event's own, for the application to compare |

---

## Adjustment policy

Internal and sovereign: a measured gap is recorded where both sides can see it, then resolved by adjusting input-capture or by fracturing it if the gap reveals a second duty; never forked.

---

## Edges

**Contains:** the listeners, the reading of an event into a fact, and the reply.\
**Consumes:** nothing.\
**Consumed-by:** draw (H26.3) and `input-tester`.

The tester uses every family, `time` and the deltas: its keys' and mouse buttons' light from the key facts' `key` and `code` and the pointer facts' `button`, `buttons` and `pointerType`, its hold durations and repeat intervals from `time`, and its pinch is a `wheel` fact with `ctrlKey`.\
It hands its facts to `input-binding` as they are, since a pointer fact holds `at`, `button` and `pointerId` as own data properties.

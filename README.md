# input-capture

Turn each input event a platform delivers on one surface into one uniform fact, in the application's coordinates, and carry the application's answer for that fact back to the platform.

---

## Install

input-capture is released only as a tarball attached to a GitHub release, made by its own CI, so a consumer names the release file and its lockfile pins the file's hash.

Choose a release from the repository's Releases page, `https://github.com/apnex/input-capture/releases`, and name its file in your `package.json`, writing that release's version for `<version>`:
```json
"dependencies": {
  "@apnex/input-capture": "https://github.com/apnex/input-capture/releases/download/v<version>/apnex-input-capture-<version>.tgz"
}
```

Then install, which records the file's `integrity` in `package-lock.json`, so every `npm ci` refuses a file whose hash differs:
```bash
npm install
```

The package has one export path, `@apnex/input-capture`, which maps to `index.js` in the package's `dist` folder, as `package.json`'s `exports` gives; its types are `index.d.ts` beside it.\
A browser loads it as ES2022 modules, so it needs a browser that supports ES2022.\
A page maps the path to that file with one import-map entry, never a trailing-slash prefix, or vendors the package's `dist` folder and imports `index.js` by relative path, since every file it loads is a relative import of the next.

---

## Use

Open a capture on a surface, with your conversion to your own coordinates, your hit test, your delivery and the event families you want beyond pointers and keys; each event then reaches your delivery as one frozen fact, with a reply that can claim the event or take the pointer.

Open a capture on an SVG element, with the page's window as its key source, listening also for the wheel, the context menu and focus loss, `handle` being your own:
```js
import { openCapture } from "@apnex/input-capture";

const opened = openCapture({
  surface: svg,
  keys: window,
  listen: ["wheel", "context-menu", "blur"],
  toDrawing: (screen) => new DOMPoint(screen.x, screen.y).matrixTransform(svg.getScreenCTM().inverse()),
  hit: (target, fact) => target.closest("[data-id]")?.dataset.id ?? null,
  deliver: (fact, reply) => {
    if (fact.type === "down") reply.takePointer();
    if (fact.type === "wheel" || fact.type === "context-menu") reply.claim();
    if (handle(fact)) reply.claim();
  },
});
if (!opened.ok) throw new Error(JSON.stringify(opened.problems));
```

### `openCapture(declaration)`

The one function.\
It answers `{ ok: true, capture }`, or `{ ok: false, problems }` with every problem the declaration has; it never throws while it judges one, and throws only what a platform's `addEventListener` threw, after taking back every listener it added.

| Declaration property | What it is |
|---|---|
| `surface` | the element whose pointer events are listened to, holding `addEventListener`, `removeEventListener` and `setPointerCapture` |
| `keys` | optional: what key events are listened to on -- the window, or the surface itself -- holding `addEventListener` and `removeEventListener` |
| `toDrawing(screen)` | your conversion: answers an object whose `x` and `y` are finite numbers, a `DOMPoint` among them |
| `hit(target, fact)` | optional: asked for every pointer fact, with the event's target and the fact so far; its answer is held by reference in the fact's `hit` |
| `focus(target, fact)` | optional, requires `keys`: asked for every key fact, likewise, into `focus` |
| `deliver(fact, reply)` | handed every fact with its reply; its answer is ignored |
| `listen` | optional: an array naming, each at most once, `'wheel'`, `'context-menu'` and `'blur'`, `'blur'` requiring `keys`; absent, none of the three is listened for |

A problem is `{ pointer, problem }`: an RFC 6901 pointer into the declaration -- `""`, `/surface`, `/listen/1` -- and one of `not-an-object`, `unknown-property`, `missing-property` and `invalid-value`.\
`capture.close()` removes every listener the capture added and answers `undefined`; a later call does nothing.

Traps a declaration meets:
- Without `exactOptionalPropertyTypes`, the types accept `undefined` for an optional member such as `keys`, `hit`, `focus` or `listen`, but `openCapture` refuses a member present as `undefined`, so omit the member instead.
- A declaration made in another realm -- an iframe's object, or one `node:vm` made -- has that realm's `Object.prototype`, so it is refused as not a plain object, and a `listen` array made there is refused at `/listen`; make both in the realm that calls `openCapture`, the surface and key source being free to come from anywhere.
- `listen` written apart from the call widens to `string[]`, which the types refuse: write it inline, or `as const`.
- A family `listen` does not name is never delivered, and the types say so: comparing `fact.type` with `'wheel'` when no wheel is listed fails to compile.

### The fact

A fact is a frozen record of exactly twenty-one properties, in this order, each `null` where its family carries none.\
Tell the families apart by `type`: pointer facts `leave`, `down`, `move`, `up`, `cancel`, `over`, `out` and `double`, and, when listed, `wheel` and `context-menu`; key facts `key-down` and `key-up`; and, when listed, `blur`.

| Property | Pointer fact | Key fact | `blur` fact |
|---|---|---|---|
| `type` | the family's type | `key-down` or `key-up` | `blur` |
| `at` | `{ x, y }` your conversion answered for `screen` | `null` | `null` |
| `screen` | `{ x, y }`: the event's `clientX` and `clientY`, the viewport's units | `null` | `null` |
| `hit` | your `hit` answer, or `null` | `null` | `null` |
| `focus` | `null` | your `focus` answer, or `null` | `null` |
| `button` | the event's button, `0` when it has none | `null` | `null` |
| `buttons` | the buttons held, or `null` | `null` | `null` |
| `pointerId` | the pointer, or `null` | `null` | `null` |
| `pointerType` | `mouse`, `pen`, `touch`, or `null` | `null` | `null` |
| `key` | `null` | the event's `key`, or `null` | `null` |
| `code` | `null` | the event's `code`, or `null` | `null` |
| `repeat` | `null` | whether the key repeats | `null` |
| `shiftKey`, `ctrlKey`, `altKey`, `metaKey` | the modifiers held | the modifiers held | `false` |
| `deltaX`, `deltaY`, `deltaZ` | a `wheel`'s deltas as delivered; else `null` | `null` | `null` |
| `deltaMode` | a `wheel`'s unit: `0` pixels, `1` lines, `2` pages, or `null`; else `null` | `null` | `null` |
| `time` | the event's own `timeStamp`, or `null` | likewise | likewise |

The TypeScript types name each family -- `PointerFact<Hit>`, `WheelFact<Hit>`, `ContextMenuFact<Hit>`, `KeyFact<Focus>` and `BlurFact` -- and `CaptureFact<Hit, Focus, Listen>` is the union a delivery is handed, `Listen` inferred from `listen`.\
A fact holds `at`, `button` and `pointerId` as own data properties, so it can be handed to `input-binding` as it is.

Traps a fact holds:
- `time` is the platform's number, milliseconds from the page's time origin, never a clock reading: a hold's duration or a repeat's interval is the difference of two facts' times.
- A `wheel`'s deltas are never converted: a line's or a page's height is no field of the event, so convert them yourself if you need pixels.
- A touchpad's pinch arrives as `wheel` facts with `ctrlKey` true and fractional deltas, and a mouse wheel turned with Ctrl held as `wheel` facts with `ctrlKey` true: nothing the platform delivers tells them apart.
- A move with no change of button has `button` -1; a second button pressed or released during a drag arrives as a `move` whose `button` is 0 or more, the platform's chord.
- A `double` is the platform's `dblclick`, a mouse event: it carries no `pointerId` and no `pointerType`.
- A `context-menu` is a pointer fact, so `hit` is asked for it; on Linux it arrives after the press and before the release, and on other systems it may follow the release.
- A `blur` means the key source's input has stopped: a key held when it came will send no key-up, so treat every key as released.

### The reply

A reply is a frozen `{ claim, takePointer }`, fresh for each fact and live only while its delivery runs.\
`claim()` calls the event's `preventDefault` once and answers `undefined`.\
`takePointer()` asks the surface to capture the fact's pointer once, answering `true` when it agreed and `false` when it refused or the fact has no `pointerId`.\
Either throws an `Error` beginning `claim: ` or `takePointer: ` once its delivery has ended.

Traps a reply meets:
- Claim a `wheel` to stop the page scrolling and a touchpad pinch zooming it; the wheel's listener is added with `{ passive: false }`, so a claim works on any surface.
- Claim a `context-menu` to keep the browser's menu from opening.
- A mouse's back and forward buttons, 3 and 4, navigate the page's history on their release: claim their `up` facts, since claiming the `down` alone does not stop it.
- Claiming a `blur` changes nothing: the event is not cancelable.
- `takePointer` answers `false` for a synthetic event, whose pointer the platform does not hold active; a taken pointer's events all target the surface, so ask what lies under it by its `screen` point.

### Errors a listener throws

A listener refuses an event that is no object, or whose field is of no form or cannot be read, with a `TypeError` whose message begins with the platform event's name and a colon -- `pointerdown: `, `wheel: `, `blur: ` -- before anything is delivered; a conversion's answer of no form with one beginning `toDrawing: `.\
Anything your own functions throw propagates unchanged.

### In a test

Hand it plain objects of the platform's shape instead of a browser's:
```js
const listeners = new Map();
const surface = { addEventListener: (name, listener) => listeners.set(name, listener), removeEventListener() {}, setPointerCapture() {} };
openCapture({ surface, toDrawing: (screen) => screen, listen: ["wheel"], deliver: (fact) => console.log(fact.type, fact.at, fact.time) });
listeners.get("pointerdown")({ clientX: 10, clientY: 20, button: 0, pointerId: 1, timeStamp: 5, target: null, preventDefault() {} });
listeners.get("wheel")({ clientX: 10, clientY: 20, deltaX: 0, deltaY: 120, deltaZ: 0, deltaMode: 0, timeStamp: 9, target: null, preventDefault() {} });
```

`CONTRACT.md` gives every rule, IC1 to IC9.\
Using it with `input-binding`, `vector-scene` and `snap-grid` together is the subject of the guide, `docs/GUIDE.md` in `https://github.com/apnex/input-tester`.

---

## Test

The gate builds, runs every test -- among them a test in headless Chrome driven with trusted input over the DevTools protocol, and one beside the first release -- then the vocabulary, source, runtime, clock and chance, and export-map checks, and mission-kit's style checks over the Markdown.

Run the gate with a mission-kit checkout beside this repository, or with `MISSION_KIT` naming one, and with `google-chrome` on `PATH` or `CHROME` naming a Chrome:
```bash
npm ci
npm run gate
```

The consumer test packs the package, installs the file into an empty project, imports every export in Node, and loads every export in headless Chrome through an import map:
```bash
npm run consumer
```

The built size is measured after a build:
```bash
node tools/measure-size.mjs
```

---

## Remove

Close every capture you opened, then remove the dependency, and with it the lockfile's entry:
```bash
npm uninstall @apnex/input-capture
```

Then remove the import-map entry of each page that loads it.

---

## Status

Experimental until mission-kit admits it; runs in the Node versions `package.json`'s `engines` names, and in browsers that support ES2022.

---

## Documents

- `VISION.md` - why it exists, and what it will never be.
- `CONTRACT.md` - what a consumer can depend on, one capability per row, and every rule.
- `docs/DECISIONS.md` - the rulings about this component, the choices made at build, and its built size.
- `https://github.com/apnex/input-tester`, `docs/GUIDE.md` - the guide to using input-capture, `input-binding`, `vector-scene` and `snap-grid` together, the tester's code its worked example.

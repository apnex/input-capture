# input-capture

Turn each input event a platform delivers on one surface into one uniform fact, in the application's coordinates, and carry the application's answer for that fact back to the platform.

**Status: experimental until mission-kit admits it; runs in the Node versions `package.json`'s `engines` names, and in browsers that support ES2022 and import maps.**

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

A browser loads it as ES2022 modules through an import map, so it needs a browser that supports both.\
The page maps the package's one export path to its file with one import-map entry, never a trailing-slash prefix.

---

## Use

Open a capture on a surface, with your conversion to your own coordinates, your hit test and your delivery; each pointer, double-click and key event then reaches your delivery as one frozen fact, with a reply that can claim the event or take the pointer.

Open a capture on an SVG element, with the page's window as its key source, `toDrawing` reading the element's screen transform at each event and `handle` being your own:
```js
import { openCapture } from "@apnex/input-capture";

const opened = openCapture({
  surface: svg,
  keys: window,
  toDrawing: (screen) => new DOMPoint(screen.x, screen.y).matrixTransform(svg.getScreenCTM().inverse()),
  hit: (target, fact) => target.closest("[data-id]")?.dataset.id ?? null,
  deliver: (fact, reply) => {
    if (fact.type === "down") reply.takePointer();
    if (handle(fact)) reply.claim();
  },
});
if (!opened.ok) throw new Error(JSON.stringify(opened.problems));
```

A fact holds `type`, `at` and `screen`, your `hit` or `focus` answer, `button`, `buttons`, `pointerId`, `pointerType`, `key`, `code`, `repeat` and the modifiers, each `null` where its family carries none; it holds `at` and `button` as own data properties, so it can be handed to `input-binding` as it is.\
`opened.capture.close()` removes every listener the capture added; `CONTRACT.md` gives each rule, IC1 to IC9.

Two refusals the types cannot show.\
Without `exactOptionalPropertyTypes`, the types accept `undefined` for an optional member such as `keys`, `hit` or `focus`, but `openCapture` refuses a member present as `undefined`, so omit the member instead.\
A declaration made in another realm -- an iframe's object, or one `node:vm` made -- has that realm's `Object.prototype`, so `openCapture` refuses it as not a plain object; make the declaration in the realm that calls `openCapture`, its surface and key source being free to come from anywhere.

In a test, hand it plain objects of the platform's shape instead of a browser's:
```js
const listeners = new Map();
const surface = { addEventListener: (name, listener) => listeners.set(name, listener), removeEventListener() {}, setPointerCapture() {} };
openCapture({ surface, toDrawing: (screen) => screen, deliver: (fact) => console.log(fact.type, fact.at) });
listeners.get("pointerdown")({ clientX: 10, clientY: 20, button: 0, pointerId: 1, target: null, preventDefault() {} });
```

---

## Test

The gate builds, runs every test -- among them a test in headless Chrome driven with trusted input over the DevTools protocol -- then the vocabulary, source, runtime, clock and chance, and export-map checks, and mission-kit's style checks over the Markdown.

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

## Documents

- `VISION.md` - why it exists, and what it will never be.
- `CONTRACT.md` - what a consumer can depend on, one capability per row, and every rule.
- `docs/DECISIONS.md` - the rulings about this component, the choices made at build, and its built size.

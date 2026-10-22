# input-capture - Vision

**Status: ratified by the director as written, 2026-10-22 (draw's ruling `H26-8`, in draw's `dev/DECISIONS.md`); enduring.**\
This document states why input-capture exists and what it will never be.\
It carries no current state, no roadmap, and no schedule.

Holding this document authorises nothing.\
A change of direction is recorded as a decision first and absorbed here afterwards.

---

**North star.**\
Let every application meet the platform's input in one place, and receive it as the same plain facts everywhere.

**Why it exists.**\
Applications read a browser's events wherever they need one -- a coordinate here, a button there, a `preventDefault` deep in a handler -- so the platform leaks into every layer, and input cannot be tested, recorded or replayed without a browser.\
`input-capture` holds that boundary once: it listens, reads each event into a fact in the application's own coordinates, and does to the event only what the application asks of the fact.

**What it is.**\
An embeddable library with one function: open a capture on a surface, hand it the application's conversion, hit test and delivery, and receive one frozen fact for each pointer, double-click and key event, with a reply that can claim the event or take the pointer.

**What it is not.**
- Not a binder: what an input means is `input-binding`'s.
- Not a hit tester or a view: what lies under a point, and where a screen point lies, are the application's.
- Not a page listener: it listens to the surface and the key source it is given.
- Not a clock: a fact holds no time.
- Not a network service: it never listens to or sends anything but events.

**What success means.**
- **Fidelity:** a fact says exactly what the platform reported, and nothing the application did not supply.
- **Containment:** no layer above it needs the platform's event to work.
- **Testability:** every input an application handles can be driven without a browser, and is proved with one.
- **Reuse:** a second, unrelated application adopts it without a variant, a fork or a change.

**Authority.**\
Held by the director; drafted by anyone, ratified only by the director; amended, never quietly rewritten.

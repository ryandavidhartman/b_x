# Appendix E: The Encounter Builder

A React + Vite + TypeScript companion tool for **Appendix E: The Encounter
Builder** in `publication/monsters/combined-monsters.md` — the procedure for
building a deliberately-stocked location (a haunted tomb, a bandit hideout, a
wizard's tower) in advance, complete with monsters placed on purpose,
treasure, dungeon dressing, and traps.

It covers every section of the appendix: Scenarios, Stocking a Room, Dungeon
Dressing (all thirteen sensory tables plus a Room Name combiner), Trap /
Environmental Hazard / Trick generation, and the full Random Dungeon
Generation procedure (Tables 1-23) with a rendered SVG map — room by room or
all at once.

This app leans on the rest of the book's own toolkit, the same way the
appendix itself does — Appendix C: Monster Quick Reference, Appendix D:
Random Encounters, and Appendix B: Treasure. Rather than duplicate that logic
a third time (`tools/treasure-generator` and `tools/encounter-generator`
already each carry their own independent copy), the monster-resolution and
treasure-generation code here is imported from `tools/shared/src`, aliased as
`@shared/*` in `vite.config.ts` and `tsconfig.app.json`. Only this app's own
Appendix E tables and generators live under `src/`.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`, deployable anywhere (e.g. as a GitHub Pages
build or alongside the PDF/HTML book outputs).

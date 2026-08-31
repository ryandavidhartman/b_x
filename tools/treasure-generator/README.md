# Appendix B: Treasure Generator

A React + Vite + TypeScript companion tool for **Appendix B: Treasure** in
`publication/monsters/combined-monsters.md`. It rolls the full treasure chain
from the book: Lair (A-O), Individual (P-V), and Unguarded (by dungeon level)
treasure types, including coins, gems (with the quality-adjustment table),
jewelry, and — when a hoard indicates magic items — resolves those all the
way down through weapons (with bonuses, special enemies/abilities, and an
optional intelligent-sword check), armor, potions, scrolls, wands/staves/rods,
miscellaneous items, and rare items. It can also roll a single magic item on
its own.

Dragon (Lair Type H) hoards take an age category and Hit Dice input, since
the book gives those as scaling percentages rather than fixed numbers; the
monetary chance is linearly interpolated between the book's two given
endpoints (35% at 2nd age category, 85% at 7th).

All tables live under `src/data/`, transcribed directly from the book. The
roll orchestration is in `src/generators/`.

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

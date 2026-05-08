# B/X Handoff

Date: `2026-05-07`

## Latest Session Update

This session focused on expanding the monster book's illustration set with newly generated black-and-white plate art and wiring that art into the Markdown source.

Current uncommitted monster-book changes:

- Modified [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md) to add new illustration links at the ends of selected entries.
- Added [publication/monsters/illustration-slate.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/illustration-slate.md) to track the larger planned illustration slate.
- Added these new asset files under [publication/monsters/assets](/home/ryandavidhartman/dev/source/b_x/publication/monsters/assets):
  - `bandit-plate.png`
  - `bear-plate.png`
  - `chimera-plate.png`
  - `dragon-plate.png`
  - `driver-ant-plate.png`
  - `dwarf-plate.png`
  - `elf-plate.png`
  - `gargoyle-plate.png`
  - `giant-beetle-plate.png`
  - `griffon-plate.png`
  - `harpy-plate.png`
  - `lizard-man-plate.png`
  - `manticore-plate.png`
  - `minotaur-plate.png`
  - `owl-bear-plate.png`
  - `rust-monster-plate.png`
  - `shark-plate.png`
  - `unicorn-plate.png`
  - `wyvern-plate.png`

Entries currently linked to new generated plates in `combined-monsters.md`:

- `Chimera`
- `Dragon`
- `Gargoyle*`
- `Griffon`
- `Harpy`
- `Lizard Man`
- `Manticore`
- `Minotaur`
- `Owl Bear`
- `Rust Monster`
- `Unicorn`
- `Wyvern`
- `Bear`
- `Shark`
- `Ant, Driver`
- `Beetle, Giant`
- `Bandit`
- `Dwarf`
- `Elf`

Important note about style direction:

- A rougher `-v2` illustration experiment was generated briefly, but the user preferred the original cleaner `v1` images.
- The `-v2` files were deleted and should not be looked for.

Immediate next step after reboot:

1. Rebuild the monster book HTML and PDF and inspect layout/fit of the newly inserted illustrations.
2. Decide which of the newly linked plates should stay, be moved within entries, be resized by layout changes, or be replaced.
3. Continue generating and linking additional plates from `illustration-slate.md` only after reviewing the rebuilt outputs.

## Current State

This repo now contains two maintained compiled books:

- [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md)
- [publication/spells/combined-spells.md](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.md)

Published outputs currently checked into the repo:

- [publication/monsters/combined-monsters.html](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.html)
- [publication/monsters/combined-monsters.pdf](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.pdf)
- [publication/spells/combined-spells.html](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.html)
- [publication/spells/combined-spells.pdf](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.pdf)

The repository is now initialized and pushed to GitHub:

- `git@github.com:ryandavidhartman/b_x.git`

## Source Of Truth

Monster book:

- [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md)

Spell book:

- [publication/spells/combined-spells.md](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.md)

Legacy reference material that is no longer the primary monster workflow:

- [publication/monsters/generate_monsters.py](/home/ryandavidhartman/dev/source/b_x/publication/monsters/generate_monsters.py)

Supporting material:

- [publication/monsters/assets](/home/ryandavidhartman/dev/source/b_x/publication/monsters/assets)
- [publication/monsters/working](/home/ryandavidhartman/dev/source/b_x/publication/monsters/working)
- [publication/spells/assets](/home/ryandavidhartman/dev/source/b_x/publication/spells/assets)
- [source/basic_pages](/home/ryandavidhartman/dev/source/b_x/source/basic_pages)
- [source/expert_pages](/home/ryandavidhartman/dev/source/b_x/source/expert_pages)

## Build Workflow

Monster build:

- [publication/monsters/build.sh](/home/ryandavidhartman/dev/source/b_x/publication/monsters/build.sh)
- [publication/monsters/monster-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/monsters/monster-layout.lua)
- [publication/monsters/combined-monsters.css](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.css)
- [publication/monsters/combined-monsters-header.tex](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters-header.tex)

Spell build:

- [publication/spells/build.sh](/home/ryandavidhartman/dev/source/b_x/publication/spells/build.sh)
- [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- [publication/spells/combined-spells.css](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.css)
- [publication/spells/combined-spells-header.tex](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells-header.tex)

Current output behavior:

- HTML stays single-column for both books.
- Monster PDF uses a two-column layout for the book body, with selected wide comparison-table entries breaking out to full page width.
- Spell PDF switches to two columns at `Spell Descriptions`.
- The Markdown sources are kept generic; output-specific layout behavior is handled in the Lua filters and LaTeX/CSS files.

## Completed Today

- Generated and added a first wave of new monster/NPC/animal/insect plate illustrations for the monster book.
- Linked those new generated plates into selected entries in [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md).
- Added [publication/monsters/illustration-slate.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/illustration-slate.md) to track the broader planned art rollout.
- Renamed the handoff document to `HANDOFF.md` so it is no longer date-stamped in the filename.
- Confirmed the monster workflow no longer depends on `generate_monsters.py` as the active source path.
- Tried a mixed monster HTML/PDF column approach, then backed HTML out to a clean single-column layout with the TOC restored.
- Kept the monster PDF in a two-column layout.
- Added PDF-only full-width breakout handling for wide monster comparison-table entries, without changing the Markdown source.
- Applied that monster PDF treatment to:
  - `Dragon`
  - `Giant`
  - `Lycanthrope*`
  - `Bear`
  - `Cat, Great`
  - `Fish, Giant`
  - `Hawk`
  - `Horse`
  - `Lizards, Giant`
  - `Men`
  - `NPC Parties`
  - `Snake`
  - `Spider, Giant`
- Applied the same general split-output idea to spells:
  - HTML unchanged
  - PDF two-column starting at `Spell Descriptions`
- Added a repo-root [README.md](/home/ryandavidhartman/dev/source/b_x/README.md) with build instructions for both books.
- Initialized the local Git repository, created the initial commits, and pushed `main` to GitHub.
- Added [.gitignore](/home/ryandavidhartman/dev/source/b_x/.gitignore) to keep local scratch material, caches, backups, and generated working directories out of future commits.

## Current Known Good

- The new generated plates are present on disk and linked into the monster Markdown source for 19 entries.
- Monster HTML is back to a readable single-column layout with the TOC present.
- Monster PDF is substantially improved with two-column layout and targeted wide-table handling.
- Spell HTML remains straightforward and readable.
- Spell PDF now uses a two-column layout without requiring per-spell special cases.
- The repo has a documented build process and is now under Git/GitHub.

## Current Known Risks

- The new generated illustration style is only partially validated; the user has not yet rebuilt the monster HTML/PDF to inspect page fit and visual consistency in output.
- Adding many more plates may require layout adjustments if the current inserts create awkward page breaks or crowding.
- Monster PDF layout is improved but still not final; more entries may need the same full-width-table treatment if additional awkward tables are spotted.
- Some monster text likely still contains OCR issues or reconstructed wording that has not been fully source-checked.
- `publication/monsters/generate_monsters.py` is still in the repo as legacy material, which may confuse a future editor unless they read the README/handoff first.
- `source/` and the published HTML/PDF outputs are currently committed, so the repo is larger and more artifact-heavy than a source-only repo.

## Best Next Steps

1. Rebuild monsters and inspect the new inserted illustrations in both HTML and PDF.
2. Continue visual proofreading of the monster PDF and add more full-width-table exceptions only where needed.
3. Decide which of the current generated plates should remain and which entries still need art from `illustration-slate.md`.
4. Continue content proofreading of monster entries against the Basic and Expert page PDFs where exact wording matters.
5. Decide later whether `source/` and committed output files should remain in the repo long-term.
6. If the monster PDF stabilizes, do a final consistency pass on TOC behavior, ordering, and cross-references.

## Command Reminder

To rebuild monsters:

```bash
cd /home/ryandavidhartman/dev/source/b_x/publication/monsters
./build.sh
```

To rebuild spells:

```bash
cd /home/ryandavidhartman/dev/source/b_x/publication/spells
./build.sh
```

# B/X Handoff

Date: `2026-05-07`

## Latest Session Update

This session focused on using illustrations as page-by-page layout shims in the monster PDF, rather than trying more global layout logic.

Current uncommitted monster-book changes:

- Modified [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md)
- Modified [publication/monsters/combined-monsters.pdf](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.pdf)
- Modified these existing asset files under [publication/monsters/assets](/home/ryandavidhartman/dev/source/b_x/publication/monsters/assets):
  - `black-pudding-plate.png`
  - `blink-dog-plate.png`
  - `bugbear-plate.png`
- Added this new untracked asset:
  - `dryad-plate.png`

What was attempted:

- Cropped some existing plates manually and rebuilt the PDF.
- Reduced `black-pudding-plate.png`, `blink-dog-plate.png`, and `bugbear-plate.png` slightly to try to pull the `Bugbear` image back onto page 7.
- Generated a new `Dryad` plate in matching black-and-white line-art style and inserted it into the `Dryad` entry as a page-flow shim.
- Scaled the actual `dryad-plate.png` file down from `1424x1104` to `619x480`.

Current state of the `Dryad` experiment:

- `combined-monsters.md` now includes a `Dryad` illustration before `Basilisk`.
- The inserted Markdown currently reads:
  - `![Expert monster illustration: dryad](assets/dryad-plate.png){ width=42% }`
- The user explicitly rejected changing only the display width as the main control lever and wanted the actual image scaled instead.
- The goal is very specific:
  - `Basilisk` should start at the top of the right column on page 6.

What the latest rebuild achieved:

- `Black Pudding` now starts on page 7.
- But `Dryad` still occupies the top of the right column on page 6.
- Therefore the exact target was not reached: `Basilisk` does **not** start at the top of the right column on page 6.

Important note for the next session:

- Do not spend time re-arguing global layout changes.
- The user wants fast, concrete page-by-page PDF adjustments.
- The next logical step is to keep working on the `Dryad`/page-6 shim problem by changing the actual image size and/or placement until `Basilisk` lands at the top of the right column on page 6.

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
- The page-shim idea can change downstream pagination in useful ways; adding/scaling an illustration is a viable lever.

## Current Known Risks

- The new generated illustration style is only partially validated; the user has not yet rebuilt the monster HTML/PDF to inspect page fit and visual consistency in output.
- Adding many more plates may require layout adjustments if the current inserts create awkward page breaks or crowding.
- Monster PDF layout is improved but still not final; more entries may need the same full-width-table treatment if additional awkward tables are spotted.
- Some monster text likely still contains OCR issues or reconstructed wording that has not been fully source-checked.
- `publication/monsters/generate_monsters.py` is still in the repo as legacy material, which may confuse a future editor unless they read the README/handoff first.
- `source/` and the published HTML/PDF outputs are currently committed, so the repo is larger and more artifact-heavy than a source-only repo.
- The current `Dryad` insertion is only a partial success and may be reverted or adjusted further.
- `combined-monsters.md` currently contains a temporary `Dryad` width override that may not be the final desired mechanism.

## Best Next Steps

1. Resolve the specific page-6 target: make `Basilisk` start at the top of the right column on page 6.
2. Re-check page 7 after any `Dryad` adjustment so `Black Pudding` still starts cleanly there.
3. Continue the same page-by-page image-shim method only where it clearly improves the PDF.
4. Decide whether the temporary `Dryad` Markdown width override should be kept, changed, or removed.
5. Continue content proofreading of monster entries against the Basic and Expert page PDFs where exact wording matters.

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

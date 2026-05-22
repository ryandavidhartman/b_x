# B/X Handoff

Date: `2026-05-22`

## Latest Session Update

Follow-up update on `2026-05-22`:

- Relaxed the custom compact stat-block shorthand in both book pipelines so rows no longer require trailing `:` on label cells.
- The shorthand now accepts any pipe-delimited row with exactly four non-empty cells, for example:
  - `| Armor Class | 2 | No. Appearing | 1d8 (1d20) |`
  - `| Hit Dice | 1 | Save As | Cleric 1 |`
- Updated the shorthand handling in:
  - [publication/monsters/monster-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/monsters/monster-layout.lua)
  - [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- Updated [README.md](/home/ryandavidhartman/dev/source/b_x/README.md) to document that label-cell trailing colons are optional.
- Verified the relaxed shorthand with scratch Pandoc runs through:
  - monster HTML
  - monster LaTeX/PDF path
  - spell HTML
- Reduced the monster PDF body font size by one step by adding `-V fontsize=9pt` to the monster build in [publication/monsters/build.sh](/home/ryandavidhartman/dev/source/b_x/publication/monsters/build.sh).
- Rebuilt the monster book after the parser and font-size changes:
  - [publication/monsters/combined-monsters.pdf](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.pdf)

- Earlier on `2026-05-22`:
- Added support for a custom compact stat-block Markdown shorthand in both book pipelines. Example:
  - `| Armor Class: | 2 | No. Appearing: | 1-8 (1-20) |`
  - `| Hit Dice: | 1 | Save As: | Cleric: 1 |`
- This shorthand is implemented in:
  - [publication/monsters/monster-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/monsters/monster-layout.lua)
  - [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- It is recognized from pipe-delimited `LineBlock` rows without requiring a normal Markdown table header/separator row.
- The shorthand renders as a four-column stat table in both HTML and PDF.
- HTML styling for the custom stat table was added in:
  - [publication/monsters/combined-monsters.css](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.css)
  - [publication/spells/combined-spells.css](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.css)
- PDF rendering for the custom stat table now uses `\footnotesize`.
- The custom stat table no longer draws horizontal separator lines between each row in either HTML or PDF.
- Added `tabularx` to the spell PDF header so the spell pipeline can render the custom stat table:
  - [publication/spells/combined-spells-header.tex](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells-header.tex)
- Documented the shorthand in [README.md](/home/ryandavidhartman/dev/source/b_x/README.md).
- Verified the shorthand with scratch Pandoc runs in monster/spell HTML and LaTeX/PDF paths.
- Rebuilt both books after these changes:
  - [publication/monsters/combined-monsters.html](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.html)
  - [publication/monsters/combined-monsters.pdf](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.pdf)
  - [publication/spells/combined-spells.html](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.html)
  - [publication/spells/combined-spells.pdf](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.pdf)

Follow-up update on `2026-05-16`:

- Added a Markdown-native centered block syntax that works in both HTML and PDF builds:
  - `::: center`
  - `Centered text`
  - `:::`
- Implemented centered-block handling in:
  - [publication/monsters/monster-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/monsters/monster-layout.lua)
  - [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- Added matching HTML styling in:
  - [publication/monsters/combined-monsters.css](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.css)
  - [publication/spells/combined-spells.css](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.css)
- Documented the centered-block syntax in [README.md](/home/ryandavidhartman/dev/source/b_x/README.md).
- Verified with scratch Pandoc runs that the same Markdown emits centered HTML and centered LaTeX output.
- While adding this, fixed a spell-filter edge case so the spell Lua filter no longer emits a stray `\end{multicols}` when the input does not contain the `Spell Descriptions` section.

Follow-up update on `2026-05-13`:

- Replaced the old hardcoded monster PDF two-column trigger (`## Monster Descriptions`) with explicit Markdown markers in the monster source:
  - `::: twocolumn-pdf-begin`
  - `::: twocolumn-pdf-end`
- Updated the monster source so `Animals`, `Insects`, `Monsters`, `NPCs`, and `Prehistoric` stay as normal top-level `##` headings in Markdown while still rendering in two columns in the PDF.
- Fixed the monster HTML TOC so those section headings appear again after the two-column control change.
- Changed TOC depth behavior:
  - Monster HTML now builds with `--toc-depth=3` so section headings contain nested monster-entry headings.
  - Monster PDF still builds with `--toc-depth=2`.
  - Both spell outputs now build with `--toc-depth=2`.
- Added a monster-book HTML TOC enhancement:
  - New files:
    - [publication/monsters/combined-monsters-head.html](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters-head.html)
    - [publication/monsters/combined-monsters-toc.js](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters-toc.js)
  - The monster HTML TOC now shows nested entry lists under `Animals`, `Insects`, `Monsters`, `NPCs`, and `Prehistoric`.
  - Those nested lists are collapsed by default and expand when the user clicks the section heading.
  - Section clicks were explicitly changed to expand/collapse only; they no longer jump to the section anchor in HTML.
- Added a monster PDF end index:
  - The monster Lua filter now labels each `###` entry, gathers those headings, alphabetizes them, and appends an `Index` section at the end of the PDF with page numbers.
  - The index entry names and page numbers are emitted with `\hyperref[...]` so they should be clickable in the PDF.
- Changed the monster PDF build flow in [publication/monsters/build.sh](/home/ryandavidhartman/dev/source/b_x/publication/monsters/build.sh):
  - It now generates `combined-monsters.tex` first and then runs `xelatex` twice.
  - This was done to make PDF TOC links and page references resolve correctly, which a single direct Pandoc-to-PDF pass was not reliably doing.
- Rebuilt both books after these changes.

This session focused on using illustrations as page-by-page layout shims in the monster PDF, rather than trying more global layout logic.

Follow-up update on `2026-05-08`:

- Added two PDF-only Markdown control markers to both book pipelines:
  - `::: pagebreak-pdf` forces a new PDF page and is ignored by HTML.
  - `::: columnbreak-pdf` forces the next PDF column inside the two-column body and is ignored by HTML.
- Implemented those markers in:
  - [publication/monsters/monster-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/monsters/monster-layout.lua)
  - [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- Documented marker usage in [README.md](/home/ryandavidhartman/dev/source/b_x/README.md).
- Verified the marker behavior with scratch Pandoc runs through both filters.

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
- [publication/monsters/combined-monsters-head.html](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters-head.html)
- [publication/monsters/combined-monsters-toc.js](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters-toc.js)

Spell build:

- [publication/spells/build.sh](/home/ryandavidhartman/dev/source/b_x/publication/spells/build.sh)
- [publication/spells/spell-layout.lua](/home/ryandavidhartman/dev/source/b_x/publication/spells/spell-layout.lua)
- [publication/spells/combined-spells.css](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells.css)
- [publication/spells/combined-spells-header.tex](/home/ryandavidhartman/dev/source/b_x/publication/spells/combined-spells-header.tex)

Current output behavior:

- HTML stays single-column for both books.
- Monster HTML now uses a 3-level TOC with expandable section groups for the monster book.
- Monster PDF uses a two-column layout for marked body sections, with selected wide comparison-table entries breaking out to full page width.
- Both books now support a custom compact stat-block shorthand made of five-ish pipe-delimited lines with four cells per row.
- That shorthand now accepts label cells with or without trailing `:`.
- That custom stat-block shorthand renders as a dedicated four-column stat table in both HTML and PDF.
- The PDF version of the custom stat block uses a slightly smaller font and has no horizontal row separators.
- Both books now support PDF-only Markdown break markers:
  - `::: pagebreak-pdf`
  - `::: columnbreak-pdf`
- Both books now support a cross-output centered block marker:
  - `::: center`
- Monster book also supports PDF-only two-column region markers:
  - `::: twocolumn-pdf-begin`
  - `::: twocolumn-pdf-end`
- Monster PDF now appends an alphabetical `Index` section at the end with entry page references.
- Monster PDF now builds at `9pt` body text via `-V fontsize=9pt` in the build script.
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
- Monster HTML now has expandable top-level TOC sections with nested monster entry links.
- Monster PDF is substantially improved with two-column layout, targeted wide-table handling, and an appended alphabetical end index.
- Both books now support the compact custom stat-block shorthand without needing a normal Markdown table header row.
- The custom stat-block shorthand now works with label cells both with and without trailing `:`.
- The custom stat-block shorthand has been verified in both HTML and PDF builds, and both books were rebuilt after the feature landed.
- Both books now support Markdown-native PDF-only page and column break markers without requiring raw LaTeX in the source.
- Both books now support a Markdown-native centered block syntax that renders centered text in both HTML and PDF.
- Monster PDF TOC/index references are now built through a two-pass XeLaTeX flow instead of a single direct Pandoc PDF pass.
- Monster PDF currently builds with slightly smaller `9pt` body text.
- Spell HTML remains straightforward and readable.
- Spell PDF now uses a two-column layout without requiring per-spell special cases.
- The repo has a documented build process and is now under Git/GitHub.
- The page-shim idea can change downstream pagination in useful ways; adding/scaling an illustration is a viable lever.

## Current Known Risks

- The new generated illustration style is only partially validated; the user has not yet rebuilt the monster HTML/PDF to inspect page fit and visual consistency in output.
- The custom stat-block shorthand is still pattern-based; it expects exactly four non-empty pipe-delimited cells per row.
- Adding many more plates may require layout adjustments if the current inserts create awkward page breaks or crowding.
- Monster PDF layout is improved but still not final; more entries may need the same full-width-table treatment if additional awkward tables are spotted.
- The monster PDF TOC and end-index links were fixed at the source level, but they should still be spot-checked manually in a PDF viewer after future layout/filter changes.
- Some monster text likely still contains OCR issues or reconstructed wording that has not been fully source-checked.
- `publication/monsters/generate_monsters.py` is still in the repo as legacy material, which may confuse a future editor unless they read the README/handoff first.
- `source/` and the published HTML/PDF outputs are currently committed, so the repo is larger and more artifact-heavy than a source-only repo.
- The current `Dryad` insertion is only a partial success and may be reverted or adjusted further.
- `combined-monsters.md` currently contains a temporary `Dryad` width override that may not be the final desired mechanism.

## Best Next Steps

1. Resolve the specific page-6 target: make `Basilisk` start at the top of the right column on page 6.
2. Re-check page 7 after any `Dryad` adjustment so `Black Pudding` still starts cleanly there.
3. Spot-check the monster PDF in an actual PDF viewer:
   - TOC links should land on the correct pages.
   - End-index links should be clickable and land on the correct entries.
4. Continue the same page-by-page image-shim method only where it clearly improves the PDF.
5. Decide whether the temporary `Dryad` Markdown width override should be kept, changed, or removed.
6. Continue content proofreading of monster entries against the Basic and Expert page PDFs where exact wording matters.

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

# B/X Handoff

Date: `2026-05-22`

## Latest Session Update

Follow-up update on `2026-07-24` (pagination/orphaned-heading sweep, continuing the `2026-07-23` "fix page breaks" work):

- Problem being hunted: monster entries in `combined-monsters.md` where the `### Heading` lands at the very bottom of a PDF column/page while its stat block (and sometimes even the `*Source:*` line) renders at the top of the *next* column or page — a bad visual split. First instance found and fixed this session: `Efreeti` (regular, not `Efreeti, Lesser`), by adding a `::: columnbreak-pdf` marker right before its heading.
- Built a repeatable detection method since eyeballing 146 pages isn't practical:
  1. `pdftotext -bbox-layout combined-monsters.pdf out.html` — gives word/line bounding boxes grouped into `<flow>` elements that (unlike plain `pdftotext -layout`) preserve true visual reading order.
  2. Bucket every line by `(page, side)` where `side = 'L' if xmin < 200 else 'R'` (column left margin ≈ `x=64.8`, right column left margin ≈ `x=312`; heading lines are the ones at those exact x‑positions with line-height ≈ `9.96pt`).
  3. For each `### heading` occurrence found at a heading-position line, check whether the very next line in that *same* `(page, side)` bucket is `Source:` ..., and whether the next line after that starts a stat block (`Armor Class` / `Stat` / `Kind` / `Hit Dice`). If the bucket instead just *ends* right after the heading (and/or `Source:`) with nothing else, that's a strong signal the rest of the entry got pushed to a different column/page.
  4. **This heuristic alone still throws ~50% false positives** (poppler sometimes serializes a stat-block's label/value sub-columns or a nearby figure caption out of visual order even when everything is physically in the same column) — every candidate was visually confirmed by rendering the specific page(s) to PNG (`pdftoppm -png -r 150 -f N -l N combined-monsters.pdf out`) before touching the Markdown.
  5. Fix is normally `::: columnbreak-pdf` right before the orphaned `### Heading`. **Exception:** if the heading sits *outside* any `::: twocolumn-pdf-begin/end` region (i.e. it's one of the full-width single-column wide-table entries like `Giant`), `columnbreak-pdf` is a no-op there (it only emits `\columnbreak` when already inside a `multicols` block) — use `::: pagebreak-pdf` instead so it starts fresh at the top of the next page.
- Confirmed and fixed 18 real splits this session (rebuilt + re-verified via bbox re-scan showing heading+Source+stat-block now co-located): `Stag`, `Whale`, `Wolf`, `Living Statue`, `Giant` (used `pagebreak-pdf`, see exception above), `Ogre Mage`, `Ant, Giant`, `Ear Seeker`, `Archelon`, `Diplodocus`, `Neanderthal (Caveman)`, `Plesiosaurus`, `Triceratops`, `Teratosaurus`, `Jackalwere`, `Chimera`, `Cockatrice`, `Hippocampus`.
- Explicitly checked and confirmed **NOT broken** (false positives from the detector, left alone): `Bear, Cave`, `Ceratosaurus`, `Cetiosaurus`, `Elasmosaurus`, `Gorgosaurus`, `Iguanodon`, `Paleoscincus`, `Sabre-Tooth Tiger`, `Cerebral Parasite`, `Displacer Beast`, and most of the "same-bucket, different stat-label-order" flags from earlier passes of the detector (Eel, Hyena, Irish Deer, Rat, Shark, Squid Giant, Sea Dragons, Djinni, Hobgoblin, Type V Demon (Marilith), Weretiger*, Gas Spore, Elf, Nixies, Sphinx, Thought Eater, Dryad, etc.) — these all had heading+Source+stat block genuinely together in the same column, just reordered in the bbox extraction.
- **Scan completed and converged.** Checked the remaining pages flagged from the first pass (`Gas Spore`, `Harpy`, `Yellow Mold`, `Berserker`, `Elf`, `Normal Human`, `NPC Parties`, `Brownie`, `Nixies`, `Satyr`, `Sprite`, `Dispater (Arch-devil)`, `Geryon (Arch-devil)`) and found 5 more real splits: `Yellow Mold`, `Normal Human`, `Sprite`, `Dispater (Arch-devil)`, `Geryon (Arch-devil)` — fixed the same way. `Gas Spore`, `Harpy`, `Berserker`, `Elf`, `NPC Parties`, `Brownie`, `Nixies`, `Satyr` were confirmed fine (false positives).
- Rebuilding after each round of fixes shifts pagination downstream and can surface *new* orphaned headings that were previously hidden mid-column (whack-a-mole is expected) — re-running the detector after every fix batch caught 4 more this way: `Turtle, Giant`, `Spider, Giant`, `Unicorn`. Also fixed. Note `Spider, Giant` is (like `Giant`) a single-column full-width wide-variant-table entry outside any `twocolumn-pdf-begin/end` region, so it needed `pagebreak-pdf`, not `columnbreak-pdf`.
- **Grand total this session: 27 orphaned-heading splits found and fixed** — `Efreeti`, `Stag`, `Whale`, `Wolf`, `Living Statue`, `Giant`, `Ogre Mage`, `Ant, Giant`, `Ear Seeker`, `Archelon`, `Diplodocus`, `Neanderthal (Caveman)`, `Plesiosaurus`, `Triceratops`, `Teratosaurus`, `Jackalwere`, `Chimera`, `Cockatrice`, `Hippocampus`, `Yellow Mold`, `Normal Human`, `Sprite`, `Dispater (Arch-devil)`, `Geryon (Arch-devil)`, `Turtle, Giant`, `Spider, Giant`, `Unicorn`.
- The detector re-run after the last fix batch shows **no remaining high-confidence candidates** (no more "bucket ends right after heading" cases). The lower-confidence noise category (heading+Source together but the next stat-label line reordered within the same column by poppler) was spot-checked repeatedly and is consistently a false-positive shape, not a real bug.
- Solved the mystery of the 13 headings the detector's text-match couldn't locate (`Hippopotamus`, `Leopard`, `Lion`, `Lemure`, `Ettin`, `Ankylosaurus`, `Boar, Giant`, `Lambeosaurus`, `Shadow`, `Yeti`, `Noble`, `Ogre`, `Hippogriff`): it's a benign `pdftotext -bbox-layout` extraction artifact, not a real defect. When a heading sits at the top of one column at the same line-height as ongoing body text in the *other* column, poppler's line-reconstruction sometimes concatenates them into a single `<line>` (confirmed for `Yeti`: extracted as `"...Most Yeti"`, merging the tail of `Will-O-Wisp`'s description with the unrelated `Yeti` heading one column over). The actual PDF renders both correctly and separately — verified visually for `Yeti`, `Ettin`, and others already screenshotted this session. No further action needed on these.
- Rebuilt `combined-monsters.html`/`.pdf` after every fix batch (`./build.sh`); page count grew from 146 → 147 over the course of the session (expected — more break markers force more pagination).
- Detection script + context-dump helper used this session live in `/tmp/claude-1000/.../scratchpad/find_orphans6.py` and `context_dump.py` (session-scratch, not committed) — re-derive similarly if resuming this kind of sweep later: `pdftotext -bbox-layout combined-monsters.pdf out.html`, bucket by `(page, side)`, check heading→Source→stat-block co-location, then **always visually confirm via `pdftoppm`** before editing.

Follow-up update on `2026-07-22`:

- Added six AD&D 1E conversions to `## Appendix A: Legendary Creatures` in `combined-monsters.md`: `Juiblex`, `Orcus`, `Yeenoghu` (demon lords), `Asmodeus`, `Baalzebul`, `Dispater` (arch-devils), and `Tiamat`/`Bahamut` (Chromatic/Platinum Dragon).
- Worked out a repeatable AD&D→B/X stat conversion formula, sourced from `D&D Rules Cyclopedia` Appendix 2 ("AD&D Game Conversions", p. 291–294) plus the already-published `Demogorgon` entry as precedent:
  - **AC** carries over unchanged (same descending scale in both systems).
  - **Hit Dice**: use the AD&D HD number directly when one is given (e.g. `Tiamat: 16 (128 hp)` → HD 16, `Bahamut: 21 (168 hp)` → HD 21). When AD&D only lists flat hit points with no dice count (true for named demon lords/arch-devils), divide hp by 4.5 (B/X's d8 average) and round to the nearest whole number.
  - `Demogorgon`'s previously-published HD was recomputed from 20 → 44 under the hp/4.5 rule for consistency with the newly added demon lords, per explicit user direction.
  - **Move**: AD&D inches × 10 = B/X feet/turn, parenthetical encounter rate = ÷ 3. Dual ground/fly speed gets its own `Fly` row (precedent: the existing `Homunculus` entry), pushing `Treasure Type` down a row and `Alignment` onto its own row with a blank trailing cell.
  - **Save As**: `Fighter <HD>`.
  - **Morale**: 12 (max) for all these unique legendary creatures — none of them have a source AD&D Morale score to convert, so this is a judgment call, not derived from the Cyclopedia table.
  - **Alignment**: "Evil" drops from the AD&D two-axis alignment. Chaotic evil → `Chaotic` (demons). Lawful evil → `Lawful`, **not** `Chaotic` (devils, Tiamat) — this deliberately diverges from the Cyclopedia's literal "evil monsters become Chaotic" rule, in order to preserve the Law/Chaos distinction between devils and demons. Lawful good (Bahamut) → `Lawful`.
  - **Asterisks** (`***` on Hit Dice) are a judgment call reflecting how many distinct special abilities/attack forms a creature has, not part of the Cyclopedia table.
- Added matching plate illustrations for all seven new entries plus the previously-imageless `Demogorgon`, sourced from `~/dev/source/conversion/images/extracted/enhanced/` (pre-extracted, already-cleaned line art from the AD&D Monster Manual scan) into `publication/monsters/assets/` as `<creature>-plate.png`, inserted at the end of each entry's description per the existing plate-placement convention.
- Rebuilt and spot-checked `combined-monsters.html`/`.pdf` after each addition (grepped new header `id`s, `<table class="statblock">` rows, and `<img src="assets/...">` tags).
- Committed and pushed as three commits this session (demon lords, then arch-devils, then Tiamat/Bahamut).

Follow-up update on `2026-07-21` (first session in Claude Code, not Codex):

- Added `## Appendix A: Legendary Creatures` to the end of the monster book and moved `Demogorgon` into it out of the `Demons` chapter, leaving a cross-reference link in the `Demons` intro. Demogorgon's stat block and description are unchanged, only relocated.
- Split the combined multi-creature stat tables in `Demons` and `Devils` into individual `###` entries, each with its own compact stat block (the existing pipe-delimited shorthand) and description:
  - `Demons`: `Manes`, `Succubus`, `Type I Demon (Vrock)`, `Type II Demon (Hezrou)`, `Type III Demon (Glabrezu)`, `Type IV Demon (Nalfeshnee)`, `Type V Demon (Marilith)`, `Type VI Demon (Balor)` — previously bundled under one `### Demon*` heading with a wide 8-column table.
  - `Devils`: `Lemure`, `Erinyes`, `Barbed Devil`, `Bone Devil`, `Horned Devil (Malebranche)`, `Ice Devil`, `Pit Fiend` — previously bundled under one `### Devil` heading with a wide 7-column table.
  - Shared/general lore paragraphs that preceded each old combined table were kept as chapter-intro prose rather than duplicated into every new entry.
  - `::: twocolumn-pdf-begin` / `::: twocolumn-pdf-end` markers were kept in the same position relative to the surrounding prose (they're point toggles, not wrapping containers, and can span a chapter boundary — see how the `Demons`→`Devils` two-column stretch already crossed a `##` heading before this change).
- Rebuilt and spot-checked `combined-monsters.html`/`.pdf` after each change (grepped for the new header `id`s and their `<table class="statblock">` rows to confirm every stat value landed in the right cell).
- Did **not** touch legitimate single-creature variant tables (`Bear`, `Dragon`, `Giant`, etc.) — those intentionally stay as real Pandoc tables under one heading, since they represent named sub-variants of one creature rather than distinct creatures.
- Committed and pushed as two separate commits (Appendix A/Demogorgon move, then Demons split, then Devils split — three commits total across two prior turns).
- `generate_monsters.py` was re-confirmed as legacy/inactive: `build.sh` reads `combined-monsters.md` directly, and the script's `build_markdown()` only ever emitted an "Animals"-style single-chapter document, not the full book — it has not driven the current file's chapter structure for some time.

Follow-up update on `2026-06-03`:

- Added `*Category:*` metadata to every monster entry in:
  - [publication/monsters/combined-monsters.md](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.md)
- The category metadata is now kept on the same Markdown line as the source metadata for all monster entries, for example:
  - ``*Source:* `Basic`  *Category:* `Animal` ``
- Current category coverage verification:
  - `source_lines=152`
  - `all_inline=True`
  - `standalone_category_lines=0`
- Rebuilt the monster book after the metadata update:
  - [publication/monsters/combined-monsters.html](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.html)
  - [publication/monsters/combined-monsters.pdf](/home/ryandavidhartman/dev/source/b_x/publication/monsters/combined-monsters.pdf)

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

# B/X Book Builds

This repository contains the source and build scripts for two compiled B/X reference books:

- `publication/monsters/combined-monsters.md`
- `publication/spells/combined-spells.md`

The build outputs are HTML and PDF versions of each book.

## Requirements

You need these tools installed:

- `pandoc`
- `xelatex`

The build scripts also expect the local font files already included under:

- `publication/monsters/fonts/`
- `publication/spells/fonts/`

## Build The Monster Book

From the repo root:

```bash
cd publication/monsters
./build.sh
```

This produces:

- `publication/monsters/combined-monsters.html`
- `publication/monsters/combined-monsters.pdf`

Notes:

- The HTML build stays single-column.
- The PDF build uses a two-column layout for the monster descriptions.
- Some wider monster comparison tables are handled by the PDF layout filter in `publication/monsters/monster-layout.lua`.

## Build The Spell Book

From the repo root:

```bash
cd publication/spells
./build.sh
```

This produces:

- `publication/spells/combined-spells.html`
- `publication/spells/combined-spells.pdf`

Notes:

- The HTML build stays single-column.
- The PDF build switches to a two-column layout at `Spell Descriptions`.
- The PDF layout behavior is controlled by `publication/spells/spell-layout.lua`.

## Source Files

Main editable sources:

- `publication/monsters/combined-monsters.md`
- `publication/spells/combined-spells.md`

Supporting presentation/build files:

- `publication/monsters/combined-monsters.css`
- `publication/monsters/combined-monsters-header.tex`
- `publication/monsters/monster-layout.lua`
- `publication/spells/combined-spells.css`
- `publication/spells/combined-spells-header.tex`
- `publication/spells/spell-layout.lua`

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
- The monster HTML TOC includes section headings and individual monster entries.
- In the monster HTML output, the top-level TOC sections (`Animals`, `Insects`, `Monsters`, `NPCs`, `Prehistoric`) collapse their nested entry lists by default and expand when clicked.
- The PDF build can use a two-column layout for any marked monster-book section.
- Some wider monster comparison tables are handled by the PDF layout filter in `publication/monsters/monster-layout.lua`.
- The monster PDF also appends an alphabetical end index of monster entries with page numbers.
- To mark a PDF-only two-column region in the monster Markdown, place begin/end markers around the section(s) like this:
  HTML ignores these markers and remains single-column.

```md
::: twocolumn-pdf-begin
:::

## Animals
...
## Insects
...
## Monsters
...

::: twocolumn-pdf-end
:::
```

- To force a PDF-only page break from Markdown, insert:
  HTML ignores this marker.

```md
::: pagebreak-pdf
:::
```

- To force the next PDF column in the two-column section, insert:
  HTML ignores this marker, and it has no effect outside the two-column PDF body.

```md
::: columnbreak-pdf
:::
```

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
- The same `::: pagebreak-pdf` marker works here as a PDF-only page break and is ignored by the HTML build.
- `::: columnbreak-pdf` also works here to jump to the next PDF column inside the two-column section.

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

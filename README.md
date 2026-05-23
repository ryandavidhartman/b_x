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

- To center a block in both HTML and PDF, use a fenced div with the `center` class:

```md
::: center
Centered text
:::
```

- To enter a compact two-pair stat block without a Markdown header row, you can use any pipe-delimited row with exactly four non-empty cells in this form:

```md
| Armor Class: | 2         | No. Appearing: | 1-8 (1-20) |
| Hit Dice:    | 1         | Save As:       | Cleric: 1  |
| Move:        | 60' (20') | Morale:        | 8          |
| Attacks:     | 1 mace    | Treasure Type: | U          |
| Damage:      | 1-6       | Alignment:     | Any        |
```

- A trailing `:` on the label cells is optional, so `| Armor Class | 2 | No. Appearing | 1-8 (1-20) |` also works.
- This shorthand is recognized by the Lua filters and rendered as a four-column stat table in both HTML and PDF.
- A row may also omit the right-hand label/value pair if both trailing cells are blank, for example:

```md
| Armor Class | 5                 | No. Appearing | 1d6 (2d4) |
| Hit Dice    | 4                 | Save As       | Fighter 8 |
| Move        | 90' (30')         | Morale        | 11        |
| Flying      | 150' (50')        | Treasure Type | C         |
| Attacks     | 2 claws/bite/horn | Alignment     | Chaotic   |
| Damage      | 1d3x2/1d6/1d4     |               |           |
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
- The same centered-block syntax works in both outputs:

```md
::: center
Centered text
:::
```

- The same compact pipe-delimited stat-block shorthand also works here:

```md
| Armor Class: | 2         | No. Appearing: | 1-8 (1-20) |
| Hit Dice:    | 1         | Save As:       | Cleric: 1  |
| Move:        | 60' (20') | Morale:        | 8          |
| Attacks:     | 1 mace    | Treasure Type: | U          |
| Damage:      | 1-6       | Alignment:     | Any        |
```

- Label-cell trailing colons are optional here as well.
- Rows with a blank trailing pair are also supported here in the same way.

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

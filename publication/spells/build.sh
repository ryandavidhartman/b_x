#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

pandoc -f markdown+fenced_divs combined-spells.md \
  --standalone \
  --toc \
  --css combined-spells.css \
  --lua-filter spell-layout.lua \
  -o combined-spells.html

pandoc -f markdown+fenced_divs combined-spells.md \
  --toc \
  --pdf-engine=xelatex \
  -H combined-spells-header.tex \
  --lua-filter spell-layout.lua \
  -V geometry:margin=0.9in \
  -o combined-spells.pdf

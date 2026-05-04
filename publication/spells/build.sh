#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

pandoc combined-spells.md \
  --standalone \
  --toc \
  --css combined-spells.css \
  --lua-filter spell-layout.lua \
  -o combined-spells.html

pandoc combined-spells.md \
  --toc \
  --pdf-engine=xelatex \
  -H combined-spells-header.tex \
  --lua-filter spell-layout.lua \
  -V geometry:margin=0.9in \
  -o combined-spells.pdf

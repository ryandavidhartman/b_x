#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

pandoc -f markdown+fenced_divs combined-monsters.md \
  --standalone \
  --toc \
  --css combined-monsters.css \
  --lua-filter monster-layout.lua \
  -o combined-monsters.html

pandoc -f markdown+fenced_divs combined-monsters.md \
  --toc \
  --pdf-engine=xelatex \
  -H combined-monsters-header.tex \
  --lua-filter monster-layout.lua \
  -V geometry:margin=0.9in \
  -o combined-monsters.pdf

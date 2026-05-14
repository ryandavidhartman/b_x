#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

tex_output="combined-monsters.tex"
aux_files=(
  "combined-monsters.aux"
  "combined-monsters.log"
  "combined-monsters.out"
  "combined-monsters.toc"
)

pandoc -f markdown+fenced_divs combined-monsters.md \
  --standalone \
  --toc \
  --toc-depth=3 \
  --css combined-monsters.css \
  --include-in-header combined-monsters-head.html \
  --lua-filter monster-layout.lua \
  -o combined-monsters.html

pandoc -f markdown+fenced_divs combined-monsters.md \
  --standalone \
  --toc \
  --toc-depth=2 \
  -H combined-monsters-header.tex \
  --lua-filter monster-layout.lua \
  -V geometry:margin=0.9in \
  -o "$tex_output"

xelatex -interaction=nonstopmode -halt-on-error "$tex_output" >/tmp/combined-monsters-xelatex-pass1.log
xelatex -interaction=nonstopmode -halt-on-error "$tex_output" >/tmp/combined-monsters-xelatex-pass2.log

rm -f "$tex_output" "${aux_files[@]}"

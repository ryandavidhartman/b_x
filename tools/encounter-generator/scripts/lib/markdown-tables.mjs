// Shared markdown parsing engine for combined-monsters.md, used by both the build-time
// extractor (extract-appendix-data.mjs, book -> app JSON) and the author-time generator
// (generate-appendix-d-tables.mjs, Appendix C -> Appendix D tables). Kept as one module so
// the two scripts can't drift apart on how they read the same file.
//
// The parser is deliberately mechanical: it locates headings, groups contiguous pipe-table
// lines into "blocks", and serializes every cell as { raw, links }. Domain interpretation
// lives in the two calling scripts, not here.

export function slugify(text) {
  let s = text.toLowerCase();
  s = s.replace(/[`*_]/g, ""); // strip inline emphasis/code markers
  s = s.replace(/[^a-z0-9_\- ]+/g, ""); // strip punctuation (commas, parens, colons, apostrophes, slashes...)
  s = s.trim().replace(/\s+/g, "-");
  return s;
}

export function buildHeadingIndex(lines) {
  const headings = [];
  const seenAnchors = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.*)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].trim();
    let anchor = slugify(text);
    const count = seenAnchors.get(anchor) ?? 0;
    seenAnchors.set(anchor, count + 1);
    if (count > 0) anchor = `${anchor}-${count}`;
    headings.push({ level, text, line: i, anchor });
  }
  return headings;
}

const LINK_RE = /\[([^\]]+)\]\(#([a-z0-9-]+)\)/gi;

function parseCell(text) {
  const links = [];
  let m;
  const re = new RegExp(LINK_RE);
  while ((m = re.exec(text))) links.push({ label: m[1], anchor: m[2] });
  return { raw: text.trim(), links };
}

function isPipeLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()));
}

function splitRow(line) {
  let s = line.trim();
  s = s.replace(/^\|/, "").replace(/\|$/, "");
  return s.split("|").map((c) => c.trim());
}

/** Bind the generic parsing engine to one file's lines/headings. Both scripts construct one
 * of these per file they read (extract-appendix-data.mjs reads combined-monsters.md once;
 * generate-appendix-d-tables.mjs reads it once too, independently, since the two scripts run
 * at different times for different purposes). */
export function makeMarkdownDoc(lines) {
  const headings = buildHeadingIndex(lines);

  function headingIndexByText(text, level, fromLine = 0) {
    return headings.findIndex((h) => h.line >= fromLine && h.text.trim() === text && (level === undefined || h.level === level));
  }

  function sectionEndLine(hIdx) {
    for (let j = hIdx + 1; j < headings.length; j++) {
      if (headings[j].level <= headings[hIdx].level) return headings[j].line;
    }
    return lines.length;
  }

  /** All contiguous pipe-table blocks between [startLine, endLine). */
  function findTableBlocks(startLine, endLine) {
    const blocks = [];
    let i = startLine;
    while (i < endLine) {
      if (isPipeLine(lines[i])) {
        const blockStart = i;
        const rows = [];
        while (i < endLine && isPipeLine(lines[i])) {
          const cells = splitRow(lines[i]);
          if (!isSeparatorRow(cells)) rows.push(cells);
          i++;
        }
        if (rows.length > 0) blocks.push({ startLine: blockStart, rows });
      } else {
        i++;
      }
    }
    return blocks;
  }

  function tableBlocksInSection(headingText, level, fromLine = 0) {
    const hIdx = headingIndexByText(headingText, level, fromLine);
    if (hIdx === -1) return { hIdx: -1, blocks: [] };
    const end = sectionEndLine(hIdx);
    return { hIdx, blocks: findTableBlocks(headings[hIdx].line + 1, end) };
  }

  /** Turn a table block into { headers, rows } where every row is keyed by header text and every
   * cell is { raw, links }. Several book tables repeat a column pair side-by-side to save space
   * (e.g. "d% | Race | d% | Race") — a second occurrence of a header is disambiguated as
   * "Race__2" so it doesn't silently overwrite the first in the row object. */
  function blockToRows(block) {
    if (block.rows.length === 0) return { headers: [], rows: [] };
    const rawHeaders = block.rows[0].map((h) => h.trim());
    const seen = new Map();
    const headers = rawHeaders.map((h) => {
      const count = seen.get(h) ?? 0;
      seen.set(h, count + 1);
      return count === 0 ? h : `${h}__${count + 1}`;
    });
    const rows = block.rows.slice(1).map((cells) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = parseCell(cells[i] ?? "");
      });
      return obj;
    });
    return { headers, rows };
  }

  /** Fetch the first table block in a section as {headers, rows}; concatenates any further blocks
   * in the same section whose headers match exactly (handles tables split across a pagebreak). */
  function firstTable(headingText, level, fromLine = 0) {
    const { blocks } = tableBlocksInSection(headingText, level, fromLine);
    if (blocks.length === 0) return { headers: [], rows: [] };
    const first = blockToRows(blocks[0]);
    for (let i = 1; i < blocks.length; i++) {
      const next = blockToRows(blocks[i]);
      if (JSON.stringify(next.headers) === JSON.stringify(first.headers)) {
        first.rows.push(...next.rows);
      }
    }
    return first;
  }

  return {
    lines,
    headings,
    headingIndexByText,
    sectionEndLine,
    isPipeLine,
    isSeparatorRow,
    splitRow,
    findTableBlocks,
    tableBlocksInSection,
    parseCell,
    blockToRows,
    firstTable,
  };
}

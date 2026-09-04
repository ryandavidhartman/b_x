#!/usr/bin/env node
// Build-time extraction: parses publication/monsters/combined-monsters.md directly into
// generated JSON under src/data/generated/. Keeps the app's data in sync with the book
// automatically instead of hand-transcribing ~3000 wilderness-table cells and ~376 monster
// stat blocks. See tools/encounter-generator's plan doc for the full design rationale.
//
// The parser is deliberately mechanical: it locates headings, groups contiguous pipe-table
// lines into "blocks", and serializes every cell as { raw, links }. Domain interpretation
// (dice notation, percentile "00"=100 normalization, monster-link resolution) lives in
// reviewable TS under src/lib and src/generators, not here.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK_PATH = path.resolve(__dirname, "../../../publication/monsters/combined-monsters.md");
const OUT_DIR = path.resolve(__dirname, "../src/data/generated");

const raw = fs.readFileSync(BOOK_PATH, "utf8");
const lines = raw.split("\n");

// ---------------------------------------------------------------------------
// Heading index + pandoc-style anchor slugs
// ---------------------------------------------------------------------------

function slugify(text) {
  let s = text.toLowerCase();
  s = s.replace(/[`*_]/g, ""); // strip inline emphasis/code markers
  s = s.replace(/[^a-z0-9_\- ]+/g, ""); // strip punctuation (commas, parens, colons, apostrophes, slashes...)
  s = s.trim().replace(/\s+/g, "-");
  return s;
}

const headings = [];
{
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
}

function headingIndexByText(text, level, fromLine = 0) {
  return headings.findIndex((h) => h.line >= fromLine && h.text.trim() === text && (level === undefined || h.level === level));
}

function sectionEndLine(hIdx) {
  for (let j = hIdx + 1; j < headings.length; j++) {
    if (headings[j].level <= headings[hIdx].level) return headings[j].line;
  }
  return lines.length;
}

// Random Encounters is not always Appendix C — Appendix C now holds the "Monster Quick
// Reference" cross-index (added 2026-09-04), which reuses several of the same heading texts
// (e.g. "#### Aquatic") for its own terrain lists. Every scoped lookup below must start searching
// from the real "Random Encounters" appendix heading, found dynamically, not a hardcoded line
// number — otherwise a search from before that point would match the cross-index's headings
// first.
const RANDOM_ENCOUNTERS_START = (() => {
  const h = headings.find((h) => h.level === 2 && h.text.endsWith("Random Encounters"));
  if (!h) throw new Error('Could not find the "Random Encounters" appendix heading (level 2).');
  return h.line;
})();

// ---------------------------------------------------------------------------
// Generic pipe-table block parser
// ---------------------------------------------------------------------------

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

const LINK_RE = /\[([^\]]+)\]\(#([a-z0-9-]+)\)/gi;

function parseCell(text) {
  const links = [];
  let m;
  const re = new RegExp(LINK_RE);
  while ((m = re.exec(text))) links.push({ label: m[1], anchor: m[2] });
  return { raw: text.trim(), links };
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

/** Fetch the first table block in a section as {headers, rows}; concatenates any further blocks in the
 * same section whose headers match exactly (handles tables split across a pagebreak). */
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

// ---------------------------------------------------------------------------
// Monster stat-block database (whole book, not just Appendix C)
// ---------------------------------------------------------------------------

function findStatBlockWindow(hIdx) {
  const end = Math.min(headings[hIdx].line + 20, headings[hIdx + 1] ? headings[hIdx + 1].line : lines.length);
  for (let i = headings[hIdx].line + 1; i < end; i++) {
    if (!isPipeLine(lines[i])) continue;
    const cells = splitRow(lines[i]);
    if (cells[0] && cells[0].trim() === "Armor Class") return i;
  }
  return -1;
}

function parseMonsterBlockAt(hIdx, acLine) {
  const sectionEnd = headings[hIdx + 1] ? headings[hIdx + 1].line : lines.length;
  // Expand outward from acLine to the full contiguous pipe-table block containing it.
  let blockStart = acLine;
  while (blockStart - 1 >= 0 && isPipeLine(lines[blockStart - 1])) blockStart--;
  let blockEnd = acLine;
  while (blockEnd + 1 < sectionEnd && isPipeLine(lines[blockEnd + 1])) blockEnd++;

  const rawRows = [];
  for (let i = blockStart; i <= blockEnd; i++) {
    const cells = splitRow(lines[i]);
    if (!isSeparatorRow(cells)) rawRows.push(cells);
  }

  const acRowIdx = rawRows.findIndex((r) => r[0] && r[0].trim() === "Armor Class");
  if (acRowIdx === -1) return [];

  if (acRowIdx === 0) {
    // Shape A: compact key/value pairs, no header row, e.g. Trader/Veteran/Ogre.
    const stats = {};
    for (const row of rawRows) {
      for (let c = 0; c + 1 < row.length; c += 2) {
        const key = row[c].trim();
        if (key) stats[key] = (row[c + 1] ?? "").trim();
      }
    }
    return [{ variant: null, stats }];
  }

  // Shape B: wide compound table, row 0 = variant names, acRowIdx.. = trait rows.
  const header = rawRows[0];
  const variantNames = header.slice(1).map((v) => v.trim());
  const variants = variantNames.map(() => ({}));
  for (let r = acRowIdx; r < rawRows.length; r++) {
    const row = rawRows[r];
    const key = (row[0] ?? "").trim();
    if (!key) continue;
    for (let c = 0; c < variantNames.length; c++) {
      if (!variantNames[c]) continue;
      variants[c][key] = (row[c + 1] ?? "").trim();
    }
  }
  return variantNames.filter((v) => v).map((name) => ({ variant: name, stats: variants[variantNames.indexOf(name)] }));
}

const monsters = {};
for (let hIdx = 0; hIdx < headings.length; hIdx++) {
  const acLine = findStatBlockWindow(hIdx);
  if (acLine === -1) continue;
  const entries = parseMonsterBlockAt(hIdx, acLine);
  if (entries.length === 0) continue;
  monsters[headings[hIdx].anchor] = { name: headings[hIdx].text, entries };
}

// ---------------------------------------------------------------------------
// Appendix C: Dungeon Random Encounters
// ---------------------------------------------------------------------------

const monsterSubtableMatrix = firstTable("Monster Sub-table Matrix (d12)", 4, RANDOM_ENCOUNTERS_START);

const dungeonLevels = {};
for (let n = 1; n <= 10; n++) {
  const table = firstTable(`Monster Level ${n}`, 4, RANDOM_ENCOUNTERS_START);
  const dragonHIdx = headingIndexByText(`Monster Level ${n} Dragon Sub-table`, 5, RANDOM_ENCOUNTERS_START);
  const dragonSubtable = dragonHIdx === -1 ? null : firstTable(`Monster Level ${n} Dragon Sub-table`, 5, RANDOM_ENCOUNTERS_START);
  dungeonLevels[n] = { table, dragonSubtable };
}

// ---------------------------------------------------------------------------
// Appendix C: NPC Parties (All Dungeon Levels) + main-body NPC Parties tables
// ---------------------------------------------------------------------------

const npcRaceMulticlass = firstTable("NPC Race and Multi-Class Chance", 4, RANDOM_ENCOUNTERS_START);
const npcAdventurerClassLevel = firstTable("NPC Adventurer Class and Level", 4, 0);
const npcAdventurerAlignment = firstTable("NPC Adventurer Alignment", 4, 0);

const rivalTables = (() => {
  const { blocks } = tableBlocksInSection("Rival Adventuring Parties", 4, 0);
  // Section contains 3 unlabeled table blocks in order: Renown (d6), Secret or Goal (d10), Epithet/Name (d12).
  const [renownBlock, secretGoalBlock, epithetNameBlock] = blocks;
  return {
    renown: renownBlock ? blockToRows(renownBlock) : { headers: [], rows: [] },
    secretOrGoal: secretGoalBlock ? blockToRows(secretGoalBlock) : { headers: [], rows: [] },
    epithetAndName: epithetNameBlock ? blockToRows(epithetNameBlock) : { headers: [], rows: [] },
  };
})();

// ---------------------------------------------------------------------------
// Appendix C: Urban Encounters
// ---------------------------------------------------------------------------

const urbanEncounters = {
  zeroLevelNpcs: firstTable("0-Level NPCs", 4, RANDOM_ENCOUNTERS_START),
  race: firstTable("Race", 5, RANDOM_ENCOUNTERS_START),
  urbanProfessions: firstTable("Urban Professions", 5, RANDOM_ENCOUNTERS_START),
  nobleProfessions: firstTable("Noble Professions", 5, RANDOM_ENCOUNTERS_START),
  redLightProfessions: firstTable("Red-Light Professions", 5, RANDOM_ENCOUNTERS_START),
  nighttimeEncounters: firstTable("Nighttime Encounters", 4, RANDOM_ENCOUNTERS_START),
  daytimeEncounters: firstTable("Daytime Encounters", 4, RANDOM_ENCOUNTERS_START),
  urbanEncounterLevel: firstTable("Urban Encounter Level", 4, RANDOM_ENCOUNTERS_START),
};

// ---------------------------------------------------------------------------
// Appendix C: Overland Hex Crawl Generation
// ---------------------------------------------------------------------------

const hexCrawl = (() => {
  const { blocks } = tableBlocksInSection("Terrain Stepping", 4, RANDOM_ENCOUNTERS_START);
  const [terrainLoopBlock, newHexBlock] = blocks;
  return {
    terrainLoop: terrainLoopBlock ? blockToRows(terrainLoopBlock) : { headers: [], rows: [] },
    newHex: newHexBlock ? blockToRows(newHexBlock) : { headers: [], rows: [] },
    pointsOfInterest: firstTable("Points of Interest", 4, RANDOM_ENCOUNTERS_START),
    cataclysm: firstTable("Cataclysm", 4, RANDOM_ENCOUNTERS_START),
  };
})();

// ---------------------------------------------------------------------------
// Appendix C: Wilderness Encounters
// ---------------------------------------------------------------------------

const wildernessEncounterLevel = firstTable("Wilderness Encounter Level", 4, RANDOM_ENCOUNTERS_START);
const becomingLost = firstTable("Becoming Lost", 4, RANDOM_ENCOUNTERS_START);
const terrainNameCrossReference = firstTable("Terrain Name Cross-Reference", 4, RANDOM_ENCOUNTERS_START);
const encounterFrequency = firstTable("Encounter Frequency", 3, RANDOM_ENCOUNTERS_START);
const encounterPurpose = firstTable("Encounter Purpose", 3, RANDOM_ENCOUNTERS_START);

const terrainCategorySummary = (() => {
  const { blocks } = tableBlocksInSection("Terrain Category Summary (d%)", 4, RANDOM_ENCOUNTERS_START);
  const [firstHalf, secondHalf] = blocks.map(blockToRows);
  // Merge on the shared "Terrain" row key.
  const rows = firstHalf.rows.map((row, i) => ({ ...row, ...(secondHalf?.rows[i] ?? {}) }));
  return { headers: [...(firstHalf?.headers ?? []), ...(secondHalf?.headers ?? []).filter((h) => h !== "Terrain")], rows };
})();

const TERRAIN_NAMES = [
  "Aquatic", "Arctic", "Desert", "Forest", "Graveyard", "Hills", "Jungle",
  "Lost World", "Marine", "Mountains", "Plains", "Rural", "Tundra", "Wetlands",
];

const terrains = {};
for (const name of TERRAIN_NAMES) {
  const { blocks } = tableBlocksInSection(name, 4, RANDOM_ENCOUNTERS_START);
  const [firstHalf, secondHalf] = blocks.map(blockToRows);
  if (!firstHalf) continue;
  const rollKey = firstHalf.headers[0]; // e.g. "1d20"
  const rows = firstHalf.rows.map((row) => {
    const rollRaw = row[rollKey]?.raw;
    const match = secondHalf?.rows.find((r) => r[secondHalf.headers[0]]?.raw === rollRaw);
    return { ...row, ...(match ?? {}) };
  });
  terrains[name] = {
    headers: [...firstHalf.headers, ...(secondHalf?.headers ?? []).filter((h) => h !== rollKey)],
    rows,
  };
}

// Dinosaur sub-table: main d8 table + every level-5 heading nested under it (d6-with-Era tables).
const dinosaurSubtable = (() => {
  const main = firstTable("Dinosaur Sub-table", 4, RANDOM_ENCOUNTERS_START);
  const hIdx = headingIndexByText("Dinosaur Sub-table", 4, RANDOM_ENCOUNTERS_START);
  const end = sectionEndLine(hIdx);
  const subTables = {};
  for (let j = hIdx + 1; j < headings.length && headings[j].line < end; j++) {
    if (headings[j].level !== 5) continue;
    subTables[headings[j].text] = firstTable(headings[j].text, 5, headings[j].line);
  }
  return { main, subTables };
})();

const castleEncounters = firstTable("Castle Encounters", 4, RANDOM_ENCOUNTERS_START);

// ---------------------------------------------------------------------------
// Write output + resolution report
// ---------------------------------------------------------------------------

fs.mkdirSync(OUT_DIR, { recursive: true });
function write(name, data) {
  fs.writeFileSync(path.join(OUT_DIR, `${name}.json`), JSON.stringify(data, null, 2) + "\n");
}

write("monsters", monsters);
write("dungeonEncounters", { matrix: monsterSubtableMatrix, levels: dungeonLevels });
write("npcParties", {
  raceMulticlass: npcRaceMulticlass,
  classAndLevel: npcAdventurerClassLevel,
  alignment: npcAdventurerAlignment,
  rival: rivalTables,
});
write("urbanEncounters", urbanEncounters);
write("hexCrawl", hexCrawl);
write("wildernessTerrain", {
  categorySummary: terrainCategorySummary,
  terrains,
  encounterLevel: wildernessEncounterLevel,
  becomingLost,
  terrainNameCrossReference,
});
write("dinosaurSubtable", dinosaurSubtable);
write("castleEncounters", castleEncounters);
write("encounterMeta", { frequency: encounterFrequency, purpose: encounterPurpose });

// ---- Resolution report: every monster-link anchor referenced anywhere in the generated
// Appendix C data, cross-checked against the monster DB, with compound-variant matching. ----

function collectLinks(node, out) {
  if (Array.isArray(node)) {
    for (const v of node) collectLinks(v, out);
  } else if (node && typeof node === "object") {
    if (Array.isArray(node.links)) {
      for (const l of node.links) out.push(l);
    } else {
      for (const v of Object.values(node)) collectLinks(v, out);
    }
  }
}

const allLinks = [];
collectLinks({ dungeonLevels, terrains, hexCrawl, dinosaurSubtable, castleEncounters, urbanEncounters }, allLinks);

// Matches the runtime resolver in src/lib/resolveMonster.ts. A label with no hint beyond the
// compound heading's own name (plain "Elemental", or "Lizards, Giant" where the heading itself
// is already "Lizards, Giant") isn't a book gap — the book is deliberately leaving the sub-type
// open, so the runtime rolls among all variants at random ("open-choice"). A label that DOES name
// a specific sub-type the book has no column for (e.g. the metallic dragons) is a real gap
// ("no-match") — falls back to the first-listed variant. Every fallback stays *visible* in the
// UI rather than silently substituted — see that module for the real logic.
function normalizeForCompare(s) {
  return s.replace(/\*+$/, "").trim().toLowerCase();
}

function matchVariant(label, headingName, entries) {
  if (normalizeForCompare(label) === normalizeForCompare(headingName)) {
    return { variantText: null, match: null, kind: "open-choice" };
  }
  const commaIdx = label.indexOf(",");
  const hintText = (commaIdx >= 0 ? label.slice(commaIdx + 1) : label).trim();
  if (!hintText) return { variantText: null, match: null, kind: "open-choice" };

  const variantText = hintText.toLowerCase();
  const match = entries.find((e) => {
    if (!e.variant) return false;
    const v = e.variant.toLowerCase();
    return v.includes(variantText) || variantText.includes(v);
  });
  return { variantText, match, kind: match ? "none" : "no-match" };
}

const seen = new Set();
const missingAnchor = [];
const variantFallback = [];
for (const { label, anchor } of allLinks) {
  const key = `${anchor}::${label}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const entry = monsters[anchor];
  if (!entry) {
    missingAnchor.push({ label, anchor });
    continue;
  }
  if (entry.entries.length === 1) continue; // simple heading, no variant ambiguity
  const { variantText, kind } = matchVariant(label, entry.name, entry.entries);
  if (kind !== "none") {
    variantFallback.push({
      label, anchor, kind, variantText,
      usedInstead: entry.entries[0].variant,
      availableVariants: entry.entries.map((e) => e.variant),
    });
  }
}

console.log(`Monster DB: ${Object.keys(monsters).length} anchors.`);
console.log(`Appendix C monster-links referenced: ${seen.size} distinct (label, anchor) pairs.`);

if (missingAnchor.length > 0) {
  console.log(`\n${missingAnchor.length} link(s) point at an anchor with NO monster heading at all`);
  console.log(`(hard gap — the runtime resolver has nothing to fall back to; needs a fix):\n`);
  for (const u of missingAnchor) console.log(`  [${u.label}](#${u.anchor})`);
} else {
  console.log("Every referenced anchor exists in the monster DB (no hard gaps).");
}

const openChoice = variantFallback.filter((u) => u.kind === "open-choice");
const noMatch = variantFallback.filter((u) => u.kind === "no-match");

if (openChoice.length > 0) {
  console.log(`\n${openChoice.length} reference(s) name no specific sub-type (book leaves it open — runtime rolls at random):\n`);
  for (const u of openChoice) {
    console.log(`  [${u.label}](#${u.anchor}) -> any of: ${u.availableVariants.join(", ")}`);
  }
}

if (noMatch.length > 0) {
  console.log(`\n${noMatch.length} reference(s) name a sub-type no column matches`);
  console.log(`(likely a real book gap — runtime defaults to the first variant, shown plainly, not silently):\n`);
  for (const u of noMatch) {
    console.log(`  [${u.label}](#${u.anchor}) "${u.variantText}" -> defaults to "${u.usedInstead}" (have: ${u.availableVariants.join(", ")})`);
  }
}

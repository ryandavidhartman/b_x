#!/usr/bin/env node
// Author-time generation: builds Appendix D's location+level encounter tables FROM Appendix C's
// terrain/dungeon-location tags and party-level buckets, so Appendix D can never hand-drift out
// of sync with Appendix C the way it did before (see the Insect Swarms fix this same session —
// a corrupted Hit Dice mis-leveled a monster and put it on the "dangerous" rows of six terrains'
// tables). See the plan doc (silly-growing-quiche.md, "Redesign Appendix D...") for full design.
//
// This is the mirror-image of extract-appendix-data.mjs: that script reads Appendix D -> JSON at
// build time; this one reads Appendix C -> Appendix D markdown at author time. They share the
// generic heading/table parsing engine (./lib/markdown-tables.mjs) so the two can't drift apart
// on how they read the same file, but this script is the only one that ever reads Appendix C.
//
// Usage: node scripts/generate-appendix-d-tables.mjs [--write] [--location=Forest]
//   --write            actually splice the generated tables into combined-monsters.md
//                       (default: dry run — print the report only, touch nothing)
//   --location=<name>  only generate/report this one location (for Phase 1's "prove it on
//                       Aquatic first" step)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeMarkdownDoc } from "./lib/markdown-tables.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOK_PATH = path.resolve(__dirname, "../../../publication/monsters/combined-monsters.md");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ONLY_LOCATION = args.find((a) => a.startsWith("--location="))?.split("=")[1] ?? null;

const raw = fs.readFileSync(BOOK_PATH, "utf8");
const lines = raw.split("\n");
const { headings, headingIndexByText, sectionEndLine } = makeMarkdownDoc(lines);

// ---------------------------------------------------------------------------
// Appendix C location: find the section boundaries we're allowed to read from.
// Appendix D reuses identical `#### {Terrain}` heading text for its own tables (the same
// collision extract-appendix-data.mjs's RANDOM_ENCOUNTERS_START floor exists to handle) — so
// every lookup below is scoped to *before* Appendix D starts, not after.
// ---------------------------------------------------------------------------

const APPENDIX_C_START = (() => {
  const h = headings.find((h) => h.level === 2 && h.text.includes("Monster Quick Reference"));
  if (!h) throw new Error('Could not find "## Appendix C: Monster Quick Reference".');
  return h.line;
})();

const APPENDIX_D_START = (() => {
  const h = headings.find((h) => h.level === 2 && h.text.endsWith("Random Encounters"));
  if (!h) throw new Error('Could not find the "Random Encounters" appendix heading (level 2).');
  return h.line;
})();

if (APPENDIX_D_START <= APPENDIX_C_START) {
  throw new Error("Expected Appendix C to precede Appendix D — heading order assumption broken.");
}

// ---------------------------------------------------------------------------
// Flat comma-list parsing (Appendix C's Section 1/2 lists are prose paragraphs of
// "[Label](#anchor)[, ...]", not pipe tables — a different shape from everything
// markdown-tables.mjs handles).
// ---------------------------------------------------------------------------

const LINK_RE = /\[([^\]]+)\]\(#([a-z0-9-]+)\)/gi;

function linksInLine(line) {
  const out = [];
  const re = new RegExp(LINK_RE);
  let m;
  while ((m = re.exec(line))) out.push({ label: m[1], anchor: m[2] });
  return out;
}

/** The first non-blank line's links directly under a `#### {headingText}` heading, scoped to
 * start searching at or after fromLine (so we land on Appendix C's occurrence, not Appendix D's
 * same-named heading later in the file). */
function flatListUnderHeading(headingText, level, fromLine) {
  const hIdx = headingIndexByText(headingText, level, fromLine);
  if (hIdx === -1) return null;
  const end = sectionEndLine(hIdx);
  for (let i = headings[hIdx].line + 1; i < end; i++) {
    if (lines[i].trim().length === 0) continue;
    return linksInLine(lines[i]);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Parse Appendix C into LOCATION_TAGS + LEVEL_OF, keyed by "label::anchor" (not anchor alone —
// one anchor like #dragon covers multiple differently-leveled variants, e.g. Dragon, Black at
// Level 7 vs Dragon, White at Level 6).
// ---------------------------------------------------------------------------

// Phase 1 groundwork: wilderness terrains + Urban + Castle only. Dungeon subtypes don't exist
// in Appendix C yet (Phase 5 of the plan adds "### Monsters by Dungeon Location" + hand-curates
// its 6 lists) — DUNGEON_LOCATION_NAMES is left empty here deliberately, not a bug.
const TERRAIN_NAMES = [
  "Aquatic", "Arctic", "Desert", "Forest", "Graveyard", "Hills", "Jungle",
  "Lost World", "Marine", "Mountains", "Plains", "Rural", "Tundra", "Wetlands",
];
const URBAN_LOCATION_NAMES = ["Urban", "Castle"];
const DUNGEON_LOCATION_NAMES = [];

const ALL_LOCATION_NAMES = [...TERRAIN_NAMES, ...URBAN_LOCATION_NAMES, ...DUNGEON_LOCATION_NAMES];

function keyOf({ label, anchor }) {
  return `${label}::${anchor}`;
}

const LOCATION_TAGS = new Map(); // locationName -> Set<key>
for (const name of ALL_LOCATION_NAMES) {
  const links = flatListUnderHeading(name, 4, APPENDIX_C_START);
  if (links === null) {
    console.warn(`WARNING: no "#### ${name}" list found under Appendix C's Monsters by Terrain.`);
    continue;
  }
  LOCATION_TAGS.set(name, new Set(links.map(keyOf)));
}

const LEVEL_OF = new Map(); // key -> 1-20
const LABEL_OF = new Map(); // key -> label (for rendering links back out)
const ANCHOR_OF = new Map(); // key -> anchor
for (let level = 1; level <= 20; level++) {
  const links = flatListUnderHeading(`Level ${level}`, 4, APPENDIX_C_START);
  if (links === null) {
    console.warn(`WARNING: no "#### Level ${level}" list found under Appendix C's Monsters by Party Level.`);
    continue;
  }
  for (const l of links) {
    const key = keyOf(l);
    LEVEL_OF.set(key, level);
    LABEL_OF.set(key, l.label);
    ANCHOR_OF.set(key, l.anchor);
  }
}

// ---------------------------------------------------------------------------
// Cross-check: every (label, anchor) tagged to a location must resolve to a level. A miss here
// means Section 1 and Section 2's link text diverged for the same monster (e.g. a rename in one
// list but not the other) — a real Appendix C consistency bug worth surfacing, not silently
// dropping the candidate.
// ---------------------------------------------------------------------------

const unresolvedTags = [];
for (const [location, keys] of LOCATION_TAGS) {
  for (const key of keys) {
    if (!LEVEL_OF.has(key)) unresolvedTags.push({ location, key });
  }
}

// ---------------------------------------------------------------------------
// Pool + weight: for a given location and party level, gather terrain-tagged candidates whose
// level falls in [partyLevel-2, partyLevel+2] (floored at 1), weighted by offset from partyLevel
// (closer-below is heaviest, tapering off, lightest 2 above) — per the user's own framing
// ("large # of level 3, many level 4, a few level 5, 1-2 level 6, 1 level 7" for a level-5 party).
// ---------------------------------------------------------------------------

// Per-offset distinct-candidate cap, taken literally from the user's own framing for a level-5
// party: "large # of level 3, many level 4, a few level 5, 1-2 level 6, 1 level 7". This does
// double duty as both the weighting mechanism (more distinct options shown below party level ->
// proportionally more likely to be the uniform-random pick) and the cell-size cap — some tag
// lists (Hills, Forest) are large enough that an uncapped 5-level window pulls in 80+ distinct
// monsters, which is unprintable. When more candidates exist than the cap at a given offset, take
// a deterministic evenly-spaced sample (alphabetical by label) so regeneration is reproducible —
// re-running the generator after an unrelated Appendix C edit shouldn't reshuffle every cell that
// wasn't actually affected.
const OFFSET_CAP = { "-2": 6, "-1": 4, "0": 3, "1": 2, "2": 1 };

function candidatesInWindow(location, partyLevel) {
  const tags = LOCATION_TAGS.get(location);
  if (!tags) return [];
  const lo = Math.max(1, partyLevel - 2);
  const hi = partyLevel + 2;
  const out = [];
  for (const key of tags) {
    const level = LEVEL_OF.get(key);
    if (level === undefined) continue; // already reported in unresolvedTags
    if (level < lo || level > hi) continue;
    out.push({ key, level, offset: level - partyLevel });
  }
  return out;
}

/** Deterministic evenly-spaced sample of `cap` items from a list already sorted for stability. */
function evenSample(list, cap) {
  if (list.length <= cap) return list;
  const step = list.length / cap;
  const picked = [];
  for (let i = 0; i < cap; i++) picked.push(list[Math.floor(i * step)]);
  return picked;
}

// When a location's window is empty, borrow from the nearest non-empty levels outside it — but
// take the nearest few *distinct* levels (up to this many entries), not just the single nearest
// level. A location whose highest tagged monster sits well below partyLevel (e.g. Rural tops out
// at Level 12) would otherwise repeat one frozen monster across every remaining high-level row,
// which reads as broken in print even though it's an honest reflection of a real Appendix C gap.
const FALLBACK_CAP = 3;

/** Build the capped candidate list for one location+level cell. Returns
 * { entries: [{key,label,anchor,level}], borrowedFromLevel: number[]|null, totalBeforeCap: number }. */
function buildCell(location, partyLevel) {
  let candidates = candidatesInWindow(location, partyLevel);
  let borrowedFromLevel = null;
  const totalBeforeCap = candidates.length;

  if (candidates.length === 0) {
    // Empty-window fallback: borrow the nearest FALLBACK_CAP distinct candidates by level-distance
    // (ties broken alphabetically for determinism), whatever levels they actually land on.
    const tags = LOCATION_TAGS.get(location) ?? new Set();
    const levelsAvailable = [...tags]
      .map((key) => ({ key, level: LEVEL_OF.get(key) }))
      .filter((c) => c.level !== undefined);
    if (levelsAvailable.length > 0) {
      levelsAvailable.sort((a, b) => {
        const d = Math.abs(a.level - partyLevel) - Math.abs(b.level - partyLevel);
        return d !== 0 ? d : LABEL_OF.get(a.key).localeCompare(LABEL_OF.get(b.key));
      });
      const picked = levelsAvailable.slice(0, FALLBACK_CAP);
      borrowedFromLevel = [...new Set(picked.map((c) => c.level))].sort((a, b) => a - b);
      candidates = picked.map((c) => ({ key: c.key, level: c.level, offset: 0 }));
    }
  }

  // Group by offset, cap each offset's distinct count, sample deterministically if over cap.
  const byOffset = new Map();
  for (const c of candidates) {
    if (!byOffset.has(c.offset)) byOffset.set(c.offset, []);
    byOffset.get(c.offset).push(c);
  }

  const entries = [];
  for (const [offset, group] of byOffset) {
    group.sort((a, b) => LABEL_OF.get(a.key).localeCompare(LABEL_OF.get(b.key)));
    const cap = borrowedFromLevel !== null ? group.length : (OFFSET_CAP[String(offset)] ?? 1);
    const sampled = evenSample(group, cap);
    for (const c of sampled) {
      entries.push({ key: c.key, label: LABEL_OF.get(c.key), anchor: ANCHOR_OF.get(c.key), level: c.level });
    }
  }
  entries.sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));

  return { entries, borrowedFromLevel, totalBeforeCap };
}

// ---------------------------------------------------------------------------
// Dry-run report: pool sizes, borrow rate, and any location with zero candidates anywhere
// (a real Appendix C tagging gap, not something this script should paper over).
// ---------------------------------------------------------------------------

const targetLocations = ONLY_LOCATION ? [ONLY_LOCATION] : ALL_LOCATION_NAMES;

console.log(`Appendix C: ${LOCATION_TAGS.size} locations tagged, ${LEVEL_OF.size} (label, anchor) -> level entries.`);
if (unresolvedTags.length > 0) {
  console.log(`\n${unresolvedTags.length} location-tagged entr(ies) have NO matching Section 2 level entry (label/anchor mismatch between Appendix C's two lists — real bug):`);
  for (const u of unresolvedTags.slice(0, 20)) console.log(`  ${u.location}: ${u.key}`);
  if (unresolvedTags.length > 20) console.log(`  ...and ${unresolvedTags.length - 20} more.`);
}

const locationRows = new Map(); // location -> rows[] (reused by both the report and --write)

for (const location of targetLocations) {
  if (!LOCATION_TAGS.has(location)) {
    console.log(`\n=== ${location}: NOT TAGGED IN APPENDIX C — skipping ===`);
    continue;
  }
  let borrowCount = 0;
  let emptyCount = 0;
  let minPool = Infinity;
  let maxPool = 0;
  let maxBeforeCap = 0;
  const rows = [];
  for (let level = 1; level <= 20; level++) {
    const { entries, borrowedFromLevel, totalBeforeCap } = buildCell(location, level);
    if (borrowedFromLevel !== null) borrowCount++;
    if (entries.length === 0) emptyCount++;
    minPool = Math.min(minPool, entries.length);
    maxPool = Math.max(maxPool, entries.length);
    maxBeforeCap = Math.max(maxBeforeCap, totalBeforeCap);
    rows.push({ level, entries, borrowedFromLevel });
  }
  locationRows.set(location, rows);
  console.log(`\n=== ${location}: cell size ${minPool}-${maxPool} (pre-cap up to ${maxBeforeCap}), ${borrowCount}/20 levels borrowed, ${emptyCount}/20 levels totally empty ===`);
  if (ONLY_LOCATION) {
    for (const r of rows) {
      const cellText = r.entries.map((e) => `[${e.label}](#${e.anchor})`).join(", ");
      const borrowNote = r.borrowedFromLevel !== null ? ` *(as Level ${r.borrowedFromLevel.join("/")})*` : "";
      console.log(`  ${r.level.toString().padStart(2)} | ${cellText}${borrowNote}`);
    }
  }
}

// ---------------------------------------------------------------------------
// --write: splice each location's new 2-column table into Appendix D, replacing whatever
// currently sits between its `#### {Location}` heading and the next same-or-higher-level
// heading. Only touches locations that already have a `#### {Location}` heading somewhere at or
// after APPENDIX_D_START — Phase 2 targets Wilderness terrains only (Urban/Castle and Dungeon
// subtypes don't have Appendix D headings to replace yet; later phases add those).
// ---------------------------------------------------------------------------

function renderLocationTableLines(rows) {
  const body = rows.map((r) => {
    const cellText = r.entries.map((e) => `[${e.label}](#${e.anchor})`).join(", ");
    const suffix = r.borrowedFromLevel !== null ? ` *(as Level ${r.borrowedFromLevel.join("/")})*` : "";
    return `| ${r.level} | ${cellText}${suffix} |`;
  });
  return ["| Level | Monster |", "|---|---|", ...body];
}

if (!WRITE) {
  console.log(`\nDry run only (no --write) — combined-monsters.md was not touched.`);
} else {
  const splices = [];
  for (const location of targetLocations) {
    const rows = locationRows.get(location);
    if (!rows) continue; // wasn't tagged in Appendix C, already warned above
    const hIdx = headingIndexByText(location, 4, APPENDIX_D_START);
    if (hIdx === -1) {
      console.warn(`WARNING: --write requested for "${location}" but no "#### ${location}" heading found in Appendix D (at/after line ${APPENDIX_D_START + 1}) — skipped.`);
      continue;
    }
    splices.push({
      location,
      startReplace: headings[hIdx].line + 1,
      endReplace: sectionEndLine(hIdx),
      newLines: ["", ...renderLocationTableLines(rows), ""],
    });
  }
  // Apply in descending line order so each splice's line numbers stay valid as later (earlier-
  // in-file) splices are applied — computed from the pristine pre-splice headings/lines above.
  splices.sort((a, b) => b.startReplace - a.startReplace);
  for (const s of splices) {
    lines.splice(s.startReplace, s.endReplace - s.startReplace, ...s.newLines);
  }
  fs.writeFileSync(BOOK_PATH, lines.join("\n"));
  console.log(`\nWrote ${splices.length} location table(s) to ${BOOK_PATH}: ${splices.map((s) => s.location).join(", ")}.`);
}

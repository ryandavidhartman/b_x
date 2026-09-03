#!/usr/bin/env node
// One-off helper (not part of the build) for the terrain-scaling audit described in
// project_bx_encounter_generator_app.md. For a given terrain, scores every cell in the 10
// "fixable" categories (everything but Dragon/Giant, which are structurally exempt — see that
// memory) by Hit Dice, and prints a ready-to-paste ascending-sorted row order for each column,
// plus a warning for any column that still can't reach threshold after sorting (needs a manual
// swap, not just a reorder) and a Dragon-column habitat-fit report.
//
// Usage: node scripts/audit-terrain.mjs <TerrainName>
import monsters from "../src/data/generated/monsters.json" with { type: "json" };
import wilderness from "../src/data/generated/wildernessTerrain.json" with { type: "json" };

const terrainName = process.argv[2];
if (!terrainName || !wilderness.terrains[terrainName]) {
  console.log("Usage: node scripts/audit-terrain.mjs <TerrainName>");
  console.log("Available:", Object.keys(wilderness.terrains).join(", "));
  process.exit(1);
}

function hdScore(anchor, label, headingName) {
  const entry = monsters[anchor];
  if (!entry) return null;
  if (entry.entries.length === 1) return parseOne(entry.entries[0].stats["Hit Dice"]);
  // hinted (label carries more than the heading's bare name) -> that variant's own HD;
  // otherwise generic/open-choice -> worst case, since that's what the app can actually roll.
  const commaIdx = label.indexOf(",");
  const hint = (commaIdx >= 0 ? label.slice(commaIdx + 1) : label).trim().toLowerCase();
  const isGeneric = label.trim().toLowerCase() === headingName.replace(/\*+$/, "").trim().toLowerCase() || !hint;
  if (!isGeneric) {
    const match = entry.entries.find((e) => e.variant && (e.variant.toLowerCase().includes(hint) || hint.includes(e.variant.toLowerCase())));
    if (match) return parseOne(match.stats["Hit Dice"]);
  }
  return Math.max(...entry.entries.map((e) => parseOne(e.stats["Hit Dice"])));
}

function parseOne(hd) {
  if (!hd || /variable/i.test(hd)) return 8;
  const m = hd.match(/(\d+)(?:-(\d+))?/);
  if (!m) return 0.25;
  return m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
}

const t = wilderness.terrains[terrainName];
// Dragon is always exempt (every color in this book is HD 6+, no weak variant exists). Giant is
// only exempt if the column is pure high-HD Giants (HD 8+) with nothing weaker to reorder in —
// some terrains substitute Ogre/Ogre Mage (HD 4-5) for some rows, and THOSE need sorting like any
// other column. Decide per-terrain by checking whether every Giant-column entry is HD 8+.
const giantAllHigh = t.rows.every((r) => {
  const link = r.Giant?.links[0];
  return link ? hdScore(link.anchor, link.label, monsters[link.anchor]?.name ?? "") >= 8 : true;
});
const FIXABLE = t.headers.slice(1).filter((h) => h !== "Dragon" && !(h === "Giant" && giantAllHigh));
if (t.headers.includes("Giant") && !giantAllHigh) {
  console.log(`NOTE: ${terrainName}'s Giant column is NOT pure high-HD Giants (has Ogre/Ogre Mage or similar) — treating it as fixable, not exempt.\n`);
}

console.log(`=== ${terrainName} — fixable columns, sorted ===\n`);
for (const cat of FIXABLE) {
  const items = t.rows.map((r) => {
    const cell = r[cat];
    const link = cell.links[0];
    const score = link ? hdScore(link.anchor, link.label, monsters[link.anchor]?.name ?? "") : 0;
    return { raw: cell.raw, score };
  });
  if (items.every((i) => i.score === 0)) continue; // no monster stats in this column at all (e.g. NPC/Human) — nothing to sort
  items.sort((a, b) => a.score - b.score);
  const low = items.slice(0, 8);
  const mid = items.slice(8, 14);
  const lowBad = low.some((i) => i.score > 5);
  const midBad = mid.some((i) => i.score > 9);
  console.log(`--- ${cat} ${lowBad || midBad ? "(STILL OVER THRESHOLD AFTER SORT — needs a swap)" : "(clean after sort)"} ---`);
  items.forEach((i, idx) => console.log(`${String(idx + 1).padStart(2)}: ${i.raw}  [HD~${i.score}]`));
  console.log();
}

console.log(`=== ${terrainName} — Dragon column habitat check ===`);
console.log("Book's own 'Where Found': White=Cold, Black=Swamp/marsh, Green=Jungle/forest, Blue=Desert/plain, Red=Mountain/hill, Gold=Anywhere\n");
const dragonCounts = {};
for (const r of t.rows) {
  const link = r.Dragon?.links[0];
  if (!link) continue;
  const color = link.label.split(",")[1]?.trim() ?? link.label;
  dragonCounts[color] = (dragonCounts[color] ?? 0) + 1;
}
console.log(dragonCounts);

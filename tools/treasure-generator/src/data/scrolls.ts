import { table } from "../lib/dice";

export type ScrollKind =
  | { kind: "spell"; caster: "Cleric" | "Magic-User"; spellCount: number }
  | { kind: "cursed" }
  | { kind: "protection"; from: string }
  | { kind: "treasure-map" };

export interface ScrollTypeEntry {
  label: string;
  scroll: ScrollKind;
}

export const SCROLL_GENERAL_TYPE = table<ScrollTypeEntry>([
  ["01-03", { label: "Cleric Spell Scroll (1 Spell)", scroll: { kind: "spell", caster: "Cleric", spellCount: 1 } }],
  ["04-06", { label: "Cleric Spell Scroll (2 Spells)", scroll: { kind: "spell", caster: "Cleric", spellCount: 2 } }],
  ["07-08", { label: "Cleric Spell Scroll (3 Spells)", scroll: { kind: "spell", caster: "Cleric", spellCount: 3 } }],
  ["09", { label: "Cleric Spell Scroll (4 Spells)", scroll: { kind: "spell", caster: "Cleric", spellCount: 4 } }],
  ["10-15", { label: "Magic-User Spell Scroll (1 Spell)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 1 } }],
  ["16-20", { label: "Magic-User Spell Scroll (2 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 2 } }],
  ["21-25", { label: "Magic-User Spell Scroll (3 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 3 } }],
  ["26-29", { label: "Magic-User Spell Scroll (4 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 4 } }],
  ["30-32", { label: "Magic-User Spell Scroll (5 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 5 } }],
  ["33-34", { label: "Magic-User Spell Scroll (6 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 6 } }],
  ["35", { label: "Magic-User Spell Scroll (7 Spells)", scroll: { kind: "spell", caster: "Magic-User", spellCount: 7 } }],
  ["36-40", { label: "Cursed Scroll", scroll: { kind: "cursed" } }],
  ["41-46", { label: "Protection from Elementals", scroll: { kind: "protection", from: "Elementals" } }],
  ["47-56", { label: "Protection from Lycanthropes", scroll: { kind: "protection", from: "Lycanthropes" } }],
  ["57-61", { label: "Protection from Magic", scroll: { kind: "protection", from: "Magic" } }],
  ["62-75", { label: "Protection from Undead", scroll: { kind: "protection", from: "Undead" } }],
  ["76-100", { label: "Treasure Map", scroll: { kind: "treasure-map" } }],
]);

export const SCROLL_SPELL_LEVEL = table<number>([
  ["01-30", 1],
  ["31-55", 2],
  ["56-75", 3],
  ["76-88", 4],
  ["89-97", 5],
  ["98-100", 6],
]);

export const TREASURE_MAP_LEADS_TO = table<string>([
  ["01-16", "1,000 to 4,000 gp value"],
  ["17-36", "5,000 to 30,000 gp value"],
  ["37-44", "6,000 to 36,000 gp value"],
  ["45-52", "5,000 to 30,000 gp value and 5-30 gems"],
  ["53-60", "1-60 gems and 2-20 pieces of jewelry"],
  ["61-72", "One magic item"],
  ["73-80", "Two magic items"],
  ["81-84", "Three magic items — no weapons"],
  ["85-88", "Three magic items and 1 potion"],
  ["89-92", "Three magic items, 1 scroll, and 1 potion"],
  ["93-96", "5,000 to 30,000 gp value and one magic item"],
  ["97-100", "5-30 gems and two magic items"],
]);

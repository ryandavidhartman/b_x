import { table } from "../lib/dice";

export interface IntelligenceEntry {
  score: number | null;
  primaryPowers: number;
  readsMagic: boolean;
  extraordinaryPowers: number;
  communication: "None" | "Empathy" | "Speech";
}

// 1d20
export const SWORD_INTELLIGENCE = table<IntelligenceEntry>([
  ["1-14", { score: null, primaryPowers: 0, readsMagic: false, extraordinaryPowers: 0, communication: "None" }],
  ["15", { score: 7, primaryPowers: 1, readsMagic: false, extraordinaryPowers: 0, communication: "Empathy" }],
  ["16", { score: 8, primaryPowers: 2, readsMagic: false, extraordinaryPowers: 0, communication: "Empathy" }],
  ["17", { score: 9, primaryPowers: 3, readsMagic: false, extraordinaryPowers: 0, communication: "Empathy" }],
  ["18", { score: 10, primaryPowers: 3, readsMagic: false, extraordinaryPowers: 0, communication: "Speech" }],
  ["19", { score: 11, primaryPowers: 3, readsMagic: true, extraordinaryPowers: 0, communication: "Speech" }],
  ["20", { score: 12, primaryPowers: 3, readsMagic: true, extraordinaryPowers: 1, communication: "Speech" }],
]);

export const SWORD_LANGUAGE_COUNT = table<number | "double">([
  ["01-50", 1],
  ["51-70", 2],
  ["71-85", 3],
  ["86-95", 4],
  ["96-99", 5],
  ["100", "double"],
]);

export const SWORD_ALIGNMENT = table<"Lawful" | "Neutral" | "Chaotic">([
  ["1-13", "Lawful"],
  ["14-18", "Neutral"],
  ["19-20", "Chaotic"],
]);

export interface SwordPower {
  name: string;
  description: string;
}

const pw = (name: string, description: string): SwordPower => ({ name, description });

/** "Roll again" / "roll twice more" entries are handled by the generator, not stored here. */
export const SWORD_PRIMARY_POWER = table<SwordPower | "extraordinary-instead" | "roll-twice-more">([
  ["01-15", pw("Detect shifting walls and rooms", "Within 10'.")],
  ["16-30", pw("Detect sloping passages", "Within 10'.")],
  ["31-40", pw("Find secret doors", "Within 10', 3x/day.")],
  ["41-50", pw("Find traps", "Within 10', 3x/day.")],
  ["51-60", pw("See invisible objects", "Invisible/hidden objects within 20'.")],
  ["61-70", pw("Detect evil (or good)", "One such intention within 20'.")],
  ["71-80", pw("Detect metal", "Any type within 60' (blocked by lead); points toward it.")],
  ["81-90", pw("Detect magic", "Any spell/item within 20', 3x/day; item glows on command.")],
  ["91-95", pw("Detect gems", "Type and number within 60' (blocked by lead); points toward them.")],
  ["96-99", "extraordinary-instead"],
  ["100", "roll-twice-more"],
]);

export const SWORD_EXTRAORDINARY_POWER = table<SwordPower | "roll-twice-more" | "roll-three-more">([
  ["01-10", pw("Clairaudience", "Hear via a creature within 60' (blocked by lead) after 1 turn concentrating.")],
  ["11-20", pw("Clairvoyance", "As Clairaudience, but sight.")],
  ["21-30", pw("ESP", "Listen to one creature's thoughts within 60' (blocked by lead) while concentrating.")],
  ["31-40", pw("Telepathy", "As ESP, plus may send thoughts; target may refuse.")],
  ["41-50", pw("Telekinesis", "Move up to 2,000 coins of weight by concentration, as the spell.")],
  ["51-59", pw("Teleportation", "As the Magic-User spell.")],
  ["60-68", pw("X-ray vision", "See through anything except gold or lead.")],
  ["69-77", pw("Illusion", "Create one phantasmal force.")],
  ["78-82", pw("Levitation", "As the spell, up to 3 turns.")],
  ["83-87", pw("Flying", "As the spell, up to 3 turns.")],
  ["88-92", pw("Healing", "Heals up to 6 hp at 1/round, once per day; duplicates add +6 hp and +6 rounds.")],
  ["93-97", pw("Extra damage", "1d10 rounds of 4x damage on a hit; each duplicate adds +1x multiplier.")],
  ["98-99", "roll-twice-more"],
  ["100", "roll-three-more"],
]);

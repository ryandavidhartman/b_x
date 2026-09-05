// Step F of "Building an Encounter": if a monster's stat block gives a Treasure Type, roll it
// on the Lair Treasure Types table (Appendix B). Stat blocks write this as one or more letters
// (Lair A-O, Individual P-V), sometimes with a flat gp bonus ("E + 5000 gp") or combined with
// another type ("U + V", used by NPC parties). This adapts that raw string into the existing
// treasure engine (copied from tools/treasure-generator — see that app for the full chain).
import { LAIR_TREASURE, INDIVIDUAL_TREASURE } from "../treasure/data/coinHoards";
import { rollLairTreasure, rollIndividualTreasure, type DragonOptions } from "../treasure/generators/hoard";
import { DEFAULT_GEN_OPTIONS, type GenOptions, type HoardResult } from "../treasure/generators/types";

const LAIR_TYPES = new Set(LAIR_TREASURE.map((r) => r.type));
const INDIVIDUAL_TYPES = new Set(INDIVIDUAL_TREASURE.map((r) => r.type));

const NIL_PATTERN = /^(nil|none|-|—)$/i;

// Some stat blocks give a different treasure type for a monster met in its lair versus met
// wandering — written as a trailing parenthetical ("P (J)", "L, M, N (Z in lair)", "V (or B)")
// or, less often, a semicolon clause ("O; C, Y in lair"). Split that out so the caller's inLair
// flag can pick the right half. A trailing "(x N)" is NOT this — that's a per-letter multiplier
// (see expandMultiplier below) and must be left alone here so the token-level parser still sees it.
const PURE_MULTIPLIER = /^[xX]\s*\d+$/;

function splitLairAlternate(raw: string): { primary: string; lairAlternate: string | null } {
  const semi = raw.match(/^(.+?)\s*;\s*(.+?)\s+in\s+lair\.?\s*$/i);
  if (semi) return { primary: semi[1].trim(), lairAlternate: semi[2].trim() };

  const paren = raw.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (paren) {
    let inner = paren[2].trim();
    if (PURE_MULTIPLIER.test(inner)) {
      // e.g. "Q(x5)" or "V (x3)" — a multiplier on the letter right before it, not a lair split.
      return { primary: raw, lairAlternate: null };
    }
    inner = inner.replace(/^or\s+/i, "").replace(/\s+in\s+lair\.?$/i, "").trim();
    return { primary: paren[1].trim(), lairAlternate: inner };
  }

  return { primary: raw, lairAlternate: null };
}

// A single comma/semicolon/plus-separated token naming one treasure-table letter, optionally
// multiplied ("Q x3", "Q(x5)", "V (x3)", "V x 3" all mean "roll Q/V three (or five) times").
const MULTIPLIER_TOKEN = /^([A-Za-z])\s*\(?\s*[xX]\s*(\d+)\s*\)?$/;

function expandMultiplier(token: string): string[] {
  const m = token.match(MULTIPLIER_TOKEN);
  if (!m) return [token];
  const [, letter, count] = m;
  return Array(parseInt(count, 10)).fill(letter.toUpperCase());
}

function mergeHoards(hoards: HoardResult[], label: string): HoardResult {
  return {
    label,
    coins: hoards.flatMap((h) => h.coins),
    gems: hoards.flatMap((h) => h.gems),
    jewelry: hoards.flatMap((h) => h.jewelry),
    magicItems: hoards.flatMap((h) => h.magicItems),
    totalCoinValueGp: hoards.reduce((s, h) => s + h.totalCoinValueGp, 0),
    totalGemValueGp: hoards.reduce((s, h) => s + h.totalGemValueGp, 0),
    totalJewelryValueGp: hoards.reduce((s, h) => s + h.totalJewelryValueGp, 0),
    notes: hoards.flatMap((h) => h.notes),
  };
}

/** Returns null when the monster's Treasure Type is Nil/None (nothing to roll).
 * `inLair` selects the parenthetical/semicolon alternate on stat blocks that give a different
 * type for a monster met at home versus met wandering (e.g. "P (J)", "O; C, Y in lair") — pass
 * true for wilderness/urban rolls (which use the book's own "lair or out in the wilderness"
 * figure) and false for dungeon rolls (a wandering encounter, never the lair). */
export function rollTreasureForType(
  treasureType: string,
  options: GenOptions = DEFAULT_GEN_OPTIONS,
  dragon?: DragonOptions,
  inLair = false,
): HoardResult | null {
  const trimmed = treasureType.trim();
  if (!trimmed || NIL_PATTERN.test(trimmed)) return null;

  const { primary, lairAlternate } = splitLairAlternate(trimmed);
  const effective = inLair && lairAlternate !== null ? lairAlternate : primary;

  // Split "E + 5000 gp" into letter tokens and an optional flat gp bonus; "U + V" splits into
  // two letter tokens with no bonus (neither side is a bare number). A token like "Q x3" or
  // "Q(x5)" expands to that many independent letter-rolls before the loop below sees it.
  const tokens = effective
    .split(/[,;+]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap(expandMultiplier);
  const letters: string[] = [];
  let bonusGp = 0;
  for (const token of tokens) {
    const gpMatch = token.match(/^(\d[\d,]*)\s*gp$/i);
    if (gpMatch) {
      bonusGp += parseInt(gpMatch[1].replace(/,/g, ""), 10);
      continue;
    }
    letters.push(token.toUpperCase());
  }

  const hoards: HoardResult[] = letters.map((letter) => {
    if (LAIR_TYPES.has(letter)) return rollLairTreasure(letter, options, dragon);
    if (INDIVIDUAL_TYPES.has(letter)) return rollIndividualTreasure(letter, options);
    return {
      label: `Unrecognized Treasure Type "${letter}"`,
      coins: [], gems: [], jewelry: [], magicItems: [],
      totalCoinValueGp: 0, totalGemValueGp: 0, totalJewelryValueGp: 0,
      notes: [`"${letter}" isn't a known Lair (A-O) or Individual (P-V) treasure type — check the source text.`],
    };
  });

  if (bonusGp > 0) {
    hoards.push({
      label: "Flat bonus",
      coins: [{ denomination: "Gold", amount: bonusGp }],
      gems: [], jewelry: [], magicItems: [],
      totalCoinValueGp: bonusGp, totalGemValueGp: 0, totalJewelryValueGp: 0,
      notes: [],
    });
  }

  if (hoards.length === 0) return null;
  return mergeHoards(hoards, `Treasure Type ${trimmed}`);
}

// Resolves a `[Label](#anchor)` reference from a table cell into the monster database entry
// it means. Most anchors have exactly one stat block (no ambiguity). "Compound" anchors (Dragon,
// Giant, Men, Elemental, Snake, Bear, Cat...) hold several named variant columns under one
// heading; this matches the label's text after its comma against each variant name
// (bidirectionally, so "Giant, Hill" matches "Hill Giant" and "Dragon, Black" matches "Black").
//
// Two different situations get lumped under "no clean match" and need different handling:
//
//  - The label names a specific sub-type the book just doesn't have a column for (e.g. Appendix
//    C references Silver/Bronze/Copper/Brass dragons but only stats White/Black/Green/Blue/Red/
//    Gold under Dragon — a real gap in the source book). `fallbackKind: "no-match"` — falls back
//    to the first-listed variant.
//  - The label is generic — it names no sub-type beyond the compound heading's own name (plain
//    "Elemental", or "Lizards, Giant" where the heading itself is already called "Lizards,
//    Giant" and the table just doesn't say which of Gecko/Draco/Horned Chameleon/Tuatara). This
//    isn't a book gap at all — the book is deliberately leaving it open (sometimes spelling out
//    "Air/Earth/Fire/Water" in prose right next to the link). `fallbackKind: "open-choice"` —
//    picks at random among all variants, since every one is an equally valid reading. Callers
//    with situational context the book doesn't encode structurally (e.g. a wilderness terrain
//    table resolver knowing it's rolling on the *Aquatic* table) can pass `preferKeyword` to bias
//    that pick toward a thematically fitting variant when one exists — see wildernessEncounter.ts
//    for why this exists: the book's "Invertebrates" column reuses plain "Beetle, Giant" (7
//    variants: Fire/Oil/Bombardier/Water/Boring/Stag/Rhinoceros) unqualified on *every* terrain
//    table, including Aquatic — a uniform random pick there was landing on Fire/Bombardier Beetle
//    for an underwater encounter, which no DM would actually roll.
//
// Neither case is ever silent: callers get `fallbackKind !== "none"` and are expected to show
// both the requested label and the variant actually used, so nothing is misrepresented as book
// fact.
import monstersData from "../data/generated/monsters.json";
import type { MonsterDb, MonsterEntry } from "../data/generated/types";
import { pick } from "./dice";

const MONSTERS = monstersData as MonsterDb;

export type FallbackKind = "none" | "open-choice" | "no-match";

export interface ResolvedMonster {
  anchor: string;
  headingName: string;
  requestedLabel: string;
  variant: string | null;
  stats: Record<string, string>;
  fallbackKind: FallbackKind;
  /** True when `fallbackKind === "open-choice"` was resolved via a caller's `preferKeyword`
   * rather than a plain random pick — the UI shouldn't call this one "random." */
  biased: boolean;
  /** Every variant name on this heading's compound table, when there is one — lets the UI show
   * "could also be: ..." for open-choice/no-match results instead of just the one picked. */
  allVariants: string[] | null;
}

// Headings sometimes carry a trailing "*"/"**" (a combat-difficulty marker, not part of the
// name) that a label referencing them never repeats — strip it before comparing.
function normalizeForCompare(s: string): string {
  return s.replace(/\*+$/, "").trim().toLowerCase();
}

// Two label conventions appear in the book: "Heading, Variant" (comma-prefixed, e.g. "Dragon,
// Black") and "Variant Heading" (fused, no comma, e.g. "Clay Golem", "Giant Badger"). Only when
// the label carries no more information than the heading's own name at all (either form reduces
// to an exact match) is there truly no hint.
function hintedVariantText(label: string, headingName: string): string | null {
  if (normalizeForCompare(label) === normalizeForCompare(headingName)) return null;
  const commaIdx = label.indexOf(",");
  const text = (commaIdx >= 0 ? label.slice(commaIdx + 1) : label).trim();
  return text ? text.toLowerCase() : null;
}

function matchEntry(
  label: string,
  headingName: string,
  entries: MonsterEntry[],
  preferKeyword?: string,
): { entry: MonsterEntry; fallbackKind: FallbackKind; biased: boolean } {
  const variantText = hintedVariantText(label, headingName);
  if (variantText === null) {
    if (preferKeyword) {
      const preferred = entries.find((e) => e.variant?.toLowerCase().includes(preferKeyword.toLowerCase()));
      if (preferred) return { entry: preferred, fallbackKind: "open-choice", biased: true };
    }
    return { entry: pick(entries), fallbackKind: "open-choice", biased: false };
  }

  const match = entries.find((e) => {
    if (!e.variant) return false;
    const v = e.variant.toLowerCase();
    return v.includes(variantText) || variantText.includes(v);
  });
  return match
    ? { entry: match, fallbackKind: "none", biased: false }
    : { entry: entries[0], fallbackKind: "no-match", biased: false };
}

export function resolveMonsterLink(label: string, anchor: string, opts?: { preferKeyword?: string }): ResolvedMonster | null {
  const heading = MONSTERS[anchor];
  if (!heading) return null;

  if (heading.entries.length === 1) {
    const [entry] = heading.entries;
    return {
      anchor,
      headingName: heading.name,
      requestedLabel: label,
      variant: entry.variant,
      stats: entry.stats,
      fallbackKind: "none",
      biased: false,
      allVariants: null,
    };
  }

  const { entry, fallbackKind, biased } = matchEntry(label, heading.name, heading.entries, opts?.preferKeyword);
  return {
    anchor,
    headingName: heading.name,
    requestedLabel: label,
    variant: entry.variant,
    stats: entry.stats,
    fallbackKind,
    biased,
    allVariants: heading.entries.map((e) => e.variant).filter((v): v is string => v !== null),
  };
}

export function getMonsterHeading(anchor: string) {
  return MONSTERS[anchor];
}

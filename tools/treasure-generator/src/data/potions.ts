import { table } from "../lib/dice";

export interface Potion {
  name: string;
  description: string;
}

const p = (name: string, description: string): Potion => ({ name, description });

export const POTIONS = table<Potion>([
  ["01-03", p("Clairaudience", "Hear sounds up to 60' away through a living creature there.")],
  ["04-06", p("Clairvoyance", "As the spell.")],
  ["07-08", p("Cold Resistance", "As resist cold.")],
  ["09-11", p("Control Animal", "Charm one normal animal by gazing at it; up to 2 more attempts if resisted.")],
  ["12-13", p("Control Dragon", "As Control Human, but affects only dragons.")],
  ["14-16", p("Control Giant", "As Control Human, but affects only giants.")],
  ["17-19", p("Control Human", "Charm any humanoid by gazing at it, as charm person; up to 2 more attempts if resisted.")],
  ["20-22", p("Control Plant", "Controls plants/plant creatures in a 10' area within 50'; largest can attack at +0 for 1d4.")],
  ["23-25", p("Control Undead", "Commands 3d6 HD of undead (save vs. Spells resists).")],
  ["26-32", p("Delusion", "Cursed: appears to be another potion; the drinker briefly believes they gained its benefit.")],
  ["33-35", p("Diminution", "Reduces drinker and gear to 1/12 height, 1/1728 weight; 90% chance to move undetected.")],
  ["36-39", p("Fire Resistance", "As resist fire.")],
  ["40-43", p("Flying", "As the fly spell.")],
  ["44-47", p("Gaseous Form", "Immune to non-magic weapons (AC 22 vs. magic); cannot attack/cast; flies at 10'.")],
  ["48-51", p("Giant Strength", "+5 to melee/thrown attack and damage; can throw stones as a stone giant.")],
  ["52-55", p("Growth", "Doubles height, x8 weight; grants Stone Giant Strength (+5 attack/damage, no rocks).")],
  ["56-59", p("Healing", "Restores 1d6+1 hp, as cure light wounds.")],
  ["60-63", p("Heroism", "Improves a Fighter's combat ability by level; other classes gain +1 attack only.")],
  ["64-68", p("Invisibility", "As the spell; may be drunk in thirds for 1d4+1 turns per dose.")],
  ["69-72", p("Invulnerability", "+2 Armor Class.")],
  ["73-76", p("Levitation", "As the levitate spell.")],
  ["77-80", p("Longevity", "Drinker becomes 1d10 years younger, permanently.")],
  ["81-84", p("Mind Reading", "As the spell.")],
  ["85-86", p("Poison", "Not a potion at all — save vs. Poison or die, even from a sip.")],
  ["87-89", p("Polymorph Self", "As the spell.")],
  ["90-97", p("Speed", "As the haste spell.")],
  ["98-100", p("Treasure (Find)", "Senses direction/distance to the largest coin hoard within 300'; no gems or magic items.")],
]);

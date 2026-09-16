import { table } from "../../lib/dice";

export interface RareItem {
  name: string;
  description: string;
}

const r = (name: string, description: string): RareItem => ({ name, description });

export const RARE_ITEMS = table<RareItem>([
  ["01-05", r("Bag of Devouring", "As a Bag of Holding at first, but anything placed inside vanishes forever 1d6+6 turns later.")],
  ["06-20", r("Bag of Holding", "Holds up to 500 lbs / 70 cu ft in extradimensional space, weighing 1/10th total. Puncturing destroys it.")],
  ["21-32", r("Boots of Traveling and Leaping", "Jump up to 10' high, 30' across; +10' to land movement rate.")],
  ["33-47", r("Broom of Flying", "Flies up to 9 hours/day, 200 lbs at 40' or 400 lbs at 30'; can travel alone and recall on command.")],
  ["48-57", r("Device of Summoning Elementals", "Roll on the Devices of Summoning Elementals table for its type.")],
  ["58-59", r("Efreeti Bottle", "Releases an efreeti on activation (1/day); roll 1d10 on first use for its disposition.")],
  ["60-64", r("Flying Carpet", "~5'x8', carries 500 lbs at 100'/round or up to 1,000 lbs at 50'/round; can hover.")],
  ["65-81", r("Gauntlets of Ogre Power", "Grant a Strength bonus of +4 (replacing the wearer's own); both must be worn.")],
  ["82-86", r("Girdle of Giant Strength", "Grants a Strength bonus of +5 and the ability to throw stones as a stone giant.")],
  ["87-88", r("Mirror of Imprisonment", "Draws viewers who fail a save vs. Spells into one of 20 cells; breaking the mirror frees everyone.")],
  ["89-100", r("Rope of Climbing", "50' rope, animates on command word, moves like a snake at 10'/round, ties itself to an anchor.")],
]);

export const DEVICES_OF_SUMMONING_ELEMENTALS = table<RareItem>([
  ["1", r("Bowl of Summoning Water Elementals", "Fill with a quart of fresh water and speak the rim's command words (1 round) to summon and control a water elemental.")],
  ["2", r("Brazier of Summoning Fire Elementals", "Build a fire in it and speak the rim's command words (1 round) to summon and control a fire elemental.")],
  ["3", r("Censer of Summoning Air Elementals", "Light incense inside, cover it, and speak the lid's command words (1 round) to summon and control an air elemental.")],
  ["4", r("Stone of Summoning Earth Elementals", "Hold it and speak the command words on its smoothest face (1 round) to summon and control an earth elemental.")],
]);

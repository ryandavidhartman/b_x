// Appendix E, "Scenarios" (d10 table, adapted from the D&D Basic Rulebook).
export interface Scenario {
  d10: number;
  name: string;
  description: string;
}

export const SCENARIOS: Scenario[] = [
  {
    d10: 1,
    name: "Exploring the Unknown",
    description:
      "The party is hired to map unknown territory. The area might once have been familiar but is now overrun or destroyed; a strange tower might mysteriously appear overnight in a familiar area.",
  },
  {
    d10: 2,
    name: "Investigating a Chaotic Outpost",
    description:
      "A Chaotic invasion is in progress or about to begin. The characters must enter the enemy outpost, find out the strength and plans of the invaders, and destroy the outpost if possible.",
  },
  {
    d10: 3,
    name: "Recovering Ruins",
    description:
      "The party is usually scouting an old village before permanent settlers move in. The ruins have often been overrun by a specific kind of monster which must be killed or driven away — the ruins could be part of (or underneath) a thriving town.",
  },
  {
    d10: 4,
    name: "Destroying an Ancient Evil",
    description:
      "The evil is usually a monster or NPC whose exact type the players don't know. Sometimes it has been deeply buried and re-awakened by recent digging. This theme combines well with others — an ancient evil may need destroying before some ruins can be resettled.",
  },
  {
    d10: 5,
    name: "Visiting a Lost Shrine",
    description:
      "To remove a curse or recover a sacred item, the players must travel to a shrine that has been lost for ages. The characters usually have only a rough idea of its location, and may have to consult an oracle or seer during their visit.",
  },
  {
    d10: 6,
    name: "Fulfilling a Quest",
    description:
      'A king, other NPC, or "the gods" provide a reason for adventuring. Quite often this scenario also involves recovering a sacred object or powerful magic item.',
  },
  {
    d10: 7,
    name: "Escaping from Enemies",
    description:
      "The player characters begin this adventure as prisoners and must escape. The reason is clear and simple, especially if imprisonment is to be followed by the characters' deaths — the DM must be careful to make escape possible, though not necessarily easy.",
  },
  {
    d10: 8,
    name: "Rescuing Prisoners",
    description:
      "Valuable and important persons are held prisoner by bandits, a tribe of orcs, or an evil magic-user. The party sets out to rescue them because they've been hired to (for an expected reward), for a debt of honor, or for some other reason. Sometimes the player characters are only hired to guard an individual negotiating the ransom.",
  },
  {
    d10: 9,
    name: "Using a Magic Portal",
    description:
      "A magic portal is a device that magically sends creatures from one place to another — usually a door into another dimension or world, and thus easily the point of an invasion from one of these worlds. Portals may be known or secret, and may operate both ways or one way only (teleporting into but not out of an area).",
  },
  {
    d10: 10,
    name: "Finding a Lost Race",
    description:
      "The players find a once-human race that has lived underground for so long it has begun to change — its members might have developed infravision, changed color, or begun to fall back into animal ways. This scenario works well combined with Destroying an Ancient Evil, since lost races are often servants of the ancient powers, and requires extra invention by the DM since details for the lost race must be created from scratch.",
  },
];

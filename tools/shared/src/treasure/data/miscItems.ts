import { table } from "../../lib/dice";

/** Which Form-of-Item column (A-H) an effect draws its physical form from. */
export type FormLetter = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface MiscEffect {
  name: string;
  form: FormLetter;
  description: string;
}

const e = (name: string, form: FormLetter, description: string): MiscEffect => ({ name, form, description });

export const MISC_SUBTABLE_SELECT = table<1 | 2>([
  ["01-57", 1],
  ["58-100", 2],
]);

export const MISC_EFFECT_SUBTABLE_1 = table<MiscEffect>([
  ["01", e("Blasting", "G", "10'x2' cone of sound, 2d6 damage, deafens 1 turn (save vs. Death Ray halves damage, reduces deafness to 1 round). Double damage vs. structures.")],
  ["02-05", e("Blending", "F", "80% chance to move unnoticed; if detected, wearer can be attacked without penalty.")],
  ["06-13", e("Cold Resistance", "F", "Continual resist cold.")],
  ["14-17", e("Comprehension", "E", "Reads any language/magical script continually (read magic for a Magic-User wearer).")],
  ["18-22", e("Control Animal", "C", "Charms up to 6 HD of animals at will within 60'.")],
  ["23-29", e("Control Human", "C", "Casts charm person at will within 60', up to 6 HD/levels controlled at once.")],
  ["30-35", e("Control Plant", "C", "As a Potion of Control Plant, at will, within 60'.")],
  ["36-37", e("Courage", "G", "Friendly creatures within 60' gain remove fear on activation.")],
  ["38-40", e("Deception", "F", "Attacker believes wearer is 3' from true location: first strike auto-misses, later strikes at -2.")],
  ["41-52", e("Delusion", "A", "Cursed: wearer believes it's some other useful item; only remove curse breaks the illusion.")],
  ["53-55", e("Djinni Summoning", "C", "Summons a bound djinni to serve up to 1 hour/day, once per day.")],
  ["56", e("Doom", "G", "Animates up to 3d6 HD of skeletons/zombies within 60' (as animate dead), once per day, capped at 18 HD active.")],
  ["57-67", e("Fire Resistance", "F", "Continual resist fire.")],
  ["68-80", e("Invisibility", "F", "As the spell, on command; 1 full turn before it can be reactivated once dispelled.")],
  ["81-85", e("Levitation", "B", "As the spell, at will by concentration, no duration limit.")],
  ["86-95", e("Mind Reading", "C", "On-demand mind reading after 1 round of concentration, usable as often as desired.")],
  ["96-97", e("Panic", "G", "Creatures 20'-120' away must save vs. Spells or flee as cause fear.")],
  ["98-100", e("Penetrating Vision", "D", "See through wood/soil/stone/metal (not gold or lead) on command, up to 1 turn, 3x/day.")],
]);

export const MISC_EFFECT_SUBTABLE_2 = table<MiscEffect>([
  ["01-07", e("Protection +1", "F", "+1 Armor Class and saving throws while worn.")],
  ["08-10", e("Protection +2", "F", "+2 Armor Class and saving throws while worn.")],
  ["11", e("Protection +3", "F", "+3 Armor Class and saving throws while worn.")],
  ["12-14", e("Protection from Energy Drain", "F", "Absorbs energy drain, death effects, and curses; 2d6 charges, then disintegrates.")],
  ["15-20", e("Protection from Scrying", "F", "Wearer and allies within 30' immune to scrying (not mind reading).")],
  ["21-23", e("Regeneration", "C", "Heals 1 hp/round like a Troll, but only damage taken while worn, not fire/acid.")],
  ["24-29", e("Scrying", "H", "Magic-User only: remote sight, 3x/day up to 1 turn each; success by familiarity.")],
  ["30-32", e("Scrying, Superior", "H", "As Scrying, but sound is also heard.")],
  ["33-39", e("Speed", "B", "Grants haste on command, up to 10 rounds/day total.")],
  ["40-42", e("Spell Storing", "C", "Holds a fixed set of spells cast as the lowest-level caster able (min 6th).")],
  ["43-50", e("Spell Turning", "F", "Reflects up to 2d6 spells cast directly at the wearer back at the caster.")],
  ["51-69", e("Stealth", "B", "90% chance to move silently, as the Thief ability.")],
  ["70-72", e("Telekinesis", "C", "As the spell (12th level caster), usable at will while concentrating.")],
  ["73-74", e("Telepathy", "C", "3x/day, 90' mind reading for 1 turn, with ability to send thoughts back.")],
  ["75-76", e("Teleportation", "C", "Casts teleport (12th level caster), up to 3x/day.")],
  ["77-78", e("True Seeing", "D", "3x/day, true seeing for up to 1 turn.")],
  ["79-88", e("Water Walking", "B", "Walk on any liquid surface as if solid ground.")],
  ["89-99", e("Weakness", "C", "Cursed: wearer's Strength drops to 3; only remove curse lifts it.")],
  ["100", e("Wishes", "C", "Holds 1d4 wishes when found.")],
]);

// "Form of Item" — one range table per column (A-H) resolving a physical form.
export const FORM_OF_ITEM: Record<FormLetter, ReturnType<typeof table<string>>> = {
  A: table<string>([
    ["01-02", "Bell (or Chime)"],
    ["03-05", "Belt or Girdle"],
    ["06-13", "Boots"],
    ["14-15", "Bowl"],
    ["16-28", "Cloak"],
    ["29-31", "Crystal Ball or Orb"],
    ["32-33", "Drums"],
    ["34-38", "Helm"],
    ["39-43", "Horn"],
    ["44-46", "Lens"],
    ["47-49", "Mirror"],
    ["50-67", "Pendant"],
    ["68-100", "Ring"],
  ]),
  B: table<string>([
    ["01-25", "Boots"],
    ["26-50", "Pendant"],
    ["51-100", "Ring"],
  ]),
  C: table<string>([
    ["01-40", "Pendant"],
    ["41-100", "Ring"],
  ]),
  D: table<string>([
    ["01-17", "Lens"],
    ["18-21", "Mirror"],
    ["22-50", "Pendant"],
    ["51-100", "Ring"],
  ]),
  E: table<string>([
    ["01-40", "Helm"],
    ["41-80", "Pendant"],
    ["81-100", "Ring"],
  ]),
  F: table<string>([
    ["01-07", "Belt or Girdle"],
    ["08-38", "Cloak"],
    ["39-50", "Pendant"],
    ["51-100", "Ring"],
  ]),
  G: table<string>([
    ["01-17", "Bell (or Chime)"],
    ["18-50", "Drums"],
    ["51-100", "Horn"],
  ]),
  H: table<string>([
    ["01-17", "Bowl"],
    ["18-67", "Crystal Ball or Orb"],
    ["68-100", "Mirror"],
  ]),
};

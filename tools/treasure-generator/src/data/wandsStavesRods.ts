import { table } from "../lib/dice";

export interface WandStaffRod {
  name: string;
  category: "Rod" | "Staff" | "Wand";
  description: string;
  /** Charges when found in a hoard, if the item uses charges. */
  charges?: string;
}

const rod = (name: string, description: string): WandStaffRod => ({ name, category: "Rod", description });
const staff = (name: string, description: string): WandStaffRod => ({ name, category: "Staff", description, charges: "3d10" });
const wand = (name: string, description: string): WandStaffRod => ({ name, category: "Wand", description, charges: "2d10" });

export const WANDS_STAVES_RODS = table<WandStaffRod>([
  ["01-08", rod("Rod of Cancellation", "Struck against another magic item, destroys all enchantment in it. Usable once.")],
  ["09-13", staff("Snake Staff", "A walking staff +1; a Cleric may command it to become a constrictor snake instead of striking, holding a target 1d4 turns unless it saves. No charges used.")],
  ["14-17", staff("Staff of Commanding", "Casts charm person, charm monster, and grants a Potion of Control Plant effect; 1 charge per use.")],
  ["18-28", staff("Staff of Healing", "Heals 1d6+1 hp per charge (2 charges: cure disease). Cleric only.")],
  ["29-30", staff("Staff of Power", "1 charge each for lightning bolt, fireball, cone of cold, continual light, or telekinesis (6d6/6d6/6d6). Also a Walking Staff +2 / Staff of Striking. Can be broken for a retributive strike.")],
  ["31-34", staff("Staff of Striking", "Not attack-bonused but treated as +1 for what it can hit; a Cleric can spend 1-3 charges to add 1d6/2d6/3d6 damage to its next strike.")],
  ["35", staff("Staff of Wizardry", "As Staff of Power, plus invisibility, passwall, web, and conjure elementals, 1 charge each.")],
  ["36-40", wand("Wand of Cold", "30'-wide cone to 40', 6d8 damage (save vs. Magic Wands for half).")],
  ["41-45", wand("Wand of Enemy Detection", "All enemies within 60' (including hidden/invisible/unaware, all undead/constructs) glow for one round.")],
  ["46-50", wand("Wand of Fear", "As cause fear.")],
  ["51-55", wand("Wand of Fireballs", "As the spell, 6d6 damage.")],
  ["56-60", wand("Wand of Illusion", "Creates illusions as phantasmal force.")],
  ["61-65", wand("Wand of Lightning Bolts", "As the spell, 6d6 damage.")],
  ["66-73", wand("Wand of Magic Detection", "As detect magic.")],
  ["74-79", wand("Wand of Paralysis", "As hold person.")],
  ["80-84", wand("Wand of Polymorph", "Casts polymorph self or polymorph other.")],
  ["85-92", wand("Wand of Secret Door Detection", "As find traps, but reveals secret doors within 20'.")],
  ["93-100", wand("Wand of Trap Detection", "As find traps, within 20'.")],
]);

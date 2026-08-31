import { table } from "../lib/dice";

export type WeaponClass = "melee" | "missile";

export interface WeaponTypeEntry {
  name: string;
  class: WeaponClass;
  isSword: boolean;
}

const melee = (name: string, isSword = false): WeaponTypeEntry => ({ name, class: "melee", isSword });
const missile = (name: string): WeaponTypeEntry => ({ name, class: "missile", isSword: false });

export const WEAPON_TYPE = table<WeaponTypeEntry>([
  ["01-02", melee("Great Axe")],
  ["03-09", melee("Battle Axe")],
  ["10-11", melee("Hand Axe")],
  ["12-19", missile("Shortbow")],
  ["20-27", missile("Shortbow Arrow")],
  ["28-31", missile("Longbow")],
  ["32-35", missile("Longbow Arrow")],
  ["36-43", missile("Light Quarrel")],
  ["44-47", missile("Heavy Quarrel")],
  ["48-59", melee("Dagger")],
  ["60-65", melee("Shortsword", true)],
  ["66-79", melee("Longsword", true)],
  ["80-81", melee("Scimitar", true)],
  ["82-83", melee("Two-Handed Sword", true)],
  ["84-86", melee("Warhammer")],
  ["87-94", melee("Mace")],
  ["95", melee("Maul")],
  ["96", melee("Pole Arm")],
  ["97", missile("Sling Bullet")],
  ["98-100", melee("Spear")],
]);

export type WeaponBonusKind =
  | { kind: "bonus"; value: number }
  | { kind: "bonus-vs-enemy"; base: number; vsEnemy: number }
  | { kind: "roll-again-special-ability" }
  | { kind: "cursed"; penalty: number };

export const WEAPON_BONUS_MELEE = table<WeaponBonusKind>([
  ["01-40", { kind: "bonus", value: 1 }],
  ["41-50", { kind: "bonus", value: 2 }],
  ["51-55", { kind: "bonus", value: 3 }],
  ["56-57", { kind: "bonus", value: 4 }],
  ["58", { kind: "bonus", value: 5 }],
  ["59-75", { kind: "bonus-vs-enemy", base: 1, vsEnemy: 2 }],
  ["76-85", { kind: "bonus-vs-enemy", base: 1, vsEnemy: 3 }],
  ["86-95", { kind: "roll-again-special-ability" }],
  ["96-98", { kind: "cursed", penalty: 1 }],
  ["99-100", { kind: "cursed", penalty: 2 }],
]);

export const WEAPON_BONUS_MISSILE = table<WeaponBonusKind>([
  ["01-46", { kind: "bonus", value: 1 }],
  ["47-58", { kind: "bonus", value: 2 }],
  ["59-64", { kind: "bonus", value: 3 }],
  ["65-82", { kind: "bonus-vs-enemy", base: 1, vsEnemy: 2 }],
  ["83-94", { kind: "bonus-vs-enemy", base: 1, vsEnemy: 3 }],
  ["95-98", { kind: "cursed", penalty: 1 }],
  ["99-100", { kind: "cursed", penalty: 2 }],
]);

export const SPECIAL_ENEMY = table<string>([
  ["1", "Dragons"],
  ["2", "Enchanted"],
  ["3", "Lycanthropes"],
  ["4", "Regenerators"],
  ["5", "Spell Users"],
  ["6", "Undead"],
]);

export interface SpecialAbility {
  name: string;
  description: string;
}

export const SPECIAL_ABILITY = table<SpecialAbility>([
  ["01-09", { name: "Casts Light on Command", description: "Glows with a light spell's radius while drawn; sheathing or a command word ends it. Usable at will." }],
  ["10-11", { name: "Charm Person", description: "Casts charm person once per day by brandishing the weapon and speaking a command word." }],
  ["12", { name: "Drains Energy", description: "Drains one life energy level on a hit; loses this power after draining 2d4 levels total." }],
  ["13-16", { name: "Flames on Command", description: "Sheathes itself in fire on command (+1 vs. trolls, treants, and similar); deals fire damage and sheds light like a torch until commanded off." }],
  ["17-19", { name: "Locate Objects", description: "Casts locate object once per day, as an 8th level Magic-User." }],
  ["20", { name: "Wishes", description: "Grants 1d4 wishes; loses this power once spent (other bonuses/powers remain)." }],
]);

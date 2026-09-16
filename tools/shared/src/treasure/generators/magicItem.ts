import { rollSpec, rollTable } from "../../lib/dice";
import {
  MAGIC_ITEM_TYPE_ANY,
  MAGIC_ITEM_TYPE_ANY_EXC_WEAPONS,
  MAGIC_ITEM_TYPE_WEAPON_OR_ARMOR,
  type MagicItemCategory,
} from "../data/magicItemType";
import { ARMOR_BONUS, ARMOR_TYPE } from "../data/armor";
import { POTIONS } from "../data/potions";
import { SCROLL_GENERAL_TYPE, SCROLL_SPELL_LEVEL, TREASURE_MAP_LEADS_TO } from "../data/scrolls";
import { WANDS_STAVES_RODS } from "../data/wandsStavesRods";
import { FORM_OF_ITEM, MISC_EFFECT_SUBTABLE_1, MISC_EFFECT_SUBTABLE_2, MISC_SUBTABLE_SELECT } from "../data/miscItems";
import { DEVICES_OF_SUMMONING_ELEMENTALS, RARE_ITEMS } from "../data/rareItems";
import { SPECIAL_ABILITY, SPECIAL_ENEMY, WEAPON_BONUS_MELEE, WEAPON_BONUS_MISSILE, WEAPON_TYPE } from "../data/weapons";
import { rollIntelligentSword } from "./intelligentSword";
import { DEFAULT_GEN_OPTIONS, type GenOptions, type RolledMagicItem } from "./types";

export type MagicItemColumn = "any" | "weaponOrArmor" | "anyExcWeapons";

function rollCategory(column: MagicItemColumn): MagicItemCategory {
  if (column === "weaponOrArmor") return rollTable(MAGIC_ITEM_TYPE_WEAPON_OR_ARMOR);
  if (column === "anyExcWeapons") return rollTable(MAGIC_ITEM_TYPE_ANY_EXC_WEAPONS);
  return rollTable(MAGIC_ITEM_TYPE_ANY);
}

function weaponBonusText(melee: boolean): { suffix: string; details: string[] } {
  const roll = rollTable(melee ? WEAPON_BONUS_MELEE : WEAPON_BONUS_MISSILE);
  if (roll.kind === "bonus") return { suffix: `+${roll.value}`, details: [] };
  if (roll.kind === "cursed") return { suffix: `Cursed, -${roll.penalty}`, details: [] };
  if (roll.kind === "bonus-vs-enemy") {
    const enemy = rollTable(SPECIAL_ENEMY, 6);
    return { suffix: `+${roll.base}, +${roll.vsEnemy} vs. ${enemy}`, details: [] };
  }
  // roll-again-special-ability
  const again = weaponBonusText(melee);
  const ability = rollTable(SPECIAL_ABILITY, 20);
  return {
    suffix: again.suffix,
    details: [...again.details, `Special ability: ${ability.name} — ${ability.description}`],
  };
}

function rollWeapon(options: GenOptions): RolledMagicItem {
  const type = rollTable(WEAPON_TYPE);
  const { suffix, details } = weaponBonusText(type.class === "melee");
  const name = `${type.name} ${suffix}`;

  if (type.isSword && options.checkIntelligentSwords) {
    const sword = rollIntelligentSword();
    if (sword.isIntelligent) {
      details.push("Intelligent sword:");
      if (sword.hasSpecialPurpose) {
        details.push(`Special Purpose — ${sword.specialPurpose}`);
        details.push("Intelligence 12, Ego 12, Speech, Reads Magic.");
      } else {
        details.push(
          `Intelligence ${sword.intelligence}, Ego ${sword.ego}, communicates by ${sword.communication}` +
            (sword.readsMagic ? ", reads magic" : "") +
            (typeof sword.languages === "number" ? `, knows ${sword.languages} language(s)` : "") +
            "."
        );
      }
      details.push(`Alignment: ${sword.alignment}.`);
      sword.primaryPowers.forEach((p) => details.push(`Primary power — ${p}`));
      sword.extraordinaryPowers.forEach((p) => details.push(`Extraordinary power — ${p}`));
    }
  }

  return { category: "Weapon", name, details };
}

function rollArmor(): RolledMagicItem {
  const type = rollTable(ARMOR_TYPE);
  const bonus = rollTable(ARMOR_BONUS);
  if (bonus.kind === "bonus") return { category: "Armor", name: `${type} +${bonus.value}`, details: [] };
  if (bonus.kind === "cursed") return { category: "Armor", name: `${type}, Cursed`, details: ["Reduces AC by the rolled penalty (reverse a rolled bonus)."] };
  return { category: "Armor", name: `${type}, Cursed (AC 11)`, details: ["Wearer is always AC 11 regardless of armor type, though Dex/shield bonuses still apply. Appears to be +1 when tested."] };
}

function rollPotion(): RolledMagicItem {
  const potion = rollTable(POTIONS);
  return { category: "Potion", name: `Potion of ${potion.name}`, details: [potion.description] };
}

function rollScroll(): RolledMagicItem {
  const entry = rollTable(SCROLL_GENERAL_TYPE);
  const { scroll } = entry;
  if (scroll.kind === "spell") {
    const levels = Array.from({ length: scroll.spellCount }, () => rollTable(SCROLL_SPELL_LEVEL));
    return {
      category: "Scroll",
      name: `${scroll.caster} Spell Scroll (${scroll.spellCount} spell${scroll.spellCount > 1 ? "s" : ""})`,
      details: [`Spell levels: ${levels.join(", ")} (DM or player selects the specific spells).`],
    };
  }
  if (scroll.kind === "cursed") {
    return { category: "Scroll", name: "Cursed Scroll", details: ["Curses whoever reads it, even a glance; save vs. Spells is usual."] };
  }
  if (scroll.kind === "protection") {
    return { category: "Scroll", name: `Protection from ${scroll.from} Scroll`, details: ["Creates a 10' radius circle the warded creature type cannot enter, 2 turns (1d4 turns for Magic)."] };
  }
  const leadsTo = rollTable(TREASURE_MAP_LEADS_TO);
  return { category: "Scroll", name: "Treasure Map", details: [`Leads to: ${leadsTo}`] };
}

function rollWandStaffRod(): RolledMagicItem {
  const item = rollTable(WANDS_STAVES_RODS);
  const details = [item.description];
  if (item.charges) details.push(`Charges remaining: ${rollSpec(item.charges)}`);
  return { category: "Wand, Staff, or Rod", name: item.name, details };
}

function rollMiscItem(): RolledMagicItem {
  const sub = rollTable(MISC_SUBTABLE_SELECT);
  const effect = rollTable(sub === 1 ? MISC_EFFECT_SUBTABLE_1 : MISC_EFFECT_SUBTABLE_2);
  const form = rollTable(FORM_OF_ITEM[effect.form]);
  return { category: "Miscellaneous Item", name: `${form} of ${effect.name}`, details: [effect.description] };
}

function rollRareItem(): RolledMagicItem {
  const item = rollTable(RARE_ITEMS);
  if (item.name === "Device of Summoning Elementals") {
    const device = rollTable(DEVICES_OF_SUMMONING_ELEMENTALS, 4);
    return { category: "Rare Item", name: device.name, details: [device.description] };
  }
  return { category: "Rare Item", name: item.name, details: [item.description] };
}

export function rollMagicItem(column: MagicItemColumn, options: GenOptions = DEFAULT_GEN_OPTIONS): RolledMagicItem {
  const category = rollCategory(column);
  switch (category) {
    case "Weapon":
      return rollWeapon(options);
    case "Armor":
      return rollArmor();
    case "Potion":
      return rollPotion();
    case "Scroll":
      return rollScroll();
    case "Wand, Staff, or Rod":
      return rollWandStaffRod();
    case "Miscellaneous Item":
      return rollMiscItem();
    case "Rare Item":
      return rollRareItem();
  }
}

export function rollForcedPotion(): RolledMagicItem {
  return rollPotion();
}

export function rollForcedScroll(): RolledMagicItem {
  return rollScroll();
}

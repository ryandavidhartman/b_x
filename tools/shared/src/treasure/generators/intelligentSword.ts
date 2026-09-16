import { rollDie, rollTable } from "../../lib/dice";
import {
  SWORD_ALIGNMENT,
  SWORD_EXTRAORDINARY_POWER,
  SWORD_INTELLIGENCE,
  SWORD_LANGUAGE_COUNT,
  SWORD_PRIMARY_POWER,
} from "../data/intelligentSwords";

const SPECIAL_PURPOSES = [
  "Slay Magic-Users (including Elves)",
  "Slay Clerics",
  "Slay Fighters (including Dwarves and Halflings)",
  "Slay a specific monster type (DM's choice)",
  "Defeat Law (or Defeat Chaos, if the sword is itself Lawful)",
  "Defeat Chaos (or Defeat Law, if the sword is itself Chaotic)",
];

export interface IntelligentSwordResult {
  isIntelligent: boolean;
  hasSpecialPurpose: boolean;
  specialPurpose?: string;
  intelligence?: number;
  ego?: number;
  alignment?: "Lawful" | "Neutral" | "Chaotic";
  communication?: "Empathy" | "Speech";
  languages?: number | "unknown";
  readsMagic?: boolean;
  primaryPowers: string[];
  extraordinaryPowers: string[];
}

function rollExtraordinaryPower(): string[] {
  const result = rollTable(SWORD_EXTRAORDINARY_POWER);
  if (result === "roll-twice-more") {
    return [...rollExtraordinaryPower(), ...rollExtraordinaryPower()];
  }
  if (result === "roll-three-more") {
    return [...rollExtraordinaryPower(), ...rollExtraordinaryPower(), ...rollExtraordinaryPower()];
  }
  return [`${result.name} — ${result.description}`];
}

function rollLanguageCount(): number {
  const roll = rollTable(SWORD_LANGUAGE_COUNT);
  return roll === "double" ? rollLanguageCount() + rollLanguageCount() : roll;
}

function rollPrimaryPower(): { primary: string[]; extraordinary: string[] } {
  const result = rollTable(SWORD_PRIMARY_POWER);
  if (result === "roll-twice-more") {
    const a = rollPrimaryPower();
    const b = rollPrimaryPower();
    return { primary: [...a.primary, ...b.primary], extraordinary: [...a.extraordinary, ...b.extraordinary] };
  }
  if (result === "extraordinary-instead") {
    return { primary: [], extraordinary: rollExtraordinaryPower() };
  }
  return { primary: [`${result.name} — ${result.description}`], extraordinary: [] };
}

export function rollIntelligentSword(): IntelligentSwordResult {
  // Special-purpose swords (1-in-20) skip the normal Intelligence roll entirely.
  if (rollDie(20) === 20) {
    const alignment = rollTable(SWORD_ALIGNMENT, 20);
    return {
      isIntelligent: true,
      hasSpecialPurpose: true,
      specialPurpose: SPECIAL_PURPOSES[rollDie(6) - 1],
      intelligence: 12,
      ego: 12,
      alignment,
      communication: "Speech",
      languages: "unknown",
      readsMagic: true,
      primaryPowers: [],
      extraordinaryPowers: [],
    };
  }

  const intel = rollTable(SWORD_INTELLIGENCE, 20);
  if (intel.score === null) {
    return { isIntelligent: false, hasSpecialPurpose: false, primaryPowers: [], extraordinaryPowers: [] };
  }

  const languages = rollLanguageCount();

  const primaryPowers: string[] = [];
  const extraordinaryPowers: string[] = [];
  for (let i = 0; i < intel.primaryPowers; i++) {
    const { primary, extraordinary } = rollPrimaryPower();
    primaryPowers.push(...primary);
    extraordinaryPowers.push(...extraordinary);
  }
  for (let i = 0; i < intel.extraordinaryPowers; i++) {
    extraordinaryPowers.push(...rollExtraordinaryPower());
  }

  return {
    isIntelligent: true,
    hasSpecialPurpose: false,
    intelligence: intel.score,
    ego: rollDie(12),
    alignment: rollTable(SWORD_ALIGNMENT, 20),
    communication: intel.communication as "Empathy" | "Speech",
    languages,
    readsMagic: intel.readsMagic,
    primaryPowers,
    extraordinaryPowers,
  };
}

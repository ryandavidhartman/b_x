// Turns one generated area's rolled facts (monster, treasure, dressing, trap) into a paragraph a
// DM can read at the table, instead of the labeled dice-trace fields the rest of this app still
// shows for transparency (see Summaries.tsx / the "Show roll transcript" link on every node).
// This is templated sentence assembly — a bank of phrasings per Table 8 result type, filled with
// whatever this specific roll actually produced — not content invented beyond those rolls. It
// cannot and doesn't try to produce the causal, hand-authored plotting of a real published module
// (a guardian that investigates noise from one specific other room, a trap built around a
// specific twist); that's genuine authorship, not something a dice procedure can generate. What
// it produces is one honest, readable rendering of exactly what the tables rolled.
//
// Bold/italic markup uses the same `**bold**`/`*italic*` convention `InlineMarkdown` renders —
// see components/InlineMarkdown.tsx.
import { pick } from "@shared/index";
import type { HoardResult } from "@shared/index";
import type { DungeonNode } from "./randomDungeon";
import type { LocationCategory } from "../lib/locationInput";

// The room-by-room procedure is identical for every location category (per the broadened Random
// Dungeon Generation scope) — only the words change for a Wilderness site, where "room"/"door"
// read oddly for an outdoor clearing joined by trails. Dungeon/Urban/Castle keep the plain terms;
// nothing here changes the underlying NodeKind values, only what gets printed.
function areaNoun(category: LocationCategory, kind: "room" | "chamber"): string {
  if (category !== "wilderness") return kind;
  return kind === "chamber" ? "camp feature" : "clearing";
}

function countedMonsterPhrase(node: DungeonNode): string | null {
  const encounter = node.encounter;
  if (!encounter?.monster) return null;
  const { monster } = encounter;
  const displayName = monster.variant && monster.variant !== monster.headingName ? `${monster.headingName}, ${monster.variant}` : monster.headingName;
  const count = encounter.count;
  return count !== null && count > 1 ? `**${count} ${displayName}**` : `**${displayName}**`;
}

const MONSTER_VERBS = ["lurks here", "waits in the dark", "has made this its lair", "stirs at the sound of footsteps", "claims this space"];
const MONSTER_VERBS_PLURAL = ["lurk here", "wait in the dark", "have made this their lair", "stir at the sound of footsteps", "claim this space"];

function monsterSentence(node: DungeonNode): string | null {
  const phrase = countedMonsterPhrase(node);
  if (!phrase) return null;
  const plural = (node.encounter?.count ?? 1) > 1;
  const verb = pick(plural ? MONSTER_VERBS_PLURAL : MONSTER_VERBS);
  return `${phrase} ${verb}.`;
}

function treasurePhrase(treasure: HoardResult): string | null {
  const totalGp = treasure.totalCoinValueGp + treasure.totalGemValueGp + treasure.totalJewelryValueGp;
  const parts: string[] = [];
  if (treasure.magicItems.length > 0) {
    parts.push(treasure.magicItems.map((m) => `*${m.name}*`).join(" and "));
  }
  if (totalGp > 0) {
    const valuables: string[] = [];
    if (treasure.coins.length > 0) valuables.push("coins");
    if (treasure.gems.length > 0) valuables.push("gems");
    if (treasure.jewelry.length > 0) valuables.push("jewelry");
    parts.push(`${valuables.join(" and ") || "valuables"} (${Math.round(totalGp).toLocaleString()} gp)`);
  }
  if (parts.length === 0) return null;
  return parts.join(" and ");
}

const TREASURE_ONLY_TEMPLATES = ["Tucked away here: %s.", "Someone left %s behind.", "A find awaits: %s."];
const GUARDED_TREASURE_TEMPLATES = ["guards %s.", "has been sitting on %s.", "won't give up %s without a fight."];

function areaShapeSentence(node: DungeonNode, category: LocationCategory): string {
  if (node.kind === "cave" || node.kind === "cavern") {
    return node.shapeLabel && /cavern/i.test(node.shapeLabel) ? `A vast cavern opens up here (roughly ${node.widthFt} by ${node.lengthFt} ft).` : `The passage opens into a rough cave (roughly ${node.widthFt} by ${node.lengthFt} ft).`;
  }
  const noun = areaNoun(category, node.kind === "chamber" ? "chamber" : "room");
  if (node.shapeLabel && node.shapeLabel !== "Room" && node.shapeLabel !== "Chamber") {
    return `A ${node.shapeLabel.toLowerCase()} ${noun}, ${node.widthFt} by ${node.lengthFt} ft.`;
  }
  return `A ${node.widthFt}-by-${node.lengthFt} ${noun}.`;
}

function containerBullet(node: DungeonNode): string | null {
  if (!node.container) return null;
  let s = `**Treasure.** Stored in ${node.container === "None, loose" ? "no container — it's simply loose" : `${/^[aeiou]/i.test(node.container) ? "an" : "a"} ${node.container.toLowerCase()}`}`;
  if (node.guard) s += `, guarded by a ward: ${node.guard.toLowerCase()}`;
  if (node.hidden) s += `, hidden ${node.hidden.toLowerCase()}`;
  return `${s}.`;
}

function dressingSentence(node: DungeonNode, category: LocationCategory): string | null {
  if (!node.dressing || node.dressing.length === 0) return null;
  const phrases = node.dressing.map((d) => d.result.toLowerCase());
  return `${areaShapeSentence(node, category)} ${phrases.length === 1 ? phrases[0] : `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`} — nothing here of any mechanical note.`;
}

function trapOrHazardBullet(node: DungeonNode): string | null {
  if (node.trap) {
    return `**Trap (${node.trapSeverity}).** ${node.trap.replace(/\s*\(d%=\d+\)$/, "")}.`;
  }
  if (node.hazard) {
    return `**Environmental Hazard (${node.trapSeverity}).** ${node.hazard.replace(/\s*\(d12=\d+\)/g, "")}.`;
  }
  return null;
}

function connectionBullet(node: DungeonNode): string | null {
  if (node.connectionToParent === "secretDoor") return "**Secret Door.** The way in is concealed.";
  if (node.connectionToParent === "oneWayDoor") return "**One-Way Door.** This door won't open from the other side.";
  return null;
}

export interface AreaNarration {
  paragraph: string;
  bullets: string[];
}

/** A short heading for the key entry — deliberately *not* the full "(Room, 40 x 40 ft)" label
 * `node.label` carries, since `areaShapeSentence` already states the footprint in the paragraph's
 * first sentence; repeating it in the heading too read as redundant in testing. */
export function areaTitle(node: DungeonNode, category: LocationCategory): string {
  if (node.kind === "stairs") return "Stairs";
  if (node.kind === "cave" || node.kind === "cavern") return "Cave / Cavern";
  if (node.shapeLabel === "Room" || node.shapeLabel === "Chamber") {
    return areaNoun(category, node.kind === "chamber" ? "chamber" : "room").replace(/^./, (c) => c.toUpperCase());
  }
  return node.shapeLabel ?? node.kind;
}

export function narrateArea(node: DungeonNode, category: LocationCategory): AreaNarration {
  const bullets: string[] = [];
  const bConn = connectionBullet(node);
  if (bConn) bullets.push(bConn);

  // A standalone Table 17 "Stairs" result (a stairway found mid-corridor, not a room's Table 8
  // content) is its own zero-cell node with no rolled footprint — areaShapeSentence has nothing
  // to describe here, so it's skipped entirely rather than printing an "undefined by undefined"
  // room. A room/chamber whose *contents* happens to be Stairs (the `case "Stairs"` below) is a
  // different, sized node and keeps the normal shape sentence.
  if (node.kind === "stairs") {
    const stairsNote = node.label.replace(/^Stairs:\s*/, "");
    return { paragraph: `${stairsNote.charAt(0).toUpperCase()}${stairsNote.slice(1)}.`, bullets };
  }

  let paragraph: string;
  switch (node.contents) {
    case "Empty": {
      paragraph = dressingSentence(node, category) ?? `${areaShapeSentence(node, category)} Empty.`;
      break;
    }
    case "Monster": {
      const monster = monsterSentence(node);
      paragraph = monster ? `${areaShapeSentence(node, category)} ${monster}` : `${areaShapeSentence(node, category)} Empty.`;
      break;
    }
    case "Monster and Treasure": {
      const monster = monsterSentence(node);
      const treasure = node.treasure ? treasurePhrase(node.treasure) : null;
      if (monster && treasure) {
        const monsterName = countedMonsterPhrase(node)!;
        paragraph = `${areaShapeSentence(node, category)} ${monsterName} ${pick(GUARDED_TREASURE_TEMPLATES).replace("%s", treasure)}`;
      } else {
        paragraph = `${areaShapeSentence(node, category)} ${monster ?? ""}`.trim();
      }
      const cBullet = containerBullet(node);
      if (cBullet) bullets.push(cBullet);
      break;
    }
    case "Treasure": {
      const treasure = node.treasure ? treasurePhrase(node.treasure) : null;
      paragraph = treasure ? `${areaShapeSentence(node, category)} ${pick(TREASURE_ONLY_TEMPLATES).replace("%s", treasure)}` : `${areaShapeSentence(node, category)} Empty.`;
      const cBullet = containerBullet(node);
      if (cBullet) bullets.push(cBullet);
      break;
    }
    case "Stairs": {
      const stairsNote = node.label.split(" — Stairs: ")[1] ?? "a stairway leading elsewhere";
      paragraph = `${areaShapeSentence(node, category)} ${stairsNote}.`;
      break;
    }
    case "Trick or Trap": {
      paragraph = `${areaShapeSentence(node, category)} Something here isn't as it seems.`;
      const tb = trapOrHazardBullet(node);
      if (tb) bullets.push(tb);
      if (node.trick) bullets.push(`**Alternatively (Trick).** ${node.trick[0].toUpperCase()}${node.trick.slice(1)}.`);
      break;
    }
    default:
      paragraph = areaShapeSentence(node, category);
  }

  return { paragraph, bullets };
}

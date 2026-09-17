// The shape every Appendix D-driven monster roll in this app can return, regardless of which
// location category it came from (dungeon/wilderness/urban/castle) — used by randomDungeon.ts's
// DungeonNode.encounter and by Summaries.tsx's EncounterSummary. This app no longer has a
// standalone "Stocking a Room" tool (Appendix E's own "you already have a map" method for a
// pre-existing floor plan) — everything is generated through the unified Random Dungeon
// Generation flow now, which produces its own floor plan, so that type is all that survives here.
import type { DungeonEncounterResult, WildernessEncounterResult, UrbanMonsterEncounterResult } from "@shared/index";

export type StockingEncounter = DungeonEncounterResult | WildernessEncounterResult | UrbanMonsterEncounterResult;

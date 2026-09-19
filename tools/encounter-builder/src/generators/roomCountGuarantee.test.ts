// Regression test for a real bug: "Number of Rooms" is documented (see `injectExtraExit`'s own
// comment) as a guarantee, not a ceiling, but it could silently fall short — as low as 1-2 areas
// out of a requested 12 — in roughly 5-6% of runs, across every category (not just one). Root
// cause: once only a handful of real areas exist, the "keep going" fallback kept re-picking the
// SAME already-boxed-in node (it had no other candidate), and each attempt from an already-boxed-in
// node collides with that node's OWN earlier failed-attempt stubs, producing more stubs that box it
// in even further — a vicious cycle that burned the entire safety-ceiling node budget on hundreds of
// dead-end/secret-door/one-way-door stubs (one observed bad trial: 720 total nodes, 711 of them
// stubs, only 1 real chamber) instead of ever reaching the target. Fixed by excluding "full" nodes
// (4+ existing children, real or stub) from the candidate pool — see `pickExtensionCandidate` in
// randomDungeon.ts. This test's sample size (40 trials/case) is tuned to reliably catch a
// regression of that ~5-6% failure rate without being slow enough to matter in normal test runs.
import { describe, it, expect } from "vitest";
import { generateWholeDungeon } from "./randomDungeon";
import type { GenerateOptions } from "./randomDungeon";

const CASES: GenerateOptions[] = [
  { category: "wilderness", terrain: "Forest", partyLevel: 3, maxNodes: 12 },
  { category: "wilderness", terrain: "Mountains", partyLevel: 3, maxNodes: 12 },
  { category: "dungeon", dungeonSubtype: "Standard Dungeon", partyLevel: 3, maxNodes: 12 },
  { category: "dungeon", dungeonSubtype: "Tomb / Crypt", partyLevel: 3, maxNodes: 12 },
  { category: "dungeon", dungeonSubtype: "Sewer", partyLevel: 3, maxNodes: 12 },
  { category: "urban", partyLevel: 3, maxNodes: 12 },
];

describe("generateWholeDungeon room-count guarantee", () => {
  for (const opts of CASES) {
    const label = `${opts.category}${opts.dungeonSubtype ? `/${opts.dungeonSubtype}` : ""}${opts.terrain ? `/${opts.terrain}` : ""}`;
    it(`(${label}) hits the requested area count in every one of 40 trials`, () => {
      for (let trial = 0; trial < 40; trial++) {
        const nodes = generateWholeDungeon(opts);
        const areaCount = nodes.filter((n) => n.areaNumber !== undefined).length;
        expect(areaCount).toBe(opts.maxNodes);
      }
    });
  }
});

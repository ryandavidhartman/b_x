import { rollDie } from "@shared/index";
import { SCENARIOS, type Scenario } from "../data/scenarios";

export function rollScenario(): Scenario {
  const roll = rollDie(10);
  return SCENARIOS[roll - 1];
}

import frozen from './research/coffee-planning-scenarios-20261101.json' with {type:'json'};
import type {Scenario,DecisionReport} from './types.ts';
/** Published method outputs. Ready reads do not execute the Financial Engine. */
export const coffeeScenarios=()=>structuredClone(frozen.scenarios) as Scenario[];
export const coffeeSensitivity=()=>structuredClone(frozen.sensitivity) as DecisionReport['sensitivity'];

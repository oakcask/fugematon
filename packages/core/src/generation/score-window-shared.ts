import type { HarmonicPlan, Voice } from "../events.js";

export function scoreWindowSectionStateAt(
  tick: number,
  sectionPlans: readonly HarmonicPlan[],
): HarmonicPlan["state"] | "mixed" {
  return (
    sectionPlans.find((section) => section.startTick <= tick && tick < section.startTick + section.durationTicks)
      ?.state ?? "mixed"
  );
}

export function scoreWindowVoicePairs(voices: readonly Voice[]): [Voice, Voice][] {
  const pairs: [Voice, Voice][] = [];
  for (let leftIndex = 0; leftIndex < voices.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < voices.length; rightIndex += 1) {
      const left = voices[leftIndex];
      const right = voices[rightIndex];
      if (left !== undefined && right !== undefined) {
        pairs.push([left, right]);
      }
    }
  }
  return pairs;
}

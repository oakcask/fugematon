import { TICKS_PER_QUARTER } from "../constants.js";
import type { HarmonicPlan, KeySignature, NoteEvent, PlannedEntry, Voice } from "../events.js";
import { nearestHarmonicAnchor, rootDegreeForFunction } from "./harmony.js";
import { hasOverlap, VOICE_ENTRY_ORDER } from "./shared.js";
import { addTextureNote, repairTextureVoiceCrossings } from "./texture.js";
import type { Exposition } from "./types.js";

export function addFunctionalThinningSupport(notes: Exposition["notes"], sectionPlans: readonly HarmonicPlan[]): void {
  for (const run of findUnsupportedThinningRuns(notes, sectionPlans)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = functionalSupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    const anchor = nearestHarmonicAnchor(run.startTick, [plan]);
    const degree = anchor === undefined ? 0 : rootDegreeForFunction(anchor.function);
    addFunctionalSupportLine(notes, {
      voice: supportVoice,
      localKey: plan.targetKey,
      harmonicPlan: plan,
      rootDegree: degree,
      startTick: run.startTick,
      durationTicks: run.endTick - run.startTick,
    });
  }

  repairTextureVoiceCrossings(
    notes,
    Math.min(...sectionPlans.map((plan) => plan.startTick)),
    Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks)),
  );
}

export function addBassAnswerTailTextureSupport(
  notes: Exposition["notes"],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): void {
  for (const run of findBassAnswerTailSupportRuns(notes, subjectEntries)) {
    const plan = sectionPlanForTick(sectionPlans, run.startTick);
    const supportVoice = tailSupportVoice(notes, run);
    if (plan === undefined || supportVoice === undefined) {
      continue;
    }

    const anchor = nearestHarmonicAnchor(run.startTick, [plan]);
    addFunctionalSupportLine(notes, {
      voice: supportVoice,
      localKey: plan.targetKey,
      harmonicPlan: plan,
      rootDegree: anchor === undefined ? 0 : rootDegreeForFunction(anchor.function),
      startTick: run.startTick,
      durationTicks: run.endTick - run.startTick,
    });
  }

  repairTextureVoiceCrossings(
    notes,
    Math.min(...sectionPlans.map((plan) => plan.startTick)),
    Math.max(...sectionPlans.map((plan) => plan.startTick + plan.durationTicks)),
  );
}

function addFunctionalSupportLine(
  notes: Exposition["notes"],
  input: {
    voice: Voice;
    localKey: KeySignature;
    harmonicPlan: HarmonicPlan;
    rootDegree: number;
    startTick: number;
    durationTicks: number;
  },
): void {
  const lineDegrees = functionalSupportLineDegrees(input.voice, input.rootDegree);
  const maxNoteTicks = TICKS_PER_QUARTER;
  let elapsedTicks = 0;
  let index = 0;

  while (elapsedTicks < input.durationTicks) {
    const durationTicks = Math.min(maxNoteTicks, input.durationTicks - elapsedTicks);
    const degree = lineDegrees[index % lineDegrees.length]!;
    addTextureNote(
      notes,
      {
        voice: input.voice,
        localKey: input.localKey,
        velocity: 50,
        role: "free-counterpoint",
        harmonicPlan: input.harmonicPlan,
        metricalHarmonyIntent:
          input.voice === "bass" && degree === input.rootDegree ? "structural-root-support" : "structural-chord-tone",
      },
      degree,
      input.startTick + elapsedTicks,
      durationTicks,
    );
    elapsedTicks += durationTicks;
    index += 1;
  }
}

function functionalSupportLineDegrees(voice: Voice, rootDegree: number): readonly number[] {
  if (voice === "bass") {
    return [rootDegree, rootDegree + 2, rootDegree + 4, rootDegree + 2];
  }
  if (voice === "tenor") {
    return [rootDegree + 2, rootDegree + 4, rootDegree + 3, rootDegree + 2];
  }
  return [rootDegree + 4, rootDegree + 2, rootDegree + 5, rootDegree + 3];
}

function findUnsupportedThinningRuns(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const runs: { startTick: number; endTick: number; activeVoices: readonly Voice[] }[] = [];
  let currentRun: { startTick: number; endTick: number; activeVoices: readonly Voice[] } | undefined;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    const plan = sectionPlanForTick(sectionPlans, startTick);

    if (isUnsupportedThinningSegment({ activeVoices, startTick, plan })) {
      if (
        currentRun !== undefined &&
        currentRun.endTick === startTick &&
        currentRun.activeVoices.join(">") === activeVoices.join(">")
      ) {
        currentRun.endTick = endTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { startTick, endTick, activeVoices };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  return runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER);
}

function findBassAnswerTailSupportRuns(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): { startTick: number; endTick: number }[] {
  const firstBassAnswer = subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  if (firstBassAnswer === undefined) {
    return [];
  }

  const startTick = firstBassAnswerEnd(notes, firstBassAnswer);
  const endTick = startTick + TICKS_PER_QUARTER * 9;
  const runs: { startTick: number; endTick: number }[] = [];
  let currentRun: { startTick: number; endTick: number } | undefined;

  for (let tick = startTick; tick < endTick; tick += TICKS_PER_QUARTER / 2) {
    const segmentEndTick = Math.min(endTick, tick + TICKS_PER_QUARTER / 2);
    if (isBassOnlyFreeCounterpointSegment(notes, tick, segmentEndTick)) {
      if (currentRun?.endTick === tick) {
        currentRun.endTick = segmentEndTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { startTick: tick, endTick: segmentEndTick };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  return runs;
}

function isBassOnlyFreeCounterpointSegment(notes: readonly NoteEvent[], startTick: number, endTick: number): boolean {
  const activeNotes = notes.filter(
    (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
  const activeVoices = new Set(activeNotes.map((note) => note.voice));
  return (
    activeVoices.size === 1 &&
    activeVoices.has("bass") &&
    activeNotes.some((note) => note.voice === "bass" && note.role === "free-counterpoint")
  );
}

function firstBassAnswerEnd(notes: readonly NoteEvent[], firstBassAnswer: PlannedEntry): number {
  const answerNotes = notes.filter(
    (note) =>
      note.voice === "bass" &&
      note.role === "answer" &&
      firstBassAnswer.startTick <= note.startTick &&
      note.startTick < firstBassAnswer.startTick + TICKS_PER_QUARTER * 8,
  );
  return Math.max(firstBassAnswer.startTick, ...answerNotes.map((note) => note.startTick + note.durationTicks));
}

function isUnsupportedThinningSegment(input: {
  activeVoices: readonly Voice[];
  startTick: number;
  plan: HarmonicPlan | undefined;
}): boolean {
  const { activeVoices, startTick, plan } = input;
  return (
    plan !== undefined &&
    plan.state !== "exposition" &&
    isAbruptUpperSolo(activeVoices) &&
    sectionStartDistance(plan, startTick) > TICKS_PER_QUARTER &&
    sectionEndDistance(plan, startTick) > TICKS_PER_QUARTER &&
    !hasNearbyCadenceTarget(plan, startTick)
  );
}

function isAbruptUpperSolo(activeVoices: readonly Voice[]): boolean {
  return activeVoices.length === 1 && !activeVoices.includes("bass");
}

function sectionStartDistance(plan: HarmonicPlan, tick: number): number {
  return tick - plan.startTick;
}

function sectionEndDistance(plan: HarmonicPlan, tick: number): number {
  return plan.startTick + plan.durationTicks - tick;
}

function hasNearbyCadenceTarget(plan: HarmonicPlan, tick: number): boolean {
  return plan.anchors.some((anchor) => anchor.cadenceTarget && Math.abs(anchor.tick - tick) <= TICKS_PER_QUARTER);
}

function activeVoicesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) =>
    notes.some(
      (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    ),
  );
}

function sectionPlanForTick(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function functionalSupportVoice(
  notes: readonly NoteEvent[],
  run: { startTick: number; endTick: number },
): Voice | undefined {
  return (["bass", "tenor", "alto"] as const).find(
    (voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick),
  );
}

function tailSupportVoice(notes: readonly NoteEvent[], run: { startTick: number; endTick: number }): Voice | undefined {
  return (["soprano", "alto", "tenor"] as const).find(
    (voice) => !hasOverlap(notes, voice, run.startTick, run.endTick - run.startTick),
  );
}

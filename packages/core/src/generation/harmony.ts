import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AmbiguityIntent,
  CadenceKind,
  FragmentTransform,
  FugueState,
  HarmonicAnchor,
  HarmonicPlan,
  KeySignature,
  MeterContext,
  MetricalHarmonyIntent,
  SequencePattern,
  StyleProfile,
  Voice,
} from "../events.js";
import { isModalMode } from "./key.js";
import { beatStrengthAtTick, createLegacyMeterContext, previousMeasureDownbeat } from "./meter.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo } from "./shared.js";

export { beatStrengthAtTick } from "./meter.js";

export function buildHarmonicPlan(plan: {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  globalKey: KeySignature;
  localKey: KeySignature;
  targetKey: KeySignature;
  styleProfile: StyleProfile;
  cadenceKind: CadenceKind;
  ambiguityIntent: AmbiguityIntent;
  meterContext?: MeterContext;
  sequencePattern?: SequencePattern;
  fragmentTransform?: FragmentTransform;
}): HarmonicPlan {
  const meterContext = plan.meterContext ?? createLegacyMeterContext();
  const cadenceTick = cadenceAnchorTick(plan.startTick, plan.durationTicks, meterContext);
  const predominantTick = sectionalAnchorTick(plan.startTick, plan.durationTicks, meterContext, 1 / 3);
  const dominantTick = sectionalAnchorTick(plan.startTick, plan.durationTicks, meterContext, 2 / 3);
  const anchors: HarmonicAnchor[] = [
    {
      tick: plan.startTick,
      localKey: plan.localKey,
      function: "tonic",
      cadenceTarget: false,
    },
    {
      tick: predominantTick,
      localKey: plan.state === "episode" ? plan.targetKey : plan.localKey,
      function: "predominant",
      cadenceTarget: false,
    },
    {
      tick: dominantTick,
      localKey: plan.targetKey,
      function: "dominant",
      cadenceTarget: false,
    },
    {
      tick: cadenceTick,
      localKey: plan.targetKey,
      function: plan.cadenceKind === "half" ? "dominant" : "cadential-tonic",
      cadenceTarget: true,
    },
  ];

  return {
    state: plan.state,
    startTick: plan.startTick,
    durationTicks: plan.durationTicks,
    meterContext,
    localKey: plan.localKey,
    departureKey: plan.globalKey,
    targetKey: plan.targetKey,
    styleProfile: plan.styleProfile,
    cadenceKind: plan.cadenceKind,
    ambiguityIntent: plan.ambiguityIntent,
    ambiguityRecoveryTick: plan.ambiguityIntent === "none" ? undefined : cadenceTick,
    parallelKeyShift: plan.localKey.tonic === plan.targetKey.tonic && plan.localKey.mode !== plan.targetKey.mode,
    sequencePattern: plan.sequencePattern,
    fragmentTransform: plan.fragmentTransform,
    anchors,
  };
}

function sectionalAnchorTick(
  startTick: number,
  durationTicks: number,
  meterContext: MeterContext,
  fraction: number,
): number {
  const rawTick = startTick + Math.max(meterContext.beatTicks, Math.floor(durationTicks * fraction));
  if (meterContext.timeSignature.numerator === 4) {
    return rawTick;
  }
  return previousMeasureDownbeat(rawTick + meterContext.measureTicks / 2, meterContext);
}

function cadenceAnchorTick(startTick: number, durationTicks: number, meterContext: MeterContext): number {
  if (meterContext.timeSignature.numerator === 4) {
    return startTick + Math.max(TICKS_PER_QUARTER, durationTicks - TICKS_PER_QUARTER);
  }
  return previousMeasureDownbeat(startTick + durationTicks - meterContext.beatTicks, meterContext);
}

export function cadenceKindForSection(state: FugueState, targetKey: KeySignature): CadenceKind {
  if (isModalMode(targetKey.mode)) {
    return "modal";
  }
  return state === "episode" ? "modulatory" : "authentic";
}

export function nearestHarmonicAnchor(tick: number, sectionPlans: readonly HarmonicPlan[]): HarmonicAnchor | undefined {
  const plan = sectionPlans.find(
    (candidate) => tick >= candidate.startTick && tick < candidate.startTick + candidate.durationTicks,
  );
  const anchors = plan?.anchors ?? sectionPlans.flatMap((candidate) => candidate.anchors);
  return anchors
    .map((anchor) => ({ anchor, distance: Math.abs(anchor.tick - tick) }))
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
}

export function chordScaleDegreesForFunction(harmonicFunction: HarmonicAnchor["function"]): readonly number[] {
  const rootDegree = rootDegreeForFunction(harmonicFunction);
  return [rootDegree, rootDegree + 2, rootDegree + 4];
}

export function rootDegreeForFunction(harmonicFunction: HarmonicAnchor["function"]): number {
  if (harmonicFunction === "predominant") {
    return 3;
  }
  if (harmonicFunction === "dominant") {
    return 4;
  }
  return 0;
}

export function chordTonePitchClasses(key: KeySignature, harmonicFunction: HarmonicAnchor["function"]): number[] {
  return chordScaleDegreesForFunction(harmonicFunction).map((degree) => scaleDegreePitchClass(degree, 0, key));
}

export function isChordScaleDegree(scaleDegree: number, harmonicFunction: HarmonicAnchor["function"]): boolean {
  const normalized = positiveModulo(scaleDegree, 7);
  return chordScaleDegreesForFunction(harmonicFunction).some((degree) => positiveModulo(degree, 7) === normalized);
}

export function metricalHarmonyIntentForDegree(input: {
  degree: number;
  tick: number;
  voice: Voice;
  harmonicPlan?: HarmonicPlan;
  fallbackIntent?: MetricalHarmonyIntent;
}): MetricalHarmonyIntent {
  const beatStrength = beatStrengthAtTick(input.tick, input.harmonicPlan?.meterContext);
  if (input.harmonicPlan === undefined) {
    return input.fallbackIntent ?? (beatStrength === "offbeat" ? "offbeat-motion" : "weak-passing-tone");
  }

  const anchor = nearestHarmonicAnchor(input.tick, [input.harmonicPlan]);
  if (anchor === undefined) {
    return input.fallbackIntent ?? "offbeat-motion";
  }

  const chordTone = isChordScaleDegree(input.degree, anchor.function);
  if (beatStrength === "strong") {
    if (!chordTone) {
      return "strong-non-chord-tone";
    }
    return input.voice === "bass" &&
      positiveModulo(input.degree, 7) === positiveModulo(rootDegreeForFunction(anchor.function), 7)
      ? "structural-root-support"
      : "structural-chord-tone";
  }
  if (beatStrength === "weak") {
    if (chordTone) {
      return "weak-chord-tone";
    }
    return input.fallbackIntent === "weak-neighbor-tone" ? "weak-neighbor-tone" : "weak-passing-tone";
  }
  return "offbeat-motion";
}

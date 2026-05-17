import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AmbiguityIntent,
  CadenceKind,
  FragmentTransform,
  FugueState,
  HarmonicAnchor,
  HarmonicPlan,
  KeySignature,
  MetricalHarmonyIntent,
  SequencePattern,
  StyleProfile,
  Voice,
} from "../events.js";
import { isModalMode } from "./key.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo } from "./shared.js";

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
  sequencePattern?: SequencePattern;
  fragmentTransform?: FragmentTransform;
}): HarmonicPlan {
  const cadenceTick = plan.startTick + Math.max(TICKS_PER_QUARTER, plan.durationTicks - TICKS_PER_QUARTER);
  const predominantTick = plan.startTick + Math.max(TICKS_PER_QUARTER, Math.floor(plan.durationTicks / 3));
  const dominantTick = plan.startTick + Math.max(TICKS_PER_QUARTER * 2, Math.floor((plan.durationTicks * 2) / 3));
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

export function cadenceKindForSection(state: FugueState, targetKey: KeySignature): CadenceKind {
  if (isModalMode(targetKey.mode)) {
    return "modal";
  }
  return state === "episode" ? "modulatory" : "authentic";
}

export function beatStrengthAtTick(tick: number): "strong" | "weak" | "offbeat" {
  if (tick % (TICKS_PER_QUARTER * 2) === 0) {
    return "strong";
  }
  if (tick % TICKS_PER_QUARTER === 0) {
    return "weak";
  }
  return "offbeat";
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
  const beatStrength = beatStrengthAtTick(input.tick);
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

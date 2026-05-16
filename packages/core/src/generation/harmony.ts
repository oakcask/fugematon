import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AmbiguityIntent,
  CadenceKind,
  FragmentTransform,
  FugueState,
  HarmonicAnchor,
  HarmonicPlan,
  KeySignature,
  SequencePattern,
  StyleProfile,
} from "../events.js";
import { isModalMode } from "./key.js";

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

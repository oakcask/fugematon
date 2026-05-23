import type {
  HarmonicPlan,
  Phase12PhraseFunction,
  Phase12ReviewSummary,
  Phase13ZPhraseDevelopmentWindow,
  Phase13ZReviewSummary,
  PlannedEntry,
} from "../events.js";

const MECHANICAL_REUSE_REVIEW_WINDOW_LIMIT = 20;
const MAX_TOP_SUBJECT_STEM_FAMILY_SHARE_WITHOUT_FUNCTION = 0.42;

export function buildPhase13ZReviewSummary(
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  phase12Review: Phase12ReviewSummary,
): Phase13ZReviewSummary {
  const windows = collectPhraseDevelopmentWindows(subjectEntries, sectionPlans);
  const mechanicalReuseWindowCount = windows.filter((window) => window.judgement === "mechanical-reuse").length;
  const functionBearingWindowCount = windows.filter(
    (window) => window.judgement === "function-bearing-recurrence",
  ).length;
  const topSubjectStemFamilyShare = topFamilyShare(phase12Review, "subject");
  const topSubjectFragmentFamilyShare = topFamilyShare(phase12Review, "subject-fragment");

  return {
    schemaVersion: 1,
    reviewRequired:
      mechanicalReuseWindowCount > MECHANICAL_REUSE_REVIEW_WINDOW_LIMIT ||
      (topSubjectStemFamilyShare > MAX_TOP_SUBJECT_STEM_FAMILY_SHARE_WITHOUT_FUNCTION &&
        functionBearingWindowCount === 0),
    windowCount: windows.length,
    mechanicalReuseWindowCount,
    functionBearingWindowCount,
    topSubjectStemFamilyShare,
    topSubjectFragmentFamilyShare,
    windows,
  };
}

function collectPhraseDevelopmentWindows(
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13ZPhraseDevelopmentWindow[] {
  const previousByStem = new Map<string, Phase13ZPhraseDevelopmentWindow>();
  const windows: Phase13ZPhraseDevelopmentWindow[] = [];

  for (const entry of subjectEntries) {
    if (entry.state === "exposition" || (entry.form !== "subject" && entry.form !== "subject-fragment")) {
      continue;
    }

    const section = sectionForEntry(sectionPlans, entry);
    const phraseFunction = phase13ZPhraseFunction(section);
    const stemKey = `${entry.form}:${entry.expectedDegreePattern.join("-")}`;
    const previous = previousByStem.get(stemKey);
    const recentStemReuseCount = previous === undefined ? 0 : previous.recentStemReuseCount + 1;
    const changedEntryVoice = previous !== undefined && previous.entryVoice !== entry.voice;
    const changedLocalKey =
      previous !== undefined &&
      (previous.localKey.tonic !== entry.localKey.tonic || previous.localKey.mode !== entry.localKey.mode);
    const changedPhraseFunction = previous !== undefined && previous.phraseFunction !== phraseFunction;
    const window: Phase13ZPhraseDevelopmentWindow = {
      startTick: entry.startTick,
      state: entry.state,
      form: entry.form,
      entryVoice: entry.voice,
      stemPattern: [...entry.expectedDegreePattern],
      phraseFunction,
      cadenceKind: section?.cadenceKind ?? "evaded",
      localKey: entry.localKey,
      recentStemReuseCount,
      changedEntryVoice,
      changedLocalKey,
      changedPhraseFunction,
      judgement:
        previous === undefined
          ? "new-material"
          : changedEntryVoice || changedLocalKey || changedPhraseFunction
            ? "function-bearing-recurrence"
            : "mechanical-reuse",
    };

    windows.push(window);
    previousByStem.set(stemKey, window);
  }

  return windows;
}

function sectionForEntry(sectionPlans: readonly HarmonicPlan[], entry: PlannedEntry): HarmonicPlan | undefined {
  return sectionPlans.find(
    (section) => entry.startTick >= section.startTick && entry.startTick < section.startTick + section.durationTicks,
  );
}

function phase13ZPhraseFunction(section: HarmonicPlan | undefined): Phase12PhraseFunction {
  if (section === undefined) {
    return "entry-preparation";
  }
  if (section.state === "exposition") {
    return "exposition";
  }
  if (section.state === "stretto-like") {
    return "stretto-compression";
  }
  if (section.state === "subject-return") {
    return section.cadenceKind === "authentic" || section.cadenceKind === "modal" ? "cadence-extension" : "restatement";
  }
  if (section.fragmentTransform !== undefined || section.sequencePattern !== undefined) {
    return "episode-sequence";
  }
  return "entry-preparation";
}

function topFamilyShare(phase12Review: Phase12ReviewSummary, form: "subject" | "subject-fragment"): number {
  return phase12Review.subjectStemFamilies
    .filter((family) => family.form === form)
    .reduce((maxShare, family) => Math.max(maxShare, family.share), 0);
}

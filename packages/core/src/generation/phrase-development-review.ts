import type {
  HarmonicPlan,
  PhraseDevelopmentReviewSummary,
  PhraseDevelopmentWindow,
  PhraseFunction,
  PhraseRepetitionReviewSummary,
  PlannedEntry,
} from "../events.js";

const MECHANICAL_REUSE_REVIEW_WINDOW_LIMIT = 20;
const MAX_TOP_SUBJECT_STEM_FAMILY_SHARE_WITHOUT_FUNCTION = 0.42;

export function buildPhraseDevelopmentReviewSummary(
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  phraseRepetitionReview: PhraseRepetitionReviewSummary,
): PhraseDevelopmentReviewSummary {
  const windows = collectPhraseDevelopmentWindows(subjectEntries, sectionPlans);
  const mechanicalReuseWindowCount = windows.filter((window) => window.judgement === "mechanical-reuse").length;
  const functionBearingWindowCount = windows.filter(
    (window) => window.judgement === "function-bearing-recurrence",
  ).length;
  const topSubjectStemFamilyShare = topFamilyShare(phraseRepetitionReview, "subject");
  const topSubjectFragmentFamilyShare = topFamilyShare(phraseRepetitionReview, "subject-fragment");

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
): PhraseDevelopmentWindow[] {
  const previousByStem = new Map<string, { window: PhraseDevelopmentWindow; phraseSignature: string }>();
  const windows: PhraseDevelopmentWindow[] = [];

  for (const entry of subjectEntries) {
    if (entry.state === "exposition" || (entry.form !== "subject" && entry.form !== "subject-fragment")) {
      continue;
    }

    const section = sectionForEntry(sectionPlans, entry);
    const phraseFunction = phraseDevelopmentFunction(section);
    const phraseSignature = phraseDevelopmentSignature(section);
    const stemKey = `${entry.form}:${entry.expectedDegreePattern.join("-")}`;
    const previousRecord = previousByStem.get(stemKey);
    const previous = previousRecord?.window;
    const recentStemReuseCount = previous === undefined ? 0 : previous.recentStemReuseCount + 1;
    const changedEntryVoice = previous !== undefined && previous.entryVoice !== entry.voice;
    const changedLocalKey =
      previous !== undefined &&
      (previous.localKey.tonic !== entry.localKey.tonic || previous.localKey.mode !== entry.localKey.mode);
    const changedPhraseFunction = previousRecord !== undefined && previousRecord.phraseSignature !== phraseSignature;
    const window: PhraseDevelopmentWindow = {
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
    previousByStem.set(stemKey, { window, phraseSignature });
  }

  return windows;
}

function phraseDevelopmentSignature(section: HarmonicPlan | undefined): string {
  if (section === undefined) {
    return "entry-preparation";
  }
  return [
    phraseDevelopmentFunction(section),
    section.cadenceKind,
    section.sequencePattern ?? "none",
    section.fragmentTransform ?? "none",
    `${section.departureKey.tonic}:${section.departureKey.mode}`,
    `${section.targetKey.tonic}:${section.targetKey.mode}`,
  ].join(":");
}

function sectionForEntry(sectionPlans: readonly HarmonicPlan[], entry: PlannedEntry): HarmonicPlan | undefined {
  return sectionPlans.find(
    (section) => entry.startTick >= section.startTick && entry.startTick < section.startTick + section.durationTicks,
  );
}

function phraseDevelopmentFunction(section: HarmonicPlan | undefined): PhraseFunction {
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

function topFamilyShare(
  phraseRepetitionReview: PhraseRepetitionReviewSummary,
  form: "subject" | "subject-fragment",
): number {
  return phraseRepetitionReview.subjectStemFamilies
    .filter((family) => family.form === form)
    .reduce((maxShare, family) => Math.max(maxShare, family.share), 0);
}

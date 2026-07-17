export { validateCorpusManifest, validateNormalizedScore } from "./corpus.js";
export { extractEvaluationFeatures, serializeFeatureVector, validateEvaluationFeatureVector } from "./features.js";
export { normalizeGeneratedScore } from "./generated-score.js";
export { importHumdrumKern } from "./humdrum-kern.js";
export type {
  PairwiseModelArtifact,
  PairwisePrediction,
  PairwiseTrainingResult,
  PairwiseTrainingRow,
} from "./model.js";
export {
  loadPairwiseModel,
  PAIRWISE_MODEL_SCHEMA,
  PAIRWISE_TRAINING_ALGORITHM,
  predictPairwise,
  serializePairwiseModel,
  trainPairwiseModel,
} from "./model.js";
export { importMusicXml } from "./musicxml.js";
export type {
  BlindedPairwiseComparison,
  CompositionReasonTag,
  PairwiseBundleManifest,
  PairwiseComparisonContext,
  PairwiseHiddenMapping,
  PairwiseLabelSummary,
  PairwiseResponse,
  PairwiseResponseSet,
  PairwiseSide,
  PreferredSide,
  RenderingReasonTag,
} from "./pairwise.js";
export {
  COMPOSITION_REASON_TAGS,
  createBlindedComparison,
  mergePairwiseResponses,
  PAIRWISE_BUNDLE_SCHEMA,
  PAIRWISE_RESPONSE_SCHEMA,
  RENDERING_REASON_TAGS,
  summarizePairwiseLabels,
  validatePairwiseBundle,
  validatePairwiseResponses,
} from "./pairwise.js";
export type { PairwisePlaybackSide, PairwisePlaybackState } from "./playback.js";
export {
  createPairwisePlaybackState,
  failPairwiseRenderer,
  pausePairwisePlayback,
  playPairwiseSide,
  seekPairwisePlayback,
  setPairwiseLoop,
  stopPairwisePlayback,
} from "./playback.js";
export type {
  ActiveLearningQueue,
  ActiveLearningQueueItem,
  ShadowComparisonInput,
  ShadowComparisonSummary,
  ShadowReport,
} from "./shadow.js";
export {
  ACTIVE_LEARNING_QUEUE_SCHEMA,
  createActiveLearningQueue,
  createShadowReport,
  SHADOW_REPORT_SCHEMA,
} from "./shadow.js";
export type {
  AnnotationProvenance,
  CorpusManifest,
  CorpusManifestEntry,
  CorpusSplit,
  EvaluationErrorDetail,
  EvaluationFeature,
  EvaluationFeatureVector,
  FeatureAvailability,
  FeatureEvidencePointer,
  FeatureGroup,
  FeaturePolicyClass,
  NormalizedCadence,
  NormalizedEntry,
  NormalizedNote,
  NormalizedReferenceScore,
  NormalizedSection,
  RepertoireRole,
} from "./types.js";
export {
  CORPUS_MANIFEST_SCHEMA,
  EVALUATION_FEATURE_SCHEMA_VERSION,
  EvaluationContractError,
  NORMALIZED_SCORE_SCHEMA_VERSION,
} from "./types.js";

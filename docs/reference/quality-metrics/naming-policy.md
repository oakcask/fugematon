# Metric Naming Policy

Current な metric、gate、review surface は、導入された Phase ではなく音楽的な意味で命名します。Phase 名は履歴、計画、完了記録に残し、現在の採否判断や diagnostics contract を読む入口には使わない方針です。

## Rules

* Current な diagnostics、review bundle、quality evidence の field 名は、何を観察するかを表す。
* `Gate` は pass/fail policy を返すものだけに使う。CI blocker ではない review surface には `Review`、`Evidence`、`Trace`、`Acceptance` などを使う。
* Phase 文書、古い review 文書、履歴用テスト名は Phase 名を保持してよい。
* 公開 JSON や exported TypeScript 型の rename は、schema version と compatibility alias を伴って段階的に行う。
* Docs の current reference では新名を主に書き、必要な場合だけ「formerly `phase...`」として旧名を併記する。
* New tests, helpers, fixtures, and file names use the musical surface name unless the test exists only to protect a historical compatibility alias.

## Rename Audit Policy

Every Phase-name removal uses the symbol rename audit workflow before it is reported complete.

| Surface | Compatibility policy | Residual Phase-name policy |
| --- | --- | --- |
| Current implementation identifiers | Rename to the current musical name. Keep temporary exported aliases only when downstream packages still import the old name. | `removed` after the compatibility PR removes aliases. |
| Public review JSON and CLI output | Bump the schema when an emitted field is removed or renamed. Prefer current names only in new output. | `compatibility-alias` only during a schema transition; then `removed`. |
| CLI input values | Accept legacy values only when explicitly listed in this file. Emit and document current values. | `compatibility-alias` until the input alias removal PR. |
| Tests and helper files | Rename current behavior tests to musical names. Keep Phase names only for tests that assert legacy compatibility. | `test-assertion` for compatibility tests; otherwise `removed`. |
| Current reference docs | Lead with the current name. Move migration history into this document or historical phase/review docs. | `historical-doc` only when the text is about past migration history. |
| Phase and review history docs | Preserve historical names when they describe what happened at that time. | `historical-doc`. |

## Current Migration Map

| Historical name | Current name | Meaning |
| --- | --- | --- |
| `phase11Review` | `texturePlanningReview` | register、functional thinning、state grammar、metrical harmony の planning summary。 |
| `phase12Review` | `phraseRepetitionReview` | subject stem、answer transform、fragment derivation、phrase function、section-state pattern の反復 summary。 |
| `phase13QReview` | `localSentinelCandidateTrace` | local sentinel を selected candidate の section、entry、voice pair、resolution deadline へ戻す trace。 |
| `phase13RReview` | `phraseConvergenceReview` | per-score phrase convergence と legacy default path の review signal。 |
| `qualityVector.phase13VReview` | `qualityVector.scoreBeautyEvidence` | line agency、entry formula novelty、counter-subject survivability、long-window development の adoption evidence。 |
| `phase13ZReview` | `phraseDevelopmentReview` | continuation window の phrase development と mechanical reuse の review signal。 |
| `phase14DissonanceTriage` | `dissonanceTriage` | weak-passing、passing-neighbor/offbeat、entry clash を score-window 単位で読む triage。 |
| `phase14ScoreWindowAcceptance` | `scoreWindowAcceptance` | entry continuity、dissonance、voice-pair、counter-subject、phrase development、metric explanation をまとめた score-window acceptance surface。 |
| `phase59Gate` | `baselineBeautyGate` | fixed review seed の baseline beauty gate。 |
| `phase510Gate` | `voiceIndependenceGate` | voice independence と entry-support stability gate。 |
| `phase511Gate` | `rotationRobustnessGate` | fixed seed への過適合と rotation seed fragility の gate。 |
| `phase6Gate` | `melodyTextureGate` | melody、texture、entry harmony、ornament placement の gate。 |
| `phase7Gate` | `contourMotionGate` | bass-upper / outer-voice contour motion gate。 |
| `phase7BGate` | `reviewGatePolicy` | hard failure、review-required、warning、manual listening を分ける policy surface。 |

## Core API Migration Map

| Historical name | Current name | Compatibility policy |
| --- | --- | --- |
| `PHASE_5_LENGTH_TICKS` | `REVIEW_LENGTH_TICKS` | Removed from current exports. |
| `PHASE_5_REVIEW_SEEDS` | `REPRESENTATIVE_REVIEW_SEEDS` | Removed from current exports. |
| `PHASE_5_11_ROTATION_SEEDS` | `ROTATION_REVIEW_SEEDS` | Removed from current exports. |
| `PHASE_5_9_DIAGNOSTICS_PROFILE` | `BASELINE_BEAUTY_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_5_10_DIAGNOSTICS_PROFILE` | `VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_5_11_DIAGNOSTICS_PROFILE` | `ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_6_DIAGNOSTICS_PROFILE` | `MELODY_TEXTURE_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_7_DIAGNOSTICS_PROFILE` | `CONTOUR_MOTION_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE` | `REFERENCE_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_10_REFERENCE_CORPUS_MANIFEST` | `REFERENCE_CORPUS_MANIFEST` | Removed from current exports. |
| `Phase59GateFailure` | `ReviewGateFailure` | Removed from current exports. |
| `Phase59GateResult` | `BaselineBeautyGateResult` | Removed from current exports. |
| `Phase510GateResult` | `VoiceIndependenceGateResult` | Removed from current exports. |
| `Phase511GateResult` | `RotationRobustnessGateResult` | Removed from current exports. |
| `Phase6GateResult` | `MelodyTextureGateResult` | Removed from current exports. |
| `Phase7GateResult` | `ContourMotionGateResult` | Removed from current exports. |
| `Phase7BPolicyOptions` | `ReviewGatePolicyOptions` | Removed from current exports. |
| `Phase7BGatePolicyResult` | `ReviewGatePolicyResult` | Removed from current exports. |
| `evaluatePhase59Diagnostics` | `evaluateBaselineBeautyGate` | Removed from current exports. |
| `evaluatePhase510Diagnostics` | `evaluateVoiceIndependenceGate` | Removed from current exports. |
| `evaluatePhase511Diagnostics` | `evaluateRotationRobustnessGate` | Removed from current exports. |
| `evaluatePhase6Diagnostics` | `evaluateMelodyTextureGate` | Removed from current exports. |
| `evaluatePhase7Diagnostics` | `evaluateContourMotionGate` | Removed from current exports. |
| `evaluatePhase7BGatePolicy` | `evaluateReviewGatePolicy` | Removed from current exports. |
| `phase8Ready` | `adoptionReady` | Removed from current policy result schema. |
| `legacyPhase7Gate` | `contourMotionGate` | Removed from current policy result schema. |
| `PHASE_1_DIAGNOSTICS_PROFILE` | `EXPOSITION_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_1_REPRESENTATIVE_SEEDS` | `EXPOSITION_REPRESENTATIVE_SEEDS` | Removed from current exports. |
| `PHASE_3_LENGTH_TICKS` | `FUGUE_FORM_REVIEW_LENGTH_TICKS` | Removed from current exports. |
| `PHASE_3_DIAGNOSTICS_PROFILE` | `FUGUE_FORM_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_3_REPRESENTATIVE_SEEDS` | `FUGUE_FORM_REPRESENTATIVE_SEEDS` | Removed from current exports. |
| `PHASE_4_DIAGNOSTICS_PROFILE` | `SUBJECT_ANSWER_PLAN_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_4_REPRESENTATIVE_SEEDS` | `SUBJECT_ANSWER_PLAN_REPRESENTATIVE_SEEDS` | Removed from current exports. |
| `PHASE_5_DIAGNOSTICS_PROFILE` | `COUNTERPOINT_HARMONY_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_5_6_DIAGNOSTICS_PROFILE` | `BEAUTY_TEXTURE_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `PHASE_5_7_DIAGNOSTICS_PROFILE` | `MODAL_CONTEXT_DIAGNOSTICS_PROFILE` | Removed from current exports. |
| `phase-7-fugue-reference-profile` | `fugue-reference-profile` | Removed from current reference profile output. |

## Staged Refactor Order

1. Add the current core API names and make implementation code call them first. Keep old exported names as simple aliases while package consumers and tests migrate.
2. Bump review bundle schemas and remove emitted Phase-name compatibility fields from new CLI output.
3. Rename current test helpers and test files to the musical surfaces they protect.
4. Remove compatibility aliases from public exports and input parsers once current-name tests prove the replacement path.
5. Run residual searches for `phase[0-9]`, `Phase[0-9]`, `PHASE_[0-9]`, and quoted JSON keys. Classify every remaining hit as `historical-doc`, `test-assertion`, or `follow-up-required`.

## Candidate Evaluation Feature Keys

Candidate evaluation feature keys follow the same rule: current keys name the musical risk, not the Phase that introduced the diagnostic. Historical feature keys are listed here as migration history; current generated candidate evaluations emit only the current keys.

| Historical feature key | Current feature key | Meaning |
| --- | --- | --- |
| `phase11AdjacentVoiceOverOctaveCount` | `wideAdjacentVoiceSpacingCount` | Adjacent voice pairs whose spacing exceeds an octave. |
| `phase11AdjacentVoiceWideP75SemitoneExcess` | `adjacentVoiceWideP75SemitoneExcess` | Excess in the 75th percentile adjacent-voice spacing over the octave reference. |
| `phase11RegisterSpanSemitoneTotal` | `registerSpanSemitoneTotal` | Total register span pressure across voices. |
| `phase11FunctionalThinningNonCadentialRunCount` | `nonCadentialFunctionalThinningRunCount` | Functional thinning runs not explained by cadence. |
| `phase11FunctionalThinningOneVoiceRunCount` | `oneVoiceFunctionalThinningRunCount` | Functional thinning windows with one active voice. |
| `phase11FunctionalThinningTwoVoiceRunCount` | `twoVoiceFunctionalThinningRunCount` | Functional thinning windows with two active voices. |
| `phase11FunctionalThinningMaxDurationQuarters` | `functionalThinningMaxDurationQuarters` | Longest functional thinning duration in quarter notes. |
| `phase11StateGrammarMostRepeatedPatternCount` | `stateGrammarMostRepeatedPatternCount` | Most repeated section-state pattern count. |
| `phase11StateGrammarUniquePatternCount` | `stateGrammarUniquePatternCount` | Unique section-state pattern count. |
| `phase11TopEntryPatternFamilyCount` | `topEntryPatternFamilyCount` | Largest entry-pattern family count. |

## Candidate Pool Oracle Keys

| Historical field | Current field | Meaning |
| --- | --- | --- |
| `phase12PhraseFamilyCandidateCount` | `phraseFamilyCandidateCount` | Phrase-family candidate count in candidate-pool oracle section and summary evidence. |

## Current Test Helper Migration Map

Current behavior tests and shared test helpers use the same musical-surface naming rule as runtime metrics. Historical Phase names remain only in compatibility assertions and phase/review history docs.

| Historical name | Current name | Meaning |
| --- | --- | --- |
| `PHASE_13Q_FOCUSED_SEEDS` | `CANDIDATE_DIVERSITY_ADOPTION_SEEDS` | Focused seed set for candidate-diversity adoption readiness. |
| `assertPhase13QAdoptionSeedsReady` | `assertCandidateDiversityAdoptionSeedsReady` | Adoption readiness helper for candidate-diversity generator work. |
| `assertPhase13QCandidateDiversitySeedsReady` | `assertCandidateDiversityReviewSeedsReady` | Review helper for candidate-diversity oracle summaries. |
| `generate-phase13q-review-*.test.ts` | `generate-candidate-diversity-adoption-*.test.ts` | Candidate-diversity adoption regression batches. |
| `generate-phase13q-candidate-diversity*.test.ts` | `generate-candidate-diversity-review*.test.ts` | Candidate-diversity oracle review batches. |
| `generate-phase13q-review.test.ts` | `generate-local-sentinel-candidate-trace.test.ts` | Local-sentinel to selected-candidate trace contract. |
| `generate-phase-review-test-helpers.ts` | `generate-quality-review-test-helpers.ts` | Shared helper module for current quality-review test surfaces. |
| `PHASE_11_12_REVIEW_*` | `TEXTURE_PHRASE_PLANNING_REVIEW_*` | Texture and phrase-planning review seed batches. |
| `PHASE_11_12_ROTATION_SEEDS` | `TEXTURE_PHRASE_PLANNING_ROTATION_SEEDS` | Rotation seed set for texture and phrase-planning review. |
| `PHASE_12_REPETITION_*` | `PHRASE_REPETITION_*` | Phrase-repetition focused and review seed batches. |
| `PHASE_13_FOCUSED_SEEDS` | `QUALITY_VECTOR_REVIEW_SEEDS` | Focused seed set for quality-vector review preconditions. |
| `Phase1112PlanningMetrics` | `TexturePhrasePlanningMetrics` | Aggregate metrics for texture and phrase-planning review. |
| `Phase12RepetitionMetrics` | `PhraseRepetitionMetrics` | Aggregate metrics for phrase-repetition review. |
| `collectPhase1112PlanningMetrics` | `collectTexturePhrasePlanningMetrics` | Collector for texture and phrase-planning review metrics. |
| `collectPhase12RepetitionMetrics` | `collectPhraseRepetitionMetrics` | Collector for phrase-repetition review metrics. |
| `assertPhase1112ReviewBatch` | `assertTexturePhrasePlanningReviewBatch` | Review helper for texture and phrase-planning seed batches. |
| `assertPhase1112RotationBatch` | `assertTexturePhrasePlanningRotationBatch` | Review helper for texture and phrase-planning rotation batches. |
| `assertPhase12FocusedRepetitionAdoption` | `assertFocusedPhraseRepetitionAdoption` | Adoption helper for focused phrase-repetition seeds. |
| `assertPhase12RepetitionReviewBatch` | `assertPhraseRepetitionReviewBatch` | Review helper for phrase-repetition seed batches. |
| `assertPhase13ReviewPreconditions` | `assertQualityVectorReviewPreconditions` | Preconditions helper for quality-vector review seeds. |
| `generate-phase13w-entry-boundary*` | `generate-post-exposition-entry-boundary*` | Post-exposition entry-boundary continuity review helpers and batches. |
| `PHASE_13W_*` | `POST_EXPOSITION_ENTRY_BOUNDARY_*` | Post-exposition entry-boundary focused and review seed batches. |
| `Phase13WEntryBoundary*` | `PostExpositionEntryBoundary*` | Post-exposition entry-boundary review metrics and windows. |
| `generate-phase13x-first-bass-entry*` | `generate-first-bass-entry-boundary*` | First bass-entry boundary continuity review helpers and batches. |
| `PHASE_13X_FIRST_BASS_ENTRY_*` | `FIRST_BASS_ENTRY_BOUNDARY_*` | First bass-entry boundary review seed batches. |
| `Phase13XFirstBassEntry*` | `FirstBassEntryBoundary*` | First bass-entry boundary review metrics and windows. |
| `generate-phase13x2-bass-answer-tail*` | `generate-bass-answer-tail-texture*` | Bass-answer tail texture review helpers and batches. |
| `PHASE_13X2_BASS_ANSWER_TAIL_*` | `BASS_ANSWER_TAIL_TEXTURE_*` | Bass-answer tail texture review seed batches. |
| `Phase13X2BassAnswerTailMetrics` | `BassAnswerTailTextureMetrics` | Bass-answer tail texture review metrics. |

## Selection Model Values

Selection model values use current names in CLI help, generated diagnostics, review bundles, and new tests. Historical input aliases are outside the compatibility window and should be rejected by current code.

| Current value | Meaning |
| --- | --- |
| `baseline` | Baseline selection behavior. |
| `candidate-oracle-selection` | Selection-model risk adjustment over the existing candidate pool. |
| `section-local-planner` | Adopted section-local planner with section grammar and phrase-family candidates. |

## Compatibility

Current code should read and emit the current names. Compatibility aliases should not introduce separate computation paths, and once a schema transition removes an alias, tests should assert that the historical key is absent from current output.

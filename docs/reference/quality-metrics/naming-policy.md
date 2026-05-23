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
| `PHASE_5_LENGTH_TICKS` | `REVIEW_LENGTH_TICKS` | Temporary exported alias, then remove. |
| `PHASE_5_REVIEW_SEEDS` | `REPRESENTATIVE_REVIEW_SEEDS` | Temporary exported alias, then remove. |
| `PHASE_5_11_ROTATION_SEEDS` | `ROTATION_REVIEW_SEEDS` | Temporary exported alias, then remove. |
| `PHASE_5_9_DIAGNOSTICS_PROFILE` | `BASELINE_BEAUTY_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_5_10_DIAGNOSTICS_PROFILE` | `VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_5_11_DIAGNOSTICS_PROFILE` | `ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_6_DIAGNOSTICS_PROFILE` | `MELODY_TEXTURE_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_7_DIAGNOSTICS_PROFILE` | `CONTOUR_MOTION_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE` | `REFERENCE_DIAGNOSTICS_PROFILE` | Temporary exported alias, then remove. |
| `PHASE_10_REFERENCE_CORPUS_MANIFEST` | `REFERENCE_CORPUS_MANIFEST` | Temporary exported alias, then remove. |
| `Phase59GateFailure` | `ReviewGateFailure` | Temporary exported alias, then remove. |
| `Phase59GateResult` | `BaselineBeautyGateResult` | Temporary exported alias, then remove. |
| `Phase510GateResult` | `VoiceIndependenceGateResult` | Temporary exported alias, then remove. |
| `Phase511GateResult` | `RotationRobustnessGateResult` | Temporary exported alias, then remove. |
| `Phase6GateResult` | `MelodyTextureGateResult` | Temporary exported alias, then remove. |
| `Phase7GateResult` | `ContourMotionGateResult` | Temporary exported alias, then remove. |
| `Phase7BPolicyOptions` | `ReviewGatePolicyOptions` | Temporary exported alias, then remove. |
| `Phase7BGatePolicyResult` | `ReviewGatePolicyResult` | Temporary exported alias, then remove. |
| `evaluatePhase59Diagnostics` | `evaluateBaselineBeautyGate` | Temporary exported alias, then remove. |
| `evaluatePhase510Diagnostics` | `evaluateVoiceIndependenceGate` | Temporary exported alias, then remove. |
| `evaluatePhase511Diagnostics` | `evaluateRotationRobustnessGate` | Temporary exported alias, then remove. |
| `evaluatePhase6Diagnostics` | `evaluateMelodyTextureGate` | Temporary exported alias, then remove. |
| `evaluatePhase7Diagnostics` | `evaluateContourMotionGate` | Temporary exported alias, then remove. |
| `evaluatePhase7BGatePolicy` | `evaluateReviewGatePolicy` | Temporary exported alias, then remove. |
| `phase8Ready` | `adoptionReady` | Public JSON schema bump required before old field removal. |
| `legacyPhase7Gate` | `contourMotionGate` | Public JSON schema bump required before old field removal. |

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

## Selection Model Values

Selection model values also use current names in CLI help, generated diagnostics, review bundles, and new tests. Legacy values remain accepted as input aliases during the compatibility window.

| Historical value | Current value | Meaning |
| --- | --- | --- |
| `phase10-oracle-selection` | `candidate-oracle-selection` | Selection-model risk adjustment over the existing candidate pool. |
| `phase10-section-local-planner` | `section-local-planner` | Adopted section-local planner with section grammar and phrase-family candidates. |

## Compatibility

Current code should read and emit the current names. Compatibility aliases should not introduce separate computation paths, and once a schema transition removes an alias, tests should assert that the historical key is absent from current output.

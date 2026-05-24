# Historical Reference Observation

This review records the plan change after exploratory diagnostics from Bach WTC fugue scores.

Evidence source:

* Humdrum `**kern` files from `humdrum-tools/bach-wtc-fugues`.
* Local exploratory outputs under `samples/historical-score-reference`.
* Generated comparison bundle: `samples/phase-13aa-score-beauty-audit/summary.json`.

Import limits:

* Subject entry locations were approximated from the first active voice. Entry-local metrics are not gate-ready.
* Key and section plans were simplified to one strict-classical section.
* Humdrum spine split and merge handling was approximate. The result is review evidence, not a reference-profile fixture.
* No manual listening pass was completed.

## Findings

### 1. Generated texture is more coupled than the historical sample

Affected generated set: `samples/phase-13aa-score-beauty-audit`.

The four imported WTC fugues show lower voice-pair coupling than the current generated bundle:

| Axis | Historical average | Generated average |
| --- | ---: | ---: |
| `sharedRhythmOverlapPerVoicePairQuarter` | 0.310 | 0.536 |
| `unisonOverlapPerVoicePairQuarter` | 0.197 | 0.421 |

The quality vector agrees with this symptom. In the generated bundle, `durationBasedLockstep` and `pitchClassUnisonDuration` are `review-required` in all 22 seeds. The generated bundle also has 68 `long-pitch-class-unison` local sentinels.

Theory basis: Fux/species counterpoint treats line independence as a central discipline; Bach/fugue texture can use doubling, imitation, and rhythmic agreement, but persistent voice-pair lockstep weakens independent line agency unless it has subject support, cadence, pedal, suspension, sequence, or explicit reinforcement function.

Current diagnostics detect the broad symptom through `qualityVector`, `voicePairSpans`, `voicePairFunctions`, and `localSentinels`, but the generation model still accepts too much duration-grid coupling.

Project response: insert Historical reference calibration before Infinite playback MVP. Reweight voice-pair scoring and planner choices toward independent continuation, especially after entry and in long continuation windows.

### 2. Entry friction remains the highest generated-score blocker

Affected generated seeds from the current bundle include `circle-fifths`, `contrary-motion`, `modal-cadence`, and `tight-stretto`.

Generated `entrySevereIntervalDuration` is `review-required` in 18 of 22 seeds. `unresolvedEntrySevereIntervalDuration` is `review-required` in 3 of 22 seeds. The historical import cannot prove a zero reference because entry locations were not annotated, but the generated score evidence is still strong enough to keep entry harmony ahead of operational work.

Theory basis: Bach/fugue entry writing may contain accented friction, suspension, and prepared dissonance, but unresolved seconds and sevenths around subject or answer entries need local voice-leading explanation.

Current diagnostics detect the issue through `entrySevereIntervals`, `entrySonorities`, `entryFormulaRecurrences`, and unresolved-entry local sentinels.

Project response: add entry-support generation and scoring that prefer carried support, prepared suspension, delayed support, or stable chord-tone/root support instead of same-tick support resets or unexplained severe intervals.

### 3. Reference-profile green state is still not beauty acceptance

The generated bundle reports all reference axes within the current placeholder profile, while quality vector still reports 170 local sentinels. The historical import shows why: the placeholder bands are broad enough that generated shared rhythm and pitch-class unison remain within profile even when the historical sample is much lower.

Theory basis: reference-relative metrics are useful only when the source profile has real corpus-derived bands and score-window explanations. A broad metadata-only profile can prevent false hard failures, but it cannot certify musical beauty.

Project response: separate two tasks. First, repair the generator using existing local sentinel evidence. Second, build a real reference profile from annotated or matched historical score data. Do not use `outsideReferenceSeedCount: 0` as a handoff criterion.

### 4. Leap-recovery comparison needs style-aware interpretation

The historical import reports `leapRecoveryMissesPerQuarter` above the current placeholder band in three of four scores. This should not cause the generator to increase leaps or relax line quality by itself. The likely cause is a mismatch between keyboard fugue figuration and the current vocal-style recovery heuristic.

Theory basis: species counterpoint favors compensated leaps, but keyboard fugue subjects, sequences, and arpeggiated figures can use larger motion when subject identity, harmonic direction, or sequence logic explains it.

Project response: keep leap recovery as review evidence. Add style-aware explanation before using historical leap density as a scoring target.

## Structural Hypothesis

Confirmed symptom: generated scores overuse duration lockstep, pitch-class reinforcement, and entry-local severe interval duration compared with the exploratory historical sample and with current quality-vector local sentinels.

Plausible generator cause: section and support planning often repairs density by adding lines that share the same duration grid or reinforce pitch classes, and entry support still favors same-tick support over prepared or carried contrapuntal continuation.

Evidence strength: plausible. The generated seed set is broad, but the historical import is approximate and lacks annotated entry locations.

Project response: reorder the plan so Historical reference calibration runs before Infinite playback MVP. Treat the current evidence as `review-required`, with generator and scoring work first and corpus-ingestion work second.

## Implementation Order

1. Add a narrow historical-reference review harness that can import or normalize Humdrum/MusicXML without becoming a committed corpus fixture.
2. Add annotation or pattern matching for subject entries before using historical entry metrics as reference bands.
3. Reclassify reference-profile aggregate readiness so it cannot satisfy beauty handoff without score-window evidence.
4. Adjust voice-pair scoring to penalize persistent duration lockstep and long pitch-class reinforcement unless `voicePairFunctions` explains the span.
5. Adjust entry-support generation to prefer carried support, prepared suspension, delayed support, and stable harmonic support around subject/answer entries.
6. Run A/B review against representative, boundary, rotation, and focused high-risk seeds, then compare the new bundle to the historical-reference observation.

## CI / Review Scope

Touched seeds and metrics:

* generated seeds `circle-fifths`, `contrary-motion`, `modal-cadence`, `tight-stretto`, `long-arc`, `modal-dorian`, `bright-answer`, and `bach-001`;
* historical sources `wtc1f01`, `wtc1f02`, `wtc1f06`, `wtc2f01`;
* `qualityVector.durationBasedLockstep`;
* `qualityVector.pitchClassUnisonDuration`;
* `qualityVector.entrySevereIntervalDuration`;
* `qualityVector.unresolvedEntrySevereIntervalDuration`;
* `referenceDiagnostics.outsideReferenceSeedCount`;
* future historical import and subject-entry annotation metrics.

Classification:

* generated local sentinels: `review-required`;
* historical import metrics: `review-required`;
* reference-profile aggregate readiness as beauty acceptance: `remove-or-archive`;
* future corpus ingestion and normalized reference summary: `ci-observed` only after import determinism and source metadata are stable;
* manual listening: `manual-listening`.

Reason: the musical symptoms are concrete, but historical import quality, subject-entry annotation, style profile, and local function classification are not yet stable enough for CI blocking.

Action:

* Insert Historical reference calibration before Infinite playback MVP.
* Keep operational playback work from hiding or smoothing these score-window signals.
* Promote only narrow deterministic regressions after repair evidence and false-positive behavior are known.

Evidence gap: no broad listening pass, no annotated historical entry set, no MusicXML/Humdrum production importer, and no post-repair A/B review bundle yet.

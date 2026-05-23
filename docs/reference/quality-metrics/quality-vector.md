# Quality Vector Metrics

Quality vector は Phase 13 以降の review/adoption model です。単独 metric の絶対しきい値を動かすのではなく、normalized axes、seed aggregate、local sentinel、A/B delta、manual listening gap をまとめて読むためのものです。

## Contract

* `qualityVector.schemaVersion` は current schema shape を表す。
* `qualityVector.modelVersion` は expected max、weight、sentinel logic の解釈 version を表す。
* `qualityProfileComparison` は seed set 全体の aggregate review summary であり、generator scoring ではない。
* `qualityVectorDistance` は weighted normalized axes の距離。改善 signal にはなるが、単独では採用条件にしない。

## Axes

| Axis | Meaning | Review focus |
| --- | --- | --- |
| `exactSamePitchUnisonDuration` | exact same-pitch overlap の合計 duration。 | 同じ MIDI pitch の重なりが声部独立を壊していないか。 |
| `pitchClassUnisonDuration` | octave 違いを含む pitch-class unison の合計 duration。 | 低声部や cross-register の長い重なり。 |
| `longestExactSamePitchSpan` | exact same-pitch overlap の最長連続 span。 | 短い doubling ではなく、耳につく持続か。 |
| `longestPitchClassUnisonSpan` | pitch-class unison の最長連続 span。 | bass-tenor、bass-alto、outer voices などの長い lockstep。 |
| `durationBasedLockstep` | 声部ペアが duration 単位で同時に動く量。 | exact unison でなくても rhythm と motion が固定化していないか。 |
| `sopranoRepeatedNotePressure` | soprano の同音反復 pressure。 | ornament や contour release なしに高声部が停滞していないか。 |
| `entrySevereIntervalDuration` | entry 周辺の severe intervals の duration。 | count ではなく聴感上の持続として読む。 |
| `unresolvedEntrySevereIntervalDuration` | resolution deadline までに説明されない severe interval duration。 | entry harmony の未解決 risk。 |

## Grouping Keys

Quality vector は axis だけでなく grouping key も見る必要があります。

* `styleProfile`: tonal、modal、popular-tolerant などを混ぜて hard gate にしない。
* `sectionRole`: exposition、episode、cadence、stretto-like などの役割で同じ値の意味が変わる。
* `voicePair`: low-voice pair と outer voices は聴感上の影響が違う。
* `voice` / `register`: soprano high register の repeated note は特に目立つ。
* `entryRole`: subject / answer / return の文脈で interval の扱いが変わる。

## Local Sentinels

Local sentinel は、aggregate が良くても局所的に耳につく欠陥を隠さないための summary です。

| Sentinel | Meaning |
| --- | --- |
| `long-exact-same-pitch-unison` | exact same-pitch unison が長く続く箇所。 |
| `long-pitch-class-unison` | pitch-class unison が長く続く箇所。 |
| `high-soprano-repeated-note-pressure` | high soprano の同音反復が ornament / contour release なしに続く箇所。 |
| `unresolved-entry-severe-interval` | entry 周辺の severe interval が解決されない箇所。 |

Sentinel は seed、section、voice pair、代表 tick、音楽的症状へ戻せる必要があります。戻せない model update は採用しないでください。

## Phase 13T Evidence Fields

`qualityVector.schemaVersion` 2 / `modelVersion` 2 adds explanation fields for Phase 13T. These fields do not replace the historical axes; they explain whether a broad axis is a musical improvement, diagnostic reclassification, or remaining review signal.

* `entrySonorities`: entry voice, support voices, beat strength, pitch-class unison stack, adjacent 2度/7度 friction, tritone exposure, preparation / passing evidence, unresolved accented clash, and resolution direction.
* `voicePairFunctions`: duration lockstep and pitch-class unison split into subject support, cadence support, sequence support, pedal-like support, mechanical coupling, exact collision, color doubling, and functional reinforcement.
* `fragmentFunctionEvidence`: repeated subject-fragment recurrence grouped by transformation, sequence pattern, cadence kind, and target mode.
* `counterSubjectWindows`: entry-local counter-subject voice, rhythm pattern, contour class, support collision count, and retention kind.
* `metricExplanations`: representative axis-to-score-window explanation with adoption meaning.

`qualityVector.schemaVersion` 3 / `modelVersion` 3 adds Phase 13U score-window evidence:

* `entryFormulaRecurrences`: repeated entry sonority formulas grouped by entry voice, section role, beat strength, support voices, sonority kinds, and resolution direction.
* `voicePairSpans`: localized exposed spans for exact collision, pitch-class reinforcement, color doubling, subject support, cadence support, sequence support, or mechanical coupling.
* `fragmentFunctionEvidence.transformationClaims`: transformation claims derived from transform, sequence, cadence, and target-mode context. These claims are evidence for review, not automatic proof of development.
* `counterSubjectWindows.preservationJudgement`: local judgement that separates preserved counter-subject windows from weak windows and accepted tradeoffs.
* `localSentinels.classification`: voice-pair sentinel classification when a long unison or reinforcement span has representative local evidence.

For Phase 13T and later, broad `durationBasedLockstep` or `pitchClassUnisonDuration` review-required status is not enough by itself to reject a model. Reviewers must check whether `voicePairFunctions` and `metricExplanations` show functional support or mechanical coupling.

Phase 13U adds a stricter adoption expectation on top of these fields: metric explanations must be checked against score-window musical judgement. A reference-profile pass or diagnostic reclassification does not prove beauty when repeated entry formulas, voice coupling, fragment sameness, or weak counter-subject identity remain audible or visible in the generated score.

Phase 13U completion keeps generated score output stable and records rejected generator repair evidence. A local entry-support pitch repair was not adopted because it worsened older musical guardrails. Reviewers should treat schema 3 as a truthfulness layer for later handoff, not as a claim that every remaining review signal has been fixed.

`qualityVector.schemaVersion` 4 / `modelVersion` 4 adds Phase 13V completion evidence:

* `phase13VReview.lineAgency`: independent, reinforcing, review-required, and ratio summaries for localized voice-pair spans.
* `phase13VReview.entryFormulaNovelty`: total, review-required, justified, and ratio summaries for repeated entry formulas.
* `phase13VReview.counterSubjectSurvivability`: preserved, accepted-tradeoff, weak, and ratio summaries for counter-subject windows.
* `phase13VReview.longWindowDevelopment`: fragment transformation claim counts and top function share for long-window contrast review.

Phase 13V treats these fields as generator-side adoption evidence, not only explanation. The completion baseline improves entry formula novelty, line agency, counter-subject preservation, and fragment-function concentration while keeping remaining review signals visible for Phase 13W, Phase 13X, Phase 13X2, Phase 13Y, and Phase 8.

Phase 13W keeps the quality vector schema at version 4 and adds `entryBoundaryContinuity` beside it in `GenerationDiagnostics`. Entry-boundary continuity evidence identifies synchronized outside-voice onsets at bass entry ticks and distinguishes delayed or carried support from mechanical section resets.

Phase 13X keeps the quality vector schema at version 4 and expands `entryBoundaryContinuity` to schema version 2 so first-bass-entry evidence is separate from post-exposition bass-entry evidence. This prevents post-exposition aggregate readiness from hiding the exposition bass-answer reset.

Phase 13Y keeps the quality vector schema at version 4 and generalizes `entryBoundaryContinuity` to schema version 3. The review focus is entry voice, entry order, already-entered voices, prepared collective articulation, carried support, suspension/resolution, delayed support, staggered continuation, synchronized reset, and unsupported entry-local thinning.

Phase 14 keeps the quality vector schema at version 4 and expands `entryBoundaryContinuity` to schema version 4. A first-bass or important-entry window with exactly one carried outside voice and two already-entered outside voices ending and re-articulating at the entry is classified separately as `one-voice-carry-with-outside-reset`. That evidence is review-required score-window acceptance evidence, not a hard CI blocker.

## Review Status

`quality-review-required` は失敗ではありません。Phase 13 は review/adoption model の整備であり、selected output を直接変えません。Phase 13Q 以降の生成変更では、quality vector distance、local sentinel regression、reference profile、manual listening gap を合わせて A/B adoption を判断します。

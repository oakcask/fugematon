# Adoption Policy For Quality Metrics

音楽品質の採否判断は、単独 metric の pass / fail ではなく、hard constraints、review signals、reference comparison、quality vector、manual listening を分けて扱います。

## Policy Classes

| Class | Meaning | Blocks adoption |
| --- | --- | --- |
| `hard-failure` | 生成結果の破綻、または schema / readiness を壊すもの。 | Yes |
| `review-required` | 音楽品質上の懸念。seed、section、声部、症状へ戻して読む。 | Not by itself |
| `warning` | diagnostics warning または古い gate 由来の注意。 | Not by itself |
| `manual` | manual listening / pairwise preference が必要な項目。 | Adoption evidence として扱う |

## Phase 7B Gate Policy

Phase 7B 以降、旧 Phase 5-7 の beauty gate は次のように再分類します。

Hard failure として残すもの:

* `rangeViolations`
* `voiceCrossings`
* `subjectIdentityViolations`
* `answerPlanViolations`
* `keyMetadataMismatches`
* `unresolvedDissonanceCount`
* `allVoiceSilenceGapCount`
* schema / summary shape の破損

Review signal へ降格するもの:

* voice independence: unison、same-pitch、shared rhythm、same direction motion。
* entry harmony: entry support instability、severe entry interval、unresolved severe interval。
* melody: leap recovery、melody cost、stepwise fixation、repeated pitch pressure。
* texture: solo texture、abrupt texture drop、solo voice imbalance。
* contour: bass-upper / outer-voice same-direction or contrary ratios。
* modal and subject quality: modal context、counter-subject identity、rhythmic independence。

この再分類は、音楽的問題を無視するためではありません。Phase 8/9 の operational work が hard constraints と再現性を保ったまま進められるようにし、音楽美は quality lane の evidence として扱うためです。

## A/B Review

Model adoption では、A/B summary の次の項目を合わせて読む。

* hard constraint failures が増えていない。
* `phase7BGate.phase8Ready` を失っていない。
* reference comparison の outside axes が説明可能である。
* `candidatePoolOracle` が、selection-only で直せる問題か generator / planner が必要な問題かを示している。
* `qualityVectorDistance` と axis-level contributors が改善または説明可能な tradeoff を示す。
* `localSentinelCount` と sentinel kind が unexplained regression を起こしていない。
* manual listening gap が残る場合は、採用根拠として未実施であることを明記する。

## Regression Notes

Metric regression を扱うときは、数値だけで判断しないでください。必ず次を記録します。

* affected seed。
* section、voice、voice pair、または representative location。
* 音楽的症状。
* tradeoff。
* response が generation、scoring、diagnostics、docs、manual listening のどこに属するか。

この記録は Phase doc または review doc に置き、一般的な指標定義はこの reference に戻してください。

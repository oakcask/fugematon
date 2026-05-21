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

Completed exception: Phase 13S は、Phase 13R 後の score review で確認した主題リズムの同型化、entry friction、voice lockstep、counter-subject identity、form metric の説明不足を Phase 8/9 前の開始条件へ昇格しました。この例外は、旧 Phase 6/7 beauty gate を復活させるものではなく、音楽的美しさを project core として扱い、metric が譜面上の良さを表現できているかを再検証するためです。既存モデル互換性、旧 guardrail margin、旧 expected values は、譜面上の改善と矛盾する場合は採用条件にしません。

Current exception: Phase 13T は、Phase 13S 後の current beauty audit で確認した entry sonority、voice-pair lockstep、pitch-class unison、fragment function、modal counter-subject identity を Phase 8/9 前の開始条件へ昇格します。全 seed にまたがる review signal は Phase 8 の表示課題へ降格せず、score-window evidence と focused listening が metric の説明力を確認するまで作曲モデル側の blocker として扱います。Phase 13T は generator repair と同じ優先度で metric reconstruction も扱い、既存 axis が音楽的原因を隠す場合は分割、改名、降格、削除、または local sentinel 化します。

## A/B Review

Model adoption では、A/B summary の次の項目を合わせて読む。

* hard constraint failures が増えていない。
* `phase7BGate.phase8Ready` を失っていない。
* reference comparison の outside axes が説明可能である。
* `candidatePoolOracle` が、selection-only で直せる問題か generator / planner が必要な問題かを示している。
* `qualityVectorDistance` と axis-level contributors が改善または説明可能な tradeoff を示す。
* `localSentinelCount` と sentinel kind が unexplained regression を起こしていない。
* Phase 13R subject-diversity repair では `subjectFamilyDiversity` の unique family count、top initial subject family share、top subject-fragment family share が改善または説明可能な tradeoff を示す。
* Phase 13S では subject rhythm / climax diversity、counter-subject family、entry-local dissonance role、voice-pair score windows、episode / stretto phrase function が、metric 改善の具体的な譜面症状を説明する。
* Phase 13T では entry-window sonority、voice-pair independence、fragment function、modal counter-subject windows、focused listening notes が、metric 改善または metric reconstruction の具体的な譜面症状を説明する。
* metric reconstruction がある場合は、old axis と new axis を同じ改善量として扱わず、何が reclassification で何が generated score の改善かを分けて記録する。
* manual listening gap が残る場合は、採用根拠として未実施であることを明記する。

## Regression Notes

Metric regression を扱うときは、数値だけで判断しないでください。必ず次を記録します。

* affected seed。
* section、voice、voice pair、または representative location。
* 音楽的症状。
* tradeoff。
* response が generation、scoring、diagnostics、docs、manual listening のどこに属するか。

この記録は Phase doc または review doc に置き、一般的な指標定義はこの reference に戻してください。

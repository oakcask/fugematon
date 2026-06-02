# Adoption Policy For Quality Metrics

音楽品質の採否判断は、単独 metric の pass / fail ではなく、hard constraints、review signals、reference comparison、quality vector、manual listening を分けて扱います。

## Policy Classes

| Class | Meaning | Blocks adoption |
| --- | --- | --- |
| `hard-failure` | 生成結果の破綻、または schema / readiness を壊すもの。 | Yes |
| `review-required` | 音楽品質上の懸念。seed、section、声部、症状へ戻して読む。 | Not by itself |
| `warning` | diagnostics warning または古い gate 由来の注意。 | Not by itself |
| `manual` | manual listening / pairwise preference が必要な項目。 | Adoption evidence として扱う |

## Review Gate Policy

`reviewGatePolicy` は旧 beauty gate を次のように再分類します。現在の review bundle は `reviewGatePolicy` のみを emit します。

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

Completed exception: Phase 13T は、Phase 13S 後の current beauty audit で確認した entry sonority、voice-pair lockstep、pitch-class unison、fragment function、modal counter-subject identity を Phase 8/9 前の開始条件へ昇格しました。全 seed にまたがる review signal は Phase 8 の表示課題へ降格せず、score-window evidence と focused listening が metric の説明力を確認するまで作曲モデル側の blocker として扱います。Phase 13T は generator repair と同じ優先度で metric reconstruction も扱い、既存 axis が音楽的原因を隠す場合は分割、改名、降格、削除、または local sentinel 化します。

Completed exception: Phase 13U は、Phase 13T 後の current beauty replan review で確認した repeated entry formula、voice coupling、fragment transformation 不足、modal counter-subject weakness、metric false readiness を Phase 8/9 前の開始条件へ昇格しました。Reference aggregate の green state や diagnostic reclassification は、譜面上の美しさを示す score-window evidence なしには採用根拠にしません。既存モデル互換性、旧 guardrail margin、旧 expected values は、譜面上の改善と矛盾する場合は採用条件にしません。

Completed exception: Phase 13V は、Phase 13U 後の score beauty audit で確認した line agency、entry formula recurrence、counter-subject survivability、long-run development、metric false acceptance を Phase 8/9 前の開始条件へ昇格しました。Metric explanation は adoption evidence ではありますが、美しさの証明ではありません。採用には、生成譜面の score-window improvement、focused listening note、long-window contrast evidence を合わせて必要とします。

Completed exception: Phase 13W は、Phase 13V 後の focused inspection で確認した bass entry 境界の外声同時再発音を Phase 8/9 前の開始条件へ昇格しました。これは playback attack を隠す課題ではなく、previous-note-aware entry support と entry-boundary continuity diagnostic で扱う生成側の問題です。採用には、22 seed score-window evidence、focused listening note、Phase 13V evidence を隠さない regression review を合わせて必要とします。

Completed exception: Phase 13Z は、Phase 13Y 後に確認した long-run phrase convergence を Phase 14/8/9 前の開始条件へ昇格しました。初期主題の多様性が改善しても、subject-return、episode、stretto-like が同じ subject-stem / fragment family へ戻り続ける場合、無限再生はその疲労を長時間化します。採用には windowed phrase-development diagnostics、focused seed evidence、`organ-default` / `strict-counterpoint` listening note、Phase 13X / Phase 13X2 / Phase 13Y の entry-continuity and tail-texture evidence を隠さない regression review を必要とします。

Completed exception: Phase 14 は、Phase 13Z 後に確認した metric false acceptance を Phase 8/9 前の開始条件へ昇格しました。Reference aggregate、quality vector、Phase 7B readiness は、譜面上の entry continuity、line agency、counter-subject survivability、phrase development を説明できる場合だけ美しさの採用 evidence として扱います。採用には score-window musical acceptance、focused seed evidence、`organ-default` / `strict-counterpoint` listening note、生成譜面の改善と metric reclassification の区別、seed / metric の CI-review scope 分類を必要とします。uncertain beauty signals は CI blocking ではなく `review-required` に残します。

Completed exception: Harmonic stasis rearticulation repair は、Episode motivic development 後に確認した motivic labels without harmonic tension / release と、functional support repair が導入する safe-pitch rearticulation を Phase 8/9 前の開始条件へ昇格しました。`harmonicStasisRearticulation` は repeated-note ban ではなく、same-voice short rearticulation、first-bass-answer handoff、all-free texture、functional-support provenance、harmonic-sonority classification を同じ score-window で読む review surface とします。採用には focused seed evidence、accepted context と generator-response の分類、候補選択と後処理のどちらで生じたかの区別、長音化で line agency を失っていないことの確認を必要とします。

## A/B Review

Model adoption では、A/B summary の次の項目を合わせて読む。

* hard constraint failures が増えていない。
* `reviewGatePolicy.adoptionReady` を失っていない。
* reference comparison の outside axes が説明可能である。
* `candidatePoolOracle` が、selection-only で直せる問題か generator / planner が必要な問題かを示している。
* `qualityVectorDistance` と axis-level contributors が改善または説明可能な tradeoff を示す。
* `localSentinelCount` と sentinel kind が unexplained regression を起こしていない。
* Phase 13R subject-diversity repair と Initial subject rhetoric diversity repair では `subjectFamilyDiversity` の unique family count、top initial subject family share、top-3 / top-5 initial subject family share、top subject-fragment family share が改善または説明可能な tradeoff を示す。
* Phase 13S では subject rhythm / climax diversity、counter-subject family、entry-local dissonance role、voice-pair score windows、episode / stretto phrase function が、metric 改善の具体的な譜面症状を説明する。
* Phase 13T では entry-window sonority、voice-pair independence、fragment function、modal counter-subject windows、focused listening notes が、metric 改善または metric reconstruction の具体的な譜面症状を説明する。
* Phase 13U では reusable entry formula、voice-pair coupling span、fragment transformation、modal counter-subject preservation、metric truthfulness が、metric movement ではなく生成譜面の改善として説明される。
* Phase 13V では line agency、entry-formula novelty、counter-subject survivability、adjacent-section contrast、long-window development、focused listening notes が、metric explanation と beauty acceptance の違いを説明する。
* Phase 14 では score-window musical acceptance、entry continuity、line agency、counter-subject survivability、phrase development、metric truthfulness が、reference aggregate や quality vector の green state より先に説明される。
* Harmonic stasis rearticulation repair では same-voice short rearticulation、first-bass-answer handoff、all-free texture、functional-support provenance、harmonic function、harmonic-sonority classification、line agency retention が、motivic derivation labels の有無より先に説明される。
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

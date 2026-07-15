# Reference Evaluation Learning Loop

Status: planned.

この計画は、Phase 10 から継続 quality lane に残っている実参照譜の取り込み、共通 feature extraction、blind A/B、pairwise preference model、shadow evaluation、active-learning queue を、一つの再現可能な改善ループとして実装完了する。

Human-facing playback、blind presentation、回答保存、resume、post-choice analysis の詳細要件は sibling [Pairwise Listening Review Tool](pairwise-listening-review-tool.md) が所有する。この計画の REL-3 は bundle と response schema、validation、model input boundary を所有する。

Bibliography claim: `reference-evaluation-learning-loop`。Theory inputs は `reference-corpus-and-generative-evaluation`、`common-practice-fugue-subjects`、`common-practice-fugue-episodes`、`species-dissonance-treatment` を使う。

## Decision Summary

評価を一つの beauty score に統合しない。採否は次の順序を維持する。

1. hard constraints と public contract failure を先に判定する。
2. score-window の高確信 `score-blocking` finding を判定する。
3. 参照作品と同じ vocabulary で正規化した reference-relative feature を比較する。
4. A/B preference model は hard failure を通過した候補の ranking と説明にだけ使う。
5. model uncertainty、out-of-distribution、local sentinel regression を採否 summary に残す。

最初の learned model は default generation を変更しない shadow model とする。人間の pairwise listening が未実施でも、corpus ingestion、feature extraction、A/B bundle、label validation、deterministic training、shadow report、active-learning queue が再現可能なら実装は完了できる。実データによる preference superiority と default selection への昇格は別の adoption decision とし、未聴取を phase completion blocker にしない。

## Goal

次の閉じたループを CLI と versioned data contract で実装する。

```text
reference scores -> normalized ScoreEvent -> contextual features -> reference profile
generated A/B    -> the same features     -> pairwise labels    -> shadow model
shadow report    -> uncertainty/disagreement queue              -> next A/B set
```

完了後は、評価モデルの変更ごとに、使った corpus、feature version、label set、model version、seed set、performance profile、採否理由を再構成できることを目標にする。

## Model Boundary And Invariants

* `packages/core` は生成と hard constraints の authority のままとする。
* 新しい純粋変換層は `packages/evaluation` に置き、DOM、WebAudio、MIDI encoder、外部 score parser に依存させない。
* corpus importer と A/B orchestration は CLI 側に置き、取り込み元固有の表現を core public contract に混ぜない。
* reference work、generated score、rejected candidate は同じ `EvaluationFeatureVector` を使うが、provenance と intended use を混同しない。
* chorale は局所的な four-part voice leading / harmony の参照には使えるが、fugue form の正例にはしない。
* Bach と generated output を直接分類する style discriminator は作らない。encoding、曲長、作曲家名などの shortcut feature を model input に入れない。
* train / validation / holdout は bar や window 単位ではなく、work、source、subject family、composer group を漏洩しない単位で分割する。
* raw external score、再配布不可 asset、個人情報、local path は model artifact、review bundle、docs に含めない。
* 新しい第三者依存を追加する場合は実装前に `dependency-review` を行う。first slice は in-repo の deterministic implementation を優先する。

## Structural Hypothesis

* Symptom: aggregate metric が green でも、entry continuity、line agency、counter-subject survivability、phrase development が弱い譜面を受け入れることがある。
* Repeated pattern: 同じ interval、unison、rhythm overlap でも、entry role、section role、metrical strength、voice-pair function によって音楽的な意味が変わる。
* Theory basis: `reference-corpus-and-generative-evaluation` と common-practice fugue source families は、局所 voice leading、thematic context、outer form / inner form を分けて読むことを支持する。
* Evidence strength: metric false acceptance は既存 review で confirmed。文脈付き feature が pairwise preference の予測を改善するという learned-model 部分は plausible で、未検証。
* Project response: global aggregate だけで学習せず、role-aware feature delta、local evidence pointer、uncertainty を model contract に含め、shadow A/B で仮説を検証する。

## Workstreams

### REL-1: Reference Corpus Manifest And Ingestion

参照作品の一覧、利用目的、出典、license / redistribution state、split ownership を versioned manifest として追加する。

Manifest の最低限の field:

* stable project-local `workId`。外部ファイル名や local path を id にしない。
* composer、work title、movement、voice count、key / mode、meter、source URL、source format。
* license id、redistribution status、attribution requirement、source checksum。
* `repertoireRole`: `four-voice-fugue`、`four-part-local-voice-leading`、`control`。
* `styleProfile` と、form feature に使えるか局所 feature のみに使えるか。
* `splitGroup` と `subjectFamilyGroup`。同じ作品由来の window を複数 split に入れない。
* import status、validation status、exclusion reason。

CLI importer は MusicXML または Humdrum `**kern` から、4 voice、tempo-independent tick、voice identity、key / meter metadata を持つ normalized reference score を作る。source annotation がない subject entry、section、cadence は推測値として provenance を分け、未確認 annotation を ground truth にしない。

Corpus scope:

* Bach WTC を中心に、権利と voice mapping を確認できる4声フーガを最初の fugal reference set とする。
* Bach 以外の4声フーガを composer holdout と style breadth に使う。
* chorale corpus は局所 harmony / voice-leading calibration に限定する。
* imported score 本体を commit できない場合も、manifest、checksum、取得手順、検証結果は再現可能にする。

Validation は少なくとも、4 voice identity、monotonic ticks、positive duration、pitch range、key / meter presence、checksum consistency、license metadata presence を確認する。失敗 message は error-message guideline に従い、searchable error id、影響、修正 action を含める。

REL-1 completion:

* Bach と Bach 以外を含む4声フーガ manifest があり、各 entry の利用目的と license / redistribution state が明示される。
* 少なくとも一つの再配布可能またはユーザー取得可能な source path から、複数作品を deterministic に import できる。
* work-level holdout と composer-level holdout を作れ、split leakage test が通る。
* invalid fixture が field-specific error id で reject される。

### REL-2: Shared Contextual Feature Schema

`packages/evaluation` に versioned `EvaluationFeatureVector` と feature extractor を追加する。既存 `qualityVector`、reference diagnostics、score-window acceptance を置き換えず、それらの音楽的 vocabulary を reference score と generated score の両方へ適用する共通層にする。

Feature groups:

* note / transition: melodic interval、leap recovery、non-chord role、preparation / resolution。
* voice pair: exact / pitch-class unison、parallel perfect interval、motion class、rhythmic lockstep、register spacing。
* entry window: subject / answer identity、support sonority、accented friction、resolution、counter-subject preservation、entry-boundary continuity。
* section: texture density、harmonic direction、episode derivation、cadence approach、adjacent-section contrast。
* whole score: entry distribution、subject return、form balance、phrase-family concentration、long-window development、terminal process。

すべての count は、適切な score quarters、active voice-pair quarters、entry count、section count、active window duration と raw numerator の両方を持つ。grouping key は `styleProfile`、`sectionRole`、`entryRole`、`voicePair`、`metricalStrength`、`harmonicFunction`、`transformation` を基本にする。

各 feature は次を持つ。

* stable feature id、schema version、semantic definition、normalizer。
* policy class: hard input、reference-relative、review-required、manual-only。
* representative evidence pointer: work / seed、section、tick、voices / roles。
* availability と confidence。推測 annotation の欠落を 0 と解釈しない。

REL-2 completion:

* 同じ normalized score から同じ feature bytes が得られる determinism test が通る。
* reference score と generated `ScoreEvent` の双方に同じ extractor を適用できる。
* transposition、tick scaling、voice relabeling のうち feature semantics 上 invariant であるべき synthetic controls が通る。
* global aggregate から representative score window へ戻れる。
* schema migration、unknown feature、missing annotation を明示的に扱える。

### REL-3: Blind A/B Review Surface

既存 `pnpm fugematon review` と `pairwise-preferences.json` を拡張し、同じ seed、subject input、style / writing / performance profile、length、render settings で baseline / variant を生成する blind A/B bundle を作る。

Human review UI は [Pairwise Listening Review Tool](pairwise-listening-review-tool.md) に実装する。REL-3 は tool が消費する blinded session manifest、immutable source assets、versioned response schema、label validator を提供し、UI state や local playback server を重複実装しない。

Pairwise record は次を扱う。

* blinded side ids。bundle 外の model metadata との対応は別 manifest に置く。
* `preferredSide`: `a`、`b`、`tie`、`cannot-judge`、`not-reviewed`。
* confidence、reason tags、free-form note、review timestamp は optional。
* reason tags は entry clarity、voice independence、harmony、form、repetition、cadence、rendering-only などの bounded vocabulary にする。
* reviewer id を使う場合は任意の project-local pseudonym とし、氏名やメールを要求しない。
* presentation order は seed から独立した deterministic randomization を使い、常に baseline を A にしない。

CLI は bundle generation、label validation、merge、deduplication、summary を提供する。training input は validated record だけを受け入れ、`not-reviewed`、`cannot-judge`、rendering-only preference を作曲 feature の勝敗 label に変換しない。

REL-3 completion:

* standard 22 seed と focused seed list の blind A/B bundle を再生成できる。
* side order、performance profile、model version、feature version、generator version が manifest に残る。
* tie、cannot-judge、reason tags、confidence、duplicate / conflicting label の fixture tests が通る。
* label が 0 件でも有効な listening gap として summary できる。

### REL-4: Deterministic Pairwise Evaluation Model

最初の model は feature delta を入力とする、説明可能な regularized pairwise logistic model とする。Bradley-Terry 型の勝率を出し、style profile intercept と bounded feature weights を持てるようにする。外部 ML runtime は追加せず、training と inference を同じ純粋 package に置く。

Model artifact の最低限の field:

* model schema / model version、feature schema version。
* training algorithm version、regularization、seed、iteration / convergence status。
* included label-set hashes、corpus manifest version、train / validation / holdout definition。
* feature weights、intercepts、normalization stats、unsupported / dropped features。
* validation log loss、pairwise accuracy、tie handling、calibration bins、per-style coverage。
* hard-constraint override prohibition と intended mode: `shadow` または `selection-candidate`。

重みの符号や範囲が理論と衝突する場合は自動採用せず review-required にする。特に range、voice crossing、subject identity、answer plan、key metadata、unresolved hard dissonance、all-voice silence は learned score の正値で相殺しない。

人間 label が不足している間は、synthetic fixture と既存 oracle / agent-review label で training pipeline の correctness だけを検証し、human preference accuracy と呼ばない。実 label を使う model は holdout work / composer / subject family を漏洩させず、baseline heuristic と比較する。

REL-4 completion:

* 同じ manifest、feature rows、labels、training seed から byte-stable model artifact を作れる。
* malformed、leaked、single-class、all-tie、empty-label dataset を安全に reject または no-model として報告できる。
* contribution breakdown から予測を feature delta と score-window evidence へ戻せる。
* hard failure fixture は preference probability に関係なく adoption-eligible にならない。
* model loader は unknown schema / feature version を fail closed で扱う。

### REL-5: Shadow Evaluation And Disagreement Report

Learned model を default selection に接続する前に、review bundle 上で shadow inference を行う。

Shadow summary は seed ごとに次を出す。

* predicted preference、margin、uncertainty、top positive / negative feature deltas。
* hard failures、reference outside axes、quality-vector delta、local sentinel delta。
* human / agent / oracle label がある場合の agreement または disagreement。
* out-of-distribution reason: missing feature、style coverage、corpus distance、unknown annotation。
* selection-only で改善できるか、generator / section planner response が必要か。

Model は shadow mode では ScoreEvent、candidate ordering、generator PRNG consumption、MIDI bytes を変えない。差分が出た場合は contract failure とする。

REL-5 completion:

* standard 22 seed の A/B summary に shadow prediction と explanation が出る。
* shadow on / off で generated ScoreEvent、MIDI、generator diagnostics が一致する。
* false-confidence fixture、missing-feature fixture、out-of-style fixture が uncertainty / OOD として残る。
* prediction と score-window judgement が衝突する例を review-required queue に送れる。

### REL-6: Active-Learning Queue And Adoption Loop

次の A/B review set を、単純な top-score 順ではなく、情報量と musical risk で選ぶ deterministic queue として実装する。

Priority inputs:

* prediction margin が小さい、または calibration uncertainty が大きい。
* human / agent / oracle / reference comparison が不一致。
* local sentinel regression または high-contribution feature がある。
* composer、style、subject family、meter、entry role、section role の coverage が不足している。
* model update で preference が反転した。
* fixed seed だけに偏らない rotation / boundary / adversarial coverage が必要。

Queue は同一 seed や同一 subject family の過剰選択を抑え、選択理由を各 comparison に記録する。label を追加した後、validate -> train -> shadow -> compare -> queue の一連を一つの CLI workflow で再実行できるようにする。

Default selection への model promotion はこの phase の自動結果にしない。promotion candidate は次をすべて満たす必要がある。

* hard failure、determinism、schema compatibility の regression がない。
* holdout pairwise result が baseline heuristic より改善し、confidence / coverage が記録される。
* reference-relative axis、local sentinel、subject diversity、long-window form に説明不能な regression がない。
* representative、boundary、rotation、adversarial seed の agent score review に未解決 `score-blocking` finding がない。
* model prediction を local musical evidence へ戻せる。

REL-6 completion:

* A/B labels の追加から次の prioritized bundle 生成までを再現できる。
* queue reason と stratum coverage が summary に残る。
* fixed 22 seed、rotation、boundary、adversarial、composer holdout のうち未充足 class を明示できる。
* model promotion を要求する場合は separate adoption review を生成し、shadow model を暗黙に default にしない。

## Implementation Order

1. REL-1 の manifest、license gate、normalized reference-score contract を固定する。
2. REL-2 の pure feature schema と generated/reference parity tests を作る。
3. REL-3 の blind bundle と label validator を既存 review CLI に接続する。
4. [Pairwise Listening Review Tool](pairwise-listening-review-tool.md) の local blind review、atomic save、resume、validated export を完成させる。REL-4 の fixture training は並行可能だが、REL-6 の human label loop completion は tool completion を必要とする。
5. REL-4 の deterministic training / inference と versioned artifact を fixture で完成させる。
6. REL-5 で standard seed bundle に shadow explanation を追加し、生成 bytes 不変を確認する。
7. REL-6 で disagreement / coverage から次回 comparison queue を作る。
8. corpus、seed、score-window、A/B をまとめた music-theory review を記録し、phase completion と将来の model adoption を分ける。

REL-1 と REL-2 が data contract の foundation である。REL-3 と REL-4 はその後並行可能だが、REL-5 は両方を必要とし、REL-6 は shadow report を必要とする。

## Verification Matrix

| Surface | Verification |
| --- | --- |
| Corpus | manifest schema、license metadata、checksum、4-voice mapping、split leakage、deterministic import |
| Features | reference/generated parity、transposition and timing controls、normalizer、evidence pointer、schema migration |
| A/B | blind side ordering、same generation/render context、label validation、merge/deduplication、empty listening gap |
| Model | deterministic fit、holdout isolation、calibration、explanation reconstruction、fail-closed schema handling |
| Shadow | ScoreEvent / MIDI byte invariance、22-seed summary、OOD、local sentinel and hard-gate preservation |
| Loop | deterministic priority queue、coverage constraints、label-to-next-bundle end-to-end test |
| Music | representative、boundary、rotation、adversarial seed score review; repertoire-facing spot checks; unresolved blocker localization |

## CI / Review Scope

| Surface | Classification | Reason and action |
| --- | --- | --- |
| manifest/schema/license/checksum/import determinism | `ci-blocking` | 再現性、provenance、合法な利用範囲を壊すため focused fixture を CI に置く。 |
| feature extraction determinism and schema compatibility | `ci-blocking` | model artifact の意味を壊すため synthetic controls を CI に置く。 |
| reference distribution values and model quality metrics | `review-required` | corpus composition と style に依存するため aggregate threshold を直接 CI failure にしない。 |
| shadow inference byte invariance | `ci-blocking` | shadow model が生成結果を変えてはいけない。 |
| A/B preference、focused listening、long-duration fatigue | `manual-listening` | 未実施 gap を残すが phase implementation completion を妨げない。 |
| active-learning queue coverage | `ci-observed` | queue shape と deterministic reason は検証し、実 label 分布の不足は review summary で扱う。 |

CI profile 内の musical fixture は一つの契約につき一 seed / focused window を基本とし、22 seed aggregate、corpus distribution、A/B、rotation は review harness に置く。

## Phase Completion Conditions

* REL-1 から REL-6 の completion 条件がすべて満たされる。
* [Pairwise Listening Review Tool](pairwise-listening-review-tool.md) の implementation completion conditions が満たされ、REL-3 response schema を JSON 手編集なしに生成できる。
* `packages/evaluation` と CLI workflow に public/versioned schema、focused tests、integration tests がある。
* corpus manifest、model artifact、A/B bundle、shadow summary、next-review queue が環境固有情報なしに再生成できる。
* standard 22 seed に加え、少なくとも representative、boundary、rotation、adversarial class を含む score review があり、未解決の高確信 `score-blocking` finding がない。
* reference work の spot check は feature extraction が entry、voice-leading、section、whole-form context を失っていないことを確認する。
* model update の数値変化を、generated score improvement、metric reclassification、diagnostics-only change に分けて記録する。
* manual pairwise listening が未実施なら `listening-gap` を残すが、実装を未完了にしない。
* learned model は shadow のままでもよい。default selection への昇格は separate adoption review と generator version decision を必要とする。
* implementation completion review を `docs/reviews/` に置き、この phase の claim、seed / corpus scope、CI classification、deferred adoption を更新する。

## Out Of Scope

* 外部 score の無条件な再配布。
* 全 WTC、全作曲家、全 style profile の完全 annotation。
* deep neural style discriminator、audio embedding、end-to-end waveform preference model。
* learned model による hard constraint、agent score blocker、license gate の上書き。
* A/B 回答数が少ない段階での統計的 superiority claim。
* shadow model の自動 default promotion。
* playback source、mix、sampler quality を作曲評価 feature として学習すること。

## Risks And Mitigations

* Corpus shortcut: composer、encoding、source、曲長を model input から外し、work/composer holdout を使う。
* Annotation error: inferred entry / section / cadence に provenance と confidence を持たせ、missing を zero にしない。
* Metric gaming: local evidence pointer、hard gate、score review、A/B disagreement を一緒に読む。
* Fixed-seed overfitting: rotation、boundary、adversarial、subject-family / composer holdout を queue に含める。
* Preference sparsity: empty / all-tie dataset を正しく扱い、pipeline completeness と preference superiority を分ける。
* Reviewer bias: blind side order、same performance profile、tie / cannot-judge、bounded reason tags を使う。
* Model drift: corpus、feature、label、model、generator の version と hashes を artifact に残し、前 model へ rollback できる。
* Dependency growth: first implementation は in-repo deterministic fit とし、外部 ML package は measured need と dependency review なしに追加しない。

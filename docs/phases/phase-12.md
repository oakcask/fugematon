# Phase 12: Phrase And Repetition Quality Rewrite

Phase 12 は、Phase 11 完了後も残った similar phrase blocker を扱う品質フェーズである。Phase 8/9 の無限再生、巻き戻し、UI 操作、Worker 化より先に実施する。

Status: planned.

## Rationale

Phase 11 は section grammar repetition と unsupported functional thinning を改善したが、22 seed post review では主題 family、subject fragment、modal/rotation seed の短い cycle が残った。詳細な evidence は [Phase 11 post-completion score review](../reviews/phase-11-post-review.md) に置く。

確認済み blocker:

* `angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal` では most repeated 4-section pattern count が 6-7 に残る。
* `subject-fragment 0-1-2-3`、`subject 0-2-1-3-4-3-2-1`、`subject 0-1-2-3-4-3-1-2` 系が seed 横断で頻出する。
* unsupported thinning と bass/root support の改善は、leap recovery、counter-subject identity、unison/shared rhythm、weak-beat resolution の悪化を伴う。
* candidate pool oracle は Phase 11 blocker の generator-needed rate が高く、selection-only scoring では上限が低い。

このため、Phase 12 は scoring weight の微調整ではなく、phrase family、motive development、harmonic rhythm、support counterpoint を作り直す。破壊的な生成モデル変更は許可する。ただし hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape は維持する。

## Scope

### 1. Phrase-family generator rewrite

* subject stem は metrical stress、local climax、cadence approach、leap recovery、answer transform compatibility を持つ。
* 同一 subject identity を守りながら、複数の derived stem を候補化する。
* `0-1-2-3` fragment と 4-3 折り返しだけに寄らないよう、family-level cap と function-specific derivation を入れる。
* modal family は tonal answer の派生ではなく、final、reciting tone、characteristic tone、modal cadence を持つ別 family として扱う。

### 2. Motive development grammar

* fragment は inversion、diminution、augmentation、sequence、tail extraction、rhythmic displacement のいずれかの derivation reason を持つ。
* repeated fragment は entry preparation、episode sequence、cadence extension、stretto compression、restatement のどれかとして機能を持つ。
* 同じ fragment が同じ function で続く場合は、random rotation ではなく high-risk phrase として扱う。

### 3. Phrase-level harmonic rhythm

* cadence target、strong-beat support、weak-beat non-chord-tone role、bass/root support、suspension preparation/resolution を note emission 前に決める。
* unresolved weak-beat non-chord tone と strong beat mismatch は、後処理の diagnostic ではなく phrase candidate の risk とする。
* style profile ごとに、strict-classical、modal、popular-tolerant の dissonance tolerance と cadence behavior を分ける。

### 4. Texture support as planned counterpoint

* functional support は active voice count を後から増やす処理ではなく、phrase unit の support role として生成する。
* support voice は contrary/oblique motion、pedal、suspension preparation、cadential preparation、echo のいずれかを持つ。
* support が unison/shared rhythm を増やす場合は、改善した thinning と悪化した voice independence を seed 別に記録して採否を決める。

### 5. Corpus-relative repetition profile

* subject recurrence、fragment recurrence、section pattern recurrence、phrase length、cadence spacing、density arc を reference profile と比較する。
* repetition はゼロ要求にしない。function-bearing repetition と mechanical repetition を分ける。
* Margulis、Temperley、Marlowe、Caplin、fugue voice-leading literature は policy source family として使う。個別ページや譜例を引用する場合は bibliography cache を更新する。

## Adoption Criteria

* 22 seed で hard constraint failure 0、Phase 7B readiness 維持、deterministic diagnostics 維持。
* `angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal` の most repeated 4-section pattern count と unique pattern count が改善する。
* entry pattern family concentration が下がり、top subject-fragment / subject family の横断頻度が減る。
* unsupported functional thinning を Phase 11 baseline より悪化させないか、悪化する場合は phrase function と聴感上の tradeoff を説明する。
* leap recovery、counter-subject identity、unison/shared rhythm、strong beat mismatch、weak-beat unresolved non-chord-tone の regressions を seed、section、音楽的症状で記録する。
* focused score review は `angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal`、`bach-001`、`fugue-smoke`、`minor-entry` を含める。

## Deferred Until After Phase 12

* Ring buffer replay、rewind、parameter-change meta event。
* Dedicated Web Worker、deadline、best-so-far fallback。
* UI slider による musical masking。
* runtime learned generator、black-box generation、外部 API 依存。

## Initial Work

1. Add repetition-family diagnostics for subject stem, answer transform, fragment derivation reason, phrase function, and section-state pattern.
2. Build phrase-family generator candidates without changing selected output, then compare oracle upper bound against Phase 11 current.
3. Select phrase families in focused seeds and run A/B review against Phase 11 current.
4. Add phrase-level harmonic rhythm and support counterpoint only after family diversity improves without hard constraint regressions.
5. Run 22 seed review bundle and update this phase with acceptance or rejected-experiment notes.

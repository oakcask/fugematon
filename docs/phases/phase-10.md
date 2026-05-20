# Phase 10: Quality Foundation First

Phase 10 は、操作機能より音楽美を優先して進めた品質基盤フェーズである。Phase 7B により Phase 8 は hard constraints と再現性の面では開始可能になったが、プロダクト判断として Phase 8/9 は deferred operational lane に送り、先に reference corpus、oracle、pairwise preference、section-local planner を整えた。

Status: complete. Phase 10 後の譜面レビューにより、現在の実装対象は Phase 8 ではなく [Phase 11](phase-11.md) の品質モデル再設計へ移す。Phase 10 後も、実 reference corpus ingestion、より広い section-local planner、manual pairwise listening、learned aesthetic score は継続 quality lane として残る。

## 目的

* reference diagnostics を metadata fixture から実 score 由来の profile へ進める。
* candidate pool oracle を、責務分類だけでなく model update の採否 evidence に接続する。
* 既存 pool で解ける問題は selection model、解けない問題は generator または section-local planner で扱う。
* manual listening と pairwise preference を、Phase completion blocker ではなく model 採否の evidence として使える形にする。
* 操作 UI やパラメータで音楽的な退屈さを隠す前に、生成器そのものの品質を上げる。

## Scope

### 先にやる

1. Phase 10 A/B review harness
   * baseline と variant を同じ review seed set で生成する。
   * `phase7BGate.phase8Ready`、hard failure count、reference comparison、candidate pool oracle、review signals を seed ごとに比較する。
   * summary は before/after の改善、悪化、tradeoff、未聴取 gap を残す。
2. Oracle-driven model update
   * oracle が `selection-model` と分類する blocker は scoring、tie-break、weight、Pareto guard の候補にする。
   * oracle が `generator-or-section-planner` と分類する blocker は weight tuning で押し切らず、candidate generation または section-local planner の候補を増やす。
3. Section-local planner quality pass
   * solo texture、density transition、codetta、stretto preparation、support voice を文脈つき候補として生成する。
   * second support voice は pitch class、octave、onset、duration、voice-pair lockstep、leap recovery、modal identity、outer-voice contour を同時に guard する。
   * PR3 の staged thinning 実験で見えた unison と same-pitch 悪化を再発させない。
4. Reference corpus ingestion slice
   * MusicXML または Humdrum の小集合を、source id、edition、license、import date つき manifest で扱う。
   * score file の再配布可否を確認できない source は metadata-only または local import 手順に留める。
   * active voice-pair duration、entry 数、section 数、曲長で normalized diagnostics を作る。
5. Pairwise preference lane
   * representative、boundary、rotation、adversarial seed の before/after MIDI と diagnostics を比較する。
   * automatic diagnostics だけで採否を決めず、manual note と pairwise preference を model update の evidence として残す。

### まだやらない

* Ring buffer replay、rewind、parameter-change meta event。
* Web Worker 化、deadline、best-so-far fallback。
* UI slider の追加。
* learned aesthetic score の本採用。必要な feature、profile、pairwise evidence が揃うまでは exploratory 扱いにする。

## 採用条件

Phase 10 の model update は、以下を満たす場合に採用候補にする。

* 代表 seed、境界 seed、rotation seed、adversarial seed の relevant subset で hard constraint failure が増えない。
* `phase7BGate.phase8Ready` を壊さない。
* review bundle schema、reference diagnostics summary、candidate pool oracle shape を壊さない。
* 改善対象の review signal が、複数 seed または明確な boundary seed で改善する。
* 悪化する review signal がある場合は、影響 seed、metric、音楽的 tradeoff、残る listening gap を docs に記録する。
* manual listening または pairwise preference が未実施の場合は、採否の残リスクとして明示する。

## Initial Slices

1. A/B review harness を追加し、現行 baseline と variant の比較 summary を生成できるようにする。
2. 既存 oracle で `selection-model` と分類される entry harmony、stepwise fixation、exact pitch lockstep の小さな selection update を検証する。
3. 既存 pool で解けない solo texture と density transition に対して、section-local candidate generation の最小 slice を設計する。
4. reference profile を実 score ingestion へ進める前に、metadata-only fixture と同じ axes で import manifest と normalized diagnostics の shape を固定する。
5. 代表 seed と境界 seed の pairwise preference template を、before/after 比較に使える形へ更新する。

## Implementation Notes

### A/B review harness

`review-ab` は baseline と variant の review bundle を同じ seed set で生成し、`comparison-summary.json` に seed ごとの diagnostics summary、reference comparison、candidate pool oracle、Phase 7B hard/review/manual policy、manual listening gap を残す。baseline と variant が同じ model の場合は差分なしの comparison として扱い、後続の model update が同じ shape へ evidence を追加する。

### Oracle selection model slice

`phase10-oracle-selection` は、既存 candidate pool 内で `selection-model` と分類される blocker だけを対象にした小さな selection model variant である。raw `totalCost` へ直接条件を足し続けないよう、entry harmony、free-counterpoint stepwise fixation、voice-pair lockstep、leap recovery preservation の risk adjustment を selection score helper に分けた。

検証 bundle:

```sh
pnpm fugematon review-ab --out samples/phase10-selection-model-update --ticks 129600 --baseline-label baseline --variant-label phase10-oracle-selection --variant-model phase10-oracle-selection
```

22 seed すべてで hard constraint failure、reference outside count、Phase 7B hard failure count、review signal count、`phase7BGate.phase8Ready` は baseline と同じだった。candidate pool viable candidate count は `bach-001` +2、`fugue-smoke` +2、`lyrical-line` +2、`circle-fifths` +3、`sparse-cadence` +2、`bright-answer` +1、`dark-episode` +3、`long-arc` +7、`quiet-cadence` +5、`contrary-answer` +1。`close-imitation` は -7、`ornament-test` は -2 で、既存候補の選択だけでは一部 seed の viable alternative margin を減らす tradeoff が残る。manual listening と pairwise preference は未実施のため、この variant は adoption candidate ではなく、次の reference manifest と section-local planner slice が比較するための evidence baseline とする。

### Reference corpus manifest slice

Reference corpus ingestion は、外部 score file を同梱せず、`PHASE_10_REFERENCE_CORPUS_MANIFEST` の structured JSON shape と validator で metadata-only/local-import source を扱う最小 slice に進めた。manifest record は source id、composer/title、edition、license、import date、format、redistribution policy、profile family、normalizer axes を固定し、`metadata-only` と `local-import-only` は score file redistributed を拒否する。

normalized diagnostics は manifest の axes から `createNormalizedReferenceDiagnostics` で source id、profile family、format、redistribution policy、normalizers、axis value の envelope を作る。今回の evidence は `pnpm test` で、manifest validation、redistribution policy、axis/normalizer mismatch、generated diagnostics からの normalized axis output を確認した。`pnpm lint` も通す。

残る gap: MusicXML/Humdrum の実 parser、reference score からの event mapping、subject entry detection、active voice-pair duration の実測、percentile reference profile derivation は未完了である。現時点の profile band は metadata fixture のままで、model 採否に使う実 corpus profile ではない。

### Section-local planner slice

`phase10-section-local-planner` は、`generator-or-section-planner` に分類される solo texture / density transition blocker へ進む最小の opt-in model である。既存 section 候補に加えて、continuity 後半へ staggered second support line を持つ section-local 候補を追加する。単純な 2 声追加で PR3 の unison、same-pitch、leap recovery、modal identity、outer-voice contour 悪化を再発させないよう、候補選択時には selected baseline candidate に対して high solo texture risk を十分に下げ、exact same-pitch、unison、shared rhythm、leap recovery、counter-subject identity、outer-voice contour を悪化させない候補だけを採用する。baseline と `phase10-oracle-selection` の挙動、review bundle schema、reference diagnostics summary、candidate-pool oracle shape は互換のまま残す。

検証 bundle:

```sh
pnpm fugematon review-ab --out samples/phase10-section-local-planner --ticks 129600 --baseline-label phase10-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase10-section-local-planner --variant-model phase10-section-local-planner
```

full 22 seed で review-ab を生成した。`phase7BGate.phase8Ready`、hard constraint failure、reference outside count、Phase 7B hard failure、review signal count は全 seed で baseline と同じだった。candidate pool viable candidate count は全 seed で +28 になり、oracle shape は維持された。selected output が変わった seed は `modal-cadence` と `dense-modal` に限られる。selected section solo texture risk 6 以上は full 22 seed 合計で 317 から 298、selected section solo texture risk 合計は 3188 から 3098 へ下がった。`modal-cadence` は high selected section solo texture risk が 16 から 10、leap recovery miss が 14 から 12 へ下がり、same-pitch 17、unison 576、shared rhythm 810、counter-subject identity 0.580、4拍 outer-voice same-direction 0 は維持された。`dense-modal` は high selected section solo texture risk が 16 から 3、max selected section solo texture risk が 8 から 6、leap recovery miss が 6 から 2、counter-subject identity が 0.586 から 0.618、4拍 outer-voice same-direction が 0.708 から 0.688 へ改善し、same-pitch 0、unison 585、shared rhythm 810 は維持された。

Music theory review: Fux/species counterpoint and Bach/common-practice fugue source families support treating the new line as a subordinate support voice rather than a parallel filler voice: it is staggered, lower velocity, and selected only when it avoids exact unison and lockstep while reducing unsupported solo texture. Modal / early-music source-family concerns are kept as guardrails rather than hard style claims: modal counter-subject identity must not fall, and the only adopted selected changes are modal seeds where identity is preserved or improved. Popular-music texture source-family reasoning supports density-transition review as long-run listener-fatigue evidence rather than a zero-solo absolute rule.

Tradeoffs and gaps: this is intentionally not a complete solo texture fix. The max selected section solo texture risk remains 8 for most seeds, and non-modal representative / boundary seeds keep their selected output unchanged. Manual listening and pairwise preference are still not performed; the evidence is diagnostics-backed and should be treated as adoption support for this narrow model slice, not as proof that the resulting MIDI wins a human preference test. Remaining Phase 10 work includes broader section-local candidates for non-modal episode/codetta/stretto preparation, pairwise preference notes, and real reference percentile profiles from imported scores.

### Pairwise preference lane

The final small Phase 10 lane keeps pairwise preference as an explicit review artifact instead of implying that automatic diagnostics completed the listening work. `review-ab` now writes a top-level `pairwise-preferences.json` beside `comparison-summary.json`. The template records the baseline and variant labels, selection models, seed/category, compared MIDI paths, compared diagnostics paths, preferred side, criteria, reason, and manual-listening status for each before/after seed comparison.

The generated template remains unreviewed by default: `preferredSide` is `not-reviewed`, all criteria are `not-reviewed`, the reason is empty, and each comparison carries an explicit manual-listening gap. The regular `review` bundle also keeps its pairwise preference template empty and unreviewed. This makes the review artifact ready for future human pairwise listening without fabricating a preference or treating diagnostics-only evidence as a completed listening pass.

Evidence for this lane is test coverage of the review bundle and A/B review output shape. The remaining gap is unchanged: actual human listening has still not been performed, so Phase 10 model adoption still needs manual pairwise notes before treating before/after MIDI as preference evidence.

## Completion Record

Phase 10 は以下の evidence により完了扱いにする。

* A/B review harness: `review-ab` は baseline と variant の diagnostics summary、reference comparison、candidate pool oracle、Phase 7B hard/review policy、manual listening gap、pairwise preference template を比較できる。
* Selection-model blockers: `phase10-oracle-selection` は entry harmony、stepwise fixation、voice-pair lockstep、leap recovery preservation の scoring / tie-break / guard 候補を opt-in selection model として残した。採用判断は default generator への即時昇格ではなく、後続の before/after evidence baseline として扱う。
* Generator-or-section-planner blockers: `phase10-section-local-planner` は solo texture / density transition へ section-local candidate generation を追加し、weight tuning だけで解決したことにしない。採用範囲は `modal-cadence` と `dense-modal` の selected output 改善に限定される。
* Compatibility subset: representative `bach-001`、boundary `minor-entry`、rotation `modal-cadence`、adversarial `dense-modal` で baseline、`phase10-oracle-selection`、`phase10-section-local-planner` が hard constraints、Phase 7B readiness、deterministic diagnostics、candidate evaluation schema versions、reference diagnostics summary、candidate-pool oracle shape を維持することを tests で固定した。
* Manual listening gap: `pairwise-preferences.json` は before/after の器を持つが、`preferredSide` は `not-reviewed` のまま残す。manual listening と pairwise preference は Phase 10 completion blocker ではなく、Phase 8 以降も model adoption evidence として継続する。

残る quality lane gap:

* MusicXML/Humdrum の実 parser、reference score event mapping、subject entry detection、active voice-pair duration の実測、percentile profile derivation は未完了。
* section-local planner は非 modal representative / boundary seed の selected output を広く改善していない。
* before/after MIDI の human pairwise preference は未入力であり、自動 diagnostics だけでは default model adoption を完了扱いにしない。
* learned aesthetic score は feature と manual preference evidence が揃うまで exploratory 扱いにする。

## Deferred Operational Lane

Phase 8/9 は削除しない。ただし Phase 10 後の譜面レビューで、音域分離、進行反復、終止感のない thinning、強拍/弱拍を意識しない和声設計が blocker と確認された。このため当時の実装対象は Phase 8 ではなく Phase 11 に移した。

* Phase 11: harmonic rhythm、subject family、section grammar、register planning、functional texture thinning を、破壊的変更も含めて再設計する。
* Phase 8: ring buffer replay、rewind、MVP sliders、parameter-change meta event。
* Phase 9: Dedicated Web Worker、deadline、best-so-far fallback。

Phase 8/9 へ戻る条件は後続 Phase で更新され、Phase 13S の music-beauty-first rewrite は完了した。現在は Phase 8 に戻る。

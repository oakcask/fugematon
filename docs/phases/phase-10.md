# Phase 10: Quality Foundation First

Phase 10 は、操作機能より音楽美を優先して進める品質基盤フェーズである。Phase 7B により Phase 8 は hard constraints と再現性の面では開始可能になったが、プロダクト判断として Phase 8/9 は deferred operational lane に送り、先に reference corpus、oracle、pairwise preference、section-local planner を整える。

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

## Deferred Operational Lane

Phase 8/9 は削除しない。Phase 10 で generator quality、reference profile、model adoption evidence が安定した後に戻る。

* Phase 8: ring buffer replay、rewind、MVP sliders、parameter-change meta event。
* Phase 9: Dedicated Web Worker、deadline、best-so-far fallback。

Phase 8/9 に戻る条件は、Phase 10 の採用済み model update が hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持していることである。

# Phase 8: 無限再生セッション MVP

Phase 8 は、Phase 13X2 の bass-answer-tail texture repair、Phase 13Y の generalized entry-continuity repair、Phase 13Z の long-run phrase-development repair、Phase 14 の score-led musical beauty rebuild、[Metrical generation repair](metrical-generation-repair.md)、そして [Texture continuity repair](texture-continuity-repair.md) 後に戻る operational lane である。`seed-1dxb2n8-1miapx7` の6-7小節で確認した harmonic-continuity blocker は [Phase 14 harmonic-continuity follow-up](phase-14.md#14c4-short-episode-harmonic-continuity-generation) で repaired score-window として記録済み。`seed-0i335vx-1n54a1x` の5小節目、9小節目、28小節目で確認した exposed free-counterpoint / one-outside tail blocker は Phase 8 の前に Texture continuity repair へ戻した。現在の目的は、無限再生セッションの実装範囲を広げることではなく、3 つの再生モードの musical / structural semantics と segment snapshot contract を決めることである。

Phase 13W は post-exposition bass entry の同時再発音を修正したが、exposition の初回 bass answer は review scope から外れていた。Phase 13X はこの初回 bass entry blocker を扱う。Phase 13Y は、その修理を bass 固有の規則に閉じず、entry voice、entry order、already-entered voices に基づく一般的な entry-boundary continuity model へ広げる。Phase 13Z は、初期主題の多様性改善後も残る long-run phrase convergence を subject-return、episode、stretto-like の発展不足として扱う。Phase 14 は、指標が譜面上の美しさを証明していない問題を score-window musical acceptance として扱い、ユーザー報告の short modulatory / pivot-harmony episode における harmonic-continuity failure も Phase 8 前に戻す。Metrical generation repair は、拍子 metadata が generator に渡らず 3/4 の譜面が三拍子として聞こえない問題を扱う。Texture continuity repair は、全声無音や bass-only collapse は避けても、one-outside bass-answer tail と exposed free-counterpoint solo が聴感上の thinning / filler として残る問題を扱う。Phase 8 のモード定義は、これらの review signal を境界 semantics で隠さず、segment 境界から生成を再開するための snapshot contract をモード semantics の一部として扱う。

詳細な route は [Phase 7+ 再編計画](phase-7-plus-reorg.md) を読む。品質指標の意味は [quality metrics reference](../reference/quality-metrics.md) を読む。

## Scope

* `continuous fugue`: 明確な曲間を作らず、主題の再現、断片化、転回、移調、episode、stretto-like section を続けるモードとして定義する。
* `endless program`: 個々の曲または segment は意味的に終止し、次の曲は前の主題 family、調性、密度、終止感、疲労度を受けて生成するモードとして定義する。
* `regenerative cycle`: segment ごとに終止感を持たせながら、主題や状態の記憶を残して次の section へ橋渡しするモードとして定義する。
* 初回生成は seed 文字列を generator へ直接渡すのではなく、空の bounded past event context と seed 文字列から initial segment snapshot を作る高水準 command として定義する。
* 各モードの segment 境界で保存すべき snapshot contract を定義する。snapshot には tick / timebase、mode、主題 family、answer transform、fragment derivation、調性領域、cadence preparation、density arc、novelty / fatigue budget、section planner state、未解決の voice / role continuity、PRNG internal state、generator が必要とする bounded past event context を含める。

## Completion Conditions

* `continuous fugue`、`endless program`、`regenerative cycle` の違いを、曲間、segment 終止、主題記憶、調性/密度/疲労度の引き継ぎ、section bridge の観点で説明できる。
* 3 モードそれぞれについて、境界が隠れるべき箇所、終止すべき箇所、前 segment の状態を引き継ぐべき箇所を定義できる。
* 空の bounded past event context と seed 文字列から initial segment snapshot を作り、generator がその snapshot から最初の segment を生成する流れを説明できる。
* 同じ `generatorVersion` で segment snapshot から次 segment の生成を始めた場合に、直前 segment 末尾から継続生成した結果と一致するために必要な内部状態を列挙できる。
* Generator が過去の譜面文脈を参照する範囲を定義し、その bounded past event context が snapshot 内の内部状態として復元できる。
* 3 モードの定義が、Phase 13Y、Phase 13Z、Phase 14、Metrical generation repair、Texture continuity repair の review signal を隠す設計になっていない。

## Handoff Baseline

* 通常生成経路が [Phase 13R](phase-13r.md) で採用した default model と一致し、legacy `baseline` へ暗黙に戻っていないことを確認する。
* Phase 13X の first bass entry score-window evidence、focused manual listening、検出された entry-boundary continuity 問題の修正と再レビューが完了している。
* Phase 13X2 の bass-answer-tail texture evidence、role-visible review output、focused listening、検出された post-answer thinning 問題の修正と再レビューが完了している。
* Phase 13Y の generalized entry-continuity evidence、non-bass entry-window review、alternate entry-order stress review、focused listening が完了している。
* Phase 13Z の long-run phrase-development evidence、subject-return / episode / stretto-like recurrence review、focused listening が完了している。
* Phase 14 の score-led beauty evidence、entry continuity、line agency、counter-subject survivability、phrase development、metric truthfulness review、harmonic-continuity follow-up、focused listening が完了している。
* Metrical generation repair の 3/4 / 6/8 meter-context evidence、`meterConsistencyReview`、focused listening が完了し、time-signature metadata と生成構造の不一致を 3 モード定義や後続の operational UI で隠さない。
* Texture continuity repair の exposed free-counterpoint solo evidence、first-bass-answer one-outside tail evidence、focused seed review、tradeoff classification が完了し、bass-answer tail thinning、unsupported solo texture、退屈な exposed formula を 3 モード定義や後続の operational UI で隠さない。

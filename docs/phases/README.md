# Plan Docs

実装計画、完了条件、実装記録です。現在の予定や open work を探す agent は、この索引から目的名で該当計画を選び、必要な文書だけ読んでください。

## Naming

* Current な計画名は、並び順や番号ではなく目的で付ける。例: `Infinite playback MVP`、`Score-led beauty handoff`。
* `Phase N` は履歴ラベル、既存ファイル名、完了記録の互換名として扱う。新しい計画や current index の primary label には使わない。
* 計画順を変える場合は、目的名を固定し、必要なら括弧で旧 Phase ラベルを残す。

## Read First

* [Infinite playback MVP](phase-8.md): 現在の operational target。旧 Phase 8。Score-led beauty handoff、Metrical generation repair、Texture continuity repair、Historical reference calibration、Episode motivic development 後に、`continuous fugue`、`endless program`、`regenerative cycle` の 3 再生モード semantics と segment snapshot contract を扱う。
* [Episode motivic development](episode-motivic-development.md): 完了済み品質 blocker。Historical reference calibration 後に、自由唱と episode を generic filler ではなく主題・応答・対主題から導かれる motivic development として扱った。
* [Score-led beauty handoff](phase-14.md): 完了済み品質 blocker。旧 Phase 14。`fugue-smoke` 第5小節の transition rhythm と第7小節の short-episode harmonic-continuity を、Infinite playback MVP の前に generalized score-window repair として扱った。
* [Historical reference calibration](historical-reference-calibration.md): 完了済み品質 blocker。探索的な Bach WTC diagnostics と現行生成 bundle の比較から、persistent voice-pair coupling、long pitch-class reinforcement、entry severe-interval pressure を Infinite playback MVP の前に扱った。
* [WebAudio synth interpretation follow-up](webaudio-synth-interpretation.md): Infinite playback MVP 後の rendering follow-up。`PerformanceProfile` の WebAudio envelope / velocity 解釈を調整し、生成譜面の欠陥を隠さず長時間再生の聴き取りやすさを改善する。
* [Texture continuity repair](texture-continuity-repair.md): 完了済み品質 blocker。`seed-0i335vx-1n54a1x` の5小節目、9小節目、28小節目で確認した bass-answer tail thinning、exposed free-counterpoint solo、退屈な solo formula を Infinite playback MVP の前に扱った。
* [Metrical generation repair](metrical-generation-repair.md): 完了済み handoff baseline。3/4 や 6/8 の time-signature metadata を generator、scoring、diagnostics へ接続し、譜面の拍子と聴感上の拍節感を揃えた品質 lane。
* [Quality-first reorg](phase-7-plus-reorg.md): Phase 12 以降の品質優先再編と Phase 8/9 defer の理由。

## Read When

* 実装対象の計画が分かっている場合は、その計画だけ読む。
* 計画 scope や実装順序を変える場合は、該当計画と [../reference/technical-plan.md](../reference/technical-plan.md) を合わせて読む。
* 指標の意味や採否 policy を確認する場合は、計画文書ではなく [../reference/quality-metrics.md](../reference/quality-metrics.md) を読む。
* Episode motivic development、Historical reference calibration、Score-led beauty handoff のレビュー根拠が必要な場合は [../reviews/README.md](../reviews/README.md) から最新レビューを選ぶ。

## Catalog

* 計画一覧、完了済み履歴、supersede 関係、古い Phase ラベルへの入口は [catalog.md](catalog.md) に置く。
* 履歴調査以外では、古い計画を順番に全部読まない。

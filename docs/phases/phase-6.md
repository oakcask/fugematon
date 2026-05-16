# Phase 6 実装メモ

Phase 6 では、Phase 5.11 で観察対象にした旋律線、entry 支持和声、装飾配置、フレーズ整形を、操作機能へ進む前の自動 gate として固定した。

## 実装内容

* entry 周辺の m2、M2、m7、M7 を severe entry interval として、既存の entry support instability から分けて診断する。
* severe entry interval は entry ごとの発生数と解決期限未達数を diagnostics に残す。
* 3 パート休止による solo texture は、solo run、unsupported solo run、abrupt texture drop、solo voice imbalance として診断する。
* solo run は cadence、section boundary、または段階的な thinning で支えられる場合だけ説明済みとして扱う。
* 装飾候補は密度だけでなく、entry ending、cadence approach、held note、phrase boundary との配置理由を diagnostics に残す。
* review bundle summary は schema version 4 として Phase 6 gate、severe entry interval、solo texture、ornament placement reason を出力する。
* `generatorVersion` は 2 に更新した。

## 完了条件

Phase 6 のリポジトリ上の自動完了条件は満たしている。

* 固定 review seed、rotation seed、adversarial seed は Phase 5.11 gate を維持する。
* 22 seed 全体で leap recovery、same pitch overlap、severe entry interval、unresolved severe entry interval、unsupported solo run、abrupt texture drop、solo voice imbalance が Phase 6 profile の閾値内に収まる。
* `ornamentPlacementReasons.total` が 0 にならず、装飾候補の配置理由を diagnostics と review bundle に残す。
* exposition duration と first continuation start tick を diagnostics gate で観察し、提示部から継続部への接続が review bundle で確認できる。
* `pnpm test` で Phase 6 gate を CI 対象にする。

## 持ち越し

Phase 6 後の音楽美レビューでは、自動 gate は全 seed で通過したが、entry 支持和声、旋律 contour、exact same-pitch unison、rhythmic lockstep、solo texture、形式の固定性がまだ十分ではないと判断した。追加の概形進行レビューでは、4 拍窓の bass と上声の同方向進行率が平均 0.555 で、複数パートが数拍単位で並行する偏りも確認した。詳細は [../reviews/phase-6-quality-review.md](../reviews/phase-6-quality-review.md) と [../reviews/phase-6-contour-motion-review.md](../reviews/phase-6-contour-motion-review.md) を参照する。

Phase 7 の前半では、評価説明力の前に entry 支持和声、旋律 contour、voice-pair/register placement、episode/continuation planner を改善する。旋律 contour では声部単体の大跳躍回収だけでなく、4 拍窓と 8 拍窓の bass-upper same-direction ratio、contrary ratio、outer-voice contour を diagnostics と scoring に入れる。候補評価の重みを dimension ごとに説明し、follow-up の理由を seed、section、voice、entry/cadence 周辺の単位で出す作業は、その後の Phase 7 後半で扱う。

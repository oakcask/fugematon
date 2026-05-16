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

Phase 6 は自動 gate の固定と、solo texture の説明可能性を扱う。候補評価の重みを dimension ごとに説明し、follow-up の理由を seed、section、voice、entry/cadence 周辺の単位で出す作業は Phase 7 で扱う。

手動聴取で見つかった旋律線、装飾、phrase boundary の違和感は、Phase 7 の評価説明力と pairwise preference の入力にする。

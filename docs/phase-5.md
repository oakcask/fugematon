# Phase 5 計画メモ

Phase 5 では、Phase 4 で安定させた主題と応答の意味論の上に、音楽的な美しさと対位法の技巧を追加する。目的は、主題以外の声部も旋律として成立し、episode と cadence が次の entry へ自然に向かう状態にすることである。

## 目的

* 持続音中心の counterpoint を、counter-subject と自由対位へ置き換える。
* 不協和の準備と解決、経過音、刺繍音、掛留をスコアリングする。
* episode に順次進行、反行、転回、ゼクエンツ、近親調への推移を持たせる。
* subject return の前後に cadence target を置く。
* 候補評価を、禁則コストだけでなく音楽的品質の複数軸で扱う。

## 実装範囲

* counter-subject pattern の生成と評価を追加する。
* 声部ごとの melodic contour score を追加する。
* vertical sonority score を追加する。
  * 強拍の安定度
  * 弱拍の経過音
  * 未解決不協和
  * 完全協和の過多
* episode generator を拡張する。
  * subject fragment sequence
  * contrary motion
  * inversion
  * sequential motion
  * local key target
* cadence plan を追加する。
  * state transition cadence
  * subject return preparation
  * modal cadence
* diagnostics に以下を追加する。
  * unresolved dissonance count
  * cadence target miss
  * counter-subject coverage
  * fallback passage count
  * melodic stagnation warning

## 完了条件

* 代表 seed で、counter-subject coverage が最低閾値を満たす。
* 強拍の不安定音と未解決不協和が、生成長に対する閾値内である。
* episode が次の local key または subject return へ向かう plan を持つ。
* subject return の前後で cadence target が diagnostics 上確認できる。
* 手動聴取で、主題以外の声部が単なる支え音ではなく旋律として認識できる。

## 対象外

* 操作パラメータの UI は Phase 6 で扱う。
* 生成探索の Worker 化は Phase 7 で扱う。
* 五線譜表示は別途必要性が固まってから扱う。

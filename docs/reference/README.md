# Reference Docs

要件、設計、技術計画の参照文書です。必要な設計面だけを選んで読んでください。

* [requirements.md](requirements.md): 外部的要件と技術的目標。
* [design.md](design.md): MVP フェーズ、内部表現、作曲と演奏 profile の分離、生成アルゴリズム、状態機械、モジュール分割。
* [quality-metrics.md](quality-metrics.md): 音楽品質指標、diagnostics、reference profile、quality vector、採否 policy、CI / review scope の入口。
* [bibliography/README.md](bibliography/README.md): 文献、引用、source-family 根拠、claim map の管理手順。
* [technical-plan.md](technical-plan.md): 技術計画の短い索引。詳細本文は [technical-plan-full.md](technical-plan-full.md)。

## 読む判断

* UI、再生、生成モデル、音楽的評価基準、作曲と演奏の責務境界を変える場合は design を読む。
* diagnostics、quality vector、reference profile、A/B adoption policy、seed/metric の CI 分類を確認する場合は quality-metrics を読む。
* 文献根拠が実装方針、quality gate、Phase scope、review 採否、ライセンス判断に影響する場合は bibliography を読む。
* コマンド、パッケージ境界、CI、diagnostics profile、データ形式を変える場合は technical-plan を読む。
* 仕様の優先順位や外部要件を確認する場合だけ requirements を読む。

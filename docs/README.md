# Fugematon Docs

フーガを奏でる無限オルゴール Fugematon プロジェクトの計画ドキュメントです。

AI agent は、まずこのファイルだけを読んでから、作業に必要な下位ドキュメントだけを開いてください。長い背景説明やレビュー本文は下位ディレクトリへ分けています。

## 読み分け

* 仕様や外部要件を確認する: [reference/requirements.md](reference/requirements.md)
* 設計思想、音楽モデル、状態機械を確認する: [reference/design.md](reference/design.md)
* 音楽品質指標、diagnostics、quality vector、採否 policy を確認する: [reference/quality-metrics.md](reference/quality-metrics.md)
* 文献、引用、source-family 根拠、claim map の管理手順を確認する: [reference/bibliography/README.md](reference/bibliography/README.md)
* API、CLI、CI、データ形式、実装順序を確認する: [reference/technical-plan.md](reference/technical-plan.md)
* CI、例外、警告、ログのエラーメッセージ設計を確認する: [reference/error-message-guidelines.md](reference/error-message-guidelines.md)
* 実装フェーズの計画や完了記録を確認する: [phases/README.md](phases/README.md)
* 音楽品質レビューの根拠を確認する: [reviews/README.md](reviews/README.md)

## Agent 向け最短ルート

* 予定や open work を探す場合は [phases/README.md](phases/README.md) を読み、該当 Phase だけ開く。
* Phase scope や実装順序を変える場合は [reference/technical-plan.md](reference/technical-plan.md) と該当 Phase メモを合わせて確認する。
* 指標の意味や採否上の扱いを確認する場合は [reference/quality-metrics.md](reference/quality-metrics.md) を読み、Phase 文書を一般定義として読まない。
* 文献根拠が実装方針、quality gate、Phase scope、review 採否に影響する場合は [reference/bibliography/README.md](reference/bibliography/README.md) から claim map と引用台帳を確認する。
* CI failure、例外、警告、ログの文言を追加または変更する場合は [reference/error-message-guidelines.md](reference/error-message-guidelines.md) を読む。
* 音楽品質 gate、seed、diagnostics の理由を変える場合は該当レビューを [reviews/README.md](reviews/README.md) から選ぶ。
* 履歴調査以外では、古い Phase や古いレビューを順番に全部読まない。

## プロジェクト概要

フーガを奏でる無限オルゴール Fugematon プロジェクト

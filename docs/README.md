# Fugematon Docs

AI agent は、まずこの入口だけを読み、作業に必要な文書だけを開いてください。古い phase / review 本文は docs 内にアーカイブせず、詳細履歴は Git 履歴で確認します。

## Read First

* 仕様や外部要件: [reference/requirements.md](reference/requirements.md)
* 設計思想、音楽モデル、状態機械: [reference/design.md](reference/design.md)
* 音楽品質指標、diagnostics、quality vector、採否 policy: [reference/quality-metrics.md](reference/quality-metrics.md)
* 文献、引用、source-family 根拠、claim map: [reference/bibliography/README.md](reference/bibliography/README.md)
* API、CLI、CI、データ形式、実装順序: [reference/technical-plan.md](reference/technical-plan.md)
* CI、例外、警告、ログのエラーメッセージ設計: [reference/error-message-guidelines.md](reference/error-message-guidelines.md)
* 現行計画と open work: [phases/README.md](phases/README.md)
* 現行 gate、diagnostics、品質判断の evidence: [reviews/README.md](reviews/README.md)

## Do Not Read First

* 完了済み phase や seed 固有レビューの本文を順番に探さない。
* 履歴だけが目的なら、docs に archive を作らず Git 履歴を見る。
* 指標や policy の current な意味を、削除済みの古い review から復元しない。まず `reference/` を読む。

# Plan Docs

実装計画、完了条件、実装記録です。現在の予定や open work を探す agent は、この索引から目的名で該当計画を選び、必要な文書だけ読んでください。

## Naming

* Current な計画名は、並び順や番号ではなく目的で付ける。例: `Infinite playback MVP`、`Score-led beauty handoff`。
* `Phase N` は履歴ラベル、既存ファイル名、完了記録の互換名として扱う。新しい計画や current index の primary label には使わない。
* 計画順を変える場合は、目的名を固定し、必要なら括弧で旧 Phase ラベルを残す。

## Read First

* [Endless program terminal coda historical style repair](endless-program-terminal-coda-historical-style-repair.md): completed target. Replaces fixed all-voice long-tone terminal coda generation with context-aware historical ending archetypes and coda-continuity review evidence.
* [Continuous fugue boundary carry planning](continuous-fugue-boundary-carry-planning.md): completed target. Follows the completed segment-continuity repair by making hidden boundaries preserve audible line / harmony carry, not only avoid exposition reset.
* [Endless program terminal coda planning](endless-program-terminal-coda-planning.md): completed target. Replaces the short terminal-boundary sonority override with planner-visible coda generation for `endless-program` segment endings.
* [Continuous fugue segment continuity planning](continuous-fugue-segment-continuity-planning.md): completed target. Connects `continuous-fugue` segment chaining to the snapshot contract so hidden boundaries do not restart exposition or reset the piano-roll experience.

## Read When

* 実装対象の計画が分かっている場合は、その計画だけ読む。
* 計画 scope や実装順序を変える場合は、該当計画と [../reference/technical-plan.md](../reference/technical-plan.md) を合わせて読む。
* `endless-program` の coda が全声部ロングトーン化する問題を扱う場合は [Endless program terminal coda historical style repair](endless-program-terminal-coda-historical-style-repair.md) を読む。
* 直前の terminal cadence validation と Web UI chaining 完了記録を確認する場合は [Endless program terminal cadence validation](endless-program-terminal-cadence-validation.md) を読む。
* Phase 12 以降の品質優先再編や Phase 8/9 defer の理由を確認する場合は [Quality-first reorg](phase-7-plus-reorg.md) を読む。
* 指標の意味や採否 policy を確認する場合は、計画文書ではなく [../reference/quality-metrics.md](../reference/quality-metrics.md) を読む。
* 完了済み計画、supersede 関係、旧 Phase ラベル、完了 evidence が必要な場合は [catalog.md](catalog.md) から該当項目を選ぶ。
* 品質 blocker や完了レビューの根拠が必要な場合は [../reviews/README.md](../reviews/README.md) から最新レビューを選ぶ。

## Catalog

* 計画一覧、完了済み履歴、supersede 関係、古い Phase ラベルへの入口は [catalog.md](catalog.md) に置く。
* 履歴調査以外では、古い計画を順番に全部読まない。

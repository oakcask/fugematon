# Plan Docs

実装計画、完了条件、実装記録です。現在の予定や open work を探す agent は、この索引から目的名で該当計画を選び、必要な文書だけ読んでください。

## Naming

* Current な計画名は、並び順や番号ではなく目的で付ける。例: `Infinite playback MVP`、`Score-led beauty handoff`。
* `Phase N` は履歴ラベル、既存ファイル名、完了記録の互換名として扱う。新しい計画や current index の primary label には使わない。
* 計画順を変える場合は、目的名を固定し、必要なら括弧で旧 Phase ラベルを残す。

## Read First

* [Generator constraint rebuild](generator-constraint-rebuild.md): in-progress architecture rewrite. Freezes current-contract hard constraints and public schema while moving generation toward deterministic local constraint solving and diagnostics-backed soft scoring.
* [Constrained keyboard writing profiles](constrained-keyboard-writing-profiles.md): completed follow-up. Adds opt-in `WritingProfile` variants for piano, harpsichord, and programmable music boxes so pitch range, hand reach, and mechanism limits can constrain generation separately from playback `PerformanceProfile`.
* [Initial subject rhetoric diversity repair](initial-subject-rhetoric-diversity-repair.md): completed quality follow-up. Replaces adopted-path fixed-profile subject selection with a constrained subject-rhetoric generator and extends top-N rhetoric diagnostics.
* [Playback source realism feasibility](playback-source-realism-feasibility.md): investigation note. Compares a SpessaSynth + SoundFont pilot, a custom VSCO WAV sampler, and notices-page requirements before distributing third-party playback software or audio assets.
* [Endless program terminal stretta planner](endless-program-terminal-stretta-planner.md): planned follow-up. Treats the current coda as cadence-safe but still potentially appended, and plans a coda-specific terminal process with stretta as the preferred fugal ending when constraints allow it.
* [Endless program coda quality repair](endless-program-coda-quality-repair.md): completed current target. Makes `final-fragment-entry` and `pedal-entry-cadence` review-visible, extends coda-continuity diagnostics to schema version 2, and keeps archetype diversity review-required rather than a CI hard gate.
* [Endless program terminal coda historical style repair](endless-program-terminal-coda-historical-style-repair.md): completed target. Replaces fixed all-voice long-tone terminal coda generation with context-aware historical ending archetypes and coda-continuity review evidence.
* [Continuous fugue boundary carry planning](continuous-fugue-boundary-carry-planning.md): completed target. Follows the completed segment-continuity repair by making hidden boundaries preserve audible line / harmony carry, not only avoid exposition reset.
* [Endless program terminal coda planning](endless-program-terminal-coda-planning.md): completed target. Replaces the short terminal-boundary sonority override with planner-visible coda generation for `endless-program` segment endings.
* [Continuous fugue segment continuity planning](continuous-fugue-segment-continuity-planning.md): completed target. Connects `continuous-fugue` segment chaining to the snapshot contract so hidden boundaries do not restart exposition or reset the piano-roll experience.

## Read When

* 実装対象の計画が分かっている場合は、その計画だけ読む。
* 生成器を post-generation repair から制約 solver へ置き換える作業、hard/soft/review gate の分離、legacy exact expected value の扱いを確認する場合は [Generator constraint rebuild](generator-constraint-rebuild.md) を読む。
* ピアノ、チェンバロ、オルゴール向けの音域、手の届きやすさ、機構制約、`WritingProfile` / `PerformanceProfile` 境界を扱う場合は [Constrained keyboard writing profiles](constrained-keyboard-writing-profiles.md) を読む。
* 主題が seed 横断で似通う問題、初期主題候補、主題 family / rhetoric diversity diagnostics を扱う場合は [Initial subject rhetoric diversity repair](initial-subject-rhetoric-diversity-repair.md) を読む。
* 再生音源、SoundFont、サンプラー、音源ライセンス表示を扱う場合は [Playback source realism feasibility](playback-source-realism-feasibility.md) を読む。
* 計画 scope や実装順序を変える場合は、該当計画と [../reference/technical-plan.md](../reference/technical-plan.md) を合わせて読む。
* `endless-program` の coda が取ってつけた終止に聞こえる問題や、曲末 stretta を優先する設計を扱う場合は [Endless program terminal stretta planner](endless-program-terminal-stretta-planner.md) を読む。
* `endless-program` の coda archetype diversity、final subject、pedal-supported close を扱う場合は [Endless program coda quality repair](endless-program-coda-quality-repair.md) を読む。
* `endless-program` の coda が全声部ロングトーン化する問題を扱う場合は [Endless program terminal coda historical style repair](endless-program-terminal-coda-historical-style-repair.md) を読む。
* 直前の terminal cadence validation と Web UI chaining 完了記録を確認する場合は [Endless program terminal cadence validation](endless-program-terminal-cadence-validation.md) を読む。
* Phase 12 以降の品質優先再編や Phase 8/9 defer の理由を確認する場合は [Quality-first reorg](phase-7-plus-reorg.md) を読む。
* 指標の意味や採否 policy を確認する場合は、計画文書ではなく [../reference/quality-metrics.md](../reference/quality-metrics.md) を読む。
* 完了済み計画、supersede 関係、旧 Phase ラベル、完了 evidence が必要な場合は [catalog.md](catalog.md) から該当項目を選ぶ。
* 品質 blocker や完了レビューの根拠が必要な場合は [../reviews/README.md](../reviews/README.md) から最新レビューを選ぶ。

## Catalog

* 計画一覧、完了済み履歴、supersede 関係、古い Phase ラベルへの入口は [catalog.md](catalog.md) に置く。
* 履歴調査以外では、古い計画を順番に全部読まない。

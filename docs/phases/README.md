# Phase Docs

実装フェーズの計画、完了条件、実装記録です。現在の予定や open work を探す agent は、この索引から該当 Phase だけ読んでください。

## 現在読むもの

* [Phase 7+ 再編計画](phase-7-plus-reorg.md): Phase 12 後に Phase 12P、Phase 13、Phase 13Q を挟み、その後 Phase 8/9 operational lane へ戻る現在計画を確認する。
* [Phase 13Q](phase-13q.md): planned。Phase 8/9 の UI・操作機能へ戻る前に、candidate diversity、voice independence、entry harmony を改善する品質フェーズ。
* [Phase 13](phase-13.md): 完了済み。Phase 12 human feedback 後の、quality vector と統計的 review/adoption model。
* [Phase 12P](phase-12-performance-profile.md): 完了済み。Phase 13 の前に、MIDI と WebAudio が共有する演奏プロファイル境界を組み込んだ infrastructure phase。
* [Phase 12](phase-12.md): 完了済みの、Phase 11 後に残った similar phrase blocker を Phase 8/9 より前に扱った品質フェーズ。
* [Phase 11](phase-11.md): 完了済みの、無限再生・操作機能の前に必要な音楽品質モデル再設計と残る quality lane を確認する。
* [Phase 10](phase-10.md): 完了済みの reference corpus、oracle-driven model update、section-local planner、pairwise preference 品質基盤と、継続 quality lane の gap を確認する。
* [Phase 7](phase-7.md): 概形進行 diagnostics、candidate scoring、review schema version 5、Phase 7 前半の完了記録。
* [Phase 6](phase-6.md): 旋律線、entry 支持和声、装飾配置、solo texture の自動 gate と完了記録。
* [Phase 5](phase-5.md): Phase 5 の短い索引。詳細本文は [phase-5-plan.md](phase-5-plan.md)。

## 過去フェーズ

* [Phase 4](phase-4.md): 主題同一性、調性モデル、応答計画、entry plan の実装記録。
* [Phase 0](phase-0.md): core API、CLI、PRNG、時間モデル、決定性テスト。
* [Phase 1](phase-1.md): 固定長4声 exposition、diagnostics、MIDI、代表 seed CI 検証。
* [Phase 2](phase-2.md): ブラウザ再生、WebAudio、Canvas 2D ピアノロール、seed 再現。
* [Phase 3](phase-3.md): 継続生成、候補スコアリング、長尺 diagnostics、主題 entry 強調、既知の音楽的制約。

## 読む判断

* 現在の実装対象を見る場合は [Phase 7+ 再編計画](phase-7-plus-reorg.md) を先に読み、次の品質作業は [Phase 13Q](phase-13q.md)、quality vector の完了 evidence は [Phase 13](phase-13.md) と [../reviews/phase-13-quality-vector-review.md](../reviews/phase-13-quality-vector-review.md) を読む。Phase 8/9 は Phase 13Q 後に戻る operational lane として読む。
* Phase 10 の完了条件、採用条件、review evidence、残る listening gap を見る場合は [Phase 10](phase-10.md) を読む。
* 実装対象の Phase が分かっている場合は、その Phase だけ読む。
* Phase 5 の品質根拠が必要な場合は、本文中のリンクから該当レビューへ進む。
* Phase scope を変更する場合は、[../reference/technical-plan.md](../reference/technical-plan.md) も確認する。

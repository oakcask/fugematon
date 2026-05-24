# Plan Catalog

計画一覧と履歴調査用の入口です。現在の作業対象を探すだけなら [README.md](README.md) に戻ってください。

Current な表示名は目的名を primary label にし、`Phase N` は旧ラベルまたは履歴ラベルとして残します。並び替えや挿入が起きても、計画の identity は目的名で追跡してください。

## Current Lane

* [Texture continuity repair](texture-continuity-repair.md): 現在の品質 blocker。`seed-0i335vx-1n54a1x` で確認した bass-answer tail one-outside support、exposed free-counterpoint solo、露出した stock formula を Infinite playback MVP の前に扱う。
* [Infinite playback MVP](phase-8.md): Texture continuity repair 後の operational target。旧 Phase 8。Score-led beauty harmonic-continuity follow-up、Metrical generation repair、Texture continuity repair の review-required tradeoff を見える状態に保ちながら、無限再生セッション、境界設計、内部状態 visualizer の MVP を扱う。
* [Score-led beauty handoff](phase-14.md): 完了済み品質 follow-up。旧 Phase 14。`seed-1dxb2n8-1miapx7` の6-7小節で確認した harmonic-continuity blocker を、Infinite playback MVP の前に score-window review と generator/scoring response で修正した。
* [Metrical generation repair](metrical-generation-repair.md): 完了済み handoff baseline。`seed-0kowcm6-0am7x3f` で確認した 3/4 metadata と聴感上の拍節感の不一致を、generator、scoring、diagnostics の meter context 接続として扱った。
* [Playback worker stability](phase-9.md): 旧 Phase 9。Infinite playback MVP 後の Worker 化、生成期限、fallback、長時間 visualizer stability。

## Quality Lane

* [Phase 13Z](phase-13z.md): 完了済み。Phase 13Y 後に、初期主題の多様性改善後も残る long-run phrase convergence を、subject-return / episode / stretto-like の発展不足として Phase 8 前に扱った。
* [Phase 13Y](phase-13y.md): 完了済み。Phase 13X2 完了後、entry-boundary continuity を bass 固有ではなく、entry voice、entry order、already-entered voices に基づく一般モデルへ広げた。
* [Phase 13X2](phase-13x2.md): 完了済み。Phase 13X が直した entry 境界ではなく、ユーザー報告の本命と見られる first bass answer 後の free-counterpoint tail thinning と、piano-roll role visibility を扱った。
* [Phase 13X](phase-13x.md): 完了済み。Phase 13W が除外していた exposition の初回 bass answer で外声 3 声が同時に切れて再発音する問題を扱った。
* [Phase 13W](phase-13w.md): 完了済みだが Phase 13X に handoff を supersede された。Phase 13V 後に確認された post-exposition bass entry 境界で外声 3 声が同時に再発音する問題を generator と diagnostics で修正した。
* [Phase 13V](phase-13v.md): 完了済み。Phase 13U 後の譜面レビューで見つかった line agency、entry formula recurrence、counter-subject survivability、long-run development の問題を Phase 8 前に扱った。Phase 13W が entry-boundary continuity を追加で扱う。
* [Phase 13U](phase-13u.md): 完了済みだが Phase 13V に handoff を supersede された品質フェーズ。score-window truthfulness layer と rejected generator experiment を確認する。
* [Phase 13T](phase-13t.md): 完了済みの品質フェーズ。Phase 13S 後の再レビューで見つかった entry sonority、voice lockstep、pitch-class unison、fragment function、modal counter-subject identity を Phase 8 前に修正した。
* [Phase 13S](phase-13s.md): 完了済みの品質フェーズ。音楽的美しさを核心として、主題リズム、entry friction、指標の説明力を互換性制約なしに再設計した。Phase 13T の入力になる remaining voice-pair lockstep と pitch-class unison も記録する。
* [Phase 13R](phase-13r.md): default-baseline adoption と post-listening repair は実装済み。Phase 13S の入力になる subject-fragment vocabulary collapse と listening artifact gap もここで確認する。
* [Phase 13Q](phase-13q.md): automatic adoption complete; manual listening follow-up remains open。Phase 13R の前に、candidate diversity、voice independence、entry harmony を改善した品質フェーズ。
* [Phase 13](phase-13.md): 完了済み。Phase 12 human feedback 後の、quality vector と統計的 review/adoption model。
* [Phase 12P](phase-12-performance-profile.md): 完了済み。Phase 13 の前に、MIDI と WebAudio が共有する演奏プロファイル境界を組み込んだ infrastructure phase。
* [Phase 12](phase-12.md): 完了済みの、Phase 11 後に残った similar phrase blocker を Phase 8/9 より前に扱った品質フェーズ。
* [Phase 11](phase-11.md): 完了済みの、無限再生 operational lane の前に必要な音楽品質モデル再設計と残る quality lane を確認する。
* [Phase 10](phase-10.md): 完了済みの reference corpus、oracle-driven model update、section-local planner、pairwise preference 品質基盤と、継続 quality lane の gap を確認する。
* [Phase 7](phase-7.md): 概形進行 diagnostics、candidate scoring、review schema version 5、Phase 7 前半の完了記録。
* [Phase 6](phase-6.md): 旋律線、entry 支持和声、装飾配置、solo texture の自動 gate と完了記録。
* [Phase 5](phase-5.md): Phase 5 の短い索引。詳細本文は [phase-5-plan.md](phase-5-plan.md)。

## Earlier Phases

* [Phase 7+ 再編計画](phase-7-plus-reorg.md): Phase 12 後に Phase 12P、Phase 13、Phase 13Q、Phase 13R、Phase 13S、Phase 13T、Phase 13U、Phase 13V、Phase 13W、Phase 13X、Phase 13Y、Phase 13Z、Phase 14 を挟み、音楽美を Phase 8/9 より優先した計画を確認する。
* [Phase 4](phase-4.md): 主題同一性、調性モデル、応答計画、entry plan の実装記録。
* [Phase 0](phase-0.md): core API、CLI、PRNG、時間モデル、決定性テスト。
* [Phase 1](phase-1.md): 固定長4声 exposition、diagnostics、MIDI、代表 seed CI 検証。
* [Phase 2](phase-2.md): ブラウザ再生、WebAudio、Canvas 2D ピアノロール、seed 再現。
* [Phase 3](phase-3.md): 継続生成、候補スコアリング、長尺 diagnostics、主題 entry 強調、既知の音楽的制約。

## Review Links

* 現在の品質 blocker を見る場合は [Texture continuity repair](texture-continuity-repair.md) と [../reviews/texture-continuity-replan.md](../reviews/texture-continuity-replan.md) を読む。
* operational target を見る場合は [Infinite playback MVP](phase-8.md) を読む。直前の品質 handoff baseline は [Score-led beauty handoff](phase-14.md)、[../reviews/phase-14-harmonic-continuity-generation.md](../reviews/phase-14-harmonic-continuity-generation.md)、[Metrical generation repair](metrical-generation-repair.md)、[../reviews/metrical-generation-repair-completion.md](../reviews/metrical-generation-repair-completion.md)、[Texture continuity repair](texture-continuity-repair.md) を読む。
* Phase 13Z の完了 evidence は [Phase 13Z](phase-13z.md) と [../reviews/phase-13z-completion-review.md](../reviews/phase-13z-completion-review.md)、計画根拠は [../reviews/phase-13z-long-run-phrase-review.md](../reviews/phase-13z-long-run-phrase-review.md) を読む。
* 直前の Phase 13Y 完了 evidence は [Phase 13Y](phase-13y.md) と [../reviews/phase-13y-completion-review.md](../reviews/phase-13y-completion-review.md)、計画根拠は [../reviews/phase-13y-entry-continuity-generalization.md](../reviews/phase-13y-entry-continuity-generalization.md) を読む。
* Phase 10 の完了条件、採用条件、review evidence、残る listening gap を見る場合は [Phase 10](phase-10.md) を読む。
* Phase 5 の品質根拠が必要な場合は、本文中のリンクから該当レビューへ進む。

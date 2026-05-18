# Review Docs

音楽品質レビューと、計画再編の根拠です。レビュー本文は長いため、agent は現在の判断に関係するものだけ読んでください。

音楽理論上のレビューを行う場合は、`music-theory-review` skill を使い、Fux 的な対位法を起点にしつつ、クラシック、ジャズ、ポピュラー音楽の文献調査と seed 横断の evidence を合わせて残してください。

music-quality gate、diagnostics threshold、generator model、candidate scoring model、evaluation weights、section/planner model を変える場合、agent は人間の聴取完了を待たずに、関連する複数 seed の生成譜面を楽典的にレビューしてください。代表 seed、境界 seed、rotation seed、adversarial seed から変更リスクに合う小集合を選び、レビューした seed、楽典上の所見、影響 metric、tradeoff、未実施の聴取 gap を該当 Phase または review doc に残してください。

## 優先

* [Phase 12 review summary](phase-12-review-summary.md): Phase 12 完了時の 22 seed A/B evidence、focused blocker 改善、voice-independence / leap-recovery tradeoff。
* [Phase 11 post-completion score review](phase-11-post-review.md): Phase 11 完了後の 22 seed 評価。similar phrase blocker が残るため、Phase 8/9 より前へ Phase 12 phrase/repetition quality rewrite を挿入する根拠。
* [Phase 7+ 再編計画](../phases/phase-7-plus-reorg.md): Phase 7 blocker 後の gate 緩和、review signal 化、Phase 10 先行と Phase 8/9 defer の進め方。
* [Phase 11](../phases/phase-11.md): Phase 10 譜面レビュー後に、Phase 8/9 の前へ追加した品質モデル再設計計画。
* [Phase 11 review summary diagnostics](phase-11-review-summary.md): Phase 11 の最初の diagnostics summary 追加と、22 seed の register、thinning、grammar、metrical harmony 観察。
* [Phase 10](../phases/phase-10.md): 操作機能より先に進める reference corpus、oracle-driven model update、section-local planner、pairwise preference の品質基盤計画。
* [Phase 10 譜面レビュー](phase-10-score-review.md): Phase 10 完了後に、代表・境界・rotation・adversarial seed の生成譜面を metric ではなく note/entry/section から読んだレビュー。
* [Phase 7 参照作品 diagnostics 計画](phase-7-reference-diagnostics-plan.md): CI metric が音楽的心地よさを十分に表せない問題を、Bach fugue などの参照作品 diagnostics と reference-relative gate へ再構成する計画。
* [Phase 7 音楽美レビュー](phase-7-musical-review.md): Phase 7 gate 後の seed 横断レビューと、Phase 7 後半を音楽改善へ再編する根拠。
* [Phase 7 実装メモ](../phases/phase-7.md): 概形進行 diagnostics、candidate scoring、schema version 5 review bundle、Phase 7 前半の完了記録。
* [Phase 6 概形進行レビュー](phase-6-contour-motion-review.md): 複数パートの pitch contour が数拍単位で並行する問題の seed 横断確認。
* [Phase 6 音楽美レビュー](phase-6-quality-review.md): Phase 6 gate 後の再レビューと Phase 7 前半の計画再編。
* [Phase 5.11 音楽美レビュー](phase-5-11-quality-review.md): Phase 5 完了、Phase 6-7 への持ち越し、rotation/adversarial seed、margin follow-up。
* [Phase 5.10 音楽美レビュー](phase-5-10-quality-review.md): Phase 5.11 追加の根拠、rotation seed fragility。
* [Phase 5.9 音楽美レビュー](phase-5-9-quality-review.md): review seed 全体の美しさ gate と seed fragility。

## 履歴

* [Phase 5.8 音楽美レビュー](phase-5-8-quality-review.md): Phase 5.7 後の声部独立、旋律線、聴取 gate。
* [Phase 5 音楽品質レビュー](phase-5-quality-review.md): Phase 5 review bundle 後の追加品質フェーズの根拠。
* [Phase 4 音楽品質レビュー](phase-4-quality-review.md): Phase 4 完了後の複数 seed 生成レビューと Phase 5 再編の根拠。

## 読む判断

* 最新の品質方針や Phase 8/9 前の実装対象を見る場合は Phase 12 review summary と Phase 12 を読む。Phase 11 の実装済み観察軸を見る場合は Phase 11 review summary diagnostics を読む。Phase 7 以降の gate 再構成を見る場合は Phase 7 参照作品 diagnostics 計画を読む。Phase 12 挿入前の blocker evidence を見る場合は Phase 11 post-completion score review を読む。
* 概形の並行・反行を扱う場合は Phase 6 概形進行レビューも読む。
* ある gate がなぜ追加されたかを追う場合だけ、古いレビューへ戻る。
* diagnostics の閾値や seed セットを変更する場合は、該当レビューと [../reference/technical-plan.md](../reference/technical-plan.md) を合わせて確認する。

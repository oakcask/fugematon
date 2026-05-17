# Review Docs

音楽品質レビューと、計画再編の根拠です。レビュー本文は長いため、agent は現在の判断に関係するものだけ読んでください。

音楽理論上のレビューを行う場合は、`music-theory-review` skill を使い、Fux 的な対位法を起点にしつつ、クラシック、ジャズ、ポピュラー音楽の文献調査と seed 横断の evidence を合わせて残してください。

## 優先

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

* 最新の品質方針や Phase 7 以降の再構成を見る場合は Phase 7 参照作品 diagnostics 計画を読む。現行 blocker の evidence を見る場合は Phase 7 音楽美レビューを読む。Phase 7 前半の実装完了条件だけを見る場合は Phase 7 実装メモを読む。
* 概形の並行・反行を扱う場合は Phase 6 概形進行レビューも読む。
* ある gate がなぜ追加されたかを追う場合だけ、古いレビューへ戻る。
* diagnostics の閾値や seed セットを変更する場合は、該当レビューと [../reference/technical-plan.md](../reference/technical-plan.md) を合わせて確認する。

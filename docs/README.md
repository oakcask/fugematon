# Fugematon Docs

フーガを奏でる無限オルゴール Fugematon プロジェクトの計画ドキュメントです。

AI agent が必要な文脈だけ読めるよう、元の IDEA.md を以下に分割しています。

* [要件](requirements.md): 外部的要件と技術的目標。
* [設計メモ](design.md): MVP フェーズ、内部表現、生成アルゴリズム、状態機械、モジュール分割。
* [技術計画](technical-plan.md): 採用技術、API、CLI、パッケージ構成、CI、MIDI、再現データ形式、実装順序。
* [Phase 0 実装メモ](phase-0.md): core API、CLI、PRNG、時間モデル、決定性テストの実装記録。
* [Phase 1 実装メモ](phase-1.md): 固定長4声 exposition、diagnostics、MIDI、代表 seed CI 検証の実装記録。
* [Phase 2 実装メモ](phase-2.md): ブラウザ再生、WebAudio、Canvas 2D ピアノロール、seed 再現の実装記録。
* [Phase 3 実装メモ](phase-3.md): 継続生成、候補スコアリング、長尺 diagnostics、主題 entry 強調の実装記録と既知の音楽的制約。
* [Phase 4 実装メモ](phase-4.md): 主題同一性、調性モデル、応答計画、entry plan の実装記録。
* [Phase 4 音楽品質レビュー](phase-4-quality-review.md): Phase 4 完了後の複数 seed 生成レビューと、以降の計画再編の根拠。
* [Phase 5 計画メモ](phase-5.md): 音楽的品質ゲート、counter-subject、自由対位、episode sequence、cadence plan の改善計画。
* [Phase 5 音楽品質レビュー](phase-5-quality-review.md): Phase 5 review bundle の複数 seed 診断と、Phase 6 前に追加する美しさ gate の根拠。
* [未決事項](open-questions.md): 現時点の未決事項（ある場合）の記録。

## プロジェクト概要

フーガを奏でる無限オルゴール Fugematon プロジェクト

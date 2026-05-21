# Review Docs

音楽品質レビューと、計画再編の根拠です。レビュー本文は長いため、agent は現在の判断に関係するものだけ読んでください。

音楽理論上のレビューを行う場合は、`music-theory-review` skill を使い、Fux 的な対位法を起点にしつつ、クラシック、ジャズ、ポピュラー音楽の文献調査と seed 横断の evidence を合わせて残してください。

music-quality gate、diagnostics threshold、generator model、candidate scoring model、evaluation weights、section/planner model を変える場合、agent は人間の聴取完了を待たずに、関連する複数 seed の生成譜面を楽典的にレビューしてください。代表 seed、境界 seed、rotation seed、adversarial seed から変更リスクに合う小集合を選び、レビューした seed、楽典上の所見、影響 metric、tradeoff、未実施の聴取 gap を該当 Phase または review doc に残してください。

指標の一般的な意味、正規化、採否 policy は [../reference/quality-metrics.md](../reference/quality-metrics.md) に置く。Review docs は seed evidence、音楽的症状、tradeoff、計画変更の根拠を残す場所です。

## 優先

* [Phase 12 review summary](phase-12-review-summary.md): Phase 12 完了時の 22 seed A/B evidence、human feedback、quality vector 化する unresolved symptoms。
* [Phase 13 quality vector review](phase-13-quality-vector-review.md): Phase 13 完了時の 22 seed quality vector aggregate、local sentinel、manual listening gap。
* [Phase 13Q planning review](phase-13q-planning-review.md): Phase 8/9 の前へ candidate diversity / voice independence / entry harmony 品質フェーズを挿入する根拠。
* [Phase 13Q voice-pair support review](phase-13q-voice-pair-support-review.md): oblique support candidates と quality-vector-aware selection の自動採用 evidence。
* [Phase 13R convergence review](phase-13r-convergence-review.md): Phase 8/9 の前へ default baseline / phrase convergence repair と follow-up repair を挿入する根拠。
* [Phase 13R subject diversity follow-up](phase-13r-subject-diversity-follow-up.md): seed 横断 initial subject family collapse の detector、generator repair、22 seed evidence、post-listening で残った mechanical subject-fragment convergence と不自然な3パート無音化 blocker の完了 evidence。
* [Phase 13S music beauty review](phase-13s-music-beauty-review.md): Phase 13R 後の 22 seed 譜面レビューと Phase 13S 完了 evidence。指標ではなく楽譜を読み、主題リズムの同型化、entry friction、voice lockstep、counter-subject identity、form metric の説明不足を Phase 8/9 前 blocker とした根拠と、Phase 8 へ持ち越す tradeoff を記録する。
* [Phase 13T current beauty audit](phase-13t-current-beauty-audit.md): Phase 13S 後の現行 default を再レビューし、entry sonority、voice lockstep、pitch-class unison、fragment function、modal counter-subject identity を Phase 8 前 blocker として再編した根拠。
* [Phase 13T completion review](phase-13t-completion-review.md): Phase 13T 完了 evidence。entry-support rhythm repair、quality-vector schema 2、entry sonority classifier、voice-pair function split、fragment-function evidence、modal counter-subject window review、focused listening notes を記録する。
* [Phase 13U beauty replan review](phase-13u-beauty-replan.md): Phase 13T 後の現行 default を再レビューし、reference aggregate の false readiness、反復 entry formula、全 seed voice coupling、fragment transformation 不足、modal counter-subject weakness を Phase 8 前 blocker として再編した根拠。
* [Phase 13V score beauty audit](phase-13v-score-beauty-audit.md): Phase 13U 後の現行 default を再レビューし、truthful metrics がまだ line agency、entry formula novelty、counter-subject survivability、long-run development を美しさとして証明できないことを Phase 8 前 blocker として再編した根拠。
* [Phase 13X first bass entry review](phase-13x-first-bass-entry-review.md): Phase 13W が除外していた exposition の初回 bass answer で、外声 3 声が同時に切れて再発音する問題を 22 seed 譜面レビューで確認し、Phase 8 前 blocker として再編した根拠。
* [Phase 13W completion review](phase-13w-completion-review.md): Phase 13W 完了 evidence。entry-boundary continuity diagnostic、delayed outside-voice support、22 seed score-window evidence、focused playback profile review を記録する。
* [Phase 13W entry-boundary review](phase-13w-entry-boundary-review.md): Phase 13V 後に確認された bass entry 境界の外声 3 声同時再発音を、Phase 8 前 blocker として再編した根拠。
* [Phase 13X](../phases/phase-13x.md): 現在の実装対象。初回 bass entry continuity repair を扱う。
* [Phase 13W](../phases/phase-13w.md): 完了済み。entry-boundary continuity diagnostic、previous-note-aware entry support、candidate review model、focused playback review を扱った。
* [Phase 13V completion review](phase-13v-completion-review.md): Phase 13V 完了 evidence。line agency、entry formula novelty、counter-subject survivability、long-window development の pre/post、focused listening notes、Phase 13W で引き継ぐ baseline を記録する。
* [Phase 13V](../phases/phase-13v.md): 完了済み。Phase 13U 後も残る line agency、entry formula recurrence、counter-subject survivability、long-run development を、指標の説明ではなく生成譜面の改善として扱った。
* [Phase 8](../phases/phase-8.md): Phase 13X 後の operational lane。Phase 13X の evidence baseline を前提に無限再生 operational lane を再開する。
* [Phase 13R](../phases/phase-13r.md): Phase 13Q 後、Phase 8 前に通常生成経路、後半 phrase convergence、follow-up で見つかった音楽的問題を修正した完了記録。
* [Phase 13S](../phases/phase-13s.md): 音楽的美しさを互換性制約より優先して再設計した完了済み品質フェーズ。
* [Phase 13T](../phases/phase-13t.md): 完了済み。Phase 13S 後に残る voice-pair independence と entry sonority を作曲モデル側で修正した。
* [Phase 13U](../phases/phase-13u.md): complete, superseded for handoff。Phase 13T 後も残る score-window beauty blockers を、指標の再分類ではなく生成譜面の改善として扱う truthfulness layer を記録した。
* [Phase 12P](../phases/phase-12-performance-profile.md): Phase 13 の前に、MIDI と WebAudio が共有する演奏プロファイル境界を組み込む計画。
* [Phase 13Q](../phases/phase-13q.md): Phase 13 の quality vector evidence を生成改善へつなぐ計画。
* [Phase 13](../phases/phase-13.md): Phase 12 後の repeated-note / unison defects を quality vector と統計的 review/adoption model で扱った完了記録。
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

* 最新の品質方針を見る場合は Phase 13X first bass entry review、Phase 13X、Phase 13W completion review、Phase 13W entry-boundary review、Phase 13W、Phase 13V completion review、Phase 13V、Phase 13V score beauty audit、Phase 13U beauty replan review、Phase 13U、Phase 13T completion review、Phase 13T、Phase 13T current beauty audit、Phase 13S music beauty review、Phase 13S、Phase 13R の完了 evidence、Phase 13R convergence review、Phase 13R subject diversity follow-up、Phase 7+ 再編計画を先に読む。現在の実装対象は Phase 13X。必要に応じて Phase 13Q planning review、Phase 13Q、Phase 13 quality vector review へ戻る。Phase 11 の実装済み観察軸を見る場合は Phase 11 review summary diagnostics を読む。Phase 7 以降の gate 再構成を見る場合は Phase 7 参照作品 diagnostics 計画を読む。Phase 12 挿入前の blocker evidence を見る場合は Phase 11 post-completion score review を読む。
* 概形の並行・反行を扱う場合は Phase 6 概形進行レビューも読む。
* ある gate がなぜ追加されたかを追う場合だけ、古いレビューへ戻る。
* diagnostics の閾値や seed セットを変更する場合は、該当レビュー、[../reference/quality-metrics.md](../reference/quality-metrics.md)、[../reference/technical-plan.md](../reference/technical-plan.md) を合わせて確認する。

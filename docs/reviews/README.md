# Review Docs

音楽品質レビューと、計画再編の根拠です。レビュー本文は長いため、agent は現在の判断に関係するものだけ読んでください。

## Read First

* [Metrical generation repair completion review](metrical-generation-repair-completion.md): Metrical generation repair の完了 evidence。3/4 focused seeds、6/8 compound-meter seeds、4/4 controls の score-window / diagnostics review と Phase 8 handoff。
* [Phase 14 harmonic continuity replan](phase-14-harmonic-continuity-replan.md): `seed-1dxb2n8-1miapx7` の6-7小節で聞こえる不自然な和音進行を、short modulatory / pivot-harmony episode の audible harmonic-continuity blocker として Phase 14 follow-up へ戻す根拠。
* [Metrical generation review](metrical-generation-review.md): `seed-0kowcm6-0am7x3f` の 3/4 metadata と聴感上の拍節感の不一致を調査し、Phase 8 前の Metrical generation repair へ再編する根拠。
* [Phase 14 post-entry and free-counterpoint generation review](phase-14-post-entry-phrase-generation.md): Phase 14C0 / 14C1 の実装 evidence。answer / stretto-like 後の long thin support window を focused seed で解消し、free-counterpoint phrase signature の repaired ceiling と dissonance tradeoff を記録する。
* [Phase 14 soprano register contour review](phase-14-soprano-register-contour-review.md): `seed-1yc5rlr-184cz7l` の soprano 第3-4小節で露出する大跳躍を、register placement と melodic continuity の衝突として Phase 14 follow-up へ入れる根拠。
* [Phase 14 post-entry texture and free-counterpoint phrase review](phase-14-post-entry-texture-and-free-counterpoint-review.md): ユーザー報告後の ScoreEvent review。answer / stretto-like 後の thin support と、free-counterpoint phrase signature の seed 横断収束を Phase 14C0 / 14C1 へ再編する根拠。
* [Phase 14 beauty replan review](phase-14-beauty-replan-2026-05.md): Phase 14 の再レビュー。score-window evidence、entry-continuity classifier、line agency、counter-subject survivability、phrase-development hierarchy、CI / review scope を再分類した最新根拠。
* [Phase 14 score-led beauty review](phase-14-score-led-beauty-review.md): Phase 13Z 後に、指標ではなく譜面を読み、Phase 8 前の score-led beauty trunk として再編する根拠。
* [Phase 14](../phases/phase-14.md): 完了済み handoff baseline。

## Review Rules

* 音楽理論上のレビューを行う場合は、`music-theory-review` skill を使い、Fux 的な対位法を起点にしつつ、クラシック、ジャズ、ポピュラー音楽の文献調査と seed 横断の evidence を合わせて残す。
* music-quality gate、diagnostics threshold、generator model、candidate scoring model、evaluation weights、section/planner model を変える場合、人間の聴取完了を待たずに、関連する複数 seed の生成譜面を楽典的にレビューする。
* 変更リスクに応じて代表 seed、境界 seed、rotation seed、adversarial seed から小集合を選び、レビューした seed、楽典上の所見、影響 metric、tradeoff、未実施の聴取 gap を該当 Phase または review doc に残す。
* seed や metric を追加、削除、昇格、降格するレビューでは、[CI and review scope](../reference/quality-metrics/ci-review-scope.md) に従って、CI、review bundle、manual listening、削除または archive を分類する。
* 指標の一般的な意味、正規化、採否 policy は [../reference/quality-metrics.md](../reference/quality-metrics.md) に置く。Review docs は seed evidence、音楽的症状、tradeoff、計画変更の根拠を残す場所。

## Catalog

* レビュー一覧、古い品質レビュー、Phase ごとの根拠リンクは [catalog.md](catalog.md) に置く。
* ある gate がなぜ追加されたかを追う場合だけ、古いレビューへ戻る。

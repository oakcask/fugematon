# Phase 8: 無限再生セッション MVP

Phase 8 は、Phase 13X2 の bass-answer-tail texture repair、Phase 13Y の generalized entry-continuity repair、Phase 13Z の long-run phrase-development repair、Phase 14 の score-led musical beauty rebuild、そして [Metrical generation repair](metrical-generation-repair.md) 後に戻る operational lane である。`seed-1dxb2n8-1miapx7` の6-7小節で確認した harmonic-continuity blocker は [Phase 14 harmonic-continuity follow-up](phase-14.md#14c4-short-episode-harmonic-continuity-generation) で repaired score-window として記録済み。目的は細かな生成パラメータ UI を増やすことではなく、長時間聴ける無限再生セッションを成立させ、内部状態を鑑賞用 visualizer として見せることである。

Phase 13W は post-exposition bass entry の同時再発音を修正したが、exposition の初回 bass answer は review scope から外れていた。Phase 13X はこの初回 bass entry blocker を扱う。Phase 13Y は、その修理を bass 固有の規則に閉じず、entry voice、entry order、already-entered voices に基づく一般的な entry-boundary continuity model へ広げる。Phase 13Z は、初期主題の多様性改善後も残る long-run phrase convergence を subject-return、episode、stretto-like の発展不足として扱う。Phase 14 は、指標が譜面上の美しさを証明していない問題を score-window musical acceptance として扱い、ユーザー報告の short modulatory / pivot-harmony episode における harmonic-continuity failure も Phase 8 前に戻す。Metrical generation repair は、拍子 metadata が generator に渡らず 3/4 の譜面が三拍子として聞こえない問題を扱う。Phase 8 は Phase 13Y、Phase 13Z、Phase 14、Metrical generation repair の review signal を segment 境界設計で隠さず、修正 evidence 後に無限再生 operational lane を再開する。

詳細な route は [Phase 7+ 再編計画](phase-7-plus-reorg.md) を読む。品質指標の意味は [quality metrics reference](../reference/quality-metrics.md) を読む。

## Scope

* ring buffer replay と保存済み範囲内の rewind。
* continuous fugue、endless program、regenerative cycle の MVP 境界 semantics。
* state-change、boundary、mode-change、必要な parameter-change meta event。
* 再生モード、seed、performance profile、再生成またはスキップなどの高水準 command。
* 主題 family、answer transform、fragment derivation、調性領域、cadence preparation、density arc、novelty budget の visualizer 表現。

## Out Of Scope

* strictness、density、subjectPresence などの細かな生成値を、MVP で直接スライダ化すること。
* 巻き戻し地点から別分岐して生成する branch mode。
* Worker fallback、deadline tuning、AudioWorklet。
* 無限再生の聴感問題、特に subject sameness、long-run phrase convergence、entry friction、voice lockstep、weak fugal development を UI 操作で隠して採用すること。
* Phase 13V の対象である line agency、entry formula recurrence、counter-subject survivability、fragment sameness、long-run development、metric false acceptance、長時間聴取疲労、Phase 13W / Phase 13X / Phase 13Y の対象である entry 境界の外声同時再発音、Phase 13X2 の対象である bass-answer-tail thinning、Phase 13Z の対象である same-family phrase fatigue を、境界設計や visualizer で見えにくくすること。

## Completion Conditions

* 保存済み範囲内の replay と rewind が deterministic に動く。
* segment 境界と状態変更が meta event として再現できる。
* continuous fugue と endless program の境界の違いを、ScoreEvent または MetaEvent から説明できる。
* segment 前後の hard constraint、review signal、quality vector、performance profile metadata を比較できる。
* visualizer が内部状態を過度な数値パネルではなく、色、透明度、ハイライト、軌跡、境界演出として見せる。
* manual listening note では、境界が隠れるべき箇所と終止すべき箇所を分けて記録する。
* 通常生成経路が [Phase 13R](phase-13r.md) で採用した default model と一致し、legacy `baseline` へ暗黙に戻っていないことを確認する。
* Phase 13X の first bass entry score-window evidence、focused manual listening、検出された entry-boundary continuity 問題の修正と再レビューが完了している。
* Phase 13X2 の bass-answer-tail texture evidence、role-visible review output、focused listening、検出された post-answer thinning 問題の修正と再レビューが完了している。
* Phase 13Y の generalized entry-continuity evidence、non-bass entry-window review、alternate entry-order stress review、focused listening が完了している。
* Phase 13Z の long-run phrase-development evidence、subject-return / episode / stretto-like recurrence review、focused listening が完了している。
* Phase 14 の score-led beauty evidence、entry continuity、line agency、counter-subject survivability、phrase development、metric truthfulness review、harmonic-continuity follow-up、focused listening が完了している。
* Metrical generation repair の 3/4 / 6/8 meter-context evidence、`meterConsistencyReview`、focused listening が完了し、time-signature metadata と生成構造の不一致を operational UI で隠していない。

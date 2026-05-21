# Phase 8: 無限再生セッション MVP

Phase 8 は、Phase 13W の entry-boundary continuity repair 後に戻る operational lane である。目的は細かな生成パラメータ UI を増やすことではなく、長時間聴ける無限再生セッションを成立させ、内部状態を鑑賞用 visualizer として見せることである。

Phase 13W は完了し、post-13V の focused inspection で確認された bass entry 境界の外声 3 声同時再発音は、entry-boundary continuity diagnostic と delayed outside-voice support で修正済みである。Phase 8 はこの review signal を segment 境界設計で隠さず、無限再生 operational lane を再開する。

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
* 無限再生の聴感問題、特に subject sameness、entry friction、voice lockstep、weak fugal development を UI 操作で隠して採用すること。
* Phase 13V の対象である line agency、entry formula recurrence、counter-subject survivability、fragment sameness、long-run development、metric false acceptance、長時間聴取疲労や、Phase 13W の対象である bass entry 境界の外声同時再発音を、境界設計や visualizer で見えにくくすること。

## Completion Conditions

* 保存済み範囲内の replay と rewind が deterministic に動く。
* segment 境界と状態変更が meta event として再現できる。
* continuous fugue と endless program の境界の違いを、ScoreEvent または MetaEvent から説明できる。
* segment 前後の hard constraint、review signal、quality vector、performance profile metadata を比較できる。
* visualizer が内部状態を過度な数値パネルではなく、色、透明度、ハイライト、軌跡、境界演出として見せる。
* manual listening note では、境界が隠れるべき箇所と終止すべき箇所を分けて記録する。
* 通常生成経路が [Phase 13R](phase-13r.md) で採用した default model と一致し、legacy `baseline` へ暗黙に戻っていないことを確認する。
* Phase 13W の score-window evidence、focused manual listening、検出された entry-boundary continuity 問題の修正と再レビューが完了している。

# Phase 3 実装メモ

Phase 3 では、固定長 exposition の後に episode、subject return、stretto-like section へ進む継続生成を追加した。

## 実装範囲

* `exposition`、`episode`、`subject-return`、`stretto-like` の状態遷移を `state-change` メタイベントと diagnostics に記録する。
* episode では主題断片、subject return では主題、stretto-like section では近接した主題と応答を生成する。
* 各継続 section では複数候補を作り、声域違反、声部交差、並達完全音程疑いを使った diagnostics cost が最も低い候補を選ぶ。
* 代表 seed の Phase 3 profile を core に置き、長尺生成で以下を CI 検証する。
  * 声域違反: 0
  * 声部交差: 0
  * subject return の主題 entry が最低回数以上あること
  * stretto-like entry が最低回数以上あること
  * 並達完全音程疑いが生成長に対する上限内であること
  * 生成所要時間が先読み用途の上限内であること
* Web UI は Phase 3 の長尺 score を生成し、主題、応答、主題断片の entry をピアノロール上で強調表示する。

## 完了判定

Phase 3 の完了条件は、現時点の MVP 水準で満たしている。

* exposition 後に episode、subject return、stretto-like section へ進む状態機械を持つ。
* 主題や主題断片が状態ごとに再出現し、diagnostics で entry の状態、声部、開始 tick、form を追跡できる。
* 応答 entry は5度関係の pitch class offset を維持する。
* 代表 seed の長尺生成では、声域違反と声部交差を 0 に保つ。
* 生成候補の評価回数と所要時間を CI で確認し、ブラウザ再生用の先読み長を生成できる。
* Web UI で数分程度の Phase 3 score を再生しながら、Canvas 2D のピアノロールで主題 entry を確認できる。

Phase 3 の候補生成とスコアリングは、厳密な species counterpoint の完成形ではない。Phase 4 では履歴、巻き戻し、操作パラメータを追加し、生成済みイベントと状態遷移をユーザ操作に結びつける。

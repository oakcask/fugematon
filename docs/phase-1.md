# Phase 1 実装メモ

Phase 1 では、固定長の4声 exposition、初期 diagnostics、MIDI エクスポート、代表 seed による CI 検証を実装した。

## 実装範囲

* seed から調性、拍子、テンポ、短い主題形を決定する。
* alto、soprano、tenor、bass の順で、主題または属調応答を提示する。
* 4声それぞれに NoteEvent を生成し、指定 lengthTicks 以上の ScoreEvent 列を返す。
* diagnostics で以下を記録する。
  * 主題または応答の entry。
  * 声域違反。
  * 声部交差。
  * 並達5度・並達8度の疑い。
* MIDI エクスポートではテンポ、拍子、調号をメタイベントとして出力し、4声を個別トラックとして扱う。
* Phase 1 代表 seed と diagnostics profile を core に集約し、CI の `pnpm test` で検証する。

## Phase 1 diagnostics profile

Phase 1 の CI では、代表 seed に対して以下を失敗条件にしている。

* 声域違反: 0
* 声部交差: 0
* 4声の NoteEvent 欠落: 0
* exposition の主題または応答の欠落: 0

並達5度・並達8度の疑いは diagnostics に記録するが、Phase 1 では CI 失敗条件にしない。

## 完了判定

Phase 1 の完了条件は満たしている。

* 4声 exposition として NoteEvent を生成できる。
* 主題と応答の entry が diagnostics で確認できる。
* 声域違反と声部交差は代表 seed で 0 に保たれる。
* MIDI ファイルを生成でき、人間が聴いて確認できる。

Phase 2 では、Phase 1 の固定長 score をブラウザローカルで再生し、Canvas 2D のピアノロールで可視化する。

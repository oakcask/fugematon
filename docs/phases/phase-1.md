# Phase 1 実装メモ

Phase 1 では、固定長の4声 exposition、初期 diagnostics、MIDI エクスポート、代表 seed による CI 検証を実装した。

## 実装範囲

* seed から調性、拍子、テンポ、短い主題形を決定する。
* alto、soprano、tenor、bass の順で、主題または属調応答を提示する。
  * 応答は Phase 1 では真応答相当の単純な5度移調として扱う。
  * 現行実装では、スケール度数ではなく semitone offset と `pitchClassOffset` による簡略表現を使っている。
  * この簡略表現では応答 entry は主題から pitch class `+7` 相当になるが、これは最終的な応答設計ではなく Phase 1 の実装制約である。
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

## 5度応答と縦の完全音程

Phase 1 では、フーガ構造としての5度応答と、対位法上の完全5度・完全8度の制御を分けて扱う。

* 5度応答:
  * 主題に対する属音側の entry として必要な構造要件。
  * Phase 1 では真応答相当の単純な5度移調として実装している。
  * 現行の pitch class `+7` は、属調応答をスケール文脈なしで近似するための暫定表現である。
  * 将来はスケール度数、導音、短調の扱い、主題の輪郭に応じて、真応答と調性応答を選ぶ。
* 縦の完全5度・完全8度:
  * 同時に鳴る2声の響きや声部進行に関する対位法制約。
  * 現行の Phase 1 は保持音による簡易 counterpoint のため、静的な完全8度が残ることがある。
  * Phase 1 の完了条件では声域違反と声部交差を優先し、完全音程の扱いは diagnostics と後続フェーズの改善対象にしている。

このため、`fugue-smoke` の確認用 MIDI で8度の重なりが聴こえることは、Phase 1 の既知の制約内にある。ただし、フーガらしさを高める次段階では、5度応答を保ったまま縦の完全8度や並達完全音程を減らす必要がある。

Phase 3 では、候補生成とスコアリングでこの制約を扱う。代表 seed の exposition と subject return では、応答 entry の5度関係を維持しつつ、entry 周辺の持続的な完全8度や並達完全音程が主題の聴感を支配しないことを diagnostics と聴取で確認する。

## 完了判定

Phase 1 の完了条件は満たしている。

* 4声 exposition として NoteEvent を生成できる。
* 主題と応答の entry が diagnostics で確認できる。
* 声域違反と声部交差は代表 seed で 0 に保たれる。
* MIDI ファイルを生成でき、人間が聴いて確認できる。

Phase 2 では、Phase 1 の固定長 score をブラウザローカルで再生し、Canvas 2D のピアノロールで可視化する。

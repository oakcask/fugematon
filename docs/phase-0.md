# Phase 0 実装メモ

Phase 0 では、UI、WebAudio、Canvas に依存しない core API と、CLI から再現可能な ScoreEvent JSON を出力する土台を実装した。

## 参照した論文と実装

* David Blackman and Sebastiano Vigna, "Scrambled Linear Pseudorandom Number Generators", arXiv:1805.01407.
* Blackman and Vigna の xoshiro128** 1.1 参照実装。

論文が扱う scrambled linear PRNG のうち、設計メモの指定に合わせて 32bit state 4 個の xoshiro128** を採用した。core 実装では参照実装と同じ `rotl(s[1] * 5, 7) * 9` の scrambler と state transition を使い、JavaScript 側では `Math.imul` と unsigned 32bit 化で丸めを固定している。

## 実装範囲

* `seed` 文字列から 4 個の 32bit state を作る deterministic seeding。
* xoshiro128** の `nextUint32`、`nextFloat`、整数範囲、重み付き選択、shuffle。
* `NoteEvent`、`MetaEvent`、`ScoreEvent` と tick ベースの timebase。
* `generateScore(input)` の core API。
* `fugematon generate` と `fugematon diagnose` の CLI。
* 同じ input が同じ output を返すこと、および PRNG の先頭出力列を固定するテスト。

Phase 0 の `generateScore` は音符をまだ生成せず、generator version、timebase、tempo、拍子、調性、初期パラメータ、状態、score-end のメタイベントを返す。Phase 1 で exposition と NoteEvent 生成をこの envelope に追加する。

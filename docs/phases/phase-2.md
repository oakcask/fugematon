# Phase 2 実装メモ

Phase 2 では、Phase 1 の固定長 score をブラウザローカルで再生しながら可視化するための Vite ベース Web UI を追加した。

## 実装内容

* `@fugematon/web` を追加し、core の `generateScore` から seed 再現可能な score を生成する。
* score metadata と NoteEvent を、ブラウザ再生と描画で扱いやすい playback model へ変換する。
* Start 操作後に `AudioContext` を作成・resume し、WebAudio の oscillator と gain envelope でシンプルな organ 音色をスケジュール再生する。
* Stop 操作と seed 再生成時には、スケジュール済み oscillator を停止する。
* Canvas 2D のピアノロールで4声のノートをタイムライン上に描画し、再生中は playhead を更新する。

## 検証

Phase 2 の CI では、既存の core / CLI テストに加えて Web UI の純粋ロジックを検証している。

* playback model が tempo、timebase、score-end、note count を正しく反映すること。
* WebAudio スケジューリング用の絶対時刻、周波数、gain が note から算出できること。
* ピアノロール layout が全 note を canvas bounds 内へ写像すること。
* Vite production build が成功すること。

## 完了条件

Phase 2 の完了条件は満たしている。

* ブラウザローカルだけで Phase 1 の生成結果を再生できる。
* 初回は Start 操作後に AudioContext を開始する。
* WebAudio のシンプルな organ 音色で NoteEvent をスケジュール再生する。
* Canvas 2D のピアノロールで4声のノートをタイムライン上に可視化する。
* ユーザが seed を入力して、同じ演奏を再現できる。

Phase 2 は固定長 score の再生と可視化を対象にしている。長時間生成、先読み、Worker 分離、巻き戻しは後続フェーズで扱う。

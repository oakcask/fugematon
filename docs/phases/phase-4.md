# Phase 4 実装メモ

Phase 4 では、Phase 3 の構造 MVP で見えた音楽的な弱点を先に修正する。主な目的は、主題同一性、調性、応答の意味論を MIDI pitch の偶然に依存しない形へ移すことである。

## 実装状況

完了。Phase 5 では、ここで安定させた entry plan と diagnostics の上に counter-subject、episode sequence、cadence plan を追加する。

## 目的

* 主題を scale degree ベースの抽象表現として保持する。
* subject、answer、subject-fragment を entry plan から生成する。
* 声部ごとの register 配置と、主題の調性機能を分離する。
* true answer と tonal answer を区別する。
* diagnostics で、主題同一性と key metadata mismatch を検出する。

## 実装範囲

* `SubjectPattern` 相当の内部表現を追加する。
  * rhythm pattern
  * scale degree pattern
  * accidental
  * important tones
  * melodic role
* `EntryPlan` 相当の内部表現を追加する。
  * state
  * form
  * voice
  * start tick
  * global key
  * local key
  * answer kind
  * register target
* MIDI pitch への変換を、entry plan の最後の段階へ移す。
* range fitting は octave placement のみに限定し、scale degree pattern を変えない。
* diagnostics に以下を追加する。
  * subject identity violation
  * answer plan violation
  * key metadata mismatch
  * expected degree pattern
  * actual pitch class sequence

## 実装内容

* 主題は rhythm、scale degree、accidental、important tone、melodic role を持つ内部表現から生成する。
* subject、answer、subject-fragment は、state、voice、start tick、global key、local key、answer kind、register target を持つ entry plan から生成する。
* MIDI pitch への変換は entry plan から pitch class sequence を作った後に行い、声域調整は octave placement に限定する。
* diagnostics は subject identity violation、answer plan violation、key metadata mismatch、expected degree pattern、actual pitch class sequence を出力する。
* Web UI の主題ハイライトは diagnostics の planned entry metadata に紐づく note layout から描画する。

## 完了条件

* 代表 seed の exposition と subject return で、主題同一性違反が 0 である。完了。
* answer entry が true answer または tonal answer の計画として説明できる。完了。
* key-signature、entry plan の local key、実際の pitch class sequence が矛盾しない。完了。
* 既存の声域違反と声部交差は 0 を維持する。完了。
* Web UI の主題ハイライトが、暫定的な pitch offset ではなく entry plan に基づく。完了。

## 検証

* `pnpm test`
* 代表 seed は Phase 3 と同じ固定 seed と境界 seed を使う。
* Phase 4 diagnostics profile は、声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch を 0 に固定する。

## 対象外

* counter-subject の完成度向上は Phase 5 で扱う。
* episode の和声進行と cadence plan は Phase 5 で扱う。
* 履歴、巻き戻し、操作パラメータは Phase 8 で扱う。
* Worker 化とリアルタイム生成期限は Phase 9 で扱う。

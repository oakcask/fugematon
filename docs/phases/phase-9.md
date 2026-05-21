# Phase 9: Worker 化と長時間安定化

Phase 9 は Phase 8 後の operational lane である。目的は生成探索を UI thread から分離し、無限再生セッション、音声、内部状態 visualizer を長時間安定させることである。

詳細な route は [Phase 7+ 再編計画](phase-7-plus-reorg.md) を読む。fallback の quality policy は [quality metrics reference](../reference/quality-metrics.md) を読む。

## Scope

* Dedicated Web Worker による生成探索の分離。
* 生成期限、best-so-far fallback、保守的 fallback。
* timeout と fallback の review signal 記録。
* replay、state-change history、boundary history の長時間保持。
* visualizer が worker 遅延、fallback、segment 境界で停止、飛び、過密表示を起こさないための検証。

## Out Of Scope

* Worker 化と同時に生成品質の大きな採用判断を変えること。
* AudioWorklet、OffscreenCanvas、SharedWorker、Service Worker の導入。必要性が明確になってから別途扱う。
* 細かな生成パラメータ UI を増やすこと。
* Phase 13V / Phase 13W / Phase 13X の音楽美 repair を Worker fallback や deadline policy で代替すること。

## Completion Conditions

* deadline 内に hard constraint を満たす候補または保守的 fallback を返せる。
* timeout や fallback が reference diagnostics、review signal、quality vector の記録を消さない。
* 長時間再生で replay、state-change history、boundary history が壊れない。
* 生成、描画、再生、内部状態 visualizer が分離されても、操作感と音声が安定する。
* Phase 13X の score-window evidence、focused manual listening、検出された音楽的問題の修正と再レビューを Phase 8 baseline として維持している。

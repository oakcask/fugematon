# Technical Plan Index

技術計画の入口です。本文は長いため、agent はまずこの索引で読む範囲を決めてください。

## まず読む

* 詳細本文: [technical-plan-full.md](technical-plan-full.md)
* 品質指標: [quality-metrics.md](quality-metrics.md)
* 要件: [requirements.md](requirements.md)
* 設計: [design.md](design.md)

## 詳細本文の主な範囲

* 基本方針、アプリケーション基盤、音声、描画、永続化。
* 無限再生モード、内部状態可視化、限定操作、テスト、diagnostics 閾値。指標の意味は [quality-metrics.md](quality-metrics.md) に置く。
* 調性的処理、主題 entry、教会旋法。
* 生成エンジン API、CLI、パッケージ構成、依存ルール、performance profile、CI。
* 代表 seed、MIDI export、再現データ形式、フェーズ別実装順序。
* 生成期限、フォールバック、フェーズ別検証観点。

## 読む判断

* 実装順序や Phase scope を変える場合は、詳細本文の「フェーズ別実装順序案」と該当 Phase メモを読む。
* diagnostics、seed、CI gate を変える場合は、詳細本文の diagnostics と CI 周辺、および [quality-metrics.md](quality-metrics.md) を読む。
* API、CLI、パッケージ境界を変える場合は、詳細本文の該当 section だけ読む。
* MIDI export、pan、volume、program、演奏 profile を変える場合は、詳細本文の「パッケージ構成」と「MIDI エクスポート方針」を読む。
* 音楽モデル自体の方針を変える場合は、先に [design.md](design.md) を読む。

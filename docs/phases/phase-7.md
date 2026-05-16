# Phase 7 実装メモ

Phase 7 前半では、Phase 6 後レビューで手元集計だった pitch contour の概形進行を、正式な diagnostics、candidate scoring、review bundle gate に昇格した。

## 実装内容

* 4 拍窓と 8 拍窓で、bass と上声の同方向進行率、反行率、比較数を diagnostics に残す。
* 4 拍窓で outer voices の同方向進行率、反行率、比較数を diagnostics に残す。
* `CandidateEvaluation.dimensions.texture.features` に contour motion の特徴量を追加した。
* texture cost/reward は、従来の局所的な同方向進行や shared rhythm に加えて、窓単位の bass-upper / outer-voice contour を弱い重みで扱う。
* review bundle summary は schema version 5 として、`phase7Gate` と `pitchContourMotion` を出力する。

## 完了条件

Phase 7 前半のリポジトリ上の自動完了条件は満たしている。

* 固定 review seed、rotation seed、adversarial seed は Phase 6 gate を維持する。
* 22 seed 全体で 4 拍窓の bass-upper same-direction ratio、4 拍窓の bass-upper contrary ratio、8 拍窓の bass-upper same-direction ratio、8 拍窓の bass-upper contrary ratio が Phase 7 profile の閾値内に収まる。
* 4 拍窓の outer-voice same-direction ratio と contrary ratio が Phase 7 profile の閾値内に収まる。
* contour comparison count が 0 にならず、review bundle が概形進行を観察できる。
* `pnpm test` で Phase 7 gate を CI 対象にする。

## 完了レビュー

`pnpm fugematon review --out samples/phase-musical-review --ticks 129600` で review bundle を再生成した。summary は schema version 5、対象 seed は 22 件、Phase 6 gate と Phase 7 gate はすべて pass した。

実測上の Phase 7 境界 seed は以下だった。

| 指標 | seed | 値 |
| --- | --- | ---: |
| 4 拍 bass-upper same-direction ratio 最大 | `dense-modal` | 0.710 |
| 4 拍 bass-upper contrary ratio 最小 | `dense-modal` | 0.290 |
| 8 拍 bass-upper same-direction ratio 最大 | `dense-modal` | 0.611 |
| 4 拍 outer-voice same-direction ratio 最大 | `modal-dorian` | 0.736 |

## 持ち越し

Phase 7 後半では、候補評価の説明力を扱う。`CandidateEvaluation` の dimension breakdown はすでにあるが、harmony、form、texture の満点理由と低評価理由を seed、section、voice、entry/cadence 周辺の単位で説明できるまで、Phase 8 の操作機能には進まない。

manual listening gate は代表 seed と境界 seed が `pass` になるまで blocker として残す。自動 gate は概形進行を CI に入れたことを示すが、音楽的な説得力の最終判定は MIDI または Web UI の聴取レビューで確認する。

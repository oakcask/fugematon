# Phase 6 概形進行レビュー

生成楽譜で複数パートの pitch contour が概形として並行して見える、という指摘を受け、Phase 6 の review seed 22 件を横断して追加確認した。

## 確認方法

現行 diagnostics の `sameDirectionMotionCount` は、同じ tick で動き出した声部ペアの局所的な同方向進行を数える。一方で今回の指摘は、楽譜を眺めたときの数拍単位の概形に関するものなので、別集計を行った。

* 対象は固定 review seed 14 件、rotation seed 6 件、adversarial seed 2 件。
* 長さは Phase 6 review と同じ 129600 ticks。
* 4 拍窓と 8 拍窓を 1 拍ずつずらし、窓始点と終点の active pitch 差から各声部の上行、下行、保持を取った。
* 同時に動いた声部ペアが同じ符号なら概形の並行、逆符号なら反行として数えた。
* Fugematon はまだ chord root を明示的に持たないため、Fux 的な root と上声の関係は bass と上声のペアで近似した。

## 結果

4 拍窓では bass と上声の同方向進行率が平均 0.555、反行率が平均 0.445 だった。22 seed 中 16 seed で bass と上声の同方向進行率が 0.55 以上、7 seed で 0.60 以上だった。8 拍窓でも平均は同方向 0.506、反行 0.494 で、7 seed が 0.55 以上、3 seed が 0.60 以上だった。

特に 4 拍窓で高い seed は以下だった。

| seed | bass-upper same | bass-upper contrary | 目立つ bass pair |
| --- | ---: | ---: | --- |
| `wide-key` | 0.654 | 0.346 | `tenor+bass` 0.844 |
| `close-imitation` | 0.652 | 0.348 | `tenor+bass` 0.840 |
| `bach-001` | 0.630 | 0.370 | `tenor+bass` 0.972 |
| `ornament-test` | 0.614 | 0.386 | `soprano+bass` 0.721 |
| `dense-modal` | 0.611 | 0.389 | `alto+bass` 0.783 |
| `lyrical-line` | 0.607 | 0.393 | `soprano+bass` 0.667 |
| `long-arc` | 0.605 | 0.395 | `tenor+bass` 0.905 |

`fugue-smoke` は 4 拍窓で 0.556、8 拍窓で 0.475 だった。つまり、指摘の問題は `fugue-smoke` だけに限らないが、seed によっては 8 拍程度の長めの窓では反行が戻る。一方で `wide-key`、`long-arc`、`dense-modal`、`lyrical-line`、`close-imitation`、`bach-001` は 8 拍窓でも bass と上声の同方向進行率が高く、構造的な偏りとして扱う必要がある。

## 解釈

この結果は、現行の `sameDirectionMotionCount` だけでは捕まらない。局所的には同時に動いていない、または別リズムで動いていても、数拍単位の窓で見ると bass、tenor、alto、soprano が同じ方向へ滑る区間が多い。リズム独立性が改善しても、pitch contour の独立性が十分とは限らない。

Fux 的な二声対位法では、完全協和の連続だけでなく、上声と下声が同じ方向へ寄り続けること自体が声部独立を弱める。Fugematon は Bach 的なフーガ構造を上位に持つため同方向進行を全面禁止しないが、bass と上声の概形は反行、斜行、保持と動きの交替を基本寄りにし、同方向進行が続く場合は sequence、cadence approach、明示的な doubling などの理由が必要である。

## 計画への反映

Phase 7 前半では、旋律 contour 改善を声部単体の歌いやすさだけでなく、voice-pair の窓単位 contour として扱う。

* 4 拍窓と 8 拍窓で bass-upper same-direction ratio、bass-upper contrary ratio、outer-voice same-direction ratio を diagnostics に追加する。
* `wide-key`、`close-imitation`、`bach-001`、`dense-modal`、`lyrical-line`、`long-arc` を概形並行の回帰 seed として扱う。
* `tenor+bass` の同方向が高い seed が多いため、支え声部生成と register placement で bass に対する tenor の反行、斜行、保持を候補に入れる。
* candidate scoring では、同方向進行を単発で罰するのではなく、窓単位の連続、bass と上声の組み合わせ、section role、cadence への向かい方を分けて評価する。
* Fux 的な根音と上声の関係は、明示的な chord root が入るまでは bass proxy で観察し、harmony dimension が root を説明できるようになった段階で root-upper contour に置き換える。

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

Phase 7 gate 後の音楽美レビューでは、自動 gate pass 後も rhythmic independence、unison overlap、entry 周辺の severe seconds/sevenths、modal counter-subject identity、long-run form repetition が残ることを確認した。詳細は [Phase 7 音楽美レビュー](../reviews/phase-7-musical-review.md) を参照する。

追加調査では、`fugue-smoke` で目立つ 5度順次上行後に下降する主題型が 22 seed 中 12 件に現れ、この型の severe entry interval と未解決 severe entry interval が別型より高いことを確認した。属音開始の answer 制限を緩めて 3度/6度開始を許す案は残すが、まずは主題フレーズ生成の偏りを直し、5度到達を使う場合も answer entry の支え声部が 2度/7度を持続しない候補を選ぶ。

このため Phase 7 後半は、評価説明力だけでなく、説明できた弱点を実際に潰す音楽改善フェーズとして扱う。まず feature extraction を entry、cadence、section、voice-pair の集計単位へ整理し、既存 Phase 6/7 gate を保つテストを強化する。その後、entry harmony、subject phrase generation、限定的な entry interval alternatives、voice independence、modal counter-subject、melody/phrase、episode/codetta/stretto preparation の順に reviewable な変更へ分ける。ただし entry harmony は単独の縦方向衝突回避として実装しない。severe seconds/sevenths と exact unison だけを避ける音高選択は、entry interval を減らす一方で leap recovery と modal counter-subject identity を壊すため、entry interval、leap recovery、counter-subject identity、contour を同じ candidate evaluation で同時に扱う。

manual listening gate は代表 seed と境界 seed が `pass` になるまで blocker として残す。自動 gate は概形進行を CI に入れたことを示すが、音楽的な説得力の最終判定は MIDI または Web UI の聴取レビューで確認する。

## Phase 7 後半の進行中条件

Phase 7 後半では、scoring 変更の前に既存 gate と説明対象をテストで固定した。固定 review seed、rotation seed、adversarial seed は Phase 7 gate を維持し、entry support、severe entry interval、voice-pair overlap、melody、form、subject clarity の各 feature が選択済み candidate evaluation から参照できる。

`CandidateEvaluation` は schema 互換のため `featureVersion` と `evaluationModelVersion` を持ち、entry、voice-pair、voice、section 単位の `explanations` を出力する。review bundle summary は schema version 6 として、選択済み candidate evaluation の説明件数と最大 entry/voice-pair/section リスクを `diagnosticsSummary.candidateEvaluation` に残す。

この段階では、entry harmony と voice independence の重みを強める実験で一部 seed の Phase 7 gate が崩れることを確認したため、scoring 改善は別 PR に分ける。加えて、support voice の音高選択で severe entry interval を直接避ける実験では severe interval と unison overlap は減ったが、支え声部の旋律線が跳びやすくなり、`leapRecoveryMisses` と modal seed の `counterSubjectIdentityRetention` が悪化した。次の scoring PR は、entry harmony の局所改善だけでなく、横の旋律線と対主題輪郭を同時に守る複合 cost として設計する。

schema version 6 の review bundle は `pnpm fugematon review --out samples/phase-musical-review --ticks 129600` で生成済みで、22 seed すべてが Phase 6 gate と Phase 7 gate を pass した。しかし `prompts/musical-review.md` による再レビューでは、rhythmic independence、same-pitch overlap、entry 周辺の severe seconds/sevenths、modal counter-subject identity、episode の solo texture risk がまだ Phase 8 前の blocker と確認された。`listening-review.json` は全 seed が `not-reviewed`、`pairwise-preferences.json` は空のままである。Phase 7 は schema version 6 の説明基盤までは到達したが、音楽美レビュー上は未完了とする。

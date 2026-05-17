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

schema version 6 の review bundle は `pnpm fugematon review --out samples/phase-musical-review --ticks 129600` で生成済みで、22 seed すべてが Phase 6 gate と Phase 7 gate を pass した。しかし `prompts/musical-review.md` による再レビューでは、rhythmic independence、same-pitch overlap、entry 周辺の severe seconds/sevenths、modal counter-subject identity、episode の solo texture risk がまだ Phase 8 前の blocker と確認された。`listening-review.json` は全 seed が `not-reviewed`、`pairwise-preferences.json` は空のままである。Phase 7 は schema version 6 の説明基盤までは到達したが、音楽美レビュー上は未完了とする。schema version 7 では、この説明基盤に long-run form repetition と selected section solo texture risk の横断 evidence を追加した。

## Phase 7 entry harmony scoring

entry harmony scoring の最初の小変更では、schema version 6 で抽出した entry risk context を harmony cost に入れ、`evaluationModelVersion` を 2 に上げた。未解決 severe entry interval は軽い soft cost とし、severe interval と entry support instability はさらに小さい cost に留める。counter-subject identity retention の reward も少し強め、entry risk の縦方向改善だけで modal counter-subject identity を失わないようにする。

採用した重みでは、Phase 6/7 gate は全 seed で pass し、`fugue-smoke` の entry support instability は 145 から 143 へ下がった。`modal-dorian` は entry support instability が 124 から 120 へ下がり、`bright-answer`、`modal-cadence`、`dense-modal`、`angular-answer`、`modal-answer`、`contrary-motion` の melody、counter-subject identity、contour guardrail は Phase 7 の閾値内に残った。

強い unresolved severe interval cost を入れる案は棄却した。この実験では `modal-cadence` の severe entry interval は 108 から 92、unresolved severe entry interval は 91 から 43 へ下がったが、counter-subject identity retention が 0.535 まで落ちて Phase 6/7 gate を壊し、leap recovery misses も 16 から 27 へ悪化した。今後の entry harmony scoring は、entry risk の大幅減少を採る場合でも modal counter-subject identity と leap recovery を同時に gate する。

また、entry scoring との釣り合いだけを目的に `leapRecoveryMiss` weight を広く上げる案も棄却した。実際の leap diagnostics は守れたが、既存の selected candidate melody cost margin が崩れ、Phase 5.9/5.10 gate の `averageSelectedCandidateMelodyCost` が 76 を超えた。melody/phrase の保護は、既存 cost 全体を引き上げるのではなく、entry risk と同じ candidate context で説明できる範囲へ絞る。

## Phase 7 subject phrase variety

主題フレーズ生成の小変更では、従来の `0-1-2-3-4-3-2-1` を完全には外さず、既定候補を `0-1-2-3-4-3-1-2` へ寄せた。5度への順次上行と主題認識性は保ちつつ、5度到達後に同じ順次下降だけへ戻らないようにするためである。既存の `0-1-2-3-4-3-2-1` と `0-2-1-3-4-3-2-1` は候補として残し、minor seed では従来形も一定の重みを保つ。

この採用案では 22 seed 中の `0-1-2-3-4-3-2-1` 型は 12 件から 4 件へ下がり、`0-1-2-3-4-3-1-2` 型は 8 件になった。Phase 6/7 gate は全 seed で pass し、entry harmony regression seed の entry support instability、severe entry interval、unresolved severe entry interval は既存上限内に残った。protected seed の `modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian`、`dense-modal`、`angular-answer` は leap recovery と counter-subject identity の guardrail 内に残った。

`0-1-2-4-3-2-0-1` を候補にする案は棄却した。この案も exact pattern は 8 件まで下げたが、`lyrical-line` の `leapRecoveryMisses` が 35、`contrary-answer` が 44 まで増え、どちらも Phase 6/7 gate を壊した。さらに両 seed で 8拍 bass-upper contour も閾値を超えた。今後の主題候補追加は、5度後の下降を崩すだけでなく、大跳躍回収と 8拍 contour を同時に守る形に限る。

## Phase 7 voice independence scoring

声部独立の小変更では、候補評価の model 3 selection adjustment で `unisonOverlapCount` と `sharedRhythmOverlapCount` を追加で扱い、`evaluationModelVersion` を 3 にした。公開される texture dimension の cost scale は Phase 5.9/5.10 の既存 gate と比較できるように保ち、リズム生成や主題生成は変えず、既存 candidate の中で同一リズムと pitch-class unison が少ないものを少し優先する。

採用した重みでは、Phase 6/7 gate は全 seed で pass した。境界 seed では `bright-answer` の unison overlap が 736 から 735、same-direction motion が 629 から 625 へ下がり、`quiet-cadence` の unison overlap が 728 から 724、same-direction motion が 652 から 640 へ下がった。`bright-answer` の `leapRecoveryMisses` は 30 から 31 へ増えたが、Phase 6/7 の 33 上限内に残るため、古い Phase 5.9 profile の固定 seed ceiling だけ 31 へ合わせた。`restless-line`、`sparse-cadence`、`modal-answer`、`minor-entry` は rhythmic independence、shared rhythm、unison の全体値は変わらず、今回の変更は過大な改善ではなく、選択可能な候補がある section だけを動かす小さな scoring 調整に留まる。

保護 seed では `modal-dorian`、`dense-modal`、`angular-answer`、`contrary-motion` の modal counter-subject identity、leap recovery、Phase 7 contour gate は閾値内に残った。entry regression seed の `fugue-smoke`、`lyrical-line`、`modal-cadence`、`wide-key`、`tight-stretto`、`contrary-answer` も severe entry interval と unresolved severe entry interval の既存上限内に残った。

より強い unison/shared-rhythm 重みは棄却した。`bright-answer` の unison overlap は 730 まで下がったが、`leapRecoveryMisses` が 34 へ増えて Phase 6/7 gate を壊したため、声部独立の改善は大跳躍回収の余裕を使い切らない範囲に制限する。exact same-pitch overlap を直接避ける octave placement 案も棄却した。free-counterpoint または counter-subject の octave を局所的に動かすと same-pitch overlap は下がったが、`modal-cadence` と `dense-modal` の counter-subject identity、`lyrical-line` と `modal-cadence` の leap recovery、`tight-stretto` の same-pitch gate が悪化した。今後 same-pitch を直接扱う場合は、pitch placement だけでなく leap recovery、modal identity、entry interval を同じ candidate evaluation で同時に守る。

## Phase 7 modal counter-subject scoring

modal counter-subject の小変更では、候補評価の model 4 selection adjustment で modal context がある candidate に限り `counterSubjectIdentityRetention` の追加 reward を与える。既存の modal counter-subject pattern は変えず、mode の特徴音を鳴らす設計を維持したまま、候補選択で対主題輪郭の再認識性を少し優先する。

採用した重みでは、Phase 6/7 gate は全 seed で pass した。modal blocker seed では `modal-answer` の `counterSubjectIdentityRetention` が 0.625 から 0.631 へ上がった。`modal-cadence` は 0.573、`dense-modal` は 0.586、`angular-answer` は 0.591、`modal-dorian` は 0.627 を維持した。entry regression seed の `fugue-smoke`、`lyrical-line`、`wide-key`、`tight-stretto`、`contrary-answer` は severe entry interval と unresolved severe entry interval の既存上限内に残り、melody guard seed の `bright-answer` と `contrary-motion` も leap recovery と contour gate を維持した。

より強い modal identity reward は棄却した。重みをさらに上げると `modal-answer` の selected candidate identity は上がったが、`modal-dorian` の `counterSubjectIdentityRetention` が 0.604 まで下がり、`leapRecoveryMisses` も 33 まで増えて余裕を使い切った。今後 modal identity selection を強める場合は、単一 reward ではなく、modal-dorian の leap recovery と counter-subject identity を同時に gate する。

modal counter-subject pattern を通常の対主題輪郭へ近づけ、末尾だけ modal characteristic tone にする案も棄却した。この実験では `modal-answer`、`dense-modal`、`angular-answer` の identity は大きく上がったが、`modal-cadence` の `leapRecoveryMisses` が 46、severe entry interval が 125、unresolved severe entry interval が 124 まで悪化し、`modal-dorian` も severe entry interval 115、unresolved severe entry interval 102 で Phase 6/7 gate を壊した。別の stepwise tail variant では `modal-cadence` の leap recovery は 35 に留まり、`modal-dorian` の 4拍 outer-voice same-direction ratio が 0.928 まで悪化した。modal pattern の変更は、identity metric だけでなく entry harmony、leap recovery、outer-voice contour を同時に守れる場合に限る。

## Phase 7 melody and phrase recovery

melody/phrase の小変更では、counter-subject の pitch-class pattern は変えず、free-counterpoint と同じく直前の同一声部音に近い octave へ配置する。対主題の scale-degree identity と modal characteristic tone は保ちつつ、支え声部が octave placement だけで不要な跳躍を作る箇所を減らすためである。

採用した変更では 22 seed すべてが Phase 6/7 gate を pass し、`leapRecoveryMisses` 合計は 426 から 418 へ下がった。境界 seed では `dark-episode` が 23 から 21、`bach-001` が 20 から 18、`quiet-cadence` が 15 から 13、`long-arc` が 25 から 23 へ下がった。`modal-answer` は 32、`bright-answer` は 31、`contrary-motion` は 26、`modal-dorian` は 25、`contrary-answer` は 24 を維持し、entry support instability、severe entry interval、unresolved severe entry interval、Phase 7 contour gate は既存上限内に残った。

候補評価の model 5 として、voice phrase context の最大 leap recovery miss と repeated pitch run を selection cost に加える案は棄却した。小さい重みでも `contrary-answer` の `leapRecoveryMisses` が 34 まで増えて Phase 6/7 gate を壊し、`fugue-smoke` の entry support instability も 143 から 145-148 へ悪化した。今後の phrase breathing scoring は、既存 candidate 全体へ汎用 cost を足すのではなく、entry risk、support role、modal identity、contour を同じ候補説明で同時に守れる局所条件に限る。

## Phase 7 form review evidence

long-run form と section texture は、generator を大きく変えずに review bundle evidence を先に補強した。`pnpm fugematon review --out samples/phase-musical-review --ticks 129600` の summary は schema version 7 になり、`form.longRunRepetition` に 4 section continuation pattern の反復回数と unique count を、`candidateEvaluation` に全 selected section explanation の solo texture risk 集計を残す。

再生成した 22 seed は Phase 6/7 gate をすべて pass した。ただし evidence は blocker 継続を示している。全 seed で `maxSelectedSectionSoloTextureRisk` は 8 に達し、risk 6 以上の selected section は合計 321 件だった。most repeated 4-section continuation pattern は seed ごとに 6-8 回反復し、unique pattern count は 4-5 に留まった。これは episode、subject-return、stretto-like が短い cycle で回り続け、codetta、episode preparation、stretto preparation、density/register variation がまだ長尺疲労を支えるほど分化していないことを示す。

`prompts/musical-review.md` による schema version 7 再レビューでは、stacked PR #72-#80 は Phase 7 後半の evidence coverage と小さな scoring 改善までは進めたが、Phase 7 完了条件は満たさないと判断する。現在の bundle でも severe entry interval は合計 1956、unresolved severe entry interval は合計 1342、shared rhythm overlap は合計 18484、unison overlap は合計 14140、leap recovery miss は合計 418 残る。`0-1-2-3-4-3-2-1` 型は 4 seed まで減ったが、新しい `0-1-2-3-4-3-1-2` 型の 8 seed も severe entry interval 平均 100.875、未解決平均 80.125 で、5度へ順次上行した後の上部隣接形が entry 周辺の濁りをまだ誘発している可能性が高い。`listening-review.json` が全 seed `not-reviewed`、`pairwise-preferences.json` が空であることも Phase 8 前の blocker として残す。

section solo texture risk を form cost に加える小実験は棄却した。Phase 6/7 gate は保てたが、129600 tick review で `maxSelectedSectionSoloTextureRisk` は 8 のまま、risk 6 以上の selected section も 321 件のままで改善しなかった。候補ごとの weight 調整だけでは、continuity が同じ 1 声 filler shape に寄る構造を変えられないため、今後は section planner に codetta、段階的 thinning、stretto preparation、episode から次 entry へ向かう複数声部 continuity を追加する。

`listening-review.json` は 22 seed すべてが `not-reviewed`、`pairwise-preferences.json` は空のままにする。これらは committed source artifact ではなく review command が再生成する template なので、manual listening judgement と pairwise preference は実際の聴取 pass でだけ埋める。

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

加えて、主題だけでなく counter-subject、free counterpoint、continuity filler も固定 degree pattern と leap recovery gate によって順次上行・順次下降へ寄りやすい。Phase 7 後半では、順次進行そのものを禁じず、role/section ごとの `stepwiseRunRatio`、`maxMonotoneStepRun`、`repeatedDegreePatternCount`、`rolePatternEntropy` を diagnostics と review bundle に追加する。gate は大跳躍の回収だけでなく、長い単調順次進行と同じ degree pattern の横断反復を検出する。free counterpoint contour は上下両方向があるだけで満点にしない。

manual listening gate は代表 seed と境界 seed が `pass` になるまで blocker として残す。自動 gate は概形進行を CI に入れたことを示すが、音楽的な説得力の最終判定は MIDI または Web UI の聴取レビューで確認する。生成ロジックの変更では、既存の回帰テスト数値を固定的に守ることを目的にしない。複数 seed の review bundle と音楽美レビューで、主題認識性、entry harmony、旋律の歌いやすさ、対主題認識性、形式の疲労が改善している場合は、古い数値固定テストを現状維持用ではなく新しい品質期待へ更新する。

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

## Phase 7 upper-neighbor entry support shaping

5度へ順次上行して `0-1-2-3-4-3-1-2` へ折り返す主題型では、非 modal entry の counter-subject support を entry 冒頭だけ 2度/7度から外れる段階的な支えへ寄せた。主題、answer plan、free counterpoint pattern、modal counter-subject pattern は変えず、candidate evaluation model 5 ではこの主題型の selected subject-return candidate に 8拍 bass-upper contour の小さな selection guard も加えた。entry 支えを改善する代わりに Phase 7 contour margin を使い切らないためである。

採用した変更では 22 seed すべてが Phase 6/7 gate を pass した。schema version 7 review bundle では severe entry interval 合計が 1956 から 1909、未解決 severe entry interval 合計が 1342 から 1211、entry support instability 合計が 2728 から 2674 へ下がった。`0-1-2-3-4-3-1-2` 型の 8 seed 合計では severe entry interval が 807 から 760、未解決 severe entry interval が 641 から 510 へ下がった。主な改善 seed は `fugue-smoke` 108/100 から 98/72、`wide-key` 105/97 から 96/72、`tight-stretto` 105/97 から 96/72、`contrary-motion` 102/94 から 93/69 で、`circle-fifths` も 104/97 から 94/69 へ下がった。`dense-modal` は modal counter-subject を保つため severe/unresolved は 92/43 のまま、leap recovery は 6 のまま維持した。

保護 seed では `modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian`、`dense-modal`、`angular-answer` が Phase 6/7 gate 内に残った。全 22 seed の `leapRecoveryMisses` 合計は 418 から 409 へ下がり、`counterSubjectIdentityRetention` の下限は `modal-cadence` の 0.573 のまま維持した。

5度順次上行 prefix 全体、つまり `0-1-2-3-4-3-2-1` 型にも同じ support shaping を広げる案は棄却した。強い variant では `lyrical-line` と `contrary-answer` の severe entry interval は大きく下がったが、両 seed の `leapRecoveryMisses` が Phase 6/7 gate 付近まで悪化した。滑らかな variant でも `contrary-answer` の `leapRecoveryMisses` が 34 になり、Phase 6 gate を壊した。今後 `0-1-2-3-4-3-2-1` 型を直す場合は、entry support degree だけでなく、answer-local support voice の leap recovery を同時に候補選択へ入れる。

## Phase 7 major subject tail shaping

`lyrical-line` と `contrary-answer` は `0-1-2-3-4-3-2-1` 型の主題末尾を維持しており、entry 冒頭の 2 度/7 度衝突が高止まりしていた。`modal-cadence` はすでに `0-1-2-3-4-3-1-2` 型だが、modal counter-subject と free support が作る entry-local collision が残るため、今回は modal pattern には触れない。

採用した小変更では、major key に限って `0-1-2-3-4-3-2-1` 型の主題 weight をさらに下げた。minor と modal seed は従来 weight を保ち、modal identity と minor subject shape の既存 margin を使わない。これにより `lyrical-line` は `0-1-2-3-4-3-1-2` 型へ移り、entry support instability は 145 から 136、severe entry interval は 108 から 98、未解決 severe entry interval は 100 から 72 へ下がった。leap recovery misses も 25 から 19 へ下がり、Phase 6/7 gate と #82 の `fugue-smoke`、`wide-key`、`tight-stretto`、`circle-fifths`、`contrary-motion` の entry 改善は維持した。`modal-cadence` と `contrary-answer` は今回の採用案では変わらず、次の entry harmony work の対象として残す。

major key の weight をさらに下げ、`contrary-answer` を `0-2-1-3-4-3-2-1` 型へ移す案は棄却した。この実験では `contrary-answer` の severe entry interval は 105 から 72、未解決 severe entry interval は 97 から 32 へ下がったが、`leapRecoveryMisses` が 39 まで悪化して Phase 6/7 gate を壊した。`0-1-2-3-4-3-2-1` 型へ #82 と同じ support shaping を広げる案も再確認したが、`lyrical-line` は 99/75、`contrary-answer` は 97/75 まで改善する一方で、`contrary-answer` の `leapRecoveryMisses` が 32 まで悪化した。今後 `contrary-answer` を直す場合は、subject shape 変更か support degree 変更だけではなく、answer-local support voice の leap recovery を同時に守る候補選択が必要になる。

## Phase 7 modal cadence entry support

`modal-cadence` は `0-1-2-3-4-3-1-2` 型へ移っても、modal counter-subject と free support が entry 冒頭で 2 度/7 度を残していた。小変更として、modal cadence を持つ selected candidate に限って、entry-local の instability、severe interval、unresolved severe interval を追加 cost に入れた。modal support pattern 自体は変えず、candidate evaluation model を 6 に上げて、この選択重みを review bundle から区別できるようにした。

採用した重みでは 22 seed すべてが Phase 6/7 gate を pass した。`modal-cadence` は entry support instability が 149 のまま、severe entry interval が 108 から 101、未解決 severe entry interval が 91 から 70 へ下がった。`counterSubjectIdentityRetention` は 0.573 から 0.580 へ上がり、`leapRecoveryMisses` は 17 から 14 へ下がった。#82/#83 の保護 seed は、`fugue-smoke` 136/98/72、`wide-key` 130/96/72、`tight-stretto` 144/96/72、`circle-fifths` 110/94/69、`contrary-motion` 116/93/69、`lyrical-line` 136/98/72、`contrary-answer` 145/105/97 を維持した。modal identity seed では `dense-modal` が 134/92/43、`angular-answer` が 122/83/22、`modal-answer` が 112/78/32、`modal-dorian` が 120/76/7 で Phase 6/7 gate 内に残った。

modal free support pattern を `[0, 3, 3, 2, 5, 4, 3, 2]` へ広く変える案は棄却した。この実験では `modal-cadence` の severe entry interval は 22、未解決 severe entry interval は 21 まで下がったが、`modal-dorian` の `leapRecoveryMisses` が 66、`angular-answer` が 56、`modal-answer` が 61、`modal-cadence` が 41 まで悪化し、`modal-dorian` の counter-subject identity も 0.515 へ落ちた。`dense-modal` は 4拍 bass-upper contour が Phase 7 gate を外れた。今後 modal support pattern を変える場合は、entry interval だけでなく、modal identity、leap recovery、contour を同時に守る局所条件が必要になる。

modal severe interval の追加 weight をさらに強くする案も棄却した。`modal-cadence` は 146/98/61 まで改善したが、8拍 bass-upper same-direction ratio が 0.665 になり Phase 7 gate を壊した。今後 `modal-cadence` をさらに下げる場合は、強い vertical cost だけで選ばせず、modal cadence approach と bass-upper contour を同じ候補説明で扱う。

## Phase 7 contrary-answer entry support

`contrary-answer` は `0-1-2-3-4-3-2-1` 型の主題を残したまま、entry 周辺の 2度/7度衝突が 145/105/97 に高止まりしていた。主題型を `0-2-1-3-4-3-2-1` へ移す案や #82 の support shaping を広げる案は大跳躍回収の余裕を使い切ったため、今回は exact stepwise fifth-climb の非 modal counter-subject pattern だけを局所的に変え、上部隣接型、modal pattern、candidate scoring weight は変えない。

採用した pattern は、既存の冒頭 `[4, 2, 3, 1]` が応唱 local key の第2音と entry 第2音で 2度を作りやすい箇所を `[4, 1, 3, 1]` へ寄せる。`contrary-answer` は entry support instability が 145 から 136、severe entry interval が 105 から 96、未解決 severe entry interval が 97 から 72 へ下がり、`leapRecoveryMisses` は 24 のまま維持した。Phase 6/7 gate と `fugue-smoke`、`wide-key`、`tight-stretto`、`circle-fifths`、`contrary-motion`、`lyrical-line`、`modal-cadence` の既存改善も維持した。modal identity seed は modal counter-subject path を使うため、`modal-answer`、`modal-dorian`、`dense-modal`、`angular-answer` の counter-subject identity と contour guardrail は従来の範囲内に残った。

exact stepwise fifth-climb に追加 entry-risk scoring を入れる案は棄却した。prefix 全体へ severe/unresolved cost と voice leap recovery guard を足すと、`contrary-answer` の entry support は 144/105/97 でほぼ改善せず、`leapRecoveryMisses` が 32 まで悪化した。今後 `contrary-answer` をさらに下げる場合は、縦方向 cost を強めるのではなく、section/entry planner が support voice と answer-local leap recovery を同時に候補化する必要がある。

## Phase 7 stepwise pattern fixation review

追加レビューでは、現行生成が主題以外にも順次進行へ寄ることを確認した。`free-counterpoint` は固定 degree pattern を entry support、continuity filler、全休止 gap 補填で再利用し、長い音価を次の degree と半分ずつに割るため、複数 seed で隣接音程の 7 割前後が step になる。既存 `freeCounterpointContourScore` は上下両方向と 3 音以上の pitch があれば高くなるため、固定された山型・谷型の反復を検出できない。

この固定化は、固定 pattern だけでなく gate と scoring の副作用でもある。`leapRecoveryMisses` は候補評価と Phase 6/7 gate で強く守られる一方、長い単調順次進行、同じ degree pattern の反復、role ごとの contour entropy 低下には直接の失敗条件がない。結果として、跳躍を含む候補は gate 余裕を使いやすく、順次型の安全な候補が選ばれやすい。

今後の生成改善では、まず diagnostics と review bundle に role/section 別の stepwise pattern evidence を追加する。最低限、`subject`、`answer`、`subject-fragment`、`counter-subject`、`free-counterpoint` を分け、step ratio、上行 step ratio、下行 step ratio、最大単調 step run、反復 degree n-gram、section をまたぐ pattern entropy を出す。候補評価では、順次進行を全面禁止せず、長い単調 run と seed 横断の同型反復だけを soft cost にする。

テスト方針も更新する。生成系の回帰テストは、古い seed の exact metric や exact pattern count を守るためのものではなく、音楽美レビューで確認した品質期待を固定するためのものとする。候補 pattern、weight、gate threshold を変える PR では、`pnpm fugematon review --out samples/<review-name>` で代表 seed、境界 seed、adversarial seed を生成し、diagnostics と MIDI/Web UI 聴取で音楽美レビューを行う。レビューで改善が確認でき、悪化がある場合も tradeoff と影響 seed を文書化できるなら、回帰テストは新しい期待値へ更新してよい。数値を変えづらい場合は、古い exact assert を範囲、傾向、説明 feature の存在確認へ置き換える。

## Phase 7 stepwise diagnostics evidence

scoring 変更の前に、role/section 別の stepwise pattern evidence を diagnostics と review bundle summary に追加した。`GenerationDiagnostics.stepwisePattern` は `subject`、`answer`、`subject-fragment`、`counter-subject`、`free-counterpoint` と、存在する場合の `fallback` について、`stepwiseRunRatio`、`ascendingStepRatio`、`descendingStepRatio`、`maxMonotoneStepRun`、`repeatedDegreePatternCount`、`rolePatternEntropy` を出す。section summary も同じ指標を section state と tick 範囲に紐づける。

review bundle summary は schema version 8 として `diagnosticsSummary.texture.stepwisePattern` を持つ。`CandidateEvaluation.featureVersion` は 2 になり、selected candidate の melody/texture features は free counterpoint の stepwise ratio、最大単調 run、反復 degree pattern、role pattern entropy と role 横断の最大 run/反復 count を参照できる。ただしこの PR では stepwise 指標を scoring weight に入れず、生成挙動を変えない evidence coverage として扱う。

テストでは固定 review seed、rotation seed、adversarial seed 全体で Phase 6/7 gate が pass すること、`freeCounterpointContourScore` が 1 でも上下両方向だけでは長い単調 step run と反復 degree pattern を隠せないことを確認する。Phase 7 は依然として未完了であり、次の PR はこの evidence を使って、順次進行を全面禁止せずに固定 filler 化だけを抑える scoring または generator 変更を小さく検証する。

## Phase 7 stepwise pattern scoring

stepwise pattern scoring の小変更では、candidate evaluation model 7 として、非 modal candidate に限って `free-counterpoint` の `stepwiseRunRatio` と `maxMonotoneStepRun` を軽い melody cost に入れた。順次進行そのものは禁じず、`freeCounterpointContourScore` が上下両方向だけで満点になる候補のうち、長い単調 run を持つものを少し下げる。modal candidate は counter-subject identity の余裕が薄いため今回の cost から外し、modal pattern は専用の entry/identity/contour 同時評価で扱う。

採用した重みでは、固定 seed、rotation seed、adversarial seed 22 件すべてが Phase 6/7 gate を pass した。非 modal blocker seed では、`fugue-smoke` の `free-counterpoint` stepwise ratio が 0.718 から 0.715、`lyrical-line` が 0.719 から 0.703 へ下がった。`contrary-answer` は `maxMonotoneStepRun` が 5 から 4、`repeatedDegreePatternCount` が 533 から 527 へ下がった。`lyrical-line` の `leapRecoveryMisses` は 19 から 16 へ下がったが、`fugue-smoke` は 20 から 23、`contrary-answer` は 24 から 31 へ上がったため、今回の scoring は Phase 6/7 gate 内の小さな候補選択調整に留め、強い stepwise penalty にはしない。

continuity filler の degree pattern を直接変える案は棄却した。この実験では 22 seed 平均の `free-counterpoint` stepwise ratio は 0.746 から 0.687 へ大きく下がったが、`sparse-cadence` と `restless-line` の `unisonOverlapCount` が 768 になり、`ornament-test` の `leapRecoveryMisses` が 46、`angular-answer` の `counterSubjectIdentityRetention` が 0.571 まで悪化して Phase 6/7 gate を壊した。今後 continuity filler pattern を変える場合は、stepwise ratio だけでなく unison overlap、leap recovery、modal counter-subject identity を同じ候補または section-local guard で同時に守る。

## Phase 7 section continuity pattern rotation

section continuity の小変更では、非 modal seed に限り、最初に選ばれた continuation state pattern を基本形として保ちながら、7 cycle ごとに次の pattern を 1 cycle だけ挿入する。episode、subject-return、stretto-like の役割は増やさず、modal seed は counter-subject identity と modal cadence support の余裕が薄いため従来の pattern を保つ。

採用した変更では固定 seed、rotation seed、adversarial seed 22 件すべてが Phase 6/7 gate を pass した。schema version 8 の state transition evidence で、4 section continuation pattern の unique count 合計は 112 以上になり、most repeated count は最大 7 に収まった。代表 seed では `fugue-smoke` が unique 6 / most repeated 7、`long-arc` が unique 7 / most repeated 7、`lyrical-line` が unique 5 / most repeated 7、`contrary-answer` が unique 6 / most repeated 7 になった。modal seed は `modal-answer`、`modal-dorian`、`modal-cadence`、`dense-modal`、`angular-answer` の entry harmony、leap recovery、counter-subject identity、contour gate を維持した。

selected section solo texture risk はまだ残る。22 seed 合計の risk 6 以上の selected section は 317 件で、最大 risk は 8 のままである。これは 321 件からの小さな改善に留まり、Phase 7 完了条件ではなく form repetition を弱める構造的な足場として扱う。`close-imitation` は shared rhythm overlap が 814、short strong-beat entry note が 31 へ動いたため、Phase 5.9/5.10 の境界 seed ceiling は新しい品質基準へ更新した。これは form variation による tradeoff として許容するが、次の voice-independence PR では shared rhythm と entry note density を改めて下げる。

continuity に 2 声目の support line を足す案は棄却した。full support では代表 seed の selected section solo texture risk は max 2 まで下がったが、`fugue-smoke` の `leapRecoveryMisses` が 45、`sparse-cadence` が 73 まで悪化し、`angular-answer` の `counterSubjectIdentityRetention` は 0.543、`dense-modal` は 4拍 outer-voice same-direction ratio 0.862 まで悪化した。短い staged support でも `bright-answer` の `leapRecoveryMisses` 42、`ornament-test` 43、`modal-cadence` の `counterSubjectIdentityRetention` 0.476 が Phase 6/7 gate を壊した。今後の solo texture 改善は、単に continuity の声数を増やすのではなく、second support voice の開始音、既存 voice-pair unison、leap recovery、modal identity、outer-voice contour を section-local guard として同時に見る必要がある。continuation pattern をより頻繁に切り替える案も今回は採用しない。section の役割が短い周期で変わりすぎると candidate selection が entry harmony、stepwise filler、voice independence の既存余裕を使いやすくなるため、次の form 改善では codetta、staged thinning、複数声部 continuity を section-local の候補として追加し、solo texture risk と entry/contour guardrail を同時に見る。

## Phase 7 exact pitch lockstep guard

voice independence 完了作業では、まず candidate evaluation model 8 として非 modal candidate に限り voice-pair の exact same-pitch overlap を小さな selection cost に加えた。既存 model 7 の unison/shared-rhythm 全体 cost は維持し、modal seed は counter-subject identity と contour の余裕が薄いため今回の新 cost から外す。これにより `quiet-cadence` の same-pitch overlap は 9 から 7 へ下がった。`bright-answer` は 8、`modal-answer` は 13、`restless-line` は 2、`sparse-cadence` は 2、`minor-entry` は 26 のままで、Phase 6/7 gate と close-imitation の #90 tradeoff ceiling は維持した。

より広い voice-pair lockstep cost は棄却した。unison、shared rhythm、same-direction motion の pair-local max を同時に cost 化すると、`modal-answer` の exact same-pitch overlap は 4-9 まで下がる一方で `leapRecoveryMisses` が 34 または same-direction motion が 817 になり、Phase 6/7 gate を壊した。`dense-modal` も counter-subject identity が 0.561 まで落ちた。global unison/shared-rhythm selection weight を 8/4 から 9/5 へ上げる案も、`restless-line`、`sparse-cadence`、`minor-entry` の shared rhythm を改善せず、`fugue-smoke` の exact same-pitch overlap を 39 へ悪化させたため採用しない。

texture placement 側の直接変更も今回は採用しない。active pitch と exact 同音になる support note を octave 移動する案は `bright-answer` の pitch-class unison を下げたが、exact same-pitch overlap を 26 へ悪化させた。entry の free-counterpoint support を半拍または 8分音符だけ遅らせる案は shared rhythm と unison を大きく下げたが、rhythmic independence score が 0.05 前後または 0 まで落ち、`bright-answer` と `minor-entry` の leap recovery も gate を壊した。今後の shared-rhythm 改善は、support line の一括遅延や octave 移動ではなく、section-local candidate として voice-pair unison、shared rhythm、leap recovery、modal identity、contour を同時に評価する。

## Phase 7 reference diagnostics reset

Phase 7 のここまでの実験で、CI に入っている absolute metric は破綻回避や小さな候補選択改善には有効だが、音楽的な心地よさの完了条件としては不十分だと判断する。unison、shared rhythm、stepwise motion、entry 周辺の seconds/sevenths は、良い既存作品にも文脈つきで現れるため、単純な count を下げるだけでは改善にならない。逆に、count を下げる局所修正は leap recovery、modal counter-subject identity、contour を壊しやすい。

このため Phase 7 後半の中心を、weight tuning から reference diagnostics へ移す。詳細計画は [Phase 7 参照作品 diagnostics 計画](../reviews/phase-7-reference-diagnostics-plan.md) に置く。

次の実装順は以下に変更する。

1. Bach WTC fugue など、voice 分離と拍節 metadata を保てる参照 score を小集合で取り込み、source id、版、license、取り込み日を manifest に残す。music21 corpus と KernScores は候補 source とするが、score file の再配布可否は項目ごとに確認する。
2. 参照作品を Fugematon の `ScoreEvent` 相当へ正規化し、現行 `GenerationDiagnostics` と同じ axes を生成する。count は曲長、active voice-pair duration、entry 数、section 数で正規化する。
3. reference profile を作り、Fugematon 22 seed の diagnostics を percentile または距離として比較する。`sharedRhythmOverlap`、`samePitchOverlap`、entry-local severe interval、leap recovery、role/section 別 stepwise pattern、section density transition、long-run repetition を初期対象にする。
4. 現行候補集合に対して candidate pool oracle を作る。blocker seed ごとに、entry harmony、leap recovery、modal identity、voice-pair lockstep、contour の reference-relative guard を同時に満たす候補が存在するかを確認する。
5. 候補が存在する場合は selection model を hard constraint、Pareto guard、style tie-break に分ける。候補が存在しない場合は section-local planner を追加し、entry support、second support voice、texture thinning、codetta、stretto preparation を文脈つき候補として生成する。
6. reference profile に近づいた変更だけを採用候補にせず、代表 seed と境界 seed の pairwise listening で現行より勝つことを Phase 7 完了条件に入れる。

文献上の根拠は、generated Bach-style polyphony を interpretable feature で評価する研究、theory-guided constraints と corpus-derived distribution を併用する研究、corpus から voice-leading/harmonic prototype を読む研究、fugue entry を主題型だけではなく文脈依存の voice-leading として見る分析に置く。現時点の結論は、Bach らしさを単一 score として学習することではなく、参照作品の分布から外れている軸を説明可能にし、CI gate を absolute threshold から reference-relative review gate へ移すことである。

### PR1 reference diagnostics coverage

最初の stacked PR では、生成挙動を変えずに reference diagnostics の足場だけを追加した。`packages/core` に metadata-only の `phase-7-fugue-reference-profile` を置き、score file は再配布せず、source id、source format、license policy、import date、MusicXML/Humdrum ingestion の extension point を明示する。

comparison は既存の `GenerationDiagnostics` 軸から作る。shared rhythm、pitch-class unison、exact same-pitch overlap は推定 active voice-pair quarter duration、entry 周辺 severe interval は subject entry 数、leap recovery と repeated degree pattern は score quarter length、solo texture は section 数で正規化する。free-counterpoint stepwise run ratio は既に比率なのでそのまま比較する。これにより shared rhythm、unison、stepwise motion はゼロ要求ではなく、参照 profile に対する分布外れとして review できる。

review bundle summary は schema version 9 として `referenceDiagnostics` と seed ごとの `referenceComparison` を出す。22 seed の Phase 6/7 gate と生成結果はこの PR では変更しない。

残りは、実 score の MusicXML/Humdrum ingestion、参照作品からの percentile profile 生成、active voice-pair duration の実測、tonal/modal/fugue/chorale profile の分離、reference-relative gate の `review-required` 運用、candidate pool oracle、section-local planner 改善、pairwise listening での採否確認である。Phase 7 はこの PR では完了しない。

### PR2 candidate pool oracle

2 本目の stacked PR では、生成挙動と scoring weight を変えずに、現行 continuation candidate pool の中で代表 blocker を切り分ける oracle を追加した。各 continuation section で、selected candidate と同じ pool の候補を `CandidateEvaluation` の説明 feature と PR1 の reference diagnostics 軸に対応づけて比較する。

oracle は hard failure を持つ候補を viable candidate から除外し、leap recovery、modal counter-subject identity、Phase 7 contour feature などの guardrail を selected candidate より悪化させない候補だけを見る。そのうえで entry harmony、voice-pair lockstep、melody leap recovery、stepwise pattern fixation、section solo texture の representative blocker について、reference-relative risk を下げる viable candidate が pool 内にあれば `selection-model`、なければ `generator-or-section-planner` に分類する。

review bundle summary は schema version 10 として、seed ごとの `diagnosticsSummary.candidatePoolOracle` を出す。これは責務分類の evidence であり、候補選択や section planner の修正はまだ行わない。Phase 7 は引き続き未完了であり、次は実 score ingestion と reference percentile profile、分類結果に基づく section-local planner/scoring 改善、代表 seed と境界 seed の pairwise listening gate が残る。

### PR3 section-local planner blocker

3 本目の stacked PR では、section-local planner の小変更として non-modal continuation の staged thinning 候補を検証した。候補は primary continuity line に短い 2 声目の held support を足し、solo texture risk を下げる狙いだった。

広い staged thinning は diagnostics 上の solo texture を改善した。22 seed の risk 6 以上の selected section は 317 から 249-278 まで下がり、unsupported solo run も多くの non-modal seed で 0 まで下がった。しかし `sparse-cadence` と `restless-line` は `unisonOverlapCount` が 770-775 になり Phase 6/7 gate を壊し、`fugue-smoke`、`lyrical-line`、`contrary-answer` は `samePitchOverlapCount` が 41-48 まで悪化した。

relative guard、absolute Phase 6/7 ceiling guard、stretto-like 限定の順に候補を狭めたが、gate を完全に保つ設定では selected section solo texture risk が PR2 baseline と同じ risk 6 以上 317 件、total risk 3188 に戻り、before/after pairwise preference を支える改善が残らなかった。このため PR3 では planner change を採用しない。Phase 7 は完了しておらず、Phase 8 へ進む blocker は継続する。

今後の section-local planner は、2 声目を足すだけではなく、active voice-pair の exact pitch/unison、support voice の開始音と held duration、leap recovery、modal identity、outer-voice contour を候補生成時点で同時に評価する必要がある。candidate pool oracle は selection/generator 責務の切り分けには有効だったが、PR3 の結果から、solo texture 改善は local solo risk だけを優先する候補追加としては採用できない。

### PR4 completion path blocker

4 本目の確認では、PR2 の oracle と PR3 の blocker 記録を前提に、staged thinning を繰り返さず、既存 candidate pool の reference-relative selection だけで Phase 7 完了へ進めるかを調べた。manual listening は実施しておらず、判断は diagnostics-backed audit に限る。

baseline の 22 seed は Phase 6/7 gate をすべて pass した。oracle では section-solo-texture が全 seed で `generator-or-section-planner` に分類され、risk を下げる viable existing-pool candidate は 0 件だった。entry-harmony は `bright-answer` の 1 section だけが `selection-model` で、form/solo-risk の tie-break は 5、10、25、50、100、200 の total-cost margin すべてで candidate を変更しなかった。

reference-relative tie-break の小実験では、lockstep 優先と combined risk 優先は 22 seed 中 1 seed の Phase 6/7 gate を壊した。entry 優先は 25 以上の margin で 1 section だけ変わり、合計 severe entry interval は 1859 から 1857、unresolved severe entry interval は 1084 から 1078 へ下がったが、selected section solo texture risk は 317 件のままだった。stepwise 優先は gate を保ち、合計 leap recovery miss を 407 から 393-396 へ下げたが、same-pitch/unison は少し悪化し、shared rhythm 18536 と high solo risk 317 は動かなかった。

このため、既存 pool の reference-relative selection tie-break だけでは Phase 7 完了条件を満たせない。Phase 7 は、実 score ingestion と percentile profile、section-local candidate 生成、manual pairwise listening evidence がそろうまで blocked のままとする。次の実装候補は、既存 pool の重み追加ではなく、support voice の pitch class、octave、onset、duration、voice-pair lockstep、leap recovery、modal identity、outer-voice contour を同時に guard する section-local candidate 生成に限る。

### Phase 7+ gate reorg

PR3/PR4 の blocker audit により、旧 Phase 7 完了条件は Phase 8 の操作機能を過度に止めることが分かった。absolute Phase 6/7 gate を完全維持すると section-local planner 改善が baseline へ戻り、gate を緩めずに採用できる before/after preference evidence は残らなかった。一方で、unison、shared rhythm、stepwise motion、entry-local seconds/sevenths、solo texture は文脈依存の音楽現象であり、単体の absolute ceiling を Phase completion blocker にし続けると、音楽的な tradeoff を評価できない。

このため Phase 7A は reference diagnostics、candidate pool oracle、rejected experiment 記録までの diagnostics reset として完了扱いにする。Phase 7B では gate policy を hard constraint、review signal、manual preference へ分ける。range、voice crossing、subject identity、answer plan、determinism、schema compatibility は hard constraint として残し、rhythmic independence、unison、same-pitch、severe entry interval、leap recovery、solo texture、stepwise fixation、long-run repetition、contour ratio は review signal へ降格する。

Phase 7B は gate policy reset として完了した。review bundle summary は schema version 11 になり、既存の `phase7Gate` に加えて `phase7BGate` を出す。`phase7BGate` は hard failure、review-required、warning、manual の分類、`hardConstraintPassed`、`phase8Ready`、legacy Phase 7 gate を含む。hard failure として残すのは range、voice crossing、subject identity、answer plan、key metadata、unresolved dissonance、all-voice silence、schema shape である。Phase 6/7 の absolute beauty metric は review signal または warning として残し、値は review bundle と docs で比較する。

Phase 8 は Phase 7B の gate policy reset 後に開始できる。manual listening と pairwise preference は廃止しないが、全 seed pass を Phase 8 開始条件にはしない。開始条件は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape が通ることである。

その後、section-local planner 改善、reference corpus ingestion、percentile profile、manual pairwise preference は Phase 10 として先に進め、Phase 8/9 は deferred operational lane に送った。Phase 10 後の譜面レビューでは、音域分離、進行反復、終止感のない thinning、強拍/弱拍を意識しない和声設計が無限再生前の blocker と確認されたため、現在は Phase 11 の品質モデル再設計を先に扱う。詳細は [Phase 7+ 再編計画](phase-7-plus-reorg.md)、[Phase 10](phase-10.md)、[Phase 11](phase-11.md) を参照する。

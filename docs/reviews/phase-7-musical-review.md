# Phase 7 音楽美レビュー

Phase 7 前半の contour gate 実装後に、固定 review seed、rotation seed、adversarial seed 22 件を再生成し、音楽的美しさ、対位法、フーガ技法、和声、長尺聴取の観点で再レビューした。さらに schema version 6 の candidate evaluation explanations 追加後にも同じ bundle を再確認した。

Phase 7 gate は全 seed で pass した。ただし、これは pitch contour の概形進行を観察・抑制できるようになったことを示すに留まり、楽曲として十分に美しいことは示さない。手動聴取 gate と pairwise preference はまだ未入力であり、Phase 8 の操作機能へ進む前に Phase 7 後半をさらに音楽品質改善へ寄せる。

## 実行内容

```sh
pnpm fugematon review --out samples/phase-musical-review --ticks 129600
```

生成 bundle は schema version 6、22 seed、129600 ticks で、全 seed の Phase 6 gate と Phase 7 gate は pass した。`listening-review.json` は全 seed が `not-reviewed`、`pairwise-preferences.json` は空のため、今回の美的判断は diagnostics と MIDI bundle の構造 evidence に基づく暫定レビューである。

schema version 6 では、selected candidate evaluation が `featureVersion`、`evaluationModelVersion`、entry、voice-pair、voice、section 単位の explanations を持つ。これは Phase 7 後半の観察基盤としては前進だが、下記の blocker は解消していない。特に `fugue-smoke` の最初の selected candidate では、harmony dimension が entry support instability 3、severe entry interval 3、unresolved severe entry interval 3 を feature に持ちながら cost 0/reward 22 になっており、現行 breakdown は「なぜその濁りを許したか」を音楽的に説明できていない。

## 文献ベースライン

具体的な版・ページ・引用は未検証なので、ここでは source family として扱う。

* Fux/species counterpoint: 声部独立、反行・斜行、完全協和の扱い、不協和の準備と解決、大跳躍後の回収を判断軸にする。
* Bach/fugue and tonal counterpoint: 主題・応答・対主題の認識性、episode の展開機能、stretto の緊張、cadence pacing を判断軸にする。
* Common-practice harmony: entry 周辺の root support、third/fifth、seconds/sevenths、tendency tone resolution、cadence function を判断軸にする。
* Jazz/modal harmony and popular-music form: modal color や loop-like repetition は style profile 次第で許容できるが、strict-classical seed の unresolved clash や機械的反復の免罪には使わない。

## 主な発見

### 1. Gate pass 後も声部独立が弱い

全 seed の rhythmic independence は最小 0.079、最大 0.113、平均 0.097 に留まる。shared rhythm overlap は合計 18484、unison overlap は合計 14344 で、Fux 的な独立した複数声部というより、支え声部が同じ拍節で厚く重なる印象が残る。

代表的な境界 seed は `restless-line`、`sparse-cadence`、`modal-answer`、`bright-answer`、`minor-entry`、`quiet-cadence`。これらは shared rhythm overlap が 870-906、unison overlap が 728-762 付近に張り付く。

現在の diagnostics は検出しているが、gate 閾値が「破綻回避」寄りで、音楽的な声部独立の pass 判定としては甘い。schema version 6 bundle では same-pitch overlap も合計 306 まで残り、`contrary-motion` 40、`fugue-smoke` 33、`contrary-answer` 32、`lyrical-line` 30、`minor-entry` 26 が目立つ。Phase 7 後半では exact same-pitch unison、shared rhythm、同方向進行を別々に罰するだけでなく、section role と voice pair ごとの反復パターンとして説明する必要がある。

### 2. Entry 支持和声の濁りがまだ大きい

severe entry interval は合計 1946、unresolved severe entry interval は合計 1321、entry support instability は合計 2737。`modal-cadence`、`lyrical-line`、`fugue-smoke`、`contrary-answer`、`tight-stretto`、`wide-key` は severe entry interval が 105-108 付近で、未解決も 91-100 付近に残る。

common-practice harmony では、entry の structural notes は root、third、fifth、または準備・解決を持つ non-chord tone として説明される必要がある。modal context でも color tone は許容できるが、主題 entry の輪郭を濁らせる m2/M2/m7/M7 の持続は、style profile が明示しない限り美的な blocker として扱う。

現在の harmony dimension は多くの selected candidate で reward が満点付近になり、entrySupportInstabilityCount と severeEntryIntervalCount を feature に持っていても low-level な音程衝突の説明力が弱い。schema version 6 の explanations は entry ごとの件数を示すが、root、chord member、avoid note status、non-chord tone role、解決期限をまだ出していない。Phase 7 後半では entry/cadence 周辺のこれらの和声役割を dimension breakdown に出す。

#### 2.1. 主題フレーズ型が entry 衝突を誘発している可能性

追加で 22 seed の subject degree pattern と severe entry interval を集計した。`0-1-2-3-4-3-2-1`、つまり主音から順次上行して5度へ達し、そのまま順次下降する型は 12 seed に出現した。対象は `fugue-smoke`、`wide-key`、`lyrical-line`、`modal-dorian`、`circle-fifths`、`close-imitation`、`contrary-motion`、`tight-stretto`、`angular-answer`、`modal-cadence`、`contrary-answer`、`dense-modal` である。この型の severe entry interval は平均 100.0、未解決 severe entry interval は平均 78.5、entry あたり平均 2.35 だった。

一方、隣接する比較対象として `0-2-1-3-4-3-2-1` 型は 10 seed に出現し、severe entry interval は平均 74.6、未解決 severe entry interval は平均 37.9、entry あたり平均 1.79 だった。これだけで因果を断定はできないが、`0-1-2-3-4-3-2-1` 型が多い seed ほど entry 周辺の m2/M2/m7/M7 が残りやすいという仮説は、現行 diagnostics と一致する。

`fugue-smoke` の exposition では、アルト主題が `0-1-2-3-4-3-2-1`、ソプラノ応答が tonal answer により `0-1-2-3-3-3-2-1` になる。tick 1920 ではアルト Ab とソプラノ Bb が M2 を作り、tick 2400 ではアルト G とソプラノ C が P4、tick 2880 ではアルト F とソプラノ D が M6 を作る。最初の応答自体は現行 severe interval 集計では 0 だが、同じ上行5度型が後続 entry と continuation で反復されるため、`fugue-smoke` 全体では severe entry interval 108、未解決 100 まで増える。

このため、解決策の優先順位は第一に主題フレーズ生成の見直しとする。現在の生成器は `0-1-2-3-4-3-2-1` を高確率で選び、別型も終盤 `3-4-3-2-1` を共有するため、5度到達後の下降が seed 横断で同型化している。Phase 7 後半では、主題候補を増やし、5度到達を structural climax として使う場合でも、応答開始時点の対旋律、保持音、反行、跳躍後回収、phrase boundary を同時に評価する。

第二の案である「応答を属音開始に固定せず、3度や6度などの不完全協和から始める」ことは、style profile と entry plan の選択肢としては残す。ただし、これを先に一般解にすると、fugal answer の tonic-dominant 関係と主題認識性を弱める可能性がある。採用する場合は、true/tonal answer の代替ではなく、episode、stretto-like、modal seed、または hybrid/popular-tolerant profile での derived answer として扱い、entry start interval が不完全協和でも、後続の structural tone が local key と subject identity を説明できることを gate にする。

### 3. Modal seed の対主題認識性が薄い

counter-subject identity retention の下位は `modal-cadence` 0.573、`dense-modal` 0.573、`angular-answer` 0.591、`modal-answer` 0.608、`modal-dorian` 0.627。modal color を入れた seed ほど対主題の輪郭が崩れやすい。

Bach/fugue 的には、episode や stretto で素材を変形しても、主題と対主題の再認識性が長尺聴取の軸になる。modal characteristic tone を鳴らすだけでは、対主題として覚えられる線にはならない。

Phase 7 後半では modal seed を優先回帰にし、counter-subject identity retention を seed 全体の平均だけでなく、entry 近傍・subject-return・stretto-like section ごとに確認する。

### 4. 旋律線はまだ歌い切れていない

leap recovery miss は合計 413。`modal-answer` 33、`bright-answer` 30、`contrary-motion` 29、`modal-dorian` 27、`contrary-answer` 24、`dark-episode` 23 が目立つ。大跳躍後の反行・順次回収は diagnostics に入っているが、局所 climax、息継ぎ、音域内の自然な山谷までは説明できていない。

Fux/species counterpoint の観点では、大跳躍は反行や順次進行で回収されるほど歌いやすい。popular-music 的な hook や loop でも、反復される旋律には記憶しやすい輪郭と呼吸が必要である。

Phase 7 後半では leap recovery を単発ミスの合計から、voice ごとの phrase contour、局所 climax、entry 後の支え声部の歌いやすさへ広げる。

### 5. Contour gate は通るが、境界 seed はまだ近い

Phase 7 gate 後も、4 拍 bass-upper same-direction ratio は `dense-modal` 0.710、`modal-dorian` 0.692、`wide-key` 0.682、`close-imitation` 0.671、`tight-stretto` 0.607、`quiet-cadence` 0.605。outer-voice same-direction ratio は `dense-modal` と `modal-dorian` が 0.736。

Fux 的には同方向進行自体を全面禁止しないが、bass と上声が同じ概形へ流れ続ける場合は sequence、cadence approach、意図した doubling などの理由が必要である。現状は contour が gate 内に収まっただけで、「なぜその同方向進行が音楽的に必要か」を説明できない。

Phase 7 後半では contour 指標を candidate scoring に置くだけでなく、section plan と cadence approach に結びつけた説明を出す。

### 6. 形式がまだ定型的で、長尺の疲労を招く

全 seed は exposition 後に episode、subject-return、stretto-like を短い cycle として反復する。section 数は 31-34 に収まるが、long-run interest を支える codetta、呼吸、密度変化、主題素材の段階的変形、終止後の方向転換は diagnostics 上まだ弱い。

Bach/fugue and common-practice form の観点では、episode は filler ではなく、次の entry、local key、cadence、stretto の緊張へ向かう必要がある。popular-music 的な loop tolerance を採る場合でも、長尺では texture density、register、rhythm pattern の変化が必要である。

Phase 7 後半では continuation planner を評価説明力の題材に留めず、episode/codetta/stretto preparation の選択肢と長尺疲労の metrics を追加する。

### 7. Schema version 6 は説明基盤の完了であり、音楽品質の完了ではない

schema version 6 summary は `diagnosticsSummary.candidateEvaluation` に entry、voice-pair、voice、section explanation 数と最大 risk を残せる。全 seed で Phase 6 gate と Phase 7 gate は pass したが、代表 seed と境界 seed の blocker は残った。

* `fugue-smoke`、`wide-key`、`lyrical-line`、`modal-cadence`、`contrary-answer`、`tight-stretto` は severe entry interval が 105-108、未解決 severe entry interval が 91-100 に張り付く。
* `restless-line`、`sparse-cadence`、`modal-answer`、`bright-answer`、`minor-entry` は rhythmic independence が 0.079-0.090、shared rhythm overlap が 886-906、unison overlap が 736-762 に残る。
* `modal-cadence`、`dense-modal`、`angular-answer`、`modal-answer`、`modal-dorian` は counter-subject identity retention が 0.573-0.627 で、modal color と対主題輪郭の両立が弱い。
* `bach-001` でも selected candidate の section explanation が episode start tick 9120 の soloTextureRisk 6 を示し、`fugue-smoke`、`wide-key`、`lyrical-line` などでは maxSectionSoloTextureRisk 8 が残る。episode 後半が発展ではなく薄い filler に聞こえる懸念は解消していない。

このため schema version 6 は Phase 7 後半の「説明対象を固定する」条件は満たすが、Phase 7 完了条件は満たさない。manual listening judgement と pairwise preference が未入力であることも、Phase 8 前の blocker として残す。

## 計画再編

Phase 7 後半は、候補評価の説明力だけでなく、説明できた弱点を実際に潰す音楽改善フェーズとして扱う。

1. Refactor before scoring changes: `CandidateEvaluation` の feature extraction を entry、cadence、section、voice-pair の集計単位に分け、既存 Phase 6/7 gate を保つテストを先に追加する。
2. Entry harmony: entry/cadence 周辺の chord role、avoid note、seconds/sevenths、解決期限を harmony dimension の cost/reward と diagnostics に出し、`modal-cadence`、`lyrical-line`、`fugue-smoke`、`tight-stretto`、`wide-key` を回帰 seed にする。entry harmony は、support voice の音高だけを縦に動かして severe interval を避ける変更としては扱わない。試行では severe entry interval と unison overlap は減ったが、leap recovery と modal counter-subject identity が悪化して Phase 7 gate を壊したため、entry interval、leap recovery、counter-subject identity、contour を同じ候補評価で同時最適化する。
3. Subject phrase generation: `0-1-2-3-4-3-2-1` 型の過多と 5度到達後の同型下降を減らし、answer entry の支え声部が 2度/7度を作り続けない主題候補を選ぶ。`fugue-smoke`、`lyrical-line`、`modal-cadence`、`wide-key`、`tight-stretto`、`contrary-answer` を回帰 seed にする。
4. Entry interval alternatives: 属音開始を緩める案は derived answer として限定的に検証し、3度/6度開始を許す場合でも subject identity、local key、後続 structural tone の説明を gate にする。
5. Voice independence: same-pitch unison、shared rhythm、rhythmic lockstep を voice-pair と section role ごとに抑え、`restless-line`、`sparse-cadence`、`modal-answer`、`bright-answer`、`minor-entry` を境界 seed にする。
6. Modal counter-subject: modal seed の characteristic tone と対主題輪郭を両立させ、`modal-cadence`、`dense-modal`、`angular-answer`、`modal-answer`、`modal-dorian` を回帰 seed にする。
7. Melody and phrase: leap recovery、local climax、phrase breathing、support voice singability を voice 単位で説明し、`modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian` を境界 seed にする。
8. Form and long-run interest: episode/codetta/stretto preparation、段階的 thinning、register/density variation を section planner の責務にし、manual listening gate と pairwise preference を Phase 8 前の blocker として埋める。

Phase 8 は、代表 seed と境界 seed の manual listening judgement が `pass` になり、pairwise preference が少なくとも主要な改善前後比較を持つまで保留する。

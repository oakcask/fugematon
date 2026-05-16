# Phase 5.8 音楽美レビュー

Phase 5.7 までの実装後に review bundle を複数 seed で生成し、音楽的美しさ、対位法、フーガ技法の観点で diagnostics を確認した。hard constraints は安定しているが、美しさをプロジェクトの核心として扱うには、Phase 6 の履歴・操作機能より前に、声部独立、旋律線、リズム語彙、装飾、聴取 gate をさらに優先する必要がある。

## レビュー範囲

生成コマンド:

```sh
pnpm build
pnpm fugematon review --out samples/phase5-8-review --ticks 129600
```

対象 seed:

* `bach-001`
* `fugue-smoke`
* `minor-entry`
* `wide-key`
* `lyrical-line`
* `modal-dorian`
* `circle-fifths`
* `close-imitation`
* `sparse-cadence`
* `bright-answer`
* `dark-episode`
* `ornament-test`
* `long-arc`
* `contrary-motion`

確認した観点:

* hard constraints: 声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch、未解決不協和、全声部休止
* 対位法: parallel perfect、unison overlap、same direction motion、shared rhythm overlap、counter-subject identity retention
* 旋律美: leap recovery miss、repeated pitch run、free counterpoint contour
* フーガ技法: subject entry、episode direction、stretto clarity、cadence target、modal cadence
* 美しさ diagnostics の有効性: 指標が seed 間の差を説明できているか、満点に張り付いていないか

## 良かった点

* 全 seed で声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch は 0 だった。
* fallback passage count、melodic stagnation warning、未解決不協和、強拍不協和、cadence target miss、leading tone resolution miss、dominant resolution miss、predominant direction miss、harmonic function mismatch、全声部休止、tonal cadence overuse warning は全 seed で 0 だった。
* note 数、entry 数、section 数は seed ごとに変化しており、Phase 4 で問題だった完全な同型反復は後退している。
* `modal-dorian` は dorian mode と modal cadence を生成し、Phase 5.7 の modal context 修正は機能している。

## 見つかった問題

### 1. 声部独立がまだ弱い

全 seed で texture independence warning が出た。長尺 review では unison overlap が 528-762 件、same direction motion が 470-661 件、shared rhythm overlap が 778-906 件だった。rhythmic independence score も 0.081-0.112 に留まった。

これは「4声が鳴っている」ことと「4声が対位法的に独立している」ことがまだ分かれていないという問題である。フーガらしさの中心は、主題、応答、counter-subject、自由対位が別々の線として聞こえることなので、Phase 6 より前に声部独立を第一級 gate にする。

### 2. 大跳躍の回収不足が全 seed に残っている

leap recovery miss は全 seed で発生し、範囲は 13-30 件だった。特に `bright-answer`、`contrary-motion`、`modal-dorian`、`dark-episode` が多い。

大跳躍が反行や順次進行で回収されないと、非 entry 声部が歌える旋律ではなく、音高を埋める機械的な線に聞こえる。現在は warning として検出できているが、候補選択ではまだ十分に排除できていない。

### 3. 美しさ指標が満点に張り付き、差を説明できていない

`episodeDirectionScore`、`strettoClarityScore`、`styleModulationFit`、`controlledAmbiguityScore` は全 seed で 1 だった。`freeCounterpointContourScore` も全 seed で 1 だった。

これは全 seed が十分に美しいというより、現行指標が粗く、候補間の差や聴感上の弱さを説明できていない可能性が高い。満点が並ぶ指標は、section 単位、声部単位、entry 周辺、cadence 周辺へ分解し、満点の理由を diagnostics に残す。

### 4. modal seed の counter-subject identity が弱い

`modal-dorian` の counter-subject identity retention は 0.58 で、Phase 5.6 profile の代表閾値 0.85 を下回った。現行テストは Phase 5.6 の分解指標を主に `fugue-smoke` で確認しているため、modal seed の美しさ劣化を捕まえきれていない。

modal context は実装されたが、旋法的な特徴音を入れる過程で counter-subject の再認識性が落ちている。modal seed も review seed 全体の美しさ gate に含める必要がある。

### 5. 並達完全音程の疑いが残っている

parallel perfect warning は 7 seed に出た。最大は `dark-episode` の 8 件だった。hard failure ではないが、entry 周辺や stretto-like section では声部独立と主題の可聴性を弱める。

### 6. `ornament-test` が装飾の違いを十分に作れていない

ornament density は全 seed で 0.138-0.149 に収まり、`ornament-test` だけがはっきり装飾的になるわけではなかった。装飾音は候補密度だけでなく、cadence 前、entry 終端、長い保持音の前後で音楽的に意味を持つ配置として評価する。

### 7. 候補評価は texture cost の高さをまだ許容している

selected candidate の texture cost は 390-685 と大きく、total cost の主要部分を占めた。にもかかわらず hard constraints が通るため、長尺生成は採用されている。

美しさを核心にするなら、hard constraints に合格しただけでは不十分である。texture cost、melody cost、subject clarity の悪化が一定以上なら、代表 seed の Phase 通過を止める必要がある。

## 計画への反映

現行計画では、Phase 5 は Phase 5.11 で完了し、旋律線と評価説明力は Phase 6-7 に移す。履歴、巻き戻し、操作パラメータは Phase 8 で扱い、以下の美しさ gate を通過するまで開始しない。

### Phase 5.8: 聴取 gate と review artifact の固定

* review bundle ごとに diagnostics summary、MIDI、聴取メモ、seed 別判定を残せる形式を固定する。
* 聴取メモは、主題の記憶しやすさ、counter-subject の再認識性、非 entry 声部の歌いやすさ、episode の推進力、stretto の緊張感、長時間の退屈さを seed ごとに記録する。
* 自動 diagnostics が通っても、手動聴取で退屈、機械的、声部が独立して聞こえないと判断した seed は操作機能フェーズへ進めない。
* 聴取メモは後続の pairwise preference と learned weights の教師データ候補にする。

### Phase 5.9: review seed 全体の美しさ gate

* Phase 5.6/5.7 の分解指標を、単一代表 seed だけでなく review seed 全体に適用する。
* modal seed、close imitation seed、ornament seed、sparse cadence seed を、それぞれ専用の境界条件として扱う。
* counter-subject identity retention、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、leap recovery miss、selected candidate の melody cost と texture cost に review seed 全体の閾値を置く。
* 満点に張り付く episode、stretto、style、ambiguity、contour 指標は、section 単位の説明が出るまで Phase 通過条件にしない。

### Phase 5.10: 声部独立とリズム対位法の改善

* counter-subject と free counterpoint に、主題と異なるリズム型、反行、保持と動きの交替、休符の受け渡しを持たせる。
* unison overlap、same direction motion、shared rhythm overlap を候補選択の主要コストへ引き上げる。
* entry 周辺と stretto-like section では、完全協和の過密と同一リズムの重なりを通常 section より厳しく扱う。
* `ornament-test` は装飾密度だけでなく、装飾の配置理由が diagnostics で説明できる seed にする。

### Phase 6: 旋律線とフレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* 意図しない同音連打は tie または装飾的反復へ変換する。
* cadence 前、entry 終端、長い保持音の前後に、trill、mordent、turn、passing tone、neighbor tone を style profile に応じて配置する。
* subject return や cadence target の前後に、聴感上の呼吸と緊張解決が分かる phrase boundary を置く。

### Phase 7: 評価重みと pairwise preference

* manual listening gate の seed 別評価から、良い候補と悪い候補の pairwise preference を保存する。
* `EvaluationWeights` は feature version と evaluation model version を持つ外部定義にし、review bundle に dimension 別 score breakdown を出す。
* learned weights を検討する場合も、runtime には外部 API や大型モデルを入れない。
* learned weights は hard constraints と manual listening gate を上書きできない。

### Phase 8: 履歴、巻き戻し、操作パラメータ

Phase 8 は、Phase 6-7 の美しさ gate が代表 seed と境界 seed で通った後に開始する。UI 操作やパラメータで退屈さを隠すのではなく、生成器そのものが美しいフーガ的構造を作れることを先に確認する。

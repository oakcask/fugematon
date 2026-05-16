# Phase 5.9 音楽美レビュー

Phase 5.8 の review artifact 実装後に、複数 seed の review bundle を再生成し、音楽的美しさ、対位法、フーガ技法の観点で diagnostics と生成譜面の構造を確認した。Phase 5.8 により聴取メモと pairwise preference の器は固定されたが、現時点の生成器は「破綻しない」状態から「美しいフーガとして聴き続けられる」状態へはまだ届いていない。

## レビュー範囲

生成コマンド:

```sh
pnpm build
pnpm fugematon review --out samples/phase-musical-review --ticks 129600
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
* 対位法: counter-subject identity、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、parallel perfect
* 旋律美: leap recovery miss、repeated pitch run、free counterpoint contour
* フーガ技法: subject entry、section transition、episode direction、stretto clarity、modal context
* 評価器の説明力: selected candidate の dimension 別 cost と、満点に張り付く指標の有無

## 良かった点

* 全 14 seed で hard constraint failures は 0 だった。
* warning は各 seed で 2-3 件に収まり、声域、声部交差、主題同一性、応答計画、key metadata、未解決不協和、全声部休止は安定している。
* section count は 31-34、state transition は seed ごとに異なり、Phase 4 で問題だった完全な同型反復には戻っていない。
* `modal-dorian` は modal diagnostics を持つ seed として生成され、Phase 5.7 の modal context は review 対象に入っている。
* Phase 5.8 の `listening-review.json` と `pairwise-preferences.json` により、手動聴取 gate の判定と preference を review bundle に残せる。

## 見つかった問題

### 1. 声部独立が美しさの最大 blocker である

全 seed で texture independence warning が出た。rhythmic independence score は 0.081-0.112 に留まり、unison overlap は 528-762 件、same direction motion は 470-661 件、shared rhythm overlap は 778-906 件だった。

selected candidate の 437 件を集計すると、texture cost は 390-1047、平均 741.3 で、total cost の最大要因だった。counterpoint、subject clarity、harmony、form の cost がほぼ 0 でも texture cost が高い候補を採用しているため、現行 gate は「禁則を避けた支え合い」と「独立した声部が絡み合う対位法」を分けられていない。

Phase 5.9 は、review seed 全体で texture 指標に明確な通過条件を置く。Phase 5.10 は、unison、同方向進行、同一リズムの過密を候補選択の主要コストとして扱い、entry 周辺と stretto-like section ではさらに厳しくする。

### 2. 大跳躍の回収不足が全 seed に残っている

leap recovery miss は全 seed で発生し、範囲は 13-30 件だった。最大は `bright-answer` の 30 件で、`contrary-motion` は 29 件、`modal-dorian` は 27 件だった。

大跳躍が反行や順次進行で回収されないと、非 entry 声部が歌える線ではなく、音高候補を機械的に選んだ列に聞こえる。Phase 5.11 では、候補生成の段階で大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を作り、scoring は検出だけでなく採用抑制まで担う。

### 3. 評価器の一部 dimension が候補差を説明していない

selected candidate の集計では、subject clarity、harmony、form の cost がすべて 0 だった。top-level diagnostics でも `episodeDirectionScore`、`strettoClarityScore`、`controlledAmbiguityScore`、`styleModulationFit`、`freeCounterpointContourScore` は満点に張り付きやすい。

これは該当 dimension が常に良いというより、現行 feature が粗く、section 単位や entry 周辺の違いを十分に評価していない可能性が高い。Phase 5.12 では、満点の理由と低評価の理由を seed、section、voice、entry/cadence 周辺の単位で説明できるようにし、満点が並ぶ指標は Phase 通過条件から外す。

### 4. `fugue-smoke` の最初の応唱で和声機能を無視した濁りが出る

`fugue-smoke` の実生成を確認すると、最初のソプラノ応唱は tick 1920 で入り、同時に残っているアルト主題の Ab とソプラノ応唱の Bb が 2 半音でぶつかる。直後も、tick 2400 ではアルト G とソプラノ C の完全4度、tick 3360 ではアルト Eb とソプラノ Eb のユニゾン、tick 3600 ではアルト D とソプラノ Eb の半音衝突が続く。tick 1920 の Ab は Eb major では 4 度音、Bb major の応唱文脈では scale 外音であり、ソプラノの Bb は応唱 local key の root である。現行評価では `strongBeatDissonanceCount` と `unresolvedDissonanceCount` がどちらも 0 で、selected candidate の harmony cost も全件 0 のため、この entry 周辺の濁りは harmony dimension では検出されていない。

この問題は、単純な dissonance count や weak-beat passing tone 判定だけでは検出しにくい。entry 周辺では、subject/answer の重要音、低声部または持続声部が担う harmonic root、強拍上の chord member、avoid note、4 度音の扱い、解決先をまとめて評価する必要がある。対位法的な破綻がなくても、avoid note が主題や応唱の目立つ音として強調されると、音楽的には破綻に近い濁りになる。Phase 5.10 では entry 周辺の完全協和過密だけでなく、応唱と支える声部が作る 2 度衝突、root や structural note 周辺の不安定な 4 度/5 度構成、解決を伴わない avoid note を候補選択の主要コストに入れる。Phase 5.12 では、harmony cost が 0 になる候補について、root、chord member、avoid note status、non-chord tone role、解決期限を説明できるまで gate 対象にしない。

### 5. modal seed の counter-subject identity が弱い

`modal-dorian` の counter-subject identity retention は 0.58 で、14 seed 中の最低値だった。他 seed は 0.818-0.949 の範囲に収まっているため、modal context を入れた箇所で counter-subject の再認識性が落ちている。

modal seed は、mode の特徴音や modal cadence を出すだけでは不十分である。旋法的な色彩を維持しながら、主題と counter-subject の輪郭、リズム、entry 周辺の認識性を保つ必要がある。

### 6. `ornament-test` が装飾の境界 seed として弱い

ornament density は全 seed で 0.138-0.149 に収まり、`ornament-test` は最大値ではあるが明確な境界 seed になっていない。装飾候補数や密度だけでは、cadence 前、entry 終端、長い保持音の前後に音楽的な理由を持って置かれた装飾かどうかを説明できない。

Phase 5.11 では、trill、mordent、turn、passing tone、neighbor tone を単なる密度ではなく、phrase、cadence、entry と結び付けて評価する。

### 7. 手動聴取 gate は形式だけでなく判定運用が必要である

Phase 5.8 で `listening-review.json` は生成されるが、今回の bundle では seed 別判定は `not-reviewed` のままである。自動 diagnostics が clean でも、声部独立、旋律線、長時間の退屈さは聴取で最終確認する必要がある。

Phase 5.9 以降は、代表 seed と境界 seed の manual judgement が `pass` でない限り Phase 6 へ進まない、という運用を plan と gate の両方に反映する。

### 8. 固定 review seed だけでは seed fragility を捕捉しきれない

Phase 5.9 の stacked draft PR 作成後に、別セッションで review bundle を再生成し、追加 seed `restless-line`、`tight-stretto`、`quiet-cadence`、`angular-answer` を診断した。固定 review seed 14 件はすべて Phase 5.9 gate を通ったが、追加 seed では `restless-line` が rhythmic independence 0.079 で gate を外れ、`angular-answer` が counter-subject identity retention 0.487 まで落ちた。どちらも hard constraint failures は 0 であり、texture independence warning と leap recovery miss が主な警告だった。

この結果は、Phase 5.9 gate が固定 review seed の既知分布を捕捉している一方で、未知 seed に対する美しさの余裕をまだ保証していないことを示す。特に modal context を持つ `angular-answer` は modal diagnostics 自体は出ているが、counter-subject の再認識性が大きく落ちているため、`modal-dorian` だけを境界 seed にする運用では modal seed の劣化を見逃す可能性がある。

Phase 5.10-5.12 では、固定 review seed の閾値だけでなく、rotation seed または adversarial seed の小さな集合を毎回入れ替えて、声部独立、counter-subject identity、modal seed の再認識性が review seed 固有の調整に過適合していないことを確認する。

## 計画への反映

Phase 6 の履歴、巻き戻し、操作パラメータは、以下の美しさ gate を通過するまで開始しない。

### Phase 5.9: review seed 全体の美しさ gate

* review seed 全体に hard constraints と soft beauty metrics の集計 gate を置く。
* rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、leap recovery miss、selected candidate の texture cost と melody cost は、代表 seed だけでなく全 review seed で上限または下限を持つ。
* `modal-dorian`、`close-imitation`、`sparse-cadence`、`ornament-test` は境界 seed として個別の通過条件を持つ。
* 固定 review seed に通っても Phase 6 へ進まず、Phase 5.10-5.12 で rotation seed または adversarial seed の小集合を追加し、未知 seed の rhythmic independence と counter-subject identity の余裕を確認する。
* `fugue-smoke` は、アルト主題後の最初のソプラノ応唱が、支え声部と不安定な 2 度衝突、応唱 local key の root と scale 外音の衝突、解決感の弱い 4 度構成を作らないことを回帰確認する。
* manual listening judgement が `pass` でない seed は、Phase 6 前の blocker として扱う。
* 満点に張り付く指標は、section 単位の説明が出るまで Phase 通過条件にしない。

### Phase 5.10: 声部独立とリズム対位法

* counter-subject と free counterpoint に、主題と異なるリズム型、反行、保持と動きの交替、休符の受け渡しを持たせる。
* unison、同方向進行、同一リズムの過密を候補選択の主要コストへ引き上げる。
* `fugue-smoke` は、アルトが最初に提示する主題の時点で、tick 960、つまり 4/4 の第1小節第3拍に 240 tick の短い note が置かれている。強拍上の短い note が metric accent を弱め、後続声部の対位法以前にリズム感を失っている可能性がある。J. S. Bach の The Art of Fugue, Contrapunctus I の主題のように、冒頭主題は強拍上の structural note と短い motion の役割が聴感上分かれることを比較軸にする。
* 主題生成は音価分布だけでなく、bar 内の強拍、subdivision、長短 note の配置、tie または保持による accent 支持を評価する。短い note を強拍に置く場合は、近接する保持音、順次進行、解決先、または装飾的意図を diagnostics で説明できる必要がある。
* entry 周辺と stretto-like section では、完全協和の過密、同一リズム、声部間の輪郭同化、応唱と支える声部の 2 度衝突、root や structural note 周辺の不安定な 4 度/5 度構成、解決を伴わない avoid note を通常 section より厳しく扱う。
* texture cost が高い候補を、hard constraints が clean という理由だけでは採用しない。

### Phase 5.11: 旋律線、装飾、フレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* 意図しない同音連打は tie または装飾的反復へ変換する。
* cadence 前、entry 終端、長い保持音の前後に、trill、mordent、turn、passing tone、neighbor tone を style profile と phrase role に応じて配置する。
* `ornament-test` は装飾密度ではなく、装飾の配置理由を diagnostics で説明できる境界 seed にする。

### Phase 5.12: 評価重みと preference の説明可能化

* `EvaluationWeights` は feature version と evaluation model version を持つ外部定義にする。
* review bundle は total cost だけでなく、dimension 別の cost/reward、低評価理由、満点理由を出す。
* harmony dimension は、root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明できるようにする。
* fixed review seed、boundary seed、rotation seed の結果を分けて記録し、固定 seed への過適合と未知 seed の fragility を review bundle 上で確認できるようにする。
* pairwise preference は manual listening gate の seed 別判定と結び付ける。
* learned weights を検討する場合も、runtime には外部 API や大型モデルを入れない。
* learned weights は hard constraints と manual listening gate を上書きできない。

### Phase 6: 履歴、巻き戻し、操作パラメータ

Phase 6 は、Phase 5.9-5.12 の美しさ gate が代表 seed と境界 seed で通った後に開始する。UI 操作で退屈さや声部独立の弱さを隠すのではなく、生成器そのものが美しいフーガ的構造を作れることを先に確認する。

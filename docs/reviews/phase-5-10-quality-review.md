# Phase 5.10 音楽美レビュー

Phase 5.10 の実装後に、複数 seed の review bundle を再生成し、音楽的美しさ、対位法、フーガ技法、和声安定度の観点で diagnostics と生成譜面の構造を確認した。Phase 5.10 は固定 review seed の自動 gate を通過しているが、美しいフーガを継続生成する前提としてはまだ余裕が足りない。

## レビュー範囲

生成コマンド:

```sh
pnpm build
pnpm fugematon review --out samples/phase-musical-review --ticks 129600
```

固定 review seed:

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

追加 rotation seed:

* `restless-line`
* `tight-stretto`
* `quiet-cadence`
* `angular-answer`
* `cantabile-subject`
* `chromatic-shadow`
* `ornament-cadence`
* `modal-answer`

確認した観点:

* hard constraints: 声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch、未解決不協和、全声部休止
* Phase 5.10 gate: rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、short strong-beat entry note、entry support instability
* 旋律美: leap recovery miss、selected candidate の melody cost、同音反復
* フーガ技法: counter-subject identity、entry 周辺の支え声部、stretto-like section の明瞭さ
* 和声安定度: entry 開始直後の 2 度、4 度、増減音程、local key の structural note と avoid note の衝突
* 評価器の説明力: dimension 別 cost が候補差を説明しているか

## 良かった点

* 固定 14 seed は Phase 5.9 gate と Phase 5.10 gate をすべて通過した。
* 固定 14 seed の hard constraint failures は 0 だった。
* `fugue-smoke` は Phase 5.10 境界条件を通過し、short strong-beat entry note は 19、entry support instability は 146 で上限内だった。
* `modal-dorian` は modal context を持ったまま Phase 5.10 gate を通過した。
* section count は 31-34 に分布し、Phase 4 のような完全な同型長尺 score には戻っていない。

## 見つかった問題

### 1. 固定 seed gate は通るが閾値に張り付いている

固定 review seed の rhythmic independence score は 0.081-0.112、unison overlap は 528-762、same direction motion は 470-661、shared rhythm overlap は 778-906 だった。`sparse-cadence` は unison overlap と shared rhythm overlap が上限に一致し、`modal-dorian` は same direction motion が上限に一致した。

これは Phase 5.10 gate が既知 seed の最悪値を捕捉している一方で、美しさの余裕を持った gate にはまだなっていないことを示す。固定 seed の pass を Phase 完了の十分条件にすると、わずかな seed 変化で声部独立や modal counter-subject identity が崩れる。

### 2. rotation seed で seed fragility が再現した

追加 rotation seed 8 件のうち 4 件が Phase 5.10 gate を外れた。

* `restless-line`: rhythmic independence score が 0.079 で下限 0.08 を下回った。
* `tight-stretto`: entry support instability が 160 で上限 146 を超えた。
* `angular-answer`: counter-subject identity retention が 0.487 で下限 0.58 を下回った。
* `modal-answer`: counter-subject identity retention が 0.483、same direction motion が 814、leap recovery miss が 33、average selected candidate texture cost が 835.3125 まで悪化した。

いずれも hard constraint failures は 0 だった。つまり、破綻しない生成と、美しい対位法として聴ける生成はまだ分離している。

### 3. modal seed は色彩と再認識性が両立していない

`modal-dorian` は固定 seed として gate を通過したが、追加 modal 系 seed の `angular-answer` と `modal-answer` では counter-subject identity retention が 0.5 を下回った。modal context count は出ているため、mode の特徴音や modal cadence の存在だけでは十分でない。

Phase 5.11 では、modal seed を固定 1 件だけで見ず、rotation seed として複数の modal answer / modal cadence seed を扱う。旋法的な色彩を出すほど counter-subject の輪郭が崩れる場合は、modal diagnostics が pass でも美しさ gate は fail とする。

### 4. entry support instability は固定 seed 以外で和声的濁りを残す

`fugue-smoke` は上限内に収まったが、`tight-stretto` は entry support instability が 160 まで増えた。entry 周辺の 2 度衝突、不安定な 4 度、増減音程は、単純な unresolved dissonance count では hard failure にならない。しかし主題や応唱の開始直後に出ると、対位法的に許容できても和声的には濁りとして目立つ。

Phase 5.11 以降では、固定 seed の絶対上限だけでなく、entry ごとの局所最大、連続発生、local key の root や third との関係、解決期限を gate に入れる。

### 5. 旋律線の問題は Phase 5.10 後も残っている

固定 review seed の leap recovery miss は 13-30 件、追加 rotation seed では `modal-answer` が 33 件だった。Phase 5.10 は声部独立と entry 周辺を扱ったため、旋律線の実質改善は現行計画の Phase 6 へ残っている。

特に `bright-answer`、`contrary-motion`、`modal-dorian`、`modal-answer` は、大跳躍が回収されない箇所を境界 seed として扱う必要がある。非 entry 声部が歌える線にならない限り、同時音が clean でも音楽的美しさの核心を満たさない。

### 6. 評価器の一部 dimension はまだ候補差を説明していない

`fugue-smoke`、`modal-dorian`、`long-arc`、`ornament-test` を確認すると、selected candidate の `subjectClarity`、`harmony`、`form` cost は全件 0 だった。`episodeDirectionScore`、`strettoClarityScore`、`controlledAmbiguityScore`、`styleModulationFit`、`freeCounterpointContourScore` も満点に張り付き続けている。

この状態では、Phase 5.10 gate が通っても、選ばれた候補がなぜ音楽的に良いのかを十分に説明できない。現行計画では Phase 7 で、満点の理由と低評価の理由を section、entry、voice、cadence の単位で出すまで、これらの dimension を Phase 完了条件の中心に置かない。

### 7. manual listening gate は依然として blocker である

review bundle の `listening-review.json` では、代表 seed と境界 seed の judgement は `not-reviewed` のままである。自動 diagnostics が pass しても、`bach-001`、`fugue-smoke`、`minor-entry`、`wide-key` は manual listening judgement が `pass` になるまで操作機能フェーズ前の blocker として扱う。

## 計画への反映

現行計画では、Phase 5 は Phase 5.11 で完了し、残る音楽的改善は Phase 6 以降へ移す。履歴、巻き戻し、操作パラメータは Phase 8 で扱い、以下の Phase 5.11、Phase 6、Phase 7 が通るまで開始しない。

### Phase 5.11: rotation seed と margin gate

* 固定 review seed に加えて、rotation seed と adversarial seed の小集合を毎回診断する。
* 固定 seed の pass だけでなく、閾値からの margin を記録する。上限または下限に一致する seed は pass でも follow-up 対象にする。
* modal 系 rotation seed は、modal context count だけでなく counter-subject identity retention、same direction motion、leap recovery miss を個別 gate にする。
* entry support instability は score 全体の合計だけでなく、entry ごとの局所最大、連続発生、解決期限を診断する。
* manual listening judgement が `pass` でない代表 seed と境界 seed は、操作機能フェーズ前の blocker として CI または review summary 上で明示する。

### Phase 6: 旋律線、装飾、フレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* 意図しない同音連打は tie または装飾的反復へ変換する。
* cadence 前、entry 終端、長い保持音の前後に、trill、mordent、turn、passing tone、neighbor tone を style profile と phrase role に応じて配置する。
* `ornament-test` と `ornament-cadence` は、装飾密度ではなく装飾の配置理由を diagnostics で説明できる境界 seed にする。
* `bright-answer`、`contrary-motion`、`modal-answer` は leap recovery の境界 seed として扱う。

### Phase 7: 評価重みと preference の説明可能化

* `EvaluationWeights` は feature version と evaluation model version を持つ外部定義にする。
* review bundle は total cost だけでなく、dimension 別の cost/reward、低評価理由、満点理由を出す。
* subject clarity、harmony、form の cost が常に 0 になる場合は、section 単位の説明が出るまで gate 対象にしない。
* harmony dimension は、root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明できるようにする。
* fixed review seed、boundary seed、rotation seed の結果を分けて記録し、固定 seed への過適合と未知 seed の fragility を review bundle 上で確認できるようにする。
* pairwise preference は manual listening gate の seed 別判定と結び付ける。
* learned weights を検討する場合も、runtime には外部 API や大型モデルを入れない。
* learned weights は hard constraints と manual listening gate を上書きできない。

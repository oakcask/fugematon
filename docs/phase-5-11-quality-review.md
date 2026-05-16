# Phase 5.11 音楽美レビュー

Phase 5.11 の review bundle 実装後に、固定 review seed、rotation seed、adversarial seed をまとめて生成し、音楽的美しさ、対位法、フーガ技法、和声安定度の観点で diagnostics を確認した。Phase 5.11 gate は全 seed で通過したが、margin follow-up が広く残っており、Phase 6 の操作機能へ進む前に旋律線、entry 支持和声、評価説明力、手動聴取 gate をさらに締める必要がある。

## レビュー範囲

生成コマンド:

```sh
pnpm build
pnpm fugematon review --out samples/phase-musical-review --ticks 129600
```

生成対象:

* 固定 review seed 14 件
* Phase 5.11 rotation seed 6 件
* Phase 5.11 adversarial seed 2 件

確認した観点:

* hard constraints: 声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch、未解決不協和、全声部休止
* Phase 5.11 gate: counter-subject identity、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、leap recovery、entry support instability、modal rotation seed 条件
* 対位法とフーガ技法: 主題と対旋律の再認識性、entry 周辺の支え声部、stretto-like section の緊張、rotation seed での過適合
* 和声安定度: entry support instability の合計、entry ごとの局所最大、連続発生、解決期限未達
* 音楽的美しさ: 歌える旋律線、大跳躍回収、リズム独立性、装飾密度、長尺での退屈さ

## 良かった点

* 22 seed すべてで Phase 5.11 gate は pass した。
* hard constraint failures は全 seed で 0 だった。
* `restless-line`、`tight-stretto`、`angular-answer`、`modal-answer` は Phase 5.10 後レビューで gate を外していたが、Phase 5.11 gate では pass した。
* modal rotation seed は modal context を持ったまま Phase 5.11 の個別条件を通過した。
* review bundle は schema version 3 として、固定 seed、rotation seed、adversarial seed の結果と `phase511Gate.followUps` を同じ summary に残せている。

## 見つかった問題

### 1. Phase 5.11 gate は通るが margin follow-up が多い

22 seed 中 20 seed に `phase511Gate.followUps` が残った。多くは `maxEntrySupportInstabilityPerEntry` と `maxConsecutiveEntrySupportInstabilities` が上限値 4 に一致するもので、pass していても entry 周辺の和声支持には余裕がない。

`minor-entry`、`sparse-cadence`、`restless-line`、`modal-answer` は shared rhythm overlap が上限付近に張り付き、声部のリズム独立がまだ薄い。`restless-line` は rhythmic independence score が 0.079 で下限に一致し、音楽的には複数声部が同じ息遣いに寄りやすい。

### 2. modal seed は counter-subject identity の余裕が小さい

counter-subject identity retention の低い seed は `modal-cadence` と `dense-modal` が 0.573、`angular-answer` が 0.591、`modal-answer` が 0.608、`modal-dorian` が 0.627 だった。

これは、modal context の存在と counter-subject の再認識性がまだ強く競合していることを示す。旋法的な色彩を出せても、対旋律の輪郭が薄くなると、フーガ技法としての説得力は弱くなる。Phase 5.12 では modal seed を旋律線の境界 seed として扱い、mode の特徴音を保ちながら対旋律の contour を崩さない候補選択を確認する。

### 3. entry support instability は和声的な濁りとして残る

`tight-stretto` は entry support instability count と unresolved count が 160、`modal-cadence` は 149 と 148、`fugue-smoke`、`wide-key`、`contrary-answer` は 146 だった。hard constraint failures は 0 だが、entry 開始直後の支え声部が不安定な 2 度、4 度、増減音程、または解決の遅い avoid note を作る可能性が残る。

この問題は、未解決不協和の有無だけでは捕まらない。主題または応唱の structural note と、低声部または保持声部が作る root、third、fifth、avoid note status を entry 単位で説明する必要がある。

### 4. 旋律線と大跳躍回収は Phase 5.12 の中心課題である

leap recovery miss は全体で 415 件あり、全 22 seed で warning が出た。目立つ seed は `modal-answer` が 33、`bright-answer` が 30、`contrary-motion` が 29、`modal-dorian` が 27、`contrary-answer` が 26 だった。

同時音が hard constraint を満たしていても、大跳躍が反行や順次進行で回収されないと、非 entry 声部が歌える線ではなく候補音列に聞こえる。音楽的美しさを核心に置くなら、Phase 5.12 は装飾追加だけでなく、跳躍後の回収、局所的な山と谷、phrase boundary の設計を候補生成と scoring の両方へ入れる必要がある。

### 5. 対位法上の warning はまだ残る

全 seed の issue 集計では `leap-recovery-miss` が 415 件、`parallel-perfect` が 28 件だった。parallel perfect は hard failure にはしていないが、10 seed で warning が出ており、stretto-like section や同方向進行の多い箇所ではフーガらしい声部独立を弱める。

Phase 5.12 では同方向進行の count だけでなく、連続する完全協和、主題 entry と支え声部の関係、外声間の露骨な並達を診断に分ける。

### 6. manual listening gate は依然として blocker である

review bundle の `listening-review.json` では、代表 seed と境界 seed の judgement は `not-reviewed` のままである。自動 diagnostics が pass しても、`bach-001`、`fugue-smoke`、`minor-entry`、`wide-key` は manual listening judgement が `pass` になるまで Phase 6 前の blocker として扱う。

## 計画への反映

Phase 6 の履歴、巻き戻し、操作パラメータは、以下の Phase 5.12-5.13 が通るまで開始しない。

### Phase 5.12: 旋律線、entry 支持和声、装飾、フレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* `modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian`、`contrary-answer` を leap recovery の境界 seed として扱う。
* entry support instability は、合計だけでなく entry ごとの structural note、root、third、fifth、avoid note status、解決期限を説明する。
* `tight-stretto`、`modal-cadence`、`fugue-smoke`、`wide-key`、`contrary-answer` は entry 支持和声の境界 seed として扱う。
* `restless-line`、`minor-entry`、`sparse-cadence`、`modal-answer` は rhythmic independence と shared rhythm の境界 seed として扱う。
* 装飾は密度だけでなく、cadence、entry 終端、長い保持音、phrase boundary に対する配置理由を diagnostics に残す。

### Phase 5.13: 評価重みと preference の説明可能化

* `phase511Gate.followUps` を review summary の観察対象に留めず、Phase 5.13 の説明可能化では seed、section、voice、entry/cadence 周辺の単位で理由を出す。
* harmony dimension は、root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明できるようにする。
* subject clarity、harmony、form の cost が常に 0 になる場合は、満点理由と低評価理由を出せるまで Phase 通過条件の中心に置かない。
* pairwise preference は manual listening gate の judgement と結び付け、代表 seed と境界 seedの `pass` を Phase 6 前の blocker として維持する。

Phase 5.11 によって固定 seed への過適合検出は進んだが、美しさの余裕はまだ十分ではない。次の実装は「gate をさらに広げる」よりも、旋律線と entry 支持和声の候補生成を先に改善し、そのうえで評価説明力を高める順序にする。

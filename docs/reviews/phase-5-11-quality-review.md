# Phase 5.11 音楽美レビュー

Phase 5.11 の review bundle 実装後に、固定 review seed、rotation seed、adversarial seed をまとめて生成し、音楽的美しさ、対位法、フーガ技法、和声安定度の観点で diagnostics を確認した。Phase 5.11 gate は全 seed で通過し、固定 seed への過適合と rotation seed の fragility を観察できる基盤が揃ったため、Phase 5 はここで一区切りとする。一方で margin follow-up は広く残っており、旋律線、entry 支持和声、評価説明力、手動聴取 gate は Phase 6 以降の中心課題として扱う。

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

これは、modal context の存在と counter-subject の再認識性がまだ強く競合していることを示す。旋法的な色彩を出せても、対旋律の輪郭が薄くなると、フーガ技法としての説得力は弱くなる。Phase 6 では modal seed を旋律線の境界 seed として扱い、mode の特徴音を保ちながら対旋律の contour を崩さない候補選択を確認する。

### 3. entry support instability は和声的な濁りとして残る

`tight-stretto` は entry support instability count と unresolved count が 160、`modal-cadence` は 149 と 148、`fugue-smoke`、`wide-key`、`contrary-answer` は 146 だった。hard constraint failures は 0 だが、entry 開始直後の支え声部が不安定な 2 度、4 度、増減音程、または解決の遅い avoid note を作る可能性が残る。

この問題は、未解決不協和の有無だけでは捕まらない。主題または応唱の structural note と、低声部または保持声部が作る root、third、fifth、avoid note status を entry 単位で説明する必要がある。

追加確認として、review bundle の 22 seed について entry 周辺の不安定音程を半音・全音系の衝突に絞って再集計した。ここでは entry 開始後 2 拍以内に主題または応唱と支え声部が作る m2、M2、m7、M7 を severe seconds/sevenths として数え、4 度や三全音とは分けて扱った。

全 22 seed で severe seconds/sevenths が発生した。特に `fugue-smoke` と `lyrical-line` は 108 checkpoint、`modal-cadence` は 108 checkpoint、`wide-key`、`tight-stretto`、`contrary-answer` は 105 checkpoint、`circle-fifths` と `close-imitation` は 104 checkpoint だった。`fugue-smoke` は問題の見えやすい seed だが、単独の例外ではなく、entry support instability の中心問題は review seed 全体に広がっている。

解決期限未達の severe seconds/sevenths も多い。`fugue-smoke` と `lyrical-line` は 100、`wide-key`、`tight-stretto`、`contrary-answer`、`circle-fifths`、`close-imitation` は 97、`contrary-motion` は 94 だった。4 パートしかない現行 texture では、隣り合う半音または全音の衝突が一つ出るだけでも和音全体の印象を支配しやすい。Phase 6 では avoid note を軽い減点に留めず、テンションノート、掛留、経過音、刺繍音、導音など、和音構造上の役割と解決先を説明できる場合にだけ許可する方針へ寄せる。

### 4. 旋律線と大跳躍回収は Phase 6 の中心課題である

leap recovery miss は全体で 415 件あり、全 22 seed で warning が出た。目立つ seed は `modal-answer` が 33、`bright-answer` が 30、`contrary-motion` が 29、`modal-dorian` が 27、`contrary-answer` が 26 だった。

同時音が hard constraint を満たしていても、大跳躍が反行や順次進行で回収されないと、非 entry 声部が歌える線ではなく候補音列に聞こえる。音楽的美しさを核心に置くなら、Phase 6 は装飾追加だけでなく、跳躍後の回収、局所的な山と谷、phrase boundary の設計を候補生成と scoring の両方へ入れる必要がある。

### 5. 対位法上の warning はまだ残る

全 seed の issue 集計では `leap-recovery-miss` が 415 件、`parallel-perfect` が 28 件だった。parallel perfect は hard failure にはしていないが、10 seed で warning が出ており、stretto-like section や同方向進行の多い箇所ではフーガらしい声部独立を弱める。

Phase 6 では同方向進行の count だけでなく、連続する完全協和、主題 entry と支え声部の関係、外声間の露骨な並達を診断に分ける。

### 6. 提示部と継続部の形式的な展開が短く聞こえる

`fugue-smoke` の楽譜確認では、主題の繰り返し自体は十分に表現できている一方で、提示部が短く、追唱や自由唱による音楽的展開が薄い印象が残った。この観点で review bundle の 22 seed を横断確認したところ、全 seed で exposition plan は 16 quarter、最初の continuation section は 19 quarter から始まっていた。つまり、提示部は seed によらず 4 声の主題・応答 entry を 4 quarter 間隔で置く固定構造で、codetta、余韻、追唱による拡張を持っていない。

長尺全体では subject entry は 40-45 件、exposition 後の entry は 36-41 件あり、主題や応答の出現数は不足していない。しかし continuation の `episode` は主題の先頭 4 音による `subject-fragment` を 1 声に置き、残りを counter-subject と free-counterpoint texture で埋める設計になっている。`subject-return` も基本的には単独 entry、`stretto-like` も短い主題断片 2 声の重ね合わせである。このため、数値上は entry と free-counterpoint coverage が多くても、聴感上は「提示部後に音楽が発展する」というより、短い entry 単位が次々に切り替わる印象になりやすい。

この問題は `fugue-smoke` だけの例外ではない。`bach-001`、`minor-entry`、`wide-key`、`modal-dorian`、`long-arc`、`tight-stretto`、`dense-modal` を含む全 seed で exposition の長さと最初の continuation 開始位置は同一だった。seed による違いは continuation pattern、episode/subject-return/stretto-like の比率、調性、section duration には出ているが、提示部の長さ、entry 間隔、提示部から episode へ移る呼吸は seed variation の対象になっていない。

Phase 6 では、旋律線と entry 支持和声だけでなく、提示部の音楽的な長さと continuation への接続を扱う。具体的には、4 声 entry の後に codetta または短い追唱を置く、最後の応答後すぐに episode へ切り替えない、episode では 4 音断片だけでなく sequence、invertible counterpoint、free counterpoint の役割を持つ発展素材を作る、という観点を候補生成と diagnostics に入れる。Phase 7 では、section 単位で「なぜこの episode が前の entry を受けて展開していると言えるのか」を説明できるようにする。

### 7. 3 パート休止による solo texture が終止感なしに現れる

`fugue-smoke` の楽譜確認では、3 パートが休み、残り 1 パートだけが数拍発音する状況が特徴的に現れた。問題は solo texture そのものではなく、他パートが休みに入る直前に cadence、phrase boundary、応答の終端、または明確な呼吸がなく、4 声 texture から 1 声へ急に薄くなるため、音楽的な説得力が弱いことである。

追加確認として、22 seed すべてについて同時発音パート数が 1 になる連続区間を集計した。1 quarter 以上の solo run は全 seed で 35-43 件、合計 85-111 quarter 発生した。cadence target または section 末尾から 1 quarter より離れており、直前が 2 声以上だった unsupported solo run も全 seed で 13-20 件あった。直前が 3 声以上から 1 声へ落ちる abrupt solo run は 20-24 件で、`fugue-smoke` でも 21 件だった。

長い unsupported solo run の上位は episode 内に集中していた。例として `fugue-smoke` は `alto` の 89-94 quarter、22-26 quarter、40-44 quarter、`bach-001` は `alto` の 37-44 quarter、141-146 quarter、57-61 quarter、`wide-key` は `alto` の 171-178 quarter、89-94 quarter、208-213 quarter で発生した。全 seed 合計では、1 quarter 以上の solo run は `alto` が 592 件、1723 quarter と突出し、`soprano` は 127 件、`tenor` は 73 件、`bass` は 84 件だった。

これは seed 固有の例外ではなく、生成ロジック上の構造的な偏りである。現行 episode は主題先頭 4 音の `subject-fragment` と支え声部を置いた後、残りの section を `addContinuityCounterpoint()` が空いている 1 声だけで埋める。さらに候補 voice の順序が `alto` を先頭にしているため、episode 後半が cadence なしの `alto` solo に寄りやすい。

Phase 6 では、3 パート休止に入る場合も、直前に cadence、phrase boundary、明確な終止または呼吸を要求する。episode 後半の continuity は 1 声 filler ではなく、最低 texture density、段階的な thinning、応答的な受け渡し、または休止理由を持つ phrase plan として扱う。diagnostics には solo run count、unsupported solo run count、abrupt texture drop count、solo voice imbalance を追加し、manual listening gate でも「3 パート休止に入る説得力」を確認する。

### 8. 完全に同じ MIDI pitch のユニゾンは複数 seed に広がっている

`fugue-smoke` の楽譜確認では、複数パートが完全に同じ音高を同時に鳴らす箇所が目立った。現行 diagnostics には `unisonOverlapCount` があるが、これは pitch class が同じ場合を数えるため、オクターブ違いの重なりも含む。今回の指摘に直接対応するのは `samePitchOverlapCount`、つまり完全に同じ MIDI pitch の重なりである。

追加確認として、review bundle の 22 seed について exact same-pitch overlap を再集計した。22 seed 中 19 seed で発生し、合計 293 overlap だった。多い seed は `contrary-motion` が 40、`fugue-smoke` が 30、`lyrical-line` が 27、`minor-entry` が 26、`contrary-answer` が 25、`dark-episode`、`tight-stretto`、`modal-cadence` が各 24 だった。`wide-key`、`close-imitation`、`ornament-test` は 0 だったため不可避ではないが、`fugue-smoke` 固有の例外ではない。

発生箇所は支え声部に偏っている。全 seed 合計では、role pair は `counter-subject+free-counterpoint` が 207 件と最多で、次に `free-counterpoint+subject` が 31 件、`free-counterpoint+subject-fragment` が 18 件だった。voice pair は `alto+tenor` が 111 件、`bass+tenor` が 94 件、`alto+soprano` が 88 件で、現行の支え声部生成と register fitting が同じ実音へ収束している可能性が高い。`fugue-smoke` では 30 件すべてが `counter-subject+free-counterpoint` 間で、`alto+tenor` が 20 件、`alto+soprano` が 10 件だった。

同じ楽器で全パートを鳴らす現行 MVP では、完全同音のユニゾンは声部独立を失わせやすい。Fux 的な species counterpoint でも、同度は完全協和ではあるが独立した二声の響きとして常用するものではなく、開始・終止など限定的な場面以外では避けるべき扱いに近い。Fugematon でも、意図が説明できない exact same-pitch unison は基本的に禁則寄りの hard constraint とし、少なくとも候補選択では `unisonOverlapCount` より強いコストを与える。

Phase 6 では、`samePitchOverlapCount` を `unisonOverlapCount` から独立した gate 指標にする。許容例外は、明示的な doubling、cadence の終止音、短い passing overlap、または将来の音色分離で意図が説明できる場合に限定する。現行のように `counter-subject` と `free-counterpoint` が同じ実音へ重なる箇所は、支え声部の候補生成、register placement、voice-pair ごとの禁止表で採用回避する。

### 9. manual listening gate は依然として blocker である

review bundle の `listening-review.json` では、代表 seed と境界 seed の judgement は `not-reviewed` のままである。自動 diagnostics が pass しても、`bach-001`、`fugue-smoke`、`minor-entry`、`wide-key` は manual listening judgement が `pass` になるまで操作機能フェーズへ進む前の blocker として扱う。

## 計画への反映

Phase 5 は Phase 5.11 で完了とし、以下は Phase 6 以降の計画へ移す。Phase 6 は生成器そのものの音楽的改善、Phase 7 は評価説明力、Phase 8 は履歴、巻き戻し、操作パラメータを扱う。操作機能は、Phase 6-7 の代表 seed と境界 seed が美しさ gate と manual listening gate を通過してから開始する。

### Phase 6: 旋律線、entry 支持和声、装飾、フレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* `modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian`、`contrary-answer` を leap recovery の境界 seed として扱う。
* entry support instability は、合計だけでなく entry ごとの structural note、root、third、fifth、avoid note status、解決期限を説明する。
* entry 周辺の m2、M2、m7、M7 は severe seconds/sevenths として、4 度や三全音とは別集計する。テンションノート、掛留、経過音、刺繍音、導音などの役割と解決先を説明できない severe seconds/sevenths は、soft warning ではなく採用回避に近い強いコストとして扱う。
* `tight-stretto`、`modal-cadence`、`fugue-smoke`、`wide-key`、`contrary-answer` は entry 支持和声の境界 seed として扱う。
* `lyrical-line`、`circle-fifths`、`close-imitation`、`contrary-motion` も severe seconds/sevenths の境界 seed に加える。
* `restless-line`、`minor-entry`、`sparse-cadence`、`modal-answer` は rhythmic independence と shared rhythm の境界 seed として扱う。
* exact same-pitch unison は `samePitchOverlapCount` として `unisonOverlapCount` から分け、意図が説明できないものは禁則寄りの hard constraint として扱う。`contrary-motion`、`fugue-smoke`、`lyrical-line`、`minor-entry`、`contrary-answer`、`dark-episode`、`tight-stretto`、`modal-cadence` は exact unison の境界 seed として扱う。
* `counter-subject` と `free-counterpoint` の支え声部どうしが同じ MIDI pitch に収束しないよう、register placement と voice-pair ごとの候補回避を入れる。
* 提示部は 4 entry 固定で終わらせず、codetta、追唱、提示部後の呼吸を候補に入れる。exposition duration、最初の continuation 開始位置、entry 間隔は seed variation と quality gate の観察対象にする。
* episode は主題先頭 4 音の fragment を置くだけでなく、sequence、invertible counterpoint、free counterpoint の役割を持つ発展素材として評価する。
* 3 パート休止による solo texture は、cadence、phrase boundary、応答的な受け渡し、または段階的な thinning によって説明できる場合だけ許容する。unsupported solo run、abrupt texture drop、solo voice imbalance を diagnostics に入れる。
* 装飾は密度だけでなく、cadence、entry 終端、長い保持音、phrase boundary に対する配置理由を diagnostics に残す。

### Phase 7: 評価重みと preference の説明可能化

* `phase511Gate.followUps` を review summary の観察対象に留めず、Phase 7 の説明可能化では seed、section、voice、entry/cadence 周辺の単位で理由を出す。
* episode と continuation section は、前の entry から何を受け継ぎ、どの素材を発展させ、次の entry または cadence へどう向かうのかを説明できるようにする。
* texture density の低下は、なぜその声部だけが残り、他の 3 パートが休むのかを section、phrase、cadence の文脈で説明できるようにする。
* harmony dimension は、root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明できるようにする。
* subject clarity、harmony、form の cost が常に 0 になる場合は、満点理由と低評価理由を出せるまで Phase 通過条件の中心に置かない。
* pairwise preference は manual listening gate の judgement と結び付け、代表 seed と境界 seed の `pass` を操作機能フェーズ前の blocker として維持する。

Phase 5.11 によって固定 seed への過適合検出は進んだが、美しさの余裕はまだ十分ではない。Phase 5 は品質観察基盤の完成として閉じ、次の実装は「gate をさらに広げる」よりも、Phase 6 で旋律線と entry 支持和声の候補生成を先に改善し、そのうえで Phase 7 で評価説明力を高める順序にする。

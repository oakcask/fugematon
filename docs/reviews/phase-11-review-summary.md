# Phase 11 Review Summary Diagnostics

Phase 11 の最初の実装として、生成音を変えずに ScoreEvent 由来の観察サマリを `diagnostics.phase11Review` と review bundle summary へ追加した。目的は、Phase 10 譜面レビューで見えた blocker を次の generator/scoring work が seed 横断で比較できるようにすることである。

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-review-summary --ticks 129600 --baseline-label phase10-section-local-planner --baseline-model phase10-section-local-planner --variant-label phase11-review-summary --variant-model phase10-section-local-planner
```

baseline と variant はどちらも `phase10-section-local-planner` で、音符差分ではなく新しい summary shape の生成確認として使った。

## Findings

### 1. Register separation は seed 横断で観察できる

対象 seed: 22 seed 全体。代表例は `bach-001`、`minor-entry`、`modal-cadence`、`dense-modal`。

`adjacentVoiceIntervals` は隣接声部の active interval を半拍 checkpoint で集計する。22 seed 合計で 1 octave 超えの隣接声部 checkpoint は 6271 件あった。`bach-001` は soprano-alto median 12 / 75 percentile 15 semitones、alto-tenor median 12、tenor-bass median 12 で、Phase 10 譜面レビューの「声部が octave 帯ごとに固定される」所見を diagnostics で追える。

Theory basis: 四声対位法では声部の独立は必要だが、同一鍵盤 texture では隣接声部が常に octave 以上離れると別楽器的に分離し、和声のまとまりが弱く聞こえやすい。

Project response: Phase 11 の register planner は、range violation と voice crossing を避けるだけでなく、隣接声部間隔と声部別 register span を比較対象にする。

### 2. Functional thinning の問題を cadence から離れた active voice count として測れる

22 seed で、cadence target から 1 beat より遠い active voice count 2 以下の long run は 346 件、そのうち 1 voice run は 258 件だった。`dense-modal` は 1 voice run が 2 件に下がる一方、2 voice run が 17 件あり、単純な solo run count だけでは thinning の音楽的機能を説明しきれない。

Theory basis: 休符や thinning は cadence、phrase boundary、entry preparation、echo、pedal などの機能を持つ場合に有効だが、機能づけが弱いと声部が脱落したように聞こえる。

Project response: 次の candidate generation では、active voice count の低下を cadence/entry/phrase context と結びつける。Phase 11 summary は gate ではなく、候補比較と譜面レビューの観察点に留める。

### 3. Section grammar と subject family の反復が summary に残る

`stateGrammarRepetition` は 4-section continuation pattern を出す。22 seed の各 seed で most repeated pattern は最大 7 回まで出る。`bach-001`、`modal-cadence`、`dense-modal` では `episode > stretto-like > episode > subject-return` 系と `episode > subject-return > episode > stretto-like` 系が上位に残る。

`entryPatternFamilies` では、22 seed 合計で `0-2-1-3-4-3-2-1` subject family が 138 回、`0-1-2-3-4-3-1-2` family が 90 回出た。これは Phase 10 譜面レビューの「seed が違っても似た進行が頻出する」所見と一致する。

Theory basis: フーガの認識性は subject family の反復に支えられるが、長尺では episode、codetta、stretto preparation、cadence extension の長距離構文がないと機械的な周期に聞こえやすい。

Project response: Phase 11 の section grammar rebuild は random rotation ではなく、cadence strength、density、entry plan、local key distance に基づく transition として扱う。

### 4. Metrical harmony は gate ではなく初期観察として十分に出る

`metricalHarmony` は、strong beat 上の chord-tone support、chord-tone mismatch、bass root support を半拍 grid から暫定集計する。22 seed 平均では strong beat chord-tone support は約 0.70 だが、bass root support は約 0.14 に留まる。これは現行 harmonic anchor が拍節上の root support を強く要求していないことを示す。

Theory basis: common-practice fugue や species counterpoint では、強拍の全音が単純和声音である必要はない。ただし強拍上の不協和や非和声音は準備、掛留、経過、解決などの役割を持つ必要がある。

Project response: この PR では `strongBeatDissonanceCount` や `harmonicFunctionMismatches` の hard diagnostic は変えない。次の Phase 11 work で harmonic function mismatch を実測 diagnostic にする前に、現行 score からどの seed/section を見るべきかを残す。

### 5. Strong beat / harmonic function mismatch を実測 diagnostic にした

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-metrical-harmony-diagnostics --ticks 129600 --baseline-label phase11-review-summary --baseline-model phase10-section-local-planner --variant-label phase11-metrical-harmony-diagnostics --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

`harmony-diagnostics` は strong beat checkpoint で最近傍の harmonic anchor を見て、期待 function の chord tone がなくなるか、bass root support のない strong beat non-chord tone が出る場合を `harmonicFunctionMismatches` として数える。22 seed 合計では `strongBeatDissonanceCount` / `harmonicFunctionMismatches` が 1876/3007 strong beat checkpoint で、mismatch rate は 0.624 だった。既存 `phase11Review.metricalHarmony` の広い chord-tone mismatch は 2004/3007、bass root support は 434/3007 で、今回の実測 diagnostic は「非和声音があっても bass root で支えられる」ケースを広い mismatch から分ける。

代表 seed では `bach-001` が mismatch 68/136、`minor-entry` が 84/138、`modal-cadence` が 99/138、`dense-modal` が 98/138 だった。hard constraints は 22 seed で 0 のまま維持された。selected candidate evaluation は evaluation model version 9 になり、harmony features に selected section の `strongBeatDissonanceCount`、`harmonicFunctionMismatches`、`harmonicFunctionMatches` を出す。代表 selected section では `bach-001` が mismatch 9 / match 4、`minor-entry` が 9 / 5、`modal-cadence` が 7 / 6、`dense-modal` が 10 / 3 だった。

Theory basis: common-practice fugue や species counterpoint では、strong beat のすべての音を単純な chord tone に固定する必要はない。ただし strong beat 上の非和声音は、bass/root support、準備、掛留、経過、解決期限などの機能を持たないと拍節上の anchor として聞こえにくい。

Project response: この PR では mismatch を top-level diagnostics と selected candidate evaluation の harmony feature へ入れた。scoring weight は nonzero だが rounded `totalCost` に影響しない大きさに留める。0.01 weight を `totalCost` に入れる実験では、`lyrical-line` の free-counterpoint stepwise run ratio が 0.711 になり、既存 gate の 0.710 上限を越えた。これは harmonic mismatch を単純 weight で押すと、Phase 7 の melodic/stepwise guardrail をわずかに悪化させることを示す。次の scoring work は、単独 weight ではなく Phase 11 oracle の selection-only upper bound と generator-needed rate を見て、melody、entry harmony、metrical harmony の Pareto guard と合わせて採用する。

Remaining listening gap: 今回は automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。baseline と variant は同じ `phase10-section-local-planner` で、音符差分ではなく新しい diagnostic shape と selected candidate feature の確認として扱う。

### 6. Phase 11 blocker family を candidate pool oracle に追加した

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-oracle-blocker-families --ticks 129600 --baseline-label phase11-metrical-harmony-diagnostics --baseline-model phase10-section-local-planner --variant-label phase11-oracle-blocker-families --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

Candidate pool oracle schema version 2 は、従来の `entry-harmony`、`voice-pair-lockstep`、`melody-leap-recovery`、`stepwise-pattern-fixation`、`section-solo-texture` に加えて、Phase 11 blocker family として `metrical-harmony`、`bass-root-support`、`register-blending`、`functional-thinning`、`section-grammar-repetition` を出す。各 blocker summary には selected risk total、best viable risk total、selection-only upper-bound reduction、reduction rate、generator-needed rate を追加した。candidate evaluation は feature version 3 になり、Phase 11 の harmony、register、functional thinning、section grammar feature を candidate-local に参照できる。

22 seed 合計では hard constraints は 0 のまま維持された。Phase 11 blocker family の generator-needed rate は高く、`metrical-harmony` は 0.915、`bass-root-support` は 0.943、`register-blending` は 0.820、`functional-thinning` は 0.801、`section-grammar-repetition` は 1.000 だった。selection-only upper-bound reduction rate は順に 0.013、0.008、0.016、0.018、0.000 で、既存 candidate pool 内の選択だけでは Phase 10 score review の blocker を大きく下げられない。

代表 seed では `bach-001` の generator-needed rate が `metrical-harmony` 0.900、`bass-root-support` 0.967、`register-blending` 0.867、`functional-thinning` 0.633、`section-grammar-repetition` 1.000 だった。`dense-modal` は metrical harmony と bass root support に selection-only 改善余地が比較的残る一方、register blending、functional thinning、section grammar は 1.000 で、候補生成または planner 側の不足として残る。

Theory basis: strong beat harmony、root support、register blending、functional thinning、section grammar は、候補を並べ替えるだけでなく、主題、支え声部、休符、register、state transition の生成段階で決まる比重が大きい。既存 candidate pool がよい候補を十分に含まない場合、単純な weight tuning は melody、entry harmony、voice independence の既存 guardrail と競合しやすい。

Project response: Phase 11 の次の実装は、oracle が `generator-or-section-planner` と分類した blocker を優先し、HarmonicPlan と subject generation の接続、weak beat non-chord-tone role、section grammar、register planner の候補生成を増やす。`selection-model` が出た subset は、candidate scoring の採用候補ではなく、Pareto guard と before/after review のための上限 evidence として扱う。

Remaining listening gap: 今回も automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。baseline と variant は同じ `phase10-section-local-planner` で、音符差分ではなく oracle shape と responsibility classification の確認として扱う。

### 7. HarmonicPlan 由来の metrical harmony intent を候補に持たせた

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-metrical-harmony-intent --ticks 129600 --baseline-label phase11-oracle-blocker-families --baseline-model phase10-section-local-planner --variant-label phase11-metrical-harmony-intent --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

NoteEvent と PlannedEntry は、HarmonicPlan の anchor と拍節位置から `structural-chord-tone`、`structural-root-support`、`strong-non-chord-tone`、`weak-passing-tone`、`weak-neighbor-tone`、`weak-chord-tone`、`offbeat-motion` を持つ。Candidate evaluation feature version 4 は、strong beat structural intent mismatch と weak beat non-chord-tone resolution を harmony features に出す。Candidate pool oracle schema version 3 は、`metrical-harmony` blocker に intent mismatch と unresolved weak-beat non-chord-tone を含める。

22 seed 合計では hard constraints は 0 のまま維持された。strong beat structural intent は 3666 notes、そのうち mismatch は 490 で mismatch rate 0.134 だった。weak beat non-chord-tone intent は 3264 notes、そのうち resolved は 1065、unresolved は 2199 で unresolved rate 0.674 だった。代表 seed では `bach-001` が strong mismatch 22/178、weak unresolved 98/129、`minor-entry` が 28/185 と 112/142、`modal-cadence` が 9/118 と 98/180、`dense-modal` が 12/95 と 89/204 だった。

Oracle evidence は、intent を候補へ持たせても既存 pool 内の選択だけでは大きく直らないことを示す。22 seed 合計で `metrical-harmony` の generator-needed rate は 0.921、selection-only upper-bound reduction rate は 0.016 だった。`bass-root-support` は generator-needed rate 0.943、reduction rate 0.008 のままである。

Rejected experiment: strong beat structural intent に合わせて support-line pitch degree を広く chord tone/root へ寄せる実験は採用しない。初期実験では counter-subject identity retention、same-direction motion、leap recovery、outer-voice contour、section-local unison overlap、entry support instability、modal severe interval の既存 guardrail が同時に悪化した。これは metrical harmony を pitch alignment の単独 rule で押すと、Phase 7/10 の melody、voice independence、entry harmony の制約を壊すことを示す。

Project response: この PR では音符の pitch selection と selection behavior は変えず、HarmonicPlan 由来の intent と diagnostics feature を候補に持たせるところで止める。次の generator work は、strong beat だけを後付け補正するのではなく、subject family、support voice formula、weak beat non-chord-tone resolution、bass/root support を同時に候補化し、oracle の generator-needed rate と既存 guardrail を見ながら採用する。

Remaining listening gap: 今回も automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。baseline と variant は同じ `phase10-section-local-planner` で、音符差分ではなく intent metadata と diagnostics shape の確認として扱う。

### 8. Register-blended section-local candidates を oracle pool に追加した

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-section-register-candidates-ab --ticks 129600 --baseline-label phase11-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase11-section-register-candidates --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

Phase 10 section-local planner の candidate pool に、continuity support voice order を entry voice ごとに変える register-blended alternatives を追加した。これらは oracle/pool evidence 用の候補として pool に入るが、selected output は既存の guarded Phase 10 candidates までに制限する。つまり、この PR は score selection を変えず、Phase 11 blocker に対して「候補 pool を増やすと selection-only upper bound が動くか」を測る。

22 seed 合計では hard constraints は 0 のまま維持された。candidate count は 9092 から 23676、viable candidate count は 896 から 2131 に増えた。`register-blending` の generator-needed rate は 0.889 から 0.781、selection-only upper-bound reduction rate は 0.013 から 0.018 へ動いた。`functional-thinning` は generator-needed rate が 1.000 から 0.693、reduction rate が 0.000 から 0.028 へ動いた。`metrical-harmony` と `bass-root-support` も小さく改善したが、`section-grammar-repetition` は 1.000 のまま残った。

代表 seed では `bach-001` の candidate count が 392 から 1008、viable が 38 から 100 に増え、`functional-thinning` の generator-needed rate は 1.000 から 0.633 へ下がった。`minor-entry` は `register-blending` 1.000 から 0.813、`functional-thinning` 1.000 から 0.750 へ下がった。`dense-modal` は `metrical-harmony` 1.000 から 0.742、`bass-root-support` 0.903 から 0.613 へ下がったが、`functional-thinning` は 1.000 のままだった。

Theory basis: 同一鍵盤 texture では、continuity support を常に同じ register order で足すと、隣接声部の離れすぎと非機能的 thinning が固定されやすい。声部独立を守りながら候補 pool に異なる register placement を入れることは、実際の選択前に generator-needed blocker が candidate generation 不足なのか ranking 不足なのかを切り分ける助けになる。

Project response: register planner は候補 pool を増やす方向では有効だったが、selected output に採用するには melody、entry harmony、voice independence、modal severe interval の guardrail と同時に見る必要がある。section grammar repetition は候補 voice order では改善しないため、次の work は state transition、episode/codetta/stretto preparation/cadence extension の長距離構文候補を増やす。

Remaining listening gap: 今回も automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。selected output の音符差分は意図的に出していないため、採用判断ではなく candidate pool evidence として扱う。

### 9. Section grammar alternatives を oracle pool に追加した

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-section-grammar-candidates-ab --ticks 129600 --baseline-label phase11-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase11-section-grammar-candidates --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

Phase 10 section-local planner の candidate pool に、現在の planned state とは別の `episode`、`subject-return`、`stretto-like` を試す section grammar alternatives を追加した。これらは oracle/pool evidence 用の候補として pool に入るが、selected output は既存の guarded Phase 10 candidates までに制限する。あわせて candidate pool oracle の `section-grammar-repetition` は、選択済み state ではなく candidate 自身の section state で history risk を測るようにした。

22 seed 合計では hard constraints は 0 のまま維持された。candidate count は 9092 から 26416、viable candidate count は 896 から 2178 に増えた。`section-grammar-repetition` の generator-needed rate は 1.000 から 0.942、selection-only upper-bound reduction rate は 0.000 から 0.063 へ動いた。代表 seed では `bach-001` が 1.000 から 0.870、`dense-modal` が 1.000 から 0.833 へ下がった一方、`minor-entry` と `modal-cadence` は 1.000 のままだった。

Theory basis: フーガの長尺 form は、episode、codetta、stretto preparation、cadence extension、restatement の配置で方向感を作る。現在の候補 pool に別 state の section を混ぜるだけでも oracle 上の上限は少し動くが、長距離構文そのものを計画していないため、多くの seed では周期的な state pattern の反復が残る。

Project response: section grammar alternatives は candidate generation 不足の切り分けには有効だったが、Phase 11 の採用 baseline にはまだ届かない。次の work は、現在 section だけの別 state 候補ではなく、前 section の cadence strength、density、entry plan、local key distance を使った state transition planner と、codetta/cadence extension などの明示的な長距離構文を候補化する。

Remaining listening gap: 今回も automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。selected output の音符差分は意図的に出していないため、採用判断ではなく candidate pool evidence として扱う。

### 10. History-aware section grammar planner を selected output に適用した

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-history-aware-section-planner-ab --ticks 129600 --baseline-label phase11-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase11-history-aware-section-planner --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。代表例は `bach-001`、境界は `minor-entry`、rotation は `modal-cadence`、adversarial は `dense-modal`。

Phase 10 section-local planner で、candidate pool にある section grammar alternatives を selected output の候補として使う最初の history-aware planner を追加した。planner は、planned state が 4-section pattern を再発させる場合にだけ有効になり、直前 section の cadence kind、active voice density、local key distance と continuation history から alternate state を選ぶ。`baseline` と `phase10-oracle-selection` は変えない。

22 seed 合計では hard constraints は 0 のまま維持された。selected output の state sequence が変わった seed は 6/22 で、unique 4-section continuation pattern の平均は 5.091 から 5.773 へ増えた。`section-grammar-repetition` の selected risk total は 1602 から 1551 に下がり、selection-only upper-bound reduction rate は 0.000 から 0.056 へ動いた。代表 seed では `bach-001` が risk 78 から 55、`modal-cadence` と `dense-modal` が 84 から 60 に下がった。`minor-entry` は state sequence と risk が変わらなかった。

Tradeoff: 22 seed 合計では same-pitch overlap が 239 から 224、unison overlap が 14241 から 13981、shared rhythm overlap が 18536 から 18344 に下がった。一方、leap recovery misses は 402 から 403、counter-subject identity retention 平均は 0.827 から 0.826 へわずかに悪化した。`fugue-smoke` は最頻 4-section pattern count が 7 から 13 へ悪化したため、history-aware planner は採用 baseline としてはまだ不十分である。

Theory basis: 同じ episode/subject-return/stretto-like cycle を弱めることは長尺 form の方向感に効くが、現在の planner は local candidate selection の範囲で state を差し替えるだけで、codetta、cadence extension、stretto preparation、restatement の大きな設計を持たない。そのため、一部 seed では別の短い pattern に固定される。

Project response: この PR は selected-output adoption の最初の上限確認として扱う。次の work は、single-section state swap ではなく、複数 section の phrase/cadence plan と subject family を同時に選ぶ planner に進む必要がある。`fugue-smoke` の悪化、leap recovery の小悪化、counter-subject retention の小悪化は、Phase 11 の採用前 blocker として残す。

Rejected follow-up experiment: `samples/phase11-section-pattern-cap-oracle-ab` で、同じ local state score に maximum 4-section pattern repeat count を加える実験を試したが、22 seed の aggregate は変わらなかった。`fugue-smoke` の最頻 pattern count は 13 のままで、selected risk total、generator-needed rate、selection-only upper-bound reduction rate も history-aware planner と同じだった。これは問題が単純な local penalty の係数不足ではなく、単一 section 候補の guardrail と候補生成範囲に閉じた selection では別 pattern への固定を避けられないことを示す。次の planner は 1 section ずつの score adjustment ではなく、複数 section lookahead、phrase-level cadence plan、または subject family rotation を同時に候補化する必要がある。

Remaining listening gap: automatic diagnostics と generated MIDI bundle の作成までで、通し聴取と before/after pairwise preference は未実施である。selected output が変わるため、次の採用判断では `bach-001`、`fugue-smoke`、`modal-cadence`、`dense-modal` を最低限の聴取対象にする。

## Metric Tradeoff Notes

Phase 11 の実験では、agent が metric 悪化だけを見て採否を止めると、何を直すべきかが見えにくくなる。以下は現時点で docs に残す具体的な音楽上の読み替えである。

* `fugue-smoke` の最頻 4-section pattern count が 7 から 13 へ悪化した点は、単なる summary regression ではない。history-aware planner が一部 seed で `episode`、`subject-return`、`stretto-like` の周期を崩せず、むしろ別の短い cycle へ寄せたことを示す。譜面上は長尺 form の方向感が弱くなり、episode が発展ではなく同じ構文の反復として聞こえるリスクである。
* `leapRecoveryMisses` が 402 から 403 へ小悪化した点は、数値差としては小さいが、state swap が声部の歌いやすさを犠牲にしていないかを見る signal である。大跳躍後に反行や順次回収がない箇所が増えると、旋律線は vocal/instrumental line ではなく、局所候補をつないだ音列に近づく。
* `counterSubjectIdentityRetention` 平均が 0.827 から 0.826 へ下がった点は、対主題が entry を支える認識可能な素材から free-counterpoint 的な充填へ薄まるリスクを示す。section grammar の反復を減らしても、subject と counter-subject の関係が聴き取りにくくなるなら採用 baseline にはしない。
* same-pitch overlap、unison overlap、shared rhythm overlap が下がったことは positive signal だが、これだけでは音楽的改善と判断しない。支え声部が octave support や同型リズムの block へ寄ると、厳格対位法や単一鍵盤 texture では独立声部ではなく伴奏の厚みとして聞こえやすい。
* harmonic mismatch や weak-beat unresolved note を下げるために pitch を広く structural chord tone へ寄せる実験は棄却済みである。音楽的な問題は「和声音率が低い」ことだけではなく、強拍、弱拍、非和声音、bass/root support、準備、解決が役割として同期していないことにある。単独 weight で pitch を寄せると、melody、entry harmony、modal severe interval、counter-subject identity を壊す。

Project response: 次の Phase 11 work は、単一 metric の penalty 追加ではなく、複数 section lookahead、phrase-level cadence plan、subject family rotation、support voice formula、weak beat non-chord-tone resolution を同時に候補化する。採用判断では、悪化した metric ごとに seed、section、実際の音楽症状、改善側の tradeoff を記録する。

## Focused Score Examples

追加確認として `samples/phase11-specific-score-examples` で、`phase10-oracle-selection` と `phase10-section-local-planner` の A/B bundle を再生成し、代表、境界、rotation、adversarial seed の譜面イベントを確認した。

* `fugue-smoke` は採用前 blocker の代表である。beats 223-249 では baseline が `episode > subject-return > episode` だったのに対し、variant は beats 233-240 を `stretto-like` に差し替え、`episode > stretto-like > episode` へ寄せた。譜面上は tenor subject と alto answer の重なりが増えるが、全体では `episode > stretto-like > episode > stretto-like` が 13 回出る短い cycle へ固定される。これは local state swap が長距離 form を作れていないことを示す。
* `bach-001` は partial success と tradeoff が混在する。most repeated 4-section pattern は 7 から 6 へ下がり、unison overlap と shared rhythm overlap も改善する。一方で leap recovery misses は 16 から 17、counter-subject identity retention は 0.851 から 0.840 へ悪化する。beats 133-141 では Db major の subject-return から episode へ入るが、強拍の `strong-non-chord-tone` が複数声部に残り、section grammar だけでは metrical harmony を直せない。
* `modal-cadence` と `dense-modal` は section grammar repetition が 7 から 6 へ下がるが、modal identity と counter-subject identity の余裕が小さい。`dense-modal` beats 259-267 では D aeolian の subject-return に modal color が残る一方、strong beat non-chord-tone が subject と counter-subject に多く、単純な chord-tone alignment は modal severe interval や counter-subject identity を壊すリスクが高い。
* `minor-entry` は variant がほぼ効かない control case である。most repeated pattern、leap recovery misses、counter-subject identity retention が変わらず、section grammar の generator-needed rate も 1.000 のままだった。これは候補選択ではなく、phrase-level candidate generation が必要な seed を示す。

Project response: Phase 11-5 は、history-aware selected-output planner の採用ではなく、次の planner 設計の evidence として閉じる。次は 2-4 section の phrase unit、cadence plan、density arc、entry plan、local key distance、subject family rotation、functional thinning annotation、support voice formula を同時に持つ candidates を作る。

### 11. Short alternating phrase cycle guard を selected output に追加した

Phase 11-5 の採用前 blocker だった `fugue-smoke` の短い cycle 悪化を回帰防止するため、history-aware planner が `A > B > A > B` 型の 4-section phrase を作る候補を high-risk として避ける guard を追加した。これは full multi-section phrase planner ではなく、local state swap が既知の悪化へ進むことを止める限定的な変更である。

Focused seed check では、`fugue-smoke` の variant top pattern が `episode > stretto-like > episode > stretto-like` 13 回から、baseline と同じ `episode > stretto-like > episode > subject-return` 系 7 回へ戻った。`bach-001`、`modal-cadence`、`dense-modal` は most repeated pattern 7 から 6 への improvement を維持し、`minor-entry` は control case として変化しなかった。`fugue-smoke` の leap recovery misses と counter-subject identity retention も baseline 同等へ戻った。

Project response: この guard は Phase 11-6 の完了ではない。次の work は引き続き 2-4 section phrase unit、cadence plan、density arc、entry plan、local key distance、subject family rotation を同時に候補化し、functional thinning と support voice formula を phrase-level に接続する。

### 12. Functional thinning に役割別 annotation を追加した

`phase11Review.functionalThinning` は、non-cadential long run を active voice count だけで数えるのではなく、entry preparation、cadential preparation、echo、pedal、suspension preparation、unsupported に分類する count を持つようになった。これは Phase 11-7 の前提であり、休符や thinning を「声部が減った」ではなく「何の機能として減ったか」で比較するための diagnostics shape である。

Focused seed check では、`bach-001` が non-cadential run 20 件のうち annotated 18 / unsupported 2、`fugue-smoke` が 15 件のうち 13 / 2、`minor-entry` が 14 件のうち 12 / 2、`modal-cadence` が 19 件のうち 16 / 3、`dense-modal` が 20 件のうち 18 / 2 だった。現時点の annotation は多くを entry/cadential preparation として説明する一方、unsupported run は各 focused seed に残る。

Project response: この PR は diagnostics annotation までで止める。次の generator work は、phrase unit が thinning role を先に持ち、support voice formula が entry preparation、cadential preparation、pedal、suspension preparation を生成時に選べるようにする。

### 13. Multi-section phrase-unit planner を selected output に追加した

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-phrase-planner-ab --ticks 129600 --baseline-label phase11-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase11-phrase-planner --variant-model phase10-section-local-planner
```

対象 seed: 22 seed 全体。focused set は `bach-001`、`fugue-smoke`、`minor-entry`、`modal-cadence`、`dense-modal`。

Phase 11 の selected output は、1 section ずつ state を差し替えるのではなく、2-4 section の phrase unit を先に選ぶ。phrase unit は state sequence、cadence kind、density arc、local key distance を持ち、短い `A > B > A > B` cycle と単一 state 固定を高 risk として避ける。modal seed は modal identity と counter-subject guardrail の余裕が小さいため、primary state sequence を保った上で既存の history-aware candidate selection に任せる。

22 seed では hard constraints と Phase 7B readiness は維持された。candidate pool viable count は全 seed で増えた。section grammar selected risk total は 1602 から 486、unique 4-section continuation pattern 合計は 112 から 371、top entry pattern family count 合計は 333 から 314 へ改善した。unsupported functional-thinning run は 46 から 47 でほぼ横ばいだった。

Focused seed では、`bach-001` の most repeated pattern は 7 から 3、section grammar risk は 78 から 9 へ下がった。`fugue-smoke` は 7 から 4、78 から 14 へ下がり、以前の `episode > stretto-like > episode > stretto-like` 固定悪化は再発しなかった。`minor-entry` は 6 から 3、70 から 10 へ下がったが、leap recovery misses は 17 から 26 へ悪化した。`modal-cadence` と `dense-modal` は most repeated pattern が 7 から 6、section grammar risk が 84 から 60 へ下がり、unison/shared rhythm と leap recovery は改善したが、counter-subject identity retention は小悪化した。

Tradeoff: 22 seed 合計では unison overlap が 14241 から 14432、shared rhythm overlap が 18536 から 18848、leap recovery misses が 402 から 429 へ悪化した。counter-subject identity retention 合計は 18.204 から 18.043 へ下がった。これは metric だけの失敗ではなく、phrase-level form 改善が一部 seed で支え声部を同型リズムや近接 unison に寄せ、対主題の認識性や大跳躍後の歌いやすさを少し使っていることを示す。

Theory basis: 長尺 fugue form では、episode、subject return、stretto-like section が単純周期にならず、cadence と local key によって方向感を持つ必要がある。一方で、form の反復を崩すために声部独立、対主題の輪郭、跳躍回収を犠牲にしすぎると、Bach/fugue 的な素材の認識性と Fux 的な melodic recoverability が弱くなる。

Project response: phrase-unit planner は Phase 11 の section grammar blocker に有効な採用候補とするが、review signal の悪化は残す。次の採否レビューでは、`minor-entry` の leap recovery、`bach-001` / `fugue-smoke` の unison/shared rhythm、`modal-cadence` の counter-subject identity retention を focused pairwise note で確認する。functional thinning は annotation 上ほぼ横ばいなので、support voice formula と thinning role を生成時に結びつける作業はまだ残る。

## Remaining Gaps

* MIDI の通し聴取と before/after pairwise preference は未実施。
* `metricalHarmony` は time signature ごとの強拍分類をまだ持たない暫定 summary である。weak beat non-chord-tone resolution は次 strong beat までの stepwise chord-tone arrival に限るため、掛留の準備、anticipation、escape tone、longer preparation/resolution はまだ区別しない。
* Candidate pool oracle の Phase 11 blocker family は出るが、selection-only upper bound はほとんどの blocker で低く、generator-needed rate が高い。
* section grammar repetition は phrase-unit planner で selected risk total が 1602 から 486 へ下がったが、unison、shared rhythm、leap recovery、counter-subject identity retention の review-signal tradeoff が残る。
* review summary 追加 PR は生成音そのもの、candidate scoring、gate threshold を変えていない。follow-up diagnostics PR は selected candidate feature を増やし、register / section grammar candidate PR は oracle pool を増やした。history-aware planner と phrase-unit planner は selected output を変えるが、gate threshold は変えていない。

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

## Remaining Gaps

* MIDI の通し聴取と before/after pairwise preference は未実施。
* `metricalHarmony` は time signature ごとの強拍分類や non-chord-tone role をまだ持たない暫定 summary である。
* Candidate pool oracle の Phase 11 blocker family は未実装で、selection-only upper bound と generator-needed rate はまだ出ない。
* 今回の変更は観察サマリの追加であり、生成音そのもの、candidate scoring、gate threshold は変えていない。

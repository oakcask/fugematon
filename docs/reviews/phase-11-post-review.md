# Phase 11 Post-Completion Score Review

Phase 11 完了後に、現行 default adoption candidate の `phase10-section-local-planner` を 22 seed で再生成し、Phase 8/9 へ戻ってよいかを譜面イベントと diagnostics から再評価した。

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase11-post-review --ticks 129600 --baseline-label phase11-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase11-current --variant-model phase10-section-local-planner
```

このレビューは agent-side の ScoreEvent / diagnostics 読みであり、MIDI 通し聴取ではない。

## Findings

### 1. Phase 11 は効いているが、similar phrase blocker は残る

22 seed 全体で hard constraint failure は 0、Phase 7B readiness は 22/22 を維持した。Phase 11 の主成果も再現した。4-section continuation pattern の最頻 count 合計は baseline 145 から current 79 へ下がり、unique pattern 合計は 112 から 371 へ増えた。unsupported functional-thinning run も 46 から 22 へ下がり、strong beat bass/root support は 436 から 618 へ増えた。

ただし、反復感は解消ではなく弱化に留まる。`angular-answer` は most repeated pattern count 7、unique pattern 4 のまま変わらない。`modal-dorian` と `modal-answer` は count 6、unique 5 に残る。`modal-cadence` と `dense-modal` は count 7 から 6 へ下がったが、unique は 8 に留まり、上位 pattern は `episode > stretto-like > episode > subject-return` 系と `episode > subject-return > episode > stretto-like` 系へ集中する。

Theory basis: fugue では subject recurrence が必要だが、Marlowe の fugue form 論のように outer form と tonal/voice-leading structure を合わせて読む必要がある。state 名の順序だけが変わっても、cadence、local key、entry function、density arc が同じなら長尺の方向感は弱い。

Project response: Phase 8/9 へ戻らず、Phase 12 で phrase grammar と subject-family variation を先に扱う。

### 2. 主題 family と subject-fragment が似た語彙へ固定されている

22 seed の entry pattern family は、少数の degree pattern に偏っている。

* `subject-fragment 0-1-2-3`: 144 occurrences / 12 seeds。
* `subject 0-2-1-3-4-3-2-1`: 133 occurrences / 10 seeds。
* `subject-fragment 0-2-1-3`: 122 occurrences / 10 seeds。
* `answer 0-1-2-3-3-3`: 107 occurrences / 12 seeds。
* `subject 0-1-2-3-4-3`: 107 occurrences / 12 seeds。
* `subject 0-1-2-3-4-3-1-2`: 105 occurrences / 9 seeds。

これは `episode` / `subject-return` / `stretto-like` の state grammar だけでなく、実際の melodic material が同じ上行 step fragment と 4-3 系折り返しへ寄っていることを示す。`angular-answer`、`modal-cadence`、`dense-modal` では top entry family が short subject-fragment `0-1-2-3` になり、section が変わっても似た入り方に聞こえやすい。

Theory basis: Margulis の repetition 研究は反復が音楽聴取の中心的現象であることを示すが、Fugematon の現状は attention を変える反復ではなく、同じ entry material が機能差を持たず再利用される反復である。Temperley の uniform information density の観点でも、低情報量の反復が長く続き、局所的な surprise や phrase goal と釣り合っていない。

Project response: Phase 12 は section state ではなく、subject stem、answer transform、fragment derivation、counter-subject tail、cadence approach を同時に持つ phrase-family generator を作る。既存 pattern を重みで薄めるだけではなく、同一 subject identity を守った別 stem を候補化する。

### 3. Form と thinning の改善が voice-leading tradeoff を買っている

Phase 11 current は unsupported thinning を減らす一方で、22 seed aggregate では review signal が悪化した。

* counter-subject identity retention average: 0.827 から 0.820。
* leap recovery misses: 402 から 459。
* unison overlap: 14241 から 14611。
* shared rhythm overlap: 18536 から 18848。
* strong beat chord-tone mismatch: 2002 から 2156。
* weak beat unresolved non-chord-tone: 2206 から 2302。

`minor-entry` は section grammar risk 70 から 10、unsupported thinning 2 から 1 に改善するが、leap recovery は 17 から 26、counter-subject identity retention は 0.920 から 0.897 へ悪化する。`bach-001` と `fugue-smoke` は form 改善が大きいが、unison/shared rhythm は増える。`dense-modal` は unsupported thinning が下がる一方、bass/root support と harmonic mismatch が小悪化する。

Theory basis: Fux/species counterpoint では大跳躍後の回収、反行/斜行、prepared/resolved dissonance が melodic line と声部独立の基礎になる。root/pedal support は thinning を説明できるが、同型リズムや octave block support として足されると、対位法ではなく伴奏的な厚みになる。

Project response: support formula は active voice count を増やす後処理ではなく、phrase unit の role として作る。entry preparation、cadential preparation、pedal、suspension preparation は、発音前から voice-leading obligation と解決先を持つ候補にする。

### 4. Modal / rotation seed は Phase 11 baseline の弱点をよく出す

`modal-cadence` は most repeated pattern count 6、counter-subject identity retention 0.558、review signal 4。`dense-modal` は count 6、retention 0.584、bass/root support 15。`modal-answer` は count 6、retention 0.631、leap recovery misses 34、shared rhythm 906。`angular-answer` は count 7、unique pattern 4、retention 0.591。

Modal color を守ろうとすると usable pitch material が狭くなり、既存 subject family と answer transform がさらに目立つ。ここへ mechanical support を足すと、characteristic tone と counter-subject identity の余裕を使い切る。

Theory basis: modal/early style の許容 dissonance と common-practice root support は同じ rule set では扱えない。style profile ごとに、characteristic tone、final/reciting-tone gravity、cadence type、counter-subject recognizability を分けて見る必要がある。

Project response: Phase 12 は modal seeds を後回しにしない。modal family は strict-classical の tonal answer variant ではなく、final/reciting-tone と modal cadence を持つ専用 phrase family として作る。

## Structural Hypothesis

Confirmed. Phase 11 current の remaining blocker は selection weight ではなく generator/planner 側にある。

Symptom: seed が違っても似た上行 fragment、同じ subject/answer degree pattern、`episode` / `subject-return` / `stretto-like` の短い cycle が残る。

Repeated pattern: entry family は `0-1-2-3` fragment と `0-2-1-3-4-3-2-1` / `0-1-2-3-4-3-1-2` subject に集中し、section grammar の悪い seed は unique 4-section pattern が 4-8 に留まる。

Evidence strength: 22 seed diagnostics で confirmed。candidate pool oracle でも Phase 11 blocker は generator-needed rate が高い。current variant の aggregate は `metrical-harmony` 0.908、`bass-root-support` 0.950、`register-blending` 0.802、`functional-thinning` 0.748、`section-grammar-repetition` 0.948。

Project response: Phase 12 を Phase 8/9 の前に挿入し、destructive generator rewrite を許可する。selection-only scoring、UI masking、無限再生安定化は主経路にしない。

## Literature Notes

Fresh lookup / cache checked on 2026-05-18.

* Elizabeth Hellmuth Margulis, [On Repeat: How Music Plays the Mind](https://academic.oup.com/book/9924), Oxford University Press, 2013. Repetition is musically central, but this supports designing meaningful repetition, not accepting indistinguishable phrase loops.
* David Temperley, [Uniform Information Density in Music](https://mtosmt.org/ojs/index.php/mto/article/view/356), Music Theory Online 25/2, 2019. Supports balancing predictability and novelty across dimensions instead of adding random variation.
* Sarah Marlowe, [Resolving Tensions between Outer Form and Inner Form in Fugue](https://mtosmt.org/issues/mto.20.26.3/mto.20.26.3.marlowe.html), Music Theory Online 26/3, 2020. Supports evaluating fugue form through interaction of formal design and tonal/voice-leading structure.
* William E. Caplin, [Classical Form](https://academic.oup.com/book/49159), Oxford University Press, 1998. Not a fugue-specific source, but useful for phrase function, continuation, cadential function, and larger formal organization.
* Shapira, [Voice Leading in Fugue](https://academicworks.cuny.edu/gc_etds/5186/), 2023. Cached reference supports treating fugal entries as context-dependent voice-leading events rather than reusable shapes with fixed function.

## Replanned Route

Phase 12 becomes the next implementation phase. Phase 8/9 stay deferred until Phase 12 score review shows that phrase similarity is materially lower without buying unacceptable voice-leading regressions.

Phase 12 scope:

1. Phrase-family generator rewrite.
   * Generate subject stems with metrical stress, local climax, cadence approach, and recoverability constraints.
   * Keep subject identity at a family level, but create multiple derived stems instead of reusing the same degree pattern family.
   * Add modal phrase families with final/reciting-tone gravity and modal cadence behavior.
2. Motive development grammar.
   * Derive fragments through inversion, diminution, sequence, tail extraction, and rhythmic augmentation with explicit source links.
   * Require repeated fragments to change function: entry preparation, episode sequence, cadence extension, stretto compression, or restatement.
3. Phrase-level harmonic rhythm.
   * Choose cadence target, strong-beat support, weak-beat non-chord-tone role, suspension preparation/resolution, and bass/root support before note emission.
   * Treat unresolved weak-beat non-chord tones and strong beat mismatch as phrase design failures, not only diagnostics after generation.
4. Texture support as planned counterpoint.
   * Replace post-hoc support insertion with support voices that carry contrary/oblique motion, suspension/pedal role, and leap recovery obligations.
   * Keep active voice count improvements only when unison/shared-rhythm and melodic recovery stay acceptable in representative and modal seeds.
5. Corpus-relative repetition profile.
   * Use reference corpus profiles for subject recurrence, fragment recurrence, section pattern recurrence, phrase length, cadence spacing, and density arc.
   * Absolute zero requirements remain inappropriate; the gate should compare normalized repetition and function-bearing repetition.
6. Adoption review.
   * Regenerate 22 seed A/B bundle.
   * Focused score review must include `angular-answer`, `modal-dorian`, `modal-answer`, `modal-cadence`, `dense-modal`, plus `bach-001`, `fugue-smoke`, and `minor-entry`.
   * Adoption requires hard constraints and Phase 7B readiness to remain green, most repeated 4-section pattern to fall on the weak seeds, entry family concentration to fall, and the current voice-leading regressions to be explained seed by seed.

## Remaining Gaps

MIDI通し聴取と人間 pairwise preference は未実施。MusicXML/五線譜レンダリングによる可視確認も未実施。今回の結論は ScoreEvent / diagnostics / literature-backed planning に基づく。

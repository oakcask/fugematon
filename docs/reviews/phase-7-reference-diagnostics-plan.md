# Phase 7 参照作品 diagnostics 計画

Phase 7 の現行 CI gate は、破綻回避や局所的な改善は検出できるが、音楽的な心地よさを十分に表現できていない。重み調整を続ける前に、既存作品から同じ diagnostics を生成し、Fugematon の出力を参照作品の分布と比較できる状態へ再構成する。

## 文献とデータ根拠

* music21 corpus documentation: music21 corpus は MusicXML、Humdrum などの freely distributable score を扱えるが、corpus の権利は項目ごとに異なる。参照データは source id、版、license、取り込み日を metadata として保持し、score file を無条件に再配布しない。
* KernScores: Humdrum `**kern` の大規模 score library。Bach fugue などの参照候補を Fugematon の score event へ正規化する import path として検証する。
* Temperley, "Uniform Information Density in Music": 反復、期待、情報密度を音楽的理解の軸として扱う研究。Fugematon では absolute count だけでなく、参照分布からの外れ方を diagnostics にする根拠にする。
* Shapira, "Voice Leading in Fugue": Bach fugue では同じ主題 entry でも文脈ごとに underlying voice leading が異なる。主題 degree pattern だけで判断せず、entry-local harmony、support voice、section role を合わせて見る。
* Fang et al., "Bach or Mock?": generated Bach-style chorales を interpretable な music feature で評価する研究。Fugematon では black-box score に寄せすぎず、説明可能な feature profile と聴取 review を併用する。
* Zhu et al., "BacHMMachine": theory-guided constraints と corpus-derived distribution を組み合わせる方針の根拠。hard constraint、reference-relative soft gate、manual listening を分離する。
* Quinn and Mavromatis, "Voice-leading prototypes and harmonic function in two chorale corpora": voice-leading と harmonic function を corpus から読み出す手法の根拠。Fugematon では tonal と modal の reference profile を分ける。
* Marlowe, "Resolving Tensions between Outer Form and Inner Form in Fugue": fugue は表層の模倣技法だけでなく、形式と tonal/voice-leading structure の関係として評価する必要がある。section repetition と cadence approach の reference diagnostics を追加する根拠にする。

## 再構成方針

Phase 7 後半は、これ以上の scoring weight 調整を主作業にしない。次の順で進める。

1. Reference corpus ingestion: MusicXML、Humdrum `**kern`、MIDI のうち、voice 分離と拍節 metadata を保てる形式を優先して、Bach WTC fugue などの小さな参照集合を `ScoreEvent` 相当へ正規化する。license と source metadata は import manifest に残す。
2. Reference diagnostics: 現行 `GenerationDiagnostics` と同じ軸を参照作品にも適用する。count は曲長、active voice-pair duration、entry 数、section 数で正規化し、Fugematon seed と同じ table に並べる。
3. Reference profile: `sharedRhythmOverlap`、`samePitchOverlap`、entry-local severe interval、leap recovery、stepwise pattern、section density transition、long-run repetition を percentile profile として保存する。Bach でも出る現象はゼロ要求にしない。
4. Reference-relative review signal: CI の中心を absolute threshold から hard constraint と review signal の分離へ移す。`referenceProfile` との差分は最初から fail にせず、`review-required` として review bundle に残す。
5. Candidate pool oracle: blocker seed で、現在の候補集合の中に reference-relative gate を同時に満たす候補が存在するかを測る。存在する場合は selection model を直し、存在しない場合は generator または section planner を直す。
6. Section-local planner: entry support、second support voice、texture thinning、codetta、stretto preparation を section-local candidate として追加し、entry harmony、leap recovery、modal identity、voice-pair lockstep、contour を同時に評価する。
7. Pairwise listening: 参照分布に近づいた案が本当に心地よいか、代表 seed と境界 seed の before/after pairwise preference で確認する。reference score は判断補助であり、聴取 gate を置き換えない。

## 初期参照 profile

最初の profile は広くしすぎない。まずは 3-4 声の Bach fugue を中心にし、chorale は harmony と voice-leading の補助 reference として分ける。

* fugue-reference: WTC fugue から voice 分離できる score を小集合で取り込む。entry-local interval、subject recurrence、episode density transition、section repetition を見る。
* chorale-reference: Bach chorale から vertical voice-leading、dissonance resolution、harmonic function prototype を見る。fugue form や subject recurrence の gate には混ぜない。
* modal-or-early-reference: modal seed のために、pre-tonal/modal corpus を別 profile として調査する。tonal Bach profile の percentile を modal seed へ直接適用しない。

## CI への入れ方

CI は三層に分ける。

* hard constraints: range、voice crossing、subject identity、answer plan、未解決の強い不協和など、参照作品に近いかどうかと無関係に壊してはいけないもの。
* reference-relative review signal: 参照 profile の外れ値として検出するもの。shared rhythm、same-pitch overlap、entry-local severe interval、solo texture risk、stepwise pattern fixation、long-run repetition をここへ移す。Phase 7B 以降はこれらを Phase 8 blocker ではなく、quality lane の review-required evidence として扱う。
* listening and preference evidence: 自動 profile だけでは決めないもの。voice independence の聴感、entry の濁り、episode の疲労、modal color の説得力を pairwise preference で扱う。manual listening は廃止しないが、全 seed pass を操作機能開始条件にはしない。

Phase 7A 完了条件は、参照作品から diagnostics を生成するための metadata/profile 足場を作り、Fugematon 22 seed と比較でき、代表的な blocker について selection problem か generator problem かを切り分け、absolute gate だけでは完了判定できないことを rejected experiments として記録することに変更する。section-local planner 改善と pairwise preference win は Phase 10 quality lane へ移し、Phase 8 の開始条件にはしない。

## PR1 完了範囲

最初の stacked PR では、参照 score ingestion と scoring 変更へ進む前の coverage/refactor を完了した。

* `phase-7-fugue-reference-profile` を code-side fixture として追加した。これは metadata-only の初期 profile であり、score file は再配布しない。source id、source format、license policy、import date、MusicXML/Humdrum ingestion の extension point を持つ。
* 既存 `GenerationDiagnostics` から reference-relative metrics を作る normalizer を追加した。shared rhythm、unison、same-pitch overlap は推定 active voice-pair quarter duration、entry interval は subject entry 数、leap recovery と repeated degree pattern は score length、solo texture は section 数で割る。
* review bundle summary を schema version 9 に上げ、top-level `referenceDiagnostics` と seed ごとの `referenceComparison` を出す。22 seed の比較は review 用 evidence であり、この PR では fail gate にしない。
* tests は review summary に reference profile と comparison が出ること、shared rhythm / unison / stepwise motion がゼロ要求ではなく正規化された metric として比較されることを固定する。

この PR では生成挙動、candidate scoring、threshold、manual listening judgement は変えない。

## PR2 完了範囲

2 本目の stacked PR では、reference diagnostics の比較軸を candidate pool review に接続した。現行 continuation candidate pool について、selected candidate と candidate alternatives の `CandidateEvaluation` 説明 feature を比較し、entry harmony、voice-pair lockstep、melody leap recovery、stepwise pattern fixation、section solo texture の representative blocker を `selection-model` または `generator-or-section-planner` に分類する。

oracle は hard failure を持つ候補を viable candidate から除外し、Phase 6/7 の guardrail proxy として leap recovery、counter-subject identity、contour feature が selected candidate より悪化しない候補だけを改善候補にする。pool 内に reference-relative risk を下げる viable candidate があれば selection model の責務、なければ generator または section planner の責務として扱う。

review bundle summary は schema version 10 になり、seed ごとの `diagnosticsSummary.candidatePoolOracle` に候補数、viable 候補数、hard failure 除外数、blocker 別の代表分類を残す。この PR では生成挙動、candidate scoring weight、threshold、manual listening judgement は変えない。

## PR3 blocker record

section-local planner 改善として、continuation 後半に短い held second-support を足す staged thinning 候補を試した。manual listening は実施しておらず、判断は diagnostics-backed before/after に限る。

広い候補では solo texture の diagnostics は改善した。risk 6 以上の selected section は 317 から 249-278 まで下がり、多くの non-modal seed で unsupported solo run が 0 になった。一方で Phase 6/7 hard gate は保てなかった。`sparse-cadence` と `restless-line` は `unisonOverlapCount` が 770-775 へ上がり、`fugue-smoke`、`lyrical-line`、`contrary-answer` は `samePitchOverlapCount` が 41-48 へ悪化した。

relative guard、absolute gate ceiling guard、stretto-like 限定まで狭めると Phase 6/7 gate は pass したが、selected section solo texture risk は baseline の risk 6 以上 317 件、total risk 3188 に戻った。pairwise preference を支える before/after 改善が残らないため、この PR3 planner change は採用しない。

この結果から、candidate pool oracle 後の section-local planner は solo texture risk だけで candidate を足す形では足りない。次の候補生成は 2 声目 support の pitch class、octave、onset、duration、active voice-pair の same-pitch/unison、leap recovery、modal identity、contour を同じ section-local guard に入れる必要がある。gate を保ち、diagnostics-backed preference と manual pairwise preference の両方で勝つ planner または scoring 変更が出るまで、Phase 7 completion は blocked のままとする。

## PR4 completion audit

PR3 後の別経路として、section-local candidate を増やさず、既存 candidate pool の reference-relative tie-break だけで completion candidate を作れるか確認した。manual listening は実施しておらず、pairwise preference は空のままである。

baseline audit では、22 seed すべてが Phase 6/7 gate を pass した。candidate pool oracle は section-solo-texture を全 seed で `generator-or-section-planner` と分類し、既存 pool 内に solo risk を下げる viable candidate はなかった。entry-harmony は `bright-answer` の 1 section だけが `selection-model` だった。solo-risk tie-break は total-cost margin 5、10、25、50、100、200 のどれでも selected candidate を変更しなかった。

lockstep risk と combined risk の tie-break は candidate を変更したが、22 seed 中 1 seed の Phase 6/7 gate を壊した。entry risk tie-break は gate を保つものの、25 以上の margin でも 1 section しか変わらず、合計 severe entry interval 1859 から 1857、unresolved severe entry interval 1084 から 1078 の小改善に留まった。stepwise risk tie-break は gate を保ち、合計 leap recovery miss を 407 から 393-396 へ下げたが、same-pitch/unison は少し悪化し、shared rhythm 18536 と high selected section solo texture risk 317 は変わらなかった。

この audit から、既存 pool の selection model だけで旧 Phase 7 completion criteria を満たす経路は現時点でない。PR2 oracle の selection/generator 切り分けは有効だが、旧条件のままでは Phase 8 が美しさ gate によって止まり続ける。このため Phase 7A は diagnostics reset と blocker 記録で完了扱いにし、Phase 7B で hard constraint と review signal を分ける。section-local planner が reference-relative diagnostics と manual pairwise listening の両方で現行より勝つことは、Phase 10 quality lane の採否条件へ移す。

## 残り作業

次の PR 以降で、実 score ingestion と reference profile の実測化を進める。

* MusicXML/Humdrum score を source metadata と license 確認つきで取り込み、`ScoreEvent` 相当へ正規化する。
* active voice-pair duration、entry annotation または subject match、section/cadence metadata を import path から実測する。
* Bach fugue、chorale、modal/early reference を別 profile として分け、metadata-only fixture の暫定 band を percentile profile へ置き換える。
* reference-relative result を `review-required` として扱い、CI hard fail とは分離する。
* candidate pool oracle の分類結果を使い、selection model で動かせる blocker と generator/section planner の候補追加が必要な blocker を別 PR に分ける。
* Phase 7B では review gate を hard constraint、review signal、manual preference に分類し、Phase 8 を hard constraint 通過後に開始できるようにする。
* section-local planner 改善は pairwise listening で現行より勝つことを確認してから Phase 10 quality lane の採用候補にする。

## 参照

* music21 corpus documentation: https://music21.org/music21docs/moduleReference/moduleCorpus.html
* KernScores: https://kern.humdrum.org/
* Temperley, "Uniform Information Density in Music": https://mtosmt.org/issues/mto.19.25.2/mto.19.25.2.temperley.html
* Shapira, "Voice Leading in Fugue": https://academicworks.cuny.edu/gc_etds/5186/
* Fang et al., "Bach or Mock?": https://arxiv.org/abs/2006.13329
* Zhu et al., "BacHMMachine": https://arxiv.org/abs/2109.07623
* Quinn and Mavromatis, "Voice-leading prototypes and harmonic function in two chorale corpora": https://doi.org/10.1007/978-3-642-21590-2_18
* Marlowe, "Resolving Tensions between Outer Form and Inner Form in Fugue": https://mtosmt.org/issues/mto.20.26.3/mto.20.26.3.marlowe.html

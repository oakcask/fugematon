# Phase 10 譜面レビュー

Phase 10 完了後に、メトリクスだけではなく生成譜面そのものから音楽美を確認するため、代表、境界、rotation、adversarial の 4 seed を再生成して読んだ。

生成 bundle:

```sh
pnpm fugematon review-ab --out samples/phase10-score-review --ticks 129600 --baseline-label phase10-oracle-selection --baseline-model phase10-oracle-selection --variant-label phase10-section-local-planner --variant-model phase10-section-local-planner
```

レビュー対象は variant 側の `phase10-section-local-planner` MIDI と、同じ model で生成した ScoreEvent の note、entry、section 情報である。人間による通し聴取はまだ行っていない。

## Findings

### 1. 非 modal seed は提示部が読みやすい一方、Phase 10 planner の譜面上の改善はまだ出ない

対象 seed: `bach-001`、`minor-entry`

`bach-001` は F# major で、alto subject、soprano answer、tenor subject、bass answer が 4 拍間隔で入る。主題は `0-2-1-3-4-3-2-1`、応答は tonal answer により `0-2-1-3-3-3-2-1` へ変わる。冒頭 16 拍は subject と answer の輪郭が声部ごとに明確で、対主題も 8 拍目以降に alto へ現れるため、提示部としての読みやすさは保たれている。

`minor-entry` も同じ entry 構造で、E major の提示部から Db major の subject-return へ早く進む。冒頭の subject/answer は声部配置としては明瞭だが、soprano の answer 後に細かい free-counterpoint が続き、alto counter-subject と細かい動きが重なるため、譜面上は提示部後半からやや忙しい。

Phase 10 section-local planner はこの 2 seed の selected output を変えない。candidate pool は広がるが、譜面上の音は `phase10-oracle-selection` と同じである。したがって、非 modal representative / boundary seed では、Phase 10 の譜面美改善はまだ「将来の候補を増やした」段階であり、実際の音符としては episode の薄さや反復感が残る。

Theory basis: フーガ提示部では subject/answer の識別性と声部の独立した入りが基礎になる。一方、episode が同じ texture drop を反復すると、Bach/common-practice fugue 的な発展感よりも機械的な継ぎ足しに聞こえやすい。

Project response: 非 modal episode/codetta/stretto preparation にも selected output を変えられる section-local 候補を増やす。ただし subject/answer の明瞭さを壊さないことを採用条件にする。

### 2. `modal-cadence` は密度の穴を埋めるが、補助線はまだ発展素材というより上声の添え線に近い

対象 seed: `modal-cadence`

`modal-cadence` は B aeolian。提示部は alto subject、soprano answer、tenor subject、bass answer で、主題は `0-1-2-3-4-3-1-2`。aeolian の狭い順次的輪郭が維持され、answer も `0-1-2-3-3-3-1-2` として modal 色を残す。

Phase 10 planner の譜面上の主な変化は、episode 後半に staggered support が入ること。代表例では b57.5 に soprano E5、b59.5 に F#5、b61.5 に G5 が追加され、baseline にあった b61 tenor E3 の単発 free-counterpoint は消える。同じ型は b89.5、b121.5、b153.5 付近にも現れる。これは 1 声だけが残る薄さを避ける点では有効で、entry 主題や modal counter-subject の輪郭を直接壊していない。

弱点は、追加された補助線が高声部で E-F#-G 的に反復されるため、episode の動機展開というより、空白を埋める上声の線として見えやすいこと。entry 周辺の 2 度/7 度の濁りを解く変更ではないため、和声上の緊張処理は Phase 10 planner の主成果ではない。

Theory basis: Fux/species counterpoint 的には、補助声部は完全協和の平行や unison を増やさず、独立した入りを持つ限り薄い texture の改善になりうる。ただし fugue episode としては、主題断片や sequence による発展感がない補助線は、長尺では装飾的な充填に留まりやすい。

Project response: `modal-cadence` の採用判断では、density transition 改善としては支持できるが、episode development 改善とは別に扱う。次の quality lane では、追加線が subject fragment、counter-subject tail、cadential approach のいずれに属するかを説明できる候補を優先する。

### 3. `dense-modal` は今回の譜面レビューで最も改善が見えるが、octave lockstep の印象は残る

対象 seed: `dense-modal`

`dense-modal` は A aeolian。提示部は `modal-cadence` と同じ modal subject family で、alto subject、soprano answer、tenor subject、bass answer が明確に並ぶ。Phase 10 planner は selected output を実際に変え、b36.5 に soprano D5、b38.5 に E5、b40.5 に F5 を追加する。さらに b66 以降では、D aeolian の subject-fragment 周辺が大きく差し替わり、alto は D4-E4-F4-G4、soprano は A5-Bb4-A5-G5、bass/tenor は D/E/F/G の半拍 support へ動く。

この差し替えは、単なる空白埋めより音楽的な効きがある。D aeolian の局所 section で声部が同じ方向へ寄りすぎる箇所を下方へ整理し、subject fragment と counter-subject の関係を少し見通しやすくしている。modal counter-subject identity も譜面上で落ちていない。

残る弱点は、b66-b68.5 の bass と tenor が同じ pitch class を octave で半拍ずつ共有するため、4 声対位法としては厚みというよりブロック状の支えに聞こえる可能性があること。exact unison ではないが、同時進行の支えが続くため、厳格対位法寄りの美しさとしてはまだ余裕がない。

Theory basis: modal/early-music 的な色を守るには characteristic tone と subject family の認識性を残す必要がある。今回の `dense-modal` はそこを壊さず density を増やしている点で採用価値がある。一方、octave doubling 的な lockstep は、同一楽器 texture では独立声部の印象を弱める。

Project response: `dense-modal` は Phase 10 section-local planner の良い代表例として残す。ただし、次の planner 候補では bass/tenor の octave support を完全な同時同型ではなく、保続、反行、休符を交えた支えに分散する。

### 4. 構造仮説: Phase 10 planner は entry harmony ではなく、modal episode の density transition にだけ効いている

症状: selected output が変わるのは `modal-cadence` と `dense-modal` に限られ、非 modal seed の譜面は変わらない。変わった箇所も entry そのものではなく、episode や continuation 後半の free-counterpoint support である。

Repeated pattern: 追加音は高声部の 2 拍 support、または bass/tenor の半拍 octave support として現れる。主題提示、answer plan、section state sequence は大きく変わらない。

Theory basis: density transition は長尺の聴取疲労や texture の穴を減らすが、entry harmony、subject development、episode sequence の質とは別問題である。

Evidence strength: confirmed for the reviewed Phase 10 subset. `modal-cadence` と `dense-modal` では譜面上の追加/差し替えが確認できる。`bach-001` と `minor-entry` では selected output は変わらない。

Project response: Phase 10 は完了扱いのままでよいが、default model adoption の根拠を「音楽美全般の勝利」とは書かない。現時点の譜面上の成果は、modal seed の density transition 改善に限定する。Phase 8/9 へ戻る前に Phase 11 の品質モデル再設計を挟み、manual pairwise listening は引き続き gap として残す。

## Reviewed Seeds

* `bach-001`: representative。提示部は明瞭だが、Phase 10 planner の selected notes は変わらない。
* `minor-entry`: boundary。提示部後半から細かい free-counterpoint が忙しいが、selected notes は変わらない。
* `modal-cadence`: rotation。staggered soprano support が入り、薄い episode を補う。ただし発展素材としては弱い。
* `dense-modal`: adversarial。D aeolian 周辺の差し替えが最も有効。bass/tenor の octave support は次の改善対象。

## Remaining Gaps

* MIDI の通し聴取と before/after pairwise preference は未実施。
* MusicXML や五線譜レンダリングによる人間向け譜面確認は未実施。今回は ScoreEvent と MIDI からの譜面読みに留まる。
* 文献の個別ページ・譜例への引用確認は行っていないため、理論根拠は Fux/species counterpoint、Bach/common-practice fugue、modal/early-music、popular-music texture の source-family レベルの暫定レビューである。

## Human Review Follow-up

人間の譜面レビューで指摘された 3 点を、同じ `phase10-section-local-planner` の 22 seed から ScoreEvent を半拍単位で再確認した。

### 1. パートの音域分離が強すぎる

確認結果: 再現する。

22 seed 全体で、隣接声部の active pitch interval は soprano-alto、alto-tenor、tenor-bass のすべてで中央値が 12 semitones だった。1 octave を超える隣接声部間隔は soprano-alto 1944 checkpoint、alto-tenor 2088 checkpoint、tenor-bass 2239 checkpoint あった。各声部の実使用 pitch span も多くの seed で 8-15 semitones に収まり、声部が register target 周辺へ固定されやすい。

代表例:

* `bach-001`: soprano Bb4-Ab5、alto B3-B4、tenor C#3-B3、bass C#2-B2。各声部がほぼ別 octave 帯へ分かれる。
* `dense-modal`: tenor-bass の隣接 interval は median 13、75 percentile 16 semitones で、低声 2 パートが広く分離したまま support を作る箇所が目立つ。

音楽的判断: 管楽・弦楽四重奏なら自然に聞こえやすいが、オルガンやピアノの単一鍵盤 texture としては、声部が別楽器的に分かれすぎる。voice crossing を 0 に保つ現行方針は有効だが、声部の可動域と重なりを少し許す register planning が必要である。

Planning constraint: 次の planner/generator work では、range violation と voice crossing を避けるだけでなく、adjacent voice interval の分布、声部別 pitch span、同一鍵盤 texture 向けの register blending を review signal に加える。

### 2. どの seed でも似たような進行が頻出する

確認結果: 再現する。

22 seed の冒頭 4 entry は 3 種類の degree-pattern family にほぼ集約された。

* 10 seed: `0-2-1-3-4-3-2-1` subject と `0-2-1-3-3-3-2-1` answer。
* 9 seed: `0-1-2-3-4-3-1-2` subject と `0-1-2-3-3-3-1-2` answer。
* 3 seed: `0-1-2-3-4-3-2-1` subject と `0-1-2-3-3-3-2-1` answer。

continuation state も強く反復している。22 seed 全体の 4-section state pattern では、`stretto-like > episode > subject-return > episode` が 108 回、`episode > stretto-like > episode > subject-return` が 91 回、`episode > subject-return > episode > stretto-like` が 87 回出た。`bach-001`、`modal-cadence`、`dense-modal` は、いずれも continuation で `episode > subject-return > episode > stretto-like` 系の周期に早く入る。

音楽的判断: 主題 family の少なさと section-state cycle の固定が重なり、key や mode が違っても似た進行に見える。現在の Phase 10 planner は density transition の候補を増やしたが、long-range form や subject family diversity にはまだ効いていない。

Planning constraint: 次の quality lane では、section-local candidate だけでなく、subject family、answer transform、continuation state grammar、episode sequence pattern の多様性を同時に扱う。単純な random variation ではなく、主題認識性を保った別 family と、cadence/episode/stretto の長距離構文を候補化する。

### 3. 複数パートが無音になるが終止感がない

確認結果: 再現する。

半拍 checkpoint で active voices が 2 以下、かつ cadence target から 1 beat より遠い 1 beat 以上の run は、22 seed 合計で 489 件あった。active voices が 1 以下の非終止的 run も 372 件あった。これは all-voice silence ではないため既存の hard gate には出にくいが、譜面上は複数パートが休んでいるのに cadence として閉じていない箇所として見える。

代表例:

* `bach-001`: b37-b44 episode/modulatory で active voice が 1 まで落ち、cadence target から 4 beats 離れている。
* `minor-entry`: b30-b35 と b38-b43 の episode/modulatory で active voice が 1 まで落ちる。
* `modal-cadence`: b22-b29 episode/modal で active voice が 1 まで落ち、cadence target から 6 beats 離れている。
* `dense-modal`: b36-b41 episode/modal と b46-b51 stretto-like/evaded で active voice が 1 まで落ちる。

音楽的判断: 休符や thinning 自体は悪くないが、cadence、phrase boundary、entry preparation、echo などの機能づけが弱いと、単にパートが脱落したように見える。Phase 10 の staggered support は一部の modal seed でこれを減らすが、22 seed 全体ではまだ一般解になっていない。

Planning constraint: solo texture risk は「1 声だけ残るか」だけでなく、cadence target、phrase boundary、次 entry preparation、section role と結びつけて評価する。終止感のない thinning は、複数パート休止を許す前に support line、pedal, suspension, echo, cadential preparation のいずれかとして説明できる候補を優先する。

### 4. 強拍・弱拍を意識した和音設計が弱く、リズム感と構成感が出ない

確認結果: 再現する。

`harmony-diagnostics` の現行実装では `strongBeatDissonanceCount` と `harmonicFunctionMismatches` が実質的に未計測で、強拍上の和声安定度は gate で捕捉できていない。そこで 22 seed の ScoreEvent を半拍単位で読み、各 section の最寄り harmonic anchor が示す function から暫定 chord tones を作り、active notes が chord tones に入っているかを確認した。

22 seed 合計では、downbeat の chord-tone mismatch が 747/977、mid-strong beat が 684/920、weak beat が 1424/1951、offbeat が 3229/3867 だった。downbeat でも mismatch rate は 0.765 で、弱拍の 0.730 より安定していない。bass が期待 root を支えていない割合も downbeat で 0.780、mid-strong beat で 0.767 だった。つまり、強拍が構造的な和音として立つ設計になっておらず、拍節による安定と不安定の差が譜面上に出ていない。

代表例:

* `bach-001`: b8 downbeat は exposition の predominant anchor だが、active pitch classes は F#/C#/F# で、期待 chord tones B/Eb/Ab に対して全声が外れる。
* `minor-entry`: b8 downbeat は E major exposition の predominant anchor だが、active pitch classes は E/B/E で、期待 chord tones A/C#/F# から外れる。
* `modal-cadence`: b8 downbeat は B aeolian exposition の predominant anchor だが、active pitch classes は B/F#/B で、期待 chord tones E/G/C# から外れる。
* `dense-modal`: b8 downbeat は A aeolian exposition の predominant anchor だが、active pitch classes は A/E/A で、期待 chord tones D/F/B から外れる。

このズレは、冒頭 subject entry が拍節上は強拍に置かれている一方、harmonic anchor は section 内の時間比で tonic、predominant、dominant、cadence を置くだけで、実際の subject/answer pitch と強拍上の vertical sonority を同期していないことから起きている。結果として、譜面上は強拍が和声の柱にならず、弱拍・経過音・装飾音との機能差も弱くなる。曲の構成がわかりにくいという人間レビューは、section-state repetition だけでなく、この拍節和声の欠落とも一致する。

Theory basis: common-practice fugue や種対位法では、すべての強拍が単純三和音である必要はないが、強拍上の不協和や非和声音は準備、掛留、経過、解決などの役割を持つ必要がある。現行生成は pitch line と harmonic plan が分離しすぎており、強拍上の非和声音を rhythmic tension として説明できていない。

Planning constraint: 次の generator/scoring work では、strong beat chord support、weak beat non-chord-tone role、bass/root support、suspension preparation/resolution、cadence beat arrival を feature にする。section anchor を時間比で置くだけでなく、subject entry、answer entry、cadence preparation、phrase boundary の実 note を harmonic rhythm に合わせて候補化する。

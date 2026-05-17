# Phase 11: Quality Model Rebuild Before Operations

Phase 11 は、Phase 8/9 の無限再生・操作機能へ進む前に、生成モデルそのものを破壊的変更も含めて作り直す品質フェーズである。

Status: planned. Phase 8/9 は削除しないが、Phase 11 の完了後まで deferred operational lane に戻す。

## Rationale

Phase 10 は reference corpus manifest、A/B review harness、candidate pool oracle、section-local planner の足場を作ったため完了扱いにする。ただし Phase 10 後の譜面レビューでは、無限再生へ進むには品質不足が明確になった。

確認済みの blocker:

* パートの音域分離が強すぎ、オルガンやピアノの単一鍵盤 texture として不自然に聞こえやすい。
* 主題 family と continuation state cycle が少なく、どの seed でも似た進行が頻出する。
* 複数パートが無音になる箇所が cadence、phrase boundary、entry preparation と結びつかず、終止感がない。
* 強拍と弱拍を意識した和音設計が弱く、強拍上の vertical sonority が harmonic anchor と同期していないため、リズム感と構成感が出ない。

これらは selection weight の小調整では解決しにくい。subject generation、harmonic rhythm、section grammar、register planning、texture thinning、candidate feature extraction を一体で変える必要がある。

### Metric regressions の読み方

Phase 11 では、既存 metric の小悪化を機械的に禁止しない。ただし、agent は「数値が悪い」だけを記録せず、譜面上で何が悪くなるかを seed、section、音楽的 tradeoff と一緒に残す。

現在の採用前 blocker は次のように読む。

* `fugue-smoke` の最頻 4-section pattern count 悪化は、長尺 continuation が別の短い cycle へ固定される問題である。metric 上は section grammar repetition だが、音楽的には episode、subject-return、stretto-like が方向感のある form ではなく機械的な周期として聞こえる。
* `leapRecoveryMisses` の小悪化は、声部が大跳躍後に反行または順次進行で回収されず、歌える旋律線よりも候補音をつないだ列に近づく問題である。section grammar を崩すための state swap が、局所の旋律処理を弱めていないか確認する。
* `counterSubjectIdentityRetention` の小悪化は、対主題が entry を支える再認識可能な素材ではなく、free-counterpoint 的な埋め草へ寄る問題である。反復感を減らす変更でも、主題と対主題の関係が薄れるなら採用しない。
* `unisonOverlap`、`samePitchOverlap`、`sharedRhythmOverlap` の改善は有効な signal だが、それだけでは採用理由にしない。支え声部が octave lockstep や同型リズムの block support へ寄ると、単一鍵盤 texture では独立した対位法ではなく厚い伴奏に聞こえる。
* `harmonicFunctionMismatches` や weak beat non-chord-tone unresolved の改善は、強拍が和声の柱として聞こえ、弱拍の非和声音が経過、刺繍、掛留、予備、解決として説明できる場合にだけ採用価値がある。単独 weight で pitch を和声音へ寄せて、旋律線、entry harmony、modal identity を壊す変更は棄却する。
* `functional-thinning` の改善は、active voice count を増やすことではなく、休符や thinning が cadence、phrase boundary、entry preparation、echo、pedal、suspension、cadential preparation のどれとして機能するかで判断する。

したがって Phase 11 の次の planner は、metric を一つずつ最適化するのではなく、複数 section lookahead、phrase-level cadence plan、subject family rotation を同時に候補化し、譜面上の反復感、旋律線、対主題認識性、拍節和声を一緒に比較する。

### Replanned route after Phase 11-5

Phase 11-5 の register / section grammar candidates は、候補 pool の不足を切り分ける evidence としては有効だったが、採用 baseline ではない。次の作業は、history-aware planner を微調整するのではなく、長距離 form と local note choice を同時に持つ候補を作る順序へ組み替える。

1. Multi-section phrase planner を先に作る。
   * 1 section ずつ `episode`、`subject-return`、`stretto-like` を差し替えるのをやめ、2-4 section の phrase unit を候補化する。
   * phrase unit は cadence strength、density arc、entry plan、local key distance、subject family を持つ。
   * `episode > stretto-like > episode > stretto-like` のような二項反復は、単独 section penalty ではなく phrase unit の invalid or high-risk pattern として扱う。
2. Cadence and thinning plan を phrase unit に結びつける。
   * thinning は active voice count だけで選ばず、cadence extension、entry preparation、echo、pedal、suspension preparation、cadential preparation のどれかとして annotation する。
   * annotation のない long solo / two-voice run は candidate generation 側の不足として残し、selection weight で押し切らない。
3. Subject family rotation を section grammar と同時に選ぶ。
   * 既存の `0-2-1-3-4-3-2-1` 系と `0-1-2-3-4-3-1-2` 系を固定 cycle の材料にしない。
   * subject identity、answer plan、counter-subject identity を守る範囲で、cadence approach、metrical accent、local climax の違う family を phrase unit に割り当てる。
4. Metrical harmony intent を support voice formula へ戻す。
   * strong beat structural intent、weak beat non-chord-tone role、bass/root support を candidate feature に持たせるだけでなく、support line の生成式がそれを満たす候補を作る。
   * strong beat pitch alignment の単独補正は、既に melody、entry harmony、modal identity を壊したため採用経路に戻さない。
5. Register blending は phrase-level candidate の中で再評価する。
   * register-blended alternatives は functional thinning と register separation の上限を動かしたため残す。
   * selected output へ入れるのは、phrase unit が melody、entry harmony、counter-subject identity、modal severe interval を同時に守る場合だけにする。

この再編では、offline learned selection weight は後回しにする。まず `generator-or-section-planner` の比率が高い blocker に対して候補そのものを増やし、selection-only upper bound が meaningful に動くかを確認する。

## Scope

### 先にやる

1. Harmonic rhythm and metrical harmony
   * section anchor を時間比で置くだけでなく、bar、strong beat、entry、cadence preparation、phrase boundary に合わせる。
   * strong beat chord support、weak beat non-chord-tone role、bass/root support、suspension preparation/resolution、cadence beat arrival を diagnostics と candidate scoring に入れる。
   * strong beat 上の非和声音は、passing、neighbor、suspension、anticipation、escape tone などの役割と解決期限を持つ場合だけ許容する。
2. Subject and phrase family rebuild
   * `0-2-1-3-4-3-2-1` 系と `0-1-2-3-4-3-1-2` 系へ偏る現状を崩す。
   * 主題認識性を守ったまま、拍節アクセント、局所 climax、cadence approach、answer transform の別 family を候補化する。
   * 強拍 structural note と弱拍 passing tone の役割を subject generation の段階で決める。
3. Section grammar rebuild
   * `episode > subject-return > episode > stretto-like` 系の cycle を減らし、episode、codetta、stretto preparation、cadence extension、restatement の長距離構文を増やす。
   * state transition は random rotation ではなく、前 section の cadence strength、density、entry plan、local key distance に応じて選ぶ。
4. Register and keyboard texture planning
   * range violation と voice crossing を避けるだけでなく、adjacent voice interval、声部別 pitch span、register blending を評価する。
   * 弦楽/管楽四重奏向けの分離と、ピアノ/オルガン向けの単一鍵盤 texture を style profile で分ける。
5. Texture thinning with function
   * 複数パート休止は cadence、phrase boundary、entry preparation、echo、pedal、suspension、cadential preparation のいずれかとして説明できる場合に優先する。
   * unsupported solo run と abrupt texture drop は、active voice count だけでなく harmonic function と次 entry への準備で評価する。
6. Oracle-driven planning and model triage
   * Phase 10 の candidate pool oracle を Phase 11 の blocker へ拡張し、問題が既存候補の selection で直るのか、candidate generation、section grammar、planner を変えないと直らないのかを section ごとに分類する。
   * `selection-model` に分類された blocker は scoring、tie-break、Pareto guard、説明可能な小型 ranking model の候補にする。
   * `generator-or-section-planner` に分類された blocker は weight tuning で押し切らず、subject family、harmonic rhythm、section grammar、register planning、texture thinning の候補生成を増やす。
   * oracle は hard constraint を上書きしない。range、voice crossing、subject identity、answer plan、未解決の強い不協和、determinism、schema compatibility は ML や learned score より上位に置く。
7. Exploratory learned selection lane
   * learned aesthetic score は Phase 11 の default model にはしない。まず oracle-best、manual pairwise preference、reference-relative diagnostics から説明可能な feature weight を offline で学習できるか検証する。
   * 初期モデルは線形 ranking、単調制約つきの小型モデル、または dimension 別 weight table に限定し、runtime に外部 API、非決定的推論、大型モデルを入れない。
   * 学習結果は採用候補ではなく、どの feature が人間 preference と oracle-best を説明するかを調べる診断 evidence として扱う。

### まだやらない

* Ring buffer replay、rewind、parameter-change meta event。
* Dedicated Web Worker、deadline、best-so-far fallback。
* UI slider を使った musical masking。
* learned aesthetic score の本採用。Phase 11 では Oracle-driven planning を主経路にし、ML は説明可能な selection weight の探索に留める。
* black-box 生成モデルや runtime learned generator。必要な training data、聴取 preference、説明可能 feature、determinism guard が揃うまでは候補にしない。

## Oracle And ML Plan

Phase 11 は ML で生成器を置き換えるフェーズではない。主経路は rule-based generator rebuild とし、oracle は「良い候補を選べば解決する問題」と「候補集合を作り直す必要がある問題」を分けるために使う。

### Oracle coverage

Phase 11 oracle は、既存の `entry-harmony`、`voice-pair-lockstep`、`melody-leap-recovery`、`stepwise-pattern-fixation`、`section-solo-texture` に加えて、次の blocker family を扱う。

* `metrical-harmony`: strong beat chord support、weak beat non-chord-tone role、suspension preparation/resolution、cadence beat arrival。
* `bass-root-support`: bass が harmonic root、inversion、pedal、passing bass のどれとして機能しているか。
* `register-blending`: adjacent voice interval、声部別 pitch span、keyboard texture と quartet texture の style-profile mismatch。
* `functional-thinning`: cadence、phrase boundary、entry preparation、echo、pedal、suspension、cadential preparation に結びつかない active voice drop。
* `section-grammar-repetition`: continuation state cycle、episode sequence、subject family、answer transform の反復。

各 blocker は、selected candidate の risk、best viable candidate の risk、viable improvement count、reference status、代表 section を残す。分類は Phase 10 と同じく `selection-model` と `generator-or-section-planner` の 2 種を維持する。

### ML usefulness test

ML 的アプローチが有効かどうかは、次の順序で検証する。

1. Oracle label set を作る。代表、境界、rotation、adversarial seed から、候補ごとの feature、hard failure、oracle risk、selected/best viable、manual pairwise preference を同じ review bundle に保存する。
2. Selection-only upper bound を測る。各 blocker で oracle-best を選んだ場合に、hard constraints と既存 guardrail を維持したまま Phase 10 blocker がどれだけ下がるかを測る。
3. Generator-needed rate を測る。`generator-or-section-planner` が多い blocker は ML selection の対象から外し、候補生成または planner の open work に戻す。
4. Explainer model を offline で試す。線形 ranking または monotonic weight table が oracle-best と manual preference をどれだけ再現できるかを seed holdout で確認する。
5. 採用候補にする前に A/B review を作る。learned weight は fixed artifact として記録し、runtime randomness、外部 API、opaque model dependency を入れない。

探索を進める条件:

* holdout seed で hard constraints、determinism、schema compatibility、candidate-pool oracle shape を維持する。
* learned model が選ぶ候補の改善理由を dimension feature と blocker family で説明できる。
* manual pairwise preference が oracle-only baseline より悪くならない。

探索を止める条件:

* 改善の大半が `generator-or-section-planner` に分類され、候補 pool 内 ranking では上限が低い。
* learned weight が特定 seed family、subject pattern、section state に過適合する。
* hard failure を避けるための rule-based guard が増えすぎ、learned score が実質的に採用判断へ寄与しない。

## Adoption Criteria

Phase 11 の model update は、以下を満たす場合だけ Phase 8/9 へ戻る前の baseline として採用する。

* representative、boundary、rotation、adversarial seed で hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持する。
* Phase 10 譜面レビューの 4 blocker について、ScoreEvent 由来の evidence と人間レビューで改善を説明できる。
* Oracle が各 blocker を `selection-model` または `generator-or-section-planner` に分類し、採用した変更がどちらに効いたのかを review summary で説明できる。
* learned selection weight を使う場合は、offline artifact、feature version、evaluation model version、holdout seed 結果、manual pairwise gap を記録し、hard constraints を上書きしない。
* 改善が既存 exact metric を悪化させる場合、影響 seed、section、音楽的 tradeoff、残る gap を docs に記録する。
* before/after MIDI または譜面レビューの pairwise note を残し、自動 diagnostics だけで採否を決めない。

## Initial Work

1. 完了: Phase 11 review summary を追加する。ScoreEvent から adjacent voice interval、register span、active voice count away from cadence、state grammar repetition、entry pattern family、strong beat harmonic support を集計する。22 seed の review evidence は [Phase 11 review summary diagnostics](../reviews/phase-11-review-summary.md) に置く。
2. 完了: `harmony-diagnostics` の未実装扱いになっていた strong beat / harmonic function mismatch を実測 diagnostic にする。22 seed の review evidence と scoring weight の tradeoff は [Phase 11 review summary diagnostics](../reviews/phase-11-review-summary.md) に追記した。
3. 完了: Candidate pool oracle に Phase 11 blocker family を追加し、selection-only upper bound と generator-needed rate を review bundle に出す。22 seed の oracle evidence は [Phase 11 review summary diagnostics](../reviews/phase-11-review-summary.md) に追記した。
4. 完了: HarmonicPlan と subject generation の接続を作り、strong beat structural note と weak beat non-chord tone を候補生成時に持たせる。22 seed の intent evidence と、広い pitch alignment 実験を採用しなかった理由は [Phase 11 review summary diagnostics](../reviews/phase-11-review-summary.md) に追記した。
5. 部分完了: register planner と section grammar の候補を増やし、oracle が `generator-or-section-planner` と分類した register / thinning / section grammar blocker に対して候補 pool 自体を改善する。section grammar repetition は generator-needed rate が 1.000 から 0.942 へ下がり、history-aware selected-output planner で selected risk total も 1602 から 1551 へ下がった。ただし `fugue-smoke` の最頻 pattern count 悪化、leap recovery の小悪化、counter-subject retention の小悪化が残るため、まだ採用 baseline ではない。local state score に maximum pattern repeat penalty を足すだけの follow-up 実験は 22 seed evidence を変えなかったため、次は複数 section lookahead、phrase-level cadence plan、または subject family rotation の候補化が必要である。22 seed の evidence は [Phase 11 review summary diagnostics](../reviews/phase-11-review-summary.md) に追記した。
6. 部分完了: local state swap が `episode > stretto-like > episode > stretto-like` の短い cycle を作る場合は high-risk phrase として避ける guard を追加した。`fugue-smoke` の最頻 4-section pattern count は 13 から baseline 同等の 7 へ戻り、`bach-001`、`modal-cadence`、`dense-modal` の section grammar improvement は維持した。ただしこれは multi-section phrase planner の採用 baseline ではなく、2-4 section の phrase unit、cadence plan、density arc、entry plan、local key distance、subject family rotation を同時に候補化する前の回帰防止である。
7. 部分完了: `phase11Review.functionalThinning` に entry preparation、cadential preparation、echo、pedal、suspension preparation、unsupported の役割別 count を追加した。focused seed では non-cadential run の多くが entry/cadential preparation として説明でき、各 seed に unsupported run が 2-3 件残ることを確認した。ただしこれは diagnostics annotation であり、phrase unit や support voice formula が thinning を生成時に計画するところまでは未完了である。
8. 次に検証: 代表 `bach-001` / `fugue-smoke`、境界 `minor-entry`、rotation `modal-cadence`、adversarial `dense-modal` を最小聴取 set とし、full 22 seed では hard constraints、Phase 7B readiness、candidate-pool oracle shape、reference diagnostics summary を確認する。
9. 後回し: offline learned selection weight は、multi-section phrase planner 後も selection-only upper bound が十分残る blocker だけで試す。採用判断ではなく、oracle-best と manual pairwise preference を説明できる feature を見つける診断 lane に留める。

## Relationship To Phase 8/9

Phase 8/9 は、Phase 11 の品質 baseline が採用されるまで開始しない。無限再生、巻き戻し、操作パラメータ、Worker fallback は、現行の音楽的退屈さや構成の弱さを長時間化して固定してしまうため、先に generator quality を上げる。

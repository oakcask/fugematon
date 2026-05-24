# Phase 7+ 再編計画

Phase 7 の reference diagnostics と candidate pool oracle は、既存の absolute metric gate が音楽的改善を止める場合があることを示した。特に solo texture を改善する section-local planner は、局所的には risk を下げても unison、same-pitch、leap recovery、modal identity の既存 gate を壊しやすい。逆に gate を完全に守ると、改善候補は baseline と同じ結果へ戻る。

このため Phase 7 以降は、音楽美を単一の pass/fail gate で完了判定しない。hard constraint、review signal、manual preference を分け、Phase 8 の operational lane は hard safety と再現性が通る状態で開始可能にした。

そのうえで、無限再生 operational lane より音楽美を優先するため、Phase 8/9 はいったん deferred operational lane に送り、先に Phase 10 quality foundation、Phase 11 quality model rebuild、Phase 12 phrase and repetition quality rewrite を実施した。Phase 12 後の human feedback ではリズム感と休符時の終止感が改善した一方で、高声部の同音反復、exact unison、second collision、低声部ペアの長い unison motion が残ることを確認した。Phase 12P で演奏プロファイルを MIDI/WebAudio 共通のレンダリング境界として組み込み、Phase 13 で残る欠陥を単独しきい値ではなく quality vector の統計的 review/adoption model として扱った。Phase 13Q では candidate diversity、voice independence、entry harmony を生成側で改善したが、通常生成経路が採用済み baseline を使っていないことと後半 phrase convergence が残ることが聴取で確認された。Phase 13R では default baseline、phrase convergence、focused manual listening 後に見つかった mechanical subject-fragment convergence と abrupt three-part silence の follow-up repair を完了した。Phase 13R 後の score review では、主題リズムの同型化、entry friction、voice lockstep、counter-subject identity、form metric の説明不足が残るため、Phase 13S を挿入した。Phase 13S は主題リズムと一部 entry friction を改善したが、現行 default の再レビューで entry sonority、voice-pair lockstep、pitch-class unison、fragment function、modal counter-subject identity がまだ Phase 8 前 blocker と確認されたため、Phase 13T を挿入した。Phase 13T 後の score-window review でも repeated entry formula、voice coupling、fragment transformation 不足、modal counter-subject weakness、metric false readiness が残るため、Phase 13U を挿入した。Phase 13U 後の score beauty audit では、truthful metrics がまだ line agency、entry formula novelty、counter-subject survivability、long-run development を美しさとして証明できないため、Phase 13V を挿入した。Phase 13V 後の focused inspection では、post-exposition bass entry 境界で外声 3 声が同時に再発音する generator pattern が全 22 seed に出るため、Phase 13W を Phase 8/9 の前に挿入した。Phase 13W 後の first bass entry review では、exposition の初回 bass answer で外声 3 声が全 22 seed 同時に切れて再発音することが確認されたため、Phase 13X を挿入する。Phase 13X は現行固定順序の確定 blocker を修理し、その後 Phase 13Y で entry-boundary continuity を bass 固有ではなく entry voice、entry order、already-entered voices に基づく一般モデルへ広げる。Phase 13Y 後は、初期主題の多様性改善後も残る long-run phrase convergence を Phase 13Z で扱う。Phase 13Z 後は、指標が譜面上の美しさを証明していない問題を Phase 14 の score-led musical beauty rebuild で扱う。Phase 8 へ戻る際は、細かな生成パラメータ操作を主目的にせず、無限再生セッション、境界設計、内部状態の鑑賞用 visualizer を主目的にする。

Current metric meanings and adoption policy live in [quality metrics reference](../reference/quality-metrics.md). This doc records why the route was reorganized and how each Phase uses those policies.

## Gate 方針

Phase 7B 以降の current policy は [adoption policy](../reference/quality-metrics/adoption-policy.md) に置く。この route で決めた durable point は、旧 Phase 6/7 beauty gate では Phase 8/9 を止めず、unison、same-pitch、entry severe interval、leap recovery、solo texture、contour、modal identity などを quality lane の review signal として扱うことである。Phase 13S、Phase 13T、Phase 13U、Phase 13V、Phase 13W、Phase 13X、Phase 13Y、Phase 13Z、Phase 14 は例外的に、音楽的美しさを operational lane より優先する。既存モデル互換性、旧 guardrail margin、旧 expected values は、譜面レビューで確認した美しさの問題を直す妨げになる場合は採用条件にしない。

廃止した運用は、`Phase 6/7 gate を完全維持しなければ Phase 8 へ進まない` という扱い、manual listening が全 seed `pass` になるまで無限再生 operational lane を始めない扱い、absolute count の小さな悪化だけで diagnostics-backed 改善を戻す扱いである。manual listening と pairwise preference は廃止せず、model adoption evidence として残す。

## 再編後の Phase

### Phase 7A: diagnostics reset

既存の Phase 7 前半、reference diagnostics、candidate pool oracle、completion blocker 記録までを Phase 7A とする。

完了条件:

* Phase 6/7 の既存自動 gate は現状の破綻回避 baseline として通る。
* reference diagnostics comparison が review bundle に出る。
* candidate pool oracle が selection-model と generator-or-section-planner を分類できる。
* rejected section-local experiments と completion blocker が docs に残っている。

Phase 7A は音楽美の完成を意味しない。これは「absolute metric gate だけでは進めない」ことを確認した再設計フェーズとして完了扱いにする。

### Phase 7B: gate policy reset

CI gate を hard constraint と review signal に分ける。

実装順:

1. review gate code に hard/review/manual の分類を持たせる。
2. existing Phase 6/7 metrics のうち、review signal へ降格するものは CI fail ではなく `review-required` または `warning` として出す。
3. tests は hard constraint が失敗すること、review signal が summary に残ること、Phase 8 branch が hard constraints だけで検証できることを確認する。
4. docs に、どの metric が hard failure ではなくなったかを明示する。

完了記録:

* `evaluatePhase7BGatePolicy` は review gate finding を `hard-failure`、`review-required`、`warning`、`manual` に分類する。既存の `evaluatePhase59Diagnostics`、`evaluatePhase510Diagnostics`、`evaluatePhase511Diagnostics`、`evaluatePhase6Diagnostics`、`evaluatePhase7Diagnostics` は互換用の legacy gate として残す。
* review bundle summary は schema version 11 として既存の `phase7Gate` に加えて `phase7BGate` を出す。`phase7BGate` は `hardFailures`、`reviewSignals`、`warnings`、`manual`、`hardConstraintPassed`、`phase8Ready`、legacy Phase 7 gate を含む。
* hard failure として残るものは range violation、voice crossing、subject identity violation、answer plan violation、key metadata mismatch、unresolved dissonance、all-voice silence gap、schema shape に必要な selected candidate / contour comparison count である。
* review signal へ降格したものは counter-subject identity retention、rhythmic independence、unison overlap、same-pitch overlap、same-direction motion、shared rhythm overlap、leap recovery misses、selected candidate melody/texture cost、entry support instability、severe / unresolved severe entry interval、solo texture、bass-upper / outer-voice contour ratio、modal context / characteristic tone / modal cadence evidence である。stepwise pattern fixation、free-counterpoint contour、long-run form repetition、candidate-pool oracle は summary evidence として残し、単独の absolute count では Phase 8 blocker にしない。
* Phase 8 は Phase 7B 時点では hard constraints、generator determinism、review bundle schema compatibility、reference diagnostics summary、candidate-pool oracle shape が通る状態で開始できる。manual listening と pairwise preference は quality lane evidence として残り、全 seed の musical beauty pass は開始条件にしない。
* Phase 10 完了後の譜面レビューにより、Phase 8/9 は再度 deferred operational lane に戻す。Phase 8 が hard constraint 上は開始可能であることは、無限再生へ進む音楽品質が十分であることを意味しない。
* Phase 13V の completion review により、line-agency model、entry-formula novelty budget、counter-subject survivability、long-window development、metric truthfulness upgrade、focused listening gate を満たした。
* Phase 13W の entry-boundary continuity repair は、Phase 13V 後に見つかった post-exposition bass entry の外声同時再発音を扱った。Phase 13X は、Phase 13W の scope 外だった exposition 初回 bass answer の同時再発音を扱う。Phase 13Y は、その後に同じ問題を bass 固有ではなく entry voice、entry order、already-entered voices に基づく一般モデルへ広げる。Phase 13Z は、long-run phrase convergence を subject-return、episode、stretto-like の発展不足として扱う。Phase 14 は、score-window musical acceptance を metric acceptance より優先する統合再設計として扱い、Phase 8/9 前開始条件にする。

観測した tradeoff:

* absolute Phase 6/7 metric gate を hard blocker のまま維持すると、section-local planner や scoring の改善候補が baseline へ戻り、solo texture や reference-relative evidence の改善を採用しにくい。Phase 7B 以降はこれらの metric を review evidence として比較し、hard constraint を壊した変更だけを無限再生 operational lane 開始前の blocker にする。

### Phase 10: quality foundation first

Phase 10 は Phase 7B の hard constraint policy と oracle evidence を前提に、無限再生 operational lane より先に実施した。詳細な完了 evidence は [Phase 10](phase-10.md) に置く。

完了条件:

* A/B review harness が baseline と variant の diagnostics、reference comparison、candidate pool oracle、review signals、manual listening gap を比較できる。
* oracle が `selection-model` と分類する blocker には scoring、tie-break、weight、Pareto guard の候補を試し、採否理由を残す。
* oracle が `generator-or-section-planner` と分類する blocker には、weight tuning ではなく candidate generation または section-local planner の候補を追加する。
* representative、boundary、rotation、adversarial seed の relevant subset で hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持する。
* manual listening と pairwise preference を model update の採否 evidence として残す。未実施の場合は残る gap を明示する。

完了記録:

* `review-ab` は baseline と variant の diagnostics、reference comparison、candidate pool oracle、Phase 7B review signals、manual listening gap を比較できる。
* `phase10-oracle-selection` は selection-model blocker へ scoring / tie-break / guard 候補を提供し、採否理由を opt-in evidence baseline として残した。
* `phase10-section-local-planner` は generator-or-section-planner blocker へ section-local candidate generation を追加し、weight tuning だけで押し切らない方針を実装した。
* representative、boundary、rotation、adversarial seed subset は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持することを tests で固定した。
* manual listening と pairwise preference は未実施の gap を明示したまま、model adoption evidence として残る。

### Phase 11: quality model rebuild before operations

Phase 11 は、Phase 8/9 の無限再生 operational lane へ進む前に、生成モデルそのものを破壊的変更も含めて作り直す品質フェーズである。詳細は [Phase 11](phase-11.md) に置く。

完了条件:

* strong beat chord support、weak beat non-chord-tone role、bass/root support、suspension preparation/resolution、cadence beat arrival を diagnostics と candidate scoring に入れる。
* subject family、answer transform、continuation state grammar、episode sequence pattern の反復を減らす。
* adjacent voice interval、声部別 pitch span、register blending を style profile ごとに評価する。
* 複数パート休止が cadence、phrase boundary、entry preparation、echo、pedal、suspension、cadential preparation のいずれかで説明できる。
* representative、boundary、rotation、adversarial seed の譜面レビューで、Phase 10 score review の blocker が改善したことを記録する。

完了記録:

* Phase 11 は generator-quality baseline として完了した。`phase10-section-local-planner` は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape、Phase 7B readiness を維持し、focused pairwise score review で Phase 10 score review の section grammar repetition と unsupported functional thinning blocker を改善した。
* Phase 11 後の 22 seed review では、`angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal` に similar phrase blocker が残ることを確認した。このため Phase 8/9 へ戻らず、次は [Phase 12](phase-12.md) の phrase and repetition quality rewrite を行う。
* manual listening は未実施のため、継続 quality lane として残す。`minor-entry` の leap recovery、`modal-cadence` の counter-subject identity retention、`bach-001` / `fugue-smoke` の unison/shared rhythm、`dense-modal` の bass/root support は次の listening または support formula refinement で確認する。

### Phase 12: phrase and repetition quality rewrite

Phase 12 は、Phase 11 完了後も残った similar phrase blocker を Phase 8/9 より前に扱う品質フェーズである。詳細は [Phase 12](phase-12.md) に置く。

完了条件:

* subject stem、answer transform、fragment derivation、phrase function の偏りを diagnostics と review bundle に出す。
* `angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal` の most repeated 4-section pattern count と entry pattern family concentration を下げる。
* phrase-level harmonic rhythm と planned support counterpoint により、unsupported thinning を戻さず、unison/shared rhythm、leap recovery、counter-subject identity の tradeoff を seed 別に説明する。
* 22 seed A/B review で、Phase 11 current より phrase similarity が下がったことを ScoreEvent と譜面レビューで記録する。

完了記録:

* Phase 12 は完了した。`phase10-section-local-planner` は guarded phrase-unit repetition baseline として、focused blocker seeds の most repeated 4-section pattern count と unique pattern count を Phase 11 current より改善した。22 seed aggregate でも top entry-pattern family count、total 4-section repetition、unsupported functional thinning が下がった。詳細は [Phase 12 review summary](../reviews/phase-12-review-summary.md) に置く。
* direct phrase-family candidate selection は採用しない。local guardrail だけでは full-score voice independence と leap recovery の tradeoff を予測しきれないため、alternate stems は candidate-pool oracle evidence として残し、selected output は phrase-unit state variation で反復を下げる。
* Phase 12 後の human feedback は、リズム feel と part rest の closure 改善を支持した一方で、高声部の repeated-note pressure、exact unison、second collision、bass-tenor / bass-alto の長い pitch-class unison を次の quality lane として残した。

### Phase 12P: performance profile integration

Phase 12P は、Phase 13 の quality vector review に入る前に、MIDI export と WebAudio preview が同じ `PerformanceProfile` を使うための infrastructure phase である。詳細は [Phase 12P](phase-12-performance-profile.md) に置く。

完了条件:

* `packages/performance` に `PerformanceProfile`、`PerformanceEvent`、profile registry、deterministic な `ScoreEvent` から `PerformanceEvent` への変換を追加する。
* MIDI export と WebAudio playback は同じ profile interpretation を使い、pan、volume、program、velocity curve、articulation、humanize、note length compensation を `ScoreEvent` へ混ぜない。
* CLI、Web UI、review bundle は performance profile id と version を記録し、profile の変更を generation change と分けて扱う。
* Phase 12 selected output、hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape、Phase 7B readiness を維持する。
* `strict-counterpoint` などの検査用 profile は声部独立、同音重複、entry clash を聴き取りやすくするための rendering choice とし、quality diagnostics の閾値や scoring を変えない。

Phase 12P は作曲モデルの変更ではない。`WritingProfile`、candidate scoring、quality vector diagnostics、generator selection は Phase 12P では変えず、Phase 13 の前に聴取・MIDI・WebAudio の再現条件だけを安定させる。

### Phase 13: quality vector statistical review

Phase 13 は、Phase 12P で演奏プロファイル境界を固定した後、Phase 12 後の unresolved musical costs を単独 metric のしきい値ではなく、正規化された quality vector の統計的な外れ方として扱う。詳細は [Phase 13](phase-13.md) に置く。

完了条件:

* Phase 12 selected output を変えずに、duration-based voice-pair unison、soprano repeated-note pressure、entry-local severe interval duration を diagnostics に追加する。
* review bundle に `qualityVector` と `qualityProfileComparison` を出し、seed-level distance、22 seed aggregate、p90、max、outside seed count、top contributing axes を確認できる。
* review bundle に performance profile id と version を残し、MIDI/WebAudio の聴取条件と score diagnostics を分ける。
* hard constraint、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape、Phase 7B readiness を維持する。
* vector 判定は review-required evidence として扱い、range、voice crossing、subject identity、answer plan などの hard failure を上書きしない。
* 長い exact same-pitch unison span、長い pitch-class unison span、高声部の ornament または contour release を伴わない repeated-note run は local sentinel として seed、section、voice pair へ戻せる。

Phase 13 は first pass では generator selection や scoring weight を変更しない。future quality PR は、blocker improvement、acceptable vector movement、unexplained local sentinel regression がないこと、manual listening gap を A/B adoption evidence として残してから採否を判断する。

完了記録:

* Phase 13 は review/adoption model として完了した。`review` は schema version 12 として seed ごとの `qualityVector` と 22 seed aggregate の `qualityProfileComparison` を出す。`review-ab` は schema version 2 として quality vector distance、local sentinel delta、manual listening gap を比較する。
* Phase 13 は selected output、generator scoring、performance profile、hard constraints、reference diagnostics summary、candidate-pool oracle shape、Phase 7B readiness を変えない。
* 22 seed baseline review では pitch-class unison duration、duration-based lockstep、unresolved entry severe interval duration が `quality-review-required` の主因として残った。詳細は [Phase 13 quality vector review](../reviews/phase-13-quality-vector-review.md) に置く。

### Phase 13Q: candidate diversity, voice independence, and entry harmony quality pass

Phase 13Q は、Phase 13 の quality vector review model を使って、Phase 13R と Phase 8/9 の前に候補多様性、voice independence、entry harmony を改善する品質フェーズである。詳細は [Phase 13Q](phase-13q.md) に置く。計画根拠は [Phase 13Q planning review](../reviews/phase-13q-planning-review.md) に置く。

完了条件:

* Phase 12 の phrase/repetition 改善を大きく戻さず、22 seed の hard constraint failure 0 と Phase 7B readiness を維持する。
* subject stem、answer transform、fragment derivation、phrase function、cadence approach、support role の viable candidate diversity を review bundle に出す。
* repeated phrase blocker が selection-model なのか generator-or-section-planner なのかを、candidate diversity と oracle evidence から seed/section ごとに説明する。
* Phase 13 の local sentinel evidence を selected candidate explanations へ戻し、seed、section、voice pair、entry role、duration、resolution deadline を review bundle から追えるようにする。
* pitch-class unison duration と duration-based lockstep を、voice-pair support candidate と section-local planner guard で改善する。
* unresolved entry severe interval duration を、entry harmony、leap recovery、counter-subject identity、contour を同時に見る candidate scoring で改善する。
* soprano repeated-note pressure detector を high register、run duration、ornament release、contour release で較正する。
* `review-ab` で quality vector movement、local sentinel delta、manual listening gap を記録し、focused seeds には `organ-default` と `strict-counterpoint` の聴取メモを残す。

Phase 13Q は UI 変更ではない。Phase 8 の current scope は後に 3 再生モード semantics と segment snapshot contract へ絞られた。操作系、history / rewind、Worker fallback、内部状態 visualizer は後続計画で扱う。

完了記録:

* Phase 13Q は automatic adoption complete とする。oblique voice-pair support candidates と quality-vector-aware selection により、22 seed automatic bundle で pitch-class unison duration、duration-based lockstep、unresolved entry severe interval duration が改善し、hard constraint failure 0 と Phase 7B readiness は維持された。詳細は [Phase 13Q voice-pair support review](../reviews/phase-13q-voice-pair-support-review.md) に置く。
* ただし manual listening は未完了で、通常生成経路の default model と後半 phrase convergence には新しい blocker が見つかったため、Phase 8 へ直接戻らず次は [Phase 13R](phase-13r.md) を実施する。

### Phase 13R: default baseline and phrase convergence repair

Phase 13R は、Phase 13Q 後に見つかった通常生成経路と後半 phrase convergence の blocker を、Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 13R](phase-13r.md) に置く。計画根拠は [Phase 13R convergence review](../reviews/phase-13r-convergence-review.md) に置く。

完了記録:

* Phase 13R は automatic adoption complete とする。core default generation、CLI、MIDI export、review bundle、Web UI playback は `phase10-section-local-planner` を同じ default model として使い、legacy `baseline` は `review-ab` などの明示比較 model として残す。
* 22 seed automatic evidence では hard constraint failure 0 と Phase 7B readiness 22/22 を維持した。focused convergence seeds は most repeated 4-section pattern count と unique 4-section pattern count が legacy `baseline` から改善した。残る subject stem / subject-fragment concentration は function-bearing recurrence として [Phase 13R](phase-13r.md) に seed 別で記録した。
* manual listening、cross-seed subject-diversity follow-up、そこで見つかった音楽的問題の修正は未完了であり、Phase 8/9 前に完了する。Phase 8 はこの automatic baseline だけでは再開しない。

完了条件:

* core default generation、CLI、MIDI export、Web UI playback が同じ採用済み default model を使う。
* legacy `baseline` は明示的な比較 model として残すが、通常生成経路が暗黙に戻らないことを tests で固定する。
* diagnostics と review summary に effective selection model を出す。
* default path の most repeated 4-section pattern count、unique 4-section pattern count、subject stem / subject-fragment concentration、late-score convergence window を review できる。
* guarded phrase-family、fragment-derivation、counter-subject-tail candidates を、identity、entry harmony、leap recovery、voice-pair guardrail を保つ場合だけ selectable にする。
* focused convergence seeds と 22 seed review で、Phase 12/13Q の改善を大きく戻さず、後半 phrase convergence が改善したことを記録する。
* Phase 13R / follow-up で見つかった音楽的問題を、generator、subject builder、phrase-family candidate pool、scoring、guardrail、diagnostics のどこで直すか分類し、修正後の seed evidence を記録する。

### Phase 13S: music-beauty-first rewrite

Phase 13S は、Phase 13R 後の 22 seed 譜面レビューで確認した音楽的美しさの問題を Phase 8/9 より前に扱う品質フェーズである。詳細は [Phase 13S](phase-13s.md) に置く。計画根拠は [Phase 13S music beauty review](../reviews/phase-13s-music-beauty-review.md) に置く。

完了条件:

* 22 seed review bundle で、初期主題の rhythm pattern と local climax index が単一形に張り付かない。
* subject-fragment vocabulary collapse を、生成修正または score-window / listening evidence に基づく function-bearing recurrence として処理する。
* entry-local 2度/7度を、prepared suspension、passing tone、neighbor、accented clash、unresolved friction などの役割へ分類し、未解決 friction を generation 側で減らす。
* duration-based lockstep と pitch-class unison を、声部ペア、register、section role、cadence proximity へ戻して改善する。
* modal / angular seed の counter-subject identity を、旋法的特徴音と再認識性の両方から改善する。
* episode と stretto-like section が state label だけでなく phrase function、cadence preparation、density / tension curve を示す。
* 現行 reference-profile pass のように譜面レビューと矛盾する metric は、採用 evidence ではなく調査 evidence に降格する。

### Phase 13T: voice independence and entry sonority rewrite

Phase 13T は、Phase 13S 後の current beauty audit で確認した残る entry sonority、voice-pair lockstep、pitch-class unison、fragment function、modal counter-subject identity の blocker を、Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 13T](phase-13t.md) に置く。計画根拠は [Phase 13T current beauty audit](../reviews/phase-13t-current-beauty-audit.md) に置く。

完了条件:

* entry window の pitch-class unison stack、隣接 2度/7度、support voice、beat strength、resolution を diagnostics と score-window evidence に出す。
* duration-based lockstep と pitch-class unison を、声部ペア、register、section role、cadence proximity、support function へ戻して生成側で改善する。
* repeated subject fragments が harmonic goal、sequence direction、inversion、cadence role、texture のいずれかを変えることを確認する。
* modal / angular seed の counter-subject identity を score-window examples と focused listening で確認する。
* existing metrics を必要に応じて split、rename、demote、remove、または role-aware local sentinel へ置き換える。
* metrics が representative score windows と focused listening を説明できる場合だけ adoption evidence とする。
* metric reconstruction がある場合は、generated score の改善と diagnostic reclassification を A/B review で分けて記録する。

### Phase 13U: score-window beauty rewrite

Phase 13U は、Phase 13T 後の current beauty replan review で確認した repeated entry formula、voice coupling、fragment transformation 不足、modal counter-subject weakness、metric false readiness を Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 13U](phase-13u.md) に置く。計画根拠は [Phase 13U beauty replan review](../reviews/phase-13u-beauty-replan.md) に置く。

完了条件:

* repeated entry formula を、entry voice、support voices、interval set、beat strength、section role、resolution path で検出する。
* pitch-class stack と 2度/7度/tritone の反復 entry formula を、prepared / passing / cadence / stretto function が説明できない場合は生成側で避ける。
* voice-pair coupling と pitch-class reinforcement の実際の exposed span を localize し、section-level summary だけで採否しない。
* repeated fragment が contour、harmonic target、cadence approach、density、inversion、sequence direction、voice assignment のいずれかで変形していることを score window で示す。
* modal / angular seed の counter-subject rhythm と contour を、support formula に上書きされないようにする。
* metrics が seed、tick、voices、role、score symptom、musical judgement へ戻せる場合だけ adoption evidence とする。

### Phase 13V: line-agency and long-run beauty rewrite

Phase 13V は、Phase 13U 後の score beauty audit で確認した line agency、entry formula recurrence、counter-subject survivability、long-run development、metric false acceptance を Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 13V](phase-13v.md) に置く。計画根拠は [Phase 13V score beauty audit](../reviews/phase-13v-score-beauty-audit.md) に置く。

完了条件:

* active voice pair が independent rhythm、contour、register、contrary / oblique support を score-window evidence として示す。
* repeated pitch-class-stack plus friction formula を novelty budget で制限し、反復する場合は function、spacing、preparation、resolution、voice assignment の違いを示す。
* counter-subject windows で preserved return が増え、accepted tradeoff が default にならない。
* adjacent section と long window の contrast を、fragment family、cadence goal、density、inversion、sequence direction、voice assignment から確認できる。
* metric explanation、generated-score improvement、beauty acceptance を review summary と docs で区別する。
* `organ-default` と `strict-counterpoint` の focused listening note が、代表 seed、境界 seed、modal / stretto / long-run fatigue seed の具体的症状を記録する。

### Phase 13W: entry-boundary continuity repair

Phase 13W は、Phase 13V 後の focused inspection で確認した bass entry 境界の外声 3 声同時再発音を Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 13W](phase-13w.md) に置く。計画根拠は [Phase 13W entry-boundary review](../reviews/phase-13w-entry-boundary-review.md) に置く。

完了条件:

* entry tick で非 entry 声部が同時再発音する pattern を diagnostics と review bundle に出す。
* continuation candidate generation が previous-note boundary context を使い、held support、delayed support、prepared / resolving support を候補化できる。
* bass entry で外声 3 声が未準備で同時 restart する候補を、counter-subject identity と hard constraints を保てる代替がある場合に避ける。
* Phase 13V の line-agency、entry-formula novelty、counter-subject survivability、long-window development evidence を隠さず、悪化する場合は seed、entry、tick、音楽的症状を記録する。
* `organ-default` と `strict-counterpoint` の focused listening note が、bass entry で外声が止まって聞こえないことを確認する。

### Phase 13X: first bass entry continuity repair

Phase 13X は、Phase 13W 後の first bass entry review で確認した exposition bass answer の外声 3 声同時再発音を Phase 13Y の前に扱った品質フェーズである。詳細は [Phase 13X](phase-13x.md) に置く。完了 evidence は [Phase 13X completion review](../reviews/phase-13x-completion-review.md)、計画根拠は [Phase 13X first bass entry review](../reviews/phase-13x-first-bass-entry-review.md) に置く。

完了条件:

* 22 seed review bundle で、初回 bass answer の tick に soprano、alto、tenor が全員同時に切れて再発音しない。
* 代表、境界、rotation、modal、adversarial seed で、少なくとも 1 つの外声が held voice、prepared suspension、resolution、または prepared stagger として bass answer をまたぐ。
* counter-subject identity と bass answer clarity を、continuity repair のために失わない。
* post-exposition bass entry も、古い `synchronized-reset` classifier の不在だけでなく score-window preparation として再レビューする。
* `entryBoundaryContinuity` が first bass entry evidence と post-exposition evidence を分けて出す。
* `organ-default` と `strict-counterpoint` の focused listening note が score-window 症状と残る fatigue を記録する。

### Phase 13X2: bass answer tail texture repair

Phase 13X2 は、Phase 13X 後にユーザー報告を再解釈し、first bass answer 後の free-counterpoint tail thinning と role visibility を Phase 13Y 前に扱った完了済み品質フェーズである。詳細は [Phase 13X2](phase-13x2.md) に置く。計画根拠は [Phase 13X2 bass answer texture review](../reviews/phase-13x2-bass-answer-texture-review.md)、完了 evidence は [Phase 13X2 completion review](../reviews/phase-13x2-completion-review.md) に置く。

### Phase 13Y: generalized entry-continuity repair

Phase 13Y は、Phase 13X2 後に entry-boundary continuity を bass-specific な first-bass / post-exposition-bass windows から、entry voice、entry order、entry form、section state、already-entered voices を持つ一般モデルへ広げた完了済み品質フェーズである。詳細は [Phase 13Y](phase-13y.md) に置く。計画根拠は [Phase 13Y entry-continuity generalization review](../reviews/phase-13y-entry-continuity-generalization.md)、完了 evidence は [Phase 13Y completion review](../reviews/phase-13y-completion-review.md) に置く。

完了条件:

* `entryBoundaryContinuity` が重要な subject / answer entry の generalized windows を出す。
* non-bass entry windows と alternate entry-order stress cases を score-window review に含める。
* first-bass answer repair と post-exposition bass-entry repair を維持する。
* synchronized reset、prepared collective articulation、carried support、suspension / resolution、delayed support、staggered continuation を区別する。
* `organ-default` と `strict-counterpoint` の focused listening note が bass entry と non-bass entry の両方を確認する。

### Phase 13Z: long-run phrase development repair

Phase 13Z は、Phase 13Y 後に初期主題の多様性改善後も残る long-run phrase convergence を Phase 14/8/9 の前に扱う品質フェーズである。詳細は [Phase 13Z](phase-13z.md) に置く。計画根拠は [Phase 13Z long-run phrase review](../reviews/phase-13z-long-run-phrase-review.md) に置く。

完了条件:

* subject-return、episode、stretto-like recurrence を section label ではなく、subject stem、fragment derivation、entry voice、cadence target、density arc、phrase function から review する。
* `seed-0zereox-1v729ih` と focused seed sweep で same-family phrase fatigue が改善したことを score-window evidence で記録する。
* Phase 13X / Phase 13X2 / Phase 13Y の entry-continuity and tail-texture evidence と Phase 13V の line-agency / long-window evidence を隠さない。
* `organ-default` と `strict-counterpoint` の focused listening note が、repaired long-run window と function-bearing recurrence を区別する。

### Phase 14: score-led musical beauty rebuild

Phase 14 は、Phase 13Z 後に指標が譜面上の美しさを証明していない問題を Phase 8/9 の前に扱う品質フェーズである。詳細は [Phase 14](phase-14.md) に置く。最新の計画根拠は [Phase 14 beauty replan review](../reviews/phase-14-beauty-replan-2026-05.md) に置き、初期根拠は [Phase 14 score-led beauty review](../reviews/phase-14-score-led-beauty-review.md) に残す。

Phase 14 は metric tuning ではなく、score-window acceptance を先に置く beauty trunk とする。最新の 24 seed review では reference aggregate が通っても pitch-class unison と duration lockstep は全 seed で review-required になり、22 seed が Phase 7B ready のまま 288 local sentinel を出し、first bass answer は 1 声 carry を得た後も 2 外声が entry tick で切れて再発音し、10 seed で counter-subject preserved window が 0 だった。Phase 14 はこの証拠に基づき、14A0 post-13Z dissonance triage、14A score-window harness、14B entry dissonance and continuity generation、14C line-agency / counter-subject / phrase-development generation、14D metric truthfulness and scope cleanup、14E bundle/listening evidence の順に進める。

完了条件:

* reference aggregate、quality vector、Phase 7B readiness を top-level beauty acceptance として使わず、score-window musical acceptance を先に記録する。
* entry continuity、line agency、counter-subject survivability、phrase development を seed、tick、voice、role、theory basis、musical response へ戻して確認する。
* generated score が改善していない metric reclassification は採用しない。
* 代表、境界、rotation、modal、adversarial、ad hoc listening、user-reported seed の focused set を review する。
* seed や metric の追加、削除、CI 昇格、review-only 降格は [CI and review scope](../reference/quality-metrics/ci-review-scope.md) に従って分類し、uncertain beauty signals は `review-required` に残す。
* `organ-default` と `strict-counterpoint` の focused listening note が repaired score windows を確認する。

### Phase 8: 無限再生セッション MVP

Phase 8 は Phase 14 の score-led musical beauty rebuild、Metrical generation repair、Texture continuity repair、Historical reference calibration 後に戻る deferred operational lane とする。Phase 7B 時点で開始可能な safety baseline と Phase 10/11/12/12P/13/13Q/13R/13S/13T/13U/13V/13W/13X/13Y/13Z/14、およびその後の focused quality lanes の evidence は参照するが、細かな操作 UI が subject sameness、long-run phrase convergence、entry friction、voice lockstep、pitch-class unison、mechanical fragment recurrence、weak fugal development、entry boundary reset、metric false acceptance、Phase 12 後の unison / repeated-note defects、historical-reference observation で確認した persistent coupling を隠す設計にならないようにする。

Phase 8 の current scope は、長時間再生体験全体ではなく、3 つの再生モード semantics と segment snapshot contract に限る。continuous fugue は境界を弱くしながら主題、派生、調性、密度を入れ替えて続ける。endless program は意味的に終止した segment をつなぎ、前 segment の主題 family、調性、終止感、疲労度を次の生成へ渡す。regenerative cycle はその中間として、終止感と継続感の両方を持つ。各モードの segment 境界では、PRNG internal state と bounded past event context を含む snapshot から次 segment の生成を再開できるように、必要な内部状態を定義する。

WebAudio synth / envelope / velocity-to-gain の再設計は Phase 8 MVP の主対象にしない。Phase 8 後の [WebAudio synth interpretation follow-up](webaudio-synth-interpretation.md) で、`PerformanceProfile` の WebAudio 解釈として扱い、生成譜面、diagnostics、quality vector の修正とは分ける。

完了条件:

* continuous fugue、endless program、regenerative cycle の違いを、曲間、segment 終止、主題記憶、調性/密度/疲労度の引き継ぎ、section bridge の観点で説明できる。
* 3 モードそれぞれについて、境界が隠れるべき箇所、終止すべき箇所、前 segment の状態を引き継ぐべき箇所を定義できる。
* 同じ `generatorVersion` で segment snapshot から次 segment の生成を始めた場合に、直前 segment 末尾から継続生成した結果と一致するために必要な内部状態を列挙できる。
* 3 モードの定義が、Phase 13Y、Phase 13Z、Phase 14、Metrical generation repair、Texture continuity repair、Historical reference calibration の review signal を隠す設計になっていない。

### WebAudio synth interpretation follow-up

WebAudio synth interpretation follow-up は Phase 8 後の rendering lane とする。Phase 12P の `PerformanceProfile` 境界を使い、WebAudio の envelope、velocity-to-attack emphasis、velocity-to-sustain gain、bass balance を調整する。これは作曲モデルの変更ではなく、`ScoreEvent.velocity` を長音の sustain gain に直結しすぎる現行 WebAudio 解釈を修正するための後続計画である。詳細は [WebAudio synth interpretation follow-up](webaudio-synth-interpretation.md) に置く。

この follow-up は score-level blocker を隠すために使わない。entry-boundary reset、tail thinning、voice lockstep、unison、weak counter-subject identity は、引き続き score-window review と generator / scoring / diagnostics の問題として扱う。

### Phase 9: Worker 化と安定化

Phase 9 は Phase 8 後に戻る deferred operational lane とする。Dedicated Web Worker、生成期限、best-so-far fallback、長時間 visualizer stability を扱う。ただし quality review signal を worker fallback の採否にも出し、Worker fallback を Phase 13V 以降の音楽美 repair の代替にしない。

完了条件:

* deadline 内に hard constraint を満たす候補または保守的 fallback を返せる。
* timeout や fallback が review signal を消さない。
* 長時間動作で replay、state-change history、boundary history が壊れない。
* 生成、描画、再生が分離されても、内部状態 visualizer が停止、飛び、過密表示を起こさない。

### Phase 10 以降の継続 quality lane

Phase 10 で品質基盤を先行したが、Phase 10 後の譜面レビューにより Phase 11 quality model rebuild を挟んだ。Phase 11 後の 22 seed review でも similar phrase blocker が残ったため、Phase 8/9 の前に Phase 12 phrase/repetition quality rewrite を挟んだ。Phase 12 後は Phase 12P で演奏プロファイル境界を組み込み、human feedback で残った欠陥は Phase 13 quality vector statistical review で review/adoption model 化した。Phase 13Q ではその evidence を使い、candidate diversity、voice independence、entry harmony を無限再生 operational lane 前に改善した。Phase 13R では通常生成経路を採用済み baseline へ揃え、後半 phrase convergence、seed 横断 subject-diversity、mechanical subject-fragment convergence、abrupt three-part silence を修正した。Phase 13S では、指標の pass ではなく譜面上の美しさを基準に、主題リズム、対主題、entry 対位法、声部独立、フーガ形式、指標の説明力を再設計した。Phase 13T では、Phase 13S 後の current beauty audit で残った entry sonority、voice-pair lockstep、pitch-class unison、fragment function、modal counter-subject identity を作曲モデル側で修正した。Phase 13U では、Phase 13T 後の score-window review で残った repeated entry formula、voice coupling、fragment transformation 不足、modal counter-subject weakness、metric false readiness を truthfulness layer として扱った。Phase 13V では、truthful metrics だけでは不足する line agency、entry formula novelty、counter-subject survivability、long-run development を扱った。Phase 13W では、post-exposition bass entry 境界の外声同時再発音を previous-note-aware entry support と focused diagnostics で扱った。Phase 13X では、exposition 初回 bass answer の外声同時再発音を扱った。Phase 13X2 では、first bass answer 後の bass-only tail thinning と role visibility を扱った。Phase 13Y では、entry continuity を bass 固有から entry-order-aware な一般モデルへ広げた。Phase 13Z では、初期主題の多様性改善後も残る long-run phrase convergence を扱う。Phase 14 では、指標が譜面上の美しさを証明していない問題を、score-window musical acceptance を先に置く統合再設計として扱う。Phase 14 後も、以下は継続 lane として残る。

対象:

* MusicXML/Humdrum score ingestion。
* Bach fugue、chorale、modal/early reference の percentile profile。
* section-local planner の新候補生成。
* pairwise listening と manual preference の蓄積。
* learned aesthetic score を使う場合の説明可能な feature/weight。
* Phase 11 で導入する harmonic rhythm、register blending、functional thinning、section grammar の review evidence。
* Phase 12 で導入する phrase-family diversity、motive derivation、function-bearing repetition、corpus-relative repetition profile。
* Phase 12P で導入する performance profile id/version、MIDI/WebAudio 共通の演奏解釈、`strict-counterpoint` 聴取 profile。
* Phase 13 で導入する duration-based voice-pair unison、soprano repeated-note pressure、quality vector distance、local sentinel regression。
* Phase 13Q で導入する candidate-diversity summary、sentinel-to-candidate explanation bridge、entry-harmony selection guard、voice-pair support candidates。
* Phase 13R で導入した effective selection model metadata、default-path convergence diagnostics、guarded selectable phrase-family / fragment-derivation candidates。
* Phase 13R follow-up repair で導入する focused manual listening evidence、bundle-level `subjectFamilyDiversity` review summary、A/B subject-diversity delta、`buildSubject` subject-candidate expansion、検出された音楽的問題の修正後 re-review。
* Phase 13T で導入する entry-window sonority classifier、voice-pair independence repair、fragment-function evidence、modal counter-subject window review。
* Phase 13W で導入する entry-boundary continuity diagnostic、previous-note-aware entry support、bass-entry focused listening evidence。
* Phase 13X で導入する first bass entry diagnostic、exposition support continuity repair、first-bass focused listening evidence。
* Phase 13Y で導入する generalized entry-continuity windows、entry-order-aware diagnostics、non-bass entry review、alternate entry-order stress evidence。
* Phase 13Z で導入する long-run phrase-development diagnostics、subject-return / episode / stretto-like recurrence review、history-aware novelty budgets。
* Phase 14 で導入する score-window musical acceptance、line-agency and counter-subject generator objectives、metric truthfulness reclassification、focused score-led listening evidence。

Phase 11/12 の変更は破壊的な生成モデル変更を許容したが、Phase 12P は selected output を変えず、Phase 13 も first pass では selected output を変えない。Phase 13Q と Phase 13R は selected output を変え得るが、hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape、performance profile metadata は維持する。review signal の悪化は seed、section、metric、音楽的 tradeoff を記録し、quality vector と local sentinel の外れ方を説明したうえで採否を判断する。

## 音楽理論上の扱い

Fux 的な対位法、Bach fugue、common-practice harmony は引き続き判断軸にする。ただし unison、shared rhythm、stepwise motion、entry-local seconds/sevenths は、文脈次第で既存作品にも現れる。したがって、これらをゼロ要求または単純な absolute ceiling にしない。

今後の review では、現象を以下へ分類する。

* hard failure: style に関係なく破綻。
* style-profile preference: strict-classical では避けたいが、hybrid や popular-tolerant では許容できる。
* review-required: diagnostics だけでは採否を決めず、MIDI/Web UI 聴取と pairwise note が必要。
* acceptable tradeoff: 改善対象が明確で、悪化 seed と理由が docs に残っている。

## 次の PR 候補

1. Focused convergence seeds の `organ-default` と `strict-counterpoint` listening note を記録する。
2. `review` / `review-ab` に bundle-level `subjectFamilyDiversity` summary と A/B delta を追加する。
3. `buildSubject` の degree/rhythm/contour/climax/tail 候補を広げ、subject identity、entry harmony、hard constraints、leap recovery を guard する。
4. 22 seed review と focused ad hoc seed sweep で、top-family share、unique family count、quality-vector movement、local sentinel delta を確認する。
5. Follow-up で見つかった音楽的問題を分類し、generator / scoring / guardrail / diagnostics 側で修正してから再レビューする。
6. Phase 8 entry criteria を、Phase 13X first bass entry repair evidence、Phase 13Y generalized entry-continuity evidence、Phase 13Z long-run phrase-development evidence、Phase 14 score-led beauty evidence の完了後にだけ更新する。

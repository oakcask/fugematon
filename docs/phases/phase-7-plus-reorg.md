# Phase 7+ 再編計画

Phase 7 の reference diagnostics と candidate pool oracle は、既存の absolute metric gate が音楽的改善を止める場合があることを示した。特に solo texture を改善する section-local planner は、局所的には risk を下げても unison、same-pitch、leap recovery、modal identity の既存 gate を壊しやすい。逆に gate を完全に守ると、改善候補は baseline と同じ結果へ戻る。

このため Phase 7 以降は、音楽美を単一の pass/fail gate で完了判定しない。hard constraint、review signal、manual preference を分け、Phase 8 の operational lane は hard safety と再現性が通る状態で開始可能にした。

そのうえで、無限再生 operational lane より音楽美を優先するため、Phase 8/9 はいったん deferred operational lane に送り、先に Phase 10 quality foundation、Phase 11 quality model rebuild、Phase 12 phrase and repetition quality rewrite を実施した。Phase 12 後の human feedback ではリズム感と休符時の終止感が改善した一方で、高声部の同音反復、exact unison、second collision、低声部ペアの長い unison motion が残ることを確認した。Phase 12P で演奏プロファイルを MIDI/WebAudio 共通のレンダリング境界として組み込み、Phase 13 で残る欠陥を単独しきい値ではなく quality vector の統計的 review/adoption model として扱った。現在は Phase 8/9 へ戻る前に、Phase 13Q で candidate diversity、voice independence、entry harmony を生成側で改善する。Phase 8 へ戻る際は、細かな生成パラメータ操作を主目的にせず、無限再生セッション、境界設計、内部状態の鑑賞用 visualizer を主目的にする。

Current metric meanings and adoption policy live in [quality metrics reference](../reference/quality-metrics.md). This doc records why the route was reorganized and how each Phase uses those policies.

## Gate 方針

Phase 7B 以降の current policy は [adoption policy](../reference/quality-metrics/adoption-policy.md) に置く。この route で決めた durable point は、Phase 8/9 を始める条件を hard constraints と再現性へ絞り、unison、same-pitch、entry severe interval、leap recovery、solo texture、contour、modal identity などを quality lane の review signal として扱うことである。

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
* Phase 8 は hard constraints、generator determinism、review bundle schema compatibility、reference diagnostics summary、candidate-pool oracle shape が通る状態で開始できる。manual listening と pairwise preference は quality lane evidence として残り、全 seed の musical beauty pass は開始条件にしない。
* Phase 10 完了後の譜面レビューにより、Phase 8/9 は再度 deferred operational lane に戻す。Phase 8 が hard constraint 上は開始可能であることは、無限再生へ進む音楽品質が十分であることを意味しない。

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

Phase 13Q は、Phase 13 の quality vector review model を使って、Phase 8/9 の無限再生 operational lane へ戻る前に候補多様性、voice independence、entry harmony を改善する品質フェーズである。詳細は [Phase 13Q](phase-13q.md) に置く。計画根拠は [Phase 13Q planning review](../reviews/phase-13q-planning-review.md) に置く。

完了条件:

* Phase 12 の phrase/repetition 改善を大きく戻さず、22 seed の hard constraint failure 0 と Phase 7B readiness を維持する。
* subject stem、answer transform、fragment derivation、phrase function、cadence approach、support role の viable candidate diversity を review bundle に出す。
* repeated phrase blocker が selection-model なのか generator-or-section-planner なのかを、candidate diversity と oracle evidence から seed/section ごとに説明する。
* Phase 13 の local sentinel evidence を selected candidate explanations へ戻し、seed、section、voice pair、entry role、duration、resolution deadline を review bundle から追えるようにする。
* pitch-class unison duration と duration-based lockstep を、voice-pair support candidate と section-local planner guard で改善する。
* unresolved entry severe interval duration を、entry harmony、leap recovery、counter-subject identity、contour を同時に見る candidate scoring で改善する。
* soprano repeated-note pressure detector を high register、run duration、ornament release、contour release で較正する。
* `review-ab` で quality vector movement、local sentinel delta、manual listening gap を記録し、focused seeds には `organ-default` と `strict-counterpoint` の聴取メモを残す。

Phase 13Q は UI 変更ではない。ring buffer replay、rewind、state-change / boundary / mode-change meta event、Worker fallback、内部状態 visualizer は Phase 8/9 に残す。

### Phase 8: 無限再生セッション MVP

Phase 8 は Phase 13Q の voice independence / entry harmony 改善後に戻る deferred operational lane とする。Phase 7B 時点で開始可能な safety baseline と Phase 10/11/12/12P/13/13Q compatibility baseline は維持するが、細かな操作 UI が similar phrase blocker や Phase 12 後の unison / repeated-note defects を隠す設計にならないようにする。

Phase 8 の主目的は、パラメータスライダを増やすことではなく、長時間聴ける再生体験を成立させることである。continuous fugue は境界を弱くしながら主題、派生、調性、密度を入れ替えて続ける。endless program は意味的に終止した segment をつなぎ、前 segment の主題 family、調性、終止感、疲労度を次の生成へ渡す。regenerative cycle はその中間として、終止感と継続感の両方を持つ。

ユーザー向け操作は再生モード、seed、performance profile、再生成またはスキップなどの高水準 command に絞る。strictness、density、subjectPresence のような細かな値は、初期は内部状態として保持し、visualizer が見せる対象にする。状態変更が必要な場合は、次の状態遷移または segment 境界から有効にし、履歴に meta event として残す。

完了条件:

* ring buffer replay、rewind、state-change / boundary / mode-change meta event が deterministic に動く。
* continuous fugue、endless program、regenerative cycle の少なくとも MVP 境界 semantics が ScoreEvent または MetaEvent で説明できる。
* 状態変更によって hard constraint failure や schema break が起きない。
* segment 前後の generated score も reference diagnostics、review signal、quality vector comparison、performance profile metadata を出せる。
* UI または CLI review bundle で、segment 前後の diagnostics と manual listening note を比較できる。
* visualizer が主題 family、調性領域、density arc、cadence preparation、novelty budget などの内部状態を鑑賞対象として見せられる。

### Phase 9: Worker 化と安定化

Phase 9 は Phase 8 後に戻る deferred operational lane とする。Dedicated Web Worker、生成期限、best-so-far fallback、長時間 visualizer stability を扱う。ただし quality review signal を worker fallback の採否にも出す。

完了条件:

* deadline 内に hard constraint を満たす候補または保守的 fallback を返せる。
* timeout や fallback が review signal を消さない。
* 長時間動作で replay、state-change history、boundary history が壊れない。
* 生成、描画、再生が分離されても、内部状態 visualizer が停止、飛び、過密表示を起こさない。

### Phase 10 以降の継続 quality lane

Phase 10 で品質基盤を先行したが、Phase 10 後の譜面レビューにより Phase 11 quality model rebuild を挟んだ。Phase 11 後の 22 seed review でも similar phrase blocker が残ったため、Phase 8/9 の前に Phase 12 phrase/repetition quality rewrite を挟んだ。Phase 12 後は Phase 12P で演奏プロファイル境界を組み込み、human feedback で残った欠陥は Phase 13 quality vector statistical review で review/adoption model 化した。Phase 13Q ではその evidence を使い、candidate diversity、voice independence、entry harmony を無限再生 operational lane 前に改善する。Phase 13Q 後に Phase 8/9 へ戻った後も、以下は継続 lane として残る。

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

Phase 11/12 の変更は破壊的な生成モデル変更を許容したが、Phase 12P は selected output を変えず、Phase 13 も first pass では selected output を変えない。Phase 13Q は selected output を変え得るが、hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape、performance profile metadata は維持する。review signal の悪化は seed、section、metric、音楽的 tradeoff を記録し、quality vector と local sentinel の外れ方を説明したうえで採否を判断する。

## 音楽理論上の扱い

Fux 的な対位法、Bach fugue、common-practice harmony は引き続き判断軸にする。ただし unison、shared rhythm、stepwise motion、entry-local seconds/sevenths は、文脈次第で既存作品にも現れる。したがって、これらをゼロ要求または単純な absolute ceiling にしない。

今後の review では、現象を以下へ分類する。

* hard failure: style に関係なく破綻。
* style-profile preference: strict-classical では避けたいが、hybrid や popular-tolerant では許容できる。
* review-required: diagnostics だけでは採否を決めず、MIDI/Web UI 聴取と pairwise note が必要。
* acceptable tradeoff: 改善対象が明確で、悪化 seed と理由が docs に残っている。

## 次の PR 候補

1. Candidate diversity summary として、selected candidate と viable alternatives の phrase family、derivation、cadence approach、support role を review bundle に出す。
2. Phase 13Q の feature bridge として、quality vector local sentinel を selected candidate explanations に戻す。
3. Focused seeds の voice-pair、entry、section、duration、nearest cadence / phrase boundary、available alternate phrase families を review-only summary に出す。
4. Phrase-family / derivation candidates を evidence-only で追加し、22 seed review 後に guarded subset だけ selectable にする。
5. Entry harmony selection adjustment を小さく試し、leap recovery、counter-subject identity、contour を同時に guard する。
6. Long pitch-class unison と lockstep を減らす voice-pair support candidates を section-local planner に追加する。
7. Soprano repeated-note pressure detector を high register、run duration、ornament release、contour release で較正する。
8. 22 seed `review-ab` と focused seed listening note で、Phase 13Q variant の採否を記録する。

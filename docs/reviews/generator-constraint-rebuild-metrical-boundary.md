# Generator Constraint Rebuild Metrical-Boundary Review

## Decision

Continuation section-CSP の拍節境界 planning slice は実装完了とする。各 section start / end を section state、planned entry、cadence preparation、pickup preparation で分類し、未準備遷移だけを generator-response cost とする。Off-measure の prepared pickup、planned-entry pickup、cadence rhetoric は accepted context とし、小節頭へ一律に強制しない。

標準 22 seed、各 129600 ticks の再生成では、未準備遷移は 71 から 20、metrical-boundary cost は 3340 から 480、off-measure boundary は 894 から 138 へ減った。全 seed は relaxation `none` を維持し、density / structural failure と public hard-contract failure は 0 のままだった。`constraintSatisfactionReview` は schema 7 とするが、手動聴取が未実施で voice-pair tradeoff が残るため `review-required` を維持する。

## Implementation Review

Duration candidate construction は section start の measure offset から、既存の 8 / 12 quarter 近傍で次の小節頭へ着地する候補を決定的に作る。たとえば common time で 1 quarter 遅れた episode は 7 / 11 quarter を先に試し、既存の非整列候補も探索集合へ残す。候補は fork 済み PRNG state から比較するため seed determinism を保つ。

Boundary classification は `meter-confirming`、`compound-meter-continuation`、`prepared-pickup`、`planned-entry-pickup`、`cadence-rhetoric`、`unprepared-transition` を区別する。保持声部、suspension、downbeat を越える複数 pickup 声部、cadential support、directed contour を準備 evidence とし、最後の分類だけを cost に入れる。Bass-entry boundary softening は候補評価前へ移し、その直後に density floor と structural support を再確認する。前 section から保持された音も candidate evaluation の境界文脈へ含め、score-level cleanup は通常採用経路へ戻していない。

根拠は bibliography claim `section-constraint-csp-local-first` と source family `music-constraint-programming` である。これは bounded local hard/soft search と review-visible explanation を支持するが、すべての phrase を小節頭へ置く規則や、拍節 metric 単独の美的採否は支持しない。

## Before and After

| Evidence | Before | After |
| --- | ---: | ---: |
| metrical-boundary cost | 3340 | 480 |
| unprepared transitions | 71 | 20 |
| off-measure boundaries | 894 | 138 |
| prepared pickup / entry / cadence boundaries | 823 | 118 |
| meter-confirming boundaries | not classified | 1246 |
| cadence rhetoric / planned-entry pickup | not separated | 60 / 58 |
| relaxation `none` | 22 / 22 | 22 / 22 |
| unsupported density / structural labels | 0 / 0 | 0 / 0 |
| range / crossing / subject / answer / key failures | 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 |
| unison / lockstep pressure | 13593 / 18579 | 11763 / 18740 |
| unresolved accented entry clashes / leap recovery | 120 / 2447 | 31 / 2247 |
| mechanical-reuse windows | 245 | 197 |

Prepared boundary count の減少は正当な pickup の削除だけを意味しない。Duration search が phrase boundary 自体を downbeat へ戻した結果、accepted off-measure classification の母数も減った。残る 20 件はすべて準備 evidence を持たない off-measure transition として説明可能であり、focused seeds では `restless-line` tick 9120、`tight-stretto` ticks 24960 / 30720 / 36480 / 45120 / 68160 / 114240、`close-imitation` ticks 7680 / 13440 / 23520 / 62400 / 85440 / 91200 に残る planned-entry start が代表例である。

## Musical Tradeoffs

Aggregate では unison、entry clash、leap recovery、mechanical reuse が改善した一方、lockstep pressure は 161 増えた。単一の拍節指標だけでは採用せず、次の seed-local evidence を voice-pair candidate scoring と manual listening へ残す。

* `restless-line`: metrical cost 316 -> 24、unprepared 8 -> 1、unison -46、entry clash -7、mechanical reuse -6 に対し、lockstep +24、leap recovery +58。ticks 44160-48000 の `subject-return` は lockstep 38 の代表 window。
* `fugue-smoke`: metrical cost 290 -> 0、unprepared 7 -> 0、unison -120、entry clash -2 に対し、lockstep +39、leap recovery +1、mechanical reuse +1。高コスト seed の拍節境界は解消したが、voice-pair と phrase-development の小幅な tradeoff は manual listening に残す。
* `tight-stretto`: metrical cost 258 -> 144、unison -142、leap recovery -35 に対し、lockstep +60。ticks 13440-19200 の `subject-return` は lockstep 49 の代表 windowで、未準備 entry start も 6 件残る。
* `close-imitation`: metrical cost 254 -> 144、unison -40、mechanical reuse -2 に対し、lockstep +82、entry clash +4。ticks 7680-13440 の `subject-return` は lockstep 47 の代表 window。
* `wide-key`: boundary control は metrical cost 228 -> 0、unprepared 4 -> 0、unison -146、lockstep -2、entry clash -1、mechanical reuse -3。leap recovery は +25 のため旋律線 review は残る。
* `dense-modal`: support-line control は metrical cost 28 -> 0、unison -73、leap recovery -48、lockstep +10。Density / structural failure は 0 を維持した。
* `modal-cadence`: cadence control は metrical cost 6 -> 0、unison -69、leap recovery -32 に対し、lockstep +15、mechanical reuse +5。ticks 9120-13440 の `episode` は lockstep 25 の代表 window。

これらは ScoreEvent と diagnostics に基づく agent-side 楽典レビューである。MIDI bundle は生成済みだが、この環境では人間による聴取判断を実施していない。したがって lockstep 増加、`restless-line` の leap recovery、`close-imitation` の entry clash、`modal-cadence` の reuse は manual-listening gap として残し、`constraintSatisfactionReview` や新 count を CI hard gate へ昇格しない。

## CI / Review Scope

* `constraintSatisfactionReview`: `review-required` を維持。分類の false-positive 分離と hard contract は検証済み。Voice-pair tradeoff の聴取は non-blocking `listening-gap` として未実施。
* `metricalBoundaryClassifications`: `review-required`。新しい count を CI hard gate にせず、duration / candidate explanation と focused window review に使う。
* 標準 22 seed: review bundle scope を維持。seed の追加、削除、CI 昇格は行わない。

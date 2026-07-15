# Generator Constraint Rebuild Voice-Pair Independence Review

## Decision

Continuation section-local search へ voice-pair independence と planned-entry preparation を組み込む実装 slice は導入済みとする。Entry、cadence、sequence、pedal support による機能的同期は accepted context に残し、説明のない free-counterpoint の同型 rhythm、exact collision、color doubling を別の soft cost として比較する。準備のない off-measure planned entry は entry tick を一律に移動せず、support voice と local harmony を補う候補を探索する。

標準 22 seed、各 129600 ticks の再生成では、全 seed が relaxation `none`、public hard-contract failure、unsupported density、unsupported structural label は 0 を維持した。Function-aware mechanical lockstep pressure は 18423 から 364、unison overlap は 11763 から 11365、unresolved accented entry-clash window は 31 から 23、leap-recovery miss は 2247 から 1164、mechanical-reuse window は 197 から 89 へ減った。

この判断は ScoreEvent と diagnostics による agent-side 楽典レビューである。MIDI bundle は生成済みだが、人間の manual listening は未実施である。初回実装後に主要 7 seed すべてで増えた `mechanicalCouplingTicks` は、planned-entry pickup と二声が共有する entry / cadence / sequence function の note-level provenance を最終診断が失っていた false positive を含んでいた。Function-aware follow-up では 22 seed 合計が 620040 から 306960 ticks となり、主要 7 seed はすべて実装前 baseline を下回る。Follow-up の 22 MIDI は初回実装 bundle と byte-identical であり、これは score change ではなく分類修正である。中心目的である「機能的 imitation を保った audible な mechanical lockstep の減少」はなお聴取で確認する必要があるため、ターゲットは未完了とする。`constraintSatisfactionReview`、voice-pair count、美的 count は `review-required` のままとし、新しい CI hard gate にしない。

## Implementation Review

`voicePairFunctions` と section-CSP の voice-pair count は、subject support、cadence support、sequence pattern、pedal-like support を mechanical coupling から分離する。Candidate construction は free-counterpoint の連続音境界を半拍だけ決定的にずらす rotation variant を作り、section span、entry identity、cadence target を保持する。Exact collision と color doubling も別 feature とし、広い pitch-class unison count だけで機能的 reinforcement を拒否しない。

Planned-entry preparation が作る support note は `prepare-subject-return` と `preparesNextEntry` を note-level motivic derivation に保持する。Rhythm pair は、片方が entry role / explicit pickup である場合、両方が `prepare-subject-return` または `extend-cadence` を共有する場合、または両方が同方向の sequence transformation を共有する場合だけ functional に分類する。`subject-return` section 全体や片側だけの function label は免除しないため、outside voice の説明のない lockstep は mechanical のまま残る。

CLI review summary の `unresolvedAccentedEntryClashCount` は `dissonanceTriage` の score-window count を公開する。Section CSP の `infeasibleConstraintCounts` にある同名値は candidate checkpoint count として保持し、before / after の譜面比較には混ぜない。修正後の標準 bundle を再生成した結果、summary の score-window 合計は 23 で、各 seed diagnostics の `dissonanceTriage` との不一致は 0 だった。

Off-measure planned entry preparation は、既に held support または downbeat を越える複数 pickup voice があれば何もしない。未準備の場合だけ low-root-first と balanced-upper-agency の support candidate を作り、entry start、section duration、entry handoff、active `WritingProfile`、local chord support を再評価する。Cadence target 近傍はこの mutation の対象外である。

選択は hard failure、stable candidate id、soft-cost reason、relaxation を trace に残す。Voice independence、entry support、metrical boundary、harmonic support、upper-line agency、leap recovery、phrase mechanical reuse を Pareto 比較し、一つでも baseline より悪化する local variant は採用しない。Voice-pair independence は加重合計だけでなく mechanical coupling duration、exact collision、color doubling を個別の non-regression guardrail とし、一軸の改善で別軸の悪化を相殺できない。個別 guardrail の追加後に標準 bundle を再生成しても全指標は同一であり、現行選択結果を変えずに将来の相殺経路だけを閉じた。再生成した標準 bundle では、通常経路で選ばれた 688 section candidate row がすべて `selected` と選択理由を保持し、score-level repair の selected row は 0 だった。Pre-entry / post-entry normalization の score-level rowsにも異なる stable id を付け、同一 trace 内の候補を識別できるようにした。

Source candidate に対して mechanical coupling の相対改善 margin を要求する追加実験は棄却した。局所 margin を強めても後続 section の探索履歴が変わり、`close-imitation` の score-level mechanical coupling は 62,640 から 64,320 ticks へ悪化した一方、他の protected count は変わらなかった。局所 margin を長期 score の代理にせず、将来この blocker を再開する場合は bounded lookahead または section-history state で比較する必要がある。

`subject-return` 内の pitch-class reinforcement まで section label から切り離して candidate cost に戻す追加実験も棄却した。4 seed の MIDI が変わり、`restless-line` では unresolved accented entry clash が 0 から 6、mechanical reuse が 5 から 7 へ悪化した。Rhythm lockstep は note-level function で分類する現行修正を維持するが、octave / color doubling の section-context 分類を同じ local cost へ直結させるには、後続 section を含む bounded lookahead と entry-clash / phrase-development guard が必要である。

根拠は bibliography claim `section-constraint-csp-local-first`、source family `music-constraint-programming`、`species-dissonance-treatment`、common-practice fugue / episode evidence を再利用する。文献は bounded local hard/soft search、声部独立、跳躍回収、機能を持つ imitation と機械的反復の区別を支持するが、今回の重みや count threshold 自体は project inference である。

## Before and After

| Evidence | Before | Initial slice | Function-aware |
| --- | ---: | ---: | ---: |
| relaxation `none` | 22 / 22 | 22 / 22 | 22 / 22 |
| public hard-contract failures | 0 | 0 | 0 |
| unsupported density / structural labels | 0 / 0 | 0 / 0 | 0 / 0 |
| metrical-boundary cost / unprepared transitions | 480 / 20 | 240 / 10 | 240 / 10 |
| mechanical lockstep pressure | 18423 | 1026 | 364 |
| unison overlap | 11763 | 11365 | 11365 |
| unresolved accented entry-clash windows | 31 | 23 | 23 |
| leap-recovery misses | 2247 | 1164 | 1164 |
| mechanical-reuse windows | 197 | 89 | 89 |
| mechanical coupling ticks | 620280 | 620040 | 306960 |
| exact collision ticks | 125640 | 78240 | 78240 |

初回 slice の lockstep count 減少は機能分類と score change の両方を含み、exact collision、unison overlap、entry clash、leap recovery、mechanical reuse も同時に改善した。Function-aware follow-up は MIDI を変えず mechanical coupling を再分類したため、306960 ticks を追加の audible improvement とは扱わない。代わりに、初回 slice の主要-seed regression と見えていた duration を、共有機能のある同期と残る outside-voice coupling に切り分ける診断精度の改善として扱う。

Aggregate だけでは主要譜例の tradeoff が隠れる。初回 slice では主要 seed の `mechanicalCouplingTicks` がすべて増えたが、function-aware follow-up で共有機能を分離すると全 seed が実装前 baseline を下回る。

| Seed | Before | Initial slice | Function-aware |
| --- | ---: | ---: | ---: |
| `restless-line` | 37,680 | 40,080 | 12,960 |
| `tight-stretto` | 58,680 | 66,600 | 31,320 |
| `close-imitation` | 56,160 | 62,640 | 53,520 |
| `fugue-smoke` | 23,520 | 26,880 | 21,840 |
| `wide-key` | 24,720 | 25,680 | 19,920 |
| `dense-modal` | 17,280 | 18,120 | 0 |
| `modal-cadence` | 20,880 | 22,320 | 0 |

Exact collision は多くの主要 seed で減ったが、`fugue-smoke` は 480 から 1,440 ticks、`modal-cadence` は 5,520 から 6,960 ticks へ増えた。Entry clash、leap recovery、mechanical reuse の aggregate は改善したため、実装全体を棄却する根拠にはしない。ただし voice-pair independence 自体の完了根拠としても不十分である。Function-aware classification は former coupling regression を説明したが、exact collision と残る outside-voice windows の聴取は必要である。

## Focused Score Windows

The original bounded `voicePairSpans` list sorted every classification together by duration. In the initial slice, `restless-line` had 40,080 ticks of reported mechanical coupling but all 18 exposed rows were longer functional support, leaving no mechanical window for the required listening pass. The review list keeps up to two longest rows per classification before filling its remaining capacity by duration. Function-aware provenance subsequently classifies the former ticks 17,280 and 121,920 rows as shared cadence / entry preparation, leaving no duration-qualified unexplained coupling span in `restless-line`. `tight-stretto`, `close-imitation`, and `fugue-smoke` still expose mechanical windows; `wide-key`, `dense-modal`, and `modal-cadence` retain functional and collision controls without inventing a mechanical row. Gate scope does not change.

The refreshed 22-seed bundle keeps relaxation `none` throughout and has 0 public hard-contract, range, crossing, subject-identity, answer-plan, key-metadata, `WritingProfile` pitch, unsupported-density, or unsupported-structural-label failures. All 22 MIDI files are byte-identical to the initial implementation bundle. Unison overlap, exact collision, entry clash, leap recovery, mechanical reuse, and metrical cost are also unchanged by the follow-up, confirming that note provenance and pair classification do not buy a lower coupling count with another musical regression.

Target completion review regenerated the same 22 seeds at 129600 ticks. The MIDI files linked directly from `prompts/TARGET.md` no longer provide the pre-implementation listening side, so the pre-slice source revision was rebuilt and regenerated into `samples/generator-constraint-rebuild-voice-pair-listening/baseline`. The function-aware implementation bundle is preserved separately under the sibling `variant` directory, and the root `pairwise-preferences.json` contains 22 baseline / variant comparisons. All seven primary and control seeds have different baseline and variant MIDI bytes, restoring a reproducible pairwise listening surface without treating byte inequality as musical acceptance.

The refreshed pairwise checklist still records all 22 seeds as `not-reviewed`, and no preference is recorded. Therefore the lower reclassified lockstep count and the broader diagnostics window coverage do not establish an audible reduction in mechanical lockstep; they only make the unresolved listening question inspectable. This keeps the target incomplete and does not justify `prompts/STOP`.

以下の window-level `lockstep` 値は初回 slice の before / after 分類であり、function-aware follow-up は同じ MIDI 内の共有機能をさらに分離する。

* `restless-line`: tick 9120 の unprepared planned entry は解消した。Ticks 44160-48000 の `subject-return` は lockstep 38 -> 5、unison pressure 25 -> 3。Seed 全体は unison 644 -> 618、leap recovery 148 -> 57、mechanical reuse 6 -> 5、metrical cost 24 -> 0。
* `tight-stretto`: ticks 13440-19200 の `subject-return` は lockstep 49 -> 12、unison pressure 28 -> 0、ticks 24960-30720 の `stretto-like` は 43 -> 4。Entry-clash window は 8 -> 0、leap recovery 86 -> 50、mechanical reuse 8 -> 2。5 個の unprepared planned-entry start は残り、聴取対象とする。
* `close-imitation`: ticks 7680-13440 の `subject-return` は lockstep 47 -> 12、unison pressure 24 -> 0、ticks 13440-19200 は 47 -> 11。Entry-clash window は 10 -> 0、leap recovery 117 -> 38、mechanical reuse 7 -> 2。5 個の unprepared planned-entry start は残る。
* `modal-cadence`: metrical cost と unprepared transition は 0、planned-entry pickup は accepted context のまま。Unison 434 -> 430、lockstep 707 -> 33、leap recovery 110 -> 73、mechanical reuse 14 -> 5 で、cadence rhetoric を改善の対価として移動していない。
* `dense-modal`: density / structural failure と metrical cost は 0、planned-entry pickup は accepted context。Unison 332 -> 325、lockstep 697 -> 28、leap recovery 85 -> 49、mechanical reuse 5 -> 2 で support floor を弱めていない。
* `fugue-smoke`: metrical cost 0 を維持し、unison 569 -> 563、lockstep 757 -> 23、leap recovery 81 -> 41、mechanical reuse 6 -> 1。
* `wide-key`: metrical cost 0、entry clash 0 を維持し、unison 511 -> 510、lockstep 751 -> 14、leap recovery 99 -> 53。Mechanical reuse は 8 -> 8 で悪化していない。

この seed set は representative、planned-entry boundary、stretto / imitation、rotation、cadence control、density / support control、zero-metrical-cost control を含む。実装 predicate は seed、tick、拍子、調、pitch、voice 名へ固定せず、entry role、section state、cadence proximity、pair function、metrical offset、local harmony、relative voice availability を使う。

## Manual Listening Checklist

生成済み MIDI で次を pairwise 確認する必要がある。

* `restless-line` の subject-return で各声部の attack が独立して聞こえ、support line の跳躍回収が phrase を分断しないか。
* `tight-stretto` と `close-imitation` で subject / answer の imitation と stretto の切迫感を失わず、outside voice の機械的 lockstep と exact collision が減ったか。
* `modal-cadence` の cadence rhetoric と prepared pickup が弱くならず、`dense-modal` の harmonic support と density が保たれるか。
* `fugue-smoke` と `wide-key` で拍節的に安定した control path に新しい不自然な accent、短い formula、voice handoff が入っていないか。

Listening が完了するまで pairwise preference は未記入とし、implementation evidence と listening acceptance を混同しない。

## CI / Review Scope

* `constraintSatisfactionReview`: `review-required` を維持。Hard contract と false-positive separation は検証済みだが manual listening が未完了。
* mechanical coupling、exact collision、unison overlap、entry clash、leap recovery、mechanical reuse: `review-required`。Aggregate threshold を CI blocker にせず、score-window と pairwise listening で読む。
* 標準 22 seed: review bundle scope を維持。seed の追加、削除、CI 昇格は行わない。
* Manual listening: `manual-listening`。残る unprepared planned-entry start と機能的 imitation の false rejection を優先確認する。

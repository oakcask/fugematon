# Agent Score Review Policy

AI agent は、人間の manual listening を待たずに generation-quality implementation を進めます。実装完了には agent-side score review を使い、譜面から判定できない聴感上の残余は non-blocking listening gap として記録します。

この policy は実装 workflow の verdict を定義します。Seed と metric の CI scope は [CI and review scope](ci-review-scope.md)、metric の採否は [adoption policy](adoption-policy.md) を使います。

## Verdicts

| Verdict | Implementation target | Meaning |
| --- | --- | --- |
| `hard-failure` | block | Public contract、schema、determinism、または明白な生成 invariant の破綻。 |
| `score-blocking` | block | AI が譜面から高確信で確認した、意図された音楽機能を壊す重大な問題。Current metric の有無を問わない。 |
| `score-concern` | proceed | Style、tradeoff、好み、または evidence strength により一意に破綻とはいえない所見。 |
| `listening-gap` | proceed | 音色、attack、再生 envelope、mix、長時間疲労、pairwise preference など、譜面だけでは判定できない残余。 |
| `accepted` | proceed | 現在の target scope に unresolved score blocker がない。 |

`score-blocking` は `ci-blocking` ではありません。Agent は metric がなくても実装を止められますが、CI へ昇格するには再現性、具体的な修正先、false acceptance / rejection の低さ、実行時間を別途確認します。

## Completion Rule

Generation quality、diagnostics threshold、music-quality gate、scoring、section/planner behavior を変える target は、次を満たせば manual listening 未実施でも完了できます。

1. Relevant tests と hard contracts が通る。
2. 変更リスクに応じた representative、boundary、rotation、または adversarial seed の score evidence を確認する。
3. ScoreEvent window を seed、section、tick、voice、role に戻して agent-side music-theory review を行う。
4. Generated score の改善と、metric または classification だけの改善を分ける。
5. Unresolved `score-blocking` finding がない。
6. 残る `score-concern`、tradeoff、missing diagnostic、`listening-gap` を記録する。

完了状態は `implementation complete; agent score review accepted; manual listening not performed` と記録できます。Manual listening の不在だけを理由に target、phase、PR、または agent loop を未完了にしてはいけません。

音色、sampler、playback latency、audio rendering、mix など音響そのものが target の場合は、この例外です。その target が譜面だけでは検証できない理由と、必要な audio evidence を target scope に明記します。この例外を generation-quality target へ拡張してはいけません。

## Score Blocker Requirements

`score-blocking` finding は、原則として次をすべて満たします。

* affected seed と representative location を特定できる。
* section、voice、role、score window を示せる。
* intended function と observed symptom の矛盾を説明できる。
* active style profile の許容範囲を考慮している。
* playback、音色、または未観測の聴感を仮定せず、譜面だけで問題が成立する。
* theory basis、project policy、または生成 artifact からの構造的 inference を区別して示す。
* evidence strength が `high` で、generator、planner、scoring、diagnostics などの想定 repair owner がある。
* 「より好ましい」「もっと美しくできる」だけではなく、現在の target が意図した音楽機能の失敗である。

Subject / answer identity の破壊、unprepared and unresolved sustained severe dissonance、unexplained synchronized reset、unsupported texture collapse、意図されない all-voice silence、section role と realized music の矛盾、明確に成立しない cadence / modulation / meter は、一つの deterministic score window でも blocker にできます。Repair は literal seed、measure、key、pitch、voice 名に固定せず、関連 variant または control で構造的 predicate を確認します。

低確信の美的違和感、style により評価が反転する箇所、説明できない aggregate regression、軽微な novelty / repetition tradeoff、譜面だけでは決められない preference は `score-concern` または `listening-gap` にします。

## Missing Metric Rule

Current metric が問題を検出しないことは、score blocker を棄却する理由になりません。次の順序で処理します。

1. 譜面所見を局在化し、provisional `score-blocking` として記録する。
2. Repeated generator pattern について構造仮説を作る。
3. Generator、planner、または scoring の上流原因を修正する。
4. Reported window、関連 seed、variant または control で再レビューする。
5. 再発性、説明力、修正先が明確な場合だけ focused diagnostic または regression sentinel を追加する。

Instrumentation の追加を修正開始の前提にせず、すべての美的所見を scalar metric に変換しません。Diagnostic を追加しない場合も、missing coverage と score-window closure evidence を review doc に残します。

## Scope And Loop Guardrails

* Blocker は current target の変更面、直接 regression、または変更が隠した重大な既存破綻に限定する。
* Unrelated な既存 concern は follow-up に送り、current target の scope を無制限に拡張しない。
* Blocker closure 後に現れた low-confidence concern で target を再オープンしない。
* `acceptable` と `ideal` を区別し、全 metric の同時改善を完了条件にしない。
* Aggregate が改善しても representative score window が悪化した場合は score evidence を優先する。
* Aggregate が悪化しても具体的症状を示せない場合は、それだけで blocker にしない。
* Human listening を将来実施した場合、その結果は calibration、preference、または新しい score hypothesis の evidence として使い、過去の non-audio implementation completion を遡及的に無効化しない。

## Review Record

各 blocker または concern は、必要な範囲で次を記録します。

```text
Verdict:
Seed and location:
Section, voices, and roles:
Expected function:
Observed score symptom:
Theory or project-policy basis:
Style context:
Existing metric coverage:
Structural hypothesis:
Repair owner:
Evidence strength:
Closure evidence:
Listening gap:
```

Review の最後に implementation status、agent score review verdict、manual listening state を分けて書きます。

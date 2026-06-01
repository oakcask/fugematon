# Claim Map

Fugematon 固有の設計判断、review 判断、quality policy と文献根拠の対応を管理します。外部文献そのものの情報は [references.md](references.md) に置きます。

## Entry Format

```text
## <claim-id>

* Claim: <Fugematon 固有の判断>
* Applies to: <design | generation | scoring | diagnostics | review | phase-scope | license>
* Evidence: <ref id または source-family id>
* Confidence: <high | medium | low>
* Verification state: <source-family | edition-checked | page-checked | score-example-checked>
* Limits: <この claim を適用してはいけない範囲>
* Used by: <関連する docs、tests、code area>
```

## Current Claims

既存 Phase/review docs の literature claims は、次に該当文書や関連実装へ触れる時に必要なものから claim entry へ昇格します。新しい文献根拠で実装方針、quality gate、phase scope、review 採否を変える場合は、その変更と同じ差分で entry を追加します。

## episode-motivic-development-before-phase-8

* Claim: Fugematon should treat short subject-free spans as potentially valid, but Phase 8 should wait until free counterpoint and episode material have review-visible derivation from subject, answer, counter-subject, cadence figure, or prior episode material.
* Applies to: generation | diagnostics | review | phase-scope
* Evidence: `common-practice-fugue-episodes`; existing Phase 5-11 and Texture continuity review evidence.
* Confidence: medium
* Verification state: score-example-checked
* Limits: This claim does not require every episode to be long, every note to literally match the subject, or historical WTC measure counts to become thresholds.
* Used by: `docs/phases/episode-motivic-development.md`, `docs/reviews/episode-motivic-development-replan.md`, `docs/phases/phase-8.md`

## endless-program-coda-continuity

* Claim: `endless-program` coda quality should not be accepted from stable terminal sonority alone; the terminal span should use a historically plausible ending process such as final subject return, stretto, pedal-supported final entry, thematic liquidation, or texture compaction that preserves recent musical material until the cadence.
* Applies to: generation | diagnostics | review | phase-scope
* Evidence: `historical-fugue-endings`; `historical-terminal-cadences`; current `buildTerminalCodaNotes` implementation pattern and user-reported all-voice long-tone symptom.
* Confidence: medium
* Verification state: score-example-checked
* Limits: This claim does not require strict Bach style for every style profile, does not ban prepared pedal points or final held sonorities, and does not make every non-thematic final bar a failure when liquidation or cadence function is review-visible. Chorale-style final cadence evidence is a closure floor, not sufficient proof of fugal coda quality. Archetype diversity is review-required evidence, not a CI hard gate.
* Used by: `docs/phases/endless-program-terminal-coda-historical-style-repair.md`, `docs/phases/endless-program-coda-quality-repair.md`, `docs/reviews/endless-program-coda-quality-gap-review.md`

# Review Docs

現行 gate、diagnostics、品質判断、未解決 tradeoff を支える evidence だけを残します。古い completion review や seed 固有の replan は docs 内にアーカイブせず、履歴が必要な時だけ Git 履歴を確認します。

## Read First

* [Reference evaluation learning loop completion review](reference-evaluation-learning-loop-completion.md): current corpus, shared feature, blind listening, shadow model, active-learning queue, score review, and deferred-adoption evidence.
* [Generator constraint rebuild important-entry-tail review](generator-constraint-rebuild-important-entry-tail.md): current exposition solver-ownership evidence. Finalized held, staggered, linear, and oblique support candidates remove unexplained first-bass-answer tail collapse while preserving hard contracts and keeping small localized voice-pair tradeoffs review-visible.
* [Generator constraint rebuild voice-pair independence review](generator-constraint-rebuild-voice-pair-independence.md): current continuation-CSP independence evidence. Functional imitation stays distinct from mechanical coupling, off-measure planned entries gain local preparation candidates, and melody / phrase tradeoffs remain review-visible.
* [Generator constraint rebuild metrical-boundary review](generator-constraint-rebuild-metrical-boundary.md): current continuation-CSP boundary evidence. Duration candidates restore unprepared transitions toward measure boundaries while planned-entry pickup and cadence rhetoric remain accepted context.
* [Generator constraint rebuild density and structural support review](generator-constraint-rebuild-density-structural.md): current continuation-CSP evidence. Density and structural-label false positives are classified by section function, true failures are repaired before adoption, and score-level cleanup remains non-adopting trace evidence.
* [Generator constraint rebuild continuation CSP review](generator-constraint-rebuild-continuation-csp.md): current architecture evidence. Continuation selection now searches section-CSP support-policy and structural-anchor variants before adoption; remaining density, structural, and metrical relaxation stays review-required.
* [Generator constraint rebuild section CSP review](generator-constraint-rebuild-section-csp.md): current CSP surface baseline. It defines note / hold / internal-rest section slots, public no-rest-event compatibility, and why the surface was not adoption-ready by itself.
* [Generator constraint rebuild exposition search review](generator-constraint-rebuild-exposition-search.md): current initial-generation solver evidence.
* [Generator constraint rebuild entry support review](generator-constraint-rebuild-entry-support.md): current entry-local support evidence.
* [Generator constraint rebuild episode free-counterpoint review](generator-constraint-rebuild-episode-free-counterpoint.md): current episode and free-counterpoint support evidence.
* [Generator constraint rebuild terminal support review](generator-constraint-rebuild-terminal-support.md): current terminal-continuation support evidence.
* [Generator constraint rebuild final repair downgrade review](generator-constraint-rebuild-final-repair-downgrade.md): current final-repair downgrade evidence.
* [Generator constraint rebuild harmonic continuity support review](generator-constraint-rebuild-harmonic-continuity-support.md): current harmonic-continuity support cleanup evidence.
* [Generator constraint rebuild support cleanup trace review](generator-constraint-rebuild-support-cleanup-trace.md): current score-level support cleanup trace evidence.
* [Generator constraint rebuild continuation-local solver review](generator-constraint-rebuild-continuation-local-solver.md): current continuous-fugue boundary candidate evidence.
* [Music-box n20 voice-crossing structural review](music-box-n20-voice-crossing-structural-review.md): current constrained-writing-profile evidence.
* [Sustained vertical dissonance soft repair](sustained-vertical-dissonance-soft-repair.md): current dissonance-triage soft-cost evidence.
* [Endless Program Coda Historical Ending Review](endless-program-coda-historical-ending-review.md): current terminal-coda historical-ending evidence and terminal-stretta planning input.

## Review Rules

* 音楽理論上のレビューを行う場合は、`music-theory-review` skill を使い、Fux 的な対位法を起点にしつつ、クラシック、ジャズ、ポピュラー音楽の文献調査と seed 横断の evidence を合わせて残す。
* music-quality gate、diagnostics threshold、generator model、candidate scoring model、evaluation weights、section/planner model を変える場合、人間の聴取完了を待たずに、関連する複数 seed の生成譜面を楽典的にレビューする。
* 実装完了には [Agent Score Review Policy](../reference/quality-metrics/agent-score-review-policy.md) を使う。未解決の `score-blocking` finding は metric がなくても実装を止め、manual listening 未実施は non-blocking gap として記録する。
* 変更リスクに応じて代表 seed、境界 seed、rotation seed、adversarial seed から小集合を選び、レビューした seed、楽典上の所見、影響 metric、tradeoff、未実施の聴取 gap を該当 Phase または review doc に残す。
* seed や metric を追加、削除、昇格、降格するレビューでは、[CI and review scope](../reference/quality-metrics/ci-review-scope.md) に従って、CI、review bundle、manual listening、削除または archive を分類する。
* 指標の一般的な意味、正規化、採否 policy は [../reference/quality-metrics.md](../reference/quality-metrics.md) に置く。Review docs は seed evidence、音楽的症状、tradeoff、計画変更の根拠を残す場所。

## History

* Short catalog: [catalog.md](catalog.md)
* Deleted reviews are intentionally not mirrored under docs. Use Git history when a task genuinely needs old completion evidence or superseded rationale.

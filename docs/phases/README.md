# Plan Docs

現行計画と open work の入口です。完了済み phase 本文は docs 内に残さず、詳細履歴は Git 履歴で確認します。

## Read First

* [Generator constraint rebuild](generator-constraint-rebuild.md): in-progress architecture rewrite. Continuation generation is moving toward section-slot CSP construction with deterministic backtracking, so unexplained voice silence and unsupported texture collapse are avoided during candidate construction instead of repaired after generation.
* [Endless program terminal stretta planner](endless-program-terminal-stretta-planner.md): planned follow-up for `endless-program` endings. It treats the current coda as cadence-safe but still potentially appended, and makes terminal stretta the preferred fugal ending when constraints allow it.
* [Playback source realism feasibility](playback-source-realism-feasibility.md): current playback-source and notices/licensing basis. Read it before changing SoundFont, sampler, notices, or audio-asset delivery policy.

## Read When

* Changing generator architecture, solver ownership, repair downgrade policy, hard/soft/review gate separation, or legacy expected-value treatment: read [Generator constraint rebuild](generator-constraint-rebuild.md) and the linked current reviews.
* Changing `endless-program` terminal rhetoric, coda planning, terminal stretta, or coda diagnostics: read [Endless program terminal stretta planner](endless-program-terminal-stretta-planner.md) and [Endless Program Coda Historical Ending Review](../reviews/endless-program-coda-historical-ending-review.md).
* Changing playback realism, SpessaSynth, SoundFont assets, samplers, notices, or asset license metadata: read [Playback source realism feasibility](playback-source-realism-feasibility.md).
* Changing implementation order or public contracts: also read [../reference/technical-plan.md](../reference/technical-plan.md).
* Changing metric meaning, diagnostics policy, CI scope, or review promotion/demotion: read [../reference/quality-metrics.md](../reference/quality-metrics.md), not old phase history.

## History

* Short catalog: [catalog.md](catalog.md)
* Deleted phase bodies are intentionally not archived under docs. Use Git history for old completion records, superseded plans, and seed-specific phase rationale.

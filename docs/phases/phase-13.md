# Phase 13: Quality Vector Statistical Review

Phase 13 は、Phase 12 後の human feedback で残った音楽的欠陥を、単独 metric のしきい値調整ではなく、正規化された quality vector の統計的な外れ方として扱う品質フェーズである。Phase 13 の最初の目的は生成結果を変えることではなく、Phase 12 baseline を評価する review/adoption model を作ることである。

Status: complete. Phase 13 follows Phase 12P performance profile integration and precedes Phase 13Q. It keeps hard constraints, determinism, reference diagnostics summary, candidate-pool oracle shape, performance profile metadata, and the Phase 12 selected output stable while adding the review model needed for later music-quality changes.

Current definitions for quality vector axes, local sentinels, and adoption policy live in [quality metrics reference](../reference/quality-metrics.md). This Phase doc records the Phase 13 implementation scope and completion evidence.

## Rationale

Phase 12 の human feedback は、リズム感と休符時の終止感が改善した一方で、高声部の不自然な同音反復、exact unison と second collision、bass-tenor または bass-alto の長い unison motion が残ることを示した。既存 diagnostics は overlap count や entry-local severe interval を数えられるが、長く続く声部ペアの unison span と、短い文脈的な重複を十分に区別できない。

これまでの改善では、単独 metric のしきい値を動かすと別の音楽的欠陥が悪化しやすかった。Phase 13 では、hard failure を従来どおり残しつつ、美しさに関わる review signal を正規化済み feature vector としてまとめ、seed set、style profile、section role、voice pair ごとの統計量が期待範囲に収まるかで採否を判断できるようにする。

## Scope

### 1. Quality vector diagnostics

既存の reference-normalized diagnostics を起点に、Phase 12 feedback で足りなかった局所軸を追加する。最初の PR では selected output を変えない。

* voice pair ごとの exact same-pitch unison duration、pitch-class unison duration、longest contiguous unison span。
* bass-tenor、bass-alto、outer-voice など、聴感上目立つ pair の duration-based lockstep。
* soprano repeated-pitch run count、longest run、ornament または contour release を伴わない repeated-note pressure。
* entry-local severe seconds/sevenths は count だけでなく、duration、resolution deadline、entry role を持つ summary へ拡張する。
* phrase-unit、section role、support role、voice register を quality vector の grouping key として残す。

### 2. Statistical profile comparison

単独 axis の absolute threshold ではなく、quality vector の aggregate と outlier を review signal として出す。

* 22 seed aggregate では average だけでなく、median、p90、max、outside seed count、seed category 別 distance を出す。
* style profile は tonal fugue、modal、chorale-like support、popular-tolerant を混ぜない。modal seed に tonal Bach fugue profile を直接適用しない。
* 初期 distance は robust z-score と weighted distance を使い、reference corpus と human preference data が足りるまで covariance-heavy な model を採用条件にしない。
* Mahalanobis distance や learned aesthetic score は exploratory とし、axis-level explanation を出せる場合だけ adoption evidence に進める。
* vector 判定は review-required を出すためのものとし、hard constraints を上書きしない。

### 3. Local sentinel checks

統計的に平均が良くても、局所的に耳につく欠陥を隠さないため、sentinel check を残す。

* 長い exact same-pitch unison span。
* 長い pitch-class unison span。
* high soprano repeated-note pressure without ornament or contour release。
* unresolved entry-local severe interval cluster。
* section boundary から説明できない abrupt texture or register lockstep。

Sentinel は単独で Phase 8 blocker にはしないが、seed、section、voice pair、音楽的症状を review bundle に戻せない model update は採用しない。

### 4. Review bundle and A/B adoption model

`review` と `review-ab` は、従来の diagnostics、reference comparison、candidate-pool oracle、Phase 7B policy に加えて、quality vector comparison を出す。

* `qualityVector` は normalized axes、grouping keys、local sentinel summaries、model version を持つ。
* `qualityProfileComparison` は seed-level distance、aggregate distribution、outside group count、top contributing axes を持つ。
* review bundle は Phase 12P で導入した performance profile id と version を保持し、MIDI/WebAudio の聴取条件を score diagnostics と分けて再現できるようにする。
* A/B summary は blocker improvement、vector distance、local sentinel regression、manual listening gap を並べて表示する。
* Phase 13 では scoring や generator selection に quality vector を直結しない。まず review/adoption model として安定させる。

## Adoption Criteria

Phase 13 の adoption criteria は満たしている。

* Phase 12 selected output は変えずに、22 seed review bundle が deterministic に quality vector と statistical comparison を出す。
* hard constraint failure 0、Phase 7B readiness、reference diagnostics summary、candidate-pool oracle shape を維持する。
* Phase 12P の performance profile id と version が review artifact に残り、profile 変更を generation change と混同しない。
* Phase 12 feedback の unresolved symptoms が、seed、section、voice pair、representative location のいずれかへ戻せる。
* 22 seed aggregate で、median、p90、max、outside seed count が review summary に出る。
* focused seeds は `bach-001`、`fugue-smoke`、`dense-modal`、`modal-cadence`、`tight-stretto`、`sparse-cadence`、`long-arc` を含める。
* manual listening と pairwise preference は採否 evidence として残すが、Phase 13 の completion blocker にはしない。

## Completion Evidence

`review` summary schema version 12 adds per-seed `qualityVector` and aggregate `qualityProfileComparison`. `review-ab` summary schema version 2 adds quality vector distance and local sentinel deltas beside hard constraints, reference comparison, candidate-pool oracle, Phase 7B policy, and manual listening gap.

The 22 seed Phase 12 baseline review is recorded in [Phase 13 quality vector review](../reviews/phase-13-quality-vector-review.md). The generated review bundle used `organ-default` performance profile version 1. The aggregate status is `quality-review-required`, which is expected: Phase 13 is a review/adoption model, not a generator fix. Pitch-class unison duration, duration-based lockstep, and unresolved entry severe interval duration remain the next quality-lane targets.

## Deferred

* quality vector を candidate scoring weight へ直結すること。
* runtime learned generator。
* black-box aesthetic score の default adoption。
* reference corpus が不足した状態での covariance-heavy distance の hard gate 化。

## Next Work

Phase 13 is complete. Phase 13Q used the quality vector evidence to improve voice independence and entry harmony, Phase 13R aligned the normal default path, and Phase 13S completed the music-beauty-first rewrite. The current next implementation phase is [Phase 13T](phase-13t.md), which reopens voice independence and entry sonority before Phase 8.

# Phase 12P: Performance Profile Integration

Phase 12P は、Phase 13 の quality vector review に入る前に、MIDI export と WebAudio preview が同じ演奏プロファイルを使うための実装境界を組み込む infrastructure phase である。

Status: planned. Phase 12P is inserted after Phase 12 and before Phase 13. It should not change selected `ScoreEvent` output, generator scoring, quality diagnostics thresholds, or `generatorVersion`. It may change MIDI/WebAudio rendering because `PerformanceProfile` becomes the source of performance interpretation.

## Rationale

Phase 13 は Phase 12 baseline の musical defects を `qualityVector` と local sentinel で観測する。先に演奏プロファイル境界を入れておくと、MIDI と WebAudio の聴取差、pan、volume、program、velocity curve、articulation、humanize が `ScoreEvent` や diagnostics の差分に混ざらない。

演奏プロファイルは作曲判断ではなくレンダリング判断である。Phase 12P は、楽譜としての `ScoreEvent` と、どう鳴らすかを表す `PerformanceProfile` / `PerformanceEvent` を分離し、Phase 13 以降の review bundle が使用した profile id と version を記録できる状態にする。

## Scope

### 1. Shared performance package

* `packages/performance` を、DOM、WebAudio、Node.js API、MIDI encoder に依存しない純粋変換層として追加する。
* `PerformanceProfile`、`PerformanceEvent`、profile id、profile version、voice-to-track/channel mapping、velocity curve、articulation、note length compensation、deterministic humanize の型を定義する。
* `organ-default`、`strict-counterpoint`、必要なら `string-quartet` など、最小限の profile registry を置く。
* `ScoreEvent` から `PerformanceEvent` への変換は deterministic にし、同じ score、profile、seed から同じ結果を返す。

### 2. MIDI and WebAudio adoption

* MIDI export は `PerformanceEvent` を基本入力にする。移行中は `ScoreEvent` と profile id を受け取り、内部で同じ変換を呼んでよい。
* WebAudio preview は独自の preview profile を持たず、MIDI export と同じ `PerformanceProfile` を解釈する。
* pan、volume、program、velocity、humanize、articulation、reverb send などの renderer 値を `ScoreEvent` へ戻さない。
* `strict-counterpoint` は検査用として、声部独立、同音重複、entry clash を聴き取りやすい明瞭な発音を優先する。

### 3. API, CLI, and review metadata

* CLI と Web UI は profile id を選べるようにする。未指定時は current audible behavior に近い default profile を使う。
* review bundle、MIDI metadata、A/B summary は、使用した performance profile id と version を記録する。
* profile の変更は rendering change として扱い、`ScoreEvent` と `generatorVersion` の変更とは分けて記録する。
* Phase 13 の quality vector review は、Phase 12P の default または明示された profile を前提に再現できるようにする。

## Adoption Criteria

* Existing generation tests show selected `ScoreEvent` output remains unchanged for the representative Phase 12 baseline.
* MIDI export and WebAudio preview both resolve pan, volume, velocity curve, articulation, and deterministic humanize from `PerformanceProfile`.
* `packages/core` remains independent from DOM, WebAudio, Node.js runtime APIs, MIDI encoder, and renderer-specific profile settings.
* Review artifacts record performance profile id and version without breaking existing review bundle consumers.
* Default profile keeps the existing listening baseline close enough for Phase 13 comparison; audible differences are documented as rendering changes, not generation changes.

## Deferred

* Changing `WritingProfile` or generator scoring based on instrument playability.
* SoundFont or sample-library selection as a product feature.
* Treating performance profile preference as a quality-vector axis.
* UI-heavy preset browsing beyond the minimal profile selector needed for reproducible review.
* Non-deterministic humanize.

## Next Work

1. Add `packages/performance` with profile types, default profiles, and `ScoreEvent` to `PerformanceEvent` conversion.
2. Route MIDI export through the shared performance conversion.
3. Route WebAudio playback through the same profile interpretation.
4. Add profile id and version to review artifacts and A/B summaries.
5. Verify representative Phase 12 scores keep stable `ScoreEvent` output while MIDI/WebAudio rendering uses the selected profile.

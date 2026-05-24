# Metrical Generation Review

This review records the user-reported symptom that `seed-0kowcm6-0am7x3f` exports a 3/4 score but does not sound like triple meter.

## Findings

### 1. Time signature is output metadata, not generator input

Affected seed: `seed-0kowcm6-0am7x3f`.

Evidence: the generated metadata is 3/4 at 87 bpm in F# major. The code chooses `timeSignature` in `generateScore`, but only writes it as a `time-signature` meta event. `buildSubject`, `buildFugueScore`, exposition planning, continuation planning, harmonic anchors, texture generation, and diagnostics do not receive the time signature.

Theory basis: common-practice and phrase-rhythm source family. A notated 3/4 meter needs phrase starts, structural tones, cadences, and local accent patterns to respect the three-quarter measure unless the score intentionally writes a pickup, hemiola, or cross-rhythm. Here the mismatch is unintentional because the generator has no meter context.

Project response: generator change. Add a meter context derived from `TimeSignature` and thread it through subject, section, harmony, texture, scoring, and diagnostics before Phase 8 resumes.

### 2. The affected seed uses duple accent rules inside 3/4 metadata

Affected seeds: `seed-0kowcm6-0am7x3f`, `seed-0zereox-1v729ih`, `tight-stretto`.

Evidence: for `seed-0kowcm6-0am7x3f`, exposition entries start at quarter positions 0, 4, 8, and 12. In 3/4 these land at measure offsets 0, 1, 2, and 0. The first subject marks offsets 0, 2, 4, and 6 as `strong`, which is a two-quarter cycle rather than a three-quarter measure cycle. The same 0, 4, 8, 12 entry layout appears in other sampled 3/4 seeds.

Theory basis: common-practice phrase-rhythm and fugue source family. Fugal entries can overlap across bars, but a default exposition that rotates entry starts through every beat of a 3/4 bar while assigning strong beats by a two-quarter cycle will not establish a stable triple-meter tactus.

Project response: generator and diagnostics change. Exposition entry spacing, subject rhythmic profiles, metrical harmony intent, harmonic anchors, cadence placement, and entry-window diagnostics should use meter-aware beat positions. Deliberate off-bar entries should be represented as explicit pickup or cross-metric rhetoric, not as an accidental result of 4/4 constants.

### 3. The problem is wider than one seed but scoped enough for a focused repair

Affected seeds: current focused set includes `seed-0kowcm6-0am7x3f`, `seed-0zereox-1v729ih`, and `tight-stretto` as 3/4 representatives, with `fugue-smoke`, `bach-001`, and `contrary-motion` as 4/4 controls.

Evidence: the sampled 4/4 seeds also use 0, 4, 8, 12 exposition starts, which fits 4/4 downbeats. The same constants become musically misleading when the selected meter is 3/4. The failure therefore comes from meter-neutral generator constants, not from a broken MIDI exporter.

Theory basis: project policy plus common-practice phrase-rhythm source family. The generated score should not claim a meter that the generated structure ignores.

Project response: insert `Metrical generation repair` before `Infinite playback MVP`. Treat the new 3/4 seed as `review-required` evidence until the repair has score-window review and focused listening notes.

## CI / Review Scope

* `seed-0kowcm6-0am7x3f`: `review-required`; user-reported representative of 3/4 meter mismatch. Action: add to focused metrical review and listening set.
* `seed-0zereox-1v729ih`: `review-required`; existing ad hoc listening seed that also selects 3/4. Action: reuse as a regression/control seed for the repair.
* `tight-stretto`: `review-required`; existing focused quality seed that selects 3/4. Action: keep as a high-risk interaction seed because stretto entry spacing can make cross-metric problems harder to distinguish from deliberate overlap.
* `meterConsistencyReview`: `review-required` at first. Action: add diagnostics that compare time signature metadata with entry starts, strong-beat intent, harmonic anchors, cadence targets, and phrase boundaries before considering CI promotion.

## Remaining Gaps

No broad listening pass has been completed. Exact bibliographic citations were not verified; the theory basis is recorded at source-family level. 6/8 compound-meter behavior was not inspected and must be included in the repair because it shares the same metadata-only failure mode.

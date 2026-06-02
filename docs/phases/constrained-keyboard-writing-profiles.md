# Constrained Keyboard Writing Profiles

Status: planned.

## Purpose

Fugematon should generate fugues that can target instruments with constrained pitch resources, including piano, harpsichord, and programmable music boxes. This is a writing-profile change, not a rendering-profile change: the generator must decide which pitches, registers, densities, and hand/mechanism constraints are valid before MIDI or WebAudio interpretation.

The work should preserve current four-voice fugue generation as the default while adding opt-in `WritingProfile` variants for constrained keyboard and music-box output.

## Source Basis

Use the bibliography ids rather than copying source details into this plan:

* Claim: `keyboard-writing-profile-separates-compass-and-playability`
* Source family: `keyboard-playability-and-compass`
* Relevant refs: `parncutt-keyboard-fingering-1997`, `jacobs-keyboard-fingering-2001`, `guan-playable-piano-fingering-2022`, `britannica-keyboard-compass`, `finale-piano-range`, `murobox-faq-ranges`

The main design consequence is that absolute pitch range is necessary but not sufficient. Piano writing also needs two-hand assignment, hand-span, and motion-cost checks. Music-box writing can start from a stricter pitch-set and mechanism model.

## Profile Model

Add a core `WritingProfile` model selected from `GenerationInput`.

Initial profile ids:

* `four-voice-default`: current behavior, kept compatible unless explicitly revised by later quality work.
* `piano-two-hand`: full piano compass, register targets, two-hand assignment, hand-span checks, and same-hand motion cost.
* `harpsichord-manual`: five-octave-style keyboard compass, lighter hand-span checks than piano, no sustain-pedal assumption.
* `music-box-n20`: official programmable music-box pitch set and mechanism limits.
* `music-box-n40`: wider official programmable music-box pitch set and mechanism limits.

Suggested data shape:

```ts
type WritingProfile = {
  id: WritingProfileId;
  absolutePitchSet: readonly number[];
  voiceRanges: Record<Voice, { min: number; max: number }>;
  registerTargets: Record<Voice, number>;
  preferredMaxByVoice?: Partial<Record<Voice, number>>;
  playability?: PianoTwoHandPlayability | MusicBoxMechanismPlayability | HarpsichordPlayability;
};
```

`ScoreEvent` remains the composition output. Instrument-specific playback values stay in `PerformanceProfile`.

## Implementation Plan

1. Introduce profile selection without changing default output.

   Add `writingProfileId?: WritingProfileId` to `GenerationInput`. Resolve it once near generation entry and pass a `WritingProfile` through generation, diagnostics, review summaries, and segment snapshots where reproducibility requires it.

2. Centralize pitch-range access.

   Replace direct generator use of global `VOICE_RANGES`, `VOICE_REGISTER_TARGETS`, and preferred maxima with profile-aware helpers. Existing constants can remain as the backing data for `four-voice-default`, but generation code should ask the active profile for ranges.

3. Enforce absolute pitch sets during candidate generation.

   Candidate pitch search should only consider pitches present in `absolutePitchSet`. Do not generate arbitrary notes and repair them after selection; post-hoc folding can break subject identity, answer planning, and harmonic intent.

4. Implement music-box profiles first.

   Music-box output has the narrowest first useful slice: allowed pitch set, unavailable chromatic notes, maximum simultaneous notes, and repeated-note speed. Add diagnostics for unavailable pitches, simultaneity overflow, and repeated-note-rate violations.

5. Implement piano two-hand playability as review-visible constraints.

   For each active verticality, assign notes to left or right hand. Start with deterministic heuristic assignment based on pitch, voice, continuity, and recent hand position. Check same-hand simultaneity span and same-hand motion cost. Treat hard impossibility as a diagnostic failure and high motion cost as review-required until the model is calibrated.

6. Add harpsichord profile after the shared profile boundary is stable.

   Harpsichord support should use keyboard compass and manual playability, but avoid making piano-specific sustain or dynamic assumptions. Keep texture and registration distinct from playback timbre.

7. Make diagnostics profile-aware.

   Add or extend summaries for:

   * `writingProfilePitchViolations`
   * `unavailablePitchClassCount`
   * `handSpanViolations`
   * `handAssignmentAmbiguityCount`
   * `sameHandLeapCost`
   * `musicBoxRepeatRateViolations`
   * `musicBoxSimultaneityViolations`

   Keep existing `rangeViolations` and `voiceCrossings` visible for compatibility, but define whether they refer to the active writing profile or the legacy vocal-style range.

8. Preserve infinite-playback determinism.

   Segment snapshots must include the selected `writingProfileId` and enough profile-version information to reproduce future segments. A later segment must not silently continue under a different writing profile.

9. Add CLI and Web UI selection.

   CLI should accept a writing-profile option. Web UI can expose a compact selector separate from performance profile: writing profile changes the score; performance profile changes playback interpretation.

## Piano Playability Model

The first implementation does not need full fingering search. It should establish a defensible floor:

* Notes assigned to one hand at the same tick must fit within a configurable maximum span.
* Adjacent notes in one hand should avoid large unprepared jumps unless a hand reposition is plausible.
* Middle-register notes may switch hands, but the assignment should preserve continuity and avoid hand crossing.
* Simultaneous four-voice texture may be simplified or re-registered when no playable hand assignment exists.
* Subject identity and answer plan remain hard constraints; hand comfort cannot justify destroying the fugal material.

Future work may add a true fingering estimator, but the first phase should keep the model explainable and deterministic.

## Music-Box Model

Music-box profiles should treat the instrument as a constrained pitch/mechanism target:

* Use only supported pitches.
* Respect maximum simultaneous notes.
* Respect repeated-note speed limits.
* Prefer textures that imply counterpoint through register, rhythm, and subject recurrence even when four fully independent voices cannot fit.
* Allow profile-specific reduction from four sounding voices when the mechanism cannot support the original texture.

The first accepted music-box mode can be stricter than piano mode because the intended target is a fixed mechanical range.

## Tests And Review

Required tests:

* Default `four-voice-default` representative seeds remain deterministic.
* `music-box-n20` and `music-box-n40` generate no unsupported pitches.
* Music-box diagnostics catch synthetic unsupported pitch, simultaneity, and repeated-note-rate violations.
* Piano diagnostics catch synthetic one-hand span violations.
* Piano generated representative seeds have a valid hand assignment or a review-required diagnostic with a score-window location.
* Segment continuation preserves `writingProfileId`.

Manual review:

* Listen to at least one representative piano profile MIDI with a piano-like performance profile and verify that dense passages do not obviously require impossible hand positions.
* Listen to at least one music-box profile MIDI or browser playback and verify that subject recurrence survives the pitch-set reduction.

## Acceptance Criteria

This phase is complete when:

* `GenerationInput` can select a writing profile without changing the default profile output.
* Pitch range and register placement are profile-aware in generation and diagnostics.
* Music-box profiles enforce supported pitch sets and mechanism-limit diagnostics.
* Piano profile produces review-visible hand assignment and span evidence.
* CLI or Web UI can select the writing profile separately from performance profile.
* Bibliography claim `keyboard-writing-profile-separates-compass-and-playability` remains linked from this plan.

## Non-Goals

* Do not implement a full human fingering optimizer in the first pass.
* Do not merge `WritingProfile` and `PerformanceProfile`.
* Do not make piano comfort override hard fugal constraints such as subject identity, answer plan, determinism, range, and voice crossing.
* Do not hard-code behavior for one seed, key, pitch, hand, or measure.
* Do not treat music-box profile work as a general proof that all four voices are always mechanically realizable.

# Episode Motivic Development Replan

This review records the planning change from "free-counterpoint length" to "free counterpoint as motivic development." It is based on the user's report that current Fugematon fugues have subject-free spans of at most about 1-2 measures and, more importantly, that the free counterpoint does not sound like a fragment or embellishment of the subject or counter-subject.

## Findings

### 1. Episode length is not the primary blocker

Affected area: episode, continuation, subject-free free counterpoint.

Theory basis: Bach WTC examples range widely. Some fugues keep the subject nearly continuous, some use short codettas or 1-2 bar episodes, and some contain medium or long episode-heavy stretches. Short subject-free spans are therefore historically plausible.

Project response: do not make "longer episode" the main target. Keep short episodes available when they have clear function.

### 2. Generic free counterpoint is the blocker

Affected evidence: the Phase 5-11 review already records that continuation episodes rely on subject-fragment placement plus support or free-counterpoint texture, which can sound like short entry units switching rather than development. Texture continuity repair removed exposed solo collapse, but it did not prove that free-counterpoint material is derived from earlier motives.

Theory basis: common-practice fugue episodes normally develop already heard material through fragmentation, sequence, inversion, imitation, rhythmic paraphrase, or tonal preparation. They may be subject-free, but they are not usually motivically arbitrary.

Project response: insert Episode Motivic Development before Infinite playback MVP. Treat generic or unclassified free-counterpoint duration as review-required evidence.

### 3. Diagnostics need derivation, not only coverage

Affected diagnostics: free-counterpoint coverage, episode direction, phrase development, texture continuity, piano-roll role visibility.

Current diagnostics can show that material exists, that texture does not collapse, and that some phrase-development signals pass. They do not yet prove that subject-free material derives from subject, answer, counter-subject, cadence figure, or prior episode material.

Project response: add derivation metadata and review summaries before making Phase 8 segment boundaries. Review should be able to ask: "what motive is this free counterpoint developing, how, and toward what next entry or cadence?"

## Historical Calibration

Use the historical examples as broad calibration, not as fixed thresholds:

* Nearly continuous subject treatment: Bach WTC I C major fugue has very little subject-free material in common analysis.
* Short episodes: Bach WTC I C minor fugue includes short early subject-free passages, while still using motivic fragmentation.
* Medium episodes: WTC analyses include several 4-8 bar episodes.
* Long episode-heavy case: Prout identifies WTC II F major as unusually high in episode proportion, including a long middle-section episode.

This means Fugematon should support both compact and expanded episodes. The acceptance criterion is motivic and tonal function, not a fixed measure count.

## Structural Hypothesis

Symptom: subject-free spans sound like filler even when texture continuity is acceptable.

Repeated pattern: episode or continuation generation can choose support/free-counterpoint formulas that maintain activity but do not expose a source motive, transformation, or target function.

Theory basis: fugue episodes are commonly subject-free but motive-bearing; they use fragments, sequences, imitation, inversion, and modulation to connect entries.

Evidence strength: plausible. Existing reviews support the generic-filler diagnosis, but a fresh focused bundle is still needed after implementation to verify across seeds.

Project response: generator and diagnostics change. Add an episode motive plan, motivic free-counterpoint candidate generation, derivation metadata, and review summaries.

## CI / Review Scope

* `episodeDerivationCoverage`: `review-required` initially. Use to inspect whether subject-free material has source motive and transformation metadata.
* `genericFreeCounterpointDuration`: `ci-observed` after stable implementation, not CI-blocking until thresholds are validated.
* `repeatedEpisodeFormula`: `review-required`; classify musical fatigue and stock formula recurrence without making every repetition illegal.
* `historicalEpisodeLengthComparison`: `review-required`; use to prevent narrow assumptions about episode length, not to force generated measures to match Bach.
* Focused listening: `manual-listening`; confirm that derivation metadata corresponds to audible development.

## References

* `prout-wtc-48-fugues`
* `pugetsound-fugue-analysis-bwv847`
* `teoria-bwv846-analysis`

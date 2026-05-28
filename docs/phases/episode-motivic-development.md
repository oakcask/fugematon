# Episode Motivic Development

Episode motivic development is inserted after Historical reference calibration and before Infinite playback MVP. Its purpose is to make free-counterpoint and episode material audibly derive from the subject, answer, or counter-subject instead of functioning as generic filler.

Status: planned. This plan reorganizes the next quality lane from "make free counterpoint longer" to "make free counterpoint explainable as motivic development." Historical examples show that short subject-free spans can be stylistically normal, but they usually develop already heard material through fragmentation, sequencing, inversion, imitation, or modulatory preparation.

Planning review:

* [Episode motivic development replan](../reviews/episode-motivic-development-replan.md): user-reported concern, historical-fugue comparison, existing Fugematon evidence, structural hypothesis, and CI / review scope.

## Rationale

Current generated fugues can avoid exposed solo collapse and persistent voice-pair coupling while still sounding underdeveloped because free-counterpoint material is not strongly accountable to earlier thematic material. The blocker is therefore not primarily episode length. The blocker is that subject-free spans do not reliably answer the question: which earlier motive is being fragmented, sequenced, inverted, rhythmically paraphrased, or used to prepare the next entry?

Theory basis: common-practice fugue examples include short codettas and episodes, nearly continuous subject treatment, and long episode-heavy designs. Across that range, subject-free passages normally remain tied to subject or counter-subject material and directed tonal motion.

## Scope

* Add an episode motive plan that chooses source material from subject head, subject tail, answer form, counter-subject head or tail, cadence figure, or prior episode figure.
* Generate free-counterpoint material from explicit transformations: fragmentation, sequence, inversion, contour paraphrase, rhythmic paraphrase, imitation, diminution-like shortening, augmentation-like lengthening, and cadential continuation.
* Give each episode a target function: connect exposition entries, prepare a subject return, modulate to a local key, relax after stretto-like density, extend a cadence, or maintain a deliberate pedal / suspension texture.
* Record derivation metadata on generated notes or phrase units so diagnostics and piano-roll review can distinguish generic support from motivic free counterpoint.
* Add diagnostics for episode derivation coverage, repeated stock formula, source-motive concentration, transformation variety, sequence direction, and next-entry preparation.
* Vary episode length only after derivation is explainable. Short 1-2 bar episodes remain valid when they have clear motivic and tonal function; longer 4-8 bar episodes should be allowed when they develop material rather than repeat filler.

## Out Of Scope

* Requiring every free-counterpoint note to match the subject literally.
* Treating long episodes as automatically better than short episodes.
* Replacing counterpoint constraints, entry support, or texture continuity with thematic labeling alone.
* Making historical WTC examples a fixed metric target before subject-entry and episode annotations are available.
* Hiding weak motivic derivation with playback smoothing, segment boundaries, instrumentation, or UI presentation.

## Workstreams

### EMD-A: Episode motive plan

Introduce a small planner object for each episode or continuation span. It names the source motive, target function, local key target, cadence target when relevant, expected density, and allowed transformations.

The plan should be generated before note candidates. Candidate scoring can then prefer material that fulfills the planned transformation instead of rewarding unrelated contour novelty.

### EMD-B: Motivic free-counterpoint generation

Replace generic continuity filler in subject-free spans with candidates derived from the motive plan. At minimum, support subject-head sequence, counter-subject-tail imitation, inverted subject fragment, rhythmic paraphrase, and cadential free continuation.

The repair should preserve the Texture continuity repair baseline: no unsupported exposed free-counterpoint solo, no one-outside bass-answer tail collapse, and no return to long mechanical lockstep.

### EMD-C: Derivation metadata and diagnostics

Expose derivation fields for phrase units or notes: source motive, transformation kind, target function, sequence interval or direction when present, and whether the material prepares the next entry or cadence.

Diagnostics should summarize:

* subject-free duration by derivation kind;
* generic or unclassified free-counterpoint duration;
* repeated stock formula across seeds and sections;
* transformation variety per episode;
* next-entry preparation evidence.

These diagnostics are review evidence first. They should not become CI-blocking until the review proves that they are stable, cheap, and musically discriminating.

### EMD-D: Historical example calibration

Use a small historical-example table to keep the target broad: nearly continuous subject treatment, short 1-2 bar episodes, medium 4-8 bar episodes, and unusual long episode-heavy cases.

The calibration should prevent two mistakes: rejecting short episodes merely because they are short, and accepting longer free-counterpoint spans merely because they have more measures.

### EMD-E: Review and handoff

Generate a focused before/after review bundle after EMD-B and EMD-C. Include representative seeds, known free-counterpoint / episode boundary seeds, modal seeds, and at least one long-run seed.

Record concrete score-window examples where free counterpoint is accepted because it derives from a motive, and examples that remain review-required because derivation is generic, repetitive, or tonally aimless.

## Completion Conditions

* Episode and free-counterpoint generation can identify source material and transformation kind for subject-free spans.
* Short episodes remain acceptable when they show motivic derivation and a local function.
* At least some medium episodes can develop subject or counter-subject material without reverting to generic filler, unsupported solo texture, or mechanical voice coupling.
* Review summaries expose generic / unclassified free-counterpoint duration and repeated stock formula across the focused seed set.
* Focused review seeds show improved episode derivation coverage without new hard failures, subject identity regressions, or Texture continuity repair regressions.
* Remaining weak episodes are classified as generator, scoring, diagnostic, or manual-listening follow-up rather than hidden by Phase 8 segment semantics.

## Phase 8 Handoff

Infinite playback MVP may resume only after subject-free material has a review-visible derivation model. Segment boundaries and regeneration modes must not hide generic free-counterpoint filler, stock episode formulas, or subject-free spans that do not prepare a later entry, cadence, or deliberate texture function.

# Initial Subject Rhetoric Diversity Repair

Status: planned quality follow-up.

This plan follows the subject-diversity work recorded in [Phase 13R](phase-13r.md) and the later score-led quality lane. It treats the current symptom as a generator-pattern issue, not only as a `subjectFamilyDiversity` threshold issue.

## Problem

Generated fugue subjects can still sound too similar across unrelated seeds even when the current bundle-level `subjectFamilyDiversity` summary reports no finding.

The current subject builder chooses one fixed degree/rhythm profile from a small weighted list. That repaired the old three-family collapse, but it still leaves the generator with a narrow rhetorical vocabulary:

* most 4/4 subjects use one of a small set of eight-note tonic-opening shapes;
* modal subjects have fewer adopted-planner alternatives than major/minor subjects;
* 3/4 and 6/8 subjects use even smaller meter-specific profile lists;
* the existing diagnostics catch top-family collapse, rhythm collapse, and climax-index collapse, but they do not detect top-N concentration or shared subject rhetoric such as tonic opening, all-quarter motion, fifth-area climax, and mostly descending tail.

Recent investigation found that the 22 seed review bundle has 7 initial subject families and no `subjectFamilyDiversity` findings, but the top 3 initial subject families still cover 14 of 22 seeds. A 200 seed ad hoc subject sweep produced 12 families, with the top 3 covering 64% of seeds. This supports the structural hypothesis that the issue is a small fixed profile vocabulary rather than one defective seed.

Theory basis: a fugue subject should stay recognizable and answer-compatible, but unrelated generated pieces should not repeatedly begin with the same few opening gestures, climax placements, rhythmic profiles, and tail motions. Motivic economy is useful within a score; cross-seed subject rhetoric collapse becomes long-session fatigue.

## Goal

Replace the current initial-subject choice model with a constrained subject-rhetoric generator.

The repaired model should assemble a subject from independently varied musical decisions:

* opening gesture;
* local climax placement and approach;
* tail motion and cadence implication;
* rhythm cell and accent support;
* meter-specific stress pattern;
* modal color or tonal answer pressure;
* answer compatibility and subject identity constraints.

The goal is not random contour churn. New subjects must remain singable, answer-compatible, and usable for later subject returns, fragments, counter-subject planning, and stretto-like treatment.

## Scope

* Keep the legacy `baseline` comparison path stable unless a later compatibility plan explicitly removes it.
* Add the repair on the adopted planner path used by normal generation.
* Preserve hard constraints: range, voice crossing, subject identity, answer plan, key metadata, unresolved dissonance, and all-voice silence.
* Preserve current entry-harmony, line-agency, texture-continuity, and phrase-development evidence unless a review records the musical tradeoff.
* Keep 3/4 and 6/8 subject generation meter-aware rather than falling back to 4/4 profiles.
* Keep modal subjects modal: variation should expose characteristic color when possible without forcing tonal-only rhetoric.

## Out Of Scope

* Fully learned subject generation.
* Copying or encoding historical repertoire subjects as templates.
* Making every subject maximally different from every other subject.
* Weakening subject identity or answer compatibility to increase diversity metrics.
* Treating a review-only diversity signal as CI-blocking before false-positive review.

## Workstreams

### ISRD-A: Subject rhetoric model

Introduce an internal subject-rhetoric plan before note construction. The plan should describe:

* opening gesture family;
* climax degree and index;
* approach contour;
* tail motion;
* rhythm profile family;
* meter stress support;
* mode / answer compatibility notes;
* rejection reason when a candidate fails.

This model can still emit `SubjectNote[]`, but the chosen subject should be the result of constrained assembly and scoring, not a direct fixed-array lookup.

### ISRD-B: Candidate generation and scoring

Generate multiple subject-rhetoric candidates per seed and score them for:

* tonic or modal anchoring without always using the same opening cell;
* singable interval contour and leap recovery;
* strong-beat structural support;
* answer compatibility for true or tonal answer;
* usable subject stem for fragments and stretto-like entries;
* local contrast against recent or seed-bundle high-share rhetoric families.

Reject candidates that create poor answer plans, weak meter identity, unstable entry harmony, or unusable fragments.

### ISRD-C: Diagnostics

Extend review diagnostics so the symptom is visible even when no single family exceeds the old threshold:

* top-3 and top-5 initial subject family share;
* top-3 and top-5 subject-rhetoric share;
* opening gesture concentration;
* all-quarter or near-all-quarter rhythm concentration;
* fifth-area climax concentration;
* tail-motion concentration;
* meter-specific family counts for 3/4 and 6/8;
* ad hoc seed sweep summary for random seeds outside the fixed 22 seed set.

Keep `subjectFamilyDiversity` as the bundle-level surface, or add a sibling summary if the rhetoric metrics would make that surface too broad.

### ISRD-D: Regression and review evidence

Use the existing 22 seed review bundle plus an ad hoc random seed sweep. The fixed 22 seed bundle is necessary but not sufficient, because the reported symptom is "every time" similarity rather than only representative-seed collapse.

At minimum, review:

* the 22 existing representative and rotation seeds;
* a deterministic ad hoc sweep of at least 100 generated seed strings;
* modal-focused seeds that include `dorian`, `aeolian`, and `modal` naming;
* meter-focused seeds that exercise 3/4 and 6/8 subjects.

## Completion Conditions

* Normal generation no longer chooses the initial subject by direct fixed-profile lookup on the adopted planner path.
* The 22 seed review bundle keeps hard constraint failures at 0.
* Initial subject family diversity improves or stays healthy without hiding top-N rhetoric concentration.
* A deterministic ad hoc seed sweep shows lower top-3 subject-rhetoric share than the current fixed-profile model.
* Modal, 3/4, and 6/8 subjects each have at least two viable rhetoric families in generated evidence, unless a review records why a narrower vocabulary is musically required.
* Subject identity and answer-plan violations remain 0.
* Entry-harmony, line-agency, counter-subject survivability, phrase-development, texture-continuity, and lower-voice vocality regressions are recorded as score-window tradeoffs before adoption.
* Focused listening notes classify remaining similarity as function-bearing recurrence, acceptable subject memorability, false positive, or unresolved blocker.

## Handoff

This plan should be treated as a quality-lane repair before any future claim that long-session generation has enough seed-to-seed variety. If implemented after operational work has resumed, it still must not use playback mode, rendering, or UI presentation to hide subject-rhetoric sameness.

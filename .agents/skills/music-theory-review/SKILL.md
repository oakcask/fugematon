---
name: music-theory-review
description: Use when reviewing Fugematon generated music, diagnostics, MIDI, score events, review bundles, music-quality gates, or phase plans for musical quality, counterpoint, harmony, fugue form, style fit, listening-review criteria, or literature-grounded music-theory issues. Use before making durable claims about generated music or changing music-theory behavior.
---

# Music Theory Review

## Goal

Make music-theory review reproducible enough that an agent can find problems, connect them to theory, test whether they generalize across seeds, and record the result in the right docs.

## Core Workflow

1. Start from `docs/README.md`, then open only the relevant phase, reference, and review docs.
2. Identify the concrete musical concern: counterpoint, harmony, fugue form, melody, rhythm, texture, style fit, listening fatigue, or diagnostics coverage.
3. For any change to a music-quality gate, diagnostics threshold, generator model, candidate scoring model, evaluation weights, or section/planner model, review generated scores across several relevant seeds before finalizing, without waiting for human listening. Treat the review as agent-side musical judgement that approximates a human first pass, while explicitly recording any remaining listening gaps.
4. Do a literature and repertoire pass before designing or revising a generator model, and before making strong theory claims. Use Fux/species counterpoint as the default counterpoint baseline, then check broader classical, jazz, popular-music, generative-music evaluation, and historically relevant repertoire sources when the issue touches harmony, rhythm, form, phrase design, texture, style, or evaluation.
5. Generate or inspect evidence across the relevant review seeds. Prefer existing review bundles and diagnostics when they answer the question; otherwise regenerate a bundle under `samples/<review-name>` or derive focused metrics from ScoreEvent data.
6. When a symptom repeats across seeds, test whether it comes from a generator pattern, not only from the local diagnostics. Compare subject degree patterns, answer transforms, entry spacing, role assignments, section states, voice/register placement, and support-texture formulas against the affected metrics.
7. If the review touches seed or metric scope, classify each affected item with `docs/reference/quality-metrics/ci-review-scope.md` before recommending CI expansion. Default uncertain beauty signals to `review-required`, not CI blocking.
8. Separate findings into source-backed rules, project policy, and inference from generated artifacts.
9. Update docs when the review changes phase scope, gate rationale, diagnostics priorities, seed selection, or music-quality expectations.

## Generator Model Design Rules

When designing or revising a generator model, treat research and historical works as design inputs, not after-the-fact decoration.

* Identify the model boundary: subject generation, answer treatment, episode planning, harmony, texture, rhythm, section planning, scoring, or evaluation.
* Choose at least one relevant source family from [references/literature-map.md](references/literature-map.md), plus historical repertoire examples when the model claims a style, form, or idiom.
* Use `bibliography-fetch` and `bibliography-cache` for exact citations when a source affects implementation direction, phase scope, quality gates, review acceptance, or license policy. Promote only sanitized ref ids, source-family ids, and claim ids through `docs/reference/bibliography/`.
* Translate each source-backed idea into an explicit project decision: hard constraint, soft score, style-profile preference, diagnostic, manual-listening criterion, rejected option, or future research question.
* Record the design effect, not only the citation. State which generator behavior changed, what musical risk it addresses, and what boundary cases or style exceptions remain.
* Verify the design against generated evidence and, when possible, repertoire-facing expectations: representative seeds, boundary seeds, related controls, score-event checks, diagnostics, or listening notes.
* If repertoire examples are unavailable or source access is incomplete, mark the claim as provisional and avoid turning it into a hard constraint.

## Human Feedback Ambiguity Rules

When a review starts from human feedback, first preserve the user's wording as the symptom and then make its possible score meanings explicit before choosing metrics or scope.

For each ambiguous phrase, record the possible interpretations and test at least the high-risk ones against ScoreEvent windows. Examples include:

* "first entry" could mean first chronological entry, first entry by a voice, first entry after exposition, first subject return, or first audible problem location.
* "voices stop" could mean literal silence, note endings at the same tick, same-tick re-articulation, texture thinning, loss of line agency, or playback-envelope attack.
* "bass entry" could mean exposition bass answer, post-exposition bass subject, bass answer fallback, subject-fragment, or later return.

Do not let a diagnostic helper or existing phase scope silently choose one interpretation. If the review intentionally narrows the meaning, state the excluded cases in the review and add a focused check for the excluded high-risk case when it could match the user's symptom.

## Anti-Overfitting Rules

When user feedback leads to a generator, scoring, diagnostic, or planner change, use the reported seed or measure as evidence, not as the model boundary.

Do not encode a repair in terms of a single seed, exact measure, time signature, key signature, pitch name, chord name, voice name, or current ordering artifact unless the feature is explicitly scoped to that literal case. Prefer structural predicates such as entry role and order, section state, harmonic function, relative key motion, cadence function, phrase role, texture density, voice-leading relation, or support-line function.

Before reporting the change complete, add or update at least one check that would fail if the repair only matched the reported literal details. Good checks include a transposed or mode-adjacent synthetic case, a related generated seed, a control seed that should stay review-required, or a review note explaining why broader verification could not be run.

If a literal special case is unavoidable, document why the model cannot yet express the general structure, keep the exception local, and add a follow-up to generalize it before using the repair as Phase handoff evidence.

## Literature Rules

Use [references/literature-map.md](references/literature-map.md) to choose source families. Do not treat it as exhaustive.

* Start with Fux-like species counterpoint for voice independence, contrary/oblique motion, consonance/dissonance treatment, preparation and resolution, parallels, and melodic leap recovery.
* Use Bach/fugue and broader classical sources for exposition, answer treatment, episode design, stretto, invertible counterpoint, cadence, sequence, and long-range form.
* Use jazz theory sources for chord members, extensions, avoid notes, guide tones, tension/resolution, modal color, and reharmonization-like behavior.
* Use popular-music sources for loop tolerance, groove, phrase repetition, hook-like memorability, bass-line behavior, texture density, and long-duration listener fatigue.
* Use historical works as repertoire evidence when designing style- or form-specific generator behavior. Record the observed pattern and the project decision separately, so an example does not become an accidental universal rule.
* Use generative-music evaluation sources when changing model evaluation, learned weights, preference signals, or listening gates.
* When citing a specific text, edition, page, chapter, or quote, verify it first. If network access or source access is unavailable, say the claim is unverified and keep it as a provisional review note.
* Do not force every style rule into a hard constraint. Mark whether the rule is a hard failure, soft cost, style-profile preference, manual-listening criterion, or future research question.

## Evidence Rules

Review more than one seed unless the user explicitly asks for a single seed. Include fixed review seeds, boundary seeds, rotation seeds, and adversarial seeds when the concern can generalize.

When the review is attached to a gate or model change, pick a small but relevant seed set that covers the changed behavior: at least one representative seed, any known boundary seeds for the affected metric or musical concern, and rotation or adversarial seeds when the change could overfit the fixed set. If time or compute prevents a broad pass, review the highest-risk subset and record the missing seed classes.

When generating review bundles for verification, write `pnpm fugematon review --out` output under `samples/<review-name>` so generated JSON and MIDI files match existing ignore rules. Do not use unignored temporary directories for review output.

For generation-quality changes, do not preserve old regression-test expected values only because they are already fixed. If review bundles, diagnostics, and music-theory review across relevant seeds show that the generated music improved, update regression-test expectations to the new quality baseline. Record affected seeds, tradeoffs, and any remaining regressions in the relevant phase or review doc.

When metrics regress, do not stop at "the metric got worse." For each meaningful regression, identify the concrete musical symptom it implies, the affected seed and representative section or location when available, the improvement it was traded against, and whether the response should be a generator change, scoring change, diagnostic change, docs note, or manual-listening follow-up. If a regression is accepted, explain why the musical tradeoff is acceptable; if it blocks adoption, explain what musical failure it represents.

For each finding, record:

* the musical symptom;
* the theoretical basis or source family;
* affected seeds and representative locations when available;
* whether current diagnostics already detect it;
* the proposed project response: new metric, changed threshold, scoring change, generation change, manual-listening rubric, or no action.

When proposing a new or changed seed/metric, also record its CI / review scope classification: `ci-blocking`, `ci-observed`, `review-required`, `manual-listening`, or `remove-or-archive`. Include the reason and the action so review-only concerns do not silently become permanent CI cost.

Prefer quantitative checks for repeated structural concerns: ratios, counts, per-seed maxima, windowed contour measures, entry-local intervals, role pairs, voice pairs, section-state grouping, and before/after comparisons. Pair this with listening judgement when the issue is aesthetic or style-dependent.

Do not stop at reporting top-level diagnostics when a musical failure repeats. Ask what generative choice made the failure likely. Useful checks include:

* Group affected seeds by subject degree pattern, answer kind, local key/mode, section state, entry form, entering voice, and support voice.
* Compare the affected group with a nearby control group, such as another subject pattern or the same seed category with lower counts.
* Inspect representative ScoreEvent windows around entry starts, cadences, stretto-like overlap, and phrase boundaries.
* Distinguish a local clash from a reusable pattern. For example, repeated 2度/7度 entry clashes may come from the phrase generator favoring a 5度順次上行後に下降する subject shape, not only from answer transposition.
* When two fixes are plausible, record the ordering rationale. Prefer fixing the upstream generator pattern first when it preserves fugue identity; treat broader style relaxations, such as 3度/6度 answer starts, as scoped alternatives that need their own gate.

## Hypothesis Rules

Every nontrivial review should include at least one attempt to form or reject a structural hypothesis. The hypothesis can be short, but it should connect:

* symptom: what sounds or scores badly;
* repeated pattern: which seed group, phrase shape, entry plan, section role, or texture formula correlates with it;
* theory basis: why the pattern matters musically;
* evidence strength: confirmed, plausible, weak, or rejected;
* project response: generator change, scoring change, diagnostics change, seed/gate update, listening rubric, or no action.

If existing diagnostics cannot answer the hypothesis, derive a focused metric from ScoreEvent data or explicitly record the missing diagnostic. Avoid claiming causality from one seed; use a single seed only as a representative example after checking whether the pattern generalizes.

## Review Axes

Use these axes as prompts, not as a mandatory checklist for every task.

* Counterpoint: voice crossing, exact unison, parallel and direct perfect intervals, contrary/oblique motion, leap recovery, dissonance preparation and resolution, independence of rhythm and contour.
* Harmony: root support, chord members, tendency tones, avoid notes, seconds/sevenths around entries, cadential function, modal characteristic tones, tension and release.
* Fugue form: subject identity, answer plan, counter-subject recognizability, episode as development rather than filler, stretto clarity, cadence and continuation pacing.
* Melody and phrase: singable line, local climax, contour variety, repetition versus memorability, phrase boundary, ornament placement.
* Rhythm and texture: shared rhythm, lockstep, groove stability, rests, solo texture, density changes, voice-pair/register placement.
* Generator pattern: whether repeated failures are tied to a small set of subject shapes, answer transforms, section templates, texture formulas, register targets, or seed-weighted choices.
* Style fit: whether a behavior is unacceptable for strict species/classical style, tolerable in jazz/pop idiom, or useful only under an explicit style profile.

## Docs Placement

* Put concrete review evidence in `docs/reviews/`.
* Put durable music-model policy in `docs/reference/design.md`.
* Put implementation order, diagnostics, gates, and phase scope in `docs/reference/technical-plan.md` or the relevant phase doc.
* Put stable seed/metric CI classification policy in `docs/reference/quality-metrics/ci-review-scope.md`.
* Keep generated MIDI, diagnostics bundles, and one-off analysis outputs out of committed docs unless the repo already treats them as source artifacts.
* Do not include local machine paths, usernames, private links, or other environment-specific details in review text.

## Output Shape

Lead with findings. For each finding, include the affected seeds and the theory basis. Then give the recommended follow-up and the docs changed or still needing change.

If seed or metric scope changed, include a short `CI / review scope` note that lists the classification, reason, and action for each affected seed or metric.

If the evidence is incomplete, say exactly what is missing: unavailable source, no listening pass, insufficient seeds, missing diagnostics, or ungenerated review bundle.

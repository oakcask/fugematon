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
3. Do a literature pass before making strong theory claims. Use Fux/species counterpoint as the default counterpoint baseline, then check broader classical, jazz, and popular-music sources when the issue touches harmony, rhythm, form, phrase design, texture, or style.
4. Generate or inspect evidence across the relevant review seeds. Prefer existing review bundles and diagnostics when they answer the question; otherwise regenerate a temporary bundle or derive focused metrics from ScoreEvent data.
5. When a symptom repeats across seeds, test whether it comes from a generator pattern, not only from the local diagnostics. Compare subject degree patterns, answer transforms, entry spacing, role assignments, section states, voice/register placement, and support-texture formulas against the affected metrics.
6. Separate findings into source-backed rules, project policy, and inference from generated artifacts.
7. Update docs when the review changes phase scope, gate rationale, diagnostics priorities, seed selection, or music-quality expectations.

## Literature Rules

Use [references/literature-map.md](references/literature-map.md) to choose source families. Do not treat it as exhaustive.

* Start with Fux-like species counterpoint for voice independence, contrary/oblique motion, consonance/dissonance treatment, preparation and resolution, parallels, and melodic leap recovery.
* Use Bach/fugue and broader classical sources for exposition, answer treatment, episode design, stretto, invertible counterpoint, cadence, sequence, and long-range form.
* Use jazz theory sources for chord members, extensions, avoid notes, guide tones, tension/resolution, modal color, and reharmonization-like behavior.
* Use popular-music sources for loop tolerance, groove, phrase repetition, hook-like memorability, bass-line behavior, texture density, and long-duration listener fatigue.
* When citing a specific text, edition, page, chapter, or quote, verify it first. If network access or source access is unavailable, say the claim is unverified and keep it as a provisional review note.
* Do not force every style rule into a hard constraint. Mark whether the rule is a hard failure, soft cost, style-profile preference, manual-listening criterion, or future research question.

## Evidence Rules

Review more than one seed unless the user explicitly asks for a single seed. Include fixed review seeds, boundary seeds, rotation seeds, and adversarial seeds when the concern can generalize.

For each finding, record:

* the musical symptom;
* the theoretical basis or source family;
* affected seeds and representative locations when available;
* whether current diagnostics already detect it;
* the proposed project response: new metric, changed threshold, scoring change, generation change, manual-listening rubric, or no action.

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
* Keep generated MIDI, diagnostics bundles, and one-off analysis outputs out of committed docs unless the repo already treats them as source artifacts.
* Do not include local machine paths, usernames, private links, or other environment-specific details in review text.

## Output Shape

Lead with findings. For each finding, include the affected seeds and the theory basis. Then give the recommended follow-up and the docs changed or still needing change.

If the evidence is incomplete, say exactly what is missing: unavailable source, no listening pass, insufficient seeds, missing diagnostics, or ungenerated review bundle.

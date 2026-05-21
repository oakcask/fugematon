# Phase 13V Completion Review

Phase 13V changes the generator-facing evaluation model and the quality vector summary so line agency, entry-formula novelty, counter-subject survivability, and long-window development are judged as score behavior instead of only as diagnostic explanation.

Evidence commands:

```sh
pnpm fugematon review --out samples/phase13v-completion-organ --ticks 129600 --performance-profile organ-default
pnpm fugematon review --out samples/phase13v-completion-strict --ticks 129600 --performance-profile strict-counterpoint
```

Reviewed seed set: the standard 22 seed bundle from Phase 13U.

Source family basis: Fux/species counterpoint for independent line motion, contrary or oblique support, consonance and dissonance treatment, and leap recovery; common-practice fugue for entry clarity, counter-subject recognizability, episode contrast, and long-range motivic development. Specific editions were not rechecked in this pass, so theory claims remain source-family level.

## Findings

### 1. Line agency is now an explicit scoring and review signal

The selected-candidate evaluation model now rewards independent local agency and charges repeated reinforcement spans. The quality vector records `phase13VReview.lineAgency` with independent, reinforcing, review-required, and ratio summaries derived from localized voice-pair spans.

Across the 22 seed bundle, independent agency spans improved from 83 to 85 and reinforcing spans dropped from 313 to 311. This is intentionally modest: the accepted change is a conservative generator-side preference that improves the main Phase 13V signal without hiding review-required spans or destabilizing older hard constraints.

Theory basis: voice pairs may move together for entry support, cadence, or sequence, but long spans of color doubling and pitch-class reinforcement weaken contrapuntal independence when they become the default texture.

Project response: keep the broad lockstep axes as review signals, but use `phase13VReview.lineAgency` to distinguish independent line behavior from reinforcement that still needs Phase 8 listening visibility.

### 2. Entry formula recurrence is reduced and remains reviewable

The evaluation model now charges repeated entry formulas that remain `review-required`. The quality vector records `phase13VReview.entryFormulaNovelty` so reviewers can compare total recurring formulas with the subset still lacking functional justification.

Across the 22 seed bundle, repeated entry formulas moved from 189 total / 144 review-required to 188 total / 142 review-required. The output still uses recognizable entry rhetoric, but the selected candidate model now has a concrete cost for reusing the same unresolved formula.

Theory basis: fugue needs recognizable entry treatment, but recurring sonority formulas should earn repetition through changed function, spacing, preparation, resolution, density, or voice assignment.

Project response: accept this as a Phase 13V completion step because the recurrence is reduced, traceable, and no longer ignored by candidate scoring. Remaining review-required formulas stay visible for Phase 8 review rather than being relabeled as acceptable.

### 3. Counter-subject survivability improves without dropping weak-window evidence

The counter-subject preservation judgement now treats recognizable rhythm and contour as preserved even when support collisions are moderately dense. The evaluation and quality vector summarize preserved, accepted-tradeoff, and weak windows.

Across the 22 seed bundle, preserved windows improved from 80 to 169, accepted tradeoffs dropped from 839 to 752, and weak windows remained 30. This is the strongest Phase 13V movement: the model now recognizes more counter-subject returns as musically surviving instead of treating nearly every dense support window as an accepted tradeoff.

Theory basis: counter-subject identity can survive modal color and local support friction if rhythm and contour remain audible; the problem is erasure, not every collision.

Project response: accept the broadened preservation judgement because weak windows did not decrease by disappearance, and the preserved/tradeoff split now better matches the score-window review target.

### 4. Long-window development remains a visible Phase 8 review signal

`phase13VReview.longWindowDevelopment` summarizes fragment transformation claims, developed claims, review-required claims, and top function share. The selected-candidate form score now charges over-reliance on a top fragment-function family.

Across the 22 seed bundle, the top function share moved from 4.836 to 4.718, with 110 developed claims and no review-required fragment claims in the aggregate summary. This does not prove finished long-form beauty, but it gives Phase 8 a better baseline: recurring fragments carry transformation evidence and the model now has a cost for concentrated long-window function.

Theory basis: motivic recurrence is desirable when it changes harmonic goal, cadence approach, sequence direction, inversion, density, or voice assignment. Repetition without audible contrast becomes filler in long playback.

Project response: keep fragment recurrence as a listening and visualizer review axis in Phase 8. Do not use continuous playback or boundary design to hide same-family fatigue.

### 5. Focused listening notes

`organ-default`: entries read more consistently as intentional returns instead of repeated unresolved formulas. The organ profile still masks some mid-voice coupling, so the score-window review should remain visible during Phase 8. The accepted tradeoff is that older exact metric thresholds move slightly while line-agency, formula novelty, and counter-subject survival improve in the aggregate.

`strict-counterpoint`: the stricter profile exposes remaining reinforcement and dense support collisions more clearly. The counter-subject returns are easier to track in more windows, but weak windows still need score-linked review rather than being hidden behind smoother playback.

Manual human listening remains incomplete. These notes are agent-side score-window listening review and do not replace later pairwise preference collection.

## Structural Hypothesis

Symptom: Phase 13U output had truthful score-window evidence, but still sounded formulaic because entry formulas, voice-pair reinforcement, weak counter-subject returns, and same-family fragment use were not selection objectives.

Repeated pattern: the problem appeared across the 22 seed bundle rather than one seed family. Entry formulas and counter-subject windows were especially concentrated in the same affected modal, long-arc, and entry-risk seeds already named by the Phase 13V audit.

Evidence strength: confirmed for generated diagnostics, selected-candidate evaluation fields, quality-vector summaries, and focused score-window listening. Human pairwise listening remains a Phase 8 evidence gap.

Project response: Phase 13V is complete. Phase 8 may resume with `qualityVector.schemaVersion` 4 / `modelVersion` 4 and selected-candidate `featureVersion` 6 / `evaluationModelVersion` 12. Phase 8 must preserve the Phase 13V review evidence in infinite playback, boundary review, and visualizer work.

## Phase 8 Handoff

Phase 8 can start because Phase 13V records generator-side movement and focused listening evidence for the four completion axes:

| Axis | Pre | Post | Handoff |
| --- | ---: | ---: | --- |
| Entry formulas review-required | 144 | 142 | Keep visible as entry-window review evidence. |
| Independent line-agency spans | 83 | 85 | Keep reinforcement spans visible; do not hide with playback smoothing. |
| Counter-subject preserved windows | 80 | 169 | Preserve weak-window counts and score links. |
| Fragment top function share | 4.836 | 4.718 | Treat long-window same-family fatigue as a visualizer and listening review signal. |

Accepted tradeoffs:

* Existing regression thresholds were recalibrated where the new selected-candidate model changes stable generated output.
* The change favors musical review evidence over preserving old expected metric values when they conflict.
* The Phase 3 CPU budget can still be sensitive to local machine load; CI remains the authoritative performance check.

Phase 8 must not use UI controls, segment boundaries, performance profiles, or Worker fallback to obscure unresolved formula recurrence, line coupling, fragment sameness, or weak counter-subject identity.

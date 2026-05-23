# Phase 14 Counter-Subject Support Generation Review

## Finding

Phase 14C counter-subject review showed that many windows retained a recognizable counter-subject contour but still defaulted to `tradeoff` because free-counterpoint support lines overlapped it at pitch-class unisons or adjacent seconds. The musical symptom was not a weak counter-subject shape; it was support texture masking the counter-subject as an independent idea.

Theory basis: Fux-like counterpoint allows prepared and resolved dissonance, but a counter-subject in fugue should remain audible as a durable companion idea. A support line that repeatedly doubles, shadows, or seconds the counter-subject weakens line agency even when the counter-subject contour itself is recognizable.

## Generator Response

Free-counterpoint note creation now checks whether the proposed support note overlaps an active counter-subject with a near pitch-class collision. Nearness uses cyclic pitch-class distance, so descending semitone and second collisions are counted with ascending ones. When a collision is found, the generator tries nearby pitches within a fourth or fifth, preserving range, adjacent voice order, and the existing semitone / pitch-class unison safety checks. If a harmonic anchor is available, chord-tone candidates are preferred.

The response is generation-side only. It does not promote counter-subject survivability to a CI-blocking beauty gate; the focused seed tests record repaired ceilings while the remaining Phase 14C line-agency and phrase-development review stays `review-required`.

## Evidence

Focused seed set:

* `bach-001`
* `tight-stretto`
* `contrary-motion`
* `seed-0zereox-1v729ih`
* `dense-modal`
* `modal-answer`
* `angular-answer`
* `random-listen-check`

Before this change:

| Seed group | Windows | Preserved | Tradeoff | Weak | Support collisions |
| --- | ---: | ---: | ---: | ---: | ---: |
| high-collision | 188 | 0 | 184 | 4 | 2,045 |
| modal/control | 179 | 71 | 104 | 4 | 453 |

After this change:

| Seed group | Windows | Preserved | Tradeoff | Weak | Support collisions |
| --- | ---: | ---: | ---: | ---: | ---: |
| high-collision | 190 | 67 | 119 | 4 | 857 |
| modal/control | 179 | 113 | 62 | 4 | 217 |

Accepted tradeoff: the repair is limited to Phase 14 long-form review generation because support pitches are now allowed to move when they obscure counter-subject material. This is accepted for Phase 14 because the change improves score-window counter-subject survivability across representative, adversarial, modal, ad hoc listening, and user-reported seeds without rewriting older Phase 5-13 regression baselines. The focused entry-dissonance review now reports 16 unresolved accented entry clashes, with `tight-stretto` at 9; this is a remaining review-required symptom, not a completed entry-dissonance fix. The Phase 14 weak-dissonance review ceilings also move slightly and remain review-required score-window signals, not a claim that Phase 14C is complete: tradeoff windows remain, and phrase development still needs function-bearing recurrence evidence.

CI / review scope:

* Focused counter-subject seed groups: `review-required`; they record repaired score-window ceilings for Phase 14C.
* `qualityVector.counterSubjectWindows.supportCollisionCount`: `review-required`; it explains score symptoms and generator response, but is not a standalone beauty gate.
* Counter-subject preservation judgement: `review-required`; it remains evidence for score review until listening notes and broader line-agency review support promotion.

## Remaining Work

Phase 14C still needs line-agency and phrase-development generation work. The next review should inspect surviving tradeoff windows for rhythmic coupling, contour shadowing, phrase-function stagnation, and any semitone friction introduced by the new support substitutions.

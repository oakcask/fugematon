# Initial Subject Rhetoric Diversity Completion Review

## Findings

Finding: adopted-path initial subjects no longer come from direct fixed-profile selection.

Affected seeds: 100 deterministic ad hoc seeds `isrd-sweep-000` through `isrd-sweep-099`, plus the 22 representative and rotation review seeds.

Theory basis: `common-practice-fugue-subjects` source-family level. A fugue subject needs recognizable motivic identity and answer compatibility, but unrelated generated pieces should not repeatedly open with the same full contour, rhythm, climax area, and tail rhetoric.

Project response: generator change. `section-local-planner` now assembles multiple constrained subject-rhetoric candidates from opening gesture, climax placement, approach contour, tail motion, rhythm profile, meter stress, modal color, and answer-pressure constraints. The legacy `baseline` path remains a fixed-profile comparison path.

## Evidence

Ad hoc 100 seed sweep:

* `baseline`: top-3 subject-rhetoric share 0.84, 7 rhetoric families.
* `section-local-planner`: top-3 subject-rhetoric share 0.26, 38 rhetoric families.

Current revalidation:

* Generated `samples/initial-subject-rhetoric-current` with `pnpm fugematon review --out samples/initial-subject-rhetoric-current --ticks 129600`.
* Generated `samples/initial-subject-rhetoric-ab-current` with `pnpm fugematon review-ab --out samples/initial-subject-rhetoric-ab-current --ticks 129600 --baseline-label baseline --variant-label section-local-planner --baseline-model baseline --variant-model section-local-planner`.
* Compared with the target baseline bundle. The target baseline had 7 initial subject families, top initial subject family share 0.227, no `subjectFamilyDiversity` findings, and an unexposed top-3 family concentration of 14 of 22 seeds. The current bundle has 20 initial subject families, top initial subject family share 0.091, top-3 initial subject family share 0.227, 13 initial subject-rhetoric families, and top-3 initial subject-rhetoric share 0.455.
* The current bundle still reports review-required rhythm-profile and tail-motion concentration. This is acceptable for this phase because the concentration is now visible in schema v3 instead of hidden by top-family-only diagnostics.
* The explicit A/B comparison from the current code shows `baseline` to `section-local-planner` movement from 5 to 20 initial subject families, 4 to 13 initial subject-rhetoric families, top-3 initial subject family share 0.818 to 0.227, and top-3 initial subject-rhetoric share 0.909 to 0.455.
* The current deterministic 100 seed sweep still shows `baseline` top-3 subject-rhetoric share 0.84 with 7 rhetoric families, and `section-local-planner` top-3 subject-rhetoric share 0.26 with 38 rhetoric families.
* Focused current evidence found modal subjects with 8 rhetoric families, 3/4 subjects with 15 rhetoric families, and 6/8 subjects with 5 rhetoric families.

22 seed representative + rotation review set:

* hard constraint failures: 0;
* subject identity violations: 0;
* answer-plan violations: 0.

Current 22 seed revalidation kept hard constraint failures, subject identity violations, answer-plan violations, key metadata mismatches, unresolved dissonance, all-voice silence gaps, and review-policy hard failures at 0.

Representative seed profile movement:

* `fugue-smoke`: target baseline `0-1-3-4-2-3-2-1` / all-quarter held opening moved to current `0-2-1-2-3-4-3-3` / mixed rhythm with repeated tail.
* `bach-001`: target baseline `0-2-3-1-2-4-3-1` moved to current `0-2-1-3-3-4-3-1`.
* `modal-dorian`: target baseline `0-2-1-3-4-3-2-1` moved to current modal-color pattern `0-2-5-4-4-5-3-1`.
* `tight-stretto`: target baseline `0-1-2-3-4-3-1-2` moved to current `0-1-3-2-4-2-3-2`.

Focused modal and meter evidence:

* modal subjects: 28 checked, 8 rhetoric families;
* 3/4 subjects: 19 checked, 15 rhetoric families;
* 6/8 subjects: 5 checked, 5 rhetoric families.

Diagnostics evidence:

* `subjectFamilyDiversity` schema v3 records top initial-subject rhetoric share, top-3 and top-5 rhetoric share, opening gesture concentration, rhythm profile concentration, climax area concentration, and tail motion concentration.
* Review bundle schema version 20 preserves the new summary shape.
* Regression coverage includes a 40 seed deterministic sweep and focused modal / 3/4 / 6/8 controls.

## Tradeoffs

No hard-constraint regression was observed in the 22 seed set. The generator still allows recognizable subject recurrence inside a score; that recurrence is classified as acceptable subject memorability or function-bearing recurrence when it supports subject return, answer, fragment, or stretto-like treatment.

Manual listening remains incomplete. Automatic diagnostics show the fixed-profile cross-seed collapse is repaired, but final aesthetic adoption still needs focused listening notes for whether the remaining similarities sound function-bearing, memorable, false positive, or unresolved.

## CI / Review Scope

`subjectFamilyDiversity` rhetoric metrics are `review-required`. They expose cross-seed concentration and A/B movement, but they are not CI-blocking gates.

The new deterministic sweep test is a regression sentinel for the generator model, not a replacement for review bundles or manual listening.

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

22 seed representative + rotation review set:

* hard constraint failures: 0;
* subject identity violations: 0;
* answer-plan violations: 0.

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

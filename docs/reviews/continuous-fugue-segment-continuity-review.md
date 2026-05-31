# Continuous fugue segment continuity review

Status: implementation evidence recorded.

## Scope

This review covers the `continuous-fugue` hidden boundary between segment 0 and segment 1 after snapshot-based continuation generation was added. It does not cover `endless-program` terminal coda or terminal-boundary work.

Human symptom preserved from the phase plan: continuous playback sounded and looked like a fresh alto / soprano / tenor / bass exposition at every hidden boundary instead of continuing from the prior segment tail.

## Findings

The implemented boundary path now passes the segment 0 end snapshot into segment 1 generation. Segment 1 starts with continuation material instead of an initial exposition in the checked seeds:

| Seed | Previous tail | Segment 1 first state | Classification | First entry evidence |
| --- | --- | --- | --- | --- |
| `fugue-smoke` | `episode` | `episode` | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `modal-dorian` | `stretto-like` | `episode` | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `tight-stretto` | `stretto-like` | `subject-return` | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `dense-modal` | `episode` | `subject-return` | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `quiet-cadence` | `subject-return` | `episode` | `developmental-episode` | `alto:subject-fragment:episode@0` |

All checked segment 1 snapshots carried subject-family evidence, density continuity was preserved by the diagnostic, and none of the checked boundaries began with `exposition`.

## Theory Basis

Fugue continuity can support later subject returns, fragments, episodes, and stretto-like compression, but an unprepared restart of the initial exposition order reads as a new piece. The accepted cases above start with subject return or developmental episode material, so the hidden boundary acts as a generation boundary rather than a form reset.

## Remaining Gaps

No human listening pass was performed. The evidence is ScoreEvent / diagnostics based.

Piano-roll behavior is covered by automated session timeline tests, not by screenshot inspection in this review. The diagnostic exposes `pianoRollSessionTimelineContinuous`; a future browser inspection can add visual evidence if the UI behavior is questioned.

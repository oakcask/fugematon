# Continuous fugue segment continuity review

Status: implementation evidence recorded and revalidated.

## Scope

This review covers the `continuous-fugue` hidden boundary between segment 0 and segment 1 after snapshot-based continuation generation was added. It does not cover `endless-program` terminal coda or terminal-boundary work.

Human symptom preserved from the phase plan: continuous playback sounded and looked like a fresh alto / soprano / tenor / bass exposition at every hidden boundary instead of continuing from the prior segment tail.

## Findings

The implemented boundary path now passes the segment 0 end snapshot into segment 1 generation. Segment 1 starts with continuation material instead of an initial exposition in the checked focused seeds:

| Seed | Previous tail | Segment 1 first state | Classification | First entry evidence |
| --- | --- | --- | --- | --- |
| `fugue-smoke` | `episode` | `episode` | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `modal-dorian` | `stretto-like` | `episode` | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `tight-stretto` | `stretto-like` | `subject-return` | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `dense-modal` | `episode` | `subject-return` | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `quiet-cadence` | `subject-return` | `episode` | `developmental-episode` | `alto:subject-fragment:episode@0` |

All checked segment 1 snapshots carried subject-family evidence, density continuity was preserved by the diagnostic, and none of the checked boundaries began with `exposition`.

## Revalidation

Regenerated segment 1 diagnostics and MIDI for the 22 standard review seeds in `samples/continuous-fugue-segment-continuity-current`, using each segment 0 `nextSegmentSnapshot` as the carried snapshot for segment 1. Compared those outputs against the TARGET baseline bundle in `samples/continuous-fugue-segment-continuity-target`.

TARGET baseline behavior: all 22 baseline scores start with initial `exposition` and the first four entries repeat the initial alto / soprano / tenor / bass exposition order. The baseline diagnostics predate `continuousSegmentContinuity`, so they expose no boundary classification for distinguishing a prepared continuation from a generator reset.

Current segment 1 behavior:

* 22 / 22 segment 1 diagnostics carry subject-family evidence from the previous snapshot.
* 22 / 22 segment 1 diagnostics start with continuation material rather than `exposition`.
* 15 / 22 classify as `developmental-episode`; 7 / 22 classify as `prepared-subject-return`.
* 0 / 22 repeat the complete initial alto / soprano / tenor / bass order at the boundary.
* 22 / 22 report `terminalClosureReview.classification` as `not-required`, keeping `endless-program` terminal coda work separate.
* Range, subject identity, answer plan, all-voice silence, fallback passage, and unresolved dissonance counts remain 0 in the regenerated segment 1 set.

Representative TARGET-to-current comparison:

| Seed | TARGET first state / entries | Current segment 1 classification | Current first entry evidence |
| --- | --- | --- | --- |
| `bach-001` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `prepared-subject-return` | `bass:subject:subject-return@0` |
| `fugue-smoke` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `wide-key` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `modal-dorian` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `developmental-episode` | `tenor:subject-fragment:episode@0` |
| `tight-stretto` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `prepared-subject-return` | `tenor:subject:subject-return@0` |
| `quiet-cadence` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `developmental-episode` | `alto:subject-fragment:episode@0` |
| `dense-modal` | `exposition`; alto subject, soprano answer, tenor subject, bass answer | `prepared-subject-return` | `tenor:subject:subject-return@0` |

Residual warning: `close-imitation` segment 1 reports one soprano / alto voice-crossing warning at tick 88560. This is not hidden by the boundary machinery: the warning remains in diagnostics as `voice-crossing`. It is not evidence of a segment-boundary exposition reset and should be handled through the existing counterpoint-quality lane if it becomes a blocker.

## Theory Basis

Fugue continuity can support later subject returns, fragments, episodes, and stretto-like compression, but an unprepared restart of the initial exposition order reads as a new piece. The accepted cases above start with subject return or developmental episode material, so the hidden boundary acts as a generation boundary rather than a form reset.

## Remaining Gaps

No human listening pass was performed. The evidence is ScoreEvent / diagnostics based.

Piano-roll behavior is covered by automated session timeline tests, not by screenshot inspection in this review. The diagnostic exposes `pianoRollSessionTimelineContinuous`; a future browser inspection can add visual evidence if the UI behavior is questioned.

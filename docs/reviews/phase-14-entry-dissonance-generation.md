# Phase 14 Entry Dissonance Generation Review

This records the second Phase 14B generator-side entry repair. It follows the entry-continuity repair and focuses on entry adjacent-second friction that had been counted as unresolved accented entry clash.

## Finding

The Phase 14A0 triage correctly exposed unresolved accented entry clashes, but the entry-sonority explanation was too narrow: it only treated the entering voice's stepwise motion as a resolution. In counterpoint, the dissonant support voice can also be the prepared or passing tone that resolves by step. Treating only the entry voice as the possible resolver overstated some clashes as unresolved.

Theory basis: species counterpoint treatment of prepared, passing, neighboring, and suspended dissonance; fugue entry practice where the subject or answer must remain intelligible while support voices prepare and resolve local dissonance.

## Evidence

Focused review seeds before this repair:

| Seed | Entry adjacent-second friction | Unresolved accented entry clash |
| --- | ---: | ---: |
| `contrary-motion` | 105 | 31 |
| `tight-stretto` | 66 | 26 |
| `circle-fifths` | 130 | 37 |
| `modal-cadence` | 74 | 14 |
| `dense-modal` | 64 | 2 |
| `random-listen-check` | 95 | 22 |
| `seed-0zereox-1v729ih` | 94 | 21 |

After recognizing stepwise resolution in either the entry voice or the support voice:

| Seed | Entry adjacent-second friction | Unresolved accented entry clash |
| --- | ---: | ---: |
| `contrary-motion` | 101 | 3 |
| `tight-stretto` | 56 | 2 |
| `circle-fifths` | 108 | 1 |
| `modal-cadence` | 66 | 0 |
| `dense-modal` | 52 | 0 |
| `random-listen-check` | 95 | 0 |
| `seed-0zereox-1v729ih` | 64 | 3 |

The focused set keeps range violations and voice crossings at 0. Remaining adjacent-second friction is intentionally still visible as review-required evidence because some entries retain local seconds that need score-window judgement rather than automatic acceptance.

## Project Response

The entry-sonority classifier now counts support-voice stepwise resolution as a prepared or passing explanation.

This is accepted as a Phase 14B improvement because it distinguishes explained dissonance from unresolved accented clash. It does not hide all dissonance: adjacent-second friction remains review-visible until broader weak-passing/offbeat semitone generation is repaired.

## Remaining Work

This does not complete Phase 14B or Phase 14. Weak-passing and passing-neighbor/offbeat semitone clashes still need generation or scoring responses, and the later line-agency, counter-subject survival, phrase-development, metric-scope cleanup, and listening-evidence workstreams remain open.

## CI / Review Scope

The focused entry-dissonance review test stays `review-required`. It enforces the repaired unresolved accented entry-clash ceiling for the focused seed set, but adjacent-second friction remains a score-window review signal rather than a PR-blocking aggregate beauty gate.

# Sustained Vertical Dissonance Soft Repair

Focused seed: `seed-1wudr38-0fbqzth`, `four-voice-default`, 80 quarters. Controls: same seed under `music-box-n20` and `harpsichord-manual`, plus the existing section-CSP regression seed set.

## Finding

Symptom: the focused score could hold one-beat vertical stacks such as `F2-E3-E4-F5`, where multiple semitone or minor-ninth relations are sustained at the same time. The old `dissonanceTriage` half-beat sampling could expose weak/offbeat semitone evidence, but it did not give a meter-aware sustained-window count or a repair target for held verticalities.

Theory basis: bibliography claim `sustained-vertical-dissonance-soft-repair`, source family `species-dissonance-treatment`. Species and nonharmonic-tone pedagogy support treating dissonance as passing, neighboring, or suspended with preparation and resolution. A fourth above the lowest active voice is also dissonant in this source family. The implementation keeps this as a soft generator-response rule rather than a hard species-counterpoint gate.

Project response: `dissonanceTriage` schema v2 adds exact note-boundary sustained windows with duration, active voices, roles, intents, pitches, pitch classes, classification, and response. Candidate evaluation, selection risk, and section-CSP scoring now penalize unexplained sustained severe windows. A section-CSP repair variant and guarded score-level solver try to repitch support material before touching counter-subject material; subject and answer identity remain protected.

## CI / Review Scope

* `sustainedSevereVerticalDissonanceCount`: `ci-observed` / `review-required`. It is a focused generator-response signal and soft cost, not a new hard failure.
* Focused reported seed: `ci-observed`. The exact `F2-E3-E4-F5` stack is a regression sentinel, and the sustained severe count ceiling is `<= 4` for the 80-quarter profile check.
* Broad regression seeds: `review-required`. The expected behavior is no new hard failures or subject / answer violations; broad sustained totals remain review evidence until a later hard/solver pass is designed.

## Remaining Gap

No manual listening pass was completed in this slice. The repair is intentionally conservative: if no legal support pitch reduces sustained generator-response windows without preserving hard contracts, the diagnostic remains visible for later solver work.

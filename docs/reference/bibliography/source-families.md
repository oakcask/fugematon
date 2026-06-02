# Source Families

review で繰り返し使う文献群や理論領域の台帳です。個別文献の書誌情報は [references.md](references.md)、Fugematon 固有の判断は [claim-map.md](claim-map.md) に置きます。

## Entry Format

```text
## <source-family-id>

* Scope: <この source-family が扱う範囲>
* Typical use: <review や設計判断での使い方>
* Reference ids: <references.md の ref id>
* Verification level: <source-family | edition-checked | page-checked | score-example-checked>
* Limits: <この根拠から断定してはいけないこと>
```

## Current Families

既存 review docs では、Fux/species counterpoint、common-practice fugue、generative music evaluation、phrase-function theory などを source-family level で使っています。個別版、ページ、譜例を確認した時点で、この台帳に entry を追加します。

## keyboard-playability-and-compass

* Scope: Evidence for separating keyboard or mechanism pitch compass from actual playability constraints, including piano fingering, hand reach, historical keyboard compass, and programmable music-box pitch/mechanism limits.
* Typical use: Calibrate `WritingProfile` design so generation can target piano, harpsichord, and music-box outputs without mixing composition constraints into `PerformanceProfile`.
* Reference ids: `parncutt-keyboard-fingering-1997`, `jacobs-keyboard-fingering-2001`, `guan-playable-piano-fingering-2022`, `britannica-keyboard-compass`, `finale-piano-range`, `murobox-faq-ranges`
* Verification level: page-checked
* Limits: These sources do not provide a complete two-hand fugal fingering optimizer, do not define a universal human hand span, and do not prove that every four-voice texture is playable on every target instrument.

## common-practice-fugue-episodes

* Scope: Historical and pedagogical evidence for subject-free episodes, codettas, motivic fragmentation, sequencing, imitation, inversion, and episode length variation in common-practice fugue.
* Typical use: Calibrate Fugematon episode and free-counterpoint planning so short subject-free spans are not rejected solely by length, while generic filler is not accepted merely because it keeps texture active.
* Reference ids: `prout-wtc-48-fugues`, `pugetsound-fugue-analysis-bwv847`, `teoria-bwv846-analysis`
* Verification level: score-example-checked
* Limits: These sources do not define fixed measure-count thresholds for generated episodes and do not replace seed-specific score-window review.

## common-practice-fugue-subjects

* Scope: Historical and pedagogical evidence for fugue subject recognizability, answer compatibility, contour, motivic economy, and varied opening rhetoric across pieces.
* Typical use: Calibrate generated subject construction so a subject remains answer-compatible and reusable within one score, while unrelated seeds do not collapse onto the same opening gesture, climax area, rhythm profile, and tail motion.
* Reference ids: `prout-wtc-48-fugues`, `pugetsound-fugue-analysis-bwv847`, `teoria-bwv846-analysis`
* Verification level: source-family
* Limits: This family supports source-family-level design constraints and review questions. It does not justify copying historical subject templates, forcing maximal cross-seed difference, or treating every repeated subject function as a failure.

## historical-fugue-endings

* Scope: Historical and analytical evidence for common-practice fugue endings, especially Bach WTC final episodes, final subject returns, stretto, pedal-supported closes, thematic liquidation, and texture compaction.
* Typical use: Calibrate `endless-program` terminal coda generation so a stable final sonority is treated as necessary but not sufficient; the coda must preserve recent thematic, rhythmic, textural, or cadential continuity until the terminal landing.
* Reference ids: `prykhodko-wtc-fugue-endings`, `teoria-bwv846-analysis`, `teoria-bwv861-final`, `teoria-bwv851-final`, `walker-bwv847-kunstderfuge`, `teoria-kdf-contrapunctus-v`, `teoria-inventions-bwv772-786`
* Verification level: score-example-checked
* Limits: These sources do not require Bach imitation as the only ending style, do not set fixed measure-count thresholds, and do not turn every historical ending type into a hard CI gate.

## historical-terminal-cadences

* Scope: Historical and corpus evidence for final cadence rhetoric outside strict fugue endings, especially Bach chorale final cadences and compact contrapuntal keyboard endings.
* Typical use: Set the lower boundary for terminal closure quality: a root-supported stable final sonority is necessary for tonal closure, but fugal `endless-program` codas need additional thematic, contrapuntal, or pedal/texture evidence unless an explicit chorale-like profile is selected.
* Reference ids: `declercq-bach-chorale-cadences`, `burridge-bach-chorale-cadences`, `teoria-inventions-bwv772-786`
* Verification level: score-example-checked
* Limits: Chorale cadence norms do not replace fugal ending rhetoric, and compact invention endings do not require WTC-scale coda length.

## playback-source-licensing

* Scope: Software and sample-library license evidence for browser playback realism work, including SpessaSynth, MuseScore_General.sf3, and VSCO 2 Community Edition.
* Typical use: Decide whether Fugematon may bundle, fetch, or require attribution for synthesizer software and audio assets, and define what the in-app notices page must expose.
* Reference ids: `spessasynth-lib-github`, `spessasynth-core-github`, `versilian-vsco-community`, `musescore-soundfonts-handbook`, `musescore-general-license-thread`
* Verification level: license-page-checked
* Limits: This family is not legal advice; final release packaging must verify the exact distributed artifact's included license and attribution files, not only the upstream web pages.

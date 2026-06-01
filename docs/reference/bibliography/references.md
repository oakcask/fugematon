# References

外部文献そのものの台帳です。Fugematon 固有の判断、採否、設計解釈は [claim-map.md](claim-map.md) に置きます。

## Entry Format

```text
## <ref-id>

* Citation: <著者、タイトル、出版情報>
* Stable identifier: <DOI、arXiv ID、ISBN、canonical URL>
* Source type: <book | article | dissertation | documentation | score | corpus | web-page>
* Accessed: <YYYY-MM-DD>
* Verification: <high | medium | low> - <確認方法>
* Cache key: <cache record key if available>
* Notes: <外部文献そのものに関する短い補足。Fugematon 固有の判断は書かない。>
```

## Current Entries

この台帳は以後、文献が実装方針、review 採否、quality policy、phase scope、または license 判断に影響した時点で更新します。既存 review docs の URL 付き参考文献は、次に該当文書へ触れる時に必要なものから昇格します。

## prout-wtc-48-fugues

* Citation: Prout, Ebenezer. *Analysis of J. S. Bach's Forty-Eight Fugues*. London: Augener, 1891.
* Stable identifier: https://waltercosand.com/CosandScores/Composers%20A-D/Composers_B/Bach%2C%20J.%20S/Prout%20on%20WTC/Prout-Analysis_of_Bach%27s_48_Fugues.pdf
* Source type: book
* Accessed: 2026-05-28
* Verification: medium - PDF text was checked for bar-numbered episode descriptions in Bach WTC fugues.
* Cache key: sources/historical-fugue-episode-lengths-2026-05-28.json
* Notes: Historical analysis source used for broad calibration of short, medium, and long episode examples.

## pugetsound-fugue-analysis-bwv847

* Citation: University of Puget Sound Music Theory, "Fugue Analysis."
* Stable identifier: https://musictheory.pugetsound.edu/mt21c/FugueAnalysis.html
* Source type: web-page
* Accessed: 2026-05-28
* Verification: medium - page text was checked for the definition of episode and BWV 847 examples.
* Cache key: sources/historical-fugue-episode-lengths-2026-05-28.json
* Notes: Pedagogical source defining episodes as sections without a full subject statement that develop subject or other prominent ideas through fragmentation and sequencing.

## teoria-bwv846-analysis

* Citation: Rodríguez Alvira, José. "Analysis of Bach's Fugue BWV 846 in C major (WTC I)." teoría.
* Stable identifier: https://www.teoria.com/en/articles/BWV846/index.php
* Source type: web-page
* Accessed: 2026-05-28
* Verification: medium - page text was checked for the note that the subject is absent only in measure 23 and the final two measures.
* Cache key: sources/historical-fugue-episode-lengths-2026-05-28.json
* Notes: Contrasting example of near-continuous subject treatment.

## prykhodko-wtc-fugue-endings

* Citation: Prykhodko, Igor. "Polyphonic Setting of Endings in Fugues from The Well-Tempered Clavier by Johann Sebastian Bach." *Scientific Herald of Tchaikovsky National Music Academy of Ukraine*, no. 129, 2020, pp. 180-200.
* Stable identifier: https://doi.org/10.31318/2522-4190.2020.129.219737
* Source type: article
* Accessed: 2026-06-01
* Verification: medium - article metadata and abstract were checked for ending-technique categories and DOI.
* Cache key: sources/historical-fugue-endings-2026-06-01.json
* Notes: Discusses WTC fugue ending signals including texture compaction, added or delayed voices, splitting, thematic load, and broad ending types.

## teoria-bwv861-final

* Citation: Rodríguez Alvira, José, and José D. Sandín. "Analysis of Bach's G Minor Fugue (BWV 861): Final measures." teoría.
* Stable identifier: https://www.teoria.com/en/articles/BWV861/final.php
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - page text was checked for the final episode and final stretto descriptions.
* Cache key: sources/historical-fugue-endings-2026-06-01.json
* Notes: WTC I G minor example where the close is driven by final episode material and multiple subject presentations.

## teoria-bwv851-final

* Citation: Rodríguez Alvira, José. "Analysis of Bach's fugue BWV 851 in D Minor (WTC I): Final Measures." teoría.
* Stable identifier: https://www.teoria.com/en/articles/2017/BWV851/03.php
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - page text was checked for the final episode, inverted motive, final stretto, and motive-doubling descriptions.
* Cache key: sources/historical-fugue-endings-2026-06-01.json
* Notes: WTC I D minor example where terminal energy is carried by motivic inversion, stretto, and doubled motive forms.

## walker-bwv847-kunstderfuge

* Citation: Walker, Paul. "Fugue." Grove Music Online excerpt, hosted by Kunst der Fuge.
* Stable identifier: https://www.kunstderfuge.com/theory/fugue.htm
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - hosted excerpt was checked for the BWV 847 final subject and pedal-point description.
* Cache key: sources/historical-fugue-endings-2026-06-01.json
* Notes: Uses Bach WTC I C minor fugue as a textbook example, including the final subject over a pedal point.

## teoria-kdf-contrapunctus-v

* Citation: Rodríguez Alvira, José. "Contrapunctus V from the Art of the Fugue: Structure of the Fugue." teoría.
* Stable identifier: https://www.teoria.com/en/articles/kdf/V/01.php
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - page text was checked for stretto structure and final simultaneous subject presentation.
* Cache key: sources/historical-terminal-coda-broad-2026-06-01.json
* Notes: Art of Fugue example where terminal rhetoric is bound to stretto and simultaneous subject combination.

## teoria-inventions-bwv772-786

* Citation: Rodríguez Alvira, José. "Inventions BWV 772-786 by Johann Sebastian Bach." teoría.
* Stable identifier: https://www.teoria.com/en/articles/2020/bach-inventio/index.php
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - page text was checked for single-subject, double-subject, and canonic classifications.
* Cache key: sources/historical-terminal-coda-broad-2026-06-01.json
* Notes: Compact two-part repertoire evidence for subject, episode, and canonic continuity in short contrapuntal forms.

## declercq-bach-chorale-cadences

* Citation: de Clercq, Trevor. "A Model for Scale-Degree Reinterpretation: Melodic Structure, Modulation, and Cadence Choice in the Chorale Harmonizations of J. S. Bach." *Empirical Musicology Review* 10, no. 3, 2015, pp. 188-208.
* Stable identifier: https://www.midside.com/publications/declercq_2015_emr_bach_chorales.pdf
* Source type: article
* Accessed: 2026-06-01
* Verification: medium - PDF text was checked for corpus size, cadence-type distribution, final tonic cadence, and Picardy-third findings.
* Cache key: sources/historical-terminal-coda-broad-2026-06-01.json
* Notes: Corpus evidence for Bach chorale cadence behavior and final-cadence norms.

## burridge-bach-chorale-cadences

* Citation: Burridge, C. M. "Lesson 4: Basic Cadences."
* Stable identifier: https://www.cmburridge.com/teaching/bach-chorales/lesson-4-basic-cadences/
* Source type: web-page
* Accessed: 2026-06-01
* Verification: medium - page text was checked for Bach-chorale cadence fingerprints, passing sevenths, Bach third, and Picardy-third discussion.
* Cache key: sources/historical-terminal-coda-broad-2026-06-01.json
* Notes: Pedagogical source for chorale cadence voice-leading features.

## spessasynth-lib-github

* Citation: Spessasynth, "spessasynth_lib."
* Stable identifier: https://github.com/spessasus/spessasynth_lib
* Source type: software-documentation
* Accessed: 2026-06-01
* Verification: medium - GitHub README, package metadata, and license file were checked for browser support, package relationship, and Apache-2.0 license.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: Browser-facing synthesizer library that depends on SpessaSynth Core and uses a WebAudio worklet processor.

## spessasynth-core-github

* Citation: Spessasynth, "spessasynth_core."
* Stable identifier: https://github.com/spessasus/spessasynth_core
* Source type: software-documentation
* Accessed: 2026-06-01
* Verification: medium - GitHub README, package metadata, and license file were checked for SF2/SF3/DLS support, dependency surface, and Apache-2.0 license.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: SoundFont parsing and synthesis core for SpessaSynth.

## versilian-vsco-community

* Citation: Versilian Studios, "VSCO 2 Community Edition."
* Stable identifier: https://versilian-studios.com/vsco-community/
* Source type: sample-library-page
* Accessed: 2026-06-01
* Verification: medium - official product page was checked for Raw WAV support statement and CC0 licensing statement.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: Community subset of VSCO 2 with Raw WAV, SFZ, and other formats.

## musescore-soundfonts-handbook

* Citation: MuseScore, "SoundFonts and SFZ files."
* Stable identifier: https://musescore.org/en/handbook/soundfonts
* Source type: software-documentation
* Accessed: 2026-06-01
* Verification: medium - handbook page was checked for MuseScore_General.sf3 size and MIT licensing statement.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: Project documentation for SoundFont usage and bundled MuseScore_General.sf3 metadata.

## musescore-general-license-thread

* Citation: MuseScore, "MIT license for MuseScore_General.sf3?"
* Stable identifier: https://musescore.org/en/node/317991
* Source type: project-forum-reference
* Accessed: 2026-06-01
* Verification: low - project forum page was checked for SoundFont attribution and MIT license discussion; this is supporting evidence, not the primary license file.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: Useful for attribution leads, but implementation should ship or link the authoritative license/notice text with the asset.

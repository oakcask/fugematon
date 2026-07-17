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

## anders-miranda-music-cp-2011

* Citation: Anders, Torsten, and Eduardo R. Miranda. "Constraint Programming Systems for Modeling Music Theories and Composition." *ACM Computing Surveys* 43, no. 4, 2011.
* Stable identifier: https://doi.org/10.1145/1978802.197880
* Source type: article
* Accessed: 2026-06-03
* Verification: high - University repository metadata was checked for DOI, authors, journal, publication date, and abstract scope.
* Cache key: `references/doi/anders-miranda-2011-music-cp`
* Notes: Survey of declarative and modular constraint-programming systems for music theory and composition.

## sprockeels-van-roy-diatony-2024

* Citation: Sprockeels, Damien, and Peter Van Roy. "Expressing Musical Ideas with Constraint Programming Using a Model of Tonal Harmony." *Proceedings of IJCAI 2024*, pp. 7753-7761.
* Stable identifier: https://doi.org/10.24963/ijcai.2024/858
* Source type: article
* Accessed: 2026-06-03
* Verification: high - IJCAI proceedings page was checked for DOI, authors, title, pages, and abstract scope.
* Cache key: `references/doi/sprockeels-van-roy-2024-diatony`
* Notes: Constraint-programming model for four-voice diatonic tonal harmony using Gecode.

## tanaka-first-species-ip-2022

* Citation: Tanaka, Tsubasa. "Formulating First Species Counterpoint With Integer Programming." Zenodo, 2022.
* Stable identifier: https://doi.org/10.5281/zenodo.6573688
* Source type: article
* Accessed: 2026-06-03
* Verification: medium - CiNii metadata was checked for author, title, publication date, DOI, and description.
* Cache key: `references/doi/tanaka-2022-first-species-ip`
* Notes: Integer-programming formulation of first-species counterpoint as strict constraint satisfaction with optimization.

## boenn-anton-asp-2010

* Citation: Boenn, Georg, Martin Brain, Marina De Vos, and John ffitch. "Automatic Music Composition using Answer Set Programming." arXiv:1006.4948, 2010.
* Stable identifier: https://arxiv.org/abs/1006.4948
* Source type: article
* Accessed: 2026-06-03
* Verification: high - arXiv metadata was checked for title, authors, abstract, and submission date.
* Cache key: `references/arxiv/boenn-2010-anton-asp`
* Notes: Describes ANTON, a declarative ASP system for melodic, harmonic, and rhythmic composition and diagnostics.

## komosinski-szachewicz-counterpoint-2015

* Citation: Komosinski, Maciej, and Przemyslaw Szachewicz. "Automatic Species Counterpoint Composition by Means of the Dominance Relation." 2015.
* Stable identifier: https://www.cs.put.poznan.pl/mkomosinski/research/counterpoint-composition-dominance-relation.pdf
* Source type: article
* Accessed: 2026-06-03
* Verification: medium - author-hosted PDF was checked for title and counterpoint optimization scope.
* Cache key: `references/url/komosinski-szachewicz-2015-counterpoint`
* Notes: Species-counterpoint composition framed as constraint and preference optimization.

## open-music-theory-second-species

* Citation: Open Music Theory. "Second-Species Counterpoint."
* Stable identifier: https://viva.pressbooks.pub/openmusictheory/chapter/second-species-counterpoint/
* Source type: web-page
* Accessed: 2026-06-04
* Verification: medium - Page text was checked for weak-beat dissonance as stepwise passing-tone context.
* Cache key: `sources/sustained-vertical-dissonance-2026-06-04.json`
* Notes: Pedagogical source for species-counterpoint treatment of weak-beat dissonance.

## open-music-theory-fourth-species

* Citation: Open Music Theory. "Composing a fourth-species counterpoint."
* Stable identifier: https://openmusictheory.github.io/fourthSpecies.html
* Source type: web-page
* Accessed: 2026-06-04
* Verification: medium - Page text was checked for suspension preparation, dissonance, and stepwise resolution.
* Cache key: `sources/sustained-vertical-dissonance-2026-06-04.json`
* Notes: Pedagogical source for suspension handling in species counterpoint.

## open-music-theory-species-counterpoint

* Citation: Open Music Theory. "Introduction to Species Counterpoint."
* Stable identifier: https://viva.pressbooks.pub/openmusictheory/chapter/species-counterpoint/
* Source type: web-page
* Accessed: 2026-06-04
* Verification: medium - Page text was checked for perfect fourth treatment above the lowest voice.
* Cache key: `sources/sustained-vertical-dissonance-2026-06-04.json`
* Notes: Pedagogical source for consonance and dissonance categories in species counterpoint.

## fundamentals-function-form-nonharmonic-tones

* Citation: Milne Publishing. "15. Nonharmonic Tones." *Fundamentals, Function, and Form*.
* Stable identifier: https://milnepublishing.geneseo.edu/fundamentals-function-form/chapter/15-nonharmonic-tones/
* Source type: web-page
* Accessed: 2026-06-04
* Verification: medium - Page text was checked for passing and neighbor tone context.
* Cache key: `sources/sustained-vertical-dissonance-2026-06-04.json`
* Notes: Pedagogical source for nonharmonic tones and metrical displacement.

## parncutt-keyboard-fingering-1997

* Citation: Parncutt, Richard, John A. Sloboda, Eric F. Clarke, Matti Raekallio, and Peter Desain. "An Ergonomic Model of Keyboard Fingering for Melodic Fragments." *Music Perception*, 1997.
* Stable identifier: https://doi.org/10.2307/40285730
* Source type: article
* Accessed: 2026-06-02
* Verification: medium - DOI and bibliographic metadata were checked through indexed source metadata.
* Cache key: `references/doi/parncutt-1997-keyboard-fingering`
* Notes: Ergonomic keyboard-fingering model for melodic fragments.

## jacobs-keyboard-fingering-2001

* Citation: Jacobs, J. Pieter. "Refinements to the Ergonomic Model for Keyboard Fingering of Parncutt, Sloboda, Clarke, Raekallio, and Desain." *Music Perception* 18, no. 4, 2001, pp. 505-511.
* Stable identifier: https://doi.org/10.1525/mp.2001.18.4.505
* Source type: article
* Accessed: 2026-06-02
* Verification: medium - DOI, publisher, abstract, and bibliographic fields were checked through indexed source metadata.
* Cache key: `references/doi/jacobs-2001-keyboard-fingering`
* Notes: Refines the prior ergonomic model and highlights physical key-distance considerations.

## guan-playable-piano-fingering-2022

* Citation: Guan, Xin, Haoyue Zhao, and Qiang Li. "Estimation of playable piano fingering by pitch-difference fingering match model." *EURASIP Journal on Audio, Speech, and Music Processing*, 2022.
* Stable identifier: https://doi.org/10.1186/s13636-022-00237-8
* Source type: article
* Accessed: 2026-06-02
* Verification: high - publisher page was checked for DOI, authors, abstract, and method summary.
* Cache key: `references/doi/guan-2022-playable-piano-fingering`
* Notes: Modern fingering-feasibility model useful as future evidence for sequence-level piano playability.

## britannica-keyboard-compass

* Citation: Encyclopaedia Britannica. "Keyboard instrument: Special Arrangements."
* Stable identifier: https://www.britannica.com/art/keyboard-instrument/Special-key-arrangements
* Source type: web-page
* Accessed: 2026-06-02
* Verification: medium - page text was checked for keyboard compass and octave-span context.
* Cache key: `references/url/britannica-keyboard-size-range`
* Notes: General reference for historical keyboard compass and physical octave-span context.

## finale-piano-range

* Citation: Finale. "Ranges." *Finale 2014 User Manual*.
* Stable identifier: https://usermanuals.finalemusic.com/Finale2014Win/Content/Finale/Ranges.htm
* Source type: documentation
* Accessed: 2026-06-02
* Verification: medium - manual page was checked for piano fixed range and MIDI pitch numbers.
* Cache key: `references/url/finale-instrument-ranges`
* Notes: Convenient fixed-range reference for piano compass in MIDI pitch terms.

## murobox-faq-ranges

* Citation: Muro Box. "Learn How to Use Muro Box."
* Stable identifier: https://murobox.com/en/faq/
* Source type: product-documentation
* Accessed: 2026-06-02
* Verification: high - official FAQ was checked for pitch-set, single-track MIDI, simultaneous-note, and repeated-note speed constraints.
* Cache key: `references/url/murobox-faq-ranges`
* Notes: Official programmable music-box constraints for supported pitch sets and mechanism limits.

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
* Verification: medium - GitHub README, npm package metadata, published package files, and license file were checked for browser support, package relationship, AudioWorklet processor packaging, and Apache-2.0 license.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: Browser-facing synthesizer library that depends on SpessaSynth Core and uses a WebAudio worklet processor. `4.3.6` was reviewed for the SoundFont adapter prototype.

## spessasynth-core-github

* Citation: Spessasynth, "spessasynth_core."
* Stable identifier: https://github.com/spessasus/spessasynth_core
* Source type: software-documentation
* Accessed: 2026-06-01
* Verification: medium - GitHub README, npm package metadata, published package files, and license file were checked for SF2/SF3/DLS support, dependency surface, and Apache-2.0 license.
* Cache key: sources/playback-source-license-feasibility-2026-06-01.json
* Notes: SoundFont parsing and synthesis core for SpessaSynth. `4.3.7` was reviewed and pinned for the SoundFont adapter prototype.

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

## music21-corpus-documentation

* Citation: music21. "music21.corpus documentation."
* Stable identifier: https://music21.org/music21docs/moduleReference/moduleCorpus.html
* Source type: documentation
* Accessed: 2026-05-17
* Verification: medium - official documentation metadata and corpus access scope were checked; individual corpus-item redistribution terms were not exhaustively verified.
* Cache key: `music21-corpus-docs`
* Notes: Documentation for local and core corpus access across supported score representations. License and redistribution status remain item-specific.

## kernscores-corpus

* Citation: KernScores. "KernScores."
* Stable identifier: https://kern.humdrum.org/
* Source type: corpus
* Accessed: 2026-05-17
* Verification: medium - corpus landing page and Humdrum-oriented score access were checked; individual work rights require manifest-level verification.
* Cache key: `kernscores-home`
* Notes: Public score library and potential Humdrum `**kern` ingestion source.

## humdrum-project-home

* Citation: Humdrum. "Humdrum."
* Stable identifier: https://www.humdrum.org/
* Source type: project-documentation
* Accessed: 2026-07-16
* Verification: high - official project documentation was checked for the relationship between Humdrum, KernScores, and the maintained data repositories.
* Cache key: `sources/reference-corpus-pinned-sources-2026-07-16.json`
* Notes: Project entry point for Humdrum tooling and its score-data ecosystem.

## humdrum-bach-wtc-data

* Citation: Humdrum data repository. "bach-wtc."
* Stable identifier: https://github.com/humdrum-tools/bach-wtc
* Source type: score-corpus-repository
* Accessed: 2026-07-16
* Verification: high - official repository metadata, pinned revision, selected score paths, and embedded source-rights records were checked.
* Cache key: `sources/reference-corpus-pinned-sources-2026-07-16.json`
* Notes: Digital WTC score data. Availability in the repository does not by itself grant downstream redistribution rights.

## humdrum-mozart-quartets-data

* Citation: MuseData Humdrum repository. "humdrum-mozart-quartets."
* Stable identifier: https://github.com/musedata/humdrum-mozart-quartets
* Source type: score-corpus-repository
* Accessed: 2026-07-16
* Verification: high - official repository metadata, pinned revision, selected movement path, four-voice layout, and embedded source-rights records were checked.
* Cache key: `sources/reference-corpus-pinned-sources-2026-07-16.json`
* Notes: Digital Mozart quartet score data including the K. 546 fugue movement. Availability does not by itself grant downstream redistribution rights.

## fang-bach-or-mock-2020

* Citation: Fang, Alexander, Alisa Liu, Prem Seetharaman, and Bryan Pardo. "Bach or Mock? A Grading Function for Chorales in the Style of J.S. Bach." arXiv:2006.13329, 2020.
* Stable identifier: https://arxiv.org/abs/2006.13329
* Source type: article
* Accessed: 2026-07-16
* Verification: high - arXiv metadata and abstract were checked for authors, date, interpretable musical-feature evaluation, and expert-comparison scope.
* Cache key: `fang-bach-or-mock-2020`
* Notes: Interpretable, musically motivated grading features for generated four-part Bach-style chorales.

## zhu-bachmmmachine-2021

* Citation: Zhu, Yunyao, Stephen Hahn, Simon Mak, Yue Jiang, and Cynthia Rudin. "BacHMMachine: An Interpretable and Scalable Model for Algorithmic Harmonization for Four-part Baroque Chorales." arXiv:2109.07623, 2021.
* Stable identifier: https://arxiv.org/abs/2109.07623
* Source type: article
* Accessed: 2026-07-16
* Verification: high - arXiv metadata and abstract were checked for authors, date, theory-guided/data-driven model boundary, and interpretability scope.
* Cache key: `zhu-bachmmmachine-2021`
* Notes: Theory-guided probabilistic harmonization model that separates explicit compositional structure from learned corpus distributions.

## shapira-voice-leading-fugue-2023

* Citation: Shapira, Yuval. "Voice Leading in Fugue." Doctoral dissertation, CUNY Graduate Center, 2023.
* Stable identifier: https://academicworks.cuny.edu/gc_etds/5186/
* Source type: dissertation
* Accessed: 2026-07-16
* Verification: high - institutional repository metadata and abstract were checked for author, degree date, repertoire, and context-dependent fugal-entry claim.
* Cache key: `shapira-fugue-voice-leading-2023`
* Notes: Analytical study of voice leading in Bach WTC fugues that distinguishes recurring thematic material from its changing tonal and voice-leading context.

## marlowe-fugue-form-2020

* Citation: Marlowe, Sarah. "Resolving Tensions between Outer Form and Inner Form in Fugue: A Comparative Analysis of J. S. Bach's Fugue in D minor (WTC I)." *Music Theory Online* 26, no. 3, 2020.
* Stable identifier: https://mtosmt.org/issues/mto.20.26.3/mto.20.26.3.marlowe.html
* Source type: article
* Accessed: 2026-07-16
* Verification: high - journal issue metadata, article page, and abstract were checked for author, publication details, repertoire, and formal/tonal analytical scope.
* Cache key: `marlowe-fugue-form-2020`
* Notes: Comparative analysis separating foreground formal design from deeper tonal structure in a Bach fugue.

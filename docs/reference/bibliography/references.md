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

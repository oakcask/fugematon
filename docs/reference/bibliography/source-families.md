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

## common-practice-fugue-episodes

* Scope: Historical and pedagogical evidence for subject-free episodes, codettas, motivic fragmentation, sequencing, imitation, inversion, and episode length variation in common-practice fugue.
* Typical use: Calibrate Fugematon episode and free-counterpoint planning so short subject-free spans are not rejected solely by length, while generic filler is not accepted merely because it keeps texture active.
* Reference ids: `prout-wtc-48-fugues`, `pugetsound-fugue-analysis-bwv847`, `teoria-bwv846-analysis`
* Verification level: score-example-checked
* Limits: These sources do not define fixed measure-count thresholds for generated episodes and do not replace seed-specific score-window review.

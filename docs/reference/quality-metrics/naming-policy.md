# Metric Naming Policy

Current な metric、gate、review surface は、導入された Phase ではなく音楽的な意味で命名します。Phase 名は履歴、計画、完了記録に残し、現在の採否判断や diagnostics contract を読む入口には使わない方針です。

## Rules

* Current な diagnostics、review bundle、quality evidence の field 名は、何を観察するかを表す。
* `Gate` は pass/fail policy を返すものだけに使う。CI blocker ではない review surface には `Review`、`Evidence`、`Trace`、`Acceptance` などを使う。
* Phase 文書、古い review 文書、履歴用テスト名は Phase 名を保持してよい。
* 公開 JSON や exported TypeScript 型の rename は、schema version と compatibility alias を伴って段階的に行う。
* Docs の current reference では新名を主に書き、必要な場合だけ「formerly `phase...`」として旧名を併記する。

## Current Migration Map

| Historical name | Current name | Meaning |
| --- | --- | --- |
| `phase11Review` | `texturePlanningReview` | register、functional thinning、state grammar、metrical harmony の planning summary。 |
| `phase12Review` | `phraseRepetitionReview` | subject stem、answer transform、fragment derivation、phrase function、section-state pattern の反復 summary。 |
| `phase13QReview` | `localSentinelCandidateTrace` | local sentinel を selected candidate の section、entry、voice pair、resolution deadline へ戻す trace。 |
| `phase13RReview` | `phraseConvergenceReview` | per-score phrase convergence と legacy default path の review signal。 |
| `qualityVector.phase13VReview` | `qualityVector.scoreBeautyEvidence` | line agency、entry formula novelty、counter-subject survivability、long-window development の adoption evidence。 |
| `phase13ZReview` | `phraseDevelopmentReview` | continuation window の phrase development と mechanical reuse の review signal。 |
| `phase14DissonanceTriage` | `dissonanceTriage` | weak-passing、passing-neighbor/offbeat、entry clash を score-window 単位で読む triage。 |
| `phase14ScoreWindowAcceptance` | `scoreWindowAcceptance` | entry continuity、dissonance、voice-pair、counter-subject、phrase development、metric explanation をまとめた score-window acceptance surface。 |
| `phase59Gate` | `baselineBeautyGate` | fixed review seed の baseline beauty gate。 |
| `phase510Gate` | `voiceIndependenceGate` | voice independence と entry-support stability gate。 |
| `phase511Gate` | `rotationRobustnessGate` | fixed seed への過適合と rotation seed fragility の gate。 |
| `phase6Gate` | `melodyTextureGate` | melody、texture、entry harmony、ornament placement の gate。 |
| `phase7Gate` | `contourMotionGate` | bass-upper / outer-voice contour motion gate。 |
| `phase7BGate` | `reviewGatePolicy` | hard failure、review-required、warning、manual listening を分ける policy surface。 |

## Compatibility

The next implementation slices should expose current names first and keep historical names as aliases until the relevant public contract has a documented schema transition. New code should read the current names. Compatibility aliases should not introduce separate computation paths.

# Reference Evaluation Learning Loop Completion Review

Status: implementation complete; learned selection adoption deferred.

この review は [Reference Evaluation Learning Loop](../phases/reference-evaluation-learning-loop.md) と [Pairwise Listening Review Tool](../phases/pairwise-listening-review-tool.md) の implementation completion evidence をまとめる。Human preference superiority や default model promotion は主張しない。

## Implemented Contract

* `packages/evaluation` は normalized reference score、corpus manifest、共通 contextual feature、blind pairwise response、bounded logistic model、shadow report、active-learning queue、pure playback state を versioned contract として所有する。
* CLI は `reference-validate`、`reference-import`、`review-ab`、`listen`、`evaluation-loop`、`review-ab-queue` を提供する。Queue 再生成は source bundle と hidden mapping の一致を検証し、優先順の seed だけで次の blind bundle を作る。
* `pairwise-responses-merge` は複数の response artifact を個別に検証し、同一 label を canonical dedup、競合 label を rejectして、merged responseとlistening-gapを含むsummaryをatomic出力する。
* Local listening server は loopback のみで、bundle root、symlink、path traversal、asset hash、response revision を検証する。回答は別 artifact へ atomic save され、partial session、resume、reveal、analysis-assisted revision を区別する。
* 回答前 session API と DOM は model、filename、feature、diagnostics を公開しない。回答保存後だけ side mapping、同期 piano roll、contextual feature delta、diagnostics、local sentinel evidence を表示する。
* Score asset 内の timebase、meter、tempo、actual end を A/B 間で照合し、requested lengthとの共通範囲だけを再生する。Sessionはbar-aligned opening / terminal regionを持ち、response provenanceはaccumulated duration、bounded listened ranges、full / focused use、renderer、performance profile、session schemaを記録する。

## Stable Feature Contract Audit

作品固有のsection idをfeature idへ入れず、`exposition`、`episode`、`subject-return`、`stretto-like` のrole単位へ集約した。Reference 3作品とstandard 22の全44 generated scoreは、同じ77 feature idを同じ順序で持つ。77列はnote transition、推測non-chord preparation / resolution、exact / pitch-class unison、voice-pair motion / rhythm / spacing、subject / answer identity、entry support / friction / continuity、section role、cadence、entry voice balance、whole-score formを含む。

Feature loaderはunknown、duplicate、missing id、non-finite valueをfail closedにし、annotation欠落は列欠落や0ではなくavailabilityとconfidenceで保持する。Pairwise model loaderもschemaだけでなくoptimizer provenance、normalization、weight、validation、theory reviewの構造を検証する。

## Corpus And Reference Spot Check

`reference-corpus/manifest.json` は次の user-obtained Humdrum source を pinned revision と checksum で管理する。Repository access は redistribution permission とみなさず、raw encoding は commit しない。

| Work | Intended use | Split | Rights boundary |
| --- | --- | --- | --- |
| Bach WTC I Fugue 1, BWV 846 | initial form and local reference | train | user-obtained; electronic-edition rights reserved |
| Bach WTC I Fugue 5, BWV 850 | work holdout | work-holdout | user-obtained; electronic-edition rights reserved |
| Mozart K. 546 Fugue | non-Bach style breadth | composer-holdout | user-obtained; electronic-edition rights reserved |

3作品は checksum gate を通して deterministic import できた。Importer は4 logical voice、tie、spine split / merge / exchange、key、meter、480 TPQを保持する。Source annotation がない entry、section、terminal cadence は `inferred` と低い confidence を持ち、ground truth にはしない。

BWV 846 の spot check では739 notes、25 inferred entries、3 inferred sections、1 terminal cadenceを得た。Exposition の最初の4 entry は alto 240、soprano 3120、tenor 6000、bass 8880 ticks に局在し、entry support、boundary continuity、accented friction / resolution は同じ evidence pointer から譜面窓へ戻れた。Section texture contrast、cadence approach、subject return、form balance、interval-motive concentration、long-window development、terminal voice activityも別軸として保持された。Role annotation がない外部譜の counter-subject feature は0ではなく `missing-annotation` になる。

## Standard 22 And Shadow Evidence

129600 requested ticks の標準22 seedで baseline / variant 計44譜を生成した。Bundle は22 comparisons、全MIDI / score asset hash valid、blind order は baseline A 12 / B 10だった。Class coverage は representative 2、boundary 2、targeted 10、rotation 6、adversarial 2である。Loopback server は全assetを検証し、先頭と末尾をlazy取得できた。

Human label の代用として diagnostics由来の22 oracle fixtureを明示的に `labelSource: oracle` として使った。これは training / shadow pipeline correctness の evidence であり、human preference accuracy ではない。Artifact は `trainingDataKind: synthetic-or-agent`、shadow mode、hard-constraint override prohibitedを保持した。Subject-family跨ぎを最も厳しいholdoutへ寄せることで、最初に検出された split leakage を解消した。

Fixture model は22 comparisonsをshadow評価し、shadow 前後の実 ScoreEvent JSON、MIDI、comparison diagnostics、hidden analysis bytesのfingerprintは一致した。Manifest hashと実asset bytesの不一致はshadow前にrejectする。4/4 が18件、3/4 が4件で、subject / answer / fragment と exposition / episode / subject-return / stretto-like の strataを復元した。各比較は8 quality axisとaggregate distance、sentinel種別deltaを保持する。Model weightには theory-sign conflictが残ったため全比較を `review-required` とし、default promotionを禁止した。Queueは12件を決定的に選び、未充足 classとして `fixed` と `composer-holdout` を明示した。Queueから次回blind bundleを再生成するintegration testが通った。

Prior shadow artifactを指定するとmodel update前後のpreference flipを比較できる。Promotion requestは別のversioned adoption reviewを生成し、human preference、theory sign、generation invariance、hard failure、coverage、holdout baseline comparison、localized evidenceを個別に示す。未充足項目を推測でpassにせず、shadow modelを暗黙にdefaultへ昇格しない。

## Agent Score Review

`music-theory-review` と agent score review policy に従い、variantの representative `bach-001`、boundary `minor-entry`、rotation `angular-answer`、adversarial `contrary-answer` / `dense-modal` を確認した。全5譜は4声の初回 subject / answer entry、section state、終端processを保持し、standard 22全体のpublic hard failureは0だった。

* `bach-001` と `minor-entry`: local sentinel と phrase-convergence findingは0。Quality-vector distance増加は採用理由にせず、score blockerも認めなかった。
* `angular-answer`: strong-beat short entry note と leap recovery が review-required。Aggregateだけで棄却せず、rotation score concernとしてqueueへ残す。
* `contrary-answer`: short strong-beat entry noteがreview-required。Hard failureや局在した未解決 blockerではない。
* `dense-modal`: ticks 22560 と114720のstretto-like tenor entryに未解決 severe-interval sentinelがあり、類似した遠隔windowも確認した。いずれも弱拍から次の和音へ進む局所摩擦で、現時点では `score-concern` / repetition review とし、高確信 `score-blocking` にはしない。

未解決の高確信 `score-blocking` finding はない。数値改善は generator improvement と呼ばず、今回の変更を schema / diagnostics / workflow implementation と分類する。Oracle shadowの数値を model superiority や default selection adoptionに使わない。

## Browser And Audio Evidence

Chromium browser inspection は desktop 1280x900 と narrow 390x844で完了した。5 smoke testsが次を確認した。

* 回答前DOM、accessible name、URLに baseline / variant / model identityがない。
* A / B oscillator graphにnon-zero sourceがあり、side switchで先のsourceが停止する。
* Shared seekとfocused loopは両sideを同じscheduled startから開始する。
* Keyboard choice、text-input shortcut suppression、autosave、refresh resume、reveal gateが動作する。
* Post-choice piano rollはnon-empty pixelsを描き、feature deltaとdiagnosticsを表示する。
* Renderer failureは `cannot-judge` と `renderer-mismatch` に変換される。
* Desktop / narrow screenshotにcontrol loss、overflow、blank analysis surfaceはない。Focused-region selector、tick bounds、comparable range、meterもnarrow viewportで利用できる。

Cross-device speaker / browser音質と長時間疲労は未確認で、non-blocking `listening-gap` とする。Human pairwise preferenceも未実施である。

## Verification And Scope

`pnpm build`、`pnpm lint`、focused evaluation / CLI tests、loopback server integration、Playwright inspectionを実行する。Corpus schema / checksum / import determinism、feature determinism / invariance、pairwise schema、model fit / loader、shadow byte invarianceは `ci-blocking`。Standard 22 distribution、model weights、queue coverage、score concernsは `review-required`。Human preferenceとcross-device audioは `manual-listening`。

Learned modelはshadowのまま維持する。Default selectionへの昇格には、human labels、fixed / composer-holdout coverage、theory-sign conflict解消、別のadoption reviewが必要である。

## Requirement Audit

| Scope | Current evidence |
| --- | --- |
| REL-1 | Versioned manifest、rights / checksum gate、Bach work holdout、Mozart composer holdout、MusicXML / Humdrum import、split leakage / invalid-field tests、3 pinned source imports。 |
| REL-2 | 77-column role-stable schema、reference / generated parity、transpose / tick / voice controls、evidence pointers、availability / confidence、unknown / missing / duplicate fail-closed tests。 |
| REL-3 | Standard / focused blind bundle、opaque side assets、balanced deterministic order、runtime label validation、canonical merge / dedup / conflict、empty listening-gap summary。 |
| REL-4 | Seeded bounded logistic fit、byte-stable artifact、work / composer / subject split validation、no-model cases、calibration / coverage、contribution reconstruction、hard / theory / schema adoption guards。 |
| REL-5 | 22-comparison shadow explanation、8 axis＋aggregate quality delta、sentinel-kind delta、generation fingerprint invariance、false-confidence / missing-feature / out-of-style OOD、disagreement queue。 |
| REL-6 | Deterministic risk / uncertainty / coverage queue、subject-family cap、prior-model flip comparison、queue-to-bundle integration、missing-class report、separate non-automatic adoption review。 |

| Scope | Current evidence |
| --- | --- |
| PLR-1 | Loopback startup validates bundle / response schema、unique ids、hidden mapping、asset existence / hash / boundary / symlink、score-level timebase / meter / tempo context、revision conflict。 |
| PLR-2 | Pre-choice API / DOM / URL blindness、opaque tokens、post-save reveal audit、analysis-assisted revision exclusion。 |
| PLR-3 | One active side、stop-on-switch、shared seek / restart / sustained-note offset、full / bar-aligned focused regions、comparable range、renderer failure handling、lazy score loading。 |
| PLR-4 | Pointer / keyboard actions、text-input suppression、progress / filters / navigation、skip confirmation、autosave / refresh / process resume。 |
| PLR-5 | Four final choices、bounded confidence、complete composition / rendering vocabularies、optional note / region、contradiction warnings、rendering-only exclusion。 |
| PLR-6 | Per-side plays、bounded range union、accumulated duration、switch count、full / loop use、choice / reveal / revision audit、renderer / profile / schema provenance。 |
| PLR-7 | Separate versioned response、atomic rename、optimistic revision、partial / complete canonical artifact、draft retention and retry、source bundle immutability。 |
| PLR-8 | Saved-choice reveal gate、side mapping、non-empty synchronized piano rolls、feature delta、diagnostics / sentinel evidence、reviewer-tag comparison。 |

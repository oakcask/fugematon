# Quality Vector Metrics

Quality vector は Phase 13 以降の review/adoption model です。単独 metric の絶対しきい値を動かすのではなく、normalized axes、seed aggregate、local sentinel、A/B delta、manual listening gap をまとめて読むためのものです。

## Contract

* `qualityVector.schemaVersion` は current schema shape を表す。
* `qualityVector.modelVersion` は expected max、weight、sentinel logic の解釈 version を表す。
* `qualityProfileComparison` は seed set 全体の aggregate review summary であり、generator scoring ではない。
* `qualityVectorDistance` は weighted normalized axes の距離。改善 signal にはなるが、単独では採用条件にしない。

## Axes

| Axis | Meaning | Review focus |
| --- | --- | --- |
| `exactSamePitchUnisonDuration` | exact same-pitch overlap の合計 duration。 | 同じ MIDI pitch の重なりが声部独立を壊していないか。 |
| `pitchClassUnisonDuration` | octave 違いを含む pitch-class unison の合計 duration。 | 低声部や cross-register の長い重なり。 |
| `longestExactSamePitchSpan` | exact same-pitch overlap の最長連続 span。 | 短い doubling ではなく、耳につく持続か。 |
| `longestPitchClassUnisonSpan` | pitch-class unison の最長連続 span。 | bass-tenor、bass-alto、outer voices などの長い lockstep。 |
| `durationBasedLockstep` | 声部ペアが duration 単位で同時に動く量。 | exact unison でなくても rhythm と motion が固定化していないか。 |
| `sopranoRepeatedNotePressure` | soprano の同音反復 pressure。 | ornament や contour release なしに高声部が停滞していないか。 |
| `entrySevereIntervalDuration` | entry 周辺の severe intervals の duration。 | count ではなく聴感上の持続として読む。 |
| `unresolvedEntrySevereIntervalDuration` | resolution deadline までに説明されない severe interval duration。 | entry harmony の未解決 risk。 |

## Grouping Keys

Quality vector は axis だけでなく grouping key も見る必要があります。

* `styleProfile`: tonal、modal、popular-tolerant などを混ぜて hard gate にしない。
* `sectionRole`: exposition、episode、cadence、stretto-like などの役割で同じ値の意味が変わる。
* `voicePair`: low-voice pair と outer voices は聴感上の影響が違う。
* `voice` / `register`: soprano high register の repeated note は特に目立つ。
* `entryRole`: subject / answer / return の文脈で interval の扱いが変わる。

## Local Sentinels

Local sentinel は、aggregate が良くても局所的に耳につく欠陥を隠さないための summary です。

| Sentinel | Meaning |
| --- | --- |
| `long-exact-same-pitch-unison` | exact same-pitch unison が長く続く箇所。 |
| `long-pitch-class-unison` | pitch-class unison が長く続く箇所。 |
| `high-soprano-repeated-note-pressure` | high soprano の同音反復が ornament / contour release なしに続く箇所。 |
| `unresolved-entry-severe-interval` | entry 周辺の severe interval が解決されない箇所。 |

Sentinel は seed、section、voice pair、代表 tick、音楽的症状へ戻せる必要があります。戻せない model update は採用しないでください。

## Review Status

`quality-review-required` は失敗ではありません。Phase 13 は review/adoption model の整備であり、selected output を直接変えません。Phase 13Q 以降の生成変更では、quality vector distance、local sentinel regression、reference profile、manual listening gap を合わせて A/B adoption を判断します。

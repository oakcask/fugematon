# Reference Profile Metrics

Reference profile は、Fugematon と参照作品を同じ diagnostics vocabulary で比較するための review model です。Phase 7A 以降は、unison、shared rhythm、stepwise motion などをゼロ要求にせず、正規化された分布からの外れ方として扱います。

## Reading Rule

* `outsideReferenceCount` は review-required signal であり、hard failure ではない。
* count は曲長や entry 数の差で膨らむため、必ず normalizer と一緒に読む。
* Bach などの参照作品にも出る現象は、文脈なしに forbidden としない。
* modal seed、tonal fugue、chorale-like support、popular-tolerant profile は混ぜて hard gate にしない。

## Current Axes

| Axis | Normalizer | Meaning |
| --- | --- | --- |
| `sharedRhythmOverlapPerVoicePairQuarter` | estimated active voice-pair quarter notes | 声部ペアの rhythm lockstep density。ゼロ要求ではなく density として比較する。 |
| `unisonOverlapPerVoicePairQuarter` | estimated active voice-pair quarter notes | pitch-class unison の density。octave 違いを含み、文脈つきで許容される。 |
| `samePitchOverlapPerVoicePairQuarter` | estimated active voice-pair quarter notes | exact same-pitch overlap の density。`music-box-*` では hard failure の profile contract、non-music-box では稀であるべき review-required signal として短い doubling と局所文脈を確認する。 |
| `severeEntryIntervalPerEntry` | subject entry count | entry 周辺の seconds / sevenths の密度。長尺 score で count が膨らまないよう entry 数で割る。 |
| `unresolvedSevereEntryIntervalPerEntry` | subject entry count | resolution deadline までに説明されない severe interval。entry harmony の強い review signal。 |
| `leapRecoveryMissesPerQuarter` | score quarter notes | 旋律線の大跳躍回収 risk。 |
| `freeCounterpointStepwiseRunRatio` | already normalized | free counterpoint の順次進行比率。自然な順次進行と mechanical filler を区別する。 |
| `freeCounterpointRepeatedDegreePatternsPerQuarter` | score quarter notes | 同じ degree pattern の反復 density。 |
| `unsupportedSoloRunsPerSection` | section count | cadence や phrase boundary で説明できない solo texture。 |
| `abruptTextureDropsPerSection` | section count | 急な texture thinning。section 単位で比較する。 |

## Adoption Use

Reference profile comparison は A/B review の一部です。採用候補は、hard constraints を維持したうえで、reference outside count、candidate pool oracle、quality vector、local sentinels、manual listening gap を合わせて判断します。単独 axis の改善だけで model adoption としないでください。

# Diagnostics Metrics

`GenerationDiagnostics` の主要指標の意味です。ここでは current な読み方をまとめます。古い Phase での導入理由は review docs を参照してください。

## Hard Constraint Metrics

| Metric | Meaning | Current policy |
| --- | --- | --- |
| `rangeViolations` | 声部の音域外 note。 | hard failure |
| `voiceCrossings` | 声部間の上下関係が交差する箇所。 | hard failure |
| `subjectIdentityViolations` | subject entry が想定 scale-degree pattern と一致しない箇所。 | hard failure |
| `answerPlanViolations` | true answer / tonal answer の計画と実際の entry が矛盾する箇所。 | hard failure |
| `keyMetadataMismatches` | key signature、entry local key、実 pitch sequence の矛盾。 | hard failure |
| `unresolvedDissonanceCount` | 解決されない不協和の疑い。 | hard failure |
| `allVoiceSilenceGapCount` | 全声部が同時に無音になる gap。 | hard failure |

## Voice Independence

| Metric | Meaning | Read as |
| --- | --- | --- |
| `samePitchOverlapCount` | 複数声部が同じ MIDI pitch を同時に鳴らす exact same-pitch overlap。 | 同じ楽器 texture では声部独立を壊しやすい。開始、終止、短い経過的 doubling で説明できるか確認する。 |
| `unisonOverlapCount` | 複数声部が同じ pitch class を同時に鳴らす overlap。octave 違いを含む。 | 文脈つきでは許容されるため、ゼロ要求にはしない。duration と声部ペアで読む。 |
| `sharedRhythmOverlapCount` | 声部ペアが同じ rhythm window で動く重なり。 | lockstep の疑い。subject entry や cadence の機能的同期か、機械的な同型進行かを区別する。 |
| `sameDirectionMotionCount` | 声部が同方向に動く重なり。 | parallel perfect とは別。bass と上声が長く同じ概形へ流れる場合は review signal。 |

## Entry Harmony

| Metric | Meaning | Read as |
| --- | --- | --- |
| `entrySupportInstabilityCount` | subject / answer entry 周辺の支え声部が和声的に不安定な箇所。 | root、chord member、avoid note、解決先を entry 単位で読む。 |
| `severeEntryIntervalCount` | entry 周辺の m2、M2、m7、M7 など聴感上目立つ interval。 | count だけでなく duration と解決文脈を見る。 |
| `unresolvedSevereEntryIntervalCount` | severe interval が resolution deadline までに説明されない箇所。 | entry harmony の主要 review signal。Phase 13 以降は duration axis も見る。 |
| `entryBoundaryContinuity` | subject / answer entry 境界で、外声が同時に再発音しているか、delayed / carried support があるかを読む summary。 | Phase 13X は初回 bass entry と post-exposition bass entry を分ける。Phase 13Y 以降は entry voice、entry order、already-entered voices で一般化し、Phase 14 以降は 1 声 carry + 2 外声 reset を score-window acceptance から分ける。playback smoothing ではなく score continuity で説明する。 |
| `phase14DissonanceTriage` | Phase 13Z 後の weak-passing / passing-neighbor / offbeat semitone clash と entry adjacent-second / unresolved accented clash を score-window 単位で読む summary。 | Phase 14A0 の review-required evidence。Seed、section、voice、role、intent へ戻して読み、単独の CI blocker にはしない。 |
| `phase14ScoreWindowAcceptance` | Phase 14A の score-window acceptance surface。important entry、dissonance triage、active voice-pair span、counter-subject survival、phrase development、metric explanation を同じ window list へ束ねる。 | Aggregate metrics より先に読む review surface。各 window の tick、state、voices、roles、classification、theory basis、response から、accepted context / review-required / generator response / diagnostic context を分ける。 |

## Melody And Texture

| Metric | Meaning | Read as |
| --- | --- | --- |
| `leapRecoveryMisses` | 大跳躍後に反行または順次進行で回収されない箇所。 | 旋律線の歌いやすさの signal。安全な順次型に偏りすぎていないかも確認する。 |
| `repeatedPitchRunCount` | 同じ pitch の反復 run。 | 高声部では耳につきやすい。Phase 13 の soprano repeated-note pressure と合わせて読む。 |
| `soloTexture` | cadence や phrase boundary で説明できない薄い texture。 | unsupported solo run、abrupt texture drop、solo voice imbalance を分けて読む。 |
| `bassAnswerTailTexture` | 初回 bass answer 後の continuation / free-counterpoint tail が bass-only、zero-outside、one-outside-voice へ薄くなるかを見る focused summary。 | Phase 13X2 で追加。`allVoiceSilenceGapCount` が 0 でも、他パートが止まったように聞こえる post-answer thinning を separate review signal として読む。completion baseline は zero-outside / bass-only を blocker とし、one-outside は Phase 13Y/13Z/14 で隠してはいけない review signal として残す。 |
| `stepwisePattern` | 長い順次進行や同じ degree pattern の横断反復。 | 自然な旋律運動と mechanical filler を区別する。 |
| `pitchContourMotion` | bass-upper / outer-voice の同方向、反行、概形 motion。 | Phase 7B 以降は hard failure ではなく review signal。 |
| `lowerVoiceVocality` | bass/tenor の support line が歌える線としてつながっているか。 | 長い support note が前後の小さな melodic connection、cadence、phrase boundary で説明できるかと、短い support 同士が同音保持や大きい跳躍に偏らないかを読む。 |

## Subject And Phrase Diversity

| Metric | Meaning | Read as |
| --- | --- | --- |
| `phase12Review.subjectStemFamilies` | 1つの generated score 内で subject stem / subject-fragment family がどれだけ集中しているか。 | Per-score phrase convergence の signal。function-bearing return と mechanical reuse を分けて読む。 |
| `phase13RReview` | default path、4-section pattern、entry-pattern family、subject stem、subject-fragment concentration の Phase 13R review summary。 | 1曲内の convergence と legacy default path の検出には使えるが、seed 横断の初期主題類似は bundle-level summary と合わせて読む。 |
| `phase13ZReview` | continuation window ごとに subject stem、phrase function、entry voice、cadence、local key、recent reuse、`new-material` / `function-bearing-recurrence` / `mechanical-reuse` judgement を出す。 | Phase 13Z 以降の long-run phrase development signal。集計値だけで採否せず、譜面上で recurrence が役割を変えているかを読む。 |
| `subjectFamilyDiversity` | Review bundle 全体で、initial subject degree/rhythm/contour/tail family が何種類に分散しているか。 | 複数 seed が同じ少数の主題形へ収束していないかを見る corpus-level review signal。A/B summary は unique family count、top-family share、fragment share の delta を出す。 |

## Review Summaries

| Field | Meaning |
| --- | --- |
| `candidatePoolOracle` | selected candidate と alternatives を比べ、selection model で直せる問題か、generator / section planner が足りない問題かを切り分ける。Phase 13Q 以降は viable candidate diversity も出す。 |
| `phase11Review` | register、functional thinning、state grammar、metrical harmony の summary。 |
| `phase12Review` | subject stem、answer transform、fragment derivation、phrase function、section-state pattern の反復 summary。 |
| `entryBoundaryContinuity` | Phase 13W/13X の bass-entry boundary summary から、Phase 13Y で generalized entry-continuity summary へ広げた。first bass entry window、post-exposition bass compatibility count、generalized important-entry windows、entry voice、entry order、already-entered voices、outside onset、entry で切れた外声、carried support、suspension/resolution、delayed support、staggered continuation、prepared collective articulation、unsupported entry-local thinning、synchronized reset classification、one-voice carry with outside reset classification を持つ。 |
| `qualityVector` | Phase 13 以降の normalized review/adoption signal。詳細は [quality vector](quality-vector.md)。 |
| `phase13QReview` | Phase 13 local sentinel を selected candidate explanation の section、entry、voice pair、resolution deadline へ戻す review-only bridge。 |
| `phase13RReview` | Phase 13R の per-score convergence review signal。Seed 横断の主題語彙崩壊は bundle-level `subjectFamilyDiversity` と合わせて読む。 |
| `phase13ZReview` | Phase 13Z の windowed phrase-development review signal。Remaining mechanical-reuse windows は Phase 14 の score-led beauty review に渡す。 |
| `phase14DissonanceTriage` | Phase 14A0 の focused dissonance tradeoff summary。weak-passing semitone clash ticks、passing-neighbor/offbeat semitone clash ticks、entry adjacent-second friction count、unresolved accented entry clash count、代表 score-window を持つ。 |
| `phase14ScoreWindowAcceptance` | Phase 14A の score-window acceptance summary。important entry、dissonance、voice-pair、counter-subject、phrase-development、metric-explanation の window count と response count を持ち、代表 window には theory basis と project response を含める。 |

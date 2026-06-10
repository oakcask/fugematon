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
| `samePitchOverlapCount` | 複数声部が同じ MIDI pitch を同時に鳴らす exact same-pitch overlap。 | `music-box-*` writing profile では同じ櫛歯を同時に二声が要求するため hard failure。non-music-box profile では、将来の profile policy が昇格しない限り review-required signal として、開始、終止、短い経過的 doubling で説明できるか確認する。 |
| `unisonOverlapCount` | 複数声部が同じ pitch class を同時に鳴らす overlap。octave 違いを含む。 | pitch-class unison は music-box でも review-only。文脈つきでは許容されるため、ゼロ要求にはしない。duration と声部ペアで読む。 |
| `sharedRhythmOverlapCount` | 声部ペアが同じ rhythm window で動く重なり。 | lockstep の疑い。subject entry や cadence の機能的同期か、機械的な同型進行かを区別する。 |
| `sameDirectionMotionCount` | 声部が同方向に動く重なり。 | parallel perfect とは別。bass と上声が長く同じ概形へ流れる場合は review signal。 |

## Entry Harmony

| Metric | Meaning | Read as |
| --- | --- | --- |
| `entrySupportInstabilityCount` | subject / answer entry 周辺の支え声部が和声的に不安定な箇所。 | root、chord member、avoid note、解決先を entry 単位で読む。 |
| `severeEntryIntervalCount` | entry 周辺の m2、M2、m7、M7 など聴感上目立つ interval。 | count だけでなく duration と解決文脈を見る。 |
| `unresolvedSevereEntryIntervalCount` | severe interval が resolution deadline までに説明されない箇所。 | entry harmony の主要 review signal。Phase 13 以降は duration axis も見る。 |
| `entryAdjacentSecondFrictionCount` | CSP section window 内の planned entry と隣接声部 support が作る短2度 / 短9度 pressure。 | local pitch repair ではなく profile 別 soft cost として読み、声部ペア、entry role、解決文脈を確認する。 |
| `unresolvedAccentedEntryClashCount` | accent 上の severe entry clash が resolution deadline までに説明されない箇所。 | count だけで hard failure にせず、accent、entry identity、support line の解決先を合わせて読む。 |
| `leapToSilenceCount` | 跳躍後に 480 tick 超の同一声部 gap が続く section-CSP evidence。 | 不自然な無音化の review signal。cadence breath や planned handoff で説明できるか確認する。 |
| `entryBoundaryContinuity` | subject / answer / subject-fragment episode entry 境界で、外声が同時に再発音しているか、delayed / carried support があるかを読む summary。 | Phase 13X は初回 bass entry と post-exposition bass entry を分ける。Phase 13Y 以降は entry voice、entry order、already-entered voices で一般化し、Phase 14 以降は 1 声 carry + 2 外声 reset を score-window acceptance から分ける。episode / free-counterpoint slice では subject-fragment entry support も prepared / continuity-supported context と unresolved local thinning に分ける。playback smoothing ではなく score continuity で説明する。 |
| `dissonanceTriage` | weak-passing / passing-neighbor / offbeat semitone clash、entry adjacent-second / unresolved accented clash、meter-length sustained severe vertical dissonance を score-window 単位で読む summary。 | schema v2 は `sustainedSevereVerticalDissonanceCount` / ticks / max ticks と response-aware windows を持つ。短い weak passing / neighbor は review-required、prepared suspension は accepted context、unexplained sustained semitone stack / tritone / fourth-above-bass は generator-response soft cost として読み、単独の CI hard blocker にはしない。根拠は bibliography claim `sustained-vertical-dissonance-soft-repair`。 |
| `harmonicContinuity` | short modulatory / pivot-harmony episode の structural beat が bass-root support、chord-tone support、thin texture、next handoff を譜面上で示すかを見る summary。 | Phase 14C4 以降の review-required score-window evidence。`audible-progression` は局所 window の受容であり、aggregate harmonic metrics の代替ではない。 |
| `harmonicSonorities` | non-entry support texture が実 pitch class と harmonic anchor から見て機能する sonority になっているかを見る quality-vector evidence。 | `metricalHarmonyIntent` を信用せず実音から読む。thin unrooted support / pitch-class doubling は review-required、non-chord structural support は generator response signal。 |
| `harmonicStasisRearticulation` | free-counterpoint の同一声部短音価同音再発音を、first-episode handoff、all-free texture、metrical intent、harmonic function、motivic derivation と合わせて読む summary。 | Harmonic stasis rearticulation repair の対象。pedal、suspension、cadence preparation、subject / answer identity、echo として説明できる同音は accepted context にし、説明できない短い同音連打と和声停滞を review-required または generator-response として扱う。候補選択側は selected-candidate harmony features、最終 support repair 側は final-score windows として分けて読む。 |
| `constraintSatisfactionReview` | continuation section を voice/time slot CSP として読み、slot value を internal `note` / `hold` / `intentional-rest` として分類する summary。 | schema 4 は public `RestEvent` を追加せず、schema 3 の density / metrical-boundary / harmonic-quality evidence に加えて、section と重なる planned entry の `entryPlanViolationCount`、entry support instability、unresolved severe entry interval、voice-pair unison pressure、lockstep pressure、sustained severe vertical dissonance を出す。複数声部の `register-relief` / `entry-handoff-delay` が同時に起き、cadence、pedal、active entry support なしに active voice floor を割る場合は unplanned silence / density failure として読む。`entryPlanViolationCount` と `nonChordStructuralSupportCount` は candidate rejection へ接続し、entry support / severe interval / unison / lockstep / sustained dissonance は section-CSP soft cost として扱う。 |
| `scoreWindowAcceptance` | important entry、subject-fragment entry support、free-counterpoint solo、harmonic sonority、dissonance triage、active voice-pair span、counter-subject survival、phrase development、metric explanation を同じ window list へ束ねる score-window acceptance surface。 | Aggregate metrics より先に読む review surface。各 window の tick、state、voices、roles、classification、theory basis、response から、accepted context / review-required / generator response / diagnostic context を分ける。 |
| `terminalClosureReview` | endless-program / regenerative-cycle の segment 末尾が authentic または modal cadence、低声部 support、外声 landing、未解決 dissonance、texture thinning、final rest、coda source、prepared voice re-entry の観点で終止しているかを見る summary。 | `continuous-fugue` では `not-required`。ただし terminal-support solver slice 以降も low-voice support、unsupported collapse、final-rest failure は summary と terminal candidate reason へ残し、not-required closure や final repair で隠さない。`endless-program` では generated coda と fallback terminal closure を分け、accepted / review-required / generator-response-required を UI と worker snapshot に残し、fallback、boundary silence、playback smoothing で弱い終止を隠さない。`codaContinuity` schema version 2 は subject-derived note count、pedal root coverage、historical function coverage を出すが、archetype diversity は review-required evidence であり CI hard gate ではない。`regenerative-cycle` は bridge-compatible closure として分ける。 |
| `continuousBoundaryCarry` | `continuous-fugue` segment 1 以降の hidden boundary で、form-state continuation とは別に audible carry があるかを見る summary。previous sounding voice count、per-voice last end / first start、all-voice boundary gap、carried / resolving / pedal / staggered / restarted voices、prior tail harmonic-continuity、first attack density、role mix を持つ。 | 初期 scope は `review-required`。`continuousSegmentContinuity` が `prepared-subject-return` でも、thin tail plus all-voice hard restart は `generator-response-required-hard-restart` として残す。修理は score 上の carry / pedal / staggered re-entry で説明し、playback smoothing、boundary silence、UI masking で隠さない。 |

## Melody And Texture

| Metric | Meaning | Read as |
| --- | --- | --- |
| `leapRecoveryMisses` | 大跳躍後に反行または順次進行で回収されない箇所。 | 旋律線の歌いやすさの signal。安全な順次型に偏りすぎていないかも確認する。 |
| `repeatedPitchRunCount` | 同じ pitch の反復 run。 | 高声部では耳につきやすい。Phase 13 の soprano repeated-note pressure と合わせて読む。 |
| `soloTexture` | cadence や phrase boundary で説明できない薄い texture。 | unsupported solo run、abrupt texture drop、solo voice imbalance を分けて読む。 |
| `bassAnswerTailTexture` | 初回 bass answer の後半から continuation / free-counterpoint tail が bass-only、zero-outside、one-outside-voice へ薄くなるか、追加 support rhythm が拍節・動機で説明できるかを見る focused summary。 | Phase 13X2 で追加。`allVoiceSilenceGapCount` が 0 でも、他パートが止まったように聞こえる first-bass-answer tail thinning を separate review signal として読む。schema 3 は answer 内部の5拍目以降も window に含め、付点 rhythm を禁止せず、subject / answer / counter-subject 由来でない off-grid dotted tail support を `unmotivated-tail-fragmentation` として review-required にする。completion baseline は zero-outside / bass-only を blocker とし、one-outside と support-rhythm coherence は Phase 13Y/13Z/14 で隠してはいけない review signal として残す。 |
| `exposedFreeCounterpointSolo` | non-exposition の free-counterpoint solo window が cadence preparation、entry preparation、pedal、solo rhetoric、unsupported のどれかを score-window で示す review surface。 | Texture continuity repair で追加。unsupported window は focused repair target、function-explained window は Infinite playback MVP が隠してはいけない review-visible thinning。 |
| `stepwisePattern` | 長い順次進行や同じ degree pattern の横断反復。 | 自然な旋律運動と mechanical filler を区別する。 |
| `pitchContourMotion` | bass-upper / outer-voice の同方向、反行、概形 motion。 | Phase 7B 以降は hard failure ではなく review signal。 |
| `lowerVoiceVocality` | bass/tenor の support line が歌える線としてつながっているか。 | 長い support note が前後の小さな melodic connection、cadence、phrase boundary で説明できるかと、短い support 同士が同音保持や大きい跳躍に偏らないかを読む。 |
| `surfaceBrilliance` | 短い音価の運動、support motion density、上声域の活動、4声密度、modal color、pivot ambiguity、stretto compression をまとめた review-only summary。 | Jazz / pops 的な現代的きらめきや色彩感を拾う positive signal。単独の pass/fail にはせず、`tradeoffs` の counter-subject identity、entry friction、lockstep、ornament support と合わせて読む。 |

## Subject And Phrase Diversity

| Metric | Meaning | Read as |
| --- | --- | --- |
| `phraseRepetitionReview.subjectStemFamilies` | 1つの generated score 内で subject stem / subject-fragment family がどれだけ集中しているか。 | Per-score phrase convergence の signal。function-bearing return と mechanical reuse を分けて読む。 |
| `phraseConvergenceReview` | default path、4-section pattern、entry-pattern family、subject stem、subject-fragment concentration の review summary。 | 1曲内の convergence と legacy default path の検出には使えるが、seed 横断の初期主題類似は bundle-level summary と合わせて読む。 |
| `phraseDevelopmentReview` | continuation window ごとに subject stem、phrase function、entry voice、cadence、local key、recent reuse、`new-material` / `function-bearing-recurrence` / `mechanical-reuse` judgement を出す。 | Long-run phrase development signal として、集計値だけで採否せず、譜面上で recurrence が役割を変えているかを読む。 |
| `subjectFamilyDiversity` | Review bundle 全体で、initial subject degree/rhythm/contour/tail family が何種類に分散しているか。Schema v3 は top-3 / top-5 initial subject rhetoric share、opening gesture、rhythm profile、climax area、tail motion concentration、subject-fragment family share も出す。 | 複数 seed が同じ少数の主題形や同じ rhetoric へ収束していないかを見る corpus-level review-required signal。A/B summary は unique family/rhetoric count、top-family share、top-N share、fragment share の delta を出す。 |

## Review Summaries

| Field | Meaning |
| --- | --- |
| `candidatePoolOracle` | selected candidate と alternatives を比べ、selection model で直せる問題か、generator / section planner が足りない問題かを切り分ける。Phase 13Q 以降は viable candidate diversity も出す。 |
| `texturePlanningReview` | register、functional thinning、state grammar、metrical harmony の summary。 |
| `phraseRepetitionReview` | subject stem、answer transform、fragment derivation、phrase function、section-state pattern の反復 summary。 |
| `generatorSearchTrace` | deterministic local solver / diagnostics-only trace。 | Solver mode は exposition candidate に加えて、section-local continuation candidate rows を `section-<tick>-<state>-<band>-duration-<ticks>-candidate-<index>` の stable id で出す。各 row は hard failure code と代表 affected note を持つ。`section-csp` band は continuation selection 前に評価された CSP-owned variants を表し、`section-csp-*` soft-cost reasons for voice coverage, harmonic support, entry support, voice-pair independence, metrical boundary, rest reasons, and search width を持つ。Episode / free-counterpoint rows は soft-cost reason で motivic derivation、harmony realization、independent contour / rhythm、clash resolution、entry handoff support を説明する。Terminal continuation rows は `terminal-support-*` reason で cadence target、low-voice support、outer-voice landing、final-rest stability、unsupported texture collapse を説明する。Continuous-fugue segment continuation rows は `segment-<index>-boundary-continuation-*` の stable id と `segment-boundary-*` reason で carry、pedal、staggered re-entry、prior-tail harmonic support、first-attack density、role mix、hard-restart risk を説明する。Score-level support cleanup は `score-harmonic-stasis-*`、`score-harmonic-continuity-*`、`score-functional-thinning-support-*`、`score-unexplained-rest-thinning-support-*`、`score-post-entry-continuation-support-*`、`score-long-rest-phrase-closure-*`、`score-bass-answer-tail-texture-support-*`、`score-texture-voice-crossing-repair-*` の unrepaired / proposed rows で final repair replacement evidence を残す。 |
| `constraintSatisfactionReview` | Section-local CSP summary。 | `generatorSearchTrace` の section rows と合わせ、rest 相当の silence が allowed internal reason を持つか、non-cadential continuation で long unplanned silent run や unsupported solo が残るか、structural anchors に root/chord support と実 sonority quality があるかを読む。 |
| `entryBoundaryContinuity` | Phase 13W/13X の bass-entry boundary summary から、Phase 13Y で generalized entry-continuity summary へ広げた。first bass entry window、post-exposition bass compatibility count、generalized important-entry windows、subject-fragment episode entry support、entry voice、entry order、already-entered voices、outside onset、entry で切れた外声、carried support、suspension/resolution、delayed support、staggered continuation、prepared collective articulation、unsupported entry-local thinning、synchronized reset classification、one-voice carry with outside reset classification を持つ。 |
| `continuousBoundaryCarry` | hidden segment boundary の audible carry summary。`continuousSegmentContinuity` と合わせ、form reset ではないが聴感上 restart に聞こえる境界を分けて読む。 |
| `qualityVector` | normalized review/adoption signal。詳細は [quality vector](quality-vector.md)。 |
| `localSentinelCandidateTrace` | local sentinel を selected candidate explanation の section、entry、voice pair、resolution deadline へ戻す review-only bridge。 |
| `phraseConvergenceReview` | per-score convergence review signal。Seed 横断の主題語彙崩壊は bundle-level `subjectFamilyDiversity` と合わせて読む。 |
| `phraseDevelopmentReview` | windowed phrase-development review signal。Remaining mechanical-reuse windows は score-led beauty review に渡す。 |
| `dissonanceTriage` | focused dissonance tradeoff summary。weak-passing semitone clash ticks、passing-neighbor/offbeat semitone clash ticks、entry adjacent-second friction count、unresolved accented entry clash count、sustained severe vertical dissonance count / ticks / max ticks、代表 score-window を持つ。 |
| `scoreWindowAcceptance` | score-window acceptance summary。important entry、subject-fragment entry support、free-counterpoint solo、harmonic-sonority、dissonance、voice-pair、counter-subject、phrase-development、metric-explanation の window count と response count を持ち、代表 window には theory basis と project response を含める。 |

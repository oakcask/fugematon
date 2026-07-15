# Pairwise Listening Review Tool

Status: planned.

この計画は、[Reference Evaluation Learning Loop](reference-evaluation-learning-loop.md) が生成する blind A/B bundle を、人間が再生、比較、回答、保存、再開できる local review tool の要件と実装完了条件を定義する。

Evaluation loop は corpus、feature、pairwise schema、training、shadow model、active-learning queue を所有する。この tool は review session、blind presentation、playback、response capture、local persistence を所有し、model training や default model adoption を行わない。

Bibliography claim: `reference-evaluation-learning-loop`。Listening criteria は current quality-metrics policy と agent score review policy に従う。

## Problem

現在の review CLI は baseline / variant の MIDI、diagnostics、`pairwise-preferences.json` を生成できるが、回答者はファイルを個別に開き、再生位置と条件を自分でそろえ、JSON を直接編集する必要がある。この手順では次の risk がある。

* filename、directory、model label から baseline / variant が見えて blind review にならない。
* A/B で tempo、performance profile、renderer、volume、再生開始位置が一致しない。
* diagnostics や piano roll を先に見て、聴取前の期待が preference を誘導する。
* `tie`、`cannot-judge`、rendering-only issue、未聴取が曖昧になる。
* 回答途中の中断、重複、競合、壊れた JSON、bundle version mismatch を安全に処理できない。
* active-learning queue を順番どおりに消化し、次の model update へ渡す操作が煩雑になる。

## Goal

次の一連を、account、外部 service、手作業の JSON 編集なしに完了できる local-first tool を作る。

```text
validated A/B bundle
  -> blind listening session
  -> A / B / tie / cannot-judge response
  -> atomic local save and resume
  -> validated pairwise response set
  -> evaluation-loop training / shadow input
```

Tool の成功条件は「好みの回答が必ず集まること」ではない。比較条件が統制され、回答または未回答状態が正しく保存され、evaluation loop が安全に読み込めることである。

## Users And Primary Use Cases

Primary user は、生成モデルの内部名や diagnostics を見ずに二つの出力を比較する reviewer とする。

Required use cases:

1. Reviewer が review bundle を指定して local tool を起動する。
2. Tool が schema、asset、hash、performance context を検証し、壊れた comparison を再生前に止める。
3. Reviewer が A と B を同じ musical position から交互に聞く。
4. Reviewer が全曲または focused region を繰り返し、A、B、tie、cannot-judge のいずれかを選ぶ。
5. Reviewer が任意の confidence、reason tags、note を追加する。
6. 回答が local response file に atomic save される。
7. 中断後に同じ bundle を開き、未回答 comparison から再開する。
8. 全回答または一部回答を validator へ渡し、evaluation loop が accepted / excluded label を区別する。

Secondary use case として、回答確定後に score、piano roll、diagnostics、feature delta を開き、聴取判断と分析 evidence の一致・不一致を調べられるようにする。

## Product Boundary

* Tool は local review application とし、通常の Fugematon 鑑賞 UI と entry point、state、storage を分ける。
* Default bind address は loopback に限定し、明示的な外部公開 option を first implementation に入れない。
* Bundle generation と label validation は CLI が authority、browser UI は validated session API だけを使う。
* Existing `PlaybackModel`、`ScorePlayer`、performance profiles、piano-roll layout は再利用可能だが、review state を通常 playback state に混ぜない。
* Source A/B files は immutable input とし、回答は別の versioned response artifact に保存する。
* Tool は score generation、candidate selection、feature weight training、model promotion を行わない。
* Tool は login、email、real name、analytics、telemetry upload を要求しない。

## Functional Requirements

### PLR-1: Session Startup And Bundle Validation

CLI は local review session を起動する command を提供する。

```text
pnpm fugematon listen --bundle <review-directory>
```

Exact option spelling は CLI implementation 時に current command conventions と合わせて固定する。少なくとも bundle root、response output、read-only preview、start comparison を指定できること。

起動時に次を検証する。

* supported bundle、pairwise、session schema version。
* comparison id と blinded side id の一意性。
* A/B audio or score asset の存在、hash、read boundary。
* A/B の seed、length、writing profile、performance profile、requested renderer context の一致。
* hidden side mapping が両 side を一度ずつ指すこと。
* response artifact の bundle id、schema、comparison set compatibility。
* asset path が bundle root の外へ出ないこと。

Error は [error-message guideline](../reference/error-message-guidelines.md) に従い、searchable id、why、action を含める。最低限、unsupported schema、missing asset、hash mismatch、context mismatch、unsafe path、response conflict を別 id にする。

### PLR-2: Blind Presentation

回答確定前の画面では次を表示しない。

* baseline / variant、selection model、branch、commit、model version の side mapping。
* source filename、directory name、URL、diagnostics filename。
* automatic quality score、reference distance、local sentinel count、oracle choice。
* side ごとに異なる色、位置、文言など、model identity と相関する presentation cue。

UI 上の side label は `A` と `B` のみとする。Presentation order は session manifest に保存された deterministic blind mapping を使い、同じ bundle resume で入れ替わらない。別 bundle generation では baseline が常に A にならない。

Score、piano roll、diagnostics、model identity は回答確定後の analysis panel でのみ reveal できる。Reveal 後に回答を変更する場合は `analysis-assisted` revision として blind response と区別し、default training label に含めない。

### PLR-3: Controlled Playback

A/B は同じ performance context で再生する。

* performance profile id / version、tempo interpretation、renderer request、gain policy、articulation、humanize、note-length compensation を一致させる。
* active renderer が片側だけ fallback した場合は comparison を invalid または `cannot-judge: renderer-mismatch` にする。
* Fixed gain policy を両 side に適用し、side ごとの adaptive loudness normalization で texture density や dynamics を消さない。Clipping が起きた場合は preference ではなく rendering issue として記録する。
* A/B の同時再生と accidental overlap を禁止し、side switch 時は先の scheduled notes を停止する。
* Play A、Play B、pause、stop、seek、restart を提供する。
* Side switch は shared musical position を保持でき、同じ tick または換算された同じ playback second から再開できる。
* Seek position をまたぐ持続音は残り duration と envelope policy を再構成する。再構成できない renderer は switch を共通 bar / beat boundary に制限し、片側だけ持続音を欠落させない。
* Full-score playback と focused region loop を提供する。
* Loop boundary は bar / beat / tick metadata から選べ、side ごとに別 region へずれない。
* A/B の長さが異なる場合は shared comparable range を示し、片側だけの terminal span を暗黙に比較しない。
* Current side、playback position、loop range、buffering / renderer failure を明示する。

Audio startup は browser user gesture 後に行う。全 comparison の audio asset を先に読み込まず、current と next comparison を上限に lazy prepare する。

### PLR-4: Efficient Review Interaction

Primary actions は pointer と keyboard の両方で行えるようにする。

Default shortcuts:

* `1`: Play / switch to A。
* `2`: Play / switch to B。
* `Space`: play / pause。
* `R`: shared position を 0 または focused-region start へ戻す。
* `L`: focused loop on / off。
* `A`: prefer A。
* `B`: prefer B。
* `T`: tie。
* `J`: cannot judge。
* `N`: save and next。回答がない場合は明示的 skip confirmation を必要とする。
* `P`: previous comparison。

Text input に focus があるときは shortcut を発火させない。Shortcut は画面に常時確認でき、remapping は first slice の必須要件にしない。

Session navigation:

* progress、answered、unanswered、cannot-judge、conflict count を表示する。
* default は active-learning queue order、filter は unanswered / flagged / all を提供する。
* next は未回答を優先し、同じ comparison の accidental duplicate response を作らない。
* browser refresh、tab close、process restart 後も last saved comparison から再開できる。

### PLR-5: Response Capture

Required final choice:

* `a`
* `b`
* `tie`
* `cannot-judge`

`not-reviewed` は未回答 state であり、保存された preference choice ではない。Skip は comparison を未回答のまま残し、cannot-judge と混同しない。

Optional fields:

* confidence: bounded ordinal scale。
* composition reason tags。
* rendering-only reason tags。
* short note。
* focused region。

Composition reason tag vocabulary は current listening criteria と揃える。

* subject identity / memorability
* counter-subject recognition
* non-entry voice singability / line agency
* entry clarity / support
* harmonic clarity / dissonance resolution
* episode direction / momentum
* stretto tension / clarity
* rhythmic vitality / independence
* texture continuity / balance
* repetition / long-run interest
* cadence / terminal closure

Rendering-only tags は composition tags と別 field に置く。

* renderer mismatch or failure
* attack / envelope
* balance / masking
* latency / interruption
* distortion / clipping

Rendering-only issue しかない response は composition preference training から除外できること。Reason tag は choice を自動決定せず、互いに矛盾する choice / tag は validator warning として残す。

### PLR-6: Listening Coverage And Provenance

Tool は upload しない local session evidence として次を記録する。

* A/B それぞれの play count と accumulated listened duration。
* listened ranges の bounded union。
* side switch count。
* full-score / focused-loop use。
* choice save、reveal、analysis-assisted revision の順序。
* requested / active renderer、performance profile、session schema version。

この evidence は回答の quality filtering と再現に使う。Reviewer の性格、能力、年齢、場所などを推定する feature にしない。Exact interaction timing や typing behavior を learned composition model の input にしない。

Minimum listening duration を choice の強制条件にはしない。短い局所 failure は短時間で判断可能であり、長さだけを label quality とみなせないため、coverage を warning / review metadata として扱う。

### PLR-7: Persistence, Resume, And Export

Response は bundle input と別 artifact に保存する。

Required properties:

* versioned response schema。
* bundle id、comparison id、blind side id を参照し、source path や model name を response choice に複製しない。
* current final response と、reveal / revision を区別する bounded audit events。
* atomic write。Process interruption で既存 response file を壊さない。
* optimistic concurrency または revision check。同じ file を二つの tab / process が更新した conflict を上書きしない。
* deterministic canonical export。Equivalent final state は stable ordering を持つ。
* partial session を valid artifact として export できる。
* Final choice、confidence、tags、note の変更は明示的 download 操作なしに autosave され、save status が見える。

Browser に任意 filesystem access を与えず、local session server が allowlisted bundle root と response target だけを読み書きする。Unknown JSON fields は schema policy に従い、unsupported future schema を silent discard しない。

### PLR-8: Post-Choice Analysis

回答を lock した後、任意の analysis panel を開ける。

* side mapping と model metadata。
* synchronized piano roll / score-facing view。
* diagnostics summary と local sentinel locations。
* contextual feature delta と shadow-model explanation。
* reviewer reason tags と automatic evidence の agreement / disagreement。

Analysis panel は preference を正当化するための必須画面ではない。A/B choice だけから `score-blocking` verdict を作らず、score blocker は agent score review policy の seed、location、section、voices / roles、intended function、symptom、theory basis を別途満たす必要がある。

## Data Contracts

### Listening Session Manifest

Session manifest は UI に渡してよい blind metadata と、server-side reveal metadata を分離する。

Required session fields:

* session schema version、session id、bundle id、bundle hash。
* comparison order と comparison ids。
* performance / writing profile metadata、length / tempo context。
* blind side ids と asset tokens。
* allowed focused regions。
* queue reason と category。
* response schema version と current response revision。

Hidden mapping は source model、selection model、generator / feature / evaluation model version、diagnostics path、asset hash を持てるが、回答前の browser response や asset URL に可読名を含めない。

Queue reason と category は presentation order の再現に使えるが、聴取 expectation を誘導するため回答前 UI には表示しない。

### Listening Response

Required response fields:

* response schema version、bundle id、comparison id、blind mapping revision。
* choice、confidence、composition tags、rendering tags、note。
* listening coverage summary。
* blind / revealed / analysis-assisted status。
* response revision と save status。

Reviewer id は optional project-local pseudonym のみとし、real name、email、account id を schema required field にしない。

## UI States And Recovery

Tool は少なくとも次の state を区別する。

* loading bundle
* invalid bundle
* ready, unanswered
* playing A
* playing B
* paused
* response draft
* saving
* saved
* save conflict
* renderer failure
* revealed analysis
* session complete or partially complete

Playback failure と save failure を同じ generic error にしない。Save failure 時も draft を memory に保持し、retry または local export を選べる。Renderer failure 後に side mapping や response を失わない。

## Accessibility And Responsive Requirements

* 全 action は keyboard で到達でき、visible focus を持つ。
* Button、side、playback、save、error state は screen-reader label と live status を持つ。
* A/B、selected choice、error、progress を色だけで表現しない。
* Reduced-motion preference を尊重する。
* Desktop を primary review target とするが、narrow viewport でも回答と playback control を失わない。
* Piano roll は post-choice optional panel なので、canvas が利用できなくても blind listening と回答は完了できる。

## Privacy And Security Requirements

* Default loopback bind、no external analytics、no remote asset request after bundle preparation。
* Bundle root 外の read/write、symlink escape、path traversal を拒否する。
* Response note を HTML として解釈せず、model / filename metadata を unsafe markup に挿入しない。
* Local path、username、hostname、token、email を response、logs、screenshots、error text に含めない。
* Server log は comparison id、error id、action までに限定し、free-form note を通常 log に出さない。
* Browser close で audio nodes と local session server ownership を安全に終了できる。

## Performance Requirements

* Standard 22-comparison bundle を一度に開ける。
* Initial page は current comparison の表示に不要な全 MIDI / diagnostics を parse しない。
* Side switch、seek、loop は generation を再実行せず、prepared playback model を使う。
* Save は playback UI を長時間 block せず、保存中と失敗を表示する。
* Large optional SoundFont は tool startup の必須 dependency にせず、bundle context で要求された場合だけ load する。

数値 latency threshold は実装時に browser evidence を測定して決める。未計測の値を phase requirement として固定しない。

## Implementation Order

1. PLR-1 / PLR-7 の session、response、validation、atomic persistence contract を CLI integration tests で固定する。
2. PLR-3 の side-independent playback controller と shared position / loop model を pure tests で作る。
3. PLR-2 / PLR-4 / PLR-5 の blind UI、shortcuts、choice state、navigation を実装する。
4. PLR-6 の bounded listening coverage と provenance を追加する。
5. PLR-8 の post-choice reveal / analysis panel を追加し、blind response と analysis-assisted revision を分ける。
6. Accessibility、responsive layout、path boundary、save conflict、renderer failure を検証する。
7. Standard 22 seed bundle で browser-level completion review を行う。

## Verification

### Automated

* manifest / response schema、unknown version、hash mismatch、unsafe path、duplicate comparison、context mismatch。
* blind mapping determinism と baseline / variant presentation balance。
* playback state machine、single-active-side invariant、shared seek / loop position、stop-on-switch。
* keyboard shortcuts、text-input suppression、choice / skip / next behavior。
* atomic save、resume、partial export、revision conflict、crash-safe fixture。
* rendering-only exclusion、revealed revision exclusion、tie / cannot-judge / not-reviewed semantics。
* no output mutation of source bundle。

### Browser-Level

Implementation completion では `ui-inspection` を使い、local Vite / review server に対して次を確認する。

* standard desktop と narrow viewport。
* console error なし、blank canvas なし、visible focus、keyboard-only completion。
* A/B source token、filename、model identity が回答前 DOM、accessible name、URL に漏れない。
* playback clock が A/B の同じ position を保持し、switch 後に一方だけが active になる。
* refresh / restart resume、save conflict、missing asset、renderer failure の recovery。

### Audio Evidence

この phase は listening tool 自体が target なので、譜面レビューだけでは playback correctness を完了判定できない。Human preference は不要だが、次の narrow audio evidence を必要とする。

* A と B で識別可能な synthetic fixture を使い、両 side の audio graph に非ゼロ signal が出る。
* side switch、pause、stop 後に前 side の scheduled source が残らない。
* shared seek / loop が instrumentation 上同じ musical tick を開始する。
* requested / active renderer mismatch が response を invalid または cannot-judge にする。

Device、speaker、OS 固有の音質差は completion blocker にせず、cross-device audible check gap として記録する。

## CI / Review Scope

| Surface | Classification | Reason and action |
| --- | --- | --- |
| session / response schema、path boundary、atomic persistence | `ci-blocking` | データ破損、blindness、local security boundary を守る focused tests。 |
| playback state、single-active-side、shared position | `ci-blocking` | A/B 条件の同一性を壊すため mock clock / audio graph tests を置く。 |
| browser layout、keyboard、responsive、recovery | `ci-observed` | Browser smoke artifact と completion review に残し、安定後に focused blocker を昇格する。 |
| comparison queue completion / listening coverage | `review-required` | Bundle と reviewer behavior に依存し、最低時間を hard gate にしない。 |
| A/B preference、reason tags、long-run fatigue | `manual-listening` | Evaluation evidence だが CI と tool implementation completion を決めない。 |
| score blocker derived from listening | `review-required` | Score window と theory evidence を別途局在化して agent score review に渡す。 |

## Completion Conditions

* PLR-1 から PLR-8 の required behavior が実装される。
* Standard review bundle を local command で開き、blind A/B、回答、保存、再開、partial / complete export を JSON 手編集なしに完了できる。
* A/B は同じ performance context と shared musical position を使い、renderer mismatch、asset mismatch、context mismatch を silent acceptance しない。
* Source bundle は不変で、response artifact は atomic、versioned、conflict-aware である。
* 回答前の UI / DOM / URL / accessible name に model identity が漏れない。
* Rendering-only、tie、cannot-judge、skip、not-reviewed、blind response、analysis-assisted revision を区別できる。
* Automated tests、browser inspection、narrow audio evidence が完了する。
* Standard 22 comparison の session smoke で crash、save loss、unrecoverable playback failure がない。
* Tool completion は preference winner や learned-model superiority を主張しない。
* Completion review を `docs/reviews/` に置き、browser evidence、audio evidence、remaining cross-device gap、CI classification を記録する。

## Out Of Scope

* Remote multi-user review、authentication、cloud database、hosted analytics。
* Reviewer reputation、skill score、demographic profiling。
* Real-time collaborative listening または同時回答。
* Pairwise model training、feature weight update、model promotion。
* Audio renderer、SoundFont、mix、mastering の品質改善そのもの。
* Full notation editor、score annotation editor、diagnostics editor。
* A/B を同時に mix する playback mode。
* Mobile-first production UI または public product route。

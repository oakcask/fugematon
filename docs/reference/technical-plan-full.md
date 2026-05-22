# 技術計画

## 基本方針

* リアルタイム音声の安定性を最優先する。
* 生成探索、描画、音声処理をできるだけ分離し、メインスレッドの負荷を抑える。
* 初期実装では、採用技術を増やしすぎず、TypeScript とブラウザ標準 API を中心にする。
* 生成エンジンは UI に依存しないモジュールとして実装し、CI で seed とパラメータから譜面イベント列を生成・検証できるようにする。

## アプリケーション基盤

* TypeScript を採用する。
  * 音楽イベント、声部、状態機械、スコアリング結果などの構造が多いため、型定義の価値が高い。
* パッケージマネージャは pnpm を採用する。
* pnpm workspace を採用し、初期から core、CLI、Web UI を分ける。
* Web UI には Vite を採用する。
  * ブラウザアプリケーションの開発サーバ、ビルド、TypeScript 対応を簡潔に扱える。
* UI フレームワークは初期段階では慎重に選ぶ。
  * React などを使う場合でも、音声スケジューラ、生成器、描画ループは UI コンポーネントから独立させる。
  * MVP では Vanilla TypeScript + Canvas でも成立する。

## 音声

* WebAudio API を採用する。
* 初期シンセは OscillatorNode / GainNode / BiquadFilterNode などの標準ノードで、オルガン寄りの音色として実装する。
* 音色はユーザが変更できるようにする。
* 将来的に、より低レイテンシな独自処理が必要になった時点で AudioWorklet を導入する。
* ScriptProcessorNode は非推奨のため使わない。
* AudioContext の開始はユーザー操作後に行う。

## 並列処理

* 生成探索は Dedicated Web Worker を基本とする。
* AudioWorklet は音声合成・音声処理用途に限定する。
* SharedWorker は、複数タブで状態や生成器を共有したい要求が出るまで保留する。
* Service Worker は、PWA 化、キャッシュ、オフライン対応のために後から導入する。

## 描画

* 初期ビジュアライザは Canvas 2D のピアノロールとする。
* 描画更新は requestAnimationFrame を使う。
* 長尺 score を横幅全体へ常に圧縮しない。
  * ピアノロールは、再生位置を中心にした固定秒数の表示窓を基本表示にする。
  * 停止中や生成直後は冒頭 section を表示し、再生中は playhead に追従する。
  * 表示窓外のノートは描画対象から外し、ノート幅と entry stroke が視認できる密度を保つ。
  * 作品全体の長さは metric や将来の overview 表示で伝え、主表示の美しさと可読性を優先する。
* 描画負荷が問題になった場合、OffscreenCanvas による Worker 描画を検討する。
* 五線譜表示は後続課題とし、必要になった時点で専用ライブラリの採用を検討する。

## 対象ブラウザ

* MVP は、WebAudio、Dedicated Web Worker、Canvas 2D、ES modules が安定して使える現行ブラウザを対象にする。
* 初期対応範囲は以下とする。
  * デスクトップ: Chrome / Edge / Firefox / Safari の現行安定版
  * モバイル: iOS Safari、Android Chrome の現行安定版
* AudioWorklet、OffscreenCanvas、PWA 対応は必須要件にしない。
  * AudioWorklet は標準 WebAudio ノードでは不足した場合に導入する。
  * OffscreenCanvas は描画負荷が問題になった場合に導入する。
  * Service Worker / PWA はオフライン対応やキャッシュ要件が固まってから導入する。
* ブラウザ差が出る機能は feature detection で分岐し、未対応時は基本再生と Canvas 2D 表示に戻す。
* 自動再開はブラウザの自動再生ポリシーに依存するため、失敗時に Start 操作へ戻れることを正式な挙動とする。

## 永続化

* 演奏中の巻き戻し用履歴は、まずメモリ上のリングバッファで持つ。
* seed はユーザが記録・再入力できるようにする。
* 巻き戻し再生の再現性を保つため、ノートイベントだけでなく、状態遷移やパラメータ変更などのメタイベントも履歴に含める。
* セッション保存や生成結果のエクスポートには IndexedDB を採用する。
* 設定値程度であれば localStorage でも足りるが、譜面イベント列の保存には IndexedDB の方が適している。

## 無限再生と操作方針

Fugematon の長時間体験は、細かな生成パラメータをユーザーが直接調整することではなく、音楽的な記憶を持った再生セッションとして設計する。有限状態機械が扱う状態は、主題 family、派生形、調性領域、密度、終止感、反復疲労、直近の形式機能などの抽象状態にする。実装上は状態遷移を共有し、視聴体験としては以下のモードを分ける。

* continuous fugue: 明確な曲間を作らず、主題の再現、断片化、転回、移調、episode、stretto-like section を続ける。
* endless program: 個々の曲または segment は意味的に終止し、次の曲は前の主題 family、調性、密度、終止感、疲労度を受けて生成する。
* regenerative cycle: segment ごとに終止感を持たせながら、主題や状態の記憶を残して次の section へ橋渡しする。

ユーザー向け MVP 操作は、再生モード、seed、performance profile、必要最小限の再生成またはスキップに絞る。strictness、density、subjectPresence などの細かな値は、初期は直接スライダ化せず、seed と session state から決まる内部状態として扱う。操作を追加する場合も、音楽的な退屈さを隠すためではなく、次の状態遷移を選ぶための高水準 command として設計する。

内部状態はビジュアライザの主要な鑑賞要素にする。状態遷移、主題 family、answer transform、fragment derivation、調性領域、cadence preparation、density arc、疲労度または novelty budget は、過度な数値 UI ではなく、色、透明度、軌跡、強調表示、境界演出で見せる。

状態変更は即時に生成済みノートへ反映せず、次の状態遷移または segment 境界から有効にする。必要な変更は state-change、boundary、mode-change、parameter-change などのメタイベントとして履歴に記録する。

### 音色パラメータ

* timbre: 音色プリセット。
  * 初期値は organ とし、将来的に music-box、harpsichord、soft-sine などを追加する。
* attack: 音の立ち上がり。
* release: 音の減衰。
* brightness: フィルタや倍音量による明るさ。
* reverbAmount: 残響量。

### 後続候補

* modulationRate: 転調の頻度。
  * 音楽的破綻に直結しやすいため、MVP では seed 由来の内部値に留める。
* chromaticism: 半音階的な動きの量。
  * 対位法制約との相互作用が強いため後続課題とする。
* strettoIntensity: stretto-like section の密度。
  * 状態機械が安定してから操作対象にする。
* cadenceStrength: カデンツの明確さ。
  * 調性設計が安定してから追加する。
* tempo: テンポ。
  * 再生中変更はスケジューラと履歴の扱いが複雑になるため、初期は seed 由来または開始前設定に留める。

## テスト

* MVP の達成状況は、可能な限り CI 上の自動テストで確認する。
* 生成エンジンは UI に依存せず、seed とパラメータを入力して ScoreEvent を生成できる API を持つ。
* 音楽理論ルール、候補生成、スコアリングは単体テストの対象にする。
* 音声出力そのものは自動テストしにくいため、スケジューリング結果のイベント列を検証する。
* ビジュアライザは、まず座標変換と表示範囲計算をテスト対象にする。

## Diagnostics 閾値

指標の一般的な意味、正規化、採否上の扱いは [quality metrics reference](quality-metrics.md) に置く。この section は CI profile と phase-specific threshold policy だけを扱う。

* diagnostics の閾値は、生成器の成熟度に合わせて段階的に厳しくする。
* 初期は「破綻を検出できること」を優先し、完全な音楽品質判定を CI に背負わせない。
* Phase 0-1 の閾値：
  * 声域違反: 0
  * 声部交差: 0
  * 4声の NoteEvent 欠落: 0
  * exposition の主題または応答の欠落: 0
  * exposition の応答が主題に対して5度関係で提示されること: diagnostics で確認する。
  * 並達5度・並達8度の疑い: diagnostics に記録するが、CI 失敗条件にはしない。
  * 不協和の未解決疑い: diagnostics に記録するが、CI 失敗条件にはしない。
* Phase 3 以降の閾値：
  * 声域違反: 0
  * 声部交差: 0
  * exposition、subject return、stretto-like section の主題 entry が、主調、属調、近親調の計画に沿って現れる。
  * 応答 entry は5度関係を維持しつつ、entry 周辺の持続的な完全8度や並達完全音程が主題の聴感を支配しない。
  * 並達5度・並達8度の疑い: 生成長に対する比率で上限を置く。
  * 不協和の未解決疑い: 生成長に対する比率で上限を置く。
  * 主題または主題断片の再出現: 状態ごとに最低回数を置く。
  * 生成所要時間: リアルタイム再生の先読み量を下回らない上限を置く。
* Phase 4 以降の閾値：
  * 主題同一性違反: 0
    * 同じ form の subject entry は、想定した scale-degree pattern と一致する。
    * voice base octave によって主題の開始度数や調性機能が変化しない。
  * 応答計画違反: 0
    * true answer または tonal answer のどちらとして生成したかを diagnostics に残す。
    * answer の重要音が local key の計画に沿っている。
  * key metadata mismatch: 0
    * ScoreEvent の key-signature、entry plan の local key、実際の pitch class sequence が矛盾しない。
  * cadence target miss: Phase 5 までは diagnostics 記録、Phase 5 完了時に代表 seed の上限を置く。
  * modal seed では、local mode の特徴音が主題または episode に現れ、tonal cadence だけに回収されすぎない。
* Phase 5 は音楽的品質ゲートとして扱う。
  * hard constraints だけでなく、counter-subject coverage、free counterpoint coverage、melodic stagnation、leap recovery、leading tone resolution、dominant resolution、predominant direction、cadence target hit、harmonic function match、episode direction、stretto clarity を diagnostics または soft score に持たせる。
  * `samePitchOverlapCount` は `unisonOverlapCount` と分けて扱う。同じ MIDI pitch を複数パートが同時に鳴らす exact unison は、明示的な doubling、終止、短い経過的重なりなどで説明できない限り、同じ楽器の texture では禁則寄りの制約にする。
  * tonal context では導音から主音への解決と predominant -> dominant -> tonic の進行を強く評価し、cadence 周辺では未解決を品質ゲートの対象にする。
  * deceptive motion、evaded cadence、pivot harmony、modulatory motion は、後続の harmonic anchor へ到達する場合に管理された曖昧さとして加点する。
  * 曖昧な解決が複数 section にわたって回収されない場合は unresolved ambiguity warning として扱う。
  * 同主調への転調、parallel major/minor shift、借用和音的な色彩変化は style profile に応じて評価し、strict-classical では控えめ、hybrid または popular-tolerant では表情変化として許容する。
  * modal context では古典的な導音解決を常に強制せず、mode の特徴音と modal cadence の説得力を別指標で扱う。
  * 複数 seed の note 数、entry 数、状態遷移列が不自然に同型になり続ける場合は form repetition warning として扱う。
  * Phase 8 の無限再生セッションは、Phase 7B の gate policy reset 後に hard constraint 上は開始できる状態になった。ただし音楽美を operational lane より優先するため、Phase 7B、Phase 10、Phase 11、Phase 12、Phase 12P、Phase 13、Phase 13Q、Phase 13R、Phase 13S、Phase 13T、Phase 13U 後も、post-13U の譜面レビューで見つかった line agency、entry formula recurrence、counter-subject survivability、long-run development、metric false acceptance を Phase 13V で先に扱った。Phase 13V 後に確認した post-exposition bass entry 境界の外声同時再発音は Phase 13W で先に扱った。Phase 13W が除外していた exposition 初回 bass answer の外声同時再発音は Phase 13X で先に扱う。Phase 13X 後は Phase 13Y で entry-boundary continuity を bass 固有ではなく entry voice、entry order、already-entered voices に基づく一般モデルへ広げる。Phase 13Y 後は Phase 13Z で long-run phrase convergence を subject-return、episode、stretto-like の発展不足として扱う。Phase 13Z 後は Phase 14 で、指標が譜面上の美しさを証明していない問題を score-window musical acceptance、entry continuity、line agency、counter-subject survivability、phrase development の統合再設計として扱う。Phase 6-7 の美しさ metric と manual listening は quality lane の evidence とする。
* 閾値はコード内に散らさず、CI 用の diagnostics profile として管理する。
* diagnostics の項目追加は互換的変更として扱うが、既存閾値の厳格化は generatorVersion とは別に CI 設定の変更として扱う。

## 調性的処理計画

Phase 5 では、調性的処理を cadence 直前の後処理ではなく、section 計画、候補生成、候補 scoring、diagnostics の共通データとして扱う。

* HarmonicPlan を section ごとに持つ。
  * global key、local key、departure key、target key、mode context を保持する。
  * style profile を保持し、strict-classical、hybrid、popular-tolerant の評価重みを切り替える。
  * 強拍、entry 直前、cadence target など、形式上重要な tick に harmonic anchor を置く。
  * harmonic function は tonic、predominant、dominant、cadential tonic を最低限扱う。
* VoiceLeadingObligation を声部ごとに持つ。
  * 導音、掛留、強い不協和、半音階的経過音が出た場合、期待される解決先と解決期限を記録する。
  * tonal cadence 周辺では導音から主音への解決を強く要求する。
  * modal context では導音解決を機械的に要求せず、modal cadence の到達音と特徴音を優先する。
* CadencePlan を state transition と subject return preparation に置く。
  * authentic cadence、half cadence、deceptive または modulatory motion、modal cadence を区別する。
  * authentic cadence では dominant から tonic への解決と、可能な場合は導音から主音への声部進行を評価する。
  * half cadence は次の section へ緊張を残す計画として扱い、終止扱いにしない。
  * evaded cadence は、予告された tonic 到達を避けて次の harmonic anchor へ向かう表現として扱う。
  * pivot harmony は、旧 local key と新 local key の両方で説明できる響きとして扱い、転調の接続に使う。
  * parallel major/minor shift は、同じ tonic のまま mode を変える色彩変化として扱う。
  * borrowed-chord color shift は、局所的な響きの変化として扱い、local key の恒久変更とは区別する。
* 候補 scoring は全 tick を和声で縛らない。
  * 弱拍と内声には旋律的自由を残す。
  * 強拍、entry 直前、subject return 前後、cadence target では harmonic anchor を強く評価する。
  * dominant が tonic へ解決しない場合は、次の local key へ向かう deceptive または modulatory motion として説明できる候補だけを許す。
  * 解決の曖昧化は、近い将来の target key、subject return、または cadence target に向かう意図がある場合に加点する。
  * ambiguity budget を section ごとに持ち、曖昧な解決が過密になったり長く回収されなかったりする候補を減点する。
  * 同主調転調は主題の pitch-class identity と声部進行を壊さない範囲で許し、style modulation fit と parallel key shift count で過不足を評価する。
  * strict-classical profile では同主調転調を稀な色彩変化として扱い、popular-tolerant profile では section contrast や長時間生成の変化として積極的に評価できる。
* diagnostics に以下を追加する。
  * leading tone resolution miss
  * dominant resolution miss
  * predominant direction miss
  * harmonic function mismatch
  * cadence target miss
  * modal cadence mismatch
  * unresolved voice-leading obligation
  * controlled ambiguity score
  * unresolved ambiguity warning
  * modulation path mismatch
  * style modulation fit
  * parallel key shift count

## 主題 entry 計画

* exposition の基本形は、主題、5度上の応答、主題、5度上の応答とする。
  * 声部順は seed によって変えてよいが、entry ごとの form と移調関係は diagnostics で確認できるようにする。
  * 5度上または4度下の関係は、pitch class 差分だけではなく、local key と scale degree mapping で表現する。
* 主題は、以下の情報を持つ抽象データとして扱う。
  * rhythm pattern
  * scale degree pattern
  * melodic role
  * important tones for answer correction
  * allowed chromatic alterations
* MIDI pitch は entry plan の最後に、voice と register から解決する。
  * voice range fitting は octave placement だけを担当する。
  * voice range fitting が scale degree や local key を変えてはならない。
* Phase 1 の実装は固定の真応答でよい。
  * 応答は主題を5度移調したものとして生成する。
  * 現行実装では semitone offset による近似を許すが、後続フェーズではスケール度数ベースの表現へ置き換える。
  * 縦に鳴る完全8度や完全5度を完全には避けないが、声域違反と声部交差は 0 に保つ。
* Phase 2 では生成ロジックを大きく変えず、可視化で主題と応答の entry を確認しやすくする。
* Phase 3 では、候補生成とスコアリングに主題 entry plan の暫定形を渡す。
  * entry plan は、状態、開始 tick、声部、form、global key、local key、local mode、scale degree mapping、移調関係を持つ。
  * 候補は entry plan を満たすことを強く加点し、対位法違反を減点する。
  * 応答 entry 周辺では、5度関係の再認識性と、縦の完全8度・並達完全音程の抑制を別々に評価する。
* Phase 4 では、entry plan を生成器の正規データ構造に昇格する。
  * subject、answer、subject-fragment の生成は entry plan からのみ行う。
  * 現行の voice base octave と semitone offset の組み合わせは、entry plan から MIDI pitch へ変換する薄い層へ縮小する。
  * diagnostics は、entry plan、期待される scale-degree pattern、実際の pitch class sequence を比較する。
  * 真応答と調性応答を選べるようにし、主題の輪郭が tonic-dominant に強く依存する場合は調性応答を優先する。
* subject return では、主調だけに戻すのではなく、近親調での主題再提示も許す。
  * 無限生成では、entry plan が単調にならないよう、声部、調性、密度を状態機械が選ぶ。
  * ただし主題の再認識性を落としすぎないよう、主題冒頭の輪郭とリズムは優先して保つ。

## 教会旋法の導入計画

* 教会旋法は Phase 1 の固定 exposition には入れず、音階モデルをスケール度数ベースへ移した後に導入する。
  * Phase 1-2 は major/minor と現行 MIDI 出力の安定を優先する。
  * Phase 3 で local key と local mode を entry plan に持たせる。
  * Phase 3 後半または Phase 4 で、modal seed を代表 seed セットへ追加する。
* 最初に扱う mode は dorian、mixolydian、aeolian とする。
  * dorian は短調寄りだが第6音が特徴になり、対位法的にも扱いやすい。
  * mixolydian は長調寄りだが第7音が特徴になり、強すぎる導音解決を避けた終止を作りやすい。
  * aeolian は自然短音階として minor との比較対象にする。
* phrygian と lydian は、特徴音が強いため通常候補に入れる前に境界値 seed で検証する。
* locrian は初期の通常生成対象から外す。
  * tonic triad の不安定さが高く、Fugematon の長時間再生の基盤としては別の評価設計が必要になる。
* modal context では、次の評価を diagnostics または soft score に追加する。
  * mode の特徴音が主題または episode で聴き取れる。
  * tonal な導音や属和音に寄りすぎて、mode の性格が消えていない。
  * modal cadence が状態遷移の区切りとして機能している。
  * semitone transposition ではなく scale degree mapping によって subject return が生成されている。

## 生成エンジン API 案

* UI、WebAudio、Canvas に依存しない core API を用意する。
* CI では、この API を直接呼び出して譜面イベント列を検証する。

```ts
type GenerationInput = {
  seed: string;
  lengthTicks: number;
  parameters: GenerationParameters;
  writingProfile?: WritingProfileId;
};

type GenerationOutput = {
  events: ScoreEvent[];
  diagnostics: GenerationDiagnostics;
};

function generateScore(input: GenerationInput): GenerationOutput;
```

* diagnostics には、禁則違反数、声域違反数、主題出現数、状態遷移列などを含める。
* generateScore は同じ input に対して同じ output を返す決定的な関数として扱う。
* `writingProfile` は作曲制約として扱う。音域、快適レジスタ、奏法適性、dynamic responsiveness など、生成結果に影響する楽器編成上の制約だけを持つ。
* pan、volume、MIDI program、reverb、SoundFont、WebAudio oscillator などは `GenerationInput` に入れず、演奏またはレンダリング側の profile で扱う。

## CLI 方針

* CI と手元確認のため、UI を起動せずに生成器を呼べる CLI を用意する。
* CLI とテストは、UI 実装より先に整備する。
* CLI は core API を薄く呼び出すだけにし、生成ロジックを CLI 側に持たない。
* CLI の用途：
  * seed とパラメータから ScoreEvent JSON を生成する。
  * seed とパラメータから MIDI を生成する。
  * diagnostics を JSON または標準出力に出す。
  * 代表 seed セットを一括生成して CI 成果物にする。
* CLI のコマンド例：

```sh
pnpm fugematon generate --seed bach-001 --ticks 7680 --out score.json
pnpm fugematon midi --seed bach-001 --ticks 7680 --out bach-001.mid
pnpm fugematon diagnose --seed bach-001 --ticks 7680
```

* CLI の出力は、ブラウザ UI と同じ core API から得られるものに限定する。

## パッケージ構成

* pnpm workspace により、初期から責務を分ける。
* 初期構成：
  * packages/core
    * UI、WebAudio、Canvas、Node.js 固有 API に依存しない生成エンジン。
    * ブラウザと CLI の両方から使う。
    * `WritingProfile` を入力として扱うが、MIDI バイナリやレンダリング設定は持たない。
  * packages/midi
    * `PerformanceEvent` または core の `ScoreEvent` と演奏 profile を標準 MIDI ファイルへ変換する。
    * MIDI track、channel、program change、pan、volume、controller、meta event の責務を閉じ込める。
  * packages/cli
    * core API を呼び出す CLI。
    * ScoreEvent JSON、diagnostics、MIDI export 呼び出しを担当する。
  * apps/web
    * Vite ベースの Web UI。
    * Canvas ビジュアライザ、WebAudio 再生、操作 UI を持つ。
  * packages/performance
    * WebAudio と MIDI export が同じ演奏解釈を共有するための必須境界として分離する。
    * `ScoreEvent` と `PerformanceProfile` から `PerformanceEvent` を作る純粋変換を担当する。
    * `organ-default`、`string-quartet`、`chamber-band`、`strict-counterpoint` などの profile を、WebAudio と MIDI export の両方から参照できるようにする。
* 後続候補：
  * packages/wasm-core
    * Rust + wasm_bindgen による生成器や PRNG を導入する場合の候補。
    * 初期は作らず、TypeScript 実装で性能や境界を確認してから検討する。
* core は最初からブラウザと Node.js の両方で動くようにし、DOM、AudioContext、Canvas、fs、MIDI encoder へ直接依存しない。

## パッケージ依存ルール

* packages/core
  * 依存してよいもの：
    * TypeScript / JavaScript 標準機能
    * 純粋なデータ構造・アルゴリズム用ライブラリ
  * 依存してはいけないもの：
    * DOM
    * Canvas
    * WebAudio
    * Worker API
    * Node.js の fs / path / process などの実行環境 API
    * MIDI バイナリ encoder
    * UI フレームワーク
  * core は deterministic な生成、診断、作曲制約上の変換だけを担当する。
  * `ScoreEvent` の `velocity` は最終 MIDI velocity ではなく、当面は相対的な dynamic emphasis として扱う。
* packages/midi
  * Node.js API に依存しない純粋な MIDI encoder を基本にする。
  * `PerformanceEvent`、または暫定的に `ScoreEvent` と `PerformanceProfile` を MIDI バイナリへ変換する責務に限定する。
  * MIDI channel、program change、pan、volume、controller、track name などは演奏 profile から解決する。
  * 生成ロジック、diagnostics、score selection は持たない。
* packages/cli
  * Node.js API に依存してよい。
  * ファイル入出力、標準出力、CI 成果物生成を担当する。
  * 生成ロジックと MIDI encoder は持たず、core API と packages/midi を呼ぶ。
* apps/web
  * DOM、Canvas、WebAudio、Worker API に依存してよい。
  * 表示、再生、ユーザー操作、ブラウザ上の履歴管理を担当する。
  * 生成ロジックは持たず、core API または Worker 経由で core を呼ぶ。
  * pan、volume、音色、空間、WebAudio oscillator は共有 `PerformanceProfile` を WebAudio 向けに解釈して解決する。
* packages/performance
  * DOM、WebAudio、Node.js API、MIDI encoder に依存しない。
  * 同じ `PerformanceProfile` から MIDI と WebAudio が共通の velocity curve、articulation、humanize、note length compensation を得るための中間層にする。
  * WebAudio preview という専用 profile は作らない。ブラウザ再生は `organ-default`、`string-quartet`、`chamber-band` など、MIDI export と同じ演奏解釈を使う。
  * `strict-counterpoint` は対位法上の声部と衝突を聴き取りやすくする検査用 profile とし、残響を抑えたピアノまたは近い単純音色、浅い humanize、明瞭な発音を基本にする。
* packages/wasm-core
  * Rust + wasm_bindgen を導入する場合の候補。
  * TypeScript core と API 境界を揃え、置き換えまたは併用できる形を目指す。

## CI 検証方針

* 完全一致のスナップショットテストだけに依存しない。
  * 生成アルゴリズムの改善でイベント列が変わりやすいため、音楽的性質を検証するテストを中心にする。
* seed 再現性の検証では、同一 input に対する output の完全一致を確認する。
* 音楽的品質の検証では、diagnostics の閾値を使う。
  * 声域違反数
  * 声部交差数
  * 並達5度・並達8度の疑い
  * 不協和の未解決数
  * 主題出現数
  * 状態遷移列
  * 生成所要時間
* 代表 seed セットを用意し、CI では複数 seed に対して同じ検証を行う。
* 生成所要時間にも上限を設け、リアルタイム生成に向けた性能劣化を検出する。
* 人間が聴くための確認用に、MIDI エクスポートを用意する。
* CI では、代表 seed から生成した MIDI を成果物として保存できるようにする。
* 生成可能な ScoreEvent JSON や MIDI はリポジトリに fixture としてコミットしない。
  * 手元確認では `pnpm samples:generate` などのスクリプトで必要時に生成する。
  * CI では生成物を成果物として保存し、ソース管理には seed、パラメータ、診断閾値だけを置く。

## 代表 seed セット

* CI の seed は、固定 seed、境界値 seed、ローテーション seed の 3 種類に分ける。
* 基本比率は以下とする。
  * 固定 seed: 50%
  * 境界値 seed: 25%
  * ローテーション seed: 25%
* 固定 seed は、生成器の基本挙動を長期比較するために変更しない。
  * 長調、短調、異なる tonic、異なる主題形、異なる声部開始順を含める。
* 境界値 seed は、テンポ下限、テンポ上限、strictness 下限、strictness 上限、密度高め、密度低めなどを狙う。
* ローテーション seed は、普段の固定集合では見落とす偏りを検出するために使う。
  * CI 実行ごとの完全な乱択にはしない。
  * 週次または任意のタイミングで seed 定義を更新し、レビュー可能な差分として扱う。
* PR では軽量 seed セットを走らせ、main では広い seed セットと MIDI 成果物生成を走らせる。
* seed セットは JSON などの設定ファイルとして管理し、seed 文字列、期待する大まかな属性、適用する diagnostics profile を持たせる。
* 代表 seed から得られる ScoreEvent JSON や MIDI は、必要時に再生成する派生物として扱う。

## MIDI エクスポート方針

* MIDI export は packages/midi の責務とし、core から分離する。
* 入力は `PerformanceEvent` を基本にする。移行中は `ScoreEvent` と `PerformanceProfile` を受け取り、内部で同じ演奏化処理を使ってよい。
* `PerformanceProfile` は MIDI と WebAudio で共有する演奏設定を持つ。MIDI export では、そのうち標準 MIDI に落とせる値を encode する。
  * 声部ごとの track name、channel、program、pan、volume。
  * velocity curve、最小・最大 velocity、accent の効かせ方。
  * articulation、note length compensation、legato overlap、release。
  * deterministic humanize の onset range と velocity range。
  * reverb send や chorus send など、標準 controller に落とせる空間設定。
* `PerformanceProfile` の変更は MIDI や WebAudio の聴こえ方を変えるが、`ScoreEvent` と `generatorVersion` は変えない。review bundle では使用した performance profile id と version を記録する。
* `WritingProfile` の変更は生成される pitch、duration、voice assignment、velocity emphasis を変え得るため、生成差分として扱う。
* 内部の tick 表現は 480 ticks per quarter note を基準にする。
* MIDI の PPQ も 480 に合わせる。
* Phase 0-2 ではテンポと拍子は曲中で変更しない。
* テンポ変更、拍子変更、調号変更は MetaEvent と timebase の型では表現できるようにするが、生成器が安定するまで実際の生成対象にはしない。
* 4声は MIDI 上で分離して扱う。
  * soprano、alto、tenor、bass を別トラックに分ける。
  * 必要に応じてチャンネルも分ける。
* tempo、time signature、key signature などは MIDI メタイベントとして出力する。
* parameter-change や state-change は、標準 MIDI 再生には影響しないため、必要に応じてテキスト系メタイベントとして出力する。
* MIDI エクスポートは、音楽確認用であり、Fugematon 独自の全メタデータを完全保存する形式とは別に考える。
* Fugematon 独自の完全な再現データは、ScoreEvent 列と seed / parameters を保存する形式で扱う。
* 初期実装では `organ-default` profile を用意し、既存 MIDI 出力に近い track layout と program を再現する。次に `string-quartet` や `chamber-band` を追加し、楽譜差分なしで室内楽風またはオルガン風の聴こえ方を WebAudio と MIDI export の両方で比較できるようにする。
* `strict-counterpoint` profile は musical preview ではなく検査用の特殊な演奏解釈とする。残響や音色の厚みで濁りを隠さず、声部独立、同音重複、entry clash、articulation の問題を聴き取りやすくする。

## Fugematon 再現データ形式

* MIDI とは別に、Fugematon 独自の再現データ形式を持つ。
* 再現データは JSON を基本とする。
* 保存する情報：
  * schemaVersion
    * 再現データ JSON の形式バージョン。
    * フィールド追加、名前変更、構造変更が必要になったときの移行判定に使う。
  * generatorVersion
    * 生成アルゴリズムのバージョン。
    * 同じ seed でも生成器が変わると結果が変わる可能性があるため、再現性の境界を明示する。
  * seed
    * 疑似乱数生成器の初期値。
    * 調性、拍子、テンポ、主題、初期パラメータなどを決める起点になる。
  * initialParameters
    * 演奏開始時点の生成パラメータと内部状態の初期値。
    * strictness、density、subjectPresence など、seed 由来または高水準 command から決まる値を含む。MVP では細かな値を直接 UI スライダにしない。
  * timebase
    * tick 解像度、テンポ、拍子、開始 tick などの時間基準。
    * 生成、再生、描画、MIDI エクスポートの共通基準になる。
  * generatedUntilTick
    * events がどの tick まで生成済みかを示す。
    * 巻き戻しや途中再生時に、履歴の有効範囲を判断するために使う。
  * events
    * NoteEvent と MetaEvent の列。
    * 実際のノート、状態遷移、パラメータ変更、テンポ変更などを含む。
  * diagnostics
    * 生成時の診断情報。
    * 禁則違反数、声域違反数、主題出現数、状態遷移列、生成所要時間などを含み、CI やデバッグに使う。
* generatorVersion は、生成アルゴリズム変更後に同じ seed でも結果が変わる可能性を明示するために持つ。
* generatorVersion は、core package version、algorithm version、任意の commit id を組み合わせて記録する。
  * 例: `core@0.1.0 algorithm@1 git:abcdef0`
  * リリース済みビルドでは commit id を含める。
  * 開発中ビルドで commit id が得られない場合は `git:unknown` を許すが、完全再生成の保証対象外とする。
* algorithm version は、同じ seed と initialParameters から生成される ScoreEvent 列が変わり得る変更で更新する。
  * PRNG
  * seed 分布
  * 主題生成
  * 候補生成
  * スコアリング
  * 状態遷移
* package version は配布単位、algorithm version は再現性境界として扱う。
* schemaVersion は、保存形式の移行に使う。
* events には NoteEvent と MetaEvent を含める。
* 完全再現は、「同じ generatorVersion、同じ seed、同じ initialParameters、同じ MetaEvent 列」で成立するものとする。
* 再生モードは以下を分けて考える。
  * event replay
    * 保存済み events をそのまま再生する。
    * generatorVersion が変わっても、保存済みイベント範囲内では同じ演奏になる。
  * deterministic regeneration
    * seed、initialParameters、MetaEvent 列から譜面を再生成する。
    * 同じ generatorVersion であれば同じ結果を期待できるが、保存済み範囲外の完全一致は保証しない。
* 巻き戻し再生は、保存済み範囲内では event replay を基本とする。
* MVP の巻き戻しは event replay のみを正式機能にする。
* 巻き戻し地点から別分岐して続きを生成する branch mode は後続課題とする。
  * branch mode を導入する場合は、巻き戻し tick、分岐元 replay id、分岐後の parameter-change を明示的に記録する。
  * 保存済み events を黙って書き換えず、別 branch として扱う。
* 保存済み範囲を超えて続きを生成する場合は、完全再現ではなく、同じ seed、initialParameters、MetaEvent 列を参考にして自然に続ける扱いとする。
* Fugematon が保証する完全一致は、保存済み events の範囲内に限定する。
* 将来的にファイルサイズが問題になった場合、圧縮やバイナリ形式を検討する。

## フェーズ別実装順序案

* Phase 0: TypeScript + pnpm workspace を作り、core API、CLI、PRNG、時間モデル、決定性テストを実装する。
* Phase 1: 固定長の4声 exposition、初期 diagnostics、MIDI エクスポート、代表 seed による CI 検証を実装する。
* Phase 2: Vite ベースの Web UI、Start 操作、WebAudio 再生、Canvas 2D ピアノロール、seed 入力を実装する。
* Phase 3: exposition -> episode -> subject return -> episode -> stretto-like section の状態機械と、数小節単位の候補生成・スコアリングを実装する。
* Phase 3 UI follow-up: 長尺化した default score をピアノロール全体へ圧縮表示せず、固定秒数の追従 viewport と表示範囲計算テストを追加した。
* Phase 4: 主題を scale degree ベースの抽象表現へ移し、entry plan、true answer、tonal answer、主題同一性 diagnostics を実装する。
* Phase 5: 音楽的品質ゲートとして、レビュー harness、counter-subject、自由対位、旋律美 scoring、HarmonicPlan、VoiceLeadingObligation、episode sequence、cadence plan、stretto clarity、和声安定度スコアを実装する。
* Phase 5.6: Phase 5 review bundle で見つかった大跳躍回収、texture 指標の粗さ、満点に張り付く美しさ diagnostics を修正する。`fugue-smoke` で確認した冒頭4声同時発音、同音高・同方向進行の過多、リズム語彙不足、同音連打、装飾音不足、全声部休止を diagnostics と scoring に入れる。
* Phase 5.7: dorian、mixolydian、aeolian などの modal context を実装し、modal review seed が実際に旋法として生成されることを diagnostics で確認する。
* Phase 5.8: review bundle の手動聴取 gate と聴取メモ rubric を固定し、自動 diagnostics だけで操作機能フェーズへ進まないようにする。`fugue-smoke` は回帰確認 seed として、冒頭 entry、声部独立、音価の多様性、装飾、休符の扱い、アルト主題後の最初のソプラノ応唱が作る和声的濁りを確認する。
* Phase 5.9: Phase 5.6/5.7 の分解指標を review seed 全体へ広げ、counter-subject identity、rhythmic independence、unison、同方向進行、同一リズム、leap recovery、selected candidate の melody cost と texture cost に美しさ gate を置く。`fugue-smoke` では、アルト主題後の最初のソプラノ応唱が支え声部と不安定な 2 度衝突、応唱 local key の root と scale 外音の衝突、解決感の弱い 4 度構成を作らないことを回帰確認する。manual listening judgement が `pass` でない代表 seed と境界 seed は操作機能フェーズ前の blocker として扱う。
* Phase 5.10: 声部独立とリズム対位法を改善する。counter-subject と free counterpoint に主題と異なるリズム型、反行、保持と動きの交替を持たせる。主題生成では、強拍上の structural note、短い note の配置、保持や tie による accent 支持、短い強拍 note の解決先を評価し、`fugue-smoke` のアルト主題が提示時点でリズム感を失わないことを確認する。entry 周辺と stretto-like section の完全協和過密、応唱と支える声部の 2 度衝突、root や structural note 周辺の不安定な 4 度/5 度構成、解決を伴わない avoid note を厳しく扱う。modal seed では、mode の特徴音と counter-subject の再認識性を同時に保つ。
* Phase 5.11: rotation seed と adversarial seed の小集合を review bundle と CI gate に追加し、固定 seed の pass だけでなく閾値からの margin、modal rotation seed の counter-subject identity、entry support instability の局所最大・連続発生・解決期限未達を確認する。Phase 5 はここで完了とし、残る音楽的改善は Phase 6 以降へ移す。
* Phase 6: 旋律線、entry 支持和声、装飾、フレーズ整形を改善する。大跳躍後の回収、局所的な山と谷、同音連打の tie 化または装飾化、cadence 前後の装飾、phrase boundary を扱い、装飾の配置理由を diagnostics に残す。entry support instability は合計だけでなく、解決期限を entry 単位で説明する。entry 周辺の m2、M2、m7、M7 は severe seconds/sevenths として別集計する。3 パート休止による solo texture は、cadence、phrase boundary、または段階的な thinning によって説明できる場合だけ許容し、unsupported solo run、abrupt texture drop、solo voice imbalance を diagnostics に出す。Phase 6 の自動 gate は `docs/phases/phase-6.md` に完了記録を残している。
* Phase 7: 前半では Phase 6 後レビューで残った旋律 contour を、声部単体の大跳躍回収だけでなく、4 拍窓と 8 拍窓で bass と上声が同じ概形へ流れ続ける問題として扱う。bass-upper same-direction ratio、contrary ratio、outer-voice contour は diagnostics、candidate scoring、review bundle schema version 5、CI gate に入っている。後半では Phase 7 音楽美レビューで残った rhythmic independence、unison overlap、entry 周辺の severe seconds/sevenths、modal counter-subject identity、long-run form repetition、主題以外も含む stepwise pattern fixation を、評価説明力と実際の生成改善の両方で扱う。リファクタとして `CandidateEvaluation` の feature extraction を entry、cadence、section、voice-pair、role contour の集計単位へ分け、既存 gate のテストを強化してから scoring を変える。候補評価は hard constraint、rule-based soft score、learned aesthetic score に分ける。`CandidateEvaluation` の dimension 別 breakdown、feature version、evaluation model version、pairwise preference、必要に応じた learned weights の A/B review を扱う。harmony dimension は root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明する。主題フレーズ生成では、`0-1-2-3-4-3-2-1` 型の過多と 5度到達後の同型下降を減らし、answer entry の支え声部が 2度/7度を持続しない候補を優先する。さらに counter-subject、free counterpoint、continuity filler では、長い単調順次進行、上行/下行 step ratio の偏り、同じ degree pattern の横断反復を diagnostics と review gate に入れる。属音開始を緩めて 3度/6度開始を許す案は derived answer として限定検証し、subject identity、local key、後続 structural tone の説明が gate を通る場合に限る。texture density が下がる箇所では、なぜ 1 声だけが残り、他の 3 パートが休むのかを section、phrase、cadence の文脈で説明する。manual listening gate と pairwise preference は Phase 10 quality lane の採否 evidence とし、満点に張り付く dimension は、section 単位の説明が出るまで hard failure ではなく review signal として扱う。生成品質の回帰テストは古い exact metric を守るための固定具にせず、複数 seed の review bundle と音楽美レビューで改善を確認したうえで新しい期待値へ更新できる。
* Phase 7 reference diagnostics reset: Phase 7 後半は、absolute metric の weight tuning を主作業にしない。Bach WTC fugue などの参照作品から Fugematon と同じ diagnostics を生成し、voice-pair independence、entry-local consonance/dissonance、phrase contour、subject/counter-subject recurrence、section density transition、cadence approach、long-run repetition を reference profile として保存する。count は曲長、active voice-pair duration、entry 数、section 数で正規化し、Bach でも文脈つきで現れる unison、shared rhythm、stepwise motion をゼロ要求にしない。CI は hard constraints、reference-relative review signal、manual listening and pairwise preference に分ける。candidate pool oracle で blocker seed の候補集合に同時成立解があるか確認し、存在すれば selection model、存在しなければ section-local planner を直す。PR3/PR4 の blocker audit により、既存 absolute Phase 6/7 gate を完全維持したままでは section-local 改善が戻ることを確認したため、Phase 7A は diagnostics reset と blocker 記録で完了扱いにした。Phase 7B は gate policy を hard constraint、review signal、manual preference へ再分類し、review bundle schema version 11 の `phase7BGate` に分類結果を出すところまで完了した。詳細は `docs/phases/phase-7-plus-reorg.md` と `docs/reviews/phase-7-reference-diagnostics-plan.md` に置く。
* Phase 10: 操作機能より音楽美を優先し、reference corpus manifest、A/B review harness、oracle-driven selection model、section-local planner quality lane、manual pairwise preference template を先に扱った。Phase 10 は完了扱いだが、譜面レビューにより default model adoption には不十分と判断する。実 reference ingestion、manual pairwise listening、learned aesthetic score は継続 quality lane として残る。
* Phase 11: Phase 8/9 の無限再生 operational lane へ進む前に、harmonic rhythm、subject family、section grammar、register planning、functional texture thinning を破壊的変更も含めて再設計する。strong beat chord support、weak beat non-chord-tone role、bass/root support、suspension preparation/resolution、cadence beat arrival を diagnostics と candidate scoring に入れる。主題 family と continuation state cycle の反復を減らし、adjacent voice interval、声部別 pitch span、register blending、cadence から離れた active voice count を review summary に出す。candidate pool oracle は Phase 11 blocker を `selection-model` と `generator-or-section-planner` に分類し、selection で直る問題だけを scoring、tie-break、Pareto guard、説明可能な offline ranking model の探索対象にする。learned aesthetic score は本採用せず、oracle-best と manual pairwise preference を説明できる feature weight の診断 lane に留める。Phase 11 の変更は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持する。Phase 11 は完了したが、post-completion review により similar phrase blocker は Phase 12 へ移す。
* Phase 12: Phase 11 後も残る similar phrase blocker を、Phase 8/9 より前に扱った。phrase-family generator、motive derivation grammar、phrase-level harmonic rhythm、planned support counterpoint を破壊的変更も含めて再設計する方針のうち、subject stem、answer transform、fragment derivation reason、phrase function、section-state pattern を diagnostics と review bundle に出し、guarded phrase-unit planning を採用した。`angular-answer`、`modal-dorian`、`modal-answer`、`modal-cadence`、`dense-modal` の most repeated 4-section pattern count と unique pattern count は Phase 11 current より改善した。repetition はゼロ要求にせず、function-bearing repetition と mechanical repetition を分け、reference profile と比較する。Phase 12 の変更は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持する。voice-independence、leap-recovery、counter-subject identity、repeated-note pressure、low-voice unison span の tradeoff は quality lane に残す。
* Phase 12P: Phase 13 の前に performance profile integration を完了した。`packages/performance` を DOM、WebAudio、Node.js API、MIDI encoder に依存しない純粋変換層として追加し、`ScoreEvent` と `PerformanceProfile` から deterministic な `PerformanceEvent` を作る。MIDI export は `packages/midi` に分離し、WebAudio preview と同じ profile interpretation を使う。pan、volume、program、velocity curve、articulation、humanize、note length compensation は `ScoreEvent` へ混ぜない。review bundle、MIDI metadata、A/B summary には performance profile id と version を残す。Phase 12P は selected output、generator scoring、quality diagnostics threshold、`generatorVersion` を変えず、profile 変更は rendering change として扱う。
* Phase 13: Phase 12P で performance profile boundary を固定した後、Phase 12 後の human feedback で残った高声部 repeated-note pressure、exact unison、second collision、bass-tenor / bass-alto の長い pitch-class unison を、単独 metric のしきい値ではなく quality vector の統計的 review/adoption model として扱った。first pass では selected output を変えず、duration-based voice-pair unison、soprano repeated-note contour/ornament release、entry-local severe interval duration、local sentinel を diagnostics に追加し、review bundle に `qualityVector` と `qualityProfileComparison` を出す。22 seed aggregate は median、p90、max、outside seed count、top contributing axes を持つ。hard constraints は従来どおり残し、vector distance は review-required evidence として扱う。learned aesthetic score や covariance-heavy distance は、reference corpus と pairwise listening evidence が揃うまで exploratory に留める。
* Phase 13Q: Phase 13R と Phase 8/9 の前に、Phase 13 の quality vector evidence を使って candidate diversity、voice independence、entry harmony を生成側で改善した。Phase 12 の phrase/repetition 改善を大きく戻さず、subject stem、answer transform、fragment derivation、phrase function、cadence approach、support role の viable candidate diversity を review bundle に出す。pitch-class unison duration、duration-based lockstep、unresolved entry severe interval duration を主対象にし、quality vector local sentinel を candidate explanations へ戻し、phrase-family / derivation candidates、entry harmony selection guard、voice-pair support candidates、soprano repeated-note detector calibration を扱う。採用 evidence は 22 seed hard constraint failure 0、Phase 7B readiness、A/B review、manual listening gap を記録する。
* Phase 13R: complete。Phase 8/9 の無限再生 operational lane へ戻る前に、通常生成経路を採用済み baseline へ揃え、後半 phrase convergence を修正した。core default generation、CLI、MIDI export、review bundle、Web UI playback は同じ effective selection model を使い、legacy `baseline` は明示的な比較 model として残す。diagnostics と review summary には effective selection model を出す。default-path most repeated 4-section pattern、unique pattern、subject stem / subject-fragment concentration、late-score convergence window を review し、guarded phrase-family / fragment-derivation candidates を identity、entry harmony、leap recovery、voice-pair local sentinel を保てる場合だけ selectable にした。follow-up repair として、focused `organ-default` / `strict-counterpoint` listening、seed 横断で初期主題が少数 family に収束する問題を検出する `subjectFamilyDiversity` review summary と A/B delta、`buildSubject` の degree/rhythm/contour/climax/tail 候補拡張、22 seed と focused ad hoc seed の再レビュー、mechanical subject-fragment convergence と abrupt three-part silence の generator / diagnostics 修正を完了した。Phase 13S はこの baseline を音楽美の観点から再評価し、Phase 8/9 は Phase 13S 後に戻る。
* Phase 13S: complete, superseded for handoff。Phase 13R 後の 22 seed 譜面レビューで確認した主題リズムの同型化と entry friction を、Phase 8/9 の前に music-beauty-first rewrite として扱った。`generatorVersion` 4 で default subject profiles を破壊的に更新し、初期主題 rhythm / climax diversity、entry severe interval evidence、counter-subject identity floor、focused `organ-default` / `strict-counterpoint` listening note を完了 evidence とする。残る voice-pair lockstep と pitch-class unison は Phase 13T の入力に移す。
* Phase 13T: complete, superseded for handoff。Phase 13S 後の current beauty audit で、entry window が pitch-class unison stack と隣接 2度/7度 friction を反復し、duration-based lockstep と pitch-class unison が全 22 seed で外れ、subject-fragment vocabulary と modal counter-subject identity がまだ弱いことを確認した。Phase 8/9 の前に entry-window sonority classifier、voice-pair independence repair、fragment-function evidence、modal counter-subject window review を実装し、score-window evidence と focused listening note で metrics の説明力を確認した。既存 axis が音楽的原因を隠す場合は、metric を split、rename、demote、remove、または role-aware local sentinel へ置き換え、generated score の改善と diagnostic reclassification を分けて記録した。Phase 13U は、Phase 13T 後も残る score-window beauty blocker を引き継ぐ。
* Phase 13U: complete, superseded for handoff。Phase 13T 後の current beauty replan review で、reference aggregate が green に見えても score-window review では repeated entry formula、全 seed voice coupling、fragment transformation 不足、modal counter-subject weakness が残ることを確認した。Phase 8/9 の前に reusable entry formula detector、voice-pair independence localization、fragment transformation evidence、modal counter-subject preservation judgement、metric truthfulness gate を記録した。生成側 pitch repair experiment は旧 guardrail と score-level beauty を悪化させたため採用しない。Phase 13V は、truthfulness layer だけでは不足する line-agency と long-run beauty blocker を引き継ぐ。
* Phase 13V: complete, superseded for handoff。Phase 13U 後の score beauty audit で、truthful metrics がまだ line agency、entry formula novelty、counter-subject survivability、long-run development を美しさとして証明できないことを確認した。Phase 8/9 の前に line-agency scoring、entry-formula novelty budget、counter-subject survivability summary、long-window development summary、focused listening gate を実装した。`qualityVector.schemaVersion` 4 / `modelVersion` 4 と selected-candidate `featureVersion` 6 / `evaluationModelVersion` 12 を Phase 13W baseline とする。既存モデル互換性、旧 guardrail margin、旧 expected values は、譜面上の美しさと矛盾する場合は採用条件にしない。
* Phase 13W: complete for post-exposition bass entries, superseded for handoff。Phase 13V 後の focused inspection で、post-exposition bass entry 境界に外声 3 声の同時再発音が全 22 seed で出ることを確認した。Phase 8/9 の前に `entryBoundaryContinuity` diagnostic、previous-note-aware delayed outside-voice support、synchronized outside-voice onset review signal、focused `organ-default` / `strict-counterpoint` review evidence を実装した。22 seed の post-exposition target では unprepared synchronized reset が 0 になり、Phase 13V の line-agency、entry-formula novelty、counter-subject survivability、long-window development evidence は維持している。
* Phase 13X: complete。Phase 13W 後の first bass entry review で、exposition の初回 bass answer に外声 3 声の同時切断と再発音が全 22 seed で出ることを確認した。Phase 13Y の前に first-bass-entry diagnostic、previous-note-aware exposition support、held / suspended / resolving / staggered outside-voice candidates、focused `organ-default` / `strict-counterpoint` review evidence を実装した。22 seed の first-bass target と 166 post-exposition bass windows は synchronized reset 0 になった。既存モデル互換性や旧 guardrail margin は、譜面上の美しさと矛盾する場合は採用条件にしない。
* Phase 13Y: planned。Phase 13X 後に、entry-boundary continuity を bass-specific な first-bass / post-exposition-bass windows から、entry voice、entry order、entry form、section state、already-entered voices を持つ一般モデルへ広げる。non-bass entry windows、alternate entry-order stress cases、prepared collective articulation、carried / suspended / resolving / delayed / staggered support を score-window evidence として出し、Phase 8/9 の前に `organ-default` と `strict-counterpoint` の focused listening note を記録する。
* Phase 13Z: planned。Phase 13Y 後に、初期主題の多様性改善後も残る long-run phrase convergence を Phase 14/8/9 の前に扱う。`seed-0zereox-1v729ih` と focused seed sweep で確認した subject-return、episode、stretto-like の同一 subject-stem / fragment-family 反復を、windowed diagnostics、guarded stem variation、history-aware novelty budgets、focused listening note で修正する。Phase 13X / Phase 13Y の entry-continuity evidence、Phase 13V の line-agency / long-window evidence、hard constraints、Phase 7B readiness を維持する。
* Phase 14: planned。Phase 13Z 後に、指標が譜面上の美しさを証明していない問題を Phase 8/9 の前に扱う。22 seed bundle と `random-listen-check` / `seed-0zereox-1v729ih` の ScoreEvent review で確認した reference aggregate false acceptance、entry continuity の classifier escape、line agency の低さ、counter-subject survivability 不足、phrase development 不足を、score-window musical acceptance、generator candidate rebuild、metric reclassification、focused listening evidence で修正する。既存モデル互換性、旧 guardrail margin、旧 expected values は、譜面上の美しさと矛盾する場合は採用条件にしない。
* Phase 8: Phase 14 の score-led musical beauty rebuild 後に、無限再生セッションを実装する operational lane。ring buffer replay、segment boundary、state-change / boundary / mode-change メタイベント、continuous fugue / endless program / regenerative cycle のモードを扱う。ユーザー向け操作は高水準 command に絞り、細かな生成パラメータのスライダ化は後続課題にする。Phase 6-7 の美しさ metric と manual listening がすべて pass になることは開始条件にしないが、Phase 13X の first-bass repair evidence、Phase 13Y の generalized entry-continuity evidence、Phase 13Z の long-run phrase-development evidence、Phase 14 の score-led beauty evidence は開始条件にする。UI が音楽的な退屈さ、same-family phrase fatigue、line-coupling defects、entry boundary reset、metric false acceptance を隠す設計にならないよう、Phase 14 の review evidence baseline を前提にする。無限再生セッションは hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を守り、performance profile metadata、review signal、quality vector comparison を消さずに segment 前後で比較できることを条件にする。
* Phase 9: Phase 8 後に Dedicated Web Worker による生成探索の分離、生成期限、フォールバック候補、長時間 visualizer stability を実装する。Worker fallback は hard constraints を満たす候補を返し、reference diagnostics と review signal を維持する。内部状態可視化は生成、描画、再生が分離されても破綻しないことを条件にする。Worker fallback や deadline policy は、Phase 13V / Phase 13W / Phase 13X / Phase 13Y / Phase 13Z / Phase 14 の音楽美 repair を代替しない。

## 生成期限とフォールバック

* リアルタイム再生では、音声スケジューラが必要とする先読み量を下回らないように生成期限を置く。
* Worker での探索は deadline を受け取り、期限内に見つかった best-so-far 候補を返せるようにする。
* 期限内に十分な候補が見つからない場合は、保守的フォールバックを使う。
  * 各声部を声域内に保つ。
  * 声部交差を避ける。
  * 完全5度・完全8度の明らかな並行を避ける。
  * 大きな跳躍を避け、順次進行または保持音を優先する。
  * 短いカデンツまたは和声的に安定した接続で次の探索余地を作る。
* フォールバックで生成した区間は diagnostics に記録する。
* フォールバックは音楽的な最良解ではなく、再生を止めずに破綻を最小化するための安全策として扱う。
* フォールバック発生率が高い seed は CI で検出し、生成探索の改善対象にする。

## フェーズ別検証観点

* Phase 0-1 の CI で確認する項目：
  * seed とパラメータが同一なら、ScoreEvent 列が完全一致する。
  * 指定 lengthTicks 以上の譜面が生成される。
  * 4声それぞれに NoteEvent が存在する。
  * 4声が定義された声域を保つ。
  * 声部交差が許容閾値以下である。
  * exposition で主題または応答が4声に順番に現れる。
  * MIDI エクスポートが生成できる。
* Phase 3 以降の CI で確認する項目：
  * subject return や stretto-like section で主題または主題断片が再出現する。
  * 明らかな禁則違反が許容閾値以下である。
  * 生成所要時間が上限を超えない。
* Phase 4 以降の CI で確認する項目：
  * 全 subject entry が同じ scale-degree pattern として検証できる。
  * answer entry が true answer または tonal answer の計画に一致する。
  * key-signature、local key、実際の pitch class sequence が矛盾しない。
  * voice range fitting が主題の度数列を変化させない。
  * 代表 seed の exposition と subject return で、主題同一性違反が 0 である。
* Phase 5 以降の CI で確認する項目：
  * counter-subject が主題と同時に鳴っても、声域違反、声部交差、未解決の強い不協和が閾値以下である。
  * 強拍の和声安定度、leading tone resolution miss、dominant resolution miss、cadence target miss が代表 seed の閾値内である。
  * episode が次の local key または subject return へ向かう harmonic plan を持つ。
  * tonal context の subject return 前後で predominant -> dominant -> tonic の方向付けが確認できる。
  * deceptive motion、evaded cadence、pivot harmony、modulatory motion が、次の local key または harmonic anchor への到達として説明できる。
  * unresolved ambiguity warning と modulation path mismatch が代表 seed の閾値内である。
  * 同主調転調や parallel major/minor shift が、style profile に対して過多または不足になっていない。
  * 複数 seed の形式、密度、entry 間隔、episode 長が固定 cycle に偏りすぎない。
  * melodic stagnation、leap recovery miss、fallback passage count、stretto clarity score が代表 seed の閾値内である。
  * 冒頭4声同時発音、ユニゾン過多、同方向進行過多、同一リズム過多、同音連打、全声部休止が代表 seed の閾値内である。
  * 音価分布と装飾音密度が style profile と section の役割に対して不足していない。
  * 候補評価は total cost だけでなく、counterpoint、melody、texture、subject clarity、harmony、form の dimension 別 breakdown を出せる。
  * learned aesthetic score を使う場合も、hard constraint failure を採用候補に戻さない。
  * feature version と evaluation model version が diagnostics に記録され、重み変更で ScoreEvent 列が変わる場合は generatorVersion を更新する。
  * 手動聴取用 MIDI と diagnostics summary を再生成できる。
  * Phase 7 以降は 4 拍窓と 8 拍窓の bass-upper contour、outer-voice contour が review bundle に残る。Phase 7B 以降は hard failure ではなく review signal として扱う。
* Phase 10 以降の CI または review harness で確認する項目：
  * A/B review summary は baseline と variant の diagnostics、reference comparison、candidate pool oracle、review signals を seed ごとに比較できる。
  * oracle-driven model update は hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を壊さない。
  * Phase 12P 以降は performance profile id と version を review artifact に残し、MIDI/WebAudio rendering change を generation change と分ける。
  * Phase 13 以降は quality vector comparison、local sentinel regression、top contributing axes、manual listening gap を A/B adoption summary に残す。
* Phase 8 以降の CI で確認する項目：
  * state-change、boundary、mode-change、parameter-change メタイベントは、次の状態遷移または segment 境界以降のイベントにのみ影響する。
* Phase 2 以降の手動またはブラウザテストで確認する項目：
  * AudioContext はユーザー操作後に開始し、演奏が途切れず続く。
  * ブラウザが許す場合は、同一セッションや再訪問時に自動再開を試みる。
  * 自動再開に失敗した場合は、Start 操作で再開できる。
  * 巻き戻し後に、指定地点から再生し直せる。
  * default seed の長尺 score でも、ピアノロールが作品全体を1画面に圧縮せず、表示窓内のノートと主題 entry が視認できる。
  * ビジュアライザが鑑賞体験として破綻していない。

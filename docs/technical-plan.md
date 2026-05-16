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

## 生成パラメータ案

* MVP では、音楽的破綻につながりにくく、聴感上の変化が分かりやすいパラメータからスライダ化する。
* パラメータ変更は即時に生成済みノートへ反映せず、次の状態遷移から有効にする。
* パラメータ変更は parameter-change メタイベントとして履歴に記録する。

### MVP 候補

* strictness: 対位法規則の厳格さ。
  * 高いほど禁則回避を優先し、低いほど旋律的な自由度を増やす。
* density: 音符密度。
  * 高いほど細かい音価や動きが増え、低いほど長い音価が増える。
* subjectPresence: 主題の出現頻度。
  * 高いほど主題や主題断片が頻繁に現れ、低いほど episode 的な推移が長くなる。
* episodeTension: episode の緊張度。
  * 高いほど転調感、順次進行、主題断片の反復を強める。
* voiceIndependence: 声部の独立性。
  * 高いほど各声部が別々に動き、低いほど和声的にまとまった動きが増える。
* registerSpread: 声部間の音域の広がり。
  * 高いほど上下に広く、低いほど密集した響きになる。
* ornamentation: 装飾の量。
  * 高いほど経過音、刺繍音、短い装飾が増える。

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

* diagnostics の閾値は、生成器の成熟度に合わせて段階的に厳しくする。
* 初期は「破綻を検出できること」を優先し、完全な音楽品質判定を CI に背負わせない。
* Phase 0-1 の閾値：
  * 声域違反: 0
  * 声部交差: 0
  * 4声の NoteEvent 欠落: 0
  * exposition の主題または応答の欠落: 0
  * 並達5度・並達8度の疑い: diagnostics に記録するが、CI 失敗条件にはしない。
  * 不協和の未解決疑い: diagnostics に記録するが、CI 失敗条件にはしない。
* Phase 3 以降の閾値：
  * 声域違反: 0
  * 声部交差: 0
  * 並達5度・並達8度の疑い: 生成長に対する比率で上限を置く。
  * 不協和の未解決疑い: 生成長に対する比率で上限を置く。
  * 主題または主題断片の再出現: 状態ごとに最低回数を置く。
  * 生成所要時間: リアルタイム再生の先読み量を下回らない上限を置く。
* 閾値はコード内に散らさず、CI 用の diagnostics profile として管理する。
* diagnostics の項目追加は互換的変更として扱うが、既存閾値の厳格化は generatorVersion とは別に CI 設定の変更として扱う。

## 生成エンジン API 案

* UI、WebAudio、Canvas に依存しない core API を用意する。
* CI では、この API を直接呼び出して譜面イベント列を検証する。

```ts
type GenerationInput = {
  seed: string;
  lengthTicks: number;
  parameters: GenerationParameters;
};

type GenerationOutput = {
  events: ScoreEvent[];
  diagnostics: GenerationDiagnostics;
};

function generateScore(input: GenerationInput): GenerationOutput;
```

* diagnostics には、禁則違反数、声域違反数、主題出現数、状態遷移列などを含める。
* generateScore は同じ input に対して同じ output を返す決定的な関数として扱う。

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
  * packages/cli
    * core API を呼び出す CLI。
    * ScoreEvent JSON、MIDI、diagnostics を生成する。
  * apps/web
    * Vite ベースの Web UI。
    * Canvas ビジュアライザ、WebAudio 再生、操作 UI を持つ。
* 後続候補：
  * packages/midi
    * MIDI エクスポートを core から分離したくなった場合の候補。
    * 初期は core または cli 内に置き、複雑化したら分離する。
  * packages/wasm-core
    * Rust + wasm_bindgen による生成器や PRNG を導入する場合の候補。
    * 初期は作らず、TypeScript 実装で性能や境界を確認してから検討する。
* core は最初からブラウザと Node.js の両方で動くようにし、DOM、AudioContext、Canvas、fs へ直接依存しない。

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
    * UI フレームワーク
  * core は deterministic な生成、診断、変換だけを担当する。
* packages/cli
  * Node.js API に依存してよい。
  * ファイル入出力、標準出力、CI 成果物生成を担当する。
  * 生成ロジックは持たず、core API を呼ぶ。
* apps/web
  * DOM、Canvas、WebAudio、Worker API に依存してよい。
  * 表示、再生、ユーザー操作、ブラウザ上の履歴管理を担当する。
  * 生成ロジックは持たず、core API または Worker 経由で core を呼ぶ。
* packages/midi
  * MIDI エクスポートが複雑になった場合に分離する。
  * core の ScoreEvent を MIDI バイナリへ変換する責務に限定する。
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
  * 週次または任意のタイミングで fixture を更新し、レビュー可能な差分として扱う。
* PR では軽量 seed セットを走らせ、main では広い seed セットと MIDI 成果物生成を走らせる。
* seed セットは JSON などの fixture として管理し、seed 文字列、期待する大まかな属性、適用する diagnostics profile を持たせる。

## MIDI エクスポート方針

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
    * 演奏開始時点の生成パラメータ。
    * strictness、density、subjectPresence など、seed だけではなくユーザ指定で上書きされる値を含む。
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
* Phase 4: リングバッファ履歴、巻き戻し replay、MVP 用スライダ、parameter-change メタイベントを実装する。
* Phase 5: Dedicated Web Worker による生成探索の分離、生成期限、フォールバック候補を実装する。

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
  * parameter-change メタイベントは、次の状態遷移以降のイベントにのみ影響する。
* Phase 2 以降の手動またはブラウザテストで確認する項目：
  * AudioContext はユーザー操作後に開始し、演奏が途切れず続く。
  * ブラウザが許す場合は、同一セッションや再訪問時に自動再開を試みる。
  * 自動再開に失敗した場合は、Start 操作で再開できる。
  * 巻き戻し後に、指定地点から再生し直せる。
  * ビジュアライザが鑑賞体験として破綻していない。

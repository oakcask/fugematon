# 設計メモ

## ブラウザ制約

* ブラウザの自動再生制限により、初回アクセス直後に無操作で音を鳴らすことは難しい可能性が高い。
* 初回は Start ボタンなどのユーザー操作で AudioContext を開始し、その後に演奏を始める設計を基本とする。
* ユーザー操作済みの同一セッションや再訪問時には、ブラウザの許可状態に応じて自動再開を試みる。
* 自動再開に失敗した場合は、明示的な Start 操作を再度求める。

## MVP 方針

* 最初から完成度の高い厳密なフーガ生成を実現することは狙わないが、単なる4声対位法ではなく、主題の再現など「点と点がつながる」視聴体験を持つフーガであることを目指す。
* UI 実装より前に、standalone な生成器、CLI、テストを整備し、seed とパラメータから譜面を生成・検証できる状態を作る。
* MVP は一度に完成させるのではなく、段階ごとに検証可能なフェーズへ分ける。
* フェーズごとに「生成できること」「検証できること」「聴いて確認できること」を増やし、各段階で破綻要因を潰す。

### Phase 0: 生成器の土台

* seed に基づく明示的な疑似乱数生成器を用意する。
* NoteEvent / MetaEvent / ScoreEvent と tick ベースの時間モデルを定義する。
* UI、WebAudio、Canvas に依存しない core API を作る。
* CLI から seed と lengthTicks を指定して ScoreEvent JSON を生成できるようにする。
* 同じ input に対して同じ output が返ることをテストする。

### Phase 1: 固定長 exposition

* seed に基づいて、調性・拍子・テンポ・短い主題を決める。
* 4声に対して、主題または応答が順番に入る固定長の exposition を生成する。
* 初期の対位法制約として、声域制限、声部交差、完全5度・完全8度の疑いを diagnostics で検出する。
* MIDI エクスポートを用意し、生成結果を人間が聴いて確認できるようにする。
* 成功条件は「4声 exposition として聴け、主題の入りが確認でき、明らかな破綻を diagnostics で追えること」とする。

### Phase 2: ブラウザ再生と可視化

* ブラウザローカルだけで Phase 1 の生成結果を再生できるようにする。
* 初回は Start 操作後に AudioContext を開始する。
* WebAudio のシンプルな organ 音色で NoteEvent をスケジュール再生する。
* Canvas 2D のピアノロールで4声のノートをタイムライン上に可視化する。
* ユーザが seed を入力して、同じ演奏を再現できるようにする。
* 成功条件は「生成済みの固定長 score を、音切れなく再生しながら可視化できること」とする。

### Phase 3: フーガ的な継続生成

* exposition 後に、episode、subject return、stretto-like section へ進む状態機械を追加する。
* 主題や主題断片が再現されるように、状態ごとに数小節単位の候補を生成してスコアリングする。
* 応答 entry の5度関係を保ちながら、entry 周辺で持続的な完全8度や並達完全音程が主題の聴感を支配しないように候補を評価する。
* Phase 3 の成功条件は「数分の score で状態遷移、主題再現、長尺 diagnostics を確認できること」とする。
* Phase 3 は構造 MVP と位置づけ、厳密な対位法、美しい対旋律、調性的な終止は後続フェーズで扱う。

### Phase 4: 主題同一性と調性モデルの修正

* 現行 Phase 3 の最優先課題は、声部ごとの基準音により主題の実音高と調性機能がずれることである。
* Phase 4 では、主題を MIDI pitch の列ではなく、scale degree、accidental、rhythm、role を持つ抽象表現として保持する。
* entry ごとに global key、local key、form、voice、register を渡し、同じ主題が声部を変えても同じ旋律機能として再認識できるようにする。
* 応答は単なる semitone offset ではなく、真応答または調性応答として解決する。
* `pitchClassOffset` は diagnostics 互換の表示値として残してよいが、生成判断の正にはしない。
* 成功条件は「exposition と subject return で、全声部の主題が同じ scale-degree pattern として検証でき、key metadata と実際の entry が矛盾しないこと」とする。

### Phase 5: 音楽的品質ゲート、対旋律、和声、カデンツ

* Phase 5 は、操作パラメータを増やす前に音楽的美しさを検証する品質ゲートとして扱う。
* 複数 seed の生成結果を一括生成し、diagnostics、MIDI、聴取メモでレビューできる状態を作る。
* 現行の持続音 counterpoint を、本物の counter-subject と自由対位へ置き換える。
* 主題に対する対旋律は、声部独立、協和・不協和の準備と解決、強拍の安定、弱拍の経過音を評価する。
* episode は主題断片の単純再提示ではなく、順次進行、反行、転回、ゼクエンツ、近親調への推移を持つ候補として生成する。
* subject return の前後には、local key に応じた harmonic plan と cadence plan を置く。
* tonal context では、導音から主音への解決、dominant から tonic への解決、predominant -> dominant -> tonic の方向付けを候補生成と diagnostics に入れる。
* modal context では、古典的な導音解決を常に強制せず、mode の特徴音と modal cadence の到達感を別に評価する。
* seed が調性だけでなく、形式、密度、entry 間隔、episode 長にも影響するようにする。
* 成功条件は「主題以外の声部も旋律として歌い、episode が次の entry へ向かい、状態の区切りで調性的な緊張と解決が聴こえ、複数 seed が同型の固定 cycle に聞こえないこと」とする。

### Phase 5.6-5.8: 美しさ gate の追加

* 操作機能フェーズへ進む前に、Phase 5 review bundle で見つかった音楽品質の弱点を扱う。
* Phase 5.6 では、leap recovery、counter-subject、free counterpoint、episode direction、stretto clarity の diagnostics を分解し、満点が並ぶ指標を疑える状態にする。
* Phase 5.6 では、`fugue-smoke` の聴取で見つかった冒頭4声同時発音、同音高・同方向進行の過多、リズム語彙不足、同音連打、装飾音不足、全声部休止も texture と rhythm の品質問題として扱う。
* Phase 5.7 では、dorian、mixolydian、aeolian などの modal context を実装し、modal seed が実際に旋法として生成されることを確認する。
* Phase 5.8 では、MIDI または Web UI による手動聴取 gate を固定し、自動 diagnostics だけで美しさを完了判定しない。`fugue-smoke` は回帰確認 seed として、冒頭 entry、声部独立、音価の多様性、装飾、休符の扱い、アルト主題後の最初のソプラノ応唱が作る和声的濁りを聴取 rubric に含める。

### Phase 7: 概形進行と評価説明力

* Phase 7 前半では、Phase 6 後レビューで見つかった pitch contour の概形並行を diagnostics と candidate scoring に入れる。
* 4 拍窓と 8 拍窓で bass と上声が同じ方向へ流れ続ける偏りを観察し、反行または斜行が増える候補を texture dimension で優先する。
* Phase 7 後半では、candidate evaluation の dimension breakdown を、seed、section、voice、entry/cadence 周辺、role contour の単位で説明できるようにする。
* Phase 7 後半では、absolute metric の重み調整だけで音楽的な心地よさを完了判定しない。Bach fugue などの参照作品から同じ diagnostics を生成し、Fugematon seed を reference profile と比較する。
* reference profile は、voice-pair independence、entry-local consonance/dissonance、phrase contour、subject/counter-subject recurrence、section density transition、cadence approach、long-run repetition を別々の分布として持つ。Bach でも出る unison、shared rhythm、stepwise motion はゼロ要求にせず、曲長、active voice-pair duration、entry 数で正規化する。
* Candidate evaluation は hard constraint、reference-relative soft gate、manual listening preference を分ける。learned aesthetic score を導入する場合も、参照分布からの外れ方を説明できる feature として扱い、range、voice crossing、subject identity、answer plan などの hard failure を採用候補に戻さない。
* Phase 7 後半の実験では、absolute Phase 6/7 gate の完全維持が section-local planner 改善を戻してしまうことを確認した。このため Phase 7 以降は、range、voice crossing、subject identity、answer plan、determinism、schema compatibility を hard constraint として残し、rhythmic independence、unison、same-pitch、entry-local severe interval、leap recovery、solo texture、stepwise fixation、long-run repetition は review signal へ降格する。
* Phase 7A の成功条件は「reference diagnostics と candidate pool oracle により、absolute metric gate では音楽美を完了判定できないことを説明し、rejected experiments と blocker を記録すること」とする。Phase 7A は音楽美の完成ではなく、gate policy reset のための diagnostics phase とする。
* Phase 7B の成功条件は「review gate を hard constraint、review signal、manual preference に分け、Phase 8 が hard constraints と再現性を保ったまま開始できること」とする。manual listening と pairwise preference は廃止せず、Phase completion blocker ではなく quality lane の採否 evidence として残す。

### Phase 10: quality foundation first

* Phase 7B により Phase 8 は開始可能になったが、現在は無限再生 operational lane より音楽美を優先する。
* Phase 10 では、reference corpus、candidate pool oracle、A/B review、pairwise preference、section-local planner を使い、生成器そのものの品質を上げる。
* oracle が `selection-model` と分類する blocker は scoring、tie-break、weight、Pareto guard で扱う。
* oracle が `generator-or-section-planner` と分類する blocker は、weight tuning ではなく candidate generation または section-local planner で扱う。
* 成功条件は「model update が hard constraints、determinism、schema compatibility、reference diagnostics summary、candidate-pool oracle shape を維持しつつ、代表 seed と境界 seed の review evidence で音楽的改善を説明できること」とする。

### Phase 8: 無限再生セッション

* Phase 8 は Phase 13Q の voice independence / entry harmony 改善後に戻る deferred operational lane とする。Phase 6-7 の美しさ metric と聴取 gate の完全 pass は開始条件にしないが、細かな操作 UI が音楽的な退屈さを隠す設計にならないよう、generator quality、rendering boundary、model adoption evidence を前提にする。
* 生成済みイベントをメモリ上のリングバッファに保存する。
* 保存済み範囲内では event replay により巻き戻して再生し直せるようにする。
* continuous fugue、endless program、regenerative cycle を同じ状態遷移 model の異なる境界表現として扱う。
* ユーザー向け操作は再生モード、seed、performance profile、必要最小限の再生成またはスキップに絞る。strictness、density、subjectPresence などは初期は内部状態とし、直接スライダ化しない。
* 状態変更は即時に生成済みノートへ反映せず、次の状態遷移または segment 境界から有効にし、state-change、boundary、mode-change、必要な parameter-change メタイベントとして履歴に記録する。
* 成功条件は「長時間再生で segment 境界と継続 section が破綻せず、巻き戻し可能な履歴と内部状態可視化を持ち、segment 前後の hard constraint、review signal、quality vector を比較できること」とする。

### Phase 9: Worker 化と安定化

* Phase 9 は Phase 8 後に戻る deferred operational lane とする。
* 生成探索を Dedicated Web Worker に移し、メインスレッドの描画と操作を安定させる。
* AudioWorklet は、標準 WebAudio ノードでは音声処理が不足した場合に導入する。
* OffscreenCanvas、SharedWorker、Service Worker は必要性が明確になってから検討する。
* 成功条件は「生成、描画、再生、内部状態可視化が分離され、長時間動作しても操作感、音声、ビジュアライザの動きが安定すること」とする。

### Phase 11: quality model rebuild before operations

* Phase 10 後の譜面レビューで、音域分離、進行反復、終止感のない thinning、強拍/弱拍を意識しない和声設計が無限再生前の blocker と確認された。
* Phase 11 では、harmonic rhythm、subject family、section grammar、register planning、functional texture thinning を、破壊的変更も含めて再設計する。
* Phase 11 の oracle は、既存候補の selection で直る blocker と、candidate generation または section-local planner を変える必要がある blocker を分類する。`selection-model` は scoring、tie-break、Pareto guard、説明可能な小型 ranking model の探索対象にし、`generator-or-section-planner` は weight tuning で押し切らない。
* learned aesthetic score は Phase 11 の default model にはしない。offline の oracle distillation と manual pairwise preference から説明可能な feature weight を検証する探索 lane に留め、hard constraints、determinism、schema compatibility を上書きしない。
* Phase 11 は完了したが、post-completion 22 seed review で similar phrase blocker が残ったため、Phase 8/9 の直前 baseline には Phase 12 を追加する。

### Phase 12: phrase and repetition quality rewrite

* Phase 12 は、Phase 11 後も残る subject family、subject-fragment、modal/rotation seed の短い cycle を扱う。
* Phase 12 では、phrase-family generator、motive derivation grammar、phrase-level harmonic rhythm、planned support counterpoint を破壊的変更も含めて再設計する。
* repetition はゼロ要求にせず、function-bearing repetition と mechanical repetition を分ける。subject recurrence、fragment recurrence、section pattern recurrence、cadence spacing、density arc は reference profile と比較する。
* Phase 12 は完了し、22 seed review と human feedback は phrase similarity、rhythm feel、part rest closure の改善を支持した。ただし高声部の repeated-note pressure、exact unison、second collision、低声部ペアの長い pitch-class unison は quality lane に残る。

### Phase 12P: performance profile integration

* Phase 12P は完了し、MIDI export と WebAudio preview は同じ `PerformanceProfile` を使う rendering boundary を持つ。
* `ScoreEvent` は作曲結果として安定させ、pan、volume、program、velocity curve、articulation、humanize、note length compensation は `PerformanceProfile` と `PerformanceEvent` で扱う。
* Phase 12P は selected output、generator scoring、quality diagnostics threshold、`generatorVersion` を変えない。聴こえ方の差分は rendering change として扱い、review artifact に profile id と version を残す。
* Phase 13 は、Phase 12P で聴取・MIDI・WebAudio の再現条件を固定してから quality vector review に入る。

### Phase 13: quality vector statistical review

* Phase 13 は、Phase 12 後の残課題を単独 metric のしきい値ではなく、正規化された quality vector の統計的な外れ方として扱う。
* Phase 13 の first pass では selected output を変えず、duration-based voice-pair unison、soprano repeated-note pressure、entry-local severe interval duration、local sentinel checks を diagnostics と review bundle に追加する。
* quality vector は seed、style profile、section role、voice pair ごとの median、p90、max、outside count、top contributing axes を出す。hard constraints は従来どおり残し、vector distance は review-required evidence として扱う。
* learned aesthetic score や covariance-heavy distance は、reference corpus と manual pairwise preference が不足している間は exploratory とする。採用候補は axis-level explanation と local sentinel location に戻せる必要がある。
* Phase 8/9 は、Phase 13 の review/adoption model が Phase 12 baseline を説明できる状態になってから戻る。

## 内部表現

* 内部表現は、五線譜ではなくノートイベント列を基本とする。
* 時間表現は MIDI の考え方を参考にし、tick、拍、小節、テンポを明示的に扱う。
* 例：

```ts
type Voice = "soprano" | "alto" | "tenor" | "bass";

type NoteEvent = {
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number; // MIDI note number
  velocity: number;
};
```

* 生成パラメータ変更、状態遷移、テンポ変更などは、ノートとは別のメタイベントとして記録する。
* メタイベントは、巻き戻し再生と seed による再現性のために使う。

```ts
type ScoreEvent = NoteEvent | MetaEvent;

type MetaEvent = {
  type: "state-change" | "parameter-change" | "tempo-change";
  tick: number;
  payload: unknown;
};
```

## 作曲表現と演奏プロファイルの分離

楽器のリアリティを上げる変更は、作曲判断とレンダリング判断を混ぜない。`ScoreEvent` は「何を鳴らすか」を表す楽譜相当の表現に留め、MIDI / WebAudio / 将来の音源固有の設定は演奏プロファイルで扱う。

* `WritingProfile` は core が見る作曲制約である。
  * 声部または楽器ごとの絶対音域、快適音域、推奨レジスタを持つ。
  * 速い音型への適性、持続音の自然さ、強弱表現の幅など、候補生成や scoring に影響する性質を持つ。
  * `GenerationInput` から選べるようにするが、未指定時は現行挙動に近い default profile を使う。
* `ScoreEvent` は renderer 依存の値を持たない。
  * pitch、duration、voice、role、metrical intent など、楽譜として再現に必要な値を持つ。
  * 既存の `velocity` は当面、最終 MIDI velocity ではなく相対的な dynamic emphasis として扱う。
  * 将来は `dynamicIntent` のような楽譜上の強調意図へ寄せる。
* `PerformanceProfile` は再生・レンダリング側が見る演奏制約である。
  * MIDI channel、program、pan、track volume、velocity curve、articulation、humanize、reverb send などを持つ。
  * 同じ `ScoreEvent` に対して、organ、string quartet、chamber band など複数の演奏解釈を適用できる。
  * WebAudio preview という独立した演奏解釈は置かない。ブラウザ再生は MIDI export と同じ `PerformanceProfile` を使い、WebAudio renderer がその profile を実装する。
  * `strict-counterpoint` は例外的な検査用 profile として、残響や音色の厚みを抑え、声部独立、同音重複、entry clash を聴き取りやすくする。
  * pan、volume、reverb、SoundFont、WebAudio oscillator などは `ScoreEvent` に混ぜない。
* `PerformanceEvent` は `ScoreEvent` と `PerformanceProfile` から得る派生表現である。
  * 最終 velocity、微小 timing、note length compensation、MIDI controller 相当の値を持つ。
  * 人間化は seed または profile id から deterministic に行い、同じ入力から同じ出力を得る。

この分離により、楽器編成によって生成結果を変える必要がある音域・奏法制約は core で扱い、同じ楽譜をどう聴かせるかは MIDI / WebAudio 側で差し替えられる。

## 生成アルゴリズム

* 一音ずつ決定するのではなく、半小節から1小節程度の候補を複数生成し、制約に基づいてスコアリングする。
* seed によって、調性・拍子・テンポ・主題・制約の厳格さを決定する。
* seed 再現性を保証するため、Math.random() は使わず、明示的な疑似乱数生成器を使う。
* 疑似乱数生成器や生成ロジックの中核は、将来的に Rust + wasm_bindgen で内部ライブラリ化することも検討する。
* 主題生成では、規則ベースの安全性を基本にしつつ、seed によって厳格さやランダム性を変化させる。
* 無限生成では、単に対位法的に続けるだけでなく、主題の再現、断片化、転回、移調、episode 的な推移、終止感、反復疲労を状態として扱う。
* 無限再生は、明確な曲間を作らない continuous fugue と、意味的に終止した segment を次々に生成する endless program を区別する。どちらも同じ状態遷移 model を使い、違いは境界を隠すか、成立させるかに置く。
* 初期段階で扱う制約：
  * 声域制限
  * 声部交差の禁止
  * 意図が説明できない完全同音ユニゾンの禁止
  * 完全5度・完全8度の扱い
  * 並達5度・並達8度の抑制
  * 大きな跳躍後の反行
  * 協和音程を基本とし、不協和は経過音・刺繍音として限定する
* Fux 的な species counterpoint の規則をスコア関数として実装し、Bach 的なフーガ構造は上位状態として段階的に追加する。

## 音楽的評価基準

Fugematon の生成品質は、単に禁則違反が少ないことでは評価しない。対位法上の健全さ、フーガとしての構造、旋律としての自然さ、長時間聴いたときの変化を分けて扱う。

個別 diagnostics、reference profile、quality vector、採否 policy の current な意味は [quality metrics reference](quality-metrics.md) に置く。この section は音楽上の原則を扱う。

* hard constraints:
  * 声域違反、声部交差、明らかな並行完全5度・完全8度、未解決の強い不協和など、破綻として扱う項目。
  * 生成器の成熟に応じて CI の失敗条件に昇格する。
* soft score:
  * 禁止はしないが、候補選択で加点または減点する項目。
  * 旋律の歌いやすさ、声部独立、主題の明瞭さ、緊張と解決、密度の変化などを扱う。
* manual review:
  * 数値化しにくい美しさ、退屈さ、主題の記憶しやすさ、長時間再生時の疲れにくさを MIDI またはブラウザ再生で確認する。
  * 代表 seed ごとに短い聴取メモを残し、後続のスコアリング改善の根拠にする。

自動評価では、以下の観点を別々の指標として持つ。

* 対位法上の健全さ:
  * 各声部が独立した旋律として成立する。
  * 同じ MIDI pitch を複数パートが同時に鳴らす exact unison は、同じ楽器で鳴らす texture では声部独立を壊すため、開始・終止の明示的 doubling、短い経過的重なり、将来の音色分離などで説明できる場合を除いて禁則寄りに扱う。
  * bass と上声が数拍単位で同じ概形へ流れ続けると、局所的な禁則がなくても声部独立が弱く聞こえる。Fux 的な反行の原則を参考にし、明示的な chord root が入るまでは bass を proxy として、反行、斜行、保持と動きの交替を優先する。
  * 連続する大跳躍を避け、大跳躍後は反行または順次進行で回収する。
  * 順次進行は自然な旋律運動として許容するが、長い単調順次上行・下降や、主題、対主題、自由対位、continuity filler をまたいだ同じ degree pattern の反復は、機械的な filler として減点する。大跳躍回収 gate が安全な順次型だけを選ばせていないかを role/section 単位で確認する。
  * 強拍の不協和は準備と解決を要求し、弱拍の不協和は経過音または刺繍音として扱う。
  * entry 周辺では、弱拍や経過音の形だけでなく、root を担う声部、chord member、avoid note、4 度音、5 度音、解決先を合わせて評価し、応唱が調性感を濁す候補を避ける。
  * 対位法的な破綻がなくても、avoid note が主題や応唱の目立つ音として強調される候補は、和声的破綻に近いものとして扱う。特に m2、M2、m7、M7 の衝突は 4 パート texture では和音全体を支配しやすいため、テンションノート、掛留、経過音、刺繍音、導音などの役割と解決先を説明できる場合に限って許可する。
  * 完全協和音程は強い響きとして使うが、連続や並達で声部独立を損なわないようにする。
* フーガ構造の明瞭さ:
  * exposition で主題と応答が識別できる。
  * subject return では、主題が別声部または別調性で再認識できる。
  * episode は単なる埋め草ではなく、主題断片、順次進行、転調準備によって次の entry へ向かう。
  * stretto-like section では密度を上げるが、主題の輪郭が潰れないようにする。
* 旋律的な美しさ:
  * 各声部は局所的な山と谷を持ち、同じ音型や同じ音高に停滞しすぎない。
  * リズムは過度に均一にせず、主題、応答、episode で役割に応じた密度差を持つ。
  * 主題は音価の多様性だけでなく metric accent の設計を持つ。強拍上の structural note、短い note、保持、tie、解決先の関係が弱い場合、主題提示の時点でリズム感を失うものとして減点する。
  * 主題の冒頭リズムと輪郭は、聴き手が覚えられる程度に保つ。
* 和声的な説得力:
  * 強拍では調性感のある安定音を優先する。
  * episode では近親調へ自然に向かい、subject return の前後で緊張と解決を作る。
  * tonal context では、導音から主音への解決と dominant から tonic への解決を、特に cadence 周辺で強く評価する。
  * predominant は dominant へ向かう準備として扱い、dominant が tonic へ解決しない場合は deceptive または modulatory motion として説明できる必要がある。
  * 解決を一時的に曖昧にする evaded cadence、pivot harmony、deceptive motion は、次の local key や後続の harmonic anchor へ向かう場合に音楽的表現として評価する。
  * 同主調への転調や parallel major/minor shift は、クラシック語法では控えめ、ポピュラー寄りの語法では自然な明暗変化として評価できるよう style profile で重みを変える。
  * 借用和音的な色彩変化は、local key の完全な変更と区別し、短い表情変化として回収できる場合に許す。
  * 曖昧さは量と持続を管理し、回収されない曖昧さが続く場合は破綻ではなく退屈さや調性不明瞭さとして soft score で減点する。
  * カデンツは乱用せず、状態遷移や大きな区切りを示すために使う。
* 長時間生成の魅力:
  * 主題再現、episode、密度変化、音域変化が周期的すぎず、かつ無関係に散らばらない。
  * 短期的には自然な接続を優先し、長期的には同じ seed で聴き続けたときの形式感を保つ。
  * 破綻回避のためのフォールバックが続いた場合は、音楽的な退屈さとして diagnostics に残す。

スコアリングは単一の総合点だけに潰さない。候補ごとに、禁則、旋律、声部独立、主題明瞭度、和声安定度、形式進行、計算コストを個別に保持し、状態ごとに重みを変える。

## 主題と応答の扱い

* フーガらしさの中核として、exposition では主題と応答の5度関係を明示的に扱う。
  * 主題は主調側の提示として扱う。
  * 応答は原則として属音側、つまり5度上または4度下の提示として扱う。
  * 実装上は、単なる pitch class 差分ではなく、調性とスケール上の度数変換として扱う。
* 同じ主題は、声部や音域が変わっても同じ scale-degree pattern として保持する。
  * 声部ごとの基準 MIDI pitch は、最後に register へ配置するためだけに使う。
  * 主題の開始音や応答の調性は、voice base octave によって変わってはならない。
  * diagnostics では、entry ごとに expected degree pattern と actual pitch class sequence の対応を検査する。
* 5度関係で主題が入ることと、同時に鳴る2声が完全5度または完全8度で固定されることは別の制約として扱う。
  * 前者はフーガ構造上の要件であり、exposition や subject return の状態が担う。
  * 後者は対位法上の縦の響きと声部進行の制約であり、diagnostics と候補スコアリングが担う。
* 応答には段階的に2種類を導入する。
  * 真応答: 主題を機械的に5度移調する。
  * 調性応答: 主調と属調の機能を保つために、冒頭や重要音だけを補正する。
* Phase 1 では真応答相当の単純な5度移調で十分とする。
* Phase 3 までは、状態遷移 MVP のために semitone offset による暫定実装を許す。
* Phase 4 以降では、主題の音型と調性機能を見て真応答と調性応答を選ぶ。
  * 主題が tonic-dominant の輪郭を強く持つ場合は、調性応答を優先する。
  * 短い主題断片や episode 内の模倣では、完全な応答ではなく5度関係の断片再提示として扱う。
* diagnostics では、主題 entry の form、開始 tick、声部に加えて、想定した調性、スケール度数、実際の pitch class 差分、主題同一性の検査結果を追えるようにする。
* ビジュアライザでは、主題と応答を別の強調表示にし、5度関係で入っていることを聴覚だけに頼らず確認できるようにする。

## 音階と調性モデル

MIDI pitch と pitch class は出力表現として使うが、生成器の内部判断はスケール度数と調性機能を持つ表現を基本にする。

* 音高表現は段階的に以下を分ける。
  * scale degree: 主音から見た度数。
  * accidental: 調号に対する変化記号。
  * octave/register: 声域内の実音高を決めるためのオクターブ。
  * pitch class: MIDI や diagnostics で最終的に比較する 0-11 の値。
* 長調、短調、教会旋法は同じ pitch class 集合の差分だけではなく、調性機能の差として扱う。
  * 長調は diatonic scale を基本にする。
  * 短調は自然短音階を基本にしつつ、導音やカデンツでは和声的短音階、旋律的な上行では旋律的短音階を許す。
  * 導音は単なる半音上げではなく、主音への解決期待を持つ音として扱う。
  * 教会旋法は ionian、dorian、phrygian、lydian、mixolydian、aeolian を基本候補にする。
  * locrian は tonic triad が不安定で長時間生成の基盤にしにくいため、初期の自動生成対象からは外し、後続の実験対象にする。
* 教会旋法は「長調/短調の装飾」ではなく、local mode を持つ調性文脈として扱う。
  * dorian は短3度と長6度、mixolydian は長3度と短7度など、旋法ごとの特徴音を主題と episode の評価に使う。
  * modal な文脈では、古典的な導音解決や属和音の強さを常に要求しない。
  * カデンツは tonal cadence と modal cadence を分け、旋法らしい終止音型をスコアリングできるようにする。
* 主題生成では、まずスケール度数列とリズムを作り、その後に調性、声部、音域から MIDI pitch へ解決する。
  * これにより、同じ主題を主調、属調、近親調へ移しても旋律機能を保ちやすくする。
  * 半音階的な音は、経過音、刺繍音、導音、転調準備などの役割を持つ場合に限定して導入する。
* 応答生成では、単純な semitone transposition を最終仕様にしない。
  * 真応答は、主題を属調側のスケール文脈へ移す。
  * 調性応答は、主題内の tonic-dominant 関係が崩れないよう、重要な度数を補正する。
  * 補正の結果として、すべての音が機械的に `+7` semitones になるとは限らない。
* 転調や subject return では、現在の local key を明示的に持つ。
  * 各候補は、生成時点の global key、local key、予定している到達 key を参照する。
  * diagnostics には、entry ごとの key context と scale-degree mapping を残す。
  * local key は tonic だけでなく mode も持ち、major/minor/modal 間の移行を明示する。
  * style profile によって、近親調中心、同主調転調、parallel major/minor shift、借用和音的な色彩変化の重みを変える。

## Seed 由来の初期分布

* seed 文字列は、明示的な疑似乱数生成器の初期化だけに使い、生成中に Math.random() は使わない。
* MVP では、seed から以下を決定する。
  * 調性
  * 拍子
  * テンポ
  * 主題生成の初期値
  * strictness の初期値
  * density、subjectPresence などの内部初期値
* 調性は、まず長調と短調のみを扱う。
  * 長調 55%、短調 45% を目安にする。
  * 調号が多すぎる調は初期品質確認を難しくするため、MVP では 4 sharps / 4 flats 以内を主対象にする。
  * C major / A minor などの単純な調に偏りすぎないよう、seed から tonic を一様寄りに選ぶ。
* 教会旋法は、音階モデルとスコアリングが安定してから seed 由来の初期調性候補に追加する。
  * まず dorian、mixolydian、aeolian から導入する。
  * phrygian、lydian は特徴音による破綻や過剰な印象が出やすいため、代表 seed で確認してから通常候補に広げる。
  * ionian は major、aeolian は minor と重なるが、導音やカデンツの扱いが異なる場合は modal context として区別する。
* 拍子は MVP では 4/4 を基本にする。
  * 4/4: 80%
  * 3/4: 15%
  * 6/8: 5%
  * ただし Phase 0-1 の自動検証では、まず 4/4 を固定して生成器と diagnostics を安定させる。
* テンポは四分音符 BPM で 66-108 の範囲に置く。
  * 中心は 84 BPM 付近に寄せ、極端に速い seed / 遅い seed は境界値テストに回す。
  * 6/8 の場合も内部 tempo は四分音符基準で保持し、表示や MIDI メタイベント側で拍感を解釈する。
* strictness の初期値は 0.65-0.9 の範囲に置く。
  * Phase 0-2 では 0.8 を既定値とし、seed 由来の揺れは小さくする。
  * 生成器が安定した後に、seed 由来の strictness 幅を広げる。
* ユーザ指定パラメータがある場合は seed 由来値を上書きする。
  * 上書き後の initialParameters を再現データに保存し、seed だけに暗黙依存しない。

## 疑似乱数生成器

* 初期実装は TypeScript の core 内に置く。
* PRNG は xoshiro128** を使い、seed 文字列から 32 bit state を 4 個作って初期化する。
* 乱数 API は、整数、浮動小数、重み付き選択、シャッフルを core 内の小さなラッパーとして提供する。
* 実装は 32 bit unsigned integer の演算に限定し、JavaScript の浮動小数丸め差に依存しない。
* PRNG の出力列は単体テストで固定する。
  * seed 文字列ごとに先頭数個の uint32 出力を検証する。
  * 生成器の変更で出力列が変わる場合は generatorVersion を更新する。
* 生成品質に関する回帰テストは、古い exact metric を守るための固定具ではなく、review bundle と音楽美レビューで確認した品質期待を固定するために使う。候補 pattern、weight、gate threshold、quality vector profile を変える場合は、複数 seed の diagnostics、quality vector comparison、local sentinel、MIDI または Web UI 聴取を確認し、改善が妥当なら回帰テストの期待値を更新してよい。
* Rust + wasm_bindgen 化は、生成探索の性能または実装共有の必要性が明確になってから行う。
  * MVP では TypeScript 実装を正とする。
  * wasm 化する場合も、TypeScript 版と同じ seed から同じ出力列になることを互換条件にする。

## フーガ状態機械

* Phase 3 以降では、以下の粗い状態遷移を採用する。
  * exposition
  * episode
  * subject return
  * episode
  * stretto-like section
* exposition では、4声が順番に主題または応答を提示する。
* episode では、主題断片を使いながら、次の主題再現へ向かう推移を生成する。
* subject return では、主題を別声部・別調性で再提示する。
* stretto-like section では、主題の入りを近接させ、密度が上がった印象を作る。
* 各状態の内部生成は最初は簡単に保ち、状態遷移によってフーガらしい大枠を作る。
* Phase 4 以降では、状態遷移だけでなく entry plan の音楽的妥当性を必須条件にする。
  * exposition は、主調の主題と属調側の応答が scale-degree mapping として検証できる。
  * episode は、次の local key または cadence target を持つ。
  * subject return は、声部、local key、主題形、cadence target を明示する。
  * stretto-like section は、密度を上げる前に、重なる主題同士の音程関係と可聴性を評価する。
* Phase 5 以降では、状態ごとの候補スコアを単一の禁則コストに潰さず、主題明瞭度、対旋律品質、和声安定度、カデンツ到達度を別々に保持する。

## モジュール分割案

* core: UI、WebAudio、Canvas、MIDI バイナリに依存しない音楽生成の中核
* composer: 対位法・フーガ構造の生成。`WritingProfile` を使い、楽器または編成に由来する音域・奏法制約を scoring に反映する
* performance: `ScoreEvent` と `PerformanceProfile` から `PerformanceEvent` を作る純粋変換
* midi: `PerformanceEvent` または `ScoreEvent` と `PerformanceProfile` を標準 MIDI ファイルへ変換する
* scheduler: 生成済みまたは演奏化済みノートを WebAudio の時刻に流す
* synth: WebAudio 音源。pan、volume、oscillator、reverb など renderer 固有の設定を扱う
* history: 巻き戻し可能なノートイベント保存
* visualizer: 譜面またはピアノロール表示
* worker: 重い候補探索をバックグラウンド実行

## ビジュアライザ方針

* 初期実装は五線譜ではなくピアノロールを優先する。
* 五線譜表示は、臨時記号、声部配置、タイ、休符、拍節表記などの工数が大きいため後続課題とする。
* 初期ビジュアライザは、デバッグ用ではなく鑑賞用のピアノロールとして作る。
* 4声は明確に色分けし、声域の上下関係が一目で分かる配置にする。
* 小節線、拍グリッド、現在再生位置は控えめに表示し、音符の動きと主題の出現が主役になるようにする。
* 主題、応答、主題断片は通常ノートとは別の強調表示を持つ。
* 生成状態は過度なテキスト表示ではなく、色、透明度、ハイライト、軌跡、境界演出で伝える。
* Phase 8 以降は、主題 family、answer transform、fragment derivation、調性領域、cadence preparation、density arc、novelty budget を、細かな操作パネルではなく鑑賞対象として見せる。
* 五線譜表示や楽譜印刷より先に、長時間眺めても破綻しない動き、密度、色のバランスを優先する。

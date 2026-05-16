# Phase 5 計画メモ

Phase 5 は、Phase 4 で安定させた主題と応答の意味論の上に、音楽的な美しさと対位法の技巧を追加する品質ゲートである。目的は、主題以外の声部も旋律として成立し、episode と cadence が次の entry へ自然に向かい、複数 seed を聴いても機械的な反復に聞こえない状態にすることである。

Phase 4 完了後の複数 seed レビューでは、構造 diagnostics は安定した一方で、全 seed の note 数、entry 数、状態遷移が同型になり、対旋律、episode、cadence、stretto の音楽的説得力が不足していることが分かった。詳細は `phase-4-quality-review.md` を参照する。

## 目的

* 複数 seed の生成結果を、音楽的美しさ、対位法、フーガ技法の観点で継続レビューできるようにする。
* 持続音中心の counterpoint を、counter-subject と自由対位へ置き換える。
* 不協和の準備と解決、経過音、刺繍音、掛留をスコアリングする。
* episode に順次進行、反行、転回、ゼクエンツ、近親調への推移を持たせる。
* subject return の前後に cadence target を置く。
* 導音から主音への解決、predominant -> dominant -> tonic の進行、dominant から tonic への解決を、候補生成と diagnostics の両方に組み込む。
* 解決を一時的に曖昧にして転調する deceptive motion、evaded cadence、pivot harmony を、破綻ではなく管理された表現として評価する。
* 同主調への転調、parallel major/minor shift、借用和音的な色彩変化を、style profile に応じて許容する。
* 候補評価を、禁則コストだけでなく音楽的品質の複数軸で扱う。
* seed が調性だけでなく、形式、密度、entry 間隔、episode 長、stretto 密度にも影響するようにする。

## 再編後の実装順序

### Phase 5.0: レビュー harness と品質 rubric

* 代表 seed、境界 seed、ローテーション seed を一括生成し、diagnostics と MIDI を作るコマンドを用意する。
* 生成物は派生物として扱い、リポジトリには seed、パラメータ、レビュー rubric、診断閾値だけを残す。
* 手動聴取メモの観点を固定する。
  * 主題の覚えやすさ
  * 非 entry 声部が旋律として歌っているか
  * episode が次の entry へ向かっているか
  * stretto が緊張の高まりとして機能しているか
  * 長時間聴いたときの周期性と退屈さ
* diagnostics に、音楽美を直接支える指標を追加する。
  * melodic stagnation warning
  * leap recovery miss
  * leading tone resolution miss
  * dominant resolution miss
  * predominant direction miss
  * controlled ambiguity score
  * unresolved ambiguity warning
  * style modulation fit
  * form repetition warning

### Phase 5.1: counter-subject と自由対位

* 主題と同時に鳴る counter-subject pattern を追加する。
* counter-subject は声部ごとに register へ置くが、輪郭とリズムの同一性は維持する。
* counter-subject は主題の local key と harmonic anchor を壊さず、entry 周辺の tonic、predominant、dominant の機能を支える候補を優先する。
* 非 entry 声部の持続音 fallback を減らし、自由対位候補を優先する。
* diagnostics に counter-subject coverage、free counterpoint coverage、fallback passage count を追加する。

### Phase 5.2: 旋律美 scoring

* 各声部に局所的な山と谷、順次進行、大跳躍後の回収、同音反復の上限を評価する。
* 導音、掛留、不協和、強い半音階的経過音は、その後の解決方向と期限を持つ voice-leading obligation として扱う。
* 声部ごとに短期 contour と長期 contour を分けて scoring する。
* seed によって密度や装飾量が変わっても、歌えない跳躍列や停滞が続かないようにする。

### Phase 5.3: 和声安定度と cadence plan

* section ごとに HarmonicPlan を持たせ、強拍、entry 直前、cadence target などの重要地点に harmonic anchor を置く。
* HarmonicPlan は local key、departure key、target key、harmonic function、cadence target、mode context を持つ。
* HarmonicPlan は style profile を持ち、strict-classical、hybrid、popular-tolerant のどの語法で転調を評価するかを切り替える。
* harmonic function は少なくとも tonic、predominant、dominant、cadential tonic を扱う。
* 強拍の協和、不協和の準備と解決、弱拍の経過音・刺繍音を scoring する。
* tonal context では、導音から主音への解決を cadence 周辺で強く要求する。
* predominant -> dominant -> tonic の流れを subject return と大きな section 境界の基本形として扱う。
* dominant が tonic へ解決しない場合でも、deceptive motion、evaded cadence、pivot harmony、次の local key へ向かう modulatory motion として説明できる候補は許す。
* 解決の曖昧化は、後続の harmonic anchor で回収される場合に加点し、複数 section にわたって local key が説明不能な場合は減点する。
* 同主調への転調は、classical strictness が高い場合は控えめに扱い、hybrid または popular-tolerant では表情変化として加点できる。
* parallel major/minor shift は、主題輪郭、声部進行、range fitting を壊さず、次の harmonic anchor で安定する場合に許す。
* subject return の前後に cadence target を置く。
* local key ごとに tonal cadence と modal cadence を分けられる設計にする。
* diagnostics に unresolved dissonance count、strong-beat dissonance count、cadence target miss、leading tone resolution miss、dominant resolution miss、predominant direction miss、harmonic function mismatch、controlled ambiguity score、unresolved ambiguity warning、style modulation fit、parallel key shift count を追加する。

### Phase 5.4: episode sequence と stretto clarity

* episode に departure key、target key、sequence pattern、fragment transform を持たせる。
* episode は harmonic plan の target key へ向かう tonal sequence として生成し、単なる断片再提示にしない。
* episode では pivot harmony や曖昧な cadence を使って次の local key へ滑らかに移行する候補を持たせる。
* episode では、近親調への推移だけでなく、同主調への転調による明暗変化を候補に含める。
* 主題断片の順次進行、反行、転回を候補生成に入れる。
* stretto-like section は entry 間隔だけでなく、主題輪郭の明瞭さ、応答との関係、他声部の自由対位を評価する。
* diagnostics に episode direction score、stretto clarity score を追加する。

### Phase 5.5: 品質ゲート

* 代表 seed で hard constraints を維持する。
  * 声域違反: 0
  * 声部交差: 0
  * 主題同一性違反: 0
  * 応答計画違反: 0
  * key metadata mismatch: 0
* 代表 seed で soft quality metrics の下限を満たす。
  * counter-subject coverage
  * free counterpoint coverage
  * cadence target hit
  * leading tone resolution
  * dominant resolution
  * harmonic function match
  * controlled ambiguity
  * ambiguity recovery
  * style modulation fit
  * episode direction score
  * stretto clarity score
* 手動聴取で、少なくとも代表 seed が以下を満たす。
  * 主題以外の声部が単なる支え音ではなく旋律として認識できる。
  * episode が次の entry へ向かう推進力を持つ。
  * seed ごとに形式と表情の違いが聴き取れる。
  * 数分聴いても固定 cycle の露骨な反復に聞こえない。

## 実装範囲

* counter-subject pattern の生成と評価を追加する。
* 声部ごとの melodic contour score を追加する。
* vertical sonority score を追加する。
  * 強拍の安定度
  * 弱拍の経過音
  * 未解決不協和
  * 完全協和の過多
* harmonic plan と voice-leading obligation を追加する。
  * local key
  * departure key
  * target key
  * harmonic function
  * cadence target
  * leading tone resolution target
  * dominant resolution target
  * ambiguity intent
  * ambiguity recovery target
  * style profile
  * parallel key target
  * modal cadence context
* episode generator を拡張する。
  * subject fragment sequence
  * contrary motion
  * inversion
  * sequential motion
  * local key target
  * harmonic function target
* cadence plan を追加する。
  * state transition cadence
  * subject return preparation
  * authentic cadence
  * half cadence
  * deceptive or modulatory motion
  * evaded cadence
  * pivot harmony
  * parallel major/minor shift
  * borrowed-chord color shift
  * modal cadence
* diagnostics に以下を追加する。
  * unresolved dissonance count
  * strong-beat dissonance count
  * cadence target miss
  * leading tone resolution miss
  * dominant resolution miss
  * predominant direction miss
  * harmonic function mismatch
  * controlled ambiguity score
  * unresolved ambiguity warning
  * style modulation fit
  * parallel key shift count
  * counter-subject coverage
  * free counterpoint coverage
  * fallback passage count
  * melodic stagnation warning
  * leap recovery miss
  * form repetition warning
  * episode direction score
  * stretto clarity score

## 完了条件

* 代表 seed と追加 review seed を一括生成し、diagnostics と MIDI を再生成できる。
* 代表 seed で、counter-subject coverage が最低閾値を満たす。
* free counterpoint coverage が最低閾値を満たし、持続音 fallback が連続しすぎない。
* 強拍の不安定音と未解決不協和が、生成長に対する閾値内である。
* episode が次の local key または subject return へ向かう harmonic plan を持つ。
* subject return の前後で cadence target と harmonic function の到達が diagnostics 上確認できる。
* tonal context の cadence 周辺で、導音から主音への解決と dominant から tonic への解決が閾値内で確認できる。
* predominant から dominant への方向付けが、episode と cadence preparation の scoring に反映されている。
* 解決を曖昧にする候補は、意図した転調または後続の harmonic anchor への到達として説明でき、unresolved ambiguity warning が閾値内である。
* 同主調転調や parallel major/minor shift は、style profile に照らして過多でなく、主題の再認識性と声部進行を壊さない。
* 手動聴取で、主題以外の声部が単なる支え音ではなく旋律として認識できる。
* seed ごとに形式、密度、entry 間隔、episode 長の違いが確認でき、全 seed が同型の長尺 score にならない。

## 対象外

* 操作パラメータの UI は Phase 5.5 の品質ゲート通過後、Phase 6 で扱う。
* 生成探索の Worker 化は Phase 7 で扱う。
* 五線譜表示は別途必要性が固まってから扱う。

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

## 実装記録

Phase 5 の自動品質ゲートは、review bundle、counterpoint texture、harmonic plan diagnostics、代表 seed の CI 閾値として実装した。

* `fugematon review --out <directory> [--ticks <lengthTicks>]` で Phase 5 review seed の diagnostics JSON と MIDI を一括生成する。
* review summary には seed、カテゴリ、生成ファイル名だけを残し、ローカル環境固有のパスは記録しない。
* 主題 entry と同時に鳴る声部は、持続音 fallback ではなく counter-subject と free counterpoint の role を持つ note として生成する。
* diagnostics は counter-subject coverage、free counterpoint coverage、fallback passage count、melodic stagnation、leap recovery miss を記録する。
* section ごとに HarmonicPlan を持ち、local key、departure key、target key、style profile、cadence kind、ambiguity intent、sequence pattern、fragment transform、harmonic anchor を記録する。
* episode は target key、sequence pattern、fragment transform を持つ harmonic plan として扱い、subject return と stretto-like section は cadence target を持つ。
* diagnostics は cadence target、leading tone resolution、dominant resolution、predominant direction、harmonic function、controlled ambiguity、style modulation fit、parallel key shift、episode direction、stretto clarity、form repetition を記録する。
* seed は state pattern、section duration、target key、style profile、sequence pattern、fragment transform に影響する。
* `PHASE_5_DIAGNOSTICS_PROFILE` と代表 review seed の test により、Phase 5 の hard constraints と soft quality metrics を CI で確認する。

## 完了判定

リポジトリ上の Phase 5 自動完了条件は満たしている。ただし、Phase 5 review bundle の再レビューでは、音楽的美しさを Phase 6 の前提にするには追加の品質フェーズが必要だと判断した。詳細は `phase-5-quality-review.md` を参照する。

* 代表 seed と追加 review seed の diagnostics/MIDI を一括生成できる。
* 代表 seed で声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch は 0 を維持する。
* counter-subject coverage と free counterpoint coverage は最低閾値を満たし、fallback passage count は 0 である。
* cadence target miss、leading tone resolution miss、dominant resolution miss、predominant direction miss、harmonic function mismatch、unresolved ambiguity warning は代表 seed の閾値内である。
* episode direction score、stretto clarity score、controlled ambiguity score、style modulation fit は代表 seed の下限を満たす。
* section plan の state、duration、target key が seed によって変わり、全 seed が同じ長尺形式にならないことを test で確認している。

手動聴取は review bundle が生成する MIDI を対象に継続する。Phase 5 の CI gate は、手動聴取で見つかった退屈さや違和感を後続の rubric と閾値に反映できる形にしている。

Phase 6 の履歴、巻き戻し、操作パラメータへ進む前に、Phase 5.6、Phase 5.7、Phase 5.8 を追加する。Phase 5.7 後の再レビューで、声部独立、旋律線、リズム対位法、美しさ diagnostics の説明力がまだ弱いと分かったため、Phase 5.9-5.12 を追加してから Phase 6 へ進む。

## 評価関数と学習済みパラメータの計画

Phase 5.6 以降では、候補スコアリングを単一の加算ペナルティから、説明可能な多軸評価へ移行する。これは、現在の `scoreCandidate()` が hard constraints、旋律品質、texture coverage を単一 cost に畳み込んでおり、どの音楽的観点が候補選択を支配したか追いにくいためである。

調査した関連研究から、以下の方針を採用する。

* Yang and Lerch, "On the evaluation of generative models in music" は、生成音楽を人間レベルの創造性として一括採点するのではなく、domain knowledge に基づく複数特徴量で絶対・相対評価する方針を示している。Fugematon でも score を単一の美しさ値へ潰さず、counterpoint、melody、texture、subject clarity、harmony、form を分ける。
* Lerch et al., "Survey on the Evaluation of Generative Models in Music" は、出力評価とシステム利用評価、主観評価と客観評価を分ける必要を整理している。Fugematon では runtime scoring、diagnostics、manual listening gate を別責務として扱う。
* Komosinski and Szachewicz, "Automatic species counterpoint composition by means of the dominance relation" は、重み付き加算だけでは評価基準間の衝突が失われる問題を扱っている。Fugematon では total cost は候補選択用に残すが、各 dimension の内訳を diagnostics に残し、将来的には non-dominated candidate の比較も検討する。
* Fang et al., "Bach or Mock?" は、Bach 風 chorale に対する解釈可能な grading function を提案している。Fugematon では、事前学習済み要素を入れる場合も、まず特徴量と重みが読める小さな評価器に限定する。
* DeepBach と Markov Constraints は、学習済みまたは統計的な style model と、ユーザーまたは構造上の constraints を併用できる設計を示している。Fugematon では hard constraints と主題 entry plan は学習済み重みに上書きさせない。

### Runtime 評価器の境界

生成ループ内で使う評価器は、次の三層に分ける。

1. hard constraint gate
   * 声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch、明確な未解決不協和などを扱う。
   * ここは手書きルールを正とし、学習済み重みで許可しない。
2. rule-based soft score
   * leap recovery、melodic stagnation、同音連打、unison pressure、same-motion pressure、rhythmic independence、entry density、episode direction、stretto clarity などを扱う。
   * 既存 diagnostics と同じ feature extraction を使い、候補選択にも使う。
3. learned aesthetic score
   * 手書き特徴量ベクトルに対する小さな重み付き評価器として扱う。
   * 初期形は JSON 化された線形重み、またはそれと同程度に説明可能な小型モデルに限定する。
   * 実行時に外部 API や大型モデルを呼ばない。生成結果の再現性、ブラウザ実行、CI 実行を優先する。

内部型は、単一 number ではなく、候補選択用の `totalCost` と説明用の dimension を分ける。

```ts
type CandidateEvaluation = {
  totalCost: number;
  hardFailures: EvaluationFailure[];
  dimensions: {
    counterpoint: ScoreDimension;
    melody: ScoreDimension;
    texture: ScoreDimension;
    subjectClarity: ScoreDimension;
    harmony: ScoreDimension;
    form: ScoreDimension;
    learnedAesthetic?: ScoreDimension;
  };
};
```

`scoreCandidate()` は当面 `evaluateCandidate(...).totalCost` を返す薄い wrapper にし、既存の候補選択アルゴリズムを大きく変えずに評価内訳を導入する。

### 学習済みパラメータの扱い

学習済みパラメータを導入する場合は、生成器本体に訓練処理を入れない。runtime は固定された評価モデルを読み、offline training は別ツールまたは後続 package で行う。

* `featureVersion` を導入し、特徴量定義が変わった場合は学習済み重みとの互換性を切る。
* `evaluationModelVersion` を diagnostics に記録し、review bundle で manual weights と learned weights を比較できるようにする。
* `generatorVersion` は、学習済み重みの変更で ScoreEvent 列が変わる場合に更新対象とする。
* 学習済み重みは、hard constraint を打ち消せない。候補が hard failure を持つ場合は、learned aesthetic score が高くても採用しない。
* 最初の学習対象は、manual listening gate の pairwise preference と review seed の diagnostics とする。人間が「より良い」と選んだ候補ペアから、soft score の重みを調整する。
* Bach chorale や counterpoint corpus は参照特徴量分布の比較には使えるが、Fugematon の fugue output に直接「Bach らしさ」を強制しない。目的は模倣ではなく、長時間聴けるフーガ的構造の改善である。

### 実装順序

1. Phase 5.6 で `CandidateEvaluation` と dimension 別 scoring を導入し、既存 `scoreCandidate()` を wrapper 化する。
2. Phase 5.6 の texture diagnostics を、候補評価の feature extraction と共通化する。
3. Phase 5.8 の manual listening gate で、seed ごとに「良い候補」「悪い候補」「判断不能」を記録できる形式を追加する。
4. Phase 5.9 として、review seed 全体に美しさ gate を広げ、modal seed や ornament seed の劣化を代表 seed だけで見逃さないようにする。
5. Phase 5.10 として、声部独立とリズム対位法を改善し、unison、同方向進行、同一リズムの過密を候補選択で避ける。
6. Phase 5.11 として、rotation seed と margin gate を追加し、固定 seed への過適合を検出する。
7. Phase 5.12 として、旋律線、跳躍回収、フレーズ境界、装飾配置を整える。
8. Phase 5.13 として、手調整の `EvaluationWeights`、pairwise preference、必要に応じた learned weights の A/B review を扱う。
9. Phase 6 の操作パラメータは、美しさ gate と評価器の feature/weight が説明可能になってから、次の状態遷移以降に反映する。

### 調査した参考文献

* Li-Chia Yang and Alexander Lerch, ["On the evaluation of generative models in music"](https://musicinformatics.gatech.edu/project/on-the-evaluation-of-generative-models-in-music/).
* Alexander Lerch et al., ["Survey on the Evaluation of Generative Models in Music"](https://arxiv.org/abs/2506.05104).
* Maciej Komosinski and Piotr Szachewicz, ["Automatic species counterpoint composition by means of the dominance relation"](https://doi.org/10.1080/17459737.2014.935816).
* Alexander Fang et al., ["Bach or Mock? A Grading Function for Chorales in the Style of J.S. Bach"](https://arxiv.org/abs/2006.13329).
* Gaetan Hadjeres, Francois Pachet, and Frank Nielsen, ["DeepBach: a Steerable Model for Bach Chorales Generation"](https://arxiv.org/abs/1612.01010).
* Francois Pachet and Pierre Roy, ["Markov constraints: steerable generation of Markov sequences"](https://doi.org/10.1007/s10601-010-9101-4).

## Phase 5 追加品質フェーズ

### Phase 5.6: 美しさ diagnostics の分解

* leap recovery miss を候補 scoring の主要重みに昇格する。
* counter-subject と free counterpoint の coverage を、identity、invertibility、contour、rhythmic independence、repetition に分解する。
* exposition 冒頭で4声が同時に鳴り始める候補を避け、主題 entry と応答 entry が段階的に重なることを diagnostics で確認する。
* 同音高、ユニゾン、同方向進行、同一リズムが複数声部に過密に出る箇所を検出し、声部独立を弱める texture として減点する。
* 音価分布を diagnostics に追加し、全音符、2分音符、4分音符、8分音符、16分音符、付点、3連符を style profile と section の役割に応じて扱えるようにする。
* 意図のない同音連打を検出し、保持として聞かせるべき場合は tie へ統合する。
* cadence 前、entry 終端、長い保持音の前後に、trill、mordent、turn などの装飾音候補を追加する。
* 全声部が同時に停止する無音区間を検出し、構造上必要な休止でない場合は品質問題として扱う。
* episode direction、stretto clarity、style modulation fit、controlled ambiguity が全 seed で満点になり続ける場合は、section 単位で満点の理由を説明できる diagnostics にする。
* 候補評価を `CandidateEvaluation` として構造化し、counterpoint、melody、texture、subject clarity、harmony、form の dimension を diagnostics と共有する。
* `scoreCandidate()` は構造化評価の `totalCost` を使う wrapper にし、既存の候補選択を保ちながら評価理由を追えるようにする。

#### 実装記録

Phase 5.6 は、既存の Phase 5 gate を保ったまま、候補選択と diagnostics の説明粒度を上げる変更として実装した。

* `CandidateEvaluation` は `totalCost`、hard failure、counterpoint、melody、texture、subject clarity、harmony、form の dimension を持つ。
* `scoreCandidate()` は構造化評価の `totalCost` を返す wrapper とし、候補選択の互換性を保っている。
* diagnostics は counter-subject identity retention、invertibility、free counterpoint contour、rhythmic independence、support texture repetition、exposition entry stagger、同音高・ユニゾン・同方向進行・同一リズムの過密、音価分布、同音連打、全声部休止、装飾候補密度を記録する。
* exposition 冒頭は、最初の主題 entry で全声部を同時に鳴らさず、既に entry 済みの声部だけが支えるようにした。
* free counterpoint は主題と同じ音価列に固定せず、長い支え音を短い動きへ分割して rhythmic independence の材料を作る。
* section 末尾の全声部休止は、free counterpoint の接続音で埋め、diagnostics 上の all-voice silence gap を 0 に保つ。
* Phase 5.6 用の diagnostics profile を追加し、代表 seed で分解指標と構造化評価の存在を CI で確認する。

#### 完了判定

リポジトリ上の Phase 5.6 自動完了条件は満たしている。

* leap recovery miss は候補評価の melody dimension で主要コストとして扱う。
* counter-subject と free counterpoint は coverage だけでなく、identity、invertibility、contour、rhythmic independence、repetition に分解される。
* exposition 冒頭の段階的 entry は `expositionEntryStaggerScore` で確認できる。
* 同音高、ユニゾン、同方向進行、同一リズム、音価分布、同音連打、全声部休止、装飾候補密度は diagnostics に残る。
* `CandidateEvaluation` の dimension 別 breakdown が review seed の選択済み候補として diagnostics に出る。
* Phase 5 の既存 hard constraints と representative review seed gate は維持している。

### Phase 5.7: modal context と modal review seed

* `KeyMode` に dorian、mixolydian、aeolian を追加する。
* modal seed は実際に modal context を生成することを diagnostics で確認する。
* mode の特徴音、modal cadence、tonal cadence への寄りすぎを指標化する。

#### 実装記録

Phase 5.7 は、review seed 名だけが modal で実体は minor だった問題を修正し、modal context を生成結果と diagnostics の両方で確認できるようにした。

* `KeyMode` に dorian、mixolydian、aeolian を追加した。
* `modal-dorian` は dorian mode の key signature、entry plan、section plan を生成する。
* modal mode の counterpoint は特徴音を含む degree pattern を使い、modal context が実音にも現れるようにした。
* modal section は modal cadence として扱い、tonal cadence への寄りすぎを diagnostics で warning 化できる。
* diagnostics に modal context count、modal characteristic tone hits、modal cadence hits、tonal cadence overuse warnings を追加した。
* MIDI key signature は dorian と mixolydian を relative major、aeolian を relative minor として書き出す。

#### 完了判定

リポジトリ上の Phase 5.7 自動完了条件は満たしている。

* `modal-dorian` の key signature と section plan が dorian mode になる。
* modal context、特徴音、modal cadence は diagnostics 上で確認できる。
* tonal cadence への寄りすぎは representative modal seed の gate で 0 warning を維持する。
* Phase 5.6 までの hard constraints と review seed gate は維持している。

### Phase 5.8: 聴取 gate

Phase 5.7 後の複数 seed review では、hard constraints は安定したが、声部独立、旋律線、リズム対位法、装飾の意味付け、美しさ diagnostics の説明力がまだ弱いと分かった。詳細は `phase-5-8-quality-review.md` を参照する。

* review bundle ごとに diagnostics summary、MIDI、手動聴取メモ、seed 別判定を残す形式を固定する。
* 主題の記憶しやすさ、counter-subject の再認識性、非 entry 声部の歌いやすさ、episode の推進力、stretto の緊張感、長時間の退屈さを seed ごとに記録する。
* `fugue-smoke` を回帰確認 seed として扱い、冒頭 entry、声部独立、リズム多様性、同音連打、装飾音、全休止区間、アルト主題後の最初のソプラノ応唱が作る和声的濁りを聴取で確認する。
* 自動 diagnostics が通っても、聴取で退屈、機械的、声部が独立して聞こえないと判断した seed は Phase 6 へ進めない。
* 後続の learned aesthetic score の教師データにできるよう、候補または生成結果の pairwise preference を保存できる形式を検討する。

#### 実装記録

Phase 5.8 は、review bundle を自動 diagnostics だけでなく手動聴取 gate の入力として扱えるようにした。

* `fugematon review --out <directory> [--ticks <lengthTicks>]` は、seed ごとの diagnostics JSON と MIDI に加えて `listening-review.json` と `pairwise-preferences.json` を生成する。
* `summary.json` は、各 seed の diagnostics/MIDI ファイル名に加えて、hard constraint、texture、melody、form、ornament の要約を持つ。
* `listening-review.json` は、主題の記憶しやすさ、counter-subject の再認識性、非 entry 声部の歌いやすさ、episode の推進力、stretto の緊張感、長時間の退屈さを seed ごとに記録できる。
* `fugue-smoke` の回帰確認観点として、冒頭 entry、声部独立、リズム多様性、同音連打、装飾音、全休止区間、アルト主題後の最初のソプラノ応唱が作る和声的濁りを固定した。
* `pairwise-preferences.json` は、後続の評価重みや learned aesthetic score の教師データ候補として、明確な聴取 preference を記録する空の形式を持つ。
* review bundle 内の参照はファイル名だけを使い、ローカル環境固有のパスを記録しない。

#### 完了判定

リポジトリ上の Phase 5.8 自動完了条件は満たしている。

* review bundle ごとに diagnostics summary、MIDI、手動聴取メモ、seed 別判定を残せる形式が固定されている。
* `fugue-smoke` の聴取 regression checks が review artifact に含まれる。
* 自動 diagnostics が通っても、manual judgement が `pass` でない seed を Phase 6 へ進めない運用にできる。
* pairwise preference を後続の evaluation weight 改善へ渡す形式がある。

### Phase 5.9: review seed 全体の美しさ gate

Phase 5.8 後の再レビューでは、hard constraints は全 14 seed で 0 のままだが、全 seed で texture independence warning と leap recovery miss が残った。詳細は `phase-5-9-quality-review.md` を参照する。

* Phase 5.6/5.7 の分解指標を、単一代表 seed だけでなく review seed 全体に適用する。
* modal seed、close imitation seed、ornament seed、sparse cadence seed を、それぞれ専用の境界条件として扱う。
* counter-subject identity retention、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、leap recovery miss、selected candidate の melody cost と texture cost に review seed 全体の閾値を置く。
* selected candidate の texture cost が高い候補を、hard constraints が clean という理由だけでは採用しない。
* `fugue-smoke` では、アルト主題後の最初のソプラノ応唱が、支え声部に対して不安定な 2 度衝突、応唱 local key の root と scale 外音の衝突、解決感の弱い 4 度構成を作らないことを回帰確認する。
* manual listening judgement が `pass` でない代表 seed または境界 seed は Phase 6 前の blocker として扱う。
* `episodeDirectionScore`、`strettoClarityScore`、`styleModulationFit`、`controlledAmbiguityScore`、`freeCounterpointContourScore` が全 seed で満点に張り付く場合は、section 単位の説明が出るまで Phase 通過条件にしない。
* Phase 5.8 の手動聴取で問題になった seed は、次回 review bundle でも同じ観点を回帰確認する。

#### 実装記録

Phase 5.9 は、Phase 5.6/5.7 で導入した分解 diagnostics を review seed 全体の gate として固定した。

* `PHASE_5_9_DIAGNOSTICS_PROFILE` は、counter-subject identity retention、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap、leap recovery miss、selected candidate の texture cost と melody cost に横断閾値を持つ。
* `modal-dorian`、`close-imitation`、`sparse-cadence`、`ornament-test` は境界 seed として専用条件を持つ。
* `evaluatePhase59Diagnostics` は Phase 5.9 gate 判定を core 側で再利用可能にし、core test と review bundle が同じ閾値を参照する。
* `fugematon review --out <directory> [--ticks <lengthTicks>]` の `summary.json` は seed ごとの `phase59Gate` を出力する。
* `listening-review.json` は、代表 seed と境界 seed の manual listening judgement が `pass` でない場合に Phase 6 前 blocker を残す。
* `fugue-smoke` の最初の応唱で確認する不安定な 2 度衝突、応唱 root と scale 外音の衝突、解決感の弱い 4 度構成は regression check に入れた。

#### 完了判定

リポジトリ上の Phase 5.9 自動完了条件は満たしている。

* review seed 全体の hard constraints と soft beauty metrics は `pnpm test` で検証される。
* review bundle には Phase 5.9 gate 結果が残り、手動聴取 gate が `pass` でない代表 seed と境界 seed は Phase 6 前 blocker になる。
* Phase 5.9 は品質 gate の固定であり、声部独立とリズム対位法の実質改善は Phase 5.10、rotation seed と margin gate は Phase 5.11、旋律線とフレーズ整形は Phase 5.12、評価内訳と preference の説明可能化は Phase 5.13 で扱う。

### Phase 5.10: 声部独立とリズム対位法

* counter-subject と free counterpoint に、主題と異なるリズム型、反行、保持と動きの交替、休符の受け渡しを持たせる。
* unison overlap、same direction motion、shared rhythm overlap を候補選択の主要コストへ引き上げる。
* `fugue-smoke` のアルト主題では、強拍に短い note が置かれることで、主題提示の段階から metric accent が弱まり、後続声部を重ねる前にリズム感が乏しくなっている可能性を検証する。
* 主題生成では、音価の種類数だけでなく、強拍上の structural note、短い note の配置、保持や tie による accent 支持、短い強拍 note の解決先を評価する。J. S. Bach の The Art of Fugue, Contrapunctus I の主題は、模倣対象ではなく強拍配置と主題の覚えやすさを点検する参照例として扱う。
* entry 周辺と stretto-like section では、完全協和の過密、同一リズムの重なり、応唱と支える声部の 2 度衝突、root や structural note 周辺の不安定な 4 度/5 度構成、解決を伴わない avoid note を通常 section より厳しく扱う。
* 対位法的な hard constraint が clean でも、avoid note が主題や応唱の目立つ音として強調される候補は、和声的破綻に近いものとして強く減点する。
* modal context では、mode の特徴音を入れても counter-subject identity retention が落ちないよう、旋法的色彩と再認識性を同時に評価する。
* 音価分布を style profile と section role に結び付け、`ornament-test` が装飾密度だけでなく装飾の配置理由を diagnostics で説明できるようにする。

#### 実装記録

Phase 5.10 は、Phase 5.9 の review seed gate を保ったまま、声部独立と entry 周辺の濁りを Phase 6 前の自動 gate として固定した。

* diagnostics は、強拍上の短い entry note 数と、entry 開始直後に支え声部が作る不安定な 2 度、4 度、増減音程を `shortStrongBeatEntryNoteCount` と `entrySupportInstabilityCount` として記録する。
* candidate evaluation の texture/harmony feature には、unison overlap、same direction motion、short strong-beat entry note、entry support instability を残し、候補選択の理由を review できるようにした。
* `PHASE_5_10_DIAGNOSTICS_PROFILE` は、Phase 5.9 の横断 gate に加えて、short strong-beat entry note と entry support instability の全 review seed 上限を持つ。
* `fugue-smoke` は、冒頭主題の metric accent と最初の応唱周辺の濁りを境界条件として持つ。
* `modal-dorian` は、modal context と counter-subject identity retention を同時に満たす境界 seed として扱う。
* review bundle の `summary.json` は seed ごとの `phase510Gate` を出力する。

#### 完了判定

リポジトリ上の Phase 5.10 自動完了条件は満たしている。

* review seed 全体で Phase 5.9 gate を維持し、rhythmic independence、unison overlap、same direction motion、shared rhythm overlap の横断閾値を満たす。
* 強拍上の短い entry note と entry support instability は review seed 全体の上限内である。
* `fugue-smoke` と `modal-dorian` は、Phase 5.10 の境界 seed 条件を満たす。
* 声部独立とリズム対位法の質的判断は、Phase 5.8 で固定した manual listening gate へ引き続き残す。

#### Phase 5.10 後の再レビュー

Phase 5.10 後の複数 seed review では、固定 review seed は自動 gate を通過したが、追加 rotation seed で rhythmic independence、entry support instability、modal counter-subject identity が崩れた。詳細は `phase-5-10-quality-review.md` を参照する。

このため、Phase 6 の操作パラメータへ進む前に、Phase 5.11 として rotation seed と margin gate を追加する。固定 seed の pass は必要条件に留め、閾値に張り付く seed と追加 seed の fragility を美しさの blocker として扱う。

### Phase 5.11: rotation seed と margin gate

* 固定 review seed に加えて、rotation seed と adversarial seed の小集合を毎回診断する。
* 固定 seed の pass だけでなく、閾値からの margin を記録する。上限または下限に一致する seed は pass でも follow-up 対象にする。
* modal 系 rotation seed は、modal context count だけでなく counter-subject identity retention、same direction motion、leap recovery miss を個別 gate にする。
* entry support instability は score 全体の合計だけでなく、entry ごとの局所最大、連続発生、解決期限を診断する。
* manual listening judgement が `pass` でない代表 seed と境界 seed は、Phase 6 前の blocker として CI または review summary 上で明示する。

#### 実装記録

Phase 5.11 は、固定 review seed の Phase 5.10 gate を保ったまま、rotation seed と adversarial seed の小集合を review bundle と core test の対象へ追加した。

* `PHASE_5_11_ROTATION_SEEDS` は、`restless-line`、`tight-stretto`、`quiet-cadence`、`angular-answer`、`modal-answer`、`modal-cadence`、`contrary-answer`、`dense-modal` を扱う。
* `evaluatePhase511Diagnostics` は、固定 seed と rotation seed の Phase 5.11 gate 結果に加えて、閾値に一致して余裕がない metric を `followUps` として返す。
* modal 系 rotation seed は、modal context count、counter-subject identity retention、same direction motion、leap recovery miss を個別 gate として持つ。
* entry support instability は、全体合計に加えて entry ごとの局所最大、連続発生、解決期限内に安定しない checkpoint 数を diagnostics と gate metrics に残す。
* `fugematon review --out <directory> [--ticks <lengthTicks>]` の `summary.json` は schema version 3 とし、seed ごとの `phase511Gate` を出力する。

#### 完了判定

リポジトリ上の Phase 5.11 自動完了条件は満たしている。

* 固定 review seed、rotation seed、adversarial seed は `pnpm test` の Phase 5.11 gate を通過する。
* 閾値に張り付く seed は `phase511Gate.followUps` に残り、固定 seed への過適合と rotation seed の fragility を review bundle 上で確認できる。
* entry support instability は score 全体の合計、entry ごとの局所最大、連続発生、解決期限未達を確認できる。
* manual listening judgement が `pass` でない代表 seed と境界 seed は、引き続き Phase 6 前 blocker として review bundle に残る。

#### Phase 5.11 後の再レビュー

Phase 5.11 後の複数 seed review では、固定 review seed、rotation seed、adversarial seed はすべて自動 gate を通過したが、20 seed に margin follow-up が残った。特に entry support instability の局所最大と連続発生、modal seed の counter-subject identity、shared rhythm overlap、leap recovery miss が閾値付近に張り付いている。詳細は `phase-5-11-quality-review.md` を参照する。

このため、Phase 6 の操作パラメータへ進む前に、Phase 5.12 では旋律線、entry 支持和声、装飾、フレーズ境界を候補生成と scoring の両方で改善する。Phase 5.13 では follow-up の理由を seed、section、voice、entry/cadence 周辺の単位で説明できるようにする。

### Phase 5.12: 旋律線とフレーズ整形

* 大跳躍後の反行、順次回収、局所的な山と谷、長期 contour を候補生成と scoring に入れる。
* 意図しない同音連打は tie または装飾的反復へ変換する。
* cadence 前、entry 終端、長い保持音の前後に、trill、mordent、turn、passing tone、neighbor tone を style profile に応じて配置する。
* 装飾は候補密度だけでなく、phrase、cadence、entry に対する配置理由を diagnostics へ残す。
* subject return や cadence target の前後に、聴感上の呼吸と緊張解決が分かる phrase boundary を置く。
* `bright-answer`、`contrary-motion`、`modal-answer` は leap recovery の境界 seed として扱う。
* `tight-stretto`、`modal-cadence`、`fugue-smoke`、`wide-key`、`contrary-answer` は entry 支持和声の境界 seed として扱う。
* `restless-line`、`minor-entry`、`sparse-cadence`、`modal-answer` は rhythmic independence と shared rhythm の境界 seed として扱う。
* `ornament-test` と `ornament-cadence` は、装飾密度ではなく装飾の配置理由を diagnostics で説明できる境界 seed にする。

### Phase 5.13: 評価重みと pairwise preference

* 手調整の `EvaluationWeights` を source code 内の散在した係数から分離し、feature version と evaluation model version を持つ小さな定義として管理する。
* review bundle は、total cost だけでなく dimension 別の score breakdown を出力する。
* subject clarity、harmony、form の cost が常に 0 になる場合は、満点理由と低評価理由を seed、section、voice、entry/cadence 周辺の単位で説明できるまで gate 対象にしない。
* harmony dimension は、root、chord member、avoid note status、non-chord tone role、解決期限を entry/cadence 周辺で説明し、経過音扱いや対位法上の許容が和声機能を壊していないか確認できるようにする。
* hard constraint、rule-based soft score、learned aesthetic score の寄与を別々に表示し、どの重みが候補選択を支配したか確認できるようにする。
* offline training で pairwise preference から soft score の重みを学習する場合、初期モデルは線形重みまたは説明可能な小型モデルに限定し、runtime に外部 API、非決定的推論、大型モデルを入れない。
* learned weights は hard constraints と manual listening gate を上書きできない。採用前に manual weights と A/B review し、代表 seed の diagnostics と聴取 gate を同時に満たすことを確認する。
* 学習済み重みを採用して ScoreEvent 列が変わる場合は、`generatorVersion` を更新する。

## 対象外

* 操作パラメータの UI は Phase 5.9-5.12 の美しさ gate、声部独立、旋律線、評価内訳整備後、Phase 6 で扱う。
* 生成探索の Worker 化は Phase 7 で扱う。
* 五線譜表示は別途必要性が固まってから扱う。

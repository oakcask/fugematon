# Phase 4 音楽品質レビュー

Phase 4 完了時点で、複数 seed の score を生成し、音楽的美しさ、対位法、フーガ技法の観点から構造レビューした。ここでの結論は、Phase 4 の意味論的な土台は安定している一方で、音楽作品としての魅力はまだ Phase 5 の前提にできない、というものである。

## レビュー範囲

対象 seed:

* Phase 4 代表 seed: `bach-001`, `fugue-smoke`, `minor-entry`, `wide-key`, `dense-entry`, `stretto-smoke`
* 追加 seed: `lyrical-line`, `modal-dorian`, `circle-fifths`, `close-imitation`, `sparse-cadence`, `bright-answer`, `dark-episode`, `ornament-test`, `long-arc`, `contrary-motion`

生成長は Phase 3/4 の長尺検証と同じ `PHASE_3_LENGTH_TICKS` とした。確認用 MIDI は `samples/phase4-review/` に生成した。MIDI は派生物なのでコミット対象にしない。

このレビューは ScoreEvent と diagnostics からの構造レビューであり、最終的な美しさの判定には MIDI または Web UI での聴取メモを併用する。

## 良かった点

* 全 seed で声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch は 0 だった。
* 主題 entry は entry plan に基づいて生成されており、同じ主題を別声部・別 local key で検証できる。
* 並達完全音程の疑いは多くの seed で 0、問題が出た seed でも 2 件程度に収まった。
* 長尺 score でも exposition、episode、subject return、stretto-like section の状態遷移が継続する。

## 見つかった問題

### 1. seed 差が形式の差になっていない

全 16 seed が同じ note 数、同じ subject entry 数、ほぼ同じ状態遷移列になった。

* note 数: 全 seed で 353
* subject entry: 全 seed で subject 18、answer 10、fragment 16、合計 44
* section cycle: exposition 後に `episode -> subject-return -> episode -> stretto-like` が固定反復する

これは再現性としては扱いやすいが、長時間聴く音楽としては周期性が強すぎる。seed は調性や局所的な候補選択だけでなく、形式、密度、entry 間隔、episode の長さにも影響する必要がある。

### 2. 対旋律がまだ旋律ではない

非 entry 声部は主に持続音の支えとして追加されている。主題の背後で独立した counter-subject が歌っておらず、フーガとしての技巧が弱い。

確認された兆候:

* 非 entry 声部の長い空白が多く、最大休止は多くの声部で 6-7 quarter に達する。
* support note は tonic 由来の協和音に寄り、リズムと輪郭の個性を持たない。
* 主題が鳴っていない声部が、対話ではなく伴奏的な穴埋めに聞こえるリスクが高い。

### 3. 旋律線に大跳躍が多い seed がある

複数 seed で、4度を超える跳躍の比率が高い声部が出た。特に `ornament-test` は全声部、`sparse-cadence` は bass、`minor-entry` は alto/bass/tenor が強い警戒対象である。

大跳躍自体は禁則ではないが、回収がないまま続くと歌いにくく、主題以外の声部が機械的に聞こえる。Phase 5 では大跳躍後の反行、順次進行、局所的な山と谷を scoring に入れる。

### 4. episode が次の entry へ向かっていない

現状の episode は subject fragment の再提示と支え音で構成され、和声的な到達目標を持たない。次の subject return へ向かう緊張、ゼクエンツ、反行、転回、近親調への推移がまだ弱い。

必要な改善:

* episode ごとの departure key、target key、cadence target を持つ。
* 主題断片の反復を、単なる再提示ではなく sequence として扱う。
* subject return の前に、local key を準備する短い harmonic plan を置く。

### 5. stretto-like section が形式的すぎる

stretto-like section は二つの entry を固定間隔で重ねる形に留まっている。密度は上がるが、主題輪郭が潰れない範囲、応答との関係、他声部の処理が十分に評価されていない。

stretto は「entry が近い」だけではなく、緊張の高まりとして機能する必要がある。Phase 5 では stretto を独立した技巧評価の対象にする。

### 6. modal seed の評価基盤がまだない

`modal-dorian` は実際には minor key として生成された。Phase 4 時点の `KeyMode` は major/minor のみで、dorian などの mode はまだ表現できない。

modal な美しさを評価する前に、local mode、特徴音、modal cadence を内部表現と diagnostics に追加する必要がある。

### 7. 美しさを測る diagnostics が足りない

現在の diagnostics は構造破綻を見つけるには有効だが、美しさや技巧の弱さを十分には説明できない。

追加が必要な指標:

* counter-subject coverage
* free counterpoint coverage
* melodic stagnation warning
* leap recovery miss
* leading tone resolution miss
* dominant resolution miss
* predominant direction miss
* controlled ambiguity score
* unresolved ambiguity warning
* modulation path mismatch
* style modulation fit
* parallel key shift count
* unresolved dissonance count
* strong-beat dissonance count
* cadence target miss
* harmonic function mismatch
* episode direction score
* form repetition warning
* stretto clarity score

## 計画への反映

Phase 5 は、counter-subject、自由対位、episode、cadence を一度に足す機能追加フェーズではなく、音楽的品質ゲートとして再編する。

新しい順序:

1. Phase 5.0: 生成レビュー harness と聴取メモの導入
2. Phase 5.1: counter-subject と自由対位の最低品質
3. Phase 5.2: 旋律美の scoring
4. Phase 5.3: HarmonicPlan、導音解決、和声安定度、cadence plan
5. Phase 5.4: episode sequence と stretto clarity
6. Phase 5.5: 代表 seed の品質閾値と手動聴取ゲート

Phase 6 の履歴、巻き戻し、操作パラメータは、Phase 5.5 の品質ゲート通過後に扱う。美しさの評価軸が固まる前に操作パラメータを増やすと、退屈さや技巧不足をユーザー操作で隠す設計になりやすいためである。

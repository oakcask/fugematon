# Phase 5 音楽品質レビュー

Phase 5 の review bundle を複数 seed で生成し、音楽的美しさ、対位法、フーガ技法の観点から diagnostics を確認した。自動 gate は Phase 4 より進んでいるが、音楽的美しさをプロジェクトの核心として扱うには、操作機能フェーズへ進む前に追加の品質フェーズが必要である。

## レビュー範囲

生成コマンド:

```sh
pnpm build
pnpm fugematon review --out samples/phase5-review --ticks 129600
```

対象 seed:

* `bach-001`
* `fugue-smoke`
* `minor-entry`
* `wide-key`
* `lyrical-line`
* `modal-dorian`
* `circle-fifths`
* `close-imitation`
* `sparse-cadence`
* `bright-answer`
* `dark-episode`
* `ornament-test`
* `long-arc`
* `contrary-motion`

確認した指標:

* hard constraints: 声域違反、声部交差、主題同一性違反、応答計画違反、key metadata mismatch
* 対位法 texture: counter-subject coverage、free counterpoint coverage、fallback passage count
* 旋律: melodic stagnation warning、leap recovery miss
* 和声と形式: cadence target、leading tone resolution、dominant resolution、predominant direction、harmonic function、controlled ambiguity、style modulation fit、form repetition、episode direction、stretto clarity

## 良かった点

* 全 seed で hard constraints は 0 だった。
* 全 seed で fallback passage count は 0 で、counter-subject と free counterpoint の role を持つ note が生成されている。
* note 数、entry 数、section 数、状態遷移列は seed ごとに変化しており、Phase 4 の「全 seed がほぼ同型」という問題は改善している。
* first 10 section の形式 signature は 14 seed すべてで異なり、少なくとも自動 diagnostics 上は固定 cycle の完全な反復ではない。
* cadence、leading tone、dominant、predominant、harmonic function、ambiguity recovery の miss は 0 だった。

## 見つかった問題

### 1. 大跳躍の回収不足が全 seed に残っている

全 seed で leap recovery miss が出た。範囲は 10-34 件で、特に `long-arc`、`modal-dorian`、`bach-001`、`circle-fifths`、`bright-answer`、`contrary-motion` が多い。

これは現在の gate では許容範囲内だが、音楽的美しさの観点では弱い。主題以外の声部が歌える旋律として聞こえるためには、大跳躍後の反行、順次進行、局所的な山と谷を、単なる warning ではなく候補選択の主要な重みにする必要がある。

### 2. 美しさの diagnostics がまだ粗すぎる

`episodeDirectionScore`、`strettoClarityScore`、`styleModulationFit`、`controlledAmbiguityScore` は全 seed で 1 だった。これは全 seed が美しいというより、現行指標が候補間の差を十分に説明できていない可能性が高い。

Phase 5 の自動 gate は「明確な破綻がない」ことを確認するには有効だが、「より美しい候補を選べている」ことの証明にはまだ弱い。指標は section 単位、声部単位、entry 周辺、cadence 周辺に分解し、満点が並び続ける場合は diagnostic 自体を疑う。

### 3. counter-subject coverage と free counterpoint coverage が同値に近い

全 seed で counter-subject coverage と free counterpoint coverage が同じ値になった。role の存在は確認できるが、counter-subject が独自の旋律として主題と絡んでいるか、free counterpoint が単なる pattern 埋めになっていないかまでは十分に分からない。

次の改善では、coverage だけでなく以下を分けて見る。

* counter-subject identity retention
* counter-subject invertibility near entries
* free counterpoint contour score
* rhythmic independence score
* support texture repetition score

### 4. modal seed が modal review になっていない

`modal-dorian` は minor mode として生成され、section plan の mode も minor のみだった。seed 名だけでは modal な美しさを検証できない。

modal review を成立させるには、`KeyMode` に dorian、mixolydian、aeolian などを追加し、mode の特徴音、modal cadence、tonal cadence との距離を diagnostics に出す必要がある。

### 5. 並達完全音程の疑いが複数 seed に残っている

一部 seed では parallel perfect interval warning が出た。現行 gate では hard failure ではないが、フーガの技巧としては声部独立を弱める。entry 周辺と stretto-like section では、主題の可聴性を保つために完全協和の扱いをより厳しくする。

### 6. 手動聴取メモがまだ計画の第一級成果物になっていない

review bundle は MIDI を生成できるが、聴取メモの保存形式と rubric がまだ固定されていない。音楽的美しさを核心にするなら、自動 diagnostics だけで Phase 完了を宣言しない。

### 7. `fugue-smoke` の聴取で、フーガらしさを弱める具体的な texture 問題が確認された

`fugue-smoke` の譜面確認では、diagnostics が通っていても聴感上はフーガとして弱い箇所が複数見つかった。

* 冒頭から4パートすべてが鳴っており、声部が順に加わる exposition の効果が弱い。
* 同じ音符、同じ向きの進行、ユニゾンに近い重なりが多く、声部独立と対比が不足している。
* 音価の種類が少なく、4/4 の中で全音符から16分音符、付点音符、3連符までを使うリズム語彙が不足している。
* 同音連打が退屈に聞こえる箇所があり、意図のない反復は tie への統合や別音型への置換を検討する必要がある。
* トリルなどバロック音楽で代表的な装飾音がなく、表情と華やかさが不足している。
* すべてのパートが停止する無音区間があり、効果的な休符ではなく生成上の空白として聞こえる。

これらは、現在の coverage や hard constraints では検出しきれない。Phase 5.6 では、冒頭 entry density、同方向・同音高の重複、ユニゾン比率、声部間 rhythmic independence、音価分布、同音連打、全休止区間、装飾音密度を diagnostics と scoring に入れる。

## 計画への反映

Phase 6 の履歴、巻き戻し、操作パラメータは、以下の追加品質フェーズを通過するまで開始しない。

### Phase 5.6: 美しさ diagnostics の分解

* leap recovery miss を候補 scoring の主要重みに昇格する。
* melodic contour を声部単位で短期 contour と長期 contour に分ける。
* counter-subject と free counterpoint の coverage を、identity、invertibility、contour、rhythmic independence、repetition に分解する。
* exposition 冒頭では、全声部同時発音ではなく、主題 entry と応答 entry の段階的な積み上がりを texture gate として評価する。
* 声部間の同音高、ユニゾン、同方向進行、同一リズムの過多を検出し、対位法的な対比が弱い候補を減点する。
* 音価分布を diagnostics に出し、長音価、短音価、付点、3連符を style profile と section の役割に応じて使えるようにする。
* 意図のない同音連打は melodic stagnation と別に検出し、保持音として扱うべき箇所は tie へ統合する。
* trill、mordent、turn などの装飾音候補を、cadence 前、entry 終端、長い保持音の前後で制御して使う。
* 全声部が同時に停止する区間を検出し、cadence 後の明確な区切りでない限り品質問題として扱う。
* episode direction、stretto clarity、style modulation fit が全 seed で満点になり続ける場合は、section 単位で満点の理由を説明できるようにする。

### Phase 5.7: modal context の実装と review seed の正規化

* `KeyMode` に dorian、mixolydian、aeolian を追加する。
* modal seed は実際に modal context を生成することを diagnostics で確認する。
* mode の特徴音、modal cadence、tonal cadence への寄りすぎを指標化する。
* `modal-dorian` は minor seed ではなく dorian seed として成立させる。

### Phase 5.8: 聴取 gate

* review bundle ごとに手動聴取メモを残す形式を決める。
* 各 seed について、主題の記憶しやすさ、非 entry 声部の歌いやすさ、episode の推進力、stretto の緊張感、長時間の退屈さを短く記録する。
* `fugue-smoke` は回帰確認 seed として扱い、冒頭の段階的 entry、声部独立、リズム多様性、同音連打、装飾音、全休止区間を聴取 rubric に含める。
* 自動 gate を通過しても、聴取で退屈または機械的と判断した seed は操作機能フェーズへ進む条件を満たさない。

### Phase 5.9: 評価関数の説明可能化

* `scoreCandidate()` を単一の加算ペナルティから、hard constraint、rule-based soft score、learned aesthetic score を分ける構造へ移す。
* counterpoint、melody、texture、subject clarity、harmony、form の dimension 別 score breakdown を review bundle に出し、満点や低評価の理由を section 単位で追えるようにする。
* 手調整の評価重みを feature version と evaluation model version 付きで外部化し、候補選択を支配している重みを確認できるようにする。

### Phase 5.10: 学習済み評価パラメータの検討

* Phase 5.8 の聴取メモと pairwise preference を教師データ候補にし、offline training で soft score の重みを学習する。
* runtime には外部 API や大型モデルを入れず、説明可能な小型重みモデルだけを採用候補にする。
* learned weights は hard constraints を上書きできない。採用前に manual weights と A/B review し、代表 seed の diagnostics と聴取 gate を同時に満たすことを確認する。

## 再編後の優先順位

1. Phase 5.6: 旋律美と texture 指標の分解
2. Phase 5.7: modal context と modal review seed
3. Phase 5.8: 手動聴取 gate と rubric 固定
4. Phase 5.9: 評価関数の説明可能化
5. Phase 5.10: 学習済み評価パラメータの検討
6. Phase 8: 履歴、巻き戻し、操作パラメータ
7. Phase 9: Worker 化とリアルタイム生成期限

この順序により、UI 操作で退屈さを隠す前に、生成器そのものが美しいフーガを作る責任を持つ。

# Phase 7+ 再編計画

Phase 7 の reference diagnostics と candidate pool oracle は、既存の absolute metric gate が音楽的改善を止める場合があることを示した。特に solo texture を改善する section-local planner は、局所的には risk を下げても unison、same-pitch、leap recovery、modal identity の既存 gate を壊しやすい。逆に gate を完全に守ると、改善候補は baseline と同じ結果へ戻る。

このため Phase 7 以降は、音楽美を単一の pass/fail gate で完了判定しない。hard constraint、review signal、manual preference を分け、Phase 8 の操作機能は hard safety と再現性が通る状態で開始できるようにする。美しさの改善は Phase 8 以降も継続する quality lane として扱う。

## Gate 方針

### Hard constraint として残す

以下は参照作品との距離や style profile に関係なく、CI failure として残す。

* range violation、voice crossing、key metadata mismatch。
* subject identity violation と answer plan violation。
* unresolved strong dissonance など、現行 diagnostics が明確な破綻として扱うもの。
* generator determinism、schema compatibility、review bundle の生成可能性。
* Phase 7 reference diagnostics と candidate pool oracle の出力 shape。

### Review signal へ降格する

以下は美しさや style fit に関わるが、単体の absolute threshold を Phase 8 blocker にしない。CI は schema と集計の存在を確認し、値は review bundle と docs で比較する。

* rhythmic independence、shared rhythm overlap、unison overlap、same-pitch overlap。
* severe entry interval と unresolved severe entry interval。
* leap recovery misses、stepwise pattern fixation、free-counterpoint contour。
* solo texture risk、abrupt texture drop、long-run form repetition。
* bass-upper / outer-voice contour ratio。
* counter-subject identity retention と modal identity margin。

これらは「増えたら即失敗」ではなく、どの style profile で、どの section role で、何と引き換えに増えたかを review する。改善 PR は、少なくとも代表 seed と境界 seedで hard constraint を壊さず、悪化した review signal の理由を docs に残す。

### 廃止または凍結する

以下の運用は廃止する。

* `Phase 6/7 gate を完全維持しなければ Phase 8 へ進まない` という運用。
* manual listening が全 seed `pass` になるまで操作機能を始めない運用。
* absolute count の小さな悪化だけで、diagnostics-backed 改善を戻す運用。

ただし manual listening と pairwise preference は廃止しない。Phase completion blocker ではなく、quality lane の採否 evidence として残す。

## 再編後の Phase

### Phase 7A: diagnostics reset

既存の Phase 7 前半、reference diagnostics、candidate pool oracle、completion blocker 記録までを Phase 7A とする。

完了条件:

* Phase 6/7 の既存自動 gate は現状の破綻回避 baseline として通る。
* reference diagnostics comparison が review bundle に出る。
* candidate pool oracle が selection-model と generator-or-section-planner を分類できる。
* rejected section-local experiments と completion blocker が docs に残っている。

Phase 7A は音楽美の完成を意味しない。これは「absolute metric gate だけでは進めない」ことを確認した再設計フェーズとして完了扱いにする。

### Phase 7B: gate policy reset

次に、CI gate を hard constraint と review signal に分ける。

実装順:

1. review gate code に hard/review/manual の分類を持たせる。
2. existing Phase 6/7 metrics のうち、review signal へ降格するものは CI fail ではなく `review-required` または `warning` として出す。
3. tests は hard constraint が失敗すること、review signal が summary に残ること、Phase 8 branch が hard constraints だけで検証できることを確認する。
4. docs に、どの metric が hard failure ではなくなったかを明示する。

### Phase 8: 操作機能 MVP

Phase 8 は Phase 7B の hard constraint policy が入った後に開始する。美しさ gate の完全 pass は開始条件にしない。

完了条件:

* ring buffer replay、rewind、parameter-change meta event が deterministic に動く。
* 操作によって hard constraint failure や schema break が起きない。
* 操作後の generated score も reference diagnostics と review signal を出せる。
* UI または CLI review bundle で、操作前後の diagnostics と manual listening note を比較できる。

### Phase 9: Worker 化と安定化

Phase 9 は既存計画どおり Dedicated Web Worker、生成期限、best-so-far fallback を扱う。ただし quality review signal を worker fallback の採否にも出す。

完了条件:

* deadline 内に hard constraint を満たす候補または保守的 fallback を返せる。
* timeout や fallback が review signal を消さない。
* 長時間動作で replay と parameter-change history が壊れない。

### Phase 10: reference corpus と quality lane

Phase 7 の未完了 quality work は Phase 10 以降の継続 lane とする。

対象:

* MusicXML/Humdrum score ingestion。
* Bach fugue、chorale、modal/early reference の percentile profile。
* section-local planner の新候補生成。
* pairwise listening と manual preference の蓄積。
* learned aesthetic score を使う場合の説明可能な feature/weight。

Phase 10 の変更は、Phase 8/9 の操作・安定化を止めない。hard constraints を壊す変更だけを blocker とし、review signal の悪化は tradeoff として記録する。

## 音楽理論上の扱い

Fux 的な対位法、Bach fugue、common-practice harmony は引き続き判断軸にする。ただし unison、shared rhythm、stepwise motion、entry-local seconds/sevenths は、文脈次第で既存作品にも現れる。したがって、これらをゼロ要求または単純な absolute ceiling にしない。

今後の review では、現象を以下へ分類する。

* hard failure: style に関係なく破綻。
* style-profile preference: strict-classical では避けたいが、hybrid や popular-tolerant では許容できる。
* review-required: diagnostics だけでは採否を決めず、MIDI/Web UI 聴取と pairwise note が必要。
* acceptable tradeoff: 改善対象が明確で、悪化 seed と理由が docs に残っている。

## 次の PR 候補

1. `review-gate` の分類を hard/review/manual に分け、Phase 6/7 の美しさ metric を review signal へ降格する。
2. Phase 8 の branch を開始し、operation MVP の hard constraint test を追加する。
3. reference corpus ingestion は Phase 8/9 と並行する quality lane として進める。


# CI And Review Scope For Seeds And Metrics

CI の seed と metric は、生成器の破綻を早く止めるための最小集合に保ちます。音楽的美しさの調査、metric の説明力確認、聴感上の比較は、CI へ広げる前に review bundle と music-theory review で扱います。

## Classification

| Class | Use for | Required action |
| --- | --- | --- |
| `ci-blocking` | public contract、schema、determinism、hard constraint、既知の重大な音楽的破綻を安定して検出する軽量 check。 | PR CI で失敗させる。追加時は対象 seed、metric、実行時間への影響、失敗時の修正先を記録する。 |
| `ci-observed` | CI 成果物や summary に残すが、単独では失敗させない観察値。 | regression note や review input として使う。しきい値を置く前に、音楽的症状と修正先を review で確認する。 |
| `review-required` | 譜面上の良し悪し、metric truthfulness、style fit、seed 横断の傾向を見るもの。 | music-theory review、A/B review、manual listening で処理する。CI へ昇格するには `ci-blocking` の条件を満たす必要がある。 |
| `manual-listening` | 自動 metric だけでは判断できない聴感、長時間疲労、pairwise preference。 | listening note と未実施 gap を残す。CI では pass/fail にしない。 |
| `remove-or-archive` | 重複、説明力のない metric、古い phase だけの expected value、修正済み症状の過剰 seed。 | 削除、doc-only history 化、または review-only へ降格する。削除理由と置き換え先を記録する。 |

## Metric Criteria

`ci-blocking` にしてよい metric は、次をすべて満たすものに限ります。

* deterministic で、同じ generator version、seed、selection model、snapshot derivation から安定して再現する。
* failure が具体的な修正先を持つ。例: generator、planner、scoring、diagnostics schema、public API。
* 単独の数値が音楽的症状を十分に表すか、hard constraint として症状の説明を必要としない。
* PR CI での実行時間増加が小さい、または既存の軽量 seed set で計測できる。
* threshold が現在の phase の採用判断に必要で、review-only signal では遅すぎる。

次のいずれかに当たる metric は `review-required` または `ci-observed` に留めます。

* 改善したように見えても譜面上の美しさを証明しない aggregate。
* style profile や section role によって良否が変わる値。
* 数値の悪化が、より重要な音楽的改善との tradeoff かもしれないもの。
* 原因が generator ではなく diagnostic の粗さ、axis 設計、windowing にあり得るもの。
* 追加すると、多数の seed 生成や長い score-window 解析が必要になるもの。

削除または archive を検討する metric は、次のどれかに当たるものです。

* 失敗しても対応方針が毎回 review に戻るだけで、CI の blocker として機能しない。
* より局所的で説明力のある sentinel、score-window evidence、manual rubric に置き換えられた。
* 古い phase の expected value を守るだけで、現在の音楽モデルの良さと矛盾する。
* どの seed でも常に満点、常に同じ値、または他の metric と同じ情報しか出さない。

## Seed Criteria

CI seed は、役割を明示した小集合にします。

* fixed seed: 長期比較の基準。削除は慎重に行い、代替 seed と過去 evidence を記録する。
* boundary seed: 特定の hard constraint や既知の高リスク pattern を軽量に検出する。
* rotation seed: 固定集合への過適合を見つける。PR CI では代表 subset、review では広い集合を使う。
* adversarial seed: 生成器の失敗 mode を狙う。CI に入れるのは、短時間で deterministic に失敗を検出できるものだけにする。
* review-only seed: 音楽的症状、style fit、metric truthfulness、長時間疲労を見るための seed。通常は CI へ入れない。

seed を CI に追加する前に、次を記録します。

* その seed が代表する failure mode または境界条件。
* 同じ failure mode を既存 seed がすでに覆っていない理由。
* どの metric が fail したら、どの修正先へ戻すか。
* PR CI、main CI、review bundle のどこで走らせるか。
* 追加後も shard 時間 budget に収まる見込み。

CI seed から外す候補は、次のどれかに当たるものです。

* 既存 seed と同じ pattern だけを検出している。
* 長い review でしか意味がなく、PR CI では短すぎて症状を表せない。
* 修正済み症状の再発確認としては、より小さい focused metric または sentinel で足りる。
* 失敗時に毎回 manual listening や譜面レビューが必要で、CI の即時修正に向かない。

## Review Processing

music-theory review、A/B review、phase completion review で seed や metric を追加、変更、削除、昇格、降格する場合は、レビュー本文に `CI / review scope` を短く置きます。

記録する項目:

* touched seeds and metrics: 対象 seed と metric。
* classification: `ci-blocking`、`ci-observed`、`review-required`、`manual-listening`、`remove-or-archive`。
* reason: 音楽的症状、hard constraint、determinism、実行時間、重複、説明力不足。
* action: CI に残す、CI に追加する、review bundle に移す、manual listening に残す、削除する。
* evidence gap: 未実施の聴取、未生成の review bundle、未確認の seed class、未計測の runtime。

分類に迷う場合は、まず `review-required` として扱います。CI 昇格は、譜面上の症状、seed 横断性、修正先、runtime がそろってから行います。

## Promotion And Removal Rules

CI へ昇格するには、review doc または phase doc に次を残します。

* 代表 seed、境界 seed、rotation seed のどれで確認したか。
* metric が表す具体的な musical symptom。
* その metric が false acceptance または false rejection を起こしにくい理由。
* 失敗時にどう修正するか。
* CI 実行時間への影響。

CI から削除または降格するには、次を残します。

* 削除対象が守っていた症状。
* 現在の代替 evidence または代替 check。
* 削除しても hard constraint、public contract、known severe regression を見逃さない理由。
* 必要なら review-only seed や manual listening rubric へ残す場所。

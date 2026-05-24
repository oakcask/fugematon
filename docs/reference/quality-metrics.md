# Quality Metrics Reference

Fugematon の音楽品質指標の入口です。指標の一般的な意味、正規化、採否上の扱いはここから読んでください。実装履歴文書は、指標を追加、採用、保留した経緯だけを持ちます。

## Read First

* [diagnostics](quality-metrics/diagnostics.md): `GenerationDiagnostics` に出る主要指標の意味。
* [reference profile](quality-metrics/reference-profile.md): Bach などの参照作品と比べる正規化指標。
* [quality vector](quality-metrics/quality-vector.md): `qualityVector` と `qualityProfileComparison`。
* [adoption policy](quality-metrics/adoption-policy.md): hard failure、review signal、manual listening、A/B review の読み方。
* [CI and review scope](quality-metrics/ci-review-scope.md): seed と metric を CI、review、manual listening、削除候補へ分類する基準。
* [metric naming policy](quality-metrics/naming-policy.md): current な metric、gate、review surface から履歴番号名を外す命名方針。

## Metric Classes

* hard constraints: 声域、声部交差、主題同一性、応答計画、key metadata、未解決不協和、全声休止など、生成結果の破綻として扱うもの。
* diagnostics: 生成結果の観察値。単独では採否を決めず、seed、section、声部、音楽的症状へ戻して読む。
* reference-relative metrics: 曲長、active voice-pair duration、entry 数、section 数などで正規化して、参照 profile からの外れ方を見るもの。
* quality vector: normalized review/adoption model。単独 axis のしきい値ではなく、分布、外れ seed、local sentinel、manual listening gap と合わせて読む。
* metric reconstruction: 譜面レビューが、既存 axis の集計では音楽的原因を説明できないと示した場合に、axis を分割、改名、降格、削除、または role-aware sentinel へ置き換える作業。Metric 改善と metric 再分類を区別して記録する。
* CI / review scope classification: seed や metric を `ci-blocking`、`ci-observed`、`review-required`、`manual-listening`、`remove-or-archive` に分け、CI の実行時間と音楽美レビューの説明責任を両立するための分類。
* score-window musical acceptance: top-level beauty evidence。譜面上の entry continuity、line agency、counter-subject survivability、phrase development を seed、tick、voice、role、音楽理論上の根拠へ戻して読めない metric は、採用判断ではなく調査 signal として扱う。
* manual listening and pairwise preference: 自動指標では説明しきれない聴感上の判断。通常は implementation completion blocker ではなく、model adoption evidence として扱う。ただし current implementation note が特定の聴取 evidence や、そこで見つかった音楽的問題の修正 evidence を開始条件へ昇格した場合は、その履歴文書を優先する。

## Where History Lives

* 指標がなぜ追加されたか: [reviews](../reviews/README.md) の該当レビュー。
* 指標をいつ採用、降格、保留したか: [implementation history](../phases/README.md) の該当記録。
* CI profile や閾値管理方針: [technical plan](technical-plan.md)。
* CI に入れるか、review-only にするか、削除するかの分類基準: [CI and review scope](quality-metrics/ci-review-scope.md)。

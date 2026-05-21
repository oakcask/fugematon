# Quality Metrics Reference

Fugematon の音楽品質指標の入口です。指標の一般的な意味、正規化、採否上の扱いはここから読んでください。Phase 文書は、その Phase で指標を追加、採用、保留した履歴だけを持ちます。

## Read First

* [diagnostics](quality-metrics/diagnostics.md): `GenerationDiagnostics` に出る主要指標の意味。
* [reference profile](quality-metrics/reference-profile.md): Bach などの参照作品と比べる正規化指標。
* [quality vector](quality-metrics/quality-vector.md): Phase 13 以降の `qualityVector` と `qualityProfileComparison`。
* [adoption policy](quality-metrics/adoption-policy.md): hard failure、review signal、manual listening、A/B review の読み方。

## Metric Classes

* hard constraints: 声域、声部交差、主題同一性、応答計画、key metadata、未解決不協和、全声休止など、生成結果の破綻として扱うもの。
* diagnostics: 生成結果の観察値。単独では採否を決めず、seed、section、声部、音楽的症状へ戻して読む。
* reference-relative metrics: 曲長、active voice-pair duration、entry 数、section 数などで正規化して、参照 profile からの外れ方を見るもの。
* quality vector: Phase 13 以降の review/adoption model。単独 axis のしきい値ではなく、分布、外れ seed、local sentinel、manual listening gap と合わせて読む。
* metric reconstruction: 譜面レビューが、既存 axis の集計では音楽的原因を説明できないと示した場合に、axis を分割、改名、降格、削除、または role-aware sentinel へ置き換える作業。Phase 13T 以降は、metric 改善と metric 再分類を区別して記録する。
* manual listening and pairwise preference: 自動指標では説明しきれない聴感上の判断。通常は Phase completion blocker ではなく、model adoption evidence として扱う。ただし current Phase 文書が特定の聴取 evidence や、そこで見つかった音楽的問題の修正 evidence を開始条件へ昇格した場合は、その Phase 文書を優先する。

## Where History Lives

* 指標がなぜ追加されたか: [reviews](../reviews/README.md) の該当レビュー。
* 指標をいつ採用、降格、保留したか: [phases](../phases/README.md) の該当 Phase。
* CI profile や閾値管理方針: [technical plan](technical-plan.md)。

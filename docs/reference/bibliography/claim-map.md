# Claim Map

Fugematon 固有の設計判断、review 判断、quality policy と文献根拠の対応を管理します。外部文献そのものの情報は [references.md](references.md) に置きます。

## Entry Format

```text
## <claim-id>

* Claim: <Fugematon 固有の判断>
* Applies to: <design | generation | scoring | diagnostics | review | phase-scope | license>
* Evidence: <ref id または source-family id>
* Confidence: <high | medium | low>
* Verification state: <source-family | edition-checked | page-checked | score-example-checked>
* Limits: <この claim を適用してはいけない範囲>
* Used by: <関連する docs、tests、code area>
```

## Current Claims

既存 Phase/review docs の literature claims は、次に該当文書や関連実装へ触れる時に必要なものから claim entry へ昇格します。新しい文献根拠で実装方針、quality gate、phase scope、review 採否を変える場合は、その変更と同じ差分で entry を追加します。

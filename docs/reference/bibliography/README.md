# Bibliography Reference

文献、引用、source-family 根拠を review 可能な形で管理するための入口です。

## Read First

* [citation-governance.md](citation-governance.md): cache から versioned docs へ昇格する判断基準と標準手順。
* [references.md](references.md): 外部文献そのものの台帳。Fugematon 固有の判断は書かない。
* [source-families.md](source-families.md): review で使う文献群や理論領域の定義。
* [claim-map.md](claim-map.md): Fugematon 固有の設計判断、review 判断、quality policy と文献 ID の対応。

## Read When

* 文献や引用が実装方針、phase scope、quality gate、review 採否、ライセンス判断に影響する場合は、まず governance を読む。
* 個別文献の DOI、URL、出版情報、accessed date を確認する場合は references を読む。
* 「Fux/species counterpoint」「common-practice fugue」「generative music evaluation」など、個別ページ未検証の source-family 根拠を使う場合は source-families を読む。
* 文献からプロジェクト固有の判断へどう接続したかを確認する場合は claim-map を読む。

## Skip When

* 単発の検索候補、未検証メモ、取得途中の metadata だけを扱う場合は `.bibliography-cache/` に留め、docs へ昇格しない。

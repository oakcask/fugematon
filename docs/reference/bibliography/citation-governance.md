# Citation Governance

この文書は、文献 cache と versioned docs の責務を分け、実装と review で引用根拠を追跡できるようにする標準手順です。

## Rules

* `.bibliography-cache/` は作業用 cache とし、取得 metadata、検索結果、短い snapshot、検証メモを置く。git 管理される設計根拠としては扱わない。
* `docs/reference/bibliography/` は review 済みの引用台帳とし、実装判断や review 判断に使う最小限の文献情報だけを置く。
* 外部文献そのものの情報は `references.md` に置き、Fugematon 固有の判断や解釈は `claim-map.md` に置く。
* 複数文献をまとめた理論領域や source-family は `source-families.md` に置く。個別版、ページ、譜例を未確認の場合は、その状態を明記する。
* Phase、review、reference docs では、長い文献説明を重複させず、必要な ref id、claim id、source-family id を参照する。
* 文献根拠の精度を誇張しない。edition、page、score example、license、updated date を未確認なら未確認と書く。
* 著作権で保護された本文、譜面、長い引用は cache や docs に保存しない。metadata、リンク、短い許容範囲の引用、agent-written summary に留める。

## Promotion Criteria

`.bibliography-cache/` から docs へ昇格するのは、文献が次のいずれかに影響する場合です。

* 実装方針、data shape、API、生成モデル、scoring model。
* phase scope、完了条件、deferred work、rejected experiment。
* music-quality gate、diagnostics threshold、quality vector、review-required policy。
* manual listening review、seed 横断 review、採否判断。
* 外部 score、corpus、tool、dataset の license や redistribution policy。

次の場合は cache に留めます。

* 単発の検索候補。
* 未読または未検証の候補文献。
* 代替案調査中の一時メモ。
* 取得日時や検索順位だけが必要な作業記録。

## Standard Procedure

1. `bibliography-fetch` または `bibliography-cache` で cache を確認し、必要なら source metadata を更新する。
2. cache record の `metadata.json` と `citation.md` を確認し、DOI、URL、出版情報、accessed date、verification confidence を埋める。
3. 文献が promotion criteria を満たす場合だけ、`references.md` に ref entry を追加または更新する。
4. 文献群として再利用する場合は、`source-families.md` に source-family entry を追加または更新する。
5. Fugematon 固有の判断に使う場合は、`claim-map.md` に claim entry を追加または更新し、根拠の強さと未確認事項を書く。
6. Phase、review、reference docs では、本文に ref id、claim id、source-family id を短く書き、長い説明は bibliography docs へ寄せる。
7. 文献根拠によって planned behavior、phase scope、diagnostics gate、review policy が変わる場合は、該当 docs も同じ変更で更新する。
8. 変更後に、追加した relative links と ref id の参照先を確認する。

## Entry Rules

Ref id は安定して短い kebab-case にします。

```text
temperley-2019-uniform-information-density
marlowe-2020-fugue-form
fux-species-counterpoint-source-family
```

同じ文献に DOI、arXiv ID、ISBN がある場合は、cache key と同じく DOI、arXiv ID、ISBN、canonical URL の順で安定識別子を優先します。docs の ref id は人間が読める短名にし、stable identifier は entry 内に書きます。

## Review Checklist

* 文献情報と Fugematon 固有の判断が別ファイルに分かれている。
* ref id、claim id、source-family id が重複していない。
* 未確認の edition、page、score example、license を断定していない。
* cache の作業メモや gitignored file の内容を docs にコピーしていない。
* 長い引用、譜面本文、全文 snapshot を追加していない。
* Phase、review、reference docs からの relative links が解決する。

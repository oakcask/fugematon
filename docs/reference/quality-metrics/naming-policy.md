# Metric Naming Policy

Current な metric、gate、review surface は、導入された Phase ではなく音楽的な意味で命名します。Phase 名は履歴、計画、完了記録に残し、現在の採否判断や diagnostics contract を読む入口には使わない方針です。

## Rules

* Current な diagnostics、review bundle、quality evidence の field 名は、何を観察するかを表す。
* `Gate` は pass/fail policy を返すものだけに使う。CI blocker ではない review surface には `Review`、`Evidence`、`Trace`、`Acceptance` などを使う。
* Phase 文書、古い review 文書、履歴用テスト名は Phase 名を保持してよい。
* 公開 JSON や exported TypeScript 型の rename は、schema version と compatibility alias を伴って段階的に行う。
* Docs の current reference では新名を主に書き、必要な場合だけ「formerly `phase...`」として旧名を併記する。
* New tests, helpers, fixtures, and file names use the musical surface name unless the test exists only to protect a historical compatibility alias.

## Rename Audit Policy

Every Phase-name removal uses the symbol rename audit workflow before it is reported complete.

| Surface | Compatibility policy | Residual Phase-name policy |
| --- | --- | --- |
| Current implementation identifiers | Rename to the current musical name. Keep temporary exported aliases only when downstream packages still import the old name. | `removed` after the compatibility PR removes aliases. |
| Public review JSON and CLI output | Bump the schema when an emitted field is removed or renamed. Prefer current names only in new output. | `compatibility-alias` only during a schema transition; then `removed`. |
| CLI input values | Accept legacy values only when explicitly listed in this file. Emit and document current values. | `compatibility-alias` until the input alias removal PR. |
| Tests and helper files | Rename current behavior tests to musical names. Keep Phase names only for tests that assert legacy compatibility. | `test-assertion` for compatibility tests; otherwise `removed`. |
| Current reference docs | Lead with the current name. Move migration history into this document or historical phase/review docs. | `historical-doc` only when the text is about past migration history. |
| Phase and review history docs | Preserve Phase-era identifiers when they describe what happened at that time. | `historical-doc`. |

## Staged Refactor Order

1. Add the current core API names and make implementation code call them first. Keep old exported names as simple aliases while package consumers and tests migrate.
2. Bump review bundle schemas and remove emitted Phase-name compatibility fields from new CLI output.
3. Rename current test helpers and test files to the musical surfaces they protect.
4. Remove compatibility aliases from public exports and input parsers once current-name tests prove the replacement path.
5. Run residual searches for `phase[0-9]`, `Phase[0-9]`, `PHASE_[0-9]`, and quoted JSON keys. Classify every remaining hit as `historical-doc`, `test-assertion`, or `follow-up-required`.

## Selection Model Values

Selection model values use current names in CLI help, generated diagnostics, review bundles, and new tests. Historical input aliases are outside the compatibility window and should be rejected by current code.

| Current value | Meaning |
| --- | --- |
| `baseline` | Baseline selection behavior. |
| `candidate-oracle-selection` | Selection-model risk adjustment over the existing candidate pool. |
| `section-local-planner` | Adopted section-local planner with section grammar and phrase-family candidates. |

## Compatibility

Current code should read and emit the current names. Compatibility aliases should not introduce separate computation paths, and once a schema transition removes an alias, tests should assert that the historical key is absent from current output.

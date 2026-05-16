# Phase 6 音楽美レビュー

Phase 6 の diagnostics gate 実装後に、固定 review seed、rotation seed、adversarial seed をまとめて生成し、音楽的美しさ、対位法、フーガ技法、和声安定度の観点で再レビューした。

Phase 6 gate は全 22 seed で pass した。ただし、gate pass は「観察対象が自動化された」ことを示すに留まり、音楽的な説得力が十分になったことは示さない。複数 metric が閾値近くに張り付いており、操作機能へ進む前に Phase 7 の前半を実質的な音楽改善へ再編する。

## 実行内容

```sh
pnpm build
mkdir -p .tmp/phase6-musical-review
pnpm fugematon review --out .tmp/phase6-musical-review --ticks 129600
```

生成 bundle は一時成果物であり、コミット対象にしない。

## 主な発見

* entry 支持和声はまだ濁る。severe entry interval は合計 1946、未解決 1321。`modal-cadence`、`lyrical-line`、`fugue-smoke`、`tight-stretto` が目立つ。
* 旋律線はまだ歌える線になりきっていない。leap recovery miss は合計 415。`modal-answer`、`bright-answer`、`contrary-motion`、`modal-dorian` が境界 seed になる。
* 対位法的独立が弱い。`restless-line`、`modal-answer`、`bright-answer` は rhythmic independence が下限付近にあり、shared rhythm overlap も上限付近に張り付く。
* exact same-pitch unison は合計 293。`contrary-motion`、`fugue-smoke`、`lyrical-line`、`minor-entry` が目立ち、声部独立を損なう。
* modal seed では counter-subject identity が薄い。`modal-cadence` と `dense-modal` が 0.573、`angular-answer` が 0.591、`modal-answer` が 0.608 だった。
* solo texture は Phase 6 gate 内だが説得力は弱い。unsupported solo run と abrupt texture drop はどちらも合計 321 あり、`long-arc`、`dense-modal`、`contrary-answer`、`modal-cadence` が目立つ。
* 形式は seed 間で固定的である。全 seed で exposition duration は 7680、first continuation start は 9120 だった。codetta、追唱、提示部後の呼吸はまだ seed variation になっていない。
* manual listening gate は代表 seed が `not-reviewed` のままで blocker を持つ。自動 gate pass だけで操作機能へ進まない。

## 計画再編

Phase 7 の前半は、評価説明力の前に実質的な音楽改善を扱う。

1. entry 支持和声を改善する。entry ごとの structural note、root/third/fifth、avoid note role、解決先を候補選択へ入れる。境界 seed は `modal-cadence`、`lyrical-line`、`fugue-smoke`、`tight-stretto` とする。
2. 旋律 contour を改善する。大跳躍後の反行・順次回収、局所 climax、声部別の歌いやすさを scoring に入れ、alto 偏重を優先して潰す。
3. exact same-pitch unison と rhythmic lockstep を強い回避対象にする。voice-pair と register placement を先に整理し、`contrary-motion`、`minor-entry`、`restless-line` を回帰 seed にする。
4. episode と continuation planner を再編する。固定的な提示部後遷移をやめ、codetta、追唱、段階的 thinning、応答的な受け渡しを section plan の責務にする。
5. その後で Phase 7 本来の評価説明力へ進む。dimension breakdown は、seed、section、voice、entry/cadence 単位で「なぜ音楽的に妥当か」を説明できるまで gate の中心に置かない。

Phase 8 の操作機能は、代表 seed と境界 seed の manual listening judgement が pass になるまで保留する。

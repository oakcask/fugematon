# Phase 3 実装メモ

Phase 3 では、固定長 exposition の後に episode、subject return、stretto-like section へ進む継続生成を追加した。

Phase 3 は、フーガ的な状態遷移と長尺 diagnostics を成立させるための構造 MVP である。音楽的に美しいフーガ、厳格な species counterpoint、調性に沿った応答、歌う counter-subject は Phase 4 以降の対象とする。

## 実装範囲

* `exposition`、`episode`、`subject-return`、`stretto-like` の状態遷移を `state-change` メタイベントと diagnostics に記録する。
* episode では主題断片、subject return では主題、stretto-like section では近接した主題と応答を生成する。
* 各継続 section では複数候補を作り、声域違反、声部交差、並達完全音程疑いを使った diagnostics cost が最も低い候補を選ぶ。
* 代表 seed の Phase 3 profile を core に置き、長尺生成で以下を CI 検証する。
  * 声域違反: 0
  * 声部交差: 0
  * subject return の主題 entry が最低回数以上あること
  * stretto-like entry が最低回数以上あること
  * 並達完全音程疑いが生成長に対する上限内であること
  * 生成所要時間が先読み用途の上限内であること
* Web UI は Phase 3 の長尺 score を生成し、主題、応答、主題断片の entry をピアノロール上で強調表示する。

## 完了判定

Phase 3 の完了条件は、構造 MVP としては満たしている。

* exposition 後に episode、subject return、stretto-like section へ進む状態機械を持つ。
* 主題や主題断片が状態ごとに再出現し、diagnostics で entry の状態、声部、開始 tick、form を追跡できる。
* 応答 entry は5度関係の pitch class offset を維持する。
* 代表 seed の長尺生成では、声域違反と声部交差を 0 に保つ。
* 生成候補の評価回数と所要時間を CI で確認し、ブラウザ再生用の先読み長を生成できる。
* Web UI で数分程度の Phase 3 score を再生しながら、Canvas 2D のピアノロールで主題 entry を確認できる。

## 既知の音楽的制約

現行 Phase 3 の生成器は、MIDI pitch と声部ごとの基準 octave を早い段階で混ぜている。このため、key metadata と実際の subject entry の調性機能がずれる場合がある。

代表的な問題は以下である。

* 同じ subject entry でも、voice base octave と range fitting の影響で、開始音や調性上の意味が声部ごとに変わる。
* `pitchClassOffset` は5度関係の近似として記録されるが、scale-degree mapping として検証されていない。
* counterpoint は主に2拍の保持音であり、独立した counter-subject や自由対位としては弱い。
* episode は主題断片の再提示を持つが、順次進行、転調準備、cadence target を十分に持たない。
* diagnostics は声域違反、声部交差、並達完全音程の検出に寄っており、主題同一性、応答計画、和声的到達をまだ評価していない。

この制約により、Phase 3 の score は「フーガ的な構造を持つ生成デモ」として扱う。音楽作品としての美しさやフーガ技法の説得力は、Phase 4 と Phase 5 の完了条件へ移す。

## 既知の UI 制約

Phase 3 UI follow-up 前の Web UI は、生成済み score の全 duration を canvas 横幅に正規化していた。Phase 3 の default seed は約 166 秒の長尺 score になるため、`fugue-smoke` の初期表示では作品全体が1画面に圧縮され、ノート形状と主題 entry の視認性が落ちていた。

この問題は音楽生成の意味論とは独立した表示設計の不足である。Phase 4 の音楽モデル修正に入る前の UI follow-up として、以下を修正した。

* ピアノロールの主表示は、作品全体ではなく固定秒数の viewport を描画する。
* 初期表示は冒頭 section を見せ、再生中は playhead 周辺へ追従する。
* viewport 外のノートは描画対象から外し、主題、応答、主題断片の stroke が潰れない密度を保つ。
* total duration は metric として残し、全体俯瞰は必要になった時点で overview として主表示から分離する。
* `fugue-smoke` の default score で、初期表示と再生中表示のどちらもノート幅が視認できることを layout test と UI inspection の確認対象にする。

## Phase 3 UI follow-up 完了記録

Phase 3 UI follow-up では、長尺 score の表示範囲を修正した。

* `computePianoRollLayout` に表示窓の start/end second を渡せる。
* `drawPianoRoll` は停止中に冒頭 viewport、再生中に playhead 追従 viewport を使う。
* beat grid、playhead、現在秒表示は viewport 座標で描画する。
* layout test では、長尺 score 全体ではなく viewport 内の note だけが canvas bounds に入ることを検証する。

Phase 4 では、履歴や操作 UI より先に、主題同一性と調性モデルを修正する。

* 主題を scale degree、accidental、rhythm、role を持つ抽象表現として保持する。
* entry plan に global key、local key、form、voice、register を持たせる。
* true answer と tonal answer を区別し、半音数の単純移高を応答設計の正にしない。
* subject、answer、subject-fragment の actual pitch class sequence が、期待される scale-degree pattern と一致することを diagnostics で検証する。

Phase 5 では、counter-subject、自由対位、episode sequence、cadence plan を追加する。

* 持続音中心の counterpoint を、主題に対する旋律的な counter-subject へ置き換える。
* 強拍の協和、弱拍の経過音、不協和の準備と解決をスコアリングする。
* episode に順次進行、反行、転回、ゼクエンツ、近親調への推移を持たせる。
* subject return の前後で cadence target を使い、緊張と解決を作る。

履歴、巻き戻し、操作パラメータは Phase 6 へ、Worker 化と生成期限は Phase 7 へ後ろ倒しする。音楽コアの意味論が安定する前に操作面を増やすと、後で保存データや UI パラメータの互換性を壊しやすいためである。

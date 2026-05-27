# Hello World — RefPlayer プラグインサンプル

このフォルダは RefPlayer のユーザープラグインの最小サンプルです。サイドバーのパネルと動画上のオーバーレイを追加します。

## インストール

1. RefPlayer を起動し、設定画面（`Ctrl+,`）を開く
2. 「プラグインフォルダを開く」ボタンを押す
3. 開いたフォルダ（`%APPDATA%\RefPlayer\plugins\`）に **このフォルダごと** コピーする
   - 結果: `%APPDATA%\RefPlayer\plugins\hello-world\manifest.json` のようになる
4. RefPlayer を再起動する
5. サイドバーに「Hello World」パネルが現れる

## フォルダ構成

```
hello-world/
├── manifest.json   ← プラグインのメタ情報
└── index.js        ← エントリスクリプト（manifest.entry で指定）
```

## manifest.json

```json
{
  "id": "hello-world",
  "name": "Hello World",
  "version": "1.0.0",
  "entry": "index.js"
}
```

- `id` — 他プラグインと衝突しない一意な kebab-case 名。設定の保存キーにも使われる
- `entry` — manifest と同じフォルダからの相対パスで JS ファイルを指定

## エントリスクリプト

CommonJS スタイルで `module.exports` に register 関数を代入します。register 関数は PluginAPI を受け取ります。

```js
module.exports = function register(api) {
  // パネル登録
  api.registerPanel(function (root) {
    // root は <div> 要素。DOM を自由に追加してください。
    root.innerHTML = '<button>クリック</button>';
    root.querySelector('button').onclick = function () {
      api.stepFrame(1);
    };
    return function cleanup() {
      // パネルが破棄されるときの後始末（任意）
    };
  }, { title: 'パネル名', defaultOpen: true });

  // オーバーレイ登録（動画の上に Canvas で描画）
  api.registerOverlay(function (ctx, state) {
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 50, 50);
  });
};
```

## PluginAPI 一覧

| メソッド | 用途 |
|---|---|
| `registerPanel(mountFn, { title, defaultOpen? })` | サイドバーにパネルを追加。mountFn は DOM root を受け取り cleanup を返す |
| `registerOverlay(renderFn)` | 動画プレビュー上に描画。renderFn は `(ctx, { currentFrame, displayFps, sourceFps })` を受ける |
| `subscribeFrame(handler)` | currentFrame の変化を購読。`(frame, displayFps) => void`。戻り値は unsubscribe |
| `getPlayerState()` | 現在のプレイヤー状態スナップショットを取得 |
| `setFrame(frame)` | 表示ドメインの絶対フレームへシーク |
| `stepFrame(delta)` | フレームを delta だけ進める／戻す |
| `getSetting(key, default)` | プラグインスコープの設定を読み出す（永続化される） |
| `setSetting(key, value)` | プラグインスコープの設定を保存する |
| `requestRedraw()` | オーバーレイの再描画を要求（通常 subscribeFrame 経由で自動だが、設定変更後に明示的に呼ぶと即時反映される） |

## デバッグ

`Ctrl+Shift+I` で開発者ツールを開けば、`console.log` の出力が見えます。プラグイン読み込みに失敗した場合は `[plugin: <id>] load failed` というエラーがコンソールに出ます。

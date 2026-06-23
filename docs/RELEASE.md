# リリース手順

RefPlayer の新バージョン配布版を作成する手順です。

## 必要環境

- Windows 10 / 11
- [Node.js](https://nodejs.org/) v18 以上
- Windows の **開発者モード**を有効化（`設定 → システム → 開発者向け → 開発者モード：ON`）
  - electron-builder が `winCodeSign` バイナリ展開時にシンボリックリンクを作成するため必須

## 手順

### 1. バージョンを上げる

セマンティックバージョニング（major.minor.patch）に従う：

| 変更内容 | バンプ位置 |
|---|---|
| 互換性を壊す変更 | major |
| 機能追加 | minor |
| バグ修正・小改善 | patch |

更新箇所：
- [`package.json`](../package.json) の `"version"` フィールド
- [`README.md`](../README.md) 内に書かれたバージョン文字列（インストーラー名の例など）

### 2. 型チェック・動作確認

```bash
npm run typecheck
npm run dev
```

主要機能を一通り確認：
- 動画読み込み・再生・フレームステップ
- IN/OUT 設定・解除・切り抜き
- MP4 書き出し（切り抜き状態でも正しい範囲が出ること）
- ビルトインプラグイン（オニオンスキン / ドローイングタイマー）
- ユーザープラグイン（`examples/plugins/hello-world/` を `%APPDATA%\RefPlayer\plugins\` にコピーして確認）
- ショートカット（音量・ミュート含む）

### 3. ビルド

```bash
npm run package
```

`dist/` に以下が生成される：
- `RefPlayer Setup <version>.exe` — NSIS インストーラー
- `RefPlayer <version>.exe` — ポータブル版
- `RefPlayer Setup <version>.exe.blockmap`

初回ビルド時は electron / winCodeSign / NSIS バイナリのダウンロードが入るため数分かかります（2回目以降はキャッシュされて短縮）。

### 4. 配布版の動作確認

別マシン、もしくは仮想環境で：
1. `RefPlayer Setup <version>.exe` を実行 → インストール
2. 動画ファイルを右クリック → 「プログラムから開く」→ RefPlayer が表示されること（ファイル関連付け）
3. ダブルクリックでも開けること
4. 旧バージョンがインストール済みの場合、上書きアップグレードされること（設定・プラグインが保持される）

### 5. Git タグ付け

```bash
git add package.json README.md
git commit -m "Bump version to <version>"
git tag v<version>
git push origin main --tags
```

### 6. GitHub Release を作成

1. GitHub の `Releases` → `Draft a new release`
2. タグ: `v<version>`
3. リリース名: `RefPlayer <version>`
4. 本文: 主な変更点（CHANGELOG 風に）
5. アセットとして `RefPlayer Setup <version>.exe` と `RefPlayer <version>.exe` をアップロード
6. `Publish release`

## トラブルシューティング

### `winCodeSign-*.7z` の展開エラー

```
ERROR: Cannot create symbolic link : クライアントは要求された特権を保有していません
```

Windows 開発者モードが OFF になっています。`設定 → システム → 開発者向け → 開発者モード` をオンにしてから再実行してください。

### Electron バイナリのダウンロード失敗

ネットワーク状況により `electron-v*-win32-x64.zip` のダウンロードがタイムアウトすることがあります。`npm run package` を再実行すれば再度ダウンロードを試みます。

### 配布版で「Windows によって PC が保護されました」と出る

コードサインしていないため SmartScreen の警告が出ます。「詳細情報」→「実行」で進められます。商用配布する場合は Code Signing 証明書の取得を検討してください。

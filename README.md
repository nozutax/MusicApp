# Score Shelf

画譜 PDF の閲覧と手書きメモ。PWA 対応で、一度開いたあとはオフラインでも利用できます（Service Worker がアプリ本体をキャッシュします）。

## 開発

```bash
npm ci
npm run dev
```

## GitHub に載せて、他の PC からインストール（オフライン利用）

1. **リポジトリを GitHub に push**（このフォルダをリポジトリのルートにする想定です）。
2. **GitHub の設定**  
   **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選ぶ。
3. **`main`（または `master`）に push** すると `.github/workflows/deploy-github-pages.yml` が走り、`https://<ユーザー名>.github.io/<リポジトリ名>/` に公開されます。
4. **他の PC のブラウザ**でその URL を開き、メニューから **「アプリをインストール」**（または「ホーム画面に追加」）を選ぶと、スタンドアロンで起動できます。
5. **オフライン**では、**一度オンラインで開いてキャッシュが入ったあと**、同じインストール済みアプリから起動すれば利用できます。初回だけネット接続が必要です。

**注意:** 楽譜データはブラウザの IndexedDB に保存されるため、**端末ごと**です。別 PC ではその PC で PDF を取り込み直す必要があります。

### ローカルで GitHub Pages と同じパスを試す

リポジトリ名が `my-app` のとき:

```bash
# Windows PowerShell（リポジトリ名が my-app の例）
$env:BASE_PATH="/my-app/"
npm run build
npm run preview
```

ターミナルに出る URL（通常は `http://localhost:4173/my-app/`）を開いて動作確認できます。プレビューでも同じ `BASE_PATH` を付けてください。

### ユーザーサイト（`username.github.io` リポジトリでルート公開）の場合

サイトが `https://username.github.io/` のルートになる場合は、`BASE_PATH` は **`/` のまま**ビルドしてください。ワークフローの `BASE_PATH` 行を削除するか、`env` を上書きする必要があります。

## テスト

```bash
npm run test
```

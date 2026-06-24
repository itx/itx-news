# itx-news

Cloudflare Workers 上で動作する、RSS ベースのニュース取得・要約 Web アプリです。

## 方向性
- 直接 HTML をスクレイピングするのではなく、RSS からニュースを取得します。
- 基本 RSS は `https://lifehacker.com/rss` を想定しています。
- 取得した記事から本文を要約し、興味のない記事を次回以降は除外します。

## できること
- RSS フィードから最新記事を取得
- 記事本文を要約して表示
- 「興味あり/興味なし」のフィードバックで次回以降の取得内容を調整

## セットアップ
1. `npm install`
2. Cloudflare アカウントを用意する
3. KV ネームスペースを作成:
   - `wrangler kv:namespace create SITES`
   - `wrangler kv:namespace create IGNORED`
4. `wrangler.toml` の `PUT_ACCOUNT_ID_HERE`、`PUT_SITES_NAMESPACE_ID_HERE`、`PUT_IGNORED_NAMESPACE_ID_HERE` を実際の ID に置き換え

## GitHub Actions での自動デプロイ
- リポジトリの Secrets に次を追加します:
  - `CF_API_TOKEN` — Cloudflare Workers デプロイ用 API トークン
  - `CF_ACCOUNT_ID` — Cloudflare アカウント ID
- `main` ブランチへの push または `workflow_dispatch` で自動デプロイされます。

## ローカル実行
- `npm run dev`

## 公開
- `npm run publish`

## 使い方
1. RSS フィード URL を登録（初期値として `https://lifehacker.com/rss` を利用）
2. `最新ニュースを取得` を押して RSS を読み込む
3. 表示された要約を確認する
4. `興味なし` を選ぶと、次回以降は似た記事を減らします

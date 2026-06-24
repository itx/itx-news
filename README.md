# itx-news

Cloudflare Workers で公開するニュース取得・要約 Web アプリです。

## 特徴
- ユーザー登録サイトからニュース本文を取得
- テキストを抽出して要約
- 「興味ある/ない」をフィードバックし、次回以降は興味のない内容をフィルタ

## セットアップ
1. `npm install`
2. Cloudflare アカウントにログインして `wrangler` をセットアップ
3. KV ネームスペースを作成:
   - `wrangler kv:namespace create SITES`
   - `wrangler kv:namespace create IGNORED`
4. `wrangler.toml` の `PUT_ACCOUNT_ID_HERE`、`PUT_SITES_NAMESPACE_ID_HERE`、`PUT_IGNORED_NAMESPACE_ID_HERE` を実際の ID に置き換え

## GitHub Actions での自動デプロイ
- リポジトリの Secrets に次を追加します:
  - `CF_API_TOKEN` (Cloudflare Workers をデプロイできる API トークン)
  - `CF_ACCOUNT_ID` (Cloudflare アカウント ID)
- `main` ブランチへの push または `workflow_dispatch` で自動デプロイされます。

## ローカル実行
- `npm run dev`

## 公開
- `npm run publish`

## 使い方
- サイト URL を登録
- 最新ニュースを取得
- 「興味ある」「興味ない」を回答して、興味のないニュースは次回以降取得しないようにする

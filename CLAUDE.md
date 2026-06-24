# CLAUDE.md

このファイルは、Claude Code がこのリポジトリで作業する際のガイドです。

## 言語

ユーザーへの回答・説明は必ず**日本語**で行ってください。

## コマンド

```bash
npm run dev       # ローカルで wrangler dev を実行
npm run publish   # Cloudflare Workers に公開
```

## プロジェクト概要

- `src/index.js` で Cloudflare Worker を実装しています。
- フロントエンドと API はこの Worker で一体的に提供されます。
- 取得元は基本的に RSS フィードです。
- `https://lifehacker.com/rss` を中心に動作を想定します。

## KV ネームスペース

以下の KV バインディングを利用します:

| Binding | Key | 内容 |
|---------|-----|------|
| `SITES` | `sites` | 登録済み RSS フィード URL の配列 |
| `IGNORED` | `patterns` | 興味なし判断で蓄積された抑止パターンの配列 |

`wrangler.toml` のプレースホルダ ID はデプロイ前に実際の値に置き換えてください。

## API ルート

| Route | メソッド | 役割 |
|-------|---------|------|
| `/` | GET | SPA の HTML を返す |
| `/api/sites` | GET, POST, DELETE | RSS フィード URL の管理 |
| `/api/fetch` | GET | RSS から記事を取得して要約する |
| `/api/feedback` | POST | 興味フィードバックを保存する |

## 仕様

- RSS から記事を取得し、本文や説明を要約します。
- フィードバックで `興味なし` を選択した項目は、次回以降の取得時に除外しやすくします。
- `lifehacker.com/rss` を優先的に利用します。

## デプロイ

- `main` ブランチへの push または `workflow_dispatch` で GitHub Actions が `wrangler publish` を実行します。
- 手動デプロイは `npm run publish` です。

### 必要な GitHub Secrets

- `CF_API_TOKEN` — Cloudflare Workers へのデプロイ権限を持つ API トークン
- `CF_ACCOUNT_ID` — Cloudflare アカウント ID

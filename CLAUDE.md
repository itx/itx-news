# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語

ユーザーへの回答・説明は必ず**日本語**で行うこと。

## Commands

```bash
npm run dev       # local dev server via wrangler dev
npm run publish   # deploy to Cloudflare Workers
```

No test runner is configured.

## Architecture

Single Cloudflare Worker (`src/index.js`) serving both a frontend and API. The entire app — HTML, client-side JS, and Worker logic — lives in this one file.

### KV Namespaces

Two KV namespaces are bound to the Worker:

| Binding | Key | Value |
|---------|-----|-------|
| `SITES` | `"sites"` | JSON array of registered site URLs |
| `IGNORED` | `"patterns"` | JSON array of keyword patterns to suppress (max 120) |

Before first deploy, replace the placeholder IDs in `wrangler.toml` (`PUT_ACCOUNT_ID_HERE`, `PUT_SITES_NAMESPACE_ID_HERE`, `PUT_IGNORED_NAMESPACE_ID_HERE`) with real Cloudflare values. Create namespaces with:
```bash
wrangler kv:namespace create SITES
wrangler kv:namespace create IGNORED
```

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/` | GET | Serves the HTML SPA |
| `/api/sites` | GET, POST, DELETE | Manage registered site URLs |
| `/api/fetch` | GET | Fetch and summarize news; optional `?url=` param to target one site |
| `/api/feedback` | POST | Record interest/disinterest; disinterest extracts keyword patterns into IGNORED |

### Summarization (`summarizeText`)

Uses a simple TF-IDF-like frequency scoring: builds a word frequency map from the full text (excluding stop words in `STOP_WORDS`), scores each sentence by the summed frequency of its constituent words (≥3 chars), selects the top-N by score, then re-orders them by original position. Falls back to the first N sentences if scoring yields nothing.

### Filtering

When a user marks a news item "not interested", `extractIgnorePatterns` pulls keywords from the title, summary, and URL and appends them to the IGNORED KV store. On subsequent `/api/fetch` calls, any item whose combined `title + text + summary` contains any pattern in IGNORED is silently dropped.

### HTML extraction (`extractItemsFromHtml`)

Prefers `<article>` elements. Within each article, extracts heading text and `<p>`/`<li>` text separately. Falls back to the page's `<p>`/`<li>` tags if no `<article>` tags are found.

## Deployment

`main` ブランチへの push（PR マージ含む）または `workflow_dispatch` で、GitHub Actions (`.github/workflows/deploy.yml`) が自動的に `wrangler publish` を実行し Cloudflare Workers へデプロイされる。手動デプロイは `npm run publish`。

リポジトリ Secrets に以下を設定する必要がある:
- `CF_API_TOKEN` — Cloudflare API token with Workers deploy permission
- `CF_ACCOUNT_ID` — Cloudflare account ID

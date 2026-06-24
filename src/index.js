const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>itx-news</title>
  <style>
    body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: #f3f4f6; color: #111827; }
    .page { max-width: 1080px; margin: 0 auto; padding: 24px; }
    .panel { background: white; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 10px 24px rgba(15,23,42,.08); padding: 24px; margin-bottom: 20px; }
    h1 { margin: 0 0 12px; font-size: 1.75rem; }
    h2 { margin: 0 0 10px; font-size: 1.2rem; }
    .text-muted { color: #6b7280; }
    .form-row { display: grid; gap: 12px; grid-template-columns: minmax(0, 1fr) auto; align-items: end; }
    input, button, textarea { font: inherit; }
    input { width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 12px; background: #f9fafb; }
    button { border: none; border-radius: 12px; padding: 12px 18px; cursor: pointer; background: #2563eb; color: white; transition: transform .15s ease, background .15s ease; }
    button:hover { transform: translateY(-1px); background: #1d4ed8; }
    .small-btn { padding: 8px 12px; font-size: 0.9rem; }
    .site-item, .news-item { border: 1px solid #e5e7eb; border-radius: 14px; background: #fff; padding: 18px; margin-bottom: 12px; }
    .site-item .meta, .news-item .meta { color: #6b7280; font-size: 0.9rem; margin-top: 4px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .actions button { background: #f3f4f6; color: #111827; }
    .actions button:hover { background: #e5e7eb; }
    .danger { background: #fee2e2; color: #991b1b; }
    .summary { white-space: pre-wrap; line-height: 1.75; margin: 12px 0 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .notice { color: #4b5563; font-size: 0.95rem; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="panel">
      <h1>itx-news</h1>
      <p class="text-muted">RSS フィードから記事を取得して要約する Cloudflare Workers アプリです。基本は <a href="https://lifehacker.com/rss" target="_blank" rel="noopener">Lifehacker RSS</a> を想定しています。</p>
    </div>

    <div class="panel">
      <h2>RSS フィード登録</h2>
      <div class="form-row">
        <input id="site-url" type="url" placeholder="https://lifehacker.com/rss" />
        <button id="add-site">登録</button>
      </div>
      <div id="site-list" style="margin-top:18px;"></div>
      <p class="notice">フィード URL を追加しておくと、ボタンクリックでまとめて取得できます。</p>
    </div>

    <div class="panel">
      <h2>最新ニュース取得</h2>
      <button id="fetch-news" class="small-btn">最新記事を取得</button>
      <p class="notice">登録フィードがない場合は <code>https://lifehacker.com/rss</code> を使います。</p>
    </div>

    <div id="news-list"></div>
  </div>

  <script>
    const siteUrlInput = document.getElementById('site-url');
    const siteList = document.getElementById('site-list');
    const newsList = document.getElementById('news-list');

    document.getElementById('add-site').addEventListener('click', async () => {
      const url = siteUrlInput.value.trim();
      if (!url) return alert('RSS フィード URL を入力してください');
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) return alert('追加に失敗しました');
      siteUrlInput.value = '';
      await loadSites();
    });

    document.getElementById('fetch-news').addEventListener('click', async () => {
      newsList.innerHTML = '<p class="text-muted">取得中...</p>';
      const response = await fetch('/api/fetch');
      if (!response.ok) {
        newsList.innerHTML = '<p class="text-muted">取得に失敗しました。</p>';
        return;
      }
      renderNews(await response.json());
    });

    async function loadSites() {
      const response = await fetch('/api/sites');
      if (!response.ok) return;
      const data = await response.json();
      siteList.innerHTML = '';
      if (!data.sites.length) {
        siteList.innerHTML = '<p class="text-muted">まだフィードが登録されていません。</p>';
        return;
      }
      data.sites.forEach(site => {
        const el = document.createElement('div');
        el.className = 'site-item';
        el.innerHTML = '
          <div><strong>' + escapeHtml(site.name || site.url) + '</strong></div>' +
          '<div class="meta">' + escapeHtml(site.url) + '</div>' +
          '<div class="actions"><button class="danger">削除</button></div>';
        el.querySelector('button').addEventListener('click', async () => {
          await fetch('/api/sites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site.url }) });
          await loadSites();
        });
        siteList.appendChild(el);
      });
    }

    function renderNews(items) {
      newsList.innerHTML = '';
      if (!items.length) {
        newsList.innerHTML = '<div class="panel"><p class="text-muted">該当するニュースがありません。フィード登録やフィードバックを確認してください。</p></div>';
        return;
      }
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'news-item';
        el.innerHTML = '
          <h3><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + escapeHtml(item.title) + '</a></h3>' +
          '<div class="meta">' + escapeHtml(new Date(item.pubDate || item.date || Date.now()).toLocaleString()) + '</div>' +
          '<div class="summary">' + escapeHtml(item.summary) + '</div>' +
          '<div class="actions">' +
          '<button class="small-btn">興味あり</button>' +
          '<button class="small-btn danger">興味なし</button>' +
          '</div>';
        el.querySelector('.small-btn').addEventListener('click', () => sendFeedback(item, true));
        el.querySelector('.small-btn.danger').addEventListener('click', () => sendFeedback(item, false));
        newsList.appendChild(el);
      });
    }

    async function sendFeedback(item, interest) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, title: item.title, summary: item.summary, interest })
      });
      alert(interest ? '興味ありを保存しました' : '次回以降、類似ニュースは省かれます');
    }

    function escapeHtml(value) {
      return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    loadSites();
  </script>
</body>
</html>`;

const DEFAULT_FEED = 'https://lifehacker.com/rss';
const KV_SITES_KEY = 'sites';
const KV_IGNORED_KEY = 'patterns';
const MAX_SUMMARY_SENTENCES = 3;
const MAX_TEXT_LENGTH = 14000;
const STOP_WORDS = new Set(['the','and','for','with','that','this','from','have','will','your','about','news','article','site','page','their','which','release','press','report','were','been','they','them']);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/') return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      if (url.pathname === '/api/sites') return this.handleSites(request, env);
      if (url.pathname === '/api/fetch') return this.handleFetch(request, env);
      if (url.pathname === '/api/feedback') return this.handleFeedback(request, env);
      return new Response('Not found', { status: 404 });
    } catch (error) {
      return json({ error: error.message || 'Internal error' }, 500);
    }
  },

  async handleSites(request, env) {
    if (request.method === 'GET') {
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      return json({ sites });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const url = normalizeUrl(body.url);
      if (!url) return json({ error: '無効な URL です' }, 400);
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      if (!sites.some(site => site.url === url)) {
        sites.push({ url, name: body.name?.trim() || new URL(url).hostname });
        await env.SITES.put(KV_SITES_KEY, JSON.stringify(sites));
      }
      return json({ sites });
    }
    if (request.method === 'DELETE') {
      const body = await request.json();
      const url = normalizeUrl(body.url);
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      const updated = sites.filter(site => site.url !== url);
      await env.SITES.put(KV_SITES_KEY, JSON.stringify(updated));
      return json({ sites: updated });
    }
    return new Response(null, { status: 405 });
  },

  async handleFetch(request, env) {
    const sites = await readJson(env.SITES, KV_SITES_KEY, []);
    const feedUrls = sites.length ? sites.map(site => site.url).filter(Boolean) : [DEFAULT_FEED];
    const ignored = await readJson(env.IGNORED, KV_IGNORED_KEY, []);
    const items = [];

    await Promise.all(feedUrls.map(async feedUrl => {
      try {
        const res = await fetch(feedUrl, { cf: { cacheTtl: 120 } });
        if (!res.ok) return;
        const xml = await res.text();
        const feedItems = parseFeedXml(xml, feedUrl);
        feedItems.forEach(item => {
          if (!item.title && !item.text) return;
          item.summary = summarizeText(item.text || item.title, MAX_SUMMARY_SENTENCES);
          const lower = (item.title + '\n' + item.text + '\n' + item.summary).toLowerCase();
          const skip = ignored.some(pattern => pattern && lower.includes(pattern.toLowerCase()));
          if (!skip) items.push(item);
        });
      } catch (error) {
        // ignore individual feed failures
      }
    }));

    items.sort((a, b) => (b.pubDate || 0) - (a.pubDate || 0));
    return json(items.slice(0, 20));
  },

  async handleFeedback(request, env) {
    if (request.method !== 'POST') return new Response(null, { status: 405 });
    const body = await request.json();
    if (!body || typeof body.interest !== 'boolean') return json({ error: '不正なリクエストです' }, 400);
    if (body.interest) return json({ ok: true });
    const patterns = await readJson(env.IGNORED, KV_IGNORED_KEY, []);
    const newPatterns = extractIgnorePatterns(body.title || '', body.summary || '', body.url || '');
    const merged = Array.from(new Set([...patterns, ...newPatterns])).slice(0, 120);
    await env.IGNORED.put(KV_IGNORED_KEY, JSON.stringify(merged));
    return json({ ok: true, patterns: merged });
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

function normalizeUrl(value) {
  try {
    const url = new URL(value.toString().trim());
    return url.href.replace(/#.*$/, '');
  } catch (error) {
    return null;
  }
}

async function readJson(kv, key, fallback) {
  const stored = await kv.get(key);
  if (!stored) return fallback;
  try { return JSON.parse(stored); } catch (error) { return fallback; }
}

function parseFeedXml(xml, baseUrl) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (!doc || doc.querySelector('parsererror')) return [];

  const nodes = Array.from(doc.querySelectorAll('item, entry'));
  return nodes.map(node => {
    const title = textContent(node, ['title']) || '';
    const link = extractLink(node, baseUrl);
    const description = textContent(node, ['description', 'summary', 'content', 'content\:encoded']) || '';
    const text = stripHtml(description || textContent(node, ['title', 'description', 'summary']) || '');
    const pubDate = parseDate(textContent(node, ['pubDate', 'published', 'updated']));
    return { title: title.trim(), url: link, text: text.slice(0, MAX_TEXT_LENGTH), pubDate };
  });
}

function textContent(node, selectors) {
  for (const selector of selectors) {
    const el = node.querySelector(selector);
    if (el && el.textContent) return el.textContent.trim();
  }
  return '';
}

function extractLink(node, baseUrl) {
  const linkEl = node.querySelector('link');
  if (linkEl) {
    const href = linkEl.getAttribute('href') || linkEl.textContent;
    const normalized = href ? normalizeUrl(href) : null;
    if (normalized) return normalized;
  }
  const guid = node.querySelector('guid');
  if (guid && guid.textContent) {
    const normalized = normalizeUrl(guid.textContent.trim());
    if (normalized) return normalized;
  }
  return baseUrl;
}

function stripHtml(html) {
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDate(value) {
  if (!value) return 0;
  const parsed = Date.parse(value.trim());
  return Number.isNaN(parsed) ? 0 : parsed;
}

function summarizeText(text, maxSentences) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。.!?！？])\s*/)
    .map(s => s.trim())
    .filter(Boolean);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  const frequencies = buildFrequencies(text);
  const scored = sentences.map(sentence => ({
    sentence,
    score: sentence.toLowerCase().match(/\p{L}{3,}/gu)?.reduce((sum, word) => sum + (frequencies[word] || 0), 0) || 0
  }));
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxSentences).sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
  return selected.map(item => item.sentence).join(' ') || sentences.slice(0, maxSentences).join(' ');
}

function buildFrequencies(text) {
  return (text.toLowerCase().match(/\p{L}{3,}/gu) || []).reduce((map, word) => {
    if (STOP_WORDS.has(word)) return map;
    map[word] = (map[word] || 0) + 1;
    return map;
  }, {});
}

function extractIgnorePatterns(title, summary, url) {
  const text = `${title}\n${summary}`.toLowerCase();
  const words = Array.from(new Set((text.match(/\p{L}{4,}/gu) || []).slice(0, 30)));
  const titleWords = Array.from(new Set((title.toLowerCase().match(/\p{L}{4,}/gu) || []).slice(0, 10)));
  const urlParts = (url || '').toLowerCase().match(/[a-z0-9\-]{3,}/g) || [];
  return [title.trim(), ...titleWords, ...words, ...urlParts].filter(Boolean).slice(0, 30);
}

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>itx-news</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; line-height: 1.6; color: #111; background: #f8fafc; }
    h1, h2, h3 { color: #1f2937; }
    input, button, textarea { font: inherit; }
    .panel { background: white; border: 1px solid #d1d5db; border-radius: 12px; padding: 18px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(15,23,42,.08); }
    .site-item, .news-item { margin-bottom: 14px; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
    button { border: none; border-radius: 10px; padding: 10px 16px; cursor: pointer; background: #2563eb; color: white; transition: background .2s ease; }
    button.secondary { background: #4b5563; }
    button.danger { background: #dc2626; }
    button:hover { filter: brightness(1.05); }
    .notice { margin-top: 10px; color: #374151; }
    textarea { width: 100%; min-height: 140px; margin-top: 10px; border: 1px solid #d1d5db; border-radius: 10px; padding: 10px; resize: vertical; }
    .news-summary { white-space: pre-wrap; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="panel">
    <h1>itx-news</h1>
    <p>登録したサイトからテキストベースのニュースを取りに行き、要約します。興味のないニュースを選択すると、次回以降は似た内容を省きます。</p>
  </div>

  <div class="panel">
    <h2>サイト登録</h2>
    <p>ニュース取得元の URL を追加してください。</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
      <input id="site-url" type="url" placeholder="https://example.com/news" style="flex:1; min-width:220px; padding:10px; border:1px solid #d1d5db; border-radius:10px;" />
      <button id="add-site">登録</button>
    </div>
    <div id="site-list" style="margin-top:18px;"></div>
  </div>

  <div class="panel">
    <h2>ニュース取得</h2>
    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
      <input id="fetch-url" type="url" placeholder="任意のニュースサイト URL を指定（未入力なら登録サイト全体）" style="flex:1; min-width:220px; padding:10px; border:1px solid #d1d5db; border-radius:10px;" />
      <button id="fetch-news">最新ニュースを取得</button>
    </div>
    <p class="notice">指定した URL がある場合はそのサイトのみを取得します。空欄なら登録サイト全体から取得します。</p>
  </div>

  <div id="news-list"></div>

  <script>
    const siteUrlInput = document.getElementById('site-url');
    const fetchUrlInput = document.getElementById('fetch-url');
    const siteList = document.getElementById('site-list');
    const newsList = document.getElementById('news-list');
    const addSiteButton = document.getElementById('add-site');
    const fetchNewsButton = document.getElementById('fetch-news');

    addSiteButton.addEventListener('click', async () => {
      const url = siteUrlInput.value.trim();
      if (!url) return alert('URL を入力してください');
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!response.ok) return alert('追加に失敗しました');
      siteUrlInput.value = '';
      await loadSites();
    });

    fetchNewsButton.addEventListener('click', async () => {
      newsList.innerHTML = '<p>取得中...</p>';
      const fetchUrl = fetchUrlInput.value.trim();
      const query = fetchUrl ? `?url=${encodeURIComponent(fetchUrl)}` : '';
      const response = await fetch(`/api/fetch${query}`);
      if (!response.ok) {
        newsList.innerHTML = '<p>ニュース取得に失敗しました。</p>';
        return;
      }
      const items = await response.json();
      renderNews(items);
    });

    async function loadSites() {
      const response = await fetch('/api/sites');
      if (!response.ok) return;
      const data = await response.json();
      siteList.innerHTML = '';
      if (!data.sites.length) {
        siteList.innerHTML = '<p>まだサイトが登録されていません。</p>';
        return;
      }
      data.sites.forEach(site => {
        const el = document.createElement('div');
        el.className = 'site-item';
        el.innerHTML = `
          <div><strong>${site}</strong></div>
          <div class="actions"><button class="secondary">削除</button></div>
        `;
        el.querySelector('button').addEventListener('click', async () => {
          await fetch('/api/sites', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: site }) });
          await loadSites();
        });
        siteList.appendChild(el);
      });
    }

    function renderNews(items) {
      newsList.innerHTML = '';
      if (!items.length) {
        newsList.innerHTML = '<div class="panel"><p>該当するニュースがありません。サイト登録やフィードバックを確認してください。</p></div>';
        return;
      }
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'news-item';
        el.innerHTML = `
          <h3>${escapeHtml(item.title)}</h3>
          <p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">元記事を開く</a></p>
          <div class="news-summary"><strong>要約：</strong>\n${escapeHtml(item.summary)}</div>
          <div class="actions">
            <button class="secondary">興味あり</button>
            <button class="danger">興味なし</button>
          </div>
        `;
        el.querySelector('.secondary').addEventListener('click', () => sendFeedback(item, true));
        el.querySelector('.danger').addEventListener('click', () => sendFeedback(item, false));
        newsList.appendChild(el);
      });
    }

    async function sendFeedback(item, interest) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, title: item.title, summary: item.summary, interest })
      });
      alert(interest ? '興味ありを保存しました' : '興味なしを保存しました。次回以降、類似ニュースは省かれます');
    }

    function escapeHtml(value) {
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    loadSites();
  </script>
</body>
</html>
`;

const STOP_WORDS = new Set(["the","and","for","with","that","this","from","have","will","your","about","news","article","site","page","their","which","release","press","report","were","been","they","them"]);
const KV_SITES_KEY = 'sites';
const KV_IGNORED_KEY = 'patterns';
const MAX_SUMMARY_SENTENCES = 3;
const MAX_TEXT_LENGTH = 14000;

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
      return new Response(JSON.stringify({ error: error.message || 'Internal error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
      if (!sites.includes(url)) {
        sites.push(url);
        await env.SITES.put(KV_SITES_KEY, JSON.stringify(sites));
      }
      return json({ sites });
    }
    if (request.method === 'DELETE') {
      const body = await request.json();
      const url = normalizeUrl(body.url);
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      const updated = sites.filter(item => item !== url);
      await env.SITES.put(KV_SITES_KEY, JSON.stringify(updated));
      return json({ sites: updated });
    }
    return new Response(null, { status: 405 });
  },

  async handleFetch(request, env) {
    const sites = await readJson(env.SITES, KV_SITES_KEY, []);
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const sources = targetUrl ? [targetUrl] : sites;
    if (!sources.length) return json([]);
    const ignored = await readJson(env.IGNORED, KV_IGNORED_KEY, []);
    const items = [];
    const fetches = sources.map(async site => {
      try {
        const page = await fetch(site, { cf: { cacheTtl: 60 } });
        if (!page.ok) return;
        const html = await page.text();
        const siteItems = await extractItemsFromHtml(html, site);
        siteItems.forEach(item => {
          if (!item.text.trim()) return;
          item.summary = summarizeText(item.text, MAX_SUMMARY_SENTENCES);
          const lower = (item.title + '\n' + item.text + '\n' + item.summary).toLowerCase();
          const skip = ignored.some(pattern => pattern && lower.includes(pattern.toLowerCase()));
          if (!skip) items.push(item);
        });
      } catch (error) {
        // ignore fetch failures on individual sites
      }
    });
    await Promise.all(fetches);
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
  } catch (e) {
    return null;
  }
}

async function readJson(kv, key, fallback) {
  const stored = await kv.get(key);
  if (!stored) return fallback;
  try { return JSON.parse(stored); } catch (e) { return fallback; }
}

async function extractItemsFromHtml(html, url) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items = [];
  const articles = Array.from(doc.querySelectorAll('article'));
  if (articles.length) {
    for (const article of articles) {
      const title = extractElementText(article, ['h1','h2','h3','h4']) || doc.title || url;
      const text = extractElementText(article, ['p','li']) || article.textContent || '';
      items.push({ title: title.trim(), text: text.trim().slice(0, MAX_TEXT_LENGTH), url });
    }
    return items.length ? items : [createFallbackItem(doc, url)];
  }
  return [createFallbackItem(doc, url)];
}

function createFallbackItem(doc, url) {
  const title = doc.querySelector('title')?.textContent?.trim() || url;
  const snippet = Array.from(doc.querySelectorAll('p,li')).map(el => el.textContent.trim()).filter(Boolean).slice(0, 8).join('\n\n');
  const text = snippet || doc.body?.textContent?.trim() || '';
  return { title, text: text.slice(0, MAX_TEXT_LENGTH), url };
}

function extractElementText(root, selectors) {
  const nodes = selectors.flatMap(selector => Array.from(root.querySelectorAll(selector)));
  return nodes.map(node => node.textContent.trim()).filter(Boolean).join('\n\n');
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
    score: sentence
      .toLowerCase()
      .match(/\p{L}{3,}/gu)?.reduce((sum, word) => sum + (frequencies[word] || 0), 0) || 0
  }));
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, maxSentences).sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));
  const summary = selected.map(item => item.sentence).join(' ');
  return summary || sentences.slice(0, maxSentences).join(' ');
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
  const titlePhrases = Array.from(new Set((title.toLowerCase().match(/\p{L}{4,}/gu) || []).slice(0, 10)));
  const urlParts = url.toLowerCase().match(/[a-z0-9\-]{3,}/g) || [];
  const patterns = [title.trim(), ...titlePhrases, ...words, ...urlParts].filter(Boolean);
  return patterns.slice(0, 30);
}

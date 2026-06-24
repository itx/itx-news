const HTML = `<!DOCTYPE html>
<html lang="ja" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>itx-news</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css" />
  <style>
    :root { --pico-font-size: 15px; }
    body { max-width: 860px; padding: 1rem 1.5rem; }
    h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1rem; margin-bottom: 0.75rem; }
    h3 { font-size: 0.95rem; margin-bottom: 0.2rem; }
    .site-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; border-bottom: 1px solid var(--pico-muted-border-color); font-size: 0.875rem; }
    .site-row:last-child { border-bottom: none; }
    .site-row span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .site-row button { margin: 0; padding: 0.15rem 0.5rem; font-size: 0.72rem; }
    .news-summary { white-space: pre-wrap; font-size: 0.875rem; margin: 0.25rem 0 0.5rem; color: var(--pico-muted-color); }
    .news-actions { display: flex; gap: 0.5rem; }
    .news-actions button { padding: 0.3rem 0.75rem; font-size: 0.8rem; margin: 0; }
    article p { margin-bottom: 0.2rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <h1>itx-news</h1>
    <p>登録サイトからニュースを取得・要約します。</p>
  </header>

  <main>
    <article>
      <h2>サイト登録</h2>
      <div style="display:flex; gap:0.5rem;">
        <input id="site-url" type="url" placeholder="https://example.com/news" style="flex:1; margin:0;" />
        <button id="add-site" style="white-space:nowrap; margin:0;">登録</button>
      </div>
      <div id="site-list" style="margin-top:0.75rem;"></div>
    </article>

    <article style="display:flex; align-items:center; justify-content:space-between; padding: 0.75rem 1rem;">
      <strong style="font-size:0.95rem;">ニュース取得</strong>
      <button id="fetch-news" style="margin:0;">最新ニュースを取得</button>
    </article>

    <div id="news-list"></div>
  </main>

  <script>
    const siteUrlInput = document.getElementById('site-url');
    const siteList = document.getElementById('site-list');
    const newsList = document.getElementById('news-list');

    document.getElementById('add-site').addEventListener('click', async () => {
      const url = siteUrlInput.value.trim();
      if (!url) return alert('URL を入力してください');
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) return alert('追加に失敗しました');
      siteUrlInput.value = '';
      await loadSites();
    });

    document.getElementById('fetch-news').addEventListener('click', async () => {
      newsList.innerHTML = '<p>取得中...</p>';
      const res = await fetch('/api/fetch');
      if (!res.ok) { newsList.innerHTML = '<p>ニュース取得に失敗しました。</p>'; return; }
      renderNews(await res.json());
    });

    async function loadSites() {
      const res = await fetch('/api/sites');
      if (!res.ok) return;
      const { sites } = await res.json();
      siteList.innerHTML = '';
      if (!sites.length) {
        siteList.innerHTML = '<p style="font-size:0.85rem; color:var(--pico-muted-color); margin:0;">まだサイトが登録されていません。</p>';
        return;
      }
      sites.forEach(site => {
        const el = document.createElement('div');
        el.className = 'site-row';
        el.innerHTML = \`<span title="\${site}">\${site}</span><button class="secondary outline">×</button>\`;
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
        newsList.innerHTML = '<article><p>該当するニュースがありません。</p></article>';
        return;
      }
      items.forEach(item => {
        const el = document.createElement('article');
        el.innerHTML = \`
          <h3><a href="\${e(item.url)}" target="_blank" rel="noopener">\${e(item.title)}</a></h3>
          <div class="news-summary">\${e(item.summary)}</div>
          <div class="news-actions">
            <button class="secondary outline">興味あり</button>
            <button class="contrast outline">興味なし</button>
          </div>
        \`;
        el.querySelector('.secondary').addEventListener('click', () => feedback(item, true));
        el.querySelector('.contrast').addEventListener('click', () => feedback(item, false));
        newsList.appendChild(el);
      });
    }

    async function feedback(item, interest) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, title: item.title, summary: item.summary, interest })
      });
      alert(interest ? '興味ありを保存しました' : '次回以降、類似ニュースは省かれます');
    }

    function e(v) {
      return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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

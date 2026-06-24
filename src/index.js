const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>itx-news</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 text-slate-900">
  <div class="flex flex-col min-h-screen">

    <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
      <h1 class="text-sm font-bold tracking-tight">itx-news</h1>
      <span class="text-xs text-slate-400">登録サイトのニュースを取得・要約</span>
    </header>

    <div class="flex flex-1 min-h-0">

      <aside class="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div class="p-4 flex-1 overflow-y-auto">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">サイト登録</p>
          <div class="space-y-2">
            <input id="site-name" type="text" placeholder="サイト名（省略可）"
              class="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <input id="site-url" type="url" placeholder="https://..."
              class="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            <button id="add-site"
              class="w-full py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">登録</button>
          </div>
          <div id="site-list" class="mt-4 divide-y divide-slate-100"></div>
        </div>
      </aside>

      <main class="flex-1 min-w-0 p-6 overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">ニュース</p>
          <button id="fetch-news"
            class="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">最新ニュースを取得</button>
        </div>
        <div id="news-list" class="grid gap-3 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3"></div>
      </main>

    </div>
  </div>

  <script>
    const siteUrlInput = document.getElementById('site-url');
    const siteNameInput = document.getElementById('site-name');
    const siteList = document.getElementById('site-list');
    const newsList = document.getElementById('news-list');

    document.getElementById('add-site').addEventListener('click', async () => {
      const url = siteUrlInput.value.trim();
      if (!url) return alert('URL を入力してください');
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: siteNameInput.value.trim() })
      });
      if (!res.ok) return alert('追加に失敗しました');
      siteUrlInput.value = '';
      siteNameInput.value = '';
      await loadSites();
    });

    document.getElementById('fetch-news').addEventListener('click', async () => {
      newsList.innerHTML = '<p class="text-sm text-slate-400">取得中...</p>';
      const res = await fetch('/api/fetch');
      if (!res.ok) { newsList.innerHTML = '<p class="text-sm text-red-400">取得に失敗しました。</p>'; return; }
      renderNews(await res.json());
    });

    async function loadSites() {
      const res = await fetch('/api/sites');
      if (!res.ok) return;
      const { sites } = await res.json();
      siteList.innerHTML = '';
      if (!sites.length) {
        siteList.innerHTML = '<p class="text-xs text-slate-300 mt-2 text-center">まだ登録されていません</p>';
        return;
      }
      sites.forEach(site => {
        const el = document.createElement('div');
        el.className = 'flex items-center gap-2 py-2';
        el.innerHTML = \`
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate">\${e(site.name)}</div>
            <div class="text-xs text-slate-400 truncate">\${e(site.url)}</div>
          </div>
          <button class="text-slate-300 hover:text-red-400 text-base px-1 shrink-0 transition-colors leading-none">×</button>
        \`;
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
        newsList.innerHTML = '<div class="col-span-full bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-400">該当するニュースがありません。</div>';
        return;
      }
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col';
        el.innerHTML = \`
          <h3 class="font-semibold text-sm mb-1">
            <a href="\${e(item.url)}" target="_blank" rel="noopener" class="hover:text-blue-600 transition-colors">\${e(item.title)}</a>
          </h3>
          <p class="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap mb-3">\${e(item.summary)}</p>
          <div class="flex gap-2">
            <button class="btn-yes px-3 py-1 text-xs rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-500 transition-colors">興味あり</button>
            <button class="btn-no px-3 py-1 text-xs rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 transition-colors">興味なし</button>
          </div>
        \`;
        el.querySelector('.btn-yes').addEventListener('click', () => feedback(item, true));
        el.querySelector('.btn-no').addEventListener('click', () => feedback(item, false));
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
      const name = (body.name || '').trim() || new URL(url).hostname;
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      if (!sites.some(s => (s.url || s) === url)) {
        sites.push({ name, url });
        await env.SITES.put(KV_SITES_KEY, JSON.stringify(sites));
      }
      return json({ sites });
    }
    if (request.method === 'DELETE') {
      const body = await request.json();
      const url = normalizeUrl(body.url);
      const sites = await readJson(env.SITES, KV_SITES_KEY, []);
      const updated = sites.filter(s => (s.url || s) !== url);
      await env.SITES.put(KV_SITES_KEY, JSON.stringify(updated));
      return json({ sites: updated });
    }
    return new Response(null, { status: 405 });
  },

  async handleFetch(request, env) {
    const sites = await readJson(env.SITES, KV_SITES_KEY, []);
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    const sources = targetUrl ? [targetUrl] : sites.map(s => s.url || s);
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

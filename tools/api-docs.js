// tools/api-docs.js — 接口文档生成器：从捕获请求反向生成 Markdown / OpenAPI（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'api-docs',
    name: '接口文档生成',
    desc: '从捕获请求反向生成 Markdown / OpenAPI 3.0 文档',
    iconUrl: 'icons/api-docs.png',
    category: 'network',
    categoryName: '网络工具'
  };

  const STORAGE_KEY = 'tool:api-docs';

  let captured = [];        // [{method, url, status, reqHeaders, resHeaders, query, body, time}]
  let selected = new Set(); // 选中的索引
  let unsubs = [];
  let containerRef = null;
  let previewOn = false;    // 结果区预览模式（仅 Markdown）

  function render(container) {
    containerRef = container;
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <div class="te-tip">侧边栏打开期间捕获的接口请求会实时出现在下方，勾选后生成文档。可在目标页面操作触发请求。</div>

      <div class="ap-toolbar">
        <button class="btn" id="apSelectAll">全选</button>
        <button class="btn" id="apClear">清空列表</button>
        <span class="ap-count" id="apCount">已捕获 0 个</span>
      </div>

      <div id="apList" class="ap-list"></div>

      <div class="ap-actions">
        <button class="btn" id="apMdBtn">📝 生成 Markdown</button>
        <button class="btn" id="apOasBtn">🔧 生成 OpenAPI</button>
      </div>

      <div class="sn-result" id="apResult" style="display:none;">
        <div class="sn-result-head">
          <span id="apResultTitle">结果</span>
          <div>
            <button class="ck-del" id="apPreviewBtn" title="预览 / 源码">👁</button>
            <button class="ck-del" id="apCopy" title="复制">📋</button>
            <button class="ck-del" id="apDownload" title="下载">💾</button>
          </div>
        </div>
        <pre class="sn-result-body" id="apResultBody"></pre>
        <div class="ap-preview" id="apPreview" style="display:none;"></div>
      </div>
    `;

    container.querySelector('#apSelectAll').addEventListener('click', () => {
      selected = new Set(captured.map((_, i) => i));
      renderList();
    });
    container.querySelector('#apClear').addEventListener('click', () => {
      captured = [];
      selected.clear();
      renderList();
    });
    container.querySelector('#apMdBtn').addEventListener('click', () => genMarkdown());
    container.querySelector('#apOasBtn').addEventListener('click', () => genOpenAPI());
    container.querySelector('#apPreviewBtn').addEventListener('click', () => {
      previewOn = !previewOn;
      applyView();
    });
    container.querySelector('#apCopy').addEventListener('click', () => {
      const text = container.querySelector('#apResultBody').textContent;
      navigator.clipboard.writeText(text).then(() => flashMessage('✓ 已复制', 1500));
    });
    container.querySelector('#apDownload').addEventListener('click', () => {
      const isOas = container.dataset.oas === '1';
      const name = isOas ? 'openapi.json' : 'api-docs.md';
      const blob = new Blob([container.querySelector('#apResultBody').textContent],
        { type: isOas ? 'application/json' : 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    });

    // 恢复已捕获列表（同一次会话内切工具不丢）
    chrome.storage.session?.get?.([STORAGE_KEY], (r) => {
      if (r && Array.isArray(r[STORAGE_KEY])) {
        captured = r[STORAGE_KEY];
        selected = new Set(captured.map((_, i) => i));
        renderList();
      }
    });
    renderList();
  }

  function mount(context) {
    unsubs = [];
    unsubs.push(context.events.on('network:request', (p) => {
      if (!p || !p.url) return;
      // 同 method+url 去重，保留最新
      const idx = captured.findIndex((c) => c.method === p.method && c.url === p.url);
      const entry = normalize(p);
      if (idx >= 0) captured[idx] = entry; else captured.unshift(entry);
      if (captured.length > 200) captured.pop();
      selected.add(captured.findIndex((c) => c === entry));
      renderList();
      persistSession();
    }));
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
    containerRef = null;
  }

  function normalize(p) {
    let query = [];
    try {
      const u = new URL(p.url);
      query = [...u.searchParams.entries()].map(([k, v]) => ({ k, v }));
    } catch {}
    let body = null;
    if (p.requestBody) {
      try { body = JSON.parse(p.requestBody); } catch { body = p.requestBody; }
    }
    return {
      method: p.method || 'GET',
      url: p.url,
      path: (() => { try { return new URL(p.url).pathname; } catch { return p.url; } })(),
      status: p.status || 0,
      reqHeaders: p.requestHeaders || {},
      resHeaders: p.responseHeaders || {},
      query,
      body,
      time: p.timestamp || Date.now()
    };
  }

  function persistSession() {
    try { chrome.storage.session?.set?.({ [STORAGE_KEY]: captured }); } catch {}
  }

  function renderList() {
    const c = containerRef;
    if (!c) return;
    c.querySelector('#apCount').textContent = `已捕获 ${captured.length} 个 · 已选 ${selected.size} 个`;
    const list = c.querySelector('#apList');
    if (!captured.length) {
      list.innerHTML = '<div class="te-empty">暂无捕获请求，打开目标页面操作后此处实时出现</div>';
      return;
    }
    list.innerHTML = captured.map((it, i) => `
      <label class="ap-item" data-i="${i}">
        <input type="checkbox" ${selected.has(i) ? 'checked' : ''}>
        <span class="ap-method ap-m-${(it.method || 'GET').toLowerCase()}">${escapeHtml(it.method)}</span>
        <span class="ap-url" title="${escapeHtml(it.url)}">${escapeHtml(it.path)}</span>
        <span class="ap-status ap-s-${Math.floor((it.status || 0) / 100)}xx">${it.status || '-'}</span>
      </label>
    `).join('');

    list.querySelectorAll('.ap-item input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const i = parseInt(cb.closest('.ap-item').dataset.i, 10);
        if (cb.checked) selected.add(i); else selected.delete(i);
        c.querySelector('#apCount').textContent = `已捕获 ${captured.length} 个 · 已选 ${selected.size} 个`;
      });
    });
  }

  function pickedItems() {
    return captured.filter((_, i) => selected.has(i));
  }

  // ===== Markdown =====
  function genMarkdown() {
    const items = pickedItems();
    if (!items.length) { flashMessage('请先勾选要导出的接口', 1500); return; }
    let md = `# API 文档\n\n> 由 MynaTest 接口文档生成器导出 · ${new Date().toLocaleString()}\n\n`;
    items.forEach((it) => {
      md += `## ${it.method} ${it.path}\n\n`;
      md += `- **完整 URL**：${it.url}\n`;
      md += `- **最近状态码**：${it.status || '-'}\n\n`;
      if (it.query.length) {
        md += `### Query 参数\n\n| 参数 | 示例值 |\n|---|---|\n`;
        it.query.forEach((q) => { md += `| ${q.k} | ${q.v} |\n`; });
        md += '\n';
      }
      const reqH = Object.entries(it.reqHeaders || {});
      if (reqH.length) {
        md += `### 请求头\n\n| 头 | 值 |\n|---|---|\n`;
        reqH.forEach(([k, v]) => { md += `| ${k} | ${String(v).slice(0, 120)} |\n`; });
        md += '\n';
      }
      if (it.body !== null && it.body !== undefined && it.body !== '') {
        md += '### 请求体示例\n\n```json\n' + (typeof it.body === 'string' ? it.body : JSON.stringify(it.body, null, 2)) + '\n```\n\n';
      }
      const resH = Object.entries(it.resHeaders || {});
      if (resH.length) {
        md += `### 响应头\n\n| 头 | 值 |\n|---|---|\n`;
        resH.forEach(([k, v]) => { md += `| ${k} | ${String(v).slice(0, 120)} |\n`; });
        md += '\n';
      }
      md += '---\n\n';
    });
    showResult('📝 API 文档（Markdown）', md, false);
  }

  // ===== OpenAPI 3.0 =====
  function genOpenAPI() {
    const items = pickedItems();
    if (!items.length) { flashMessage('请先勾选要导出的接口', 1500); return; }
    const paths = {};
    items.forEach((it) => {
      const p = it.path || '/';
      paths[p] = paths[p] || {};
      const method = (it.method || 'get').toLowerCase();
      const op = {
        summary: `${it.method} ${p}`,
        tags: ['captured'],
        parameters: [],
        responses: {}
      };
      it.query.forEach((q) => {
        op.parameters.push({
          name: q.k, in: 'query', required: false,
          schema: { type: guessType(q.v), example: q.v }
        });
      });
      const headerKeys = ['content-type', 'authorization', 'accept'];
      headerKeys.forEach((hk) => {
        const v = it.reqHeaders?.[hk] || it.reqHeaders?.[hk.toUpperCase()]
          || Object.entries(it.reqHeaders || {}).find(([k]) => k.toLowerCase() === hk)?.[1];
        if (v) op.parameters.push({ name: hk, in: 'header', schema: { type: 'string', example: String(v).slice(0, 100) } });
      });
      if (it.body !== null && it.body !== undefined && it.body !== '') {
        const isObj = typeof it.body === 'object';
        op.requestBody = {
          content: {
            'application/json': {
              schema: isObj ? schemaOf(it.body) : { type: 'string' },
              example: it.body
            }
          }
        };
      }
      op.responses[String(it.status || 200)] = { description: `响应 ${it.status || 200}` };
      paths[p][method] = op;
    });

    const oas = {
      openapi: '3.0.3',
      info: { title: 'Captured API', version: '1.0.0', description: `由 MynaTest 导出 · ${new Date().toLocaleString()}` },
      servers: serversFrom(items),
      paths
    };
    showResult('🔧 OpenAPI 3.0（可直接导入 Swagger/Apifox）', JSON.stringify(oas, null, 2), true);
  }

  function serversFrom(items) {
    const origins = [...new Set(items.map((it) => { try { return new URL(it.url).origin; } catch { return ''; } }).filter(Boolean))];
    return origins.slice(0, 3).map((u) => ({ url: u }));
  }

  function guessType(v) {
    if (v === 'true' || v === 'false') return 'boolean';
    if (!isNaN(Number(v)) && v !== '') return 'number';
    return 'string';
  }

  function schemaOf(v) {
    if (Array.isArray(v)) return { type: 'array', items: v.length ? schemaOf(v[0]) : {} };
    if (v && typeof v === 'object') {
      const props = {};
      Object.entries(v).forEach(([k, val]) => { props[k] = schemaOf(val); });
      return { type: 'object', properties: props };
    }
    return { type: typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string' };
  }

  function showResult(title, text, isOas) {
    const c = containerRef;
    c.dataset.oas = isOas ? '1' : '0';
    if (isOas) previewOn = false; // OpenAPI 为 JSON，不支持渲染预览
    c.querySelector('#apResult').style.display = '';
    c.querySelector('#apResultTitle').textContent = title;
    c.querySelector('#apResultBody').textContent = text;
    const pbtn = c.querySelector('#apPreviewBtn');
    pbtn.style.display = isOas ? 'none' : '';
    pbtn.textContent = previewOn ? '📄' : '👁';
    const pv = c.querySelector('#apPreview');
    if (!isOas && previewOn) pv.innerHTML = mdToHtml(text);
    pv.style.display = (!isOas && previewOn) ? '' : 'none';
    c.querySelector('#apResultBody').style.display = (!isOas && previewOn) ? 'none' : '';
  }

  function applyView() {
    const c = containerRef;
    const isOas = c.dataset.oas === '1';
    if (isOas) { previewOn = false; return; }
    const pv = c.querySelector('#apPreview');
    if (previewOn) pv.innerHTML = mdToHtml(c.querySelector('#apResultBody').textContent);
    pv.style.display = previewOn ? '' : 'none';
    c.querySelector('#apResultBody').style.display = previewOn ? 'none' : '';
    c.querySelector('#apPreviewBtn').textContent = previewOn ? '📄' : '👁';
  }

  // ===== 轻量 Markdown 渲染（标题/表格/代码块/列表/引用/加粗/行内代码） =====
  function mdToHtml(md) {
    const inline = (s) => escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

    const lines = md.split('\n');
    let html = '';
    let code = null, codeBuf = [], table = [], list = [];

    const flushTable = () => {
      if (!table.length) return;
      const rows = table.map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      let out = '<table><thead><tr>' + rows[0].map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>';
      for (let i = 2; i < rows.length; i++) {
        out += '<tr>' + rows[i].map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
      }
      html += out + '</tbody></table>';
      table = [];
    };
    const flushList = () => {
      if (!list.length) return;
      html += '<ul>' + list.map((li) => `<li>${inline(li)}</li>`).join('') + '</ul>';
      list = [];
    };

    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        flushTable(); flushList();
        if (code) {
          html += `<pre class="ap-code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`;
          code = null; codeBuf = [];
        } else {
          code = true;
        }
        continue;
      }
      if (code) { codeBuf.push(line); continue; }

      if (/^\s*\|.*\|\s*$/.test(line)) { flushList(); table.push(line.trim()); continue; }
      flushTable();

      if (/^\s*-\s+/.test(line)) { list.push(line.replace(/^\s*-\s+/, '')); continue; }
      flushList();

      const h = line.match(/^(#{1,6})\s+(.*)/);
      if (h) { const n = h[1].length; html += `<h${n}>${inline(h[2])}</h${n}>`; continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { html += '<hr>'; continue; }
      if (/^>\s?/.test(line)) { html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`; continue; }
      if (line.trim()) html += `<p>${inline(line)}</p>`;
    }
    flushTable(); flushList();
    if (code) html += `<pre class="ap-code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`;
    return html;
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

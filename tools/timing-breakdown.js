// tools/timing-breakdown.js — TTFB / DNS / TCP / TLS 请求阶段耗时分解（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'timing-breakdown',
    name: '请求耗时分解',
    desc: '每个请求的 DNS / TCP / TLS / TTFB / 下载各阶段耗时明细与慢请求 TOP',
    iconUrl: 'icons/timing-breakdown.png',
    category: 'network',
    categoryName: '网络工具'
  };

  let rows = [];           // 解析后的资源时序
  let sortKey = 'total';
  let sortDir = -1;
  let containerRef = null;

  function render(container) {
    containerRef = container;
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <div class="te-tip">基于 Performance API 读取每个请求的各阶段耗时（需页面已产生资源加载）。「导航」行是页面文档本身。</div>

      <div class="tb-toolbar">
        <button class="btn sc-btn-primary" id="tbCollectBtn">⚡ 采集当前页面时序</button>
        <label class="tb-check"><input type="checkbox" id="tbNavChk" checked> 含文档导航</label>
        <span class="tb-count" id="tbCount"></span>
      </div>

      <div id="tbSummary" class="kb-summary" style="display:none;"></div>
      <div id="tbTable" class="kb-list"></div>
    `;

    container.querySelector('#tbCollectBtn').addEventListener('click', collect);
    container.querySelector('#tbNavChk').addEventListener('change', collect);
  }

  function cleanup() { containerRef = null; }

  function mount() {}

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
  }

  async function collect() {
    const tab = await activeTab();
    const url = tab?.url || '';
    if (!tab?.id || /^(chrome|edge|about|chrome-extension|devtools):\/\//i.test(url)) {
      flashMessage('请切换到普通网页后采集', 2000);
      return;
    }
    const btn = containerRef.querySelector('#tbCollectBtn');
    btn.disabled = true;
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'ISOLATED',
        func: (withNav) => {
          const round = (v) => (v == null || isNaN(v)) ? 0 : Math.round(v);
          const parse = (e) => {
            const dns = round(e.domainLookupEnd - e.domainLookupStart);
            const tcp = round(e.connectEnd - e.connectStart);
            const tls = (e.secureConnectionStart > 0) ? round(e.connectEnd - e.secureConnectionStart) : 0;
            const ttfb = round(e.responseStart - e.requestStart);
            const download = round(e.responseEnd - e.responseStart);
            const total = round(e.responseEnd - e.startTime);
            const wait = round(e.requestStart - e.connectEnd);
            return {
              name: e.name,
              type: e.initiatorType || 'other',
              size: e.transferSize || 0,
              dns: Math.max(0, dns - (tls > 0 ? 0 : 0)), // DNS 段
              tcp: Math.max(0, tcp - tls),
              tls, ttfb, wait, download, total
            };
          };
          const out = [];
          if (withNav) {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav) {
              const p = parse(nav);
              p.type = 'document';
              out.push(p);
            }
          }
          performance.getEntriesByType('resource').forEach((e) => out.push(parse(e)));
          return out;
        },
        args: [containerRef.querySelector('#tbNavChk').checked]
      });
      rows = (res?.result || []).map((r) => ({ ...r, short: shorten(r.name) }));
      renderTable();
      if (!rows.length) flashMessage('未采集到资源时序，请确认页面已加载完成', 2000);
    } catch (e) {
      flashMessage('采集失败：' + String(e?.message || e), 2500);
    } finally {
      btn.disabled = false;
    }
  }

  function shorten(u) {
    try {
      const url = new URL(u);
      return url.pathname === '/' ? url.origin : (url.pathname.split('/').pop() || url.pathname).slice(0, 60) + (url.search || '');
    } catch { return String(u).slice(0, 60); }
  }

  function fmtMs(v) { return v >= 1000 ? (v / 1000).toFixed(2) + 's' : v + 'ms'; }

  function renderTable() {
    const c = containerRef;
    c.querySelector('#tbCount').textContent = rows.length ? `共 ${rows.length} 条` : '';
    const table = c.querySelector('#tbTable');
    if (!rows.length) { table.innerHTML = '<div class="te-empty">暂无数据，点击「采集」开始</div>'; return; }

    const sorted = [...rows].sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir);
    const max = Math.max(...rows.map((r) => r.total), 1);
    const avg = Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length);
    const slowest = sorted[0];
    const top3Share = Math.round(sorted.slice(0, 3).reduce((s, r) => s + r.total, 0) / sorted.reduce((s, r) => s + r.total, 0) * 100);

    c.querySelector('#tbSummary').style.display = '';
    c.querySelector('#tbSummary').innerHTML = `
      <span class="kb-chip">平均 <b>${fmtMs(avg)}</b></span>
      <span class="kb-chip kb-chip-warn">最慢 <b>${escapeHtml(slowest.short)}</b> ${fmtMs(slowest.total)}</span>
      <span class="kb-chip">TOP3 占比 <b>${top3Share}%</b></span>
    `;

    const cols = [['name', '资源'], ['dns', 'DNS'], ['tcp', 'TCP'], ['tls', 'TLS'], ['ttfb', 'TTFB'], ['download', '下载'], ['total', '总耗时']];
    table.innerHTML = `
      <div class="kb-row kb-row-head">${cols.map(([k, label]) =>
        `<span class="${k === 'name' ? 'tb-col-name' : ''} kb-sort" data-k="${k}">${label}${sortKey === k ? (sortDir < 0 ? ' ↓' : ' ↑') : ''}</span>`).join('')}</div>
      ${sorted.slice(0, 100).map((r) => {
        const pct = (r.total / max * 100).toFixed(1);
        const seg = [
          { v: r.dns, c: '#F59E0B' }, { v: r.tcp, c: '#3B82F6' }, { v: r.tls, c: '#8B5CF6' },
          { v: r.ttfb, c: '#EF4444' }, { v: r.download, c: '#10B981' }
        ];
        const sum = seg.reduce((s, x) => s + x.v, 0) || 1;
        return `
        <div class="tb-row">
          <div class="tb-name" title="${escapeHtml(r.name)}">${escapeHtml(r.short)} <span class="tb-type">${escapeHtml(r.type)}</span></div>
          <div class="tb-bar" style="width:${pct}%"></div>
          <div class="tb-segs">${seg.map((x) => `<i style="flex:${x.v};background:${x.c}" title="${fmtMs(x.v)}"></i>`).join('')}</div>
          <div class="tb-nums">
            <span class="${r.dns ? '' : 'tb-dim'}">DNS ${fmtMs(r.dns)}</span>
            <span class="${r.tcp ? '' : 'tb-dim'}">TCP ${fmtMs(r.tcp)}</span>
            ${r.tls ? `<span>TLS ${fmtMs(r.tls)}</span>` : ''}
            <span>TTFB ${fmtMs(r.ttfb)}</span>
            <span class="${r.download ? '' : 'tb-dim'}">↓ ${fmtMs(r.download)}</span>
            <b>${fmtMs(r.total)}</b>
          </div>
        </div>`;
      }).join('')}
    `;

    table.querySelectorAll('.kb-sort').forEach((el) => {
      el.addEventListener('click', () => {
        const k = el.dataset.k;
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        renderTable();
      });
    });
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

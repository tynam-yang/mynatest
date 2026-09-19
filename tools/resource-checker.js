// tools/resource-checker.js — 资源加载失败检查（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'resource-checker',
    name: '资源检查',
    desc: '检查图片/JS/CSS/字体加载失败（404 等）',
    iconUrl: 'icons/resource-checker.png',
    category: 'test',
    categoryName: '测试工具'
  };

  let currentResult = null;
  let unsubs = [];
  // 过滤状态
  let filterShow = 'all'; // all | ok | error
  let filterType = 'all'; // all | image | js | css | font
  let filterKeyword = '';

  const TYPE_INFO = {
    image: { label: '图片', color: '#dc2626', bg: '#fee2e2' },
    js:    { label: 'JS',   color: '#ea580c', bg: '#ffedd5' },
    css:   { label: 'CSS',  color: '#2563eb', bg: '#dbeafe' },
    font:  { label: '字体', color: '#9333ea', bg: '#f3e8ff' }
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="rc-toolbar">
        <button class="btn" id="rcScanBtn">🔍 扫描页面资源</button>
        <span class="rc-tip" id="rcTip">点击扫描，显示页面所有资源及其加载状态</span>
      </div>

      <div id="rcSummary" class="rc-summary" style="display:none;"></div>

      <div id="rcFilters" class="rc-filters" style="display:none;">
        <div class="rc-filter-row">
          <span class="rc-filter-label">状态：</span>
          <button class="rc-chip" data-filter="show" data-value="all">全部</button>
          <button class="rc-chip" data-filter="show" data-value="error">❌ 错误</button>
          <button class="rc-chip" data-filter="show" data-value="ok">✅ 正常</button>
        </div>
        <div class="rc-filter-row">
          <span class="rc-filter-label">类型：</span>
          <button class="rc-chip" data-filter="type" data-value="all">全部</button>
          <button class="rc-chip" data-filter="type" data-value="image">图片</button>
          <button class="rc-chip" data-filter="type" data-value="js">JS</button>
          <button class="rc-chip" data-filter="type" data-value="css">CSS</button>
          <button class="rc-chip" data-filter="type" data-value="font">字体</button>
        </div>
        <div class="rc-filter-row">
          <input type="text" class="rc-search" id="rcSearch" placeholder="🔎 搜索资源 URL…">
        </div>
      </div>

      <div id="rcList" class="rc-list" style="display:none;"></div>

      <div id="rcEmpty" class="rc-empty">
        尚未扫描<br>
        <small>页面浏览过程中已自动捕获资源错误，点击扫描汇总结果</small>
      </div>
    `;

    container.querySelector('#rcScanBtn').addEventListener('click', () => {
      const btn = container.querySelector('#rcScanBtn');
      const tip = container.querySelector('#rcTip');
      btn.disabled = true;
      btn.textContent = '扫描中…';
      tip.textContent = '正在从页面采集资源状态…';

      chrome.runtime.sendMessage({ type: 'resource-check:collect' }, (res) => {
        void chrome.runtime?.lastError;
        if (chrome.runtime.lastError) {
          flashMessage('扫描失败：' + chrome.runtime.lastError.message);
          btn.disabled = false;
          btn.textContent = '🔍 扫描页面资源';
          tip.textContent = '点击扫描，显示页面所有资源及其加载状态';
        } else if (res?.ok === false) {
          flashMessage('扫描失败：' + (res.error || '请先刷新页面'));
          btn.disabled = false;
          btn.textContent = '🔍 扫描页面资源';
          tip.textContent = res.error || '请先刷新页面';
        } else {
          tip.textContent = '等待页面返回结果…';
        }
      });
    });

    // 过滤器事件
    container.querySelectorAll('[data-filter="show"]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterShow = btn.dataset.value;
        updateChips(container);
        applyFilters(container);
      });
    });
    container.querySelectorAll('[data-filter="type"]').forEach(btn => {
      btn.addEventListener('click', () => {
        filterType = btn.dataset.value;
        updateChips(container);
        applyFilters(container);
      });
    });
    const search = container.querySelector('#rcSearch');
    if (search) {
      search.addEventListener('input', (e) => {
        filterKeyword = e.target.value.trim().toLowerCase();
        applyFilters(container);
      });
    }
  }

  function updateChips(container) {
    container.querySelectorAll('[data-filter="show"]').forEach(btn => {
      btn.classList.toggle('rc-chip-active', btn.dataset.value === filterShow);
    });
    container.querySelectorAll('[data-filter="type"]').forEach(btn => {
      btn.classList.toggle('rc-chip-active', btn.dataset.value === filterType);
    });
  }

  function mount(context) {
    const { container, events } = context;
    unsubs = [];
    if (events && typeof events.on === 'function') {
      unsubs.push(events.on('resource-check:result', (payload) => {
        currentResult = payload;
        renderResult(container, payload);
      }));
    }
  }

  function renderResult(container, payload) {
    const btn = container.querySelector('#rcScanBtn');
    const tip = container.querySelector('#rcTip');
    btn.disabled = false;
    btn.textContent = '🔍 扫描页面资源';

    const all = payload.all || [];
    const failedCount = payload.failedCount || 0;
    const okCount = payload.okCount || 0;

    container.querySelector('#rcEmpty').style.display = 'none';

    // Summary
    const summary = container.querySelector('#rcSummary');
    summary.style.display = '';
    summary.innerHTML = buildSummary(failedCount, okCount, all.length);

    // Filters
    container.querySelector('#rcFilters').style.display = '';
    updateChips(container);

    // 初始过滤：如果有错误，默认只显示错误
    if (failedCount > 0 && filterShow === 'all') {
      // 不改 filterShow，让用户自己选
    }

    applyFilters(container);

    tip.textContent = `扫描完成 · 共 ${all.length} 个资源 · ✅ ${okCount} · ❌ ${failedCount}`;
  }

  function applyFilters(container) {
    if (!currentResult) return;
    const all = currentResult.all || [];

    let filtered = all.filter(r => {
      if (filterShow === 'ok' && !r.ok) return false;
      if (filterShow === 'error' && r.ok) return false;
      if (filterType !== 'all' && r.type !== filterType) return false;
      if (filterKeyword && !r.url.toLowerCase().includes(filterKeyword)) return false;
      return true;
    });

    const listEl = container.querySelector('#rcList');
    listEl.style.display = '';

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="rc-empty">
          没有匹配的资源<br>
          <small>调整过滤条件后重试</small>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(r => buildRow(r)).join('');

    // 绑定复制/打开
    listEl.querySelectorAll('[data-rc-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        copyText(btn.dataset.rcCopy);
        btn.textContent = '已复制';
        setTimeout(() => btn.textContent = '复制', 1200);
      });
    });
    listEl.querySelectorAll('[data-rc-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: btn.dataset.rcOpen });
      });
    });
  }

  function buildSummary(failed, ok, total) {
    if (failed === 0) {
      return `<div class="rc-summary rc-summary-ok">✅ 全部资源正常（${total} 个）</div>`;
    }
    return `
      <div class="rc-summary rc-summary-bad">
        <div class="rc-summary-main">⚠️ 共 ${total} 个资源 · ✅ ${ok} · ❌ ${failed}</div>
      </div>
    `;
  }

  function buildRow(r) {
    const info = TYPE_INFO[r.type] || { label: r.type, color: '#6b7280', bg: '#f3f4f6' };
    const statusIcon = r.ok ? '✅' : '❌';
    const statusClass = r.ok ? 'rc-row-ok' : 'rc-row-bad';
    const statusText = r.status ? `HTTP ${r.status}` : (r.ok ? 'OK' : '错误');
    const fromText = r.from === 'error-event' ? '(加载失败)' : r.from === 'performance-observer' ? '(同域检测)' : r.from === 'document.fonts' ? '(字体API)' : '';
    const bytes = r.transferSize ? formatBytes(r.transferSize) : (r.ok && r.transferSize === 0 ? '缓存' : '');
    const durText = r.duration ? r.duration + 'ms' : '';

    return `
      <div class="rc-row ${statusClass}">
        <div class="rc-row-status">${statusIcon}</div>
        <div class="rc-row-type" style="background:${info.bg};color:${info.color};">${info.label}</div>
        <div class="rc-row-body">
          <div class="rc-row-url" title="${escapeHtml(r.url)}">${escapeHtml(truncate(r.url, 90))}</div>
          <div class="rc-row-meta">
            <span class="rc-row-status-text ${r.ok ? 'rc-ok' : 'rc-bad'}">${statusText}</span>
            ${fromText ? `<span class="rc-row-from">${fromText}</span>` : ''}
            ${bytes ? `<span class="rc-row-size">${bytes}</span>` : ''}
            ${durText ? `<span class="rc-row-duration">${durText}</span>` : ''}
          </div>
        </div>
        <div class="rc-row-actions">
          <button class="btn rc-action-btn" data-rc-copy="${escapeHtml(r.url)}">复制</button>
          ${/^https?:/i.test(r.url) ? `<button class="btn rc-action-btn" data-rc-open="${escapeHtml(r.url)}">打开</button>` : ''}
        </div>
      </div>
    `;
  }

  function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }
  function escapeHtml(s) { return String(s).replace(/[&"'<>]/g, c => ({ '&': '&amp;', '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;' })[c]); }
  function formatBytes(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function copyText(text) {
    try {
      navigator.clipboard.writeText(text).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      });
    } catch (_) {}
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

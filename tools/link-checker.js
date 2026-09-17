// tools/link-checker.js — 链接可用性检查（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'link-checker',
    name: '链接检查',
    desc: '批量扫描页面 a 标签链接，校验可访问性与跳转正确性',
    iconUrl: 'icons/link-checker.png',
    icon: '🔗',
    category: 'test',
    categoryName: '测试工具'
  };

  function render(container) {
    container.innerHTML = `
      <div class="lc-wrap">
        <div class="lc-header">
          <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
        </div>

        <div class="lc-tip">扫描当前页面所有 a 标签，批量校验是否可访问、跳转地址是否正确。</div>

        <div class="lc-toolbar">
          <button id="lc-scan" class="lc-btn-primary">🔍 扫描当前页面</button>
          <div class="lc-toolbar-right">
            <label class="lc-concurrency">
              并发
              <select id="lc-concurrency">
                <option value="2">2</option>
                <option value="4" selected>4</option>
                <option value="8">8</option>
                <option value="16">16</option>
              </select>
            </label>
            <button id="lc-check" class="lc-btn-primary" disabled>开始校验</button>
          </div>
        </div>

        <div class="lc-progress" id="lc-progress" style="display:none;">
          <div class="lc-progress-bar"><div class="lc-progress-inner" id="lc-progress-inner"></div></div>
          <div class="lc-progress-text" id="lc-progress-text">0 / 0</div>
        </div>

        <div class="lc-stats" id="lc-stats" style="display:none;"></div>

        <div class="lc-filter" id="lc-filter" style="display:none;">
          <button class="lc-filter-btn active" data-filter="all">全部 <span id="lc-count-all">0</span></button>
          <button class="lc-filter-btn" data-filter="ok">✓ 可访问 <span id="lc-count-ok">0</span></button>
          <button class="lc-filter-btn" data-filter="fail">✗ 不可访问 <span id="lc-count-fail">0</span></button>
          <button class="lc-filter-btn" data-filter="redirect">↪ 重定向 <span id="lc-count-redirect">0</span></button>
        </div>

        <div class="lc-list" id="lc-list">
          <div class="lc-empty">点击「扫描当前页面」开始检查</div>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const container = context.container;
    let allLinks = [];       // [{url, text, sameOrigin}]
    let allResults = [];     // [{url, ok, status, duration, redirect, finalUrl, error, note}]
    let currentFilter = 'all';

    function bindEvents() {
      container.querySelector('#lc-scan').addEventListener('click', onScan);
      container.querySelector('#lc-check').addEventListener('click', onCheck);
      container.querySelector('#lc-filter').addEventListener('click', (e) => {
        const btn = e.target.closest('.lc-filter-btn');
        if (!btn) return;
        container.querySelectorAll('.lc-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderList();
      });
    }

    bindEvents();

    async function onScan() {
      const btn = container.querySelector('#lc-scan');
      btn.disabled = true;
      btn.textContent = '扫描中...';
      try {
        const res = await chrome.runtime.sendMessage({ type: 'link-check:scan' });
        if (!res.ok) {
          flashMessage(res.error || '扫描失败');
          return;
        }
        allLinks = res.links || [];
        allResults = [];
        container.querySelector('#lc-check').disabled = allLinks.length === 0;
        container.querySelector('#lc-filter').style.display = 'none';
        container.querySelector('#lc-stats').style.display = 'none';
        container.querySelector('#lc-progress').style.display = 'none';
        renderList();
        if (allLinks.length === 0) {
          flashMessage('当前页面无有效 a 标签链接');
        } else {
          flashMessage(`扫描到 ${allLinks.length} 个唯一链接`);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = '🔍 扫描当前页面';
      }
    }

    async function onCheck() {
      if (allLinks.length === 0) return;
      const urls = allLinks.map(l => l.url);
      const concurrency = Number(container.querySelector('#lc-concurrency').value) || 4;

      const checkBtn = container.querySelector('#lc-check');
      checkBtn.disabled = true;
      checkBtn.textContent = '校验中...';
      container.querySelector('#lc-scan').disabled = true;

      // 显示进度条（由于 SW fetch 不支持单条进度回调，做近似显示）
      const progressWrap = container.querySelector('#lc-progress');
      const progressInner = container.querySelector('#lc-progress-inner');
      const progressText = container.querySelector('#lc-progress-text');
      progressWrap.style.display = '';
      progressInner.style.width = '0%';
      progressText.textContent = `0 / ${urls.length}`;

      // 估算：每批并发数完成后更新一次
      const batchSize = concurrency;
      const totalBatches = Math.ceil(urls.length / batchSize);
      let doneBatches = 0;

      const progressTimer = setInterval(() => {
        doneBatches = Math.min(doneBatches + 1, totalBatches);
        const pct = Math.round((doneBatches / totalBatches) * 100);
        progressInner.style.width = pct + '%';
        const done = Math.min(doneBatches * batchSize, urls.length);
        progressText.textContent = `${done} / ${urls.length}`;
        if (doneBatches >= totalBatches) clearInterval(progressTimer);
      }, 300);

      try {
        const res = await chrome.runtime.sendMessage({ type: 'link-check:check', urls, concurrency });
        clearInterval(progressTimer);
        progressInner.style.width = '100%';
        progressText.textContent = `${urls.length} / ${urls.length}`;

        if (!res.ok) {
          flashMessage(res.error || '校验失败');
          return;
        }

        // 合并 results 到 allResults（保持与 allLinks 顺序一致）
        allResults = res.results || [];
        renderStats();
        renderList();
        container.querySelector('#lc-filter').style.display = '';
        flashMessage('校验完成');
      } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = '开始校验';
        container.querySelector('#lc-scan').disabled = false;
      }
    }

    function renderStats() {
      if (allResults.length === 0) return;
      let ok = 0, fail = 0, redirect = 0, crossOrigin = 0;
      allResults.forEach(r => {
        if (r.ok) {
          if (r.status > 0 && r.status < 400) ok++;
          else if (r.note) crossOrigin++; // no-cors 跨域受限也算可访问
          else ok++;
        } else {
          fail++;
        }
        if (r.redirect) redirect++;
      });
      const statsEl = container.querySelector('#lc-stats');
      statsEl.style.display = '';
      statsEl.innerHTML = `
        <div class="lc-stat-item">
          <span class="lc-stat-num">${allResults.length}</span>
          <span class="lc-stat-label">总计</span>
        </div>
        <div class="lc-stat-item lc-stat-ok">
          <span class="lc-stat-num">${ok + crossOrigin}</span>
          <span class="lc-stat-label">可访问</span>
        </div>
        <div class="lc-stat-item lc-stat-fail">
          <span class="lc-stat-num">${fail}</span>
          <span class="lc-stat-label">不可访问</span>
        </div>
        <div class="lc-stat-item lc-stat-redirect">
          <span class="lc-stat-num">${redirect}</span>
          <span class="lc-stat-label">重定向</span>
        </div>
        ${crossOrigin > 0 ? `<div class="lc-stat-item lc-stat-cross">
          <span class="lc-stat-num">${crossOrigin}</span>
          <span class="lc-stat-label">跨域受限</span>
        </div>` : ''}
      `;
      // 更新 filter 计数
      container.querySelector('#lc-count-all').textContent = allResults.length;
      container.querySelector('#lc-count-ok').textContent = ok + crossOrigin;
      container.querySelector('#lc-count-fail').textContent = fail;
      container.querySelector('#lc-count-redirect').textContent = redirect;
    }

    function renderList() {
      const listEl = container.querySelector('#lc-list');
      listEl.innerHTML = '';

      if (allLinks.length === 0) {
        listEl.innerHTML = '<div class="lc-empty">点击「扫描当前页面」开始检查</div>';
        return;
      }

      const hasResults = allResults.length > 0;

      let filteredLinks = allLinks;
      if (hasResults) {
        filteredLinks = allLinks.filter((_, i) => {
          const r = allResults[i] || {};
          if (currentFilter === 'all') return true;
          if (currentFilter === 'ok') return r.ok;
          if (currentFilter === 'fail') return !r.ok;
          if (currentFilter === 'redirect') return r.redirect;
          return true;
        });
      }

      if (filteredLinks.length === 0) {
        listEl.innerHTML = `<div class="lc-empty">当前筛选条件下无结果</div>`;
        return;
      }

      filteredLinks.forEach((link) => {
        const idx = allLinks.indexOf(link);
        const result = allResults[idx];
        const card = document.createElement('div');
        card.className = 'lc-item';

        if (result) {
          // 有校验结果
          const statusClass = !result.ok ? 'lc-status-fail'
            : result.redirect ? 'lc-status-redirect'
            : result.note ? 'lc-status-cross'
            : result.status >= 200 && result.status < 400 ? 'lc-status-ok'
            : 'lc-status-warn';

          const statusText = !result.ok ? `✗ 失败`
            : result.note ? `跨域受限`
            : result.redirect ? `↪ ${result.status}`
            : `${result.status}`;

          card.innerHTML = `
            <div class="lc-item-head">
              <span class="lc-status ${statusClass}">${statusText}</span>
              ${result.duration ? `<span class="lc-duration">${result.duration}ms</span>` : ''}
              ${link.sameOrigin ? '<span class="lc-tag-same">同源</span>' : '<span class="lc-tag-cross">跨域</span>'}
            </div>
            <div class="lc-item-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</div>
            ${link.text ? `<div class="lc-item-text">📝 ${escapeHtml(link.text)}</div>` : ''}
            ${result.redirect && result.finalUrl && result.finalUrl !== link.url ?
              `<div class="lc-item-redirect">↪ <span title="${escapeHtml(result.finalUrl)}">${escapeHtml(result.finalUrl)}</span></div>` : ''}
            ${result.error ? `<div class="lc-item-error">⚠ ${escapeHtml(result.error)}</div>` : ''}
          `;
        } else {
          // 仅扫描，未校验
          card.innerHTML = `
            <div class="lc-item-head">
              <span class="lc-status lc-status-pending">待校验</span>
              ${link.sameOrigin ? '<span class="lc-tag-same">同源</span>' : '<span class="lc-tag-cross">跨域</span>'}
            </div>
            <div class="lc-item-url" title="${escapeHtml(link.url)}">${escapeHtml(link.url)}</div>
            ${link.text ? `<div class="lc-item-text">📝 ${escapeHtml(link.text)}</div>` : ''}
          `;
        }

        listEl.appendChild(card);
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    return () => {};
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount });
})();

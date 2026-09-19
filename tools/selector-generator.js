// tools/selector-generator.js — 选择器生成器（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'selector-generator',
    name: '选择器生成',
    desc: '点击元素生成 CSS/XPath/Playwright 选择器 · 校验唯一性',
    iconUrl: 'icons/selector-generator.png',
    category: 'test',
    categoryName: '测试工具'
  };

  let currentResult = null;
  let unsubs = [];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="sg-toolbar">
        <button class="btn" id="sgPickBtn">🎯 开始选择</button>
        <button class="btn" id="sgCancelBtn" style="display:none;">取消选择</button>
        <span class="sg-status" id="sgStatus">点击「开始选择」后在页面上点击元素</span>
      </div>

      <div id="sgResult" style="display:none;">
        <!-- 元素信息 -->
        <div class="sg-info" id="sgInfo"></div>

        <!-- CSS -->
        <div class="sg-item">
          <div class="sg-item-head">
            <span class="sg-item-title">CSS 选择器</span>
            <span class="sg-item-badge" data-sg-badge="css">—</span>
          </div>
          <div class="sg-code-row">
            <code class="sg-code" id="sgCssCode">—</code>
            <button class="btn sg-copy-btn" data-sg-copy="css">复制</button>
          </div>
        </div>

        <!-- XPath -->
        <div class="sg-item">
          <div class="sg-item-head">
            <span class="sg-item-title">XPath</span>
            <span class="sg-item-badge" data-sg-badge="xpath">—</span>
          </div>
          <div class="sg-code-row">
            <code class="sg-code" id="sgXpathCode">—</code>
            <button class="btn sg-copy-btn" data-sg-copy="xpath">复制</button>
          </div>
        </div>

        <!-- Playwright -->
        <div class="sg-item">
          <div class="sg-item-head">
            <span class="sg-item-title">Playwright 选择器</span>
          </div>
          <div id="sgPwList"></div>
        </div>
      </div>

      <div id="sgEmpty" class="sg-empty">
        尚未选择元素<br>
        <small>点击「开始选择」→ 在页面上点击目标元素 → 自动生成选择器</small>
      </div>
    `;

    // 开始选择按钮
    container.querySelector('#sgPickBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'selector-gen:activate-picker' }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          flashMessage('激活选择器失败：' + (res?.error || chrome.runtime.lastError?.message || '请先刷新页面'));
        } else {
          flashMessage('请在页面上点击目标元素…', 5000);
          setStatus(container, '在页面上点击目标元素 · Esc 取消', true);
        }
      });
    });

    // 取消选择按钮
    container.querySelector('#sgCancelBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'selector-gen:deactivate-picker' }, () => {
        setStatus(container, '已取消', false);
      });
    });

    // 复制按钮
    container.querySelectorAll('[data-sg-copy]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.sgCopy;
        let text = '';
        if (key === 'css') text = currentResult?.css?.selector || '';
        if (key === 'xpath') text = currentResult?.xpath?.selector || '';
        if (!text) return;
        copyText(text);
        btn.textContent = '已复制!';
        setTimeout(() => btn.textContent = '复制', 1200);
      });
    });
  }

  function mount(context) {
    const { container, events } = context;
    unsubs = [];
    if (events && typeof events.on === 'function') {
      unsubs.push(events.on('selector-gen:picked', (payload) => {
        currentResult = payload;
        renderResult(container, payload);
        setStatus(container, '✓ 已生成选择器', false);
        flashMessage('✓ 选择器已生成', 1500);
      }));
    }
  }

  function setStatus(container, text, picking) {
    const statusEl = container.querySelector('#sgStatus');
    const pickBtn = container.querySelector('#sgPickBtn');
    const cancelBtn = container.querySelector('#sgCancelBtn');
    if (statusEl) statusEl.textContent = text;
    if (pickBtn) pickBtn.style.display = picking ? 'none' : '';
    if (cancelBtn) cancelBtn.style.display = picking ? '' : 'none';
  }

  function renderResult(container, r) {
    container.querySelector('#sgEmpty').style.display = 'none';
    container.querySelector('#sgResult').style.display = '';

    // 元素信息
    const info = container.querySelector('#sgInfo');
    const parts = [`<b>&lt;${r.info.tag}&gt;</b>`];
    if (r.info.id) parts.push(`<span class="sg-info-id">#${r.info.id}</span>`);
    if (r.info.classes) parts.push(`<span class="sg-info-cls">.${String(r.info.classes).trim().split(/\s+/).join('.')}</span>`);
    const attrParts = Object.entries(r.info.attrs).map(([k, v]) => `<span class="sg-info-attr">${k}="${v}"</span>`);
    parts.push(...attrParts);
    if (r.info.text) parts.push(`<span class="sg-info-text">"${r.info.text.slice(0, 30)}"</span>`);
    info.innerHTML = parts.join(' ');

    // CSS
    const cssCode = container.querySelector('#sgCssCode');
    const cssBadge = container.querySelector('[data-sg-badge="css"]');
    cssCode.textContent = r.css.selector || '—';
    cssCode.title = `生成策略: ${r.css.strategy}${r.css.targetHit ? '' : ' (未命中目标)'}`;
    setBadge(cssBadge, r.css.unique, r.css.count, r.css.targetHit);

    // XPath
    const xpathCode = container.querySelector('#sgXpathCode');
    const xpathBadge = container.querySelector('[data-sg-badge="xpath"]');
    xpathCode.textContent = r.xpath.selector || '—';
    xpathCode.title = `生成策略: ${r.xpath.strategy}${r.xpath.targetHit ? '' : ' (未命中目标)'}`;
    setBadge(xpathBadge, r.xpath.unique, r.xpath.count, r.xpath.targetHit);

    // Playwright
    const pwList = container.querySelector('#sgPwList');
    if (r.playwright && r.playwright.length) {
      pwList.innerHTML = r.playwright.map((pw, i) => `
        <div class="sg-pw-item">
          <div class="sg-pw-head">
            <span class="sg-pw-type">${pw.type}</span>
            <span class="sg-item-badge sg-pw-badge" data-sg-pw-badge-${i}>—</span>
          </div>
          <div class="sg-code-row">
            <code class="sg-code">${pw.selector}</code>
            <button class="btn sg-copy-btn" data-sg-copy-pw="${i}">复制</button>
          </div>
        </div>
      `).join('');

      // 绑定 Playwright 复制按钮 + badge
      r.playwright.forEach((pw, i) => {
        const badge = pwList.querySelector(`[data-sg-pw-badge-${i}]`);
        if (badge) setBadge(badge, pw.unique, pw.count, pw.targetHit);
        const copyBtn = pwList.querySelector(`[data-sg-copy-pw="${i}"]`);
        if (copyBtn) copyBtn.addEventListener('click', () => {
          copyText(pw.selector);
          copyBtn.textContent = '已复制!';
          setTimeout(() => copyBtn.textContent = '复制', 1200);
        });
      });
    } else {
      pwList.innerHTML = '<div class="sg-empty" style="padding:12px;">无可用 Playwright 选择器</div>';
    }
  }

  function setBadge(el, unique, count, targetHit) {
    if (!el) return;
    el.classList.remove('sg-badge-ok', 'sg-badge-warn', 'sg-badge-bad', 'sg-badge-err');
    if (unique && targetHit) {
      el.textContent = '✓ 唯一';
      el.classList.add('sg-badge-ok');
    } else if (count > 1 && targetHit) {
      el.textContent = `⚠ ${count} 个匹配`;
      el.classList.add('sg-badge-warn');
    } else if (!targetHit && count >= 0) {
      el.textContent = `✗ 不包含目标`;
      el.classList.add('sg-badge-bad');
    } else if (count === 0) {
      el.textContent = '✗ 无匹配';
      el.classList.add('sg-badge-bad');
    } else {
      el.textContent = '? 校验失败';
      el.classList.add('sg-badge-err');
    }
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

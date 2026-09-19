// tools/keyboard-nav.js — 键盘导航测试：可聚焦元素扫描 + Enter/Space/Esc/Tab 行为监控（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'keyboard-nav',
    name: '键盘导航测试',
    desc: '扫描可聚焦元素；监控 Enter/Space/Esc/Tab 按键行为与默认行为拦截',
    iconUrl: 'icons/keyboard-nav.png',
    category: 'test',
    categoryName: '测试工具'
  };

  const LOG_KEY = '__mynaKbLog';       // 页面 ISOLATED world 上的监控日志
  const MON_KEY = '__mynaKbMon';       // 监控开关标记
  let pollTimer = null;
  let monitorOn = false;
  let containerRef = null;

  function render(container) {
    containerRef = container;
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <div class="te-tip">键盘可访问性辅助检查：扫描 Tab 焦点链，开启监控后在页面上按 Tab / Enter / Space / Esc，这里实时记录行为与被拦截的默认动作。</div>

      <div class="kb-toolbar">
        <button class="btn" id="kbScanBtn">🔍 扫描可聚焦元素</button>
        <button class="btn sc-btn-primary" id="kbMonBtn">▶ 开始键盘监控</button>
        <button class="btn" id="kbClearBtn">🗑 清空日志</button>
      </div>

      <div id="kbSummary" class="kb-summary" style="display:none;"></div>
      <div id="kbFocusList" class="kb-list"></div>

      <div id="kbLogWrap" style="display:none;">
        <div class="sn-section-title">⌨️ 按键日志（最新在前）</div>
        <div id="kbLog" class="kb-list"></div>
      </div>
    `;

    container.querySelector('#kbScanBtn').addEventListener('click', scanFocusable);
    container.querySelector('#kbMonBtn').addEventListener('click', toggleMonitor);
    container.querySelector('#kbClearBtn').addEventListener('click', async () => {
      const tab = await activeTab();
      if (!tab?.id || !guardTab(tab)) return;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED',
          func: (k) => { window[k] = []; }, args: [LOG_KEY]
        });
      } catch {}
      renderLog([]);
    });
  }

  function cleanup() {
    stopPoll();
    containerRef = null;
  }

  function mount() {}

  async function activeTab() {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tab;
  }

  function guardTab(tab) {
    const url = tab?.url || '';
    if (/^(chrome|edge|about|chrome-extension|devtools):\/\//i.test(url)) {
      flashMessage('浏览器内部页面无法注入，请切换到普通网页', 2000);
      return false;
    }
    return true;
  }

  // ===== 可聚焦元素扫描 =====
  async function scanFocusable() {
    const tab = await activeTab();
    if (!tab?.id || !guardTab(tab)) return;
    const btn = containerRef.querySelector('#kbScanBtn');
    btn.disabled = true;
    try {
      const [res] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'ISOLATED',
        func: () => {
          const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex],[contenteditable="true"]';
          const els = [...document.querySelectorAll(FOCUSABLE)];
          const name = (el) => {
            return el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
              || (el.tagName === 'INPUT' ? (el.placeholder || el.name || el.type) : '')
              || (el.textContent || '').trim().slice(0, 40)
              || el.getAttribute('title') || '';
          };
          const items = els.slice(0, 300).map((el, i) => ({
            idx: i,
            tag: el.tagName.toLowerCase() + (el.type ? `[${el.type}]` : ''),
            name: name(el),
            tabindex: el.getAttribute('tabindex'),
            pos: el.getAttribute('tabindex') && Number(el.getAttribute('tabindex')) > 0 ? 'manual' : 'natural',
            rect: (() => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; })()
          }));
          return {
            total: els.length,
            noName: items.filter((x) => !x.name).length,
            manualPositive: items.filter((x) => x.pos === 'manual' && Number(x.tabindex) > 0).length,
            items
          };
        }
      });
      const data = res?.result;
      if (!data) { flashMessage('注入失败，请刷新页面后重试', 2000); return; }
      renderScan(data);
    } catch (e) {
      flashMessage('扫描失败：' + String(e?.message || e), 2500);
    } finally {
      btn.disabled = false;
    }
  }

  function renderScan(data) {
    const c = containerRef;
    const summary = c.querySelector('#kbSummary');
    summary.style.display = '';
    summary.innerHTML = `
      <span class="kb-chip">可聚焦元素 <b>${data.total}</b></span>
      <span class="kb-chip kb-chip-warn">无可访问名称 <b>${data.noName}</b></span>
      <span class="kb-chip kb-chip-warn">tabindex>0 <b>${data.manualPositive}</b></span>
    `;
    const list = c.querySelector('#kbFocusList');
    if (!data.items.length) { list.innerHTML = '<div class="te-empty">未发现可聚焦元素</div>'; return; }
    list.innerHTML = `
      <div class="kb-row kb-row-head"><span>#</span><span>元素</span><span>名称 / 文本</span><span>tabindex</span></div>
      ${data.items.map((it) => `
        <div class="kb-row ${it.name ? '' : 'kb-row-warn'}">
          <span>${it.idx + 1}</span>
          <span>${escapeHtml(it.tag)}</span>
          <span title="坐标 ${it.rect.x},${it.rect.y}">${escapeHtml(it.name || '⚠ 无名称')}</span>
          <span>${escapeHtml(it.tabindex ?? '-')}</span>
        </div>
      `).join('')}
    `;
  }

  // ===== 键盘行为监控 =====
  // 注意：必须用 func 函数注入而非 eval 字符串——很多页面 CSP 禁止 unsafe-eval，
  // eval 注入会直接抛错导致监听器从未绑定；func 注入不受页面 CSP 影响。
  async function toggleMonitor() {
    const tab = await activeTab();
    if (!tab?.id || !guardTab(tab)) return;
    const btn = containerRef.querySelector('#kbMonBtn');
    if (monitorOn) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED',
        func: (k) => { window[k] = false; }, args: [MON_KEY]
      }).catch(() => {});
      monitorOn = false;
      stopPoll();
      btn.textContent = '▶ 开始键盘监控';
      flashMessage('已停止监控', 1500);
    } else {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true }, world: 'ISOLATED',
          func: (monKey, logKey) => {
            // 先移除旧监听器，避免重复注入导致日志翻倍
            const oldHandler = window[monKey + 'Handler'];
            if (oldHandler) document.removeEventListener('keydown', oldHandler, true);
            window[logKey] = window[logKey] || [];
            window[monKey] = true;
            const KEYS = ['Tab', 'Enter', ' ', 'Escape'];
            const handler = (e) => {
              if (!window[monKey] || !KEYS.includes(e.key)) return;
              const t = e.target;
              window[logKey].unshift({
                key: e.key === ' ' ? 'Space' : e.key,
                shift: e.shiftKey,
                tag: t ? t.tagName.toLowerCase() + (t.type ? '[' + t.type + ']' : '') : 'none',
                name: t ? ((t.getAttribute('aria-label') || t.placeholder || (t.textContent || '').trim().slice(0, 30)) || '') : '',
                prevented: e.defaultPrevented,
                t: Date.now()
              });
              if (window[logKey].length > 200) window[logKey].pop();
            };
            window[monKey + 'Handler'] = handler;
            document.addEventListener('keydown', handler, true);
          },
          args: [MON_KEY, LOG_KEY]
        });
        monitorOn = true;
        btn.textContent = '■ 停止监控';
        containerRef.querySelector('#kbLogWrap').style.display = '';
        startPoll(tab.id);
        flashMessage('✓ 监控已开启，去页面上按 Tab/Enter/Space/Esc', 2500);
      } catch (e) {
        flashMessage('注入失败：' + String(e?.message || e), 2500);
      }
    }
  }

  function startPoll(tabId) {
    stopPoll();
    pollTimer = setInterval(async () => {
      if (!monitorOn || !containerRef) { stopPoll(); return; }
      try {
        const res = await chrome.scripting.executeScript({
          target: { tabId, allFrames: true }, world: 'ISOLATED',
          func: (k) => window[k] || [], args: [LOG_KEY]
        });
        // 合并所有 frame 的日志，按时间倒序
        const logs = (res || []).flatMap((r) => r?.result || []).sort((a, b) => b.t - a.t);
        renderLog(logs);
      } catch { /* 页面跳转期间忽略 */ }
    }, 800);
  }

  function stopPoll() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  const KEY_ICON = { Tab: '⇥', Enter: '⏎', Space: '␣', Escape: '⎋' };
  function renderLog(logs) {
    const el = containerRef?.querySelector('#kbLog');
    if (!el) return;
    if (!logs.length) { el.innerHTML = '<div class="te-empty">暂无按键记录</div>'; return; }
    el.innerHTML = logs.slice(0, 50).map((l) => `
      <div class="kb-row ${l.prevented ? 'kb-row-warn' : ''}">
        <span class="kb-key">${KEY_ICON[l.key] || l.key}${l.shift ? ' +⇧' : ''}</span>
        <span>${escapeHtml(l.tag)}</span>
        <span>${escapeHtml(l.name || '—')}</span>
        <span class="kb-prevented">${l.prevented ? '⛔ 默认行为被拦截' : '✓ 默认行为'}</span>
      </div>
    `).join('');
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

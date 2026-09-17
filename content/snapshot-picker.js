// content/snapshot-picker.js — ISOLATED world
// 职责：元素选择器 + 自动比对 + DOM 徽章通知

(function () {
  const STORAGE_KEY = 'snapshotBaselines';

  // ========== 元素选择器 ==========
  let pickerActive = false;
  let hoverEl = null;
  let overlayEl = null;

  function activatePicker() {
    if (pickerActive) return;
    pickerActive = true;
    document.body.style.cursor = 'crosshair';

    // 创建选择框
    overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
      position: fixed; z-index: 2147483647;
      border: 2px solid #8B5CF6;
      background: rgba(139,92,246,0.15);
      pointer-events: none;
      display: none;
    `;
    document.body.appendChild(overlayEl);

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mousedown', onPick, true);
    document.addEventListener('keydown', onKey, true);

    flashPickTip('请点击要捕获的元素，Esc 取消');
  }

  function deactivatePicker() {
    pickerActive = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mousedown', onPick, true);
    document.removeEventListener('keydown', onKey, true);
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    hoverEl = null;
  }

  function onMove(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlayEl) return;
    hoverEl = el;
    const r = el.getBoundingClientRect();
    overlayEl.style.display = 'block';
    overlayEl.style.left = r.left + 'px';
    overlayEl.style.top = r.top + 'px';
    overlayEl.style.width = r.width + 'px';
    overlayEl.style.height = r.height + 'px';
  }

  function onPick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!hoverEl) return;
    const selector = cssPath(hoverEl);
    const rect = hoverEl.getBoundingClientRect();
    deactivatePicker();

    // 滚动元素到视口中央，确保后续 capture 能拍到
    hoverEl.scrollIntoView({ block: 'center', inline: 'nearest' });

    // 等滚动完成再发消息
    setTimeout(() => {
      const r = hoverEl.getBoundingClientRect();
      chrome.runtime.sendMessage({
        type: 'snapshot:picked',
        selector,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        url: location.href,
        viewport: { w: window.innerWidth, h: window.innerHeight }
      });
    }, 200);
  }

  function onKey(e) {
    if (e.key === 'Escape') deactivatePicker();
  }

  // 生成 CSS 路径选择器
  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 6) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { part += '#' + cur.id; parts.unshift(part); break; }
      const parent = cur.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) { part += `:nth-of-type(${siblings.indexOf(cur) + 1})`; }
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function flashPickTip(msg) {
    const tip = document.createElement('div');
    tip.textContent = msg;
    tip.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      background: #8B5CF6; color: #fff; padding: 6px 14px; border-radius: 6px;
      font-size: 13px; z-index: 2147483647; pointer-events: none;
      box-shadow: 0 4px 12px rgba(139,92,246,0.3);
    `;
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 2000);
  }

  // ========== 自动比对（页面加载后） ==========
  function autoCheck() {
    chrome.storage.local.get([STORAGE_KEY], async (result) => {
      const baselines = result[STORAGE_KEY] || [];
      if (!baselines.length) return;

      const currentUrl = location.href;
      // 匹配当前页面 URL 的基线
      const matched = baselines.filter(b => {
        try {
          const baseUrl = new URL(b.pageUrl);
          const curUrl = new URL(currentUrl);
          return baseUrl.origin === curUrl.origin && baseUrl.pathname === curUrl.pathname;
        } catch { return false; }
      });
      if (!matched.length) return;

      // 等页面稳定后再检查
      await new Promise(r => setTimeout(r, 1500));

      for (const baseline of matched) {
        try {
          const el = document.querySelector(baseline.selector);
          if (!el) continue;
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          const rect = el.getBoundingClientRect();
          const msg = await chrome.runtime.sendMessage({
            type: 'snapshot:compare',
            baselineId: baseline.id,
            selector: baseline.selector,
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            url: currentUrl,
            viewport: { w: window.innerWidth, h: window.innerHeight }
          });
          // 在页面上显示徽章
          showBadge(baseline, msg);
        } catch (e) {
          // 静默忽略
        }
      }
    });
  }

  function showBadge(baseline, result) {
    if (!result || !result.ok) return;
    const diffRate = result.diffRate || 0;
    const hasDiff = diffRate > 0.01; // 1% 以下视为无变化

    const badge = document.createElement('div');
    badge.className = '__myna_snapshot_badge';
    const color = hasDiff ? '#EF4444' : '#10B981';
    const text = hasDiff ? `⚠ UI 变更 ${(diffRate * 100).toFixed(1)}%` : `✓ UI 一致`;
    badge.style.cssText = `
      position: fixed; right: 12px; bottom: 12px;
      background: ${color}; color: #fff; padding: 6px 12px; border-radius: 6px;
      font-size: 12px; z-index: 2147483646; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-family: -apple-system, sans-serif;
      transition: opacity 0.3s;
    `;
    badge.textContent = text;
    badge.title = `基线: ${baseline.name}\n点击关闭`;
    badge.addEventListener('click', () => badge.remove());
    document.body.appendChild(badge);

    // 5 秒后自动淡出
    setTimeout(() => {
      badge.style.opacity = '0';
      setTimeout(() => badge.remove(), 500);
    }, 5000);
  }

  // ========== 监听 sidepanel 请求 ==========
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'snapshot:activate-picker') {
      activatePicker();
      sendResponse({ ok: true });
    }
    if (msg.type === 'snapshot:get-rect') {
      // sidepanel 传入 selector，返回元素 rect
      const el = document.querySelector(msg.selector);
      if (!el) { sendResponse({ ok: false, error: '元素不存在' }); return; }
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      sendResponse({
        ok: true,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        viewport: { w: window.innerWidth, h: window.innerHeight }
      });
    }
  });

  // 页面加载后自动检查
  if (document.readyState === 'complete') {
    autoCheck();
  } else {
    window.addEventListener('load', autoCheck, { once: true });
  }
})();

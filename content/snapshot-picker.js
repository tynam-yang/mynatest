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
    // 同时生成 CSS 和 XPath，默认用 XPath（更稳定）
    const css = cssPath(hoverEl);
    const xpath = xpathFromEl(hoverEl);
    // 先保存元素引用，deactivatePicker 会将 hoverEl 置为 null
    const pickedEl = hoverEl;
    deactivatePicker();

    // 滚动元素到视口中央，确保后续 capture 能拍到
    pickedEl.scrollIntoView({ block: 'center', inline: 'nearest' });

    // 等滚动完成再发消息
    setTimeout(() => {
      const r = pickedEl.getBoundingClientRect();
      try {
        chrome.runtime.sendMessage({
          type: 'snapshot:picked',
          selector: css,
          selectorType: 'css',
          xpathSelector: xpath,
          rect: { left: r.left, top: r.top, width: r.width, height: r.height },
          url: location.href,
          viewport: { w: window.innerWidth, h: window.innerHeight }
        }, () => { void chrome.runtime?.lastError; });
      } catch {}
    }, 200);
  }

  function onKey(e) {
    if (e.key === 'Escape') deactivatePicker();
  }

  // 生成 CSS 选择器：就近优先，尽量用元素自身唯一属性，避免长链路
  function cssPath(el) {
    if (!(el instanceof Element)) return '';
    const esc = (s) => { try { return CSS.escape(s); } catch { return s; } };

    // 判断某个选择器是否在 document 中唯一命中目标元素
    function unique(sel, target) {
      try {
        const list = document.querySelectorAll(sel);
        return list.length === 1 && list[0] === target;
      } catch { return false; }
    }

    const tag = el.tagName.toLowerCase();

    // 1) 优先：元素自身 id 唯一
    if (el.id) {
      const sel = `#${esc(el.id)}`;
      if (unique(sel, el)) return sel;
    }

    // 2) 元素自身 class 组合唯一（tag + 全部 class）
    if (el.classList && el.classList.length) {
      const sel = tag + '.' + Array.from(el.classList).map(esc).join('.');
      if (unique(sel, el)) return sel;
    }

    // 3) 元素自身 name 属性唯一
    const nameAttr = el.getAttribute && el.getAttribute('name');
    if (nameAttr) {
      const sel = `${tag}[name="${esc(nameAttr)}"]`;
      if (unique(sel, el)) return sel;
    }

    // 4) 其他常见唯一属性：data-testid / data-test / data-id / role + aria-label
    for (const attr of ['data-testid', 'data-test', 'data-id', 'data-cy']) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (v) {
        const sel = `${tag}[${attr}="${esc(v)}"]`;
        if (unique(sel, el)) return sel;
      }
    }
    const role = el.getAttribute && el.getAttribute('role');
    const ariaLabel = el.getAttribute && el.getAttribute('aria-label');
    if (role && ariaLabel) {
      const sel = `${tag}[role="${esc(role)}"][aria-label="${esc(ariaLabel)}"]`;
      if (unique(sel, el)) return sel;
    }

    // 5) 回退：向上找最近的有唯一 id 的祖先，再用 tag + class + nth-of-type 向下定位
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 4) {
      const t = cur.tagName.toLowerCase();
      if (cur.id) {
        const sel = `#${esc(cur.id)}`;
        if (unique(sel, cur)) { parts.unshift(sel); break; }
      }
      let part = t;
      if (cur.classList && cur.classList.length) {
        part += '.' + Array.from(cur.classList).map(esc).join('.');
      }
      const parent = cur.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) { part += `:nth-of-type(${siblings.indexOf(cur) + 1})`; }
      }
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  // 生成 XPath（绝对路径，//header/div[2]/a 形式）
  function xpathFromEl(el) {
    if (!(el instanceof Element)) return '';
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 8) {
      let part = cur.tagName.toLowerCase();
      const parent = cur.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) { part += `[${siblings.indexOf(cur) + 1}]`; }
      }
      if (cur.id) { part = `*[@id="${cur.id}"]`; parts.unshift(part); break; }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return '//' + parts.join('/');
  }

  // XPath 查找元素
  function findByXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch { return null; }
  }

  // 根据选择器查找元素（支持 css 和 xpath）
  function findEl(selector, selectorType) {
    if (selectorType === 'xpath') return findByXPath(selector);
    try { return document.querySelector(selector); } catch { return null; }
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
          const el = findEl(baseline.selector, baseline.selectorType || 'css');
          if (!el) continue;
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          const rect = el.getBoundingClientRect();
          let msg = null;
          try {
            msg = await chrome.runtime.sendMessage({
              type: 'snapshot:compare',
              baselineId: baseline.id,
              selector: baseline.selector,
              selectorType: baseline.selectorType || 'css',
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
              url: currentUrl,
              viewport: { w: window.innerWidth, h: window.innerHeight }
            });
          } catch (e) {
            void chrome.runtime?.lastError;
            continue;
          }
          if (msg) showBadge(baseline, msg);
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
  function safeSendResponse(sendResponse, data) {
    try { sendResponse(data); } catch {}
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'snapshot:activate-picker') {
      activatePicker();
      safeSendResponse(sendResponse, { ok: true });
    }
    if (msg.type === 'snapshot:get-rect') {
      const el = findEl(msg.selector, msg.selectorType || 'css');
      if (!el) { safeSendResponse(sendResponse, { ok: false, error: '元素不存在' }); return; }
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      safeSendResponse(sendResponse, {
        ok: true,
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
        viewport: { w: window.innerWidth, h: window.innerHeight }
      });
    }
  });

  // bfcache 恢复时重新注册
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'snapshot:activate-picker') { activatePicker(); safeSendResponse(sendResponse, { ok: true }); }
      if (msg.type === 'snapshot:get-rect') {
        const el = findEl(msg.selector, msg.selectorType || 'css');
        if (!el) { safeSendResponse(sendResponse, { ok: false, error: '元素不存在' }); return; }
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        const r = el.getBoundingClientRect();
        safeSendResponse(sendResponse, {
          ok: true,
          rect: { left: r.left, top: r.top, width: r.width, height: r.height },
          viewport: { w: window.innerWidth, h: window.innerHeight }
        });
      }
    });
  });

  // 页面加载后自动检查
  if (document.readyState === 'complete') {
    autoCheck();
  } else {
    window.addEventListener('load', autoCheck, { once: true });
  }
})();

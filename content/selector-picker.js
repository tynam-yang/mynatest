// content/selector-picker.js — ISOLATED world
// 职责：元素选择器生成器 · 点击元素生成 CSS/XPath/Playwright 选择器 · 校验唯一性

(function () {
  const PICKER_FLAG = '__myna_sel_picker_active__';

  // ========== Pick UI ==========
  let pickerActive = false;
  let hoverEl = null;
  let overlayEl = null;
  let tipEl = null;

  function activatePicker() {
    if (pickerActive) return;
    // 防止与 snapshot-picker 冲突
    if (window[PICKER_FLAG]) { deactivatePicker(); }
    pickerActive = true;
    window[PICKER_FLAG] = true;
    document.body.style.cursor = 'crosshair';

    overlayEl = document.createElement('div');
    overlayEl.style.cssText = `
      position: fixed; z-index: 2147483647;
      border: 2px solid #8B5CF6;
      background: rgba(139,92,246,0.15);
      pointer-events: none; display: none;
    `;
    document.body.appendChild(overlayEl);

    tipEl = document.createElement('div');
    tipEl.style.cssText = `
      position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
      background: #8B5CF6; color: #fff; padding: 6px 14px; border-radius: 6px;
      font-size: 13px; z-index: 2147483647; pointer-events: none;
      box-shadow: 0 4px 12px rgba(139,92,246,0.3); font-family: -apple-system, sans-serif;
    `;
    tipEl.textContent = '🔍 点击元素生成选择器 · Esc 取消';
    document.body.appendChild(tipEl);

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('mousedown', onPick, true);
    document.addEventListener('keydown', onKey, true);
  }

  function deactivatePicker() {
    pickerActive = false;
    window[PICKER_FLAG] = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('mousedown', onPick, true);
    document.removeEventListener('keydown', onKey, true);
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    if (tipEl) { tipEl.remove(); tipEl = null; }
    hoverEl = null;
  }

  function onMove(e) {
    e.preventDefault(); e.stopPropagation();
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
    e.preventDefault(); e.stopPropagation();
    if (!hoverEl) return;
    const picked = hoverEl;
    deactivatePicker();

    const result = generateAllSelectors(picked);
    // 回传元素基本信息 + 所有选择器 + 唯一性校验
    try {
      chrome.runtime.sendMessage({ type: 'selector-gen:picked', payload: result }, () => {
        // bfcache 导致 port 断开时静默忽略 lastError
        void chrome.runtime?.lastError;
      });
    } catch {}
  }

  function onKey(e) { if (e.key === 'Escape') deactivatePicker(); }

  // ========== 唯一性校验 ==========
  function countCss(sel) {
    try { return document.querySelectorAll(sel).length; } catch { return -1; }
  }
  function countXPath(xpath) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    } catch { return -1; }
  }
  function countTargetCss(sel, target) {
    try {
      const list = document.querySelectorAll(sel);
      let n = 0, targetHit = false;
      list.forEach(el => { n++; if (el === target) targetHit = true; });
      return { count: n, targetHit };
    } catch { return { count: -1, targetHit: false }; }
  }
  function countTargetXPath(xpath, target) {
    try {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      const n = result.snapshotLength;
      let targetHit = false;
      for (let i = 0; i < n; i++) { if (result.snapshotItem(i) === target) { targetHit = true; break; } }
      return { count: n, targetHit };
    } catch { return { count: -1, targetHit: false }; }
  }

  // ========== CSS 选择器生成（逐级增强直到唯一） ==========
  function genCss(el) {
    if (!(el instanceof Element)) return { selector: '', unique: false, count: 0, targetHit: false, strategy: 'none' };
    const esc = (s) => { try { return CSS.escape(s); } catch { return s; } };

    const tag = el.tagName.toLowerCase();
    // 策略链：低区分度 → 高区分度 → 结构路径
    const strategies = [];

    // 1) id
    if (el.id) strategies.push({ sel: `#${esc(el.id)}`, strategy: 'id' });

    // 2) data-testid / data-test / data-cy / data-qa
    for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-e2e']) {
      const v = el.getAttribute(attr);
      if (v) strategies.push({ sel: `${tag}[${attr}="${esc(v)}"]`, strategy: attr });
    }

    // 3) role + aria-label
    const role = el.getAttribute('role');
    const ariaLabel = el.getAttribute('aria-label');
    if (role && ariaLabel) {
      strategies.push({ sel: `${tag}[role="${esc(role)}"][aria-label="${esc(ariaLabel)}"]`, strategy: 'role+aria-label' });
    }

    // 4) name 属性
    const nameAttr = el.getAttribute('name');
    if (nameAttr) strategies.push({ sel: `${tag}[name="${esc(nameAttr)}"]`, strategy: 'name' });

    // 5) placeholder
    const ph = el.getAttribute('placeholder');
    if (ph) strategies.push({ sel: `${tag}[placeholder="${esc(ph)}"]`, strategy: 'placeholder' });

    // 6) class 组合（tag + 全部 class）
    if (el.classList && el.classList.length) {
      strategies.push({ sel: tag + '.' + Array.from(el.classList).map(esc).join('.'), strategy: 'class-combo' });
    }

    // 7) 属性组合（type + value 等）
    const typeAttr = el.getAttribute('type');
    const valueAttr = el.getAttribute('value');
    if (typeAttr) strategies.push({ sel: `${tag}[type="${esc(typeAttr)}"]`, strategy: 'type' });
    if (typeAttr && valueAttr) strategies.push({ sel: `${tag}[type="${esc(typeAttr)}"][value="${esc(valueAttr)}"]`, strategy: 'type+value' });

    // 尝试每个策略
    for (const s of strategies) {
      const r = countTargetCss(s.sel, el);
      if (r.targetHit && r.count === 1) {
        return { selector: s.sel, unique: true, count: 1, targetHit: true, strategy: s.strategy };
      }
    }

    // 8) 回退：向上找最近唯一祖先 + 向下定位
    const parts = [];
    let cur = el;
    let depth = 0;
    let foundAncestor = false;
    while (cur && cur.nodeType === 1 && depth < 6) {
      const t = cur.tagName.toLowerCase();
      if (cur.id) {
        const sel = `#${esc(cur.id)}`;
        if (countCss(sel) === 1) { parts.unshift(sel); foundAncestor = true; break; }
      }
      // 尝试祖先的 data-testid
      for (const attr of ['data-testid', 'data-test', 'data-cy']) {
        const v = cur.getAttribute(attr);
        if (v) {
          const sel = `${t}[${attr}="${esc(v)}"]`;
          if (countCss(sel) === 1) { parts.unshift(sel); foundAncestor = true; break; }
        }
      }
      if (foundAncestor) break;

      let part = t;
      if (cur.classList && cur.classList.length) {
        part += '.' + Array.from(cur.classList).map(esc).slice(0, 3).join('.');
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

    const pathSel = parts.join(' > ');
    const r = countTargetCss(pathSel, el);
    return { selector: pathSel, unique: r.count === 1 && r.targetHit, count: r.count, targetHit: r.targetHit, strategy: 'path' };
  }

  // ========== XPath 选择器生成（逐级增强直到唯一） ==========
  function genXPath(el) {
    if (!(el instanceof Element)) return { selector: '', unique: false, count: 0, targetHit: false, strategy: 'none' };

    const tag = el.tagName.toLowerCase();
    const strategies = [];

    // 1) id
    if (el.id) strategies.push(`//*[@id="${el.id}"]`);

    // 2) data-testid / data-test
    for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa']) {
      const v = el.getAttribute(attr);
      if (v) strategies.push(`//${tag}[@${attr}="${v}"]`);
    }

    // 3) role + aria-label
    const role = el.getAttribute('role');
    const ariaLabel = el.getAttribute('aria-label');
    if (role && ariaLabel) strategies.push(`//${tag}[@role="${role}" and @aria-label="${ariaLabel}"]`);

    // 4) name
    const nameAttr = el.getAttribute('name');
    if (nameAttr) strategies.push(`//${tag}[@name="${nameAttr}"]`);

    // 5) placeholder
    const ph = el.getAttribute('placeholder');
    if (ph) strategies.push(`//${tag}[@placeholder="${ph}"]`);

    // 6) class
    if (el.classList && el.classList.length) {
      const cls = Array.from(el.classList).slice(0, 3).join(' and contains(@class, "');
      strategies.push(`//${tag}[contains(@class, "${Array.from(el.classList)[0]}")]`);
    }

    // 尝试每个策略
    for (const xpath of strategies) {
      const r = countTargetXPath(xpath, el);
      if (r.targetHit && r.count === 1) {
        return { selector: xpath, unique: true, count: 1, targetHit: true, strategy: 'attribute' };
      }
    }

    // 7) 回退：绝对路径
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 8) {
      let part = cur.tagName.toLowerCase();
      const parent = cur.parentNode;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === cur.tagName);
        if (siblings.length > 1) { part += `[${siblings.indexOf(cur) + 1}]`; }
      }
      if (cur.id) { part = `*[@id="${cur.id}"]`; parts.unshift(part); break; }
      parts.unshift(part);
      cur = cur.parentElement;
      depth++;
    }
    const xpath = '//' + parts.join('/');
    const r = countTargetXPath(xpath, el);
    return { selector: xpath, unique: r.count === 1 && r.targetHit, count: r.count, targetHit: r.targetHit, strategy: 'absolute-path' };
  }

  // ========== Playwright 选择器生成 ==========
  function genPlaywright(el, cssResult, xpathResult) {
    if (!(el instanceof Element)) return [];
    const tag = el.tagName.toLowerCase();
    const results = [];

    // 1) getByRole - 最推荐
    const role = el.getAttribute('role');
    if (role) {
      let pw = `page.getByRole('${role}'`;
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) pw += `, { name: '${ariaLabel.replace(/'/g, "\\'")}' }`;
      pw += ')';
      const { count, targetHit } = countTargetCss(`[role="${role}"]${ariaLabel ? `[aria-label="${ariaLabel}"]` : ''}`, el);
      const unique = count === 1 && targetHit;
      results.push({ type: 'getByRole', selector: pw, unique, count, targetHit });
    }

    // 2) getByText - 按钮/链接等有文本的
    const text = (el.textContent || '').trim().slice(0, 40);
    if (text.length >= 1 && text.length < 40) {
      const isLinkOrBtn = tag === 'a' || tag === 'button' || tag === 'input' && (el.getAttribute('type') === 'submit' || el.getAttribute('type') === 'button');
      if (isLinkOrBtn) {
        results.push({ type: 'getByText', selector: `page.getByText('${text.replace(/'/g, "\\'")}', { exact: true })`, unique: false, count: -1, targetHit: false });
      }
    }

    // 3) getByPlaceholder
    const ph = el.getAttribute('placeholder');
    if (ph) {
      results.push({ type: 'getByPlaceholder', selector: `page.getByPlaceholder('${ph.replace(/'/g, "\\'")}')`, unique: false, count: -1, targetHit: false });
    }

    // 4) getByLabel
    const ariaLabel2 = el.getAttribute('aria-label');
    if (ariaLabel2) {
      results.push({ type: 'getByLabel', selector: `page.getByLabel('${ariaLabel2.replace(/'/g, "\\'")}')`, unique: false, count: -1, targetHit: false });
    }

    // 5) getByTestId
    for (const attr of ['data-testid', 'data-test', 'data-cy', 'data-qa']) {
      const v = el.getAttribute(attr);
      if (v) {
        results.push({ type: 'getByTestId', selector: `page.getByTestId('${v.replace(/'/g, "\\'")}')`, unique: true, count: 1, targetHit: true });
        break;
      }
    }

    // 6) page.locator(css=...) - 基于已生成的 CSS
    if (cssResult && cssResult.selector) {
      results.push({ type: 'page.locator(css)', selector: `page.locator('${cssResult.selector.replace(/'/g, "\\'")}')`, unique: cssResult.unique, count: cssResult.count, targetHit: cssResult.targetHit });
    }

    // 7) page.locator(xpath=...) - 基于已生成的 XPath
    if (xpathResult && xpathResult.selector) {
      results.push({ type: 'page.locator(xpath)', selector: `page.locator('${xpathResult.selector}')`, unique: xpathResult.unique, count: xpathResult.count, targetHit: xpathResult.targetHit });
    }

    return results;
  }

  // ========== 一键生成所有 ==========
  function generateAllSelectors(el) {
    const css = genCss(el);
    const xpath = genXPath(el);
    const playwright = genPlaywright(el, css, xpath);

    // 元素基础信息
    const info = {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: el.className || '',
      text: (el.textContent || '').trim().slice(0, 60),
      attrs: {},
      rect: (() => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })()
    };
    // 采集关键属性
    for (const a of ['role', 'aria-label', 'name', 'placeholder', 'type', 'value', 'href', 'src']) {
      const v = el.getAttribute(a);
      if (v) info.attrs[a] = v;
    }

    return {
      url: location.href,
      info,
      css,
      xpath,
      playwright,
      timestamp: Date.now()
    };
  }

  // ========== 监听 sidepanel 请求 ==========
  // 注意：页面进入 bfcache 后 sendResponse 通道会断开，必须 try/catch 防止 Unchecked runtime.lastError
  function safeSendResponse(sendResponse, data) {
    try { sendResponse(data); } catch {}
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'selector-gen:activate-picker') {
      if (window.__myna_snapshot_picker_active__) {
        window.__myna_snapshot_picker_active__ = false;
      }
      activatePicker();
      safeSendResponse(sendResponse, { ok: true });
      return;
    }

    if (msg.type === 'selector-gen:deactivate-picker') {
      deactivatePicker();
      safeSendResponse(sendResponse, { ok: true });
      return;
    }

    // sidepanel 传入 CSS/XPath，回传校验结果
    if (msg.type === 'selector-gen:validate') {
      const { selector, selectorType } = msg;
      if (selectorType === 'xpath') {
        const r = countTargetXPath(selector, document);
        safeSendResponse(sendResponse, { ok: true, count: r.count, targetHit: r.targetHit });
      } else {
        const r = countTargetCss(selector, document.body);
        safeSendResponse(sendResponse, { ok: true, count: r.count, targetHit: r.targetHit });
      }
      return true;
    }
  });

  // bfcache 恢复时重新注册监听器（port 可能已断）
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
        if (!msg || !msg.type) return;
        if (msg.type === 'selector-gen:activate-picker') { activatePicker(); safeSendResponse(sendResponse, { ok: true }); return; }
        if (msg.type === 'selector-gen:deactivate-picker') { deactivatePicker(); safeSendResponse(sendResponse, { ok: true }); return; }
        if (msg.type === 'selector-gen:validate') {
          const { selector, selectorType } = msg;
          const r = selectorType === 'xpath' ? countTargetXPath(selector, document) : countTargetCss(selector, document.body);
          safeSendResponse(sendResponse, { ok: true, count: r.count, targetHit: r.targetHit });
          return true;
        }
      });
    }
  });
})();

// content/color-picker.js — ISOLATED world, http/https only
// 取色器：移动预览 · 左键拾取 · 支持图片像素 / disabled 元素 / 祖先穿透
(function () {
  const COLOR_FLAG = '__myna_color_active__';
  let active = false;

  function h(tag, style, parent, html) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function rgbToHex(r, g, b) {
    const c = x => x.toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
  }

  // ============ 覆盖层 DOM ============
  let rootEl = null, tipEl = null, infoEl = null;

  const handlers = {
    mousemove: (e) => {
      const c = sampleColor(e.clientX, e.clientY);
      if (c) showInfo(`HEX ${c.hex} · RGB(${c.r},${c.g},${c.b}) · HSL(${c.hsl})`, e.clientX + 14, e.clientY + 14);
      else showInfo(`(无法识别此位置颜色)`, e.clientX + 14, e.clientY + 14);
    },
    mousedown: (e) => {
      const c = sampleColor(e.clientX, e.clientY);
      if (c) {
        chrome.runtime.sendMessage({ type: 'myna_color_picked', color: c });
        const dot = h('div', `position:fixed;left:${e.clientX}px;top:${e.clientY}px;width:18px;height:18px;
          border-radius:50%;background:${c.hex};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);
          pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);`, document.body);
        setTimeout(() => dot.remove(), 700);
      }
    },
    dblclick: () => deactivateFromUser(),
    keydown: (e) => { if (e.key === 'Escape') deactivateFromUser(); }
  };

  function deactivateFromUser() {
    chrome.runtime.sendMessage({ type: 'myna_color_deactivated' });
    destroy();
    window[COLOR_FLAG] = false;
  }

  function showInfo(text, x, y) {
    infoEl.style.left = `${x}px`;
    infoEl.style.top = `${y}px`;
    infoEl.style.display = 'block';
    infoEl.textContent = text;
    requestAnimationFrame(() => {
      const r = infoEl.getBoundingClientRect();
      if (r.right > window.innerWidth - 8) infoEl.style.left = `${x - r.width - 24}px`;
      if (r.bottom > window.innerHeight - 8) infoEl.style.top = `${y - r.height - 8}px`;
    });
  }

  function destroy() {
    active = false;
    document.body.style.cursor = '';
    ['mousemove', 'mousedown', 'dblclick', 'keydown'].forEach(ev => {
      document.removeEventListener(ev, handlers[ev], true);
    });
    // 🔑 关键：必须显式 .remove()，因为这些元素是直接挂在 document.body 上的
    if (rootEl) { rootEl.remove(); rootEl = null; }
    if (tipEl)  { tipEl.remove();  tipEl = null; }
    if (infoEl) { infoEl.remove(); infoEl = null; }
  }

  function activateColor() {
    destroy();
    active = true;
    window[COLOR_FLAG] = true;
    document.body.style.cursor = 'crosshair';
    // 覆盖层容器（pointer-events:none 才能让 elementFromPoint 穿透到页面元素）
    rootEl = h('div', `position:fixed;inset:0;z-index:2147483646;pointer-events:none;`, document.body);
    tipEl = h('div', `position:fixed;top:10px;left:50%;transform:translateX(-50%);pointer-events:none;
      background:#1a1a1a;color:#fff;padding:6px 14px;border-radius:6px;font-size:13px;
      z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:-apple-system,sans-serif;`,
      document.body, '🎨 取色器：移动预览 · 左键拾取复制 · Esc/双击退出');
    infoEl = h('div', `position:fixed;pointer-events:none;background:#1a1a1a;color:#fff;padding:4px 8px;
      border-radius:4px;font-size:12px;font-family:-apple-system,sans-serif;white-space:nowrap;
      z-index:2147483647;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:none;`, document.body);
    ['mousemove', 'mousedown', 'dblclick', 'keydown'].forEach(ev => {
      document.addEventListener(ev, handlers[ev], true);
    });
  }

  // ============ 取色核心 ============
  const _imgCache = new Map();

  function sampleColor(x, y) {
    const topEl = document.elementFromPoint(x, y);
    if (!topEl) {
      // elementFromPoint 返回 null（极少数情况：canvas 等）→ 直接从 body 开始找
      const bodyCs = getComputedStyle(document.body);
      return tryCSSColor(bodyCs, x, y, document.body);
    }

    // 1) 先尝试图片像素采样（<img> / background-image）
    let c = tryImagePixel(topEl, x, y);
    if (c) return c;

    // 2) 从目标元素向上遍历祖先链
    //    找到第一个有实色（backgroundColor / color / border / outline / fill / stroke）的元素
    //    这样 disabled 按钮背景透明时，会穿透到父容器
    let el = topEl;
    let maxDepth = 20; // 防止死循环
    while (el && el.nodeType === 1 && maxDepth-- > 0) {
      const cs = getComputedStyle(el);
      c = tryCSSColor(cs, x, y, el);
      if (c) return c;
      // 顺便看看祖先有没有 background-image
      const bgImg = cs.backgroundImage;
      if (bgImg && bgImg !== 'none' && bgImg.startsWith('url(')) {
        const url = bgImg.match(/url\(["']?(.*?)["']?\)/)?.[1];
        if (url) {
          const ic = sampleBgPixel(el, url, x, y);
          if (ic) return ic;
        }
      }
      if (el === document.body) break;
      el = el.parentElement;
    }

    // 3) 最后兜底：body 自己，用 tryCSSColor（会检查全部属性）
    const bodyCs = getComputedStyle(document.body);
    return tryCSSColor(bodyCs, x, y, document.body);
  }

  function tryImagePixel(el, x, y) {
    // <img> 元素
    if (el.tagName === 'IMG') {
      const c = sampleImgPixel(el, x, y);
      if (c) return c;
    }
    // background-image
    const cs = getComputedStyle(el);
    const bgImg = cs.backgroundImage;
    if (bgImg && bgImg !== 'none' && bgImg.startsWith('url(')) {
      const url = bgImg.match(/url\(["']?(.*?)["']?\)/)?.[1];
      if (url) {
        const c = sampleBgPixel(el, url, x, y);
        if (c) return c;
      }
    }
    return null;
  }

  function tryCSSColor(cs, x, y, el) {
    // 跳过完全透明
    const isTransparent = v => !v || v === 'transparent' || v.startsWith('transparent') || v === 'rgba(0, 0, 0, 0)' || v === 'rgba(0,0,0,0)';

    // 1) 优先取 backgroundColor（大面积）
    if (!isTransparent(cs.backgroundColor)) return parseCSSColor(cs.backgroundColor);
    // 2) color（文字 / 边框 / disabled）
    if (!isTransparent(cs.color)) return parseCSSColor(cs.color);
    // 3) border-color（很多 disabled 按钮通过 border + box-shadow 表现）
    //    border-top/bottom/left/right 可能颜色不同，统一取 border-color
    if (!isTransparent(cs.borderTopColor)) return parseCSSColor(cs.borderTopColor);
    // 4) outline-color（outline 替代 border 的情况）
    if (!isTransparent(cs.outlineColor)) return parseCSSColor(cs.outlineColor);
    // 5) caret-color（input/textarea 光标颜色）
    if (!isTransparent(cs.caretColor)) return parseCSSColor(cs.caretColor);
    // 6) fill / stroke（SVG 元素：path, rect, circle）
    if (!isTransparent(cs.fill)) return parseCSSColor(cs.fill);
    if (!isTransparent(cs.stroke)) return parseCSSColor(cs.stroke);
    return null; // 这个元素完全没实色，继续往上
  }

  // ===== 图片像素采样 =====
  function sampleImgPixel(imgEl, x, y) {
    try {
      const r = imgEl.getBoundingClientRect();
      const localX = Math.round(x - r.left), localY = Math.round(y - r.top);
      const imgW = imgEl.naturalWidth || imgEl.width;
      const imgH = imgEl.naturalHeight || imgEl.height;
      if (!imgW || !imgH) return null;
      const px = Math.round(localX * imgW / r.width);
      const py = Math.round(localY * imgH / r.height);
      if (px < 0 || py < 0 || px >= imgW || py >= imgH) return null;
      const img = getCachedImage(imgEl.currentSrc || imgEl.src);
      if (!img || !img.complete) return null;
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, -px, -py, imgW, imgH);
      const [rr, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a < 10) return null;
      const hex = rgbToHex(rr, g, b), hsl = rgbToHsl(rr, g, b);
      return { r: rr, g, b, a: a / 255, hex, hsl, css: `rgba(${rr},${g},${b},${a/255})` };
    } catch { return null; }
  }

  function sampleBgPixel(el, url, x, y) {
    try {
      const r = el.getBoundingClientRect();
      const localX = Math.round(x - r.left), localY = Math.round(y - r.top);
      const img = getCachedImage(url);
      if (!img || !img.complete) return null;
      const elW = r.width, elH = r.height;
      const ratio = Math.max(elW / img.naturalWidth, elH / img.naturalHeight);
      const dx = (elW - img.naturalWidth * ratio) / 2;
      const dy = (elH - img.naturalHeight * ratio) / 2;
      const sx = Math.round((localX - dx) / ratio);
      const sy = Math.round((localY - dy) / ratio);
      if (sx < 0 || sy < 0 || sx >= img.naturalWidth || sy >= img.naturalHeight) return null;
      const c = document.createElement('canvas');
      c.width = 1; c.height = 1;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, sx, sy, 1, 1, 0, 0, 1, 1);
      const [rr, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a < 10) return null;
      const hex = rgbToHex(rr, g, b), hsl = rgbToHsl(rr, g, b);
      return { r: rr, g, b, a: a / 255, hex, hsl, css: `rgba(${rr},${g},${b},${a/255})` };
    } catch { return null; }
  }

  function getCachedImage(src) {
    if (!src) return null;
    if (_imgCache.has(src)) return _imgCache.get(src);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    _imgCache.set(src, img);
    return img;
  }

  function parseCSSColor(css) {
    if (!css || css === 'transparent' || css.startsWith('transparent')) return null;
    const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      const r = +m[1], g = +m[2], b = +m[3], a = m[4] !== undefined ? +m[4] : 1;
      const hex = rgbToHex(r, g, b), hsl = rgbToHsl(r, g, b);
      return { r, g, b, a, hex, hsl, css };
    }
    const tmp = h('div', `color:${css};position:absolute;left:-9999px;`, document.body);
    const c = getComputedStyle(tmp).color;
    tmp.remove();
    const m2 = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m2) {
      const r = +m2[1], g = +m2[2], b = +m2[3], a = m2[4] !== undefined ? +m2[4] : 1;
      const hex = rgbToHex(r, g, b), hsl = rgbToHsl(r, g, b);
      return { r, g, b, a, hex, hsl, css: c };
    }
    return null;
  }

  // ============ 消息监听 ============
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ping') { sendResponse({ ok: true, active }); return false; }
    if (msg.type === 'myna_color_activate') { activateColor(); sendResponse({ ok: true }); return false; }
    if (msg.type === 'myna_color_deactivate' || msg.type === 'myna_ruler_deactivate') {
      destroy(); window[COLOR_FLAG] = false; sendResponse({ ok: true }); return false;
    }
    // 不认识的消息：直接 sendResponse({ ok: false }) 或忽略，绝对不能 return true
    // 否则会触发 "A listener indicated async response but channel closed" 错误
    return false;
  });
})();

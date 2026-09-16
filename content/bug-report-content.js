// bug-report-content.js —— 全屏截图覆盖层（框选 + Canvas 标注 + 环境信息收集）
(function () {
  if (window.__bt_inited__) return;
  window.__bt_inited__ = true;

  const CSS = `
    #__bt_overlay__ {
      position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
      width: 100vw !important; height: 100vh !important;
      background: rgba(0,0,0,0.55) !important; z-index: 2147483646 !important;
      cursor: crosshair;
    }
    #__bt_canvas__ {
      position: absolute; top: 0; left: 0; background: transparent;
      pointer-events: auto;
    }
    #__bt_selection__ {
      position: absolute; border: 2px dashed #00C7BE;
      background: rgba(0,199,190,0.1);
      pointer-events: none; display: none;
    }
    #__bt_toolbar__ {
      position: fixed !important; top: 12px !important; left: 50% !important; transform: translateX(-50%) !important;
      display: flex !important; gap: 2px; padding: 6px 8px;
      background: #1F2937; border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 2147483647 !important;
      font-family: -apple-system, "PingFang SC", sans-serif;
      flex-wrap: nowrap; white-space: nowrap;
      max-width: calc(100vw - 24px);
      overflow-x: auto; overflow-y: hidden;
      scrollbar-width: thin;
      border: 1px solid rgba(255,255,255,0.08);
      visibility: visible !important; opacity: 1 !important;
    }
    #__bt_toolbar__::-webkit-scrollbar { height: 3px; }
    #__bt_toolbar__::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
    #__bt_toolbar__ button {
      padding: 4px 8px; border: none; border-radius: 5px;
      background: transparent; color: #e5e7eb; font-size: 12px; cursor: pointer;
      flex-shrink: 0; white-space: nowrap;
      line-height: 1.4;
      transition: background 0.12s;
    }
    #__bt_toolbar__ button:hover { background: rgba(255,255,255,0.1); color: #fff; }
    #__bt_toolbar__ button.active { background: #0A84FF; color: #fff; }
    #__bt_toolbar__ .sep { flex-shrink: 0; width: 1px; background: rgba(255,255,255,0.12); margin: 2px 3px; }
    #__bt_toolbar__ label { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #9ca3af; margin-right: 2px; flex-shrink: 0; white-space: nowrap; }
    #__bt_toolbar__ input[type="color"] { width: 18px; height: 18px; border: none; background: transparent; cursor: pointer; padding: 0; }
    #__bt_toolbar__ input[type="range"] { width: 50px; }
    #__bt_toolbar__ .swatches {
      display: flex; gap: 3px; align-items: center; padding: 0 2px;
    }
    #__bt_toolbar__ .swatch {
      width: 16px; height: 16px; border-radius: 4px; border: 2px solid transparent;
      cursor: pointer; flex-shrink: 0; transition: transform 0.1s;
    }
    #__bt_toolbar__ .swatch:hover { transform: scale(1.15); }
    #__bt_toolbar__ .swatch.active { border-color: #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.5); }
    #__bt_bottom__ {
      position: absolute; left: 0;
      display: flex; gap: 8px; align-items: center;
      padding: 8px 14px; background: #1F2937;
      border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); z-index: 2147483647;
      font-family: -apple-system, "PingFang SC", sans-serif; font-size: 12px; color: #e5e7eb;
      flex-shrink: 0; white-space: nowrap;
      margin-top: 8px; border: 1px solid rgba(255,255,255,0.08);
    }
    #__bt_bottom__ .__bt_btn__ {
      padding: 6px 14px; border: none; border-radius: 5px;
      background: #30D158; color: #fff; font-size: 12px; cursor: pointer; font-weight: 500;
      flex-shrink: 0; white-space: nowrap;
      transition: background 0.12s;
    }
    #__bt_bottom__ .__bt_btn__:hover { background: #28A745; }
    #__bt_bottom__ .__bt_btn_danger__ { background: #FF3B30; }
    #__bt_bottom__ .__bt_btn_danger__:hover { background: #D70015; }
    #__bt_bottom__ .__bt_btn_blue__ { background: #0A84FF; }
    #__bt_bottom__ .__bt_btn_blue__:hover { background: #0060DF; }
    #__bt_bottom__ .__bt_btn_outline__ { background: transparent; border: 1px solid rgba(255,255,255,0.25); color: #d1d5db; }
    #__bt_bottom__ .__bt_btn_outline__:hover { background: rgba(255,255,255,0.08); color: #fff; }
    #__bt_text_input__ {
      position: absolute; border: 2px solid #30D158;
      background: rgba(255,255,255,0.96); padding: 4px 6px;
      font-size: 14px; font-family: -apple-system, sans-serif;
      z-index: 2147483647; outline: none; min-width: 60px;
      border-radius: 4px;
    }
    #__bt_preview__ {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      max-width: 80vw; max-height: 70vh; background: #fff; border-radius: 10px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.4); z-index: 2147483647; padding: 12px;
    }
    #__bt_preview__ img { max-width: 100%; max-height: calc(70vh - 40px); }
    #__bt_preview__ .close {
      position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%;
      background: #FF3B30; color: #fff; border: none; cursor: pointer;
    }
  `;

  // 预设颜色（Apple 系统色系，在任何背景都醒目）
  const SWATCHES = ['#FF3B30', '#FF9500', '#FFCC00', '#30D158', '#0A84FF', '#BF5AF2', '#FFFFFF', '#000000'];

  const state = {
    tool: 'select', color: '#FF3B30', stroke: 3, shapes: [], current: null,
    rect: null, dpr: window.devicePixelRatio || 1, dragging: false, dragStart: null,
    imgEl: null, finished: false, annotateCanvas: null
  };

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === 'bug-report:start') {
      sendResponse({ ok: true });
      startFlow();
    }
    if (msg?.type === 'bug-report:get-env') {
      sendResponse({ ok: true, env: collectEnv() });
    }
  });

  async function startFlow() {
    if (state.finished) return;
    state.finished = true; // 防止重入
    try {
      const rect = await captureSelection();
      if (!rect) { state.finished = false; return; }
      state.rect = rect;

      const img = await doScreenshot(rect);
      if (!img) { state.finished = false; return; }
      state.imgEl = img;

      showAnnotator();
    } catch (e) {
      console.error('[bug-report] startFlow error:', e);
      alert('截图流程出错: ' + e.message);
      state.finished = false;
    }
  }

  function collectEnv() {
    return {
      url: location.href,
      hostname: location.hostname,
      title: document.title,
      userAgent: navigator.userAgent,
      cookieCount: (document.cookie || '').split(';').filter(c => c.trim()).length,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      platform: navigator.platform || '未知',
      language: navigator.language,
      timestamp: new Date().toISOString()
    };
  }

  async function doScreenshot(region) {
    // 1. 请求 background 捕获完整可视区域
    const resp = await new Promise(res => {
      chrome.runtime.sendMessage({ type: 'bug-report:capture' }, (r) => {
        if (chrome.runtime.lastError) { res(null); return; }
        res(r);
      });
    });
    if (!resp?.ok) {
      alert('截图失败：' + (resp?.error || '未知错误\n可能原因：1) background 未响应 2) captureVisibleTab 被限流'));
      return null;
    }
    // 2. 在 content script（有 DOM）里裁剪
    const dpr = window.devicePixelRatio || 1;
    const img = await loadImg(resp.dataUrl);
    if (!img) { alert('截图加载失败'); return null; }
    // captureVisibleTab 返回设备像素，region 是 CSS 像素
    const sx = region.x * dpr, sy = region.y * dpr;
    const sw = region.w * dpr, sh = region.h * dpr;
    // 3. 裁剪为新 dataURL（给标注 canvas 用）
    const canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    const c = canvas.getContext('2d');
    c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const croppedUrl = canvas.toDataURL('image/png');
    // 4. 再 load 一次作为标注底图
    const annotatedImg = await loadImg(croppedUrl);
    if (!annotatedImg) { alert('截图裁剪失败'); return null; }
    return annotatedImg;
  }

  function loadImg(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  function captureSelection() {
    return new Promise((resolve) => {
      const style = document.createElement('style');
      style.textContent = CSS;
      document.documentElement.appendChild(style);

      const overlay = document.createElement('div');
      overlay.id = '__bt_overlay__';
      document.documentElement.appendChild(overlay);

      const sel = document.createElement('div');
      sel.id = '__bt_selection__';
      document.documentElement.appendChild(sel);

      // bottom 放到 overlay 里，用 absolute 跟随选区
      const bottom = document.createElement('div');
      bottom.id = '__bt_bottom__';
      bottom.style.display = 'none';
      bottom.innerHTML = `
        <button class="__bt_btn__ __bt_btn_danger__" data-act="cancel">✕ 取消</button>
        <button class="__bt_btn__" data-act="confirm">✓ 确认截图</button>
      `;
      bottom.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
        cleanup(); b.dataset.act === 'cancel' ? resolve(null) : (state.rect ? resolve(state.rect) : resolve(null));
      }));
      overlay.appendChild(bottom);

      function updateBottom() {
        if (!state.rect) { bottom.style.display = 'none'; return; }
        const r = state.rect;
        const bw = bottom.offsetWidth || 200;
        let left = r.x;
        // 如果按钮右侧超出视口，向左对齐到视口边缘
        if (left + bw > window.innerWidth - 8) {
          left = window.innerWidth - bw - 8;
          if (left < 8) left = 8;
        }
        let top = r.y + r.h + 8;
        // 如果按钮下方超出视口，放到选区上方
        const bh = bottom.offsetHeight || 40;
        if (top + bh > window.innerHeight - 8) {
          top = r.y - bh - 8;
          if (top < 8) top = r.y + r.h + 8; // 实在不够还是放下面
        }
        bottom.style.left = left + 'px';
        bottom.style.top = top + 'px';
        bottom.style.display = 'flex';
      }

      function cleanup() { overlay?.remove(); sel?.remove(); style?.remove(); state.dragging = false; }

      overlay.addEventListener('mousedown', (e) => {
        if (e.target !== overlay) return; // 点击 bottom 按钮时不触发选区
        state.dragging = true; state.dragStart = { x: e.clientX, y: e.clientY }; state.rect = null;
        sel.style.display = 'none'; bottom.style.display = 'none';
      });
      overlay.addEventListener('mousemove', (e) => {
        if (!state.dragging) return;
        const { x: sx, y: sy } = state.dragStart;
        const x = Math.min(e.clientX, sx), y = Math.min(e.clientY, sy);
        const w = Math.abs(e.clientX - sx), h = Math.abs(e.clientY - sy);
        state.rect = { x, y, w, h };
        sel.style.cssText = `display:block;left:${x}px;top:${y}px;width:${w}px;height:${h}px;position:absolute;border:2px dashed #00C7BE;background:rgba(0,199,190,0.1);pointer-events:none;`;
        updateBottom();
      });
      overlay.addEventListener('mouseup', () => { state.dragging = false; updateBottom(); });

      document.addEventListener('keydown', onKey);
      function onKey(e) {
        if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', onKey); resolve(null); }
        else if (e.key === 'Enter' && state.rect) {
          if (state.rect.w < 3 || state.rect.h < 3) { alert('请框选有效区域'); return; }
          cleanup(); document.removeEventListener('keydown', onKey); resolve(state.rect);
        }
      }
    });
  }

  function showAnnotator() {
    try {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.documentElement.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = '__bt_overlay__';
    overlay.style.cssText = 'background:transparent !important;';
    document.documentElement.appendChild(overlay);

    const canvas = document.createElement('canvas');
    canvas.id = '__bt_canvas__';
    const cssW = state.rect.w, cssH = state.rect.h;
    canvas.width = Math.max(1, Math.floor(cssW * state.dpr));
    canvas.height = Math.max(1, Math.floor(cssH * state.dpr));
    canvas.style.cssText = `position:absolute;left:${state.rect.x}px;top:${state.rect.y}px;width:${cssW}px;height:${cssH}px;background:transparent;pointer-events:auto;border:1px solid rgba(0,0,0,0.35);box-shadow:0 2px 12px rgba(0,0,0,0.25);`;
    const ctx = canvas.getContext('2d');
    ctx.scale(state.dpr, state.dpr);
    state.annotateCanvas = canvas;
    ctx.drawImage(state.imgEl, 0, 0, state.imgEl.naturalWidth, state.imgEl.naturalHeight, 0, 0, cssW, cssH);
    overlay.appendChild(canvas);

    const toolbar = document.createElement('div');
    toolbar.id = '__bt_toolbar__';
    // 内联样式作为最终防线，防止页面 CSS 覆盖
    toolbar.style.cssText = `position:fixed !important;top:12px !important;left:50% !important;transform:translateX(-50%) !important;display:flex !important;gap:2px;padding:6px 8px;background:#1F2937;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:2147483647 !important;font-family:-apple-system,"PingFang SC",sans-serif;flex-wrap:nowrap;white-space:nowrap;max-width:calc(100vw - 24px);overflow-x:auto;overflow-y:hidden;border:1px solid rgba(255,255,255,0.08);visibility:visible !important;opacity:1 !important;`;
    toolbar.innerHTML = `
      <button data-tool="select" class="active">✋ 选择</button>
      <button data-tool="rect">▭ 矩形</button>
      <button data-tool="arrow">➤ 箭头</button>
      <button data-tool="text">T 文字</button>
      <button data-tool="pixelate">▩ 马赛克</button>
      <div class="sep"></div>
      <div class="swatches">
        ${SWATCHES.map(c => `<button class="swatch" data-color="${c}" style="background:${c};${c === '#FF3B30' ? 'border-color:#fff;box-shadow:0 0 0 1px rgba(0,0,0,0.5);' : ''}"></button>`).join('')}
      </div>
      <div class="sep"></div>
      <label>粗细 <input type="range" min="1" max="10" value="${state.stroke}" id="__bt_stroke__"></label>
      <div class="sep"></div>
      <button data-act="undo">↶</button>
      <button data-act="clear">🗑</button>
    `;
    document.documentElement.appendChild(toolbar);

    const bottom = document.createElement('div');
    bottom.id = '__bt_bottom__';
    bottom.innerHTML = `
      <span style="white-space:nowrap">🎨 标注模式 · 共 0 处</span>
      <button class="__bt_btn__ __bt_btn_outline__" data-act="cancel">放弃</button>
      <button class="__bt_btn__ __bt_btn_blue__" data-act="confirm-annotate">✓ 确认标注</button>
      <button class="__bt_btn__" data-act="copy">复制</button>
      <button class="__bt_btn__ __bt_btn_blue__" data-act="download">下载</button>
      <button class="__bt_btn__ __bt_btn_outline__" data-act="preview">预览</button>
    `;
    document.documentElement.appendChild(bottom);
    const r = state.rect;
    bottom.style.left = r.x + 'px';
    bottom.style.top = (r.y + r.h + 8) + 'px';

    toolbar.addEventListener('click', (e) => {
      const t = e.target.dataset.tool, a = e.target.dataset.act;
      if (t) {
        state.tool = t;
        toolbar.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b === e.target));
        canvas.style.cursor = t === 'text' ? 'text' : (t === 'pixelate' ? 'cell' : 'crosshair');
      } else if (e.target.classList.contains('swatch')) {
        state.color = e.target.dataset.color;
        toolbar.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === e.target));
      } else if (a === 'undo') { state.shapes.pop(); redraw(); updateCount(); }
      else if (a === 'clear') { state.shapes = []; redraw(); updateCount(); }
    });
    toolbar.querySelector('#__bt_stroke__').addEventListener('input', (e) => state.stroke = Number(e.target.value));

    bottom.addEventListener('click', async (e) => {
      const a = e.target.dataset.act;
      if (!a) return;
      if (a === 'cancel') { cleanupAll(); return; }
      if (a === 'confirm-annotate') {
        const dataUrl = canvas.toDataURL('image/png');
        chrome.storage.local.set({ bugReportScreenshot: dataUrl }, () => {
          flash('✅ 截图已保存，可返回侧边栏生成模板', 2500);
          // 确保 storage 写入完成后再通知 sidepanel 刷新
          chrome.runtime.sendMessage({ type: 'bug-report:screenshot-ready' });
        });
        cleanupAll();
        return;
      }
      if (a === 'preview') {
        const prev = document.createElement('div'); prev.id = '__bt_preview__';
        const close = document.createElement('button'); close.className = 'close'; close.textContent = '✕'; close.onclick = () => prev.remove();
        const img = document.createElement('img'); img.src = canvas.toDataURL('image/png');
        prev.appendChild(close); prev.appendChild(img); document.documentElement.appendChild(prev);
        return;
      }
      if (a === 'download') {
        const a2 = document.createElement('a'); a2.href = canvas.toDataURL('image/png');
        a2.download = `bug-report-${Date.now()}.png`; a2.click(); return;
      }
      if (a === 'copy') {
        try {
          const blob = await new Promise(r => canvas.toBlob(r));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          flash('✅ 图片已复制', 1500);
        } catch (err) { flash('复制失败：' + err.message, 2000); }
      }
    });

    let drawing = false, lastPt = null;
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (state.tool === 'select') return;
      if (state.tool === 'text') { addTextAt(pt); return; }
      drawing = true;
      state.current = { type: state.tool, color: state.color, stroke: state.stroke, points: state.tool === 'rect' || state.tool === 'arrow' ? [pt, pt] : [pt] };
      lastPt = pt;
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!drawing || !state.current) return;
      const r = canvas.getBoundingClientRect();
      const pt = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (state.tool === 'rect' || state.tool === 'arrow') state.current.points[1] = pt;
      else if (state.tool === 'pixelate') {
        const pts = state.current.points;
        if (Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y) > 2) { pts.push(pt); lastPt = pt; }
      }
      redraw(); drawCurrent();
    });
    canvas.addEventListener('mouseup', () => {
      if (!drawing || !state.current) return;
      drawing = false;
      const s = state.current;
      if (state.tool === 'pixelate') {
        const pts = s.points;
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        s.x = Math.min(...xs); s.y = Math.min(...ys);
        s.w = Math.max(...xs) - s.x; s.h = Math.max(...ys) - s.y; s.points = null;
      }
      if (s.type === 'rect' || s.type === 'arrow') {
        const dx = Math.abs(s.points[1].x - s.points[0].x), dy = Math.abs(s.points[1].y - s.points[0].y);
        if (dx < 3 && dy < 3) { state.current = null; redraw(); return; }
      }
      state.shapes.push(s); state.current = null; redraw(); updateCount();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cleanupAll();
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { state.shapes.pop(); redraw(); updateCount(); }
    });

    function updateCount() {
      bottom.querySelector('span').textContent = `🎨 标注模式 · 共 ${state.shapes.length} 处`;
    }

    function redraw() {
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(state.imgEl, 0, 0, state.imgEl.naturalWidth, state.imgEl.naturalHeight, 0, 0, cssW, cssH);
      state.shapes.forEach(drawShape);
    }
    function drawCurrent() { state.current && drawShape(state.current); }

    function drawShape(s) {
      ctx.save();
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color;
      ctx.lineWidth = s.stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.type === 'rect') {
        const [a, b] = s.points; ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      } else if (s.type === 'arrow') {
        drawArrow(ctx, s.points[0], s.points[1], s.color, s.stroke);
      } else if (s.type === 'text') {
        ctx.font = `bold ${Math.max(14, s.stroke * 5)}px -apple-system, "PingFang SC", sans-serif`;
        ctx.fillStyle = s.color; ctx.fillText(s.text || '[文字]', s.x, s.y);
      } else if (s.type === 'pixelate') {
        const block = 8, { x, y, w, h } = s;
        const sc = document.createElement('canvas');
        sc.width = Math.max(1, Math.floor(w)); sc.height = Math.max(1, Math.floor(h));
        const sctx = sc.getContext('2d');
        sctx.drawImage(state.imgEl, x, y, w, h, 0, 0, sc.width, sc.height);
        const sm = document.createElement('canvas');
        sm.width = Math.max(1, Math.floor(w / block)); sm.height = Math.max(1, Math.floor(h / block));
        const lctx = sm.getContext('2d');
        lctx.imageSmoothingEnabled = true;
        lctx.drawImage(sc, 0, 0, sm.width, sm.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sm, 0, 0, sm.width, sm.height, x, y, w, h);
        ctx.imageSmoothingEnabled = true;
      }
      ctx.restore();
    }

    function addTextAt(pt) {
      // pt 是 canvas 内相对坐标，要转成 documentElement 上的绝对坐标
      const rect = canvas.getBoundingClientRect();
      const absX = rect.left + pt.x;
      const absY = rect.top + pt.y;
      const input = document.createElement('textarea');
      input.id = '__bt_text_input__';
      input.style.left = absX + 'px';
      input.style.top = absY + 'px';
      input.placeholder = '输入文字...'; input.rows = 1;
      document.documentElement.appendChild(input);
      // 选中所有已有占位（如果有），让用户直接输入
      setTimeout(() => { input.focus(); input.select(); }, 0);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') input.remove();
      });
      input.addEventListener('blur', commit);
      function commit() {
        const txt = input.value.trim(); input.remove();
        if (!txt) return;
        state.shapes.push({ type: 'text', color: state.color, stroke: state.stroke, text: txt, x: pt.x, y: pt.y });
        redraw(); updateCount();
      }
    }
    } catch (e) {
      console.error('[bug-report] showAnnotator error:', e);
      alert('标注模式启动失败: ' + e.message + '\n\n请将此信息反馈给开发者');
    }
  }

  function drawArrow(ctx, a, b, color, width) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const head = width * 4;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 7), b.y - head * Math.sin(angle - Math.PI / 7));
    ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 7), b.y - head * Math.sin(angle + Math.PI / 7));
    ctx.closePath(); ctx.fill();
  }

  function flash(msg, ms = 1500) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);padding:10px 20px;background:rgba(34,197,94,0.95);color:#fff;border-radius:6px;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
    document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  function cleanupAll() {
    document.querySelectorAll('#__bt_overlay__, #__bt_canvas__, #__bt_toolbar__, #__bt_bottom__, #__bt_selection__, #__bt_preview__, #__bt_text_input__').forEach(n => n.remove());
    document.querySelectorAll('style').forEach(s => { if (s.textContent.includes('__bt_')) s.remove(); });
    Object.assign(state, { tool: 'select', color: '#FF3B30', stroke: 3, shapes: [], current: null, rect: null, dragging: false, imgEl: null, finished: false });
  }
})();

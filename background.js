// Service Worker: sidepanel 打开 + 消息中转 + 截图

const sidepanelPorts = new Set();
const recentRequests = [];
const MAX_BUFFER = 100;
let latestVitals = { lcp: null, cls: 0, inp: null };
let latestResources = null;

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    sidepanelPorts.add(port);
    port.onDisconnect.addListener(() => sidepanelPorts.delete(port));
    recentRequests.forEach((msg) => { try { port.postMessage(msg); } catch (_) {} });
    // 推送最近的 vitals / resources 缓存
    if (latestVitals && (latestVitals.lcp || latestVitals.inp || latestVitals.cls)) {
      try { port.postMessage({ type: 'perf:vitals', payload: latestVitals }); } catch (_) {}
    }
    if (latestResources) {
      try { port.postMessage({ type: 'perf:resources', payload: latestResources }); } catch (_) {}
    }
    return;
  }
  if (port.name === 'content-relay') {
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;
      // network:* 消息（已有的请求捕获）
      if (String(msg.type).startsWith('network:')) {
        if (msg.type === 'network:request') {
          recentRequests.push({ type: msg.type, payload: msg.payload });
          if (recentRequests.length > MAX_BUFFER) recentRequests.shift();
        }
        sidepanelPorts.forEach((p) => { try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {} });
        return;
      }
      // perf:* 消息（Web Vitals / ResourceTiming）
      if (String(msg.type).startsWith('perf:')) {
        if (msg.type === 'perf:vitals' && msg.payload) {
          Object.assign(latestVitals, msg.payload);
        }
        if (msg.type === 'perf:resources' && msg.payload) {
          latestResources = msg.payload;
        }
        sidepanelPorts.forEach((p) => { try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {} });
      }
    });
  }
});

// ========== 截图（content script 发起 → background capture → 回传完整 dataURL） ==========
// 裁剪由 content script 完成（它有 DOM 环境，可以用 Image/Canvas）
// ========== 链接可用性检查 ==========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  // 扫描当前页面所有 a 标签
  if (msg.type === 'link-check:scan') {
    scanLinksInTab().then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true; // 异步
  }

  // 批量校验链接可访问性
  if (msg.type === 'link-check:check') {
    checkLinks(msg.urls || [], msg.concurrency || 4).then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true; // 异步
  }

  // ========== 元素快照 ==========
  if (msg.type === 'snapshot:activate-picker') {
    // sidepanel → 转发给当前 tab 的 content script
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) { sendResponse({ ok: false, error: '无活跃标签页' }); return; }
      chrome.tabs.sendMessage(tab.id, { type: 'snapshot:activate-picker' })
        .then(() => sendResponse({ ok: true }))
        .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    });
    return true; // 异步
  }

  if (msg.type === 'snapshot:capture') {
    // 从 sidepanel 触发：传入 tabId + rect → 截图裁剪
    captureElement(msg.tabId, msg.rect, msg.viewport).then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'snapshot:picked') {
    // 从 content script 触发：元素选择完成，只回传 selector 给 sidepanel，不做截图
    const payload = { ok: true, selector: msg.selector, selectorType: msg.selectorType, cssSelector: msg.cssSelector, pageUrl: msg.url };
    sendResponse(payload);
    // 直接广播给所有扩展页面（sidepanel/options），不依赖 Port 或 storage
    try {
      chrome.runtime.sendMessage({ type: 'snapshot:picked', payload });
    } catch (_) {}
    return;
  }

  if (msg.type === 'snapshot:save-baseline') {
    saveBaseline(msg.baseline).then(sendResponse);
    return true;
  }

  if (msg.type === 'snapshot:list-baselines') {
    listBaselines().then(sendResponse);
    return true;
  }

  if (msg.type === 'snapshot:delete-baseline') {
    deleteBaseline(msg.id).then(sendResponse);
    return true;
  }

  if (msg.type === 'snapshot:compare') {
    compareWithBaseline(msg).then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'bug-report:capture') {
    captureFull(sender.tab).then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true; // 异步
  }

  // content script 确认标注后通知 sidepanel 刷新截图预览
  if (msg.type === 'bug-report:screenshot-ready') {
    sidepanelPorts.forEach((p) => {
      try { p.postMessage({ type: 'bug-report:screenshot-ready', payload: msg.payload }); } catch (_) {}
    });
    sendResponse({ ok: true });
  }

  // ======= Web Vitals：sidepanel 请求采集 =======
  if (msg.type === 'perf:collect') {
    collectPerfInTab().then(sendResponse).catch((e) => {
      sendResponse({ ok: false, error: String(e?.message || e) });
    });
    return true; // 异步
  }

  // sidepanel 请求最近的缓存值（刚打开面板时）
  if (msg.type === 'perf:get-latest') {
    sendResponse({ ok: true, vitals: latestVitals, resources: latestResources });
    return;
  }
});

async function collectPerfInTab() {
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) [tab] = await chrome.tabs.query({ active: true });
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };
  try {
    // 向 MAIN world 发送 perf:collect 消息（injected.js 会监听）
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage({ __mynatest__: true, type: 'perf:collect' }, '*');
      },
      world: 'MAIN'
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

async function scanLinksInTab() {
  // sidepanel 发消息时 sender.tab 是 undefined，需主动查询当前活跃标签页
  // Service Worker 没有 window 上下文，currentWindow: true 不可靠
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) [tab] = await chrome.tabs.query({ active: true });
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanAnchorLinks,
      world: 'MAIN'
    });
    const links = (result?.result || []);
    return { ok: true, links };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// 在页面上下文执行的扫描函数
function scanAnchorLinks() {
  const anchors = document.querySelectorAll('a[href]');
  const seen = new Set();
  const results = [];
  anchors.forEach(a => {
    let href = a.getAttribute('href') || '';
    // 跳过无效链接
    if (!href) return;
    if (/^(javascript:|mailto:|tel:|data:|#)/i.test(href.trim())) return;
    try {
      const abs = new URL(href, location.href).href;
      if (seen.has(abs)) return;
      seen.add(abs);
      // 只检查 http/https
      if (!/^https?:/i.test(abs)) return;
      results.push({
        url: abs,
        text: (a.textContent || '').trim().slice(0, 50),
        sameOrigin: new URL(abs).origin === location.origin
      });
    } catch {
      // 解析失败跳过
    }
  });
  return results;
}

// 批量校验：限流并发，HEAD 优先，405 降级 GET
async function checkLinks(urls, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx++;
      const url = urls[i];
      try {
        const result = await checkSingle(url);
        results[i] = result;
      } catch (e) {
        results[i] = { url, ok: false, error: String(e?.message || e), status: 0, duration: 0 };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);

  return { ok: true, results };
}

async function checkSingle(url) {
  const start = performance.now();
  // 方法 1: HEAD（部分服务器不支持，可能返回 405）
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', mode: 'no-cors' });
    const duration = Math.round(performance.now() - start);
    // no-cors 模式下拿不到 status（都是 0），但能区分通/不通
    if (res.type === 'opaque') {
      return { url, ok: true, status: 0, duration, redirect: false, finalUrl: url, note: '跨域受限(no-cors)' };
    }
    return { url, ok: res.ok, status: res.status, duration, redirect: res.redirected, finalUrl: res.url };
  } catch (headErr) {
    // HEAD 失败，再试 GET（同样 no-cors）
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'follow', mode: 'no-cors' });
      const duration = Math.round(performance.now() - start);
      if (res.type === 'opaque') {
        return { url, ok: true, status: 0, duration, redirect: false, finalUrl: url, note: '跨域受限(no-cors)' };
      }
      return { url, ok: res.ok, status: res.status, duration, redirect: res.redirected, finalUrl: res.url };
    } catch (getErr) {
      const duration = Math.round(performance.now() - start);
      return { url, ok: false, status: 0, duration, error: String(getErr?.message || getErr) };
    }
  }
}

async function captureFull(tab) {
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };

  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
    return { ok: true, dataUrl };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ========== 元素快照辅助函数 ==========
const SNAPSHOT_KEY = 'snapshotBaselines';

async function captureElement(tabId, rect, viewport) {
  if (!tabId) return { ok: false, error: '无标签页' };
  try {
    // captureVisibleTab 第一个参数是 windowId 而非 tabId，需先查 tab 拿到 windowId
    const tab = await chrome.tabs.get(tabId);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    // 裁剪：OffscreenCanvas 在 SW 中可用
    const cropped = await cropImageDataUrl(dataUrl, rect, viewport);
    return { ok: true, dataUrl: cropped, rect };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

async function cropImageDataUrl(dataUrl, rect, viewport) {
  // 直接解析 base64，避免 fetch(data:) 在 SW 中的兼容性问题
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error('无效的截图数据');
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: m[1] });
  const imgBitmap = await createImageBitmap(blob);

  // 设备像素比适配：captureVisibleTab 返回物理像素，rect 是 CSS 像素
  const dpr = imgBitmap.width / (viewport?.w || imgBitmap.width);
  let sx = Math.max(0, Math.floor(rect.left * dpr));
  let sy = Math.max(0, Math.floor(rect.top * dpr));
  let sw = Math.floor(rect.width * dpr);
  let sh = Math.floor(rect.height * dpr);
  // clamp 到图片边界，避免 drawImage 源矩形越界抛错
  sw = Math.max(1, Math.min(sw, imgBitmap.width - sx));
  sh = Math.max(1, Math.min(sh, imgBitmap.height - sy));

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imgBitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  imgBitmap.close();

  const outBlob = await canvas.convertToBlob({ type: 'image/png' });
  return await blobToDataUrl(outBlob);
}

async function blobToDataUrl(blob) {
  // MV3 Service Worker 中没有 FileReader，需用 arrayBuffer + btoa 转换
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000; // 分块避免 fromCharCode 栈溢出
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return 'data:' + (blob.type || 'image/png') + ';base64,' + btoa(binary);
}

async function pixelDiff(baselineDataUrl, currentDataUrl, tolerance = 30) {
  // 加载两张图
  const [bResp, cResp] = await Promise.all([fetch(baselineDataUrl), fetch(currentDataUrl)]);
  const [bBlob, cBlob] = await Promise.all([bResp.blob(), cResp.blob()]);
  const [bBitmap, cBitmap] = await Promise.all([createImageBitmap(bBlob), createImageBitmap(cBlob)]);

  // 统一到较小尺寸
  const w = Math.min(bBitmap.width, cBitmap.width);
  const h = Math.min(bBitmap.height, cBitmap.height);

  const canvasB = new OffscreenCanvas(w, h);
  const ctxB = canvasB.getContext('2d');
  ctxB.drawImage(bBitmap, 0, 0, w, h);
  const dataB = ctxB.getImageData(0, 0, w, h).data;

  const canvasC = new OffscreenCanvas(w, h);
  const ctxC = canvasC.getContext('2d');
  ctxC.drawImage(cBitmap, 0, 0, w, h);
  const dataC = ctxC.getImageData(0, 0, w, h).data;

  // 创建 diff 图（透明背景 + 红色高亮差异像素）
  const diffCanvas = new OffscreenCanvas(w, h);
  const diffCtx = diffCanvas.getContext('2d');
  diffCtx.fillStyle = 'transparent';
  diffCtx.fillRect(0, 0, w, h);
  const diffData = diffCtx.getImageData(0, 0, w, h);

  let diffCount = 0;
  for (let i = 0; i < dataB.length; i += 4) {
    const dr = Math.abs(dataB[i] - dataC[i]);
    const dg = Math.abs(dataB[i + 1] - dataC[i + 1]);
    const db = Math.abs(dataB[i + 2] - dataC[i + 2]);
    const da = Math.abs(dataB[i + 3] - dataC[i + 3]);
    const totalDiff = dr + dg + db + da;
    if (totalDiff > tolerance) {
      diffCount++;
      // 红色高亮
      diffData.data[i] = 239;
      diffData.data[i + 1] = 68;
      diffData.data[i + 2] = 68;
      diffData.data[i + 3] = 180;
    }
  }
  diffCtx.putImageData(diffData, 0, 0);

  const diffBlob = await diffCanvas.convertToBlob({ type: 'image/png' });
  const diffDataUrl = await blobToDataUrl(diffBlob);

  bBitmap.close();
  cBitmap.close();

  const totalPixels = (w * h);
  return {
    diffCount,
    diffRate: totalPixels > 0 ? diffCount / totalPixels : 0,
    width: w,
    height: h,
    diffImageUrl: diffDataUrl
  };
}

async function saveBaseline(baseline) {
  const list = await listBaselinesInternal();
  const exists = list.find(b => b.id === baseline.id);
  if (exists) Object.assign(exists, baseline, { updatedAt: Date.now() });
  else list.push({ ...baseline, id: baseline.id || ('s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), createdAt: Date.now(), updatedAt: Date.now() });
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: list });
  return { ok: true };
}

async function listBaselinesInternal() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SNAPSHOT_KEY], (r) => resolve(r[SNAPSHOT_KEY] || []));
  });
}

async function listBaselines() {
  const list = await listBaselinesInternal();
  // 不返回 dataURL（避免消息过大），只返回元信息
  return { ok: true, baselines: list.map(b => ({
    id: b.id, name: b.name, pageUrl: b.pageUrl, selector: b.selector,
    createdAt: b.createdAt, updatedAt: b.updatedAt,
    hasImage: !!b.imageUrl
  }))};
}

async function deleteBaseline(id) {
  const list = await listBaselinesInternal();
  const filtered = list.filter(b => b.id !== id);
  await chrome.storage.local.set({ [SNAPSHOT_KEY]: filtered });
  return { ok: true };
}

async function compareWithBaseline(msg) {
  const { baselineId, rect, viewport } = msg;
  const list = await listBaselinesInternal();
  const baseline = list.find(b => b.id === baselineId);
  if (!baseline) return { ok: false, error: '基线不存在' };
  if (!baseline.imageUrl) return { ok: false, error: '基线图片缺失' };

  // 截取当前元素
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };

  const capture = await captureElement(tab.id, rect, viewport);
  if (!capture.ok) return capture;

  // 像素比对
  const diff = await pixelDiff(baseline.imageUrl, capture.dataUrl);
  return { ok: true, ...diff, currentImageUrl: capture.dataUrl, baselineName: baseline.name };
}

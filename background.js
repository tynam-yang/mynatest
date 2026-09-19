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
        return;
      }
      // resource-check:* 消息（资源加载失败检测）
      if (String(msg.type).startsWith('resource-check:')) {
        sidepanelPorts.forEach((p) => { try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {} });
        return;
      }
    });
  }
});

// ========== 截图（content script 发起 → background capture → 回传完整 dataURL） ==========
// 裁剪由 content script 完成（它有 DOM 环境，可以用 Image/Canvas）
// ========== 链接可用性检查 ==========
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  const safeSend = (data) => { try { sendResponse(data); } catch {} };

  if (msg.type === 'link-check:scan') {
    scanLinksInTab().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'link-check:check') {
    checkLinks(msg.urls || [], msg.concurrency || 4).then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  // ========== 元素快照 ==========
  if (msg.type === 'snapshot:activate-picker') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) { try { sendResponse({ ok: false, error: '无活跃标签页' }); } catch {} return; }
      chrome.tabs.sendMessage(tab.id, { type: 'snapshot:activate-picker' })
        .then(() => { try { sendResponse({ ok: true }); } catch {} })
        .catch((e) => { try { sendResponse({ ok: false, error: String(e?.message || e) }); } catch {} });
    });
    return true;
  }

  // ========== 选择器生成器 ==========
  if (msg.type === 'selector-gen:activate-picker') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) { try { sendResponse({ ok: false, error: '无活跃标签页' }); } catch {} return; }
      chrome.tabs.sendMessage(tab.id, { type: 'selector-gen:activate-picker' })
        .then(() => { try { sendResponse({ ok: true }); } catch {} })
        .catch((e) => { try { sendResponse({ ok: false, error: String(e?.message || e) }); } catch {} });
    });
    return true;
  }

  if (msg.type === 'selector-gen:deactivate-picker') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) { try { sendResponse({ ok: false, error: '无活跃标签页' }); } catch {} return; }
      chrome.tabs.sendMessage(tab.id, { type: 'selector-gen:deactivate-picker' })
        .then(() => { try { sendResponse({ ok: true }); } catch {} })
        .catch((e) => { try { sendResponse({ ok: false, error: String(e?.message || e) }); } catch {} });
    });
    return true;
  }

  if (msg.type === 'selector-gen:picked') {
    sidepanelPorts.forEach((p) => {
      try { p.postMessage({ type: 'selector-gen:picked', payload: msg.payload }); } catch (_) {}
    });
    try { sendResponse({ ok: true }); } catch {}
    return;
  }

  if (msg.type === 'selector-gen:validate') {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (!tab?.id) { try { sendResponse({ ok: false, error: '无活跃标签页' }); } catch {} return; }
      chrome.tabs.sendMessage(tab.id, { type: 'selector-gen:validate', selector: msg.selector, selectorType: msg.selectorType })
        .then((r) => { try { sendResponse(r); } catch {} })
        .catch((e) => { try { sendResponse({ ok: false, error: String(e?.message || e) }); } catch {} });
    });
    return true;
  }

  if (msg.type === 'snapshot:capture') {
    captureElement(msg.tabId, msg.rect, msg.viewport).then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'snapshot:picked') {
    const payload = { ok: true, selector: msg.selector, selectorType: msg.selectorType, cssSelector: msg.cssSelector, pageUrl: msg.url };
    safeSend(payload);
    try { chrome.runtime.sendMessage({ type: 'snapshot:picked', payload }); } catch (_) {}
    return;
  }

  if (msg.type === 'snapshot:save-baseline') {
    saveBaseline(msg.baseline).then(safeSend);
    return true;
  }

  if (msg.type === 'snapshot:list-baselines') {
    listBaselines().then(safeSend);
    return true;
  }

  if (msg.type === 'snapshot:delete-baseline') {
    deleteBaseline(msg.id).then(safeSend);
    return true;
  }

  if (msg.type === 'snapshot:compare') {
    compareWithBaseline(msg).then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'bug-report:capture') {
    captureFull(sender.tab).then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'bug-report:screenshot-ready') {
    sidepanelPorts.forEach((p) => {
      try { p.postMessage({ type: 'bug-report:screenshot-ready', payload: msg.payload }); } catch (_) {}
    });
    safeSend({ ok: true });
  }

  if (msg.type === 'perf:collect') {
    collectPerfInTab().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'perf:get-latest') {
    safeSend({ ok: true, vitals: latestVitals, resources: latestResources });
    return;
  }

  // ========== 资源加载失败检查 ==========
  if (msg.type === 'resource-check:collect') {
    collectResourceFailures().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'resource-check:result') {
    // content script 回传 → 广播给 sidepanel
    sidepanelPorts.forEach((p) => {
      try { p.postMessage({ type: 'resource-check:result', payload: msg.payload }); } catch (_) {}
    });
    safeSend({ ok: true });
    return;
  }

  // ========== 截图 & 录屏 ==========
  if (msg.type === 'screen-capture:visible') {
    captureVisibleNow().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'screen-capture:fullpage') {
    captureFullPage().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'screen-capture:download') {
    downloadDataUrl(msg.dataUrl, msg.filename || 'screenshot.png');
    safeSend({ ok: true });
    return;
  }

  if (msg.type === 'screen-capture:start-recording') {
    startRecording(msg.tabId).then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  if (msg.type === 'screen-capture:stop-recording') {
    stopRecording().then(safeSend).catch((e) => {
      safeSend({ ok: false, error: String(e?.message || e) });
    });
    return true;
  }

  // offscreen document 主动上报的录屏状态 → 广播给 sidepanel
  if (msg.type === 'screen-recorder:tick' || msg.type === 'screen-recorder:started' || msg.type === 'screen-recorder:recording-done' || msg.type === 'screen-recorder:error') {
    sidepanelPorts.forEach((p) => {
      try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {}
    });
    safeSend({ ok: true });
    return;
  }
});

async function collectResourceFailures() {
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) [tab] = await chrome.tabs.query({ active: true });
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage({ __mynatest__: true, type: 'resource-check:collect' }, '*');
      },
      world: 'MAIN'
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// ========== 截图 & 录屏辅助函数 ==========

async function getActiveTab() {
  let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) [tab] = await chrome.tabs.query({ active: true });
  return tab || null;
}

async function captureVisibleNow() {
  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    return { ok: true, dataUrl };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// 全页截图：用 chrome.debugger → Page.captureScreenshot({ captureBeyondViewport: true })
async function captureFullPage() {
  const tab = await getActiveTab();
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };

  try {
    await chrome.debugger.attach({ tabId: tab.id }, '1.3');
  } catch (e) {
    return { ok: false, error: '无法附加调试器：' + String(e?.message || e) };
  }

  try {
    await new Promise(r => setTimeout(r, 100));

    const result = await new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: tab.id }, 'Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true
      }, (r) => {
        const err = chrome.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(r);
      });
    });

    if (!result?.data) {
      return { ok: false, error: '截图返回空数据' };
    }

    const dataUrl = 'data:image/png;base64,' + result.data;
    return { ok: true, dataUrl };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    try { await chrome.debugger.detach({ tabId: tab.id }); } catch {}
  }
}

async function downloadDataUrl(dataUrl, filename) {
  try {
    await chrome.downloads.download({ url: dataUrl, filename, saveAs: true });
  } catch (_) {}
}

// ========== Offscreen Document 管理 ==========
let offscreenCreated = false;

async function ensureOffscreen() {
  // 检查是否已存在
  const existing = await chrome.offscreen.hasDocument();
  if (existing) { offscreenCreated = true; return; }

  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA', 'BLOBS'],
      justification: '需要在 offscreen document 中调用 getUserMedia/MediaRecorder 录制标签页'
    });
    offscreenCreated = true;
  } catch (e) {
    // 如果已经存在（竞态），忽略
    if (!/already exists/i.test(String(e?.message || e))) throw e;
    offscreenCreated = true;
  }
}

async function closeOffscreen() {
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
  } catch (_) {}
  offscreenCreated = false;
}

// ========== 录屏状态管理 ==========
let recordingTabId = null;

function sendToOffscreen(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (resp) => {
      void chrome.runtime?.lastError;
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: 'Offscreen 通信失败：' + chrome.runtime.lastError.message });
        return;
      }
      resolve(resp || { ok: true });
    });
  });
}

async function startRecording(tabId) {
  const tab = tabId ? await chrome.tabs.get(tabId).catch(() => null) : await getActiveTab();
  if (!tab?.id) return { ok: false, error: '无活跃标签页' };

  const url = tab.url || '';
  if (/^(chrome|edge|about|chrome-extension|file|data|blob):\/\//i.test(url)) {
    return { ok: false, error: '当前页面无法录屏，请在 http/https 网页上操作' };
  }

  await ensureOffscreen();

  // 路径1：tabCapture（无弹窗；任何阶段失败都自动降级到路径2）
  // 注意：tabCapture API 只存在于 Service Worker，offscreen document 中不可用
  let tabErr = null;
  try {
    const streamId = await new Promise((resolve, reject) => {
      chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (id) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(id);
      });
    });
    const resp = await sendToOffscreen({ type: 'offscreen:start-recording', source: 'tab', streamId, audio: true });
    if (resp?.ok) {
      recordingTabId = tab.id;
      return { ok: true };
    }
    tabErr = resp?.error || 'offscreen 消费流失败';
  } catch (e) {
    tabErr = String(e?.message || e);
  }

  // 路径2：desktopCapture（弹出系统选择框，用户选"此标签页"；无唤起要求，必定可用）
  const desktopId = await new Promise((resolve) => {
    try {
      chrome.desktopCapture.chooseDesktopMedia(['tab', 'window'], tab, (id) => resolve(id || null));
    } catch (e) {
      resolve(null);
    }
  });
  if (!desktopId) {
    return { ok: false, error: 'tabCapture 失败（' + tabErr + '），且未选择录制源' };
  }

  const resp2 = await sendToOffscreen({ type: 'offscreen:start-recording', source: 'desktop', streamId: desktopId, audio: false });
  if (resp2?.ok) {
    recordingTabId = tab.id;
    return { ok: true };
  }
  return { ok: false, error: '录屏失败（tabCapture: ' + tabErr + ' / desktopCapture: ' + (resp2?.error || '未知') + '）' };
}

async function stopRecording() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'offscreen:stop-recording' }, (resp) => {
      void chrome.runtime?.lastError;
      recordingTabId = null;
      resolve(resp || { ok: true });
    });
  });
}

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

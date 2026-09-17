// Service Worker: sidepanel 打开 + 消息中转 + 截图

const sidepanelPorts = new Set();
const recentRequests = [];
const MAX_BUFFER = 100;

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
    return;
  }
  if (port.name === 'content-relay') {
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type || !String(msg.type).startsWith('network:')) return;
      if (msg.type === 'network:request') {
        recentRequests.push({ type: msg.type, payload: msg.payload });
        if (recentRequests.length > MAX_BUFFER) recentRequests.shift();
      }
      sidepanelPorts.forEach((p) => { try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {} });
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
});

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

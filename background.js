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
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

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

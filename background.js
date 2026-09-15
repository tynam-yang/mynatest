// Service Worker: sidepanel 打开 + 消息中转（Port 长连接）

// 活跃 sidepanel Port 列表
const sidepanelPorts = new Set();

// network:request 缓冲（sidepanel 打开前发生的请求可回放，最多 100 条）
const recentRequests = [];
const MAX_BUFFER = 100;

// 点击扩展图标时打开 side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (_) {}
  }
});

// side panel 行为配置
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});

chrome.runtime.onConnect.addListener((port) => {
  // sidepanel 接入：注册 + 回放缓冲
  if (port.name === 'sidepanel') {
    sidepanelPorts.add(port);
    port.onDisconnect.addListener(() => sidepanelPorts.delete(port));
    recentRequests.forEach((msg) => {
      try { port.postMessage(msg); } catch (_) {}
    });
    return;
  }

  // content script 中转：接收 network:* → 广播给所有 sidepanel
  if (port.name === 'content-relay') {
    port.onMessage.addListener((msg) => {
      if (!msg || !msg.type || !String(msg.type).startsWith('network:')) return;

      if (msg.type === 'network:request') {
        recentRequests.push({ type: msg.type, payload: msg.payload });
        if (recentRequests.length > MAX_BUFFER) recentRequests.shift();
      }

      sidepanelPorts.forEach((p) => {
        try { p.postMessage({ type: msg.type, payload: msg.payload }); } catch (_) {}
      });
    });
  }
});

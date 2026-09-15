// sidepanel.js — 通用框架（全局脚本模式，Chrome 扩展 side panel 最稳）

function createEventBus() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    emit(event, payload) {
      listeners.get(event)?.forEach(fn => fn(payload));
    }
  };
}

const eventBus = createEventBus();
const toolCleanups = [];
let currentTools = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 工具列表来自 tools/ 目录下各脚本注册到 window.MynaTools
  const allTools = window.MynaTools || [];

  let enabledIds;
  try {
    enabledIds = await window.MynaStorage.getEnabledTools(allTools);
  } catch (e) {
    console.error('[mynatest] storage error:', e);
    enabledIds = allTools.map(t => t.meta.id);
  }

  currentTools = allTools.filter(t => enabledIds.includes(t.meta.id));

  renderTabs();
  renderPanels();

  if (currentTools[0]) activateTab(currentTools[0].meta.id);

  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    // 替换为齿轮图标
    settingsBtn.innerHTML = '';
    const img = document.createElement('img');
    img.src = 'icons/settings.png';
    img.alt = '设置';
    settingsBtn.appendChild(img);
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
    settingsBtn.dataset.tooltip = '设置';
  }

  // 通过 Port 长连接接收 background 转发的捕获消息
  // 关键：MV3 SW 空闲 ~30 秒会被挂起，Port 随之断开，必须自动重连，
  // 否则之后的所有捕获消息都会丢失（背景会缓冲断线期间的消息并在重连时回放）
  let relayPort = null;
  function connectRelay() {
    try {
      relayPort = chrome.runtime.connect({ name: 'sidepanel' });
      relayPort.onMessage.addListener((msg) => {
        if (!msg || msg.type !== 'network:request') return;
        eventBus.emit('network:request', msg.payload);
      });
      relayPort.onDisconnect.addListener(() => {
        relayPort = null;
        setTimeout(connectRelay, 1000);
      });
    } catch (e) {
      setTimeout(connectRelay, 3000);
    }
  }
  connectRelay();

  // 回退通道：兼容扩展重载后「未刷新的旧页面」——
  // 旧版 content.js 仍走 chrome.storage 写入，这里兜底接收，避免整条链路中断
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    Object.entries(changes).forEach(([key, change]) => {
      if (!key.startsWith('__mynatest_msg_')) return;
      const val = change.newValue;
      if (!val || val.type !== 'network:request') return;
      eventBus.emit('network:request', val.payload);
    });
  });

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'local' && changes.enabledTools) {
      toolCleanups.forEach(fn => fn?.());
      toolCleanups.length = 0;
      const enabledIds = changes.enabledTools.newValue;
      currentTools = allTools.filter(t => enabledIds.includes(t.meta.id));
      renderTabs();
      renderPanels();
      if (currentTools[0]) activateTab(currentTools[0].meta.id);
    }
  });
}

function renderTabs() {
  const tabsEl = document.getElementById('tabs');
  tabsEl.innerHTML = '';
  currentTools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = 'sp-tab';
    btn.dataset.id = tool.meta.id;
    btn.dataset.tooltip = tool.meta.name;
    if (tool.meta.iconUrl) {
      const img = document.createElement('img');
      img.src = tool.meta.iconUrl;
      img.alt = tool.meta.name;
      btn.appendChild(img);
    } else {
      btn.innerHTML = tool.meta.icon;
    }
    btn.addEventListener('click', () => activateTab(tool.meta.id));
    tabsEl.appendChild(btn);
  });
}

function activateTab(id) {
  document.querySelectorAll('.sp-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.id === id);
  });
  document.querySelectorAll('[data-tool-panel]').forEach(p => {
    p.style.display = p.dataset.toolPanel === id ? '' : 'none';
  });
}

function renderPanels() {
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '';

  currentTools.forEach(tool => {
    const panel = document.createElement('div');
    panel.className = 'tool-panel';
    panel.dataset.toolPanel = tool.meta.id;
    panel.style.display = 'none';

    tool.render(panel);
    contentEl.appendChild(panel);

    const cleanup = tool.mount({ container: panel, events: eventBus });
    if (typeof cleanup === 'function') toolCleanups.push(cleanup);
  });
}

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

  // 按用户自定义顺序排列
  let order;
  try {
    order = await window.MynaStorage.getToolOrder(allTools);
  } catch {
    order = allTools.map(t => t.meta.id);
  }

  currentTools = order
    .map(id => allTools.find(t => t.meta.id === id))
    .filter(t => t && enabledIds.includes(t.meta.id));

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
        if (!msg || !msg.type) return;
        if (msg.type === 'network:request') { eventBus.emit('network:request', msg.payload); return; }
        if (msg.type === 'snapshot:picked') { eventBus.emit('snapshot:picked', msg.payload); return; }
        if (msg.type === 'bug-report:screenshot-ready') { eventBus.emit('bug-report:screenshot-ready', msg.payload); return; }
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
    if (area !== 'local') return;
    if (changes.enabledTools || changes.toolOrder) {
      toolCleanups.forEach(fn => fn?.());
      toolCleanups.length = 0;
      const enabledIds = changes.enabledTools ? changes.enabledTools.newValue : await window.MynaStorage.getEnabledTools(allTools);
      let order;
      if (changes.toolOrder) {
        order = changes.toolOrder.newValue || [];
      } else {
        order = await window.MynaStorage.getToolOrder(allTools);
      }
      const known = order.filter(id => allTools.some(t => t.meta.id === id));
      const newTools = allTools.filter(t => !known.includes(t.meta.id)).map(t => t.meta.id);
      const fullOrder = [...known, ...newTools];
      currentTools = fullOrder
        .map(id => allTools.find(t => t.meta.id === id))
        .filter(t => t && enabledIds.includes(t.meta.id));
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
    btn.draggable = true;
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
  bindTabDrag();
}

function bindTabDrag() {
  const tabsEl = document.getElementById('tabs');
  let draggingEl = null;

  tabsEl.querySelectorAll('.sp-tab').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      draggingEl = el;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.dataset.id);
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      el.classList.toggle('drag-over-top', e.clientY < midY);
      el.classList.toggle('drag-over-bottom', e.clientY >= midY);
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggingEl || draggingEl === el) return;

      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertBefore = e.clientY < midY;

      if (insertBefore) {
        tabsEl.insertBefore(draggingEl, el);
      } else {
        tabsEl.insertBefore(draggingEl, el.nextSibling);
      }

      el.classList.remove('drag-over-top', 'drag-over-bottom');
      saveTabOrder();
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      tabsEl.querySelectorAll('.sp-tab').forEach(t => {
        t.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      draggingEl = null;
    });
  });
}

async function saveTabOrder() {
  const ids = Array.from(document.querySelectorAll('.sp-tab')).map(el => el.dataset.id);
  currentTools = ids
    .map(id => currentTools.find(t => t.meta.id === id))
    .filter(Boolean);
  try {
    await window.MynaStorage.setToolOrder(ids);
  } catch (e) {
    console.error('[mynatest] save order error:', e);
  }
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

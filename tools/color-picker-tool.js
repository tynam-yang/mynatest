// tools/color-picker-tool.js — 取色器 sidepanel 面板
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const COLOR_STORAGE_KEY = 'myna_picked_colors';
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(COLOR_STORAGE_KEY) || '[]'); } catch { return []; }
  }
  function saveHistory(list) {
    try { localStorage.setItem(COLOR_STORAGE_KEY, JSON.stringify(list.slice(0, 20))); } catch {}
  }

  const meta = {
    id: 'color-picker-tool',
    name: '取色器',
    desc: '拾取页面任意像素颜色，复制 HEX / RGB / HSL',
    iconUrl: 'icons/ruler-tool.png',
    icon: '🎨',
    category: 'dev',
    categoryName: '开发工具'
  };

  const tool = {
    meta,
    render(root) {
      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2></div>

          <div class="ug-section">
            <div class="ug-section-title">🎨 取色器</div>
            <div class="ru-desc">移动鼠标预览当前位置颜色，左键拾取并复制 HEX / RGB / HSL。支持图片像素、disabled 元素、祖先穿透取色。</div>
            <div class="ru-actions">
              <button id="rt-toggle" class="ug-btn-primary" style="flex:1;">🚀 启动取色器</button>
            </div>
            <div id="rt-status" class="ru-status ru-status-idle">未启动 · 点击按钮激活</div>
          </div>

          <div class="ug-section">
            <div class="ug-section-title" style="justify-content:space-between;">
              <span>🎨 最近取色</span>
              <button id="rt-clear" class="ug-btn-tiny">清空</button>
            </div>
            <div id="rt-color-list" class="me-color-list"></div>
          </div>

          <div class="ug-section">
            <div class="ug-section-title">⌨ 快捷操作</div>
            <div id="rt-shortcuts">
              <div class="ru-kv"><span class="ru-kv-k">🖱 移动</span><span class="ru-kv-v">实时预览颜色</span></div>
              <div class="ru-kv"><span class="ru-kv-k">🖱 左键</span><span class="ru-kv-v">拾取当前像素</span></div>
              <div class="ru-kv"><span class="ru-kv-k">⌨ Esc</span><span class="ru-kv-v">退出取色器</span></div>
            </div>
          </div>
        </div>
      `;
    },
    mount(context) {
      const { container } = context;

      const toggleBtn = container.querySelector('#rt-toggle');
      const statusEl = container.querySelector('#rt-status');
      const listEl = container.querySelector('#rt-color-list');
      const clearBtn = container.querySelector('#rt-clear');

      let active = false;
      let listenerActive = false;

      async function sendToPage(type) {
        try {
          const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
          if (!tab || !tab.id) { flashMessage('未找到活动页面', 'warn'); return false; }
          if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:'))) {
            flashMessage('扩展页面不可用', 'warn'); return false;
          }
          try {
            await new Promise((resolve, reject) => {
              const t = setTimeout(() => reject(new Error('ping 超时')), 1500);
              chrome.tabs.sendMessage(tab.id, { type: 'ping' }, (res) => {
                clearTimeout(t);
                if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(res);
              });
            });
          } catch {
            flashMessage('页面未准备好，请刷新目标页面后重试', 'warn');
            return false;
          }
          await chrome.tabs.sendMessage(tab.id, { type });
          return true;
        } catch (e) {
          flashMessage('无法连接页面：' + e.message, 'warn');
          return false;
        }
      }

      function setUI(nowActive) {
        active = nowActive;
        if (nowActive) {
          toggleBtn.textContent = `⏹ 停止取色器`;
          toggleBtn.classList.remove('ug-btn-primary');
          toggleBtn.classList.add('ru-btn-secondary');
          statusEl.textContent = `✅ 取色器运行中 · 切换到目标页面使用`;
          statusEl.className = 'ru-status ru-status-active';
        } else {
          toggleBtn.textContent = `🚀 启动取色器`;
          toggleBtn.classList.add('ug-btn-primary');
          toggleBtn.classList.remove('ru-btn-secondary');
          statusEl.textContent = '未启动 · 点击按钮激活';
          statusEl.className = 'ru-status ru-status-idle';
        }
      }

      async function toggle() {
        if (active) {
          if (await sendToPage('myna_color_deactivate')) { setUI(false); flashMessage('已停止', 'success'); }
        } else {
          if (await sendToPage('myna_color_activate')) { setUI(true); flashMessage('已启动', 'success'); }
        }
      }
      toggleBtn.addEventListener('click', toggle);

      function renderHistory() {
        const list = loadHistory();
        if (!list.length) {
          listEl.innerHTML = '<div class="me-color-empty">暂无取色记录</div>';
          return;
        }
        listEl.innerHTML = list.map(c => `
          <div class="me-color-item">
            <div class="me-color-swatch" style="background:${c.hex}"></div>
            <div class="me-color-info">
              <div class="me-color-hex" data-hex="${c.hex}">${c.hex}</div>
              <div class="me-color-rgb">rgb(${c.r}, ${c.g}, ${c.b})</div>
            </div>
            <div class="me-color-copy" title="复制 HEX + RGB" data-hex="${c.hex}" data-rgb="rgb(${c.r},${c.g},${c.b})">📋</div>
          </div>
        `).join('');
        listEl.querySelectorAll('.me-color-copy').forEach(btn => {
          btn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(`${btn.dataset.hex}  ${btn.dataset.rgb}`); flashMessage(`已复制 ${btn.dataset.hex}`, 'success'); } catch(e){}
          });
        });
        listEl.querySelectorAll('.me-color-hex').forEach(el => {
          el.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(el.dataset.hex); flashMessage(`已复制 ${el.dataset.hex}`, 'success'); } catch(e){}
          });
        });
      }
      renderHistory();
      clearBtn?.addEventListener('click', () => { saveHistory([]); renderHistory(); flashMessage('已清空', 'success'); });

      const listener = (msg) => {
        if (!msg || typeof msg.type !== 'string') return;
        if (msg.type === 'myna_color_deactivated') { setUI(false); }
        else if (msg.type === 'myna_color_picked' && msg.color) {
          const c = msg.color;
          const list = loadHistory();
          const idx = list.findIndex(x => x.hex === c.hex);
          if (idx >= 0) list.splice(idx, 1);
          list.unshift({ r: c.r, g: c.g, b: c.b, hex: c.hex });
          saveHistory(list);
          renderHistory();
          flashMessage(`已拾取 ${c.hex}`, 'success');
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      listenerActive = true;

      const observer = new MutationObserver(() => {
        if (!container.isConnected) {
          if (listenerActive) { chrome.runtime.onMessage.removeListener(listener); listenerActive = false; }
          observer.disconnect();
          if (active) sendToPage('myna_color_deactivate');
        }
      });
      observer.observe(container.parentNode, { childList: true, subtree: true });
    }
  };

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

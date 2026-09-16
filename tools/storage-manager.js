// tools/storage-manager.js — Cookie/Storage 管理器（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const escapeHtml = window.MynaUtils.escapeHtml;

  const meta = {
    id: 'storage-manager',
    name: 'Cookie/Storage 管理',
    desc: '查看/编辑/备份/恢复 Cookie 与 Web Storage，快速切换登录态',
    iconUrl: 'icons/storage-manager.png',
    category: 'dev',
    categoryName: '开发工具'
  };

  // 持久状态：当前激活的子标签和搜索词
  const state = {
    subTab: 'cookie',     // cookie | local | session
    search: '',
    tabUrl: '',
    tabId: null,
    profiles: []          // 账号快照
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="sm-info" id="smInfo">点击刷新获取当前页面数据</div>
      <div class="sm-login-card" id="smLoginCard">
        <span class="sm-login-badge unknown">检测中...</span>
        <span class="sm-login-detail" id="smLoginDetail"></span>
      </div>
      <div class="sm-toolbar">
        <button class="btn primary" id="smRefreshBtn">刷新</button>
        <button class="btn" id="smExportBtn">导出备份</button>
        <button class="btn" id="smImportBtn">导入恢复</button>
        <input type="file" id="smImportFile" accept=".json" style="display:none">
      </div>
      <div class="sm-subtabs">
        <button class="sm-subtab active" data-sub="cookie">Cookie</button>
        <button class="sm-subtab" data-sub="local">localStorage</button>
        <button class="sm-subtab" data-sub="session">sessionStorage</button>
      </div>
      <div class="sm-search-row">
        <input type="text" class="sm-search" id="smSearch" placeholder="搜索 key 或 value...">
        <button class="btn" id="smAddBtn">新增</button>
      </div>
      <div class="sm-table" id="smTable"></div>
      <div class="sm-profiles">
        <div class="sm-profiles-head">登录态快照</div>
        <div class="sm-profile-row">
          <input type="text" id="smProfileName" class="sm-profile-input" placeholder="快照名称">
          <button class="btn primary" id="smSaveProfileBtn">保存当前</button>
        </div>
        <div class="sm-profile-list" id="smProfileList"></div>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;

    // —— 工具函数 ——
  function getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true });
  }

  async function getTabInfo() {
    const [tab] = await getActiveTab();
    if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
      throw new Error('当前页面不支持（请在普通网页上使用）');
    }
    state.tabUrl = tab.url;
    state.tabId = tab.id;
    return tab;
  }

  // —— Cookie 操作 ——
  async function getCookies() {
    return chrome.cookies.getAll({ url: state.tabUrl });
  }

  async function setCookie(name, value, opts = {}) {
    const url = state.tabUrl;
    const cookie = {
      url,
      name,
      value,
      path: opts.path || '/',
      secure: opts.secure ?? false,
      httpOnly: opts.httpOnly ?? false,
      sameSite: opts.sameSite || 'lax'
    };
    if (opts.domain) cookie.domain = opts.domain;
    if (opts.expirationDate) cookie.expirationDate = opts.expirationDate;
    return chrome.cookies.set(cookie);
  }

  async function removeCookie(name) {
    return chrome.cookies.remove({ url: state.tabUrl, name });
  }

  // —— localStorage / sessionStorage 操作（通过 executeScript 注入 MAIN world）——
  async function getStorage(type) {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      world: 'MAIN',
      func: (storageType) => {
        const store = storageType === 'local' ? localStorage : sessionStorage;
        const items = {};
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          items[k] = store.getItem(k);
        }
        return items;
      },
      args: [type]
    });
    return result.result || {};
  }

  async function setStorageItem(type, key, value) {
    await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      world: 'MAIN',
      func: (storageType, k, v) => {
        const store = storageType === 'local' ? localStorage : sessionStorage;
        store.setItem(k, v);
      },
      args: [type, key, value]
    });
  }

  async function removeStorageItem(type, key) {
    await chrome.scripting.executeScript({
      target: { tabId: state.tabId },
      world: 'MAIN',
      func: (storageType, k) => {
        const store = storageType === 'local' ? localStorage : sessionStorage;
        store.removeItem(k);
      },
      args: [type, key]
    });
  }

  // —— 登录态检测 ——
  const AUTH_KEYWORDS = ['token', 'session', 'auth', 'jwt', 'uid', 'userid', 'user_id', 'user', 'login', 'sid', 'ssid', 'ticket', 'passport', 'account', 'profile', 'openid'];

  function isAuthKey(name) {
    const lower = (name || '').toLowerCase();
    return AUTH_KEYWORDS.some(kw => lower.includes(kw));
  }

  function detectFromCookies(cookies) {
    const found = [];
    for (const c of cookies) {
      if (isAuthKey(c.name)) {
        found.push({ source: 'Cookie', key: c.name, value: c.value, expiry: c.expirationDate });
      }
    }
    return found;
  }

  function detectFromStorage(items, source) {
    const found = [];
    for (const [k, v] of Object.entries(items)) {
      if (isAuthKey(k)) {
        found.push({ source, key: k, value: v });
      }
    }
    return found;
  }

  function renderLoginStatus(authItems) {
    const badge = c.querySelector('.sm-login-badge');
    const detail = c.querySelector('#smLoginDetail');
    if (!badge || !detail) return;

    if (authItems.length === 0) {
      badge.textContent = '未检测到登录态';
      badge.className = 'sm-login-badge no';
      detail.textContent = '未发现 token / session / user 等关键字段';
      return;
    }

    badge.textContent = '已登录';
    badge.className = 'sm-login-badge yes';
    // 展示关键字段（最多 3 个，超出的显示 +N）
    const preview = authItems.slice(0, 3).map(a => {
      const val = a.value || '';
      const truncated = val.length > 30 ? val.slice(0, 30) + '…' : val;
      let extra = '';
      if (a.expiry) {
        const days = Math.round((a.expiry * 1000 - Date.now()) / 86400000);
        if (days > 0) extra = ` · ${days}天后过期`;
      }
      return `<span class="sm-login-item">[${escapeHtml(a.source)}] ${escapeHtml(a.key)} = ${escapeHtml(truncated)}${extra}</span>`;
    }).join('');
    const more = authItems.length > 3 ? ` <span class="sm-login-more">+${authItems.length - 3}</span>` : '';
    detail.innerHTML = preview + more;
  }

  // —— 当前子标签的数据获取 ——
  async function loadData() {
    await getTabInfo();
    if (state.subTab === 'cookie') return getCookies();
    const type = state.subTab === 'local' ? 'local' : 'session';
    const items = await getStorage(type);
    return Object.entries(items).map(([k, v]) => ({ name: k, value: v }));
  }

  // —— 渲染表格 ——
  function renderTable(data) {
    const tableEl = c.querySelector('#smTable');
    if (!tableEl) return;

    const search = state.search.trim().toLowerCase();
    const filtered = search
      ? data.filter(d => {
          const name = (d.name || '').toLowerCase();
          const value = (d.value || '').toLowerCase();
          return name.includes(search) || value.includes(search);
        })
      : data;

    if (filtered.length === 0) {
      tableEl.innerHTML = '<div class="sm-empty">暂无数据</div>';
      return;
    }

    tableEl.innerHTML = filtered.map((item, i) => {
      const name = escapeHtml(item.name || '');
      const value = escapeHtml(item.value || '');
      const truncated = value.length > 120 ? value.slice(0, 120) + '…' : value;
      const extra = item.domain ? `<span class="sm-meta">${escapeHtml(item.domain)}</span>` : '';
      return `
        <div class="sm-row" data-idx="${i}">
          <div class="sm-row-key" title="${name}">${name}${extra}</div>
          <div class="sm-row-val" title="${value}">${truncated}</div>
          <div class="sm-row-actions">
            <button class="sm-icon-btn" data-act="edit" title="编辑">✏️</button>
            <button class="sm-icon-btn" data-act="delete" title="删除">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 缓存原始数据供编辑使用
    tableEl._data = filtered;
    bindRowEvents(tableEl, filtered);
  }

  function bindRowEvents(tableEl, data) {
    tableEl.querySelectorAll('.sm-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.sm-row');
        const idx = Number(row.dataset.idx);
        const item = data[idx];
        const act = btn.dataset.act;

        if (act === 'edit') {
          openEditModal(item);
        } else if (act === 'delete') {
          deleteEntry(item);
        }
      });
    });
  }

  // —— 编辑弹窗 ——
  function openEditModal(item) {
    const name = item.name || '';
    const value = item.value || '';
    const isExisting = !!name;

    const overlay = document.createElement('div');
    overlay.className = 'sm-modal-overlay';
    overlay.innerHTML = `
      <div class="sm-modal">
        <div class="sm-modal-title">${isExisting ? '编辑' : '新增'}条目</div>
        <label class="sm-modal-label">Key</label>
        <input type="text" class="sm-modal-input" id="smEditKey" value="${escapeHtml(name)}" ${isExisting ? 'readonly' : ''}>
        <label class="sm-modal-label">Value</label>
        <textarea class="sm-modal-textarea" id="smEditValue">${escapeHtml(value)}</textarea>
        <div class="sm-modal-footer">
          <button class="btn" id="smModalCancel">取消</button>
          <button class="btn primary" id="smModalSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const keyInput = overlay.querySelector('#smEditKey');
    const valInput = overlay.querySelector('#smEditValue');
    valInput.focus();
    valInput.select();

    function close() { overlay.remove(); }

    overlay.querySelector('#smModalCancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    overlay.querySelector('#smModalSave').addEventListener('click', async () => {
      const k = keyInput.value.trim();
      const v = valInput.value;
      if (!k) { flashMessage('Key 不能为空', true); return; }
      close();
      await saveEntry(k, v, item);
    });
  }

  async function saveEntry(key, value, oldItem) {
    try {
      if (state.subTab === 'cookie') {
        await setCookie(key, value, {
          domain: oldItem?.domain,
          path: oldItem?.path || '/',
          secure: oldItem?.secure ?? false,
          httpOnly: oldItem?.httpOnly ?? false,
          sameSite: oldItem?.sameSite || 'lax'
        });
      } else {
        const type = state.subTab === 'local' ? 'local' : 'session';
        await setStorageItem(type, key, value);
      }
      flashMessage('✓ 已保存');
      await refresh();
    } catch (e) {
      flashMessage('保存失败: ' + e.message, true);
    }
  }

  async function deleteEntry(item) {
    try {
      if (state.subTab === 'cookie') {
        await removeCookie(item.name);
      } else {
        const type = state.subTab === 'local' ? 'local' : 'session';
        await removeStorageItem(type, item.name);
      }
      flashMessage('✓ 已删除');
      await refresh();
    } catch (e) {
      flashMessage('删除失败: ' + e.message, true);
    }
  }

  // —— 刷新 ——
  async function refresh() {
    const info = c.querySelector('#smInfo');
    info.textContent = '加载中...';
    info.className = 'sm-info loading';
    try {
      const data = await loadData();
      const count = data.length;
      info.className = 'sm-info';
      info.textContent = `${state.tabUrl} · ${state.subTab === 'cookie' ? 'Cookie' : state.subTab === 'local' ? 'localStorage' : 'sessionStorage'} · ${count} 条`;
      renderTable(data);

      // 登录态检测：同时扫描 Cookie + localStorage + sessionStorage
      const cookies = await getCookies();
      const localItems = await getStorage('local');
      const sessionItems = await getStorage('session');
      const authItems = [
        ...detectFromCookies(cookies),
        ...detectFromStorage(localItems, 'localStorage'),
        ...detectFromStorage(sessionItems, 'sessionStorage')
      ];
      renderLoginStatus(authItems);
    } catch (e) {
      info.className = 'sm-info error';
      info.textContent = '✗ ' + e.message;
    }
  }

  // —— 导出备份 ——
  async function exportBackup() {
    try {
      await getTabInfo();
      const cookies = await getCookies();
      const local = await getStorage('local');
      const session = await getStorage('session');

      const backup = {
        url: state.tabUrl,
        timestamp: Date.now(),
        cookies,
        localStorage: local,
        sessionStorage: session
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const host = new URL(state.tabUrl).hostname;
      a.href = url;
      a.download = `storage-backup-${host}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flashMessage('✓ 备份已下载');
    } catch (e) {
      flashMessage('导出失败: ' + e.message, true);
    }
  }

  // —— 导入恢复 ——
  async function importBackup(file) {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.cookies && !backup.localStorage && !backup.sessionStorage) {
        flashMessage('文件格式不正确', true);
        return;
      }

      await getTabInfo();

      // 恢复 Cookie
      if (backup.cookies && Array.isArray(backup.cookies)) {
        for (const c of backup.cookies) {
          await setCookie(c.name, c.value, {
            domain: c.domain,
            path: c.path || '/',
            secure: c.secure ?? false,
            httpOnly: c.httpOnly ?? false,
            sameSite: c.sameSite || 'lax',
            expirationDate: c.expirationDate
          });
        }
      }

      // 恢复 localStorage
      if (backup.localStorage) {
        await chrome.scripting.executeScript({
          target: { tabId: state.tabId },
          world: 'MAIN',
          func: (items) => {
            localStorage.clear();
            for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
          },
          args: [backup.localStorage]
        });
      }

      // 恢复 sessionStorage
      if (backup.sessionStorage) {
        await chrome.scripting.executeScript({
          target: { tabId: state.tabId },
          world: 'MAIN',
          func: (items) => {
            sessionStorage.clear();
            for (const [k, v] of Object.entries(items)) sessionStorage.setItem(k, v);
          },
          args: [backup.sessionStorage]
        });
      }

      flashMessage('✓ 恢复成功，建议刷新页面');
      await refresh();
    } catch (e) {
      flashMessage('导入失败: ' + e.message, true);
    }
  }

  // —— 账号快照 ——
  async function loadProfiles() {
    return new Promise(resolve => {
      chrome.storage.local.get(['sm-profiles'], r => {
        state.profiles = r['sm-profiles'] || [];
        resolve();
      });
    });
  }

  async function saveProfiles() {
    return new Promise(resolve => {
      chrome.storage.local.set({ 'sm-profiles': state.profiles }, resolve);
    });
  }

  async function saveCurrentProfile() {
    const nameInput = c.querySelector('#smProfileName');
    const name = nameInput.value.trim();
    if (!name) { flashMessage('请输入快照名称', true); return; }

    try {
      await getTabInfo();
      const cookies = await getCookies();
      const local = await getStorage('local');
      const session = await getStorage('session');

      const existing = state.profiles.findIndex(p => p.name === name);
      const profile = {
        name,
        url: state.tabUrl,
        timestamp: Date.now(),
        cookies,
        localStorage: local,
        sessionStorage: session
      };

      if (existing >= 0) state.profiles[existing] = profile;
      else state.profiles.push(profile);

      await saveProfiles();
      nameInput.value = '';
      renderProfileList();
      flashMessage(`✓ 快照「${name}」已保存`);
    } catch (e) {
      flashMessage('保存快照失败: ' + e.message, true);
    }
  }

  async function restoreProfile(name) {
    const profile = state.profiles.find(p => p.name === name);
    if (!profile) return;

    try {
      await getTabInfo();

      // 恢复 Cookie
      for (const ck of profile.cookies || []) {
        await setCookie(ck.name, ck.value, {
          domain: ck.domain,
          path: ck.path || '/',
          secure: ck.secure ?? false,
          httpOnly: ck.httpOnly ?? false,
          sameSite: ck.sameSite || 'lax',
          expirationDate: ck.expirationDate
        });
      }

      // 恢复 localStorage
      if (profile.localStorage) {
        await chrome.scripting.executeScript({
          target: { tabId: state.tabId },
          world: 'MAIN',
          func: (items) => {
            localStorage.clear();
            for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
          },
          args: [profile.localStorage]
        });
      }

      // 恢复 sessionStorage
      if (profile.sessionStorage) {
        await chrome.scripting.executeScript({
          target: { tabId: state.tabId },
          world: 'MAIN',
          func: (items) => {
            sessionStorage.clear();
            for (const [k, v] of Object.entries(items)) sessionStorage.setItem(k, v);
          },
          args: [profile.sessionStorage]
        });
      }

      flashMessage(`✓ 已恢复「${name}」，建议刷新页面`);
      await refresh();
    } catch (e) {
      flashMessage('恢复失败: ' + e.message, true);
    }
  }

  async function deleteProfile(name) {
    state.profiles = state.profiles.filter(p => p.name !== name);
    await saveProfiles();
    renderProfileList();
    flashMessage('✓ 已删除快照');
  }

  function renderProfileList() {
    const listEl = c.querySelector('#smProfileList');
    if (!listEl) return;

    if (state.profiles.length === 0) {
      listEl.innerHTML = '<div class="sm-profile-empty">暂无快照</div>';
      return;
    }

    listEl.innerHTML = state.profiles.map(p => `
      <div class="sm-profile-item">
        <span class="sm-profile-name" title="${escapeHtml(p.url)}">${escapeHtml(p.name)}</span>
        <span class="sm-profile-time">${new Date(p.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        <button class="sm-icon-btn" data-act="restore" data-name="${escapeHtml(p.name)}" title="恢复">恢复</button>
        <button class="sm-icon-btn" data-act="delete-p" data-name="${escapeHtml(p.name)}" title="删除">🗑️</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.sm-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        if (btn.dataset.act === 'restore') restoreProfile(name);
        else if (btn.dataset.act === 'delete-p') deleteProfile(name);
      });
    });
  }

  // —— 子标签切换 ——
  c.querySelectorAll('.sm-subtab').forEach(tab => {
    tab.addEventListener('click', () => {
      c.querySelectorAll('.sm-subtab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.subTab = tab.dataset.sub;
      refresh();
    });
  });

  // —— 工具栏事件 ——
  c.querySelector('#smRefreshBtn').addEventListener('click', refresh);
  c.querySelector('#smExportBtn').addEventListener('click', exportBackup);
  c.querySelector('#smImportBtn').addEventListener('click', () => {
    c.querySelector('#smImportFile').click();
  });
  c.querySelector('#smImportFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importBackup(file);
    e.target.value = '';
  });

  // —— 搜索 ——
  const searchInput = c.querySelector('#smSearch');
  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // 仅重新渲染表格（不重新加载数据）
      const tableEl = c.querySelector('#smTable');
      if (tableEl._data) renderTable(tableEl._data);
    }, 200);
  });

  // —— 新增按钮 ——
  c.querySelector('#smAddBtn').addEventListener('click', () => {
    if (!state.tabId) { flashMessage('请先刷新获取页面', true); return; }
    openEditModal({ name: '', value: '' });
  });

  // —— 快照 ——
  c.querySelector('#smSaveProfileBtn').addEventListener('click', saveCurrentProfile);

  // —— 初始化 ——
  loadProfiles().then(() => {
    renderProfileList();
    refresh();
  });

  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

// tools/env-banner.js — 测试环境横幅（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'env-banner',
    name: '环境横幅',
    desc: '域名匹配页面顶部彩色提示条，区分 dev/test/pre 防误操作',
    iconUrl: 'icons/env-banner.png',
    icon: '🏷️',
    category: 'dev',
    categoryName: '开发工具'
  };

  const STORAGE_KEY = 'envBanner';

  // 默认预设（prod 默认 enabled=false 防止误伤生产）
  const DEFAULT_CONFIG = {
    enabled: true,
    environments: [
      {
        id: 'dev',
        name: 'dev',
        label: 'DEV',
        bgColor: '#22c55e',
        fgColor: '#ffffff',
        patterns: ['*dev*', '*localhost*', '*127.0.0.1*', '*0.0.0.0*'],
        enabled: true
      },
      {
        id: 'test',
        name: 'test',
        label: 'TEST',
        bgColor: '#f97316',
        fgColor: '#ffffff',
        patterns: ['*test*', '*staging*', '*qa*'],
        enabled: true
      },
      {
        id: 'pre',
        name: 'pre',
        label: 'PRE',
        bgColor: '#eab308',
        fgColor: '#ffffff',
        patterns: ['*pre*', '*uat*', '*sit*', '*gray*'],
        enabled: true
      },
      {
        id: 'prod',
        name: 'prod',
        label: 'PROD',
        bgColor: '#ef4444',
        fgColor: '#ffffff',
        patterns: [],
        enabled: false
      }
    ]
  };

  let config = null;

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (r) => {
        const saved = r[STORAGE_KEY];
        if (saved && saved.environments) {
          // 合并默认字段，兼容老版本
          const merged = { ...DEFAULT_CONFIG, ...saved };
          merged.environments = DEFAULT_CONFIG.environments.map((d) => {
            const u = saved.environments.find((e) => e.id === d.id);
            return u ? { ...d, ...u } : d;
          });
          resolve(merged);
        } else {
          resolve(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
        }
      });
    });
  }

  function saveConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: config }, () => resolve());
    });
  }

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>

      <div class="eb-master">
        <label class="eb-switch">
          <input type="checkbox" id="ebEnabled">
          <span>启用横幅（所有 HTTP 页面顶部显示）</span>
        </label>
      </div>

      <div id="ebEnvList" class="eb-env-list"></div>

      <div class="eb-footer">
        <button class="btn" id="ebAddEnv">+ 添加环境</button>
        <button class="btn" id="ebReset">恢复默认</button>
      </div>

      <div class="eb-tip">
        💡 支持通配符：<code>*dev*</code> 匹配含 dev 的域名；<code>*.example.com</code> 匹配所有子域
      </div>
    `;
  }

  async function mount(context) {
    config = await getConfig();
    renderEnvList(context.container);
    bindEvents(context.container);

    const off = context.events?.on?.('env-banner:refresh', () => {});
    return () => { off?.(); };
  }

  function renderEnvList(container) {
    const list = container.querySelector('#ebEnvList');
    list.innerHTML = '';
    config.environments.forEach((env, idx) => {
      list.appendChild(buildEnvCard(env, idx));
    });
  }

  function buildEnvCard(env, idx) {
    const card = document.createElement('div');
    card.className = 'eb-env-card';
    card.dataset.idx = idx;
    card.innerHTML = `
      <div class="eb-env-head">
        <label class="eb-switch eb-env-switch">
          <input type="checkbox" ${env.enabled ? 'checked' : ''} data-role="env-enabled">
          <span class="eb-color-dot" style="background:${env.bgColor}"></span>
          <input class="eb-label-input" value="${env.label || ''}" data-role="label" placeholder="标签（如 DEV）">
        </label>
        <button class="eb-del" data-role="del" ${config.environments.length <= 1 ? 'disabled' : ''}>✕</button>
      </div>

      <div class="eb-color-row">
        <label>背景 <input type="color" value="${env.bgColor}" data-role="bg-color"></label>
        <label>文字 <input type="color" value="${env.fgColor}" data-role="fg-color"></label>
        <div class="eb-preview" style="background:${env.bgColor};color:${env.fgColor};">${env.label || env.name}</div>
      </div>

      <div class="eb-patterns" data-role="patterns-wrap">
        ${env.patterns.map((p, i) => `
          <div class="eb-pattern-row">
            <input class="eb-pattern-input" value="${escapeAttr(p)}" data-pidx="${i}" placeholder="*.dev.example.com">
            <button class="eb-pattern-del" data-pidx="${i}">✕</button>
          </div>
        `).join('')}
        <button class="eb-pattern-add" data-role="add-pattern">+ 添加规则</button>
      </div>
    `;
    return card;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, '&quot;');
  }

  function bindEvents(container) {
    // master enable
    const master = container.querySelector('#ebEnabled');
    master.checked = !!config.enabled;
    master.addEventListener('change', () => {
      config.enabled = master.checked;
      saveConfig();
      flashMessage(master.checked ? '横幅已启用' : '横幅已关闭', 1500);
    });

    // env list event delegation
    const list = container.querySelector('#ebEnvList');
    list.addEventListener('change', (e) => {
      const card = e.target.closest('.eb-env-card');
      if (!card) return;
      const idx = Number(card.dataset.idx);
      const env = config.environments[idx];
      const role = e.target.dataset.role;

      if (role === 'env-enabled') env.enabled = e.target.checked;
      else if (role === 'label') env.label = e.target.value;
      else if (role === 'bg-color') env.bgColor = e.target.value;
      else if (role === 'fg-color') env.fgColor = e.target.value;

      // 更新预览
      if (role === 'label' || role === 'bg-color' || role === 'fg-color') {
        const prev = card.querySelector('.eb-preview');
        prev.textContent = env.label || env.name;
        prev.style.background = env.bgColor;
        prev.style.color = env.fgColor;
      }
      saveConfig();
    });

    list.addEventListener('click', (e) => {
      const card = e.target.closest('.eb-env-card');
      if (!card) return;
      const idx = Number(card.dataset.idx);
      const env = config.environments[idx];

      if (e.target.dataset.role === 'del') {
        if (config.environments.length <= 1) return;
        config.environments.splice(idx, 1);
        saveConfig();
        renderEnvList(container);
      } else if (e.target.dataset.role === 'add-pattern') {
        env.patterns.push('');
        saveConfig();
        renderEnvList(container);
      } else if (e.target.classList.contains('eb-pattern-del')) {
        const pidx = Number(e.target.dataset.pidx);
        env.patterns.splice(pidx, 1);
        saveConfig();
        renderEnvList(container);
      }
    });

    // pattern input: 直接 input 事件也保存
    list.addEventListener('input', (e) => {
      if (!e.target.classList.contains('eb-pattern-input')) return;
      const card = e.target.closest('.eb-env-card');
      const idx = Number(card.dataset.idx);
      const pidx = Number(e.target.dataset.pidx);
      config.environments[idx].patterns[pidx] = e.target.value;
      saveConfig();
    });

    // add env
    container.querySelector('#ebAddEnv').addEventListener('click', () => {
      const n = config.environments.length + 1;
      config.environments.push({
        id: 'env' + n,
        name: 'custom',
        label: 'ENV' + n,
        bgColor: '#8b5cf6',
        fgColor: '#ffffff',
        patterns: ['*'],
        enabled: true
      });
      saveConfig();
      renderEnvList(container);
    });

    // reset
    container.querySelector('#ebReset').addEventListener('click', () => {
      if (!confirm('恢复默认环境配置？自定义规则会丢失')) return;
      config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      saveConfig();
      renderEnvList(container);
      master.checked = config.enabled;
      flashMessage('已恢复默认配置', 1500);
    });
  }

  // 注册
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup() {} });
})();

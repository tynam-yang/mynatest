// tools/mock-interceptor.js — 接口 Mock 拦截器（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'mock-interceptor',
    name: 'Mock 拦截器',
    desc: '拦截指定 URL，自定义返回响应，多套场景一键切换（500/超时/空数据）',
    iconUrl: 'icons/mock-interceptor.png',
    icon: '🚧',
    category: 'test',
    categoryName: '测试工具'
  };

  const STORAGE_KEY = 'mockInterceptor';

  // 默认场景预设
  const PRESETS = {
    server500: {
      name: '服务异常 500',
      rules: [{
        id: 'p500',
        urlPattern: '/api/',
        method: '*',
        mockType: 'status',
        status: 500,
        delay: 0,
        enabled: true
      }]
    },
    timeout: {
      name: '接口超时',
      rules: [{
        id: 'pto',
        urlPattern: '/api/',
        method: '*',
        mockType: 'timeout',
        delay: 0,
        enabled: true
      }]
    },
    emptyData: {
      name: '空数据',
      rules: [{
        id: 'pempty',
        urlPattern: '/api/',
        method: '*',
        mockType: 'empty',
        status: 200,
        delay: 0,
        enabled: true
      }]
    }
  };

  const DEFAULT_CONFIG = {
    enabled: false,
    activeSceneId: null,
    scenes: []
  };

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || { ...DEFAULT_CONFIG });
      });
    });
  }

  function saveConfig(config) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEY]: config }, resolve);
    });
  }

  // ========== UI 渲染 ==========
  function render(container) {
    container.innerHTML = `
      <div class="mi-wrap">
        <div class="mi-header">
          <div class="mi-title">接口 Mock 拦截器</div>
          <label class="mi-toggle">
            <input type="checkbox" id="mi-enabled">
            <span class="mi-toggle-slider"></span>
            <span class="mi-toggle-label">全局拦截</span>
          </label>
        </div>

        <div class="mi-tip">在目标网页上生效；勾选后，命中规则的请求会被拦截并返回自定义响应。</div>

        <div class="mi-section">
          <div class="mi-section-title">预设场景（一键切换）</div>
          <div class="mi-preset-row">
            <button class="mi-preset-btn" data-preset="server500">⚡ 500 服务异常</button>
            <button class="mi-preset-btn" data-preset="timeout">⏱ 超时挂起</button>
            <button class="mi-preset-btn" data-preset="emptyData">📭 空数据</button>
          </div>
        </div>

        <div class="mi-section">
          <div class="mi-section-title">
            <span>当前场景</span>
            <select id="mi-scene-select" class="mi-scene-select"></select>
            <button id="mi-scene-add" class="mi-mini-btn" title="新增场景">+</button>
            <button id="mi-scene-rename" class="mi-mini-btn" title="重命名">✎</button>
            <button id="mi-scene-del" class="mi-mini-btn mi-mini-danger" title="删除当前场景">✕</button>
          </div>
          <div id="mi-rules" class="mi-rules"></div>
          <button id="mi-rule-add" class="mi-add-btn">+ 添加规则</button>
        </div>

        <div id="mi-editor" class="mi-editor" style="display:none;">
          <div class="mi-editor-title">编辑规则</div>
          <div class="mi-form-row">
            <label>URL 匹配</label>
            <input type="text" id="mi-url" placeholder="/api/user 或 /api/* 通配">
          </div>
          <div class="mi-form-row">
            <label>方法</label>
            <select id="mi-method">
              <option value="*">任意</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>
          <div class="mi-form-row">
            <label>类型</label>
            <select id="mi-type">
              <option value="status">HTTP 状态码</option>
              <option value="timeout">超时（挂起）</option>
              <option value="empty">空响应</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div class="mi-form-row mi-field-status">
            <label>状态码</label>
            <input type="number" id="mi-status" value="500" min="100" max="599">
          </div>
          <div class="mi-form-row mi-field-delay">
            <label>延迟(ms)</label>
            <input type="number" id="mi-delay" value="0" min="0" max="60000">
          </div>
          <div class="mi-form-row mi-field-body">
            <label>响应体</label>
            <textarea id="mi-body" rows="4" placeholder='{"code":0,"msg":"ok","data":[]}'></textarea>
          </div>
          <div class="mi-form-row mi-field-headers">
            <label>响应头(JSON)</label>
            <textarea id="mi-headers" rows="3" placeholder='{\n  "Content-Type": "application/json"\n}'></textarea>
          </div>
          <div class="mi-editor-actions">
            <button id="mi-save" class="mi-save-btn">保存</button>
            <button id="mi-cancel" class="mi-cancel-btn">取消</button>
          </div>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const container = context.container;
    let config = { ...DEFAULT_CONFIG };
    let editingRuleId = null;
    let editingSceneId = null;

    async function refresh() {
      config = await loadConfig();
      renderState();
    }

    function renderState() {
      const enabled = document.getElementById('mi-enabled');
      enabled.checked = !!config.enabled;

      const sel = document.getElementById('mi-scene-select');
      sel.innerHTML = '';
      const scenes = config.scenes || [];
      if (scenes.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '（暂无场景）';
        sel.appendChild(opt);
      } else {
        scenes.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.name;
          if (s.id === config.activeSceneId) opt.selected = true;
          sel.appendChild(opt);
        });
      }
      renderRules();
      closeEditor();
    }

    function getActiveScene() {
      return (config.scenes || []).find(s => s.id === config.activeSceneId);
    }

    function renderRules() {
      const wrap = document.getElementById('mi-rules');
      wrap.innerHTML = '';
      const scene = getActiveScene();
      if (!scene) {
        wrap.innerHTML = '<div class="mi-empty">无活跃场景，请新增或选择场景</div>';
        return;
      }
      const rules = scene.rules || [];
      if (rules.length === 0) {
        wrap.innerHTML = '<div class="mi-empty">该场景暂无规则，点击「添加规则」</div>';
        return;
      }
      rules.forEach(r => {
        const card = document.createElement('div');
        card.className = 'mi-rule-card';
        const typeText = {
          status: `HTTP ${r.status || 500}`,
          timeout: '超时挂起',
          empty: '空响应',
          custom: '自定义'
        }[r.mockType] || r.mockType;
        const methodText = (!r.method || r.method === '*') ? 'ANY' : r.method;
        const enabled = r.enabled !== false;
        card.innerHTML = `
          <div class="mi-rule-info">
            <div class="mi-rule-url">${escapeHtml(r.urlPattern || '')}</div>
            <div class="mi-rule-meta">
              <span class="mi-tag mi-method">${methodText}</span>
              <span class="mi-tag mi-type">${typeText}</span>
              ${r.delay ? `<span class="mi-tag mi-delay">+${r.delay}ms</span>` : ''}
            </div>
          </div>
          <div class="mi-rule-actions">
            <button class="mi-mini-btn" data-act="toggle" data-id="${r.id}" title="${enabled ? '禁用' : '启用'}">${enabled ? '👁' : '🚫'}</button>
            <button class="mi-mini-btn" data-act="edit" data-id="${r.id}" title="编辑">✎</button>
            <button class="mi-mini-btn mi-mini-danger" data-act="del" data-id="${r.id}" title="删除">✕</button>
          </div>
        `;
        if (!enabled) card.classList.add('mi-rule-disabled');
        wrap.appendChild(card);
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    // ========== 事件绑定 ==========
    container.addEventListener('change', async (e) => {
      if (e.target.id === 'mi-enabled') {
        config.enabled = e.target.checked;
        await saveConfig(config);
        flashMessage(config.enabled ? '已开启 Mock 拦截' : '已关闭 Mock 拦截');
      } else if (e.target.id === 'mi-scene-select') {
        config.activeSceneId = e.target.value || null;
        await saveConfig(config);
        renderRules();
      }
    });

    container.addEventListener('click', async (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      const act = t.dataset.act;
      const id = t.dataset.id;

      // 预设按钮
      if (t.dataset.preset) {
        await applyPreset(t.dataset.preset);
        return;
      }

      // 场景操作
      if (t.id === 'mi-scene-add') { await addScene(); return; }
      if (t.id === 'mi-scene-rename') { await renameScene(); return; }
      if (t.id === 'mi-scene-del') { await deleteScene(); return; }
      if (t.id === 'mi-rule-add') { openEditor(null); return; }

      // 编辑器按钮
      if (t.id === 'mi-save') { await saveRuleFromEditor(); return; }
      if (t.id === 'mi-cancel') { closeEditor(); return; }

      // 规则操作
      if (act === 'toggle') { await toggleRule(id); return; }
      if (act === 'edit') { openEditor(id); return; }
      if (act === 'del') { await deleteRule(id); return; }
    });

    container.addEventListener('change', (e) => {
      if (e.target.id === 'mi-type') updateEditorFields();
    });

    function updateEditorFields() {
      const type = document.getElementById('mi-type').value;
      const showStatus = type === 'status' || type === 'custom';
      const showBody = type === 'custom';
      const showHeaders = type === 'custom';
      const showDelay = type !== 'timeout';
      container.querySelector('.mi-field-status').style.display = showStatus ? '' : 'none';
      container.querySelector('.mi-field-body').style.display = showBody ? '' : 'none';
      container.querySelector('.mi-field-headers').style.display = showHeaders ? '' : 'none';
      container.querySelector('.mi-field-delay').style.display = showDelay ? '' : 'none';
      // 超时强制 delay=0
      if (type === 'timeout') {
        const d = document.getElementById('mi-delay');
        if (d) d.value = 0;
      }
    }

    // ========== 预设场景 ==========
    async function applyPreset(presetKey) {
      const preset = PRESETS[presetKey];
      if (!preset) return;
      // 在现有场景里找同名，命中则激活；否则新建并激活
      let scene = (config.scenes || []).find(s => s.name === preset.name);
      if (scene) {
        scene.rules = JSON.parse(JSON.stringify(preset.rules)).map(r => ({ ...r, id: uid() }));
      } else {
        scene = {
          id: uid(),
          name: preset.name,
          rules: JSON.parse(JSON.stringify(preset.rules)).map(r => ({ ...r, id: uid() }))
        };
        config.scenes.push(scene);
      }
      config.activeSceneId = scene.id;
      config.enabled = true;
      await saveConfig(config);
      flashMessage(`已切换到「${preset.name}」场景`);
      renderState();
    }

    // ========== 场景管理 ==========
    async function addScene() {
      const name = await promptInPanel('请输入场景名称', '新场景');
      if (!name) return;
      const scene = { id: uid(), name, rules: [] };
      config.scenes.push(scene);
      config.activeSceneId = scene.id;
      await saveConfig(config);
      renderState();
    }

    async function renameScene() {
      const scene = getActiveScene();
      if (!scene) { flashMessage('请先选择场景'); return; }
      const name = await promptInPanel('重命名场景', scene.name);
      if (!name) return;
      scene.name = name;
      await saveConfig(config);
      renderState();
    }

    async function deleteScene() {
      const scene = getActiveScene();
      if (!scene) return;
      if (!confirm(`确定删除场景「${scene.name}」吗？`)) return;
      config.scenes = config.scenes.filter(s => s.id !== scene.id);
      config.activeSceneId = config.scenes[0]?.id || null;
      await saveConfig(config);
      renderState();
    }

    // ========== 规则编辑器 ==========
    function openEditor(ruleId) {
      const scene = getActiveScene();
      if (!scene) { flashMessage('请先创建或选择场景'); return; }
      editingRuleId = ruleId;
      editingSceneId = scene.id;
      const rule = ruleId ? (scene.rules.find(r => r.id === ruleId) || {}) : {};
      document.getElementById('mi-url').value = rule.urlPattern || '';
      document.getElementById('mi-method').value = rule.method || '*';
      document.getElementById('mi-type').value = rule.mockType || 'status';
      document.getElementById('mi-status').value = rule.status || 500;
      document.getElementById('mi-delay').value = rule.delay || 0;
      document.getElementById('mi-body').value = rule.body || '';
      document.getElementById('mi-headers').value = rule.headers ? JSON.stringify(rule.headers, null, 2) : '{\n  "Content-Type": "application/json; charset=utf-8"\n}';
      updateEditorFields();
      document.getElementById('mi-editor').style.display = '';
    }

    function closeEditor() {
      document.getElementById('mi-editor').style.display = 'none';
      editingRuleId = null;
      editingSceneId = null;
    }

    async function saveRuleFromEditor() {
      const scene = (config.scenes || []).find(s => s.id === editingSceneId);
      if (!scene) { flashMessage('场景不存在'); return; }
      const url = document.getElementById('mi-url').value.trim();
      if (!url) { flashMessage('请填写 URL 匹配'); return; }
      const type = document.getElementById('mi-type').value;
      const newRule = {
        id: editingRuleId || uid(),
        urlPattern: url,
        method: document.getElementById('mi-method').value,
        mockType: type,
        status: Number(document.getElementById('mi-status').value) || 500,
        delay: Number(document.getElementById('mi-delay').value) || 0,
        body: document.getElementById('mi-body').value,
        enabled: true
      };
      // 解析 headers
      const headersStr = document.getElementById('mi-headers').value.trim();
      if (headersStr) {
        try { newRule.headers = JSON.parse(headersStr); }
        catch { flashMessage('响应头 JSON 格式错误'); return; }
      }
      // 超时类型强制 delay=0
      if (type === 'timeout') newRule.delay = 0;
      if (type === 'timeout' || type === 'empty') {
        delete newRule.body;
        delete newRule.headers;
      }

      if (editingRuleId) {
        const idx = scene.rules.findIndex(r => r.id === editingRuleId);
        if (idx >= 0) scene.rules[idx] = { ...scene.rules[idx], ...newRule };
      } else {
        scene.rules.push(newRule);
      }
      await saveConfig(config);
      flashMessage('规则已保存');
      renderRules();
      closeEditor();
    }

    async function toggleRule(id) {
      const scene = getActiveScene();
      if (!scene) return;
      const r = scene.rules.find(x => x.id === id);
      if (!r) return;
      r.enabled = r.enabled === false ? true : false;
      await saveConfig(config);
      renderRules();
    }

    async function deleteRule(id) {
      const scene = getActiveScene();
      if (!scene) return;
      if (!confirm('确定删除此规则？')) return;
      scene.rules = scene.rules.filter(r => r.id !== id);
      await saveConfig(config);
      renderRules();
    }

    // 简易弹窗（sidepanel 内不可用 prompt，用 inline 替代）
    function promptInPanel(message, defaultValue) {
      return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'mi-modal-overlay';
        overlay.innerHTML = `
          <div class="mi-modal">
            <div class="mi-modal-msg">${message}</div>
            <input type="text" class="mi-modal-input" value="${escapeHtml(defaultValue || '')}">
            <div class="mi-modal-actions">
              <button class="mi-save-btn">确定</button>
              <button class="mi-cancel-btn">取消</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('.mi-modal-input');
        input.focus();
        input.select();
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('.mi-save-btn').addEventListener('click', () => close(input.value.trim()));
        overlay.querySelector('.mi-cancel-btn').addEventListener('click', () => close(null));
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') close(input.value.trim());
          if (e.key === 'Escape') close(null);
        });
      });
    }

    // 初始化
    refresh();

    // 监听 storage 变化（其他页面修改时同步）
    const onChanged = (changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      config = changes[STORAGE_KEY].newValue || { ...DEFAULT_CONFIG };
      renderState();
    };
    chrome.storage.onChanged.addListener(onChanged);

    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount });
})();

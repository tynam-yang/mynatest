// tools/checklist.js — 测试检查清单 / 发布前 checklist（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'checklist',
    name: '测试检查清单',
    desc: '发布前 checklist：内置模板 + 自定义项 + 进度跟踪 + Markdown 导出',
    iconUrl: 'icons/checklist.png',
    category: 'test',
    categoryName: '测试工具'
  };

  const STORAGE_KEY = 'tool:checklist';

  // 分组强调色（按组顺序循环使用）
  const ACCENTS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];

  // 内置发布前检查模板
  const DEFAULT_TEMPLATE = [
    { group: '功能验证', items: ['核心功能冒烟测试通过', '本次需求功能验证完成', '回归测试无新增问题', '边界条件与异常流程验证'] },
    { group: '接口与数据', items: ['接口联调完成且返回符合预期', '异常码 / 超时 / 弱网处理验证', '数据兼容性与迁移脚本验证'] },
    { group: '兼容性', items: ['Chrome / Edge 主流版本通过', '移动端 / 小屏幕适配检查', '低版本 / 老环境兼容确认'] },
    { group: '安全', items: ['无敏感信息硬编码（密码 / token / 内网地址）', '控制台无报错与敏感日志输出', '权限与越权访问校验'] },
    { group: '性能', items: ['首屏加载时间符合预期', '关键接口响应时间符合预期', '无内存泄漏 / 无线轮询'] },
    { group: '上线准备', items: ['环境配置 / 开关已确认', '回滚方案已准备', '监控告警与日志已接入', '灰度 / 发布顺序已确认'] },
    { group: '文档与协作', items: ['需求 / 变更文档已更新', '测试报告已归档', '已知问题已同步给相关方'] }
  ];

  let state = { checked: {}, custom: [], template: null, editingId: null };

  // 内置模板物化为可编辑结构（id 与旧版 b{gi}-{ii} 保持一致，老用户勾选状态不丢失）
  function defaultTemplateState() {
    return DEFAULT_TEMPLATE.map((g, gi) => ({
      group: g.group,
      items: g.items.map((text, ii) => ({ id: `b${gi}-${ii}`, text }))
    }));
  }
  let unsubs = [];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="ck-progress-wrap">
        <div class="ck-progress-bar"><div class="ck-progress-fill" id="ckProgressFill"></div></div>
        <span class="ck-progress-text" id="ckProgressText">0/0</span>
      </div>

      <div id="ckGroups" class="ck-groups"></div>

      <div class="ck-add-row">
        <input type="text" id="ckAddInput" class="ck-add-input" placeholder="添加自定义检查项…">
        <select id="ckAddGroup" class="ck-add-group"></select>
        <button class="btn sc-small-btn" id="ckAddBtn">➕ 添加</button>
      </div>

      <div class="ck-actions">
        <button class="btn sc-small-btn" id="ckResetBtn">🗑 重置勾选</button>
        <button class="btn sc-small-btn" id="ckCopyBtn">📋 复制 Markdown</button>
      </div>
    `;

    container.querySelector('#ckAddBtn').addEventListener('click', () => addCustom(container));
    container.querySelector('#ckAddInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addCustom(container);
    });
    container.querySelector('#ckResetBtn').addEventListener('click', () => {
      state.checked = {};
      persist();
      renderGroups(container);
      flashMessage('✓ 已重置勾选', 1500);
    });
    container.querySelector('#ckCopyBtn').addEventListener('click', () => copyMarkdown());

    loadState(container);
  }

  function mount(context) {
    unsubs = [];
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
    state.editingId = null;
  }

  // ===== 数据 =====
  function loadState(container) {
    chrome.storage.local.get([STORAGE_KEY], (r) => {
      void chrome.runtime?.lastError;
      const saved = r[STORAGE_KEY];
      if (saved && typeof saved === 'object') {
        state.checked = saved.checked || {};
        state.custom = Array.isArray(saved.custom) ? saved.custom : [];
        // 仅当从未保存过 template 时才用默认模板（空数组 = 用户删光了全部内置项，需保留）
        state.template = Array.isArray(saved.template) ? saved.template : defaultTemplateState();
      } else {
        state.checked = {};
        state.custom = [];
        state.template = defaultTemplateState();
      }
      renderGroups(container);
    });
  }

  function persist() {
    chrome.storage.local.set({
      [STORAGE_KEY]: { checked: state.checked, custom: state.custom, template: state.template }
    }, () => {
      void chrome.runtime?.lastError;
    });
  }

  // 按 id 定位项（内置模板或自定义），返回其所在数组与项引用
  function findItem(id) {
    for (const g of state.template) {
      const it = g.items.find((x) => x.id === id);
      if (it) return { list: g.items, item: it };
    }
    const c = state.custom.find((x) => x.id === id);
    if (c) return { list: state.custom, item: c };
    return null;
  }

  // 展开为扁平结构：[{id, group, text, custom}]
  function flatItems() {
    const list = [];
    state.template.forEach((g) => {
      g.items.forEach((it) => {
        list.push({ id: it.id, group: g.group, text: it.text, custom: false });
      });
    });
    // 自定义项按其归属分组插入到扁平列表末尾（渲染时按分组聚合）
    state.custom.forEach((c) => {
      list.push({ id: c.id, group: c.group, text: c.text, custom: true });
    });
    return list;
  }

  function groupOrder() {
    const groups = state.template.map((g) => g.group);
    state.custom.forEach((c) => {
      if (!groups.includes(c.group)) groups.push(c.group);
    });
    return groups;
  }

  // ===== 渲染 =====
  function renderGroups(container) {
    const items = flatItems();
    const groupsEl = container.querySelector('#ckGroups');
    const groupSel = container.querySelector('#ckAddGroup');

    // 分组下拉选项
    groupSel.innerHTML = groupOrder().map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');

    if (!items.length) {
      groupsEl.innerHTML = '<div class="te-empty">清单为空</div>';
      updateProgress(container, items);
      return;
    }

    const byGroup = {};
    items.forEach((it) => {
      (byGroup[it.group] = byGroup[it.group] || []).push(it);
    });

    groupsEl.innerHTML = groupOrder()
      .filter((g) => byGroup[g])
      .map((g, gi) => {
        const accent = ACCENTS[gi % ACCENTS.length];
        const rows = byGroup[g].map((it) => {
          const editing = state.editingId === it.id;
          return `
          <label class="ck-item" data-id="${it.id}">
            <input type="checkbox" ${state.checked[it.id] ? 'checked' : ''}>
            ${editing
              ? `<input type="text" class="ck-edit-input" value="${escapeHtml(it.text)}">`
              : `<span class="ck-item-text">${escapeHtml(it.text)}</span>`}
            <button class="ck-edit" title="编辑">✏️</button>
            <button class="ck-del" title="删除">✕</button>
          </label>
        `;
        }).join('');
        const done = byGroup[g].filter((it) => state.checked[it.id]).length;
        return `
          <div class="ck-group" style="--ck-accent: ${accent}">
            <div class="ck-group-head">
              <span class="ck-group-name">${escapeHtml(g)}</span>
              <span class="ck-group-count">${done}/${byGroup[g].length}</span>
            </div>
            ${rows}
          </div>
        `;
      }).join('');

    // 勾选事件
    groupsEl.querySelectorAll('.ck-item input[type=checkbox]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.closest('.ck-item').dataset.id;
        if (cb.checked) state.checked[id] = true;
        else delete state.checked[id];
        persist();
        renderGroups(container);
      });
    });
    // 编辑：进入行内编辑态
    groupsEl.querySelectorAll('.ck-edit').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        state.editingId = btn.closest('.ck-item').dataset.id;
        renderGroups(container);
      });
    });
    // 编辑输入框：Enter / Esc / blur
    groupsEl.querySelectorAll('.ck-edit-input').forEach((inp) => {
      const commit = (save) => {
        if (state.editingId === null) return; // blur 已由 Enter 提交触发过，防重复
        const found = findItem(state.editingId);
        const text = (inp.value || '').trim();
        if (save && found && text && text !== found.item.text) {
          found.item.text = text;
          persist();
        }
        state.editingId = null;
        renderGroups(container);
      };
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(true); }
        else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
        e.stopPropagation();
      });
      inp.addEventListener('blur', () => commit(true));
    });
    // 删除（内置 + 自定义通用）
    groupsEl.querySelectorAll('.ck-del').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.closest('.ck-item').dataset.id;
        const found = findItem(id);
        if (found) found.list.splice(found.list.indexOf(found.item), 1);
        delete state.checked[id];
        if (state.editingId === id) state.editingId = null;
        persist();
        renderGroups(container);
      });
    });

    // 编辑态：聚焦输入框并定位到文本末尾
    if (state.editingId) {
      const inp = groupsEl.querySelector('.ck-edit-input');
      if (inp) {
        inp.focus();
        const len = inp.value.length;
        inp.setSelectionRange(len, len);
      }
    }

    updateProgress(container, items);
  }

  function updateProgress(container, items) {
    const total = items.length;
    const done = items.filter((it) => state.checked[it.id]).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = container.querySelector('#ckProgressFill');
    const text = container.querySelector('#ckProgressText');
    if (fill) {
      fill.style.width = pct + '%';
      fill.classList.toggle('ck-full', pct === 100);
    }
    if (text) {
      text.textContent = `${done}/${total} (${pct}%)`;
      text.classList.toggle('ck-text-full', pct === 100 && total > 0);
    }
  }

  // ===== 自定义项 =====
  function addCustom(container) {
    const input = container.querySelector('#ckAddInput');
    const groupSel = container.querySelector('#ckAddGroup');
    const text = (input.value || '').trim();
    if (!text) { flashMessage('请输入检查项内容', 1500); return; }
    state.custom.push({ id: `c${Date.now()}`, group: groupSel.value, text });
    input.value = '';
    persist();
    renderGroups(container);
  }

  // ===== 导出 =====
  function copyMarkdown() {
    const items = flatItems();
    if (!items.length) { flashMessage('清单为空', 1500); return; }
    const groups = groupOrder();
    let md = `# 发布前检查清单\n\n`;
    groups.forEach((g) => {
      const list = items.filter((it) => it.group === g);
      if (!list.length) return;
      const done = list.filter((it) => state.checked[it.id]).length;
      md += `## ${g}（${done}/${list.length}）\n`;
      list.forEach((it) => {
        md += `- [${state.checked[it.id] ? 'x' : ' '}] ${it.text}\n`;
      });
      md += `\n`;
    });
    const total = items.length;
    const done = items.filter((it) => state.checked[it.id]).length;
    md += `> 总进度：${done}/${total}（${total ? Math.round((done / total) * 100) : 0}%）\n`;

    navigator.clipboard.writeText(md).then(() => {
      flashMessage('✓ 已复制 Markdown', 1500);
    }).catch(() => {
      flashMessage('复制失败', 1500);
    });
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

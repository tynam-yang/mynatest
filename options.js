// options.js — 设置页面

const _SUN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#FBBF24"/>
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="4" ry="4" fill="url(#sg)"/>
  <g fill="#ffffff">
    <circle cx="8" cy="8" r="2.2"/>
    <rect x="7.4" y="1.2" width="1.2" height="2.6" rx="0.6"/>
    <rect x="7.4" y="12.2" width="1.2" height="2.6" rx="0.6"/>
    <rect x="1.2" y="7.4" width="2.6" height="1.2" rx="0.6"/>
    <rect x="12.2" y="7.4" width="2.6" height="1.2" rx="0.6"/>
    <g transform="rotate(45 8 8)">
      <rect x="7.4" y="1.2" width="1.2" height="2.6" rx="0.6"/>
      <rect x="7.4" y="12.2" width="1.2" height="2.6" rx="0.6"/>
    </g>
  </g>
</svg>`.trim();

const _MOON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
  <defs>
    <linearGradient id="mg" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4F46E5"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>
  </defs>
  <rect width="16" height="16" rx="4" ry="4" fill="url(#mg)"/>
  <path d="M10.5 3.2a5 5 0 1 0 2.3 8.8A4 4 0 0 1 10.5 3.2Z" fill="#ffffff"/>
  <circle cx="3.2" cy="3.5" r="0.7" fill="#ffffff"/>
  <circle cx="12.2" cy="5.3" r="0.5" fill="#ffffff"/>
</svg>`.trim();

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  const emoji = document.getElementById('themeEmoji');
  if (emoji) emoji.innerHTML = theme === 'dark' ? _MOON_SVG : _SUN_SVG;
}

document.addEventListener('DOMContentLoaded', async () => {
  // 主题初始化（必须在 DOM 渲染前应用）
  try {
    const result = await new Promise(r => chrome.storage.local.get(['theme'], r));
    applyTheme(result.theme === 'dark' ? 'dark' : 'light');
  } catch {
    applyTheme('light');
  }
  // 主题切换按钮
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', async () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      chrome.storage.local.set({ theme: next });
    });
  }

  bindTabNav();
  await renderToolList();
  bindEvents();
});

function bindTabNav() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.dataset.panel === tab);
      });
    });
  });
}

async function renderToolList() {
  const allTools = window.MynaTools || [];
  const enabled = await window.MynaStorage.getEnabledTools(allTools);
  const order = await window.MynaStorage.getToolOrder(allTools);
  const list = document.getElementById('toolList');

  list.innerHTML = '';

  // 按存储的顺序排列工具，再按 category 分组
  const sortedTools = order
    .map(id => allTools.find(t => t.meta.id === id))
    .filter(Boolean);

  const groups = {};
  const groupOrder = [];
  sortedTools.forEach(tool => {
    const cat = tool.meta.category || 'other';
    const catName = tool.meta.categoryName || '其他';
    if (!groups[cat]) {
      groups[cat] = { name: catName, tools: [] };
      groupOrder.push(cat);
    }
    groups[cat].tools.push(tool);
  });

  groupOrder.forEach(cat => {
    const group = groups[cat];
    const groupEl = document.createElement('div');
    groupEl.className = 'tool-group';

    const headerEl = document.createElement('div');
    headerEl.className = 'tool-group-header';
    headerEl.textContent = group.name;
    groupEl.appendChild(headerEl);

    const gridEl = document.createElement('div');
    gridEl.className = 'tool-list-grid';

    group.tools.forEach((tool, idx) => {
      const checked = enabled.includes(tool.meta.id);
      const item = document.createElement('label');
      item.className = 'tool-item';
      item.dataset.id = tool.meta.id;
      const iconHtml = tool.meta.iconUrl
        ? `<img class="tool-icon" src="${tool.meta.iconUrl}" alt="${tool.meta.name}" onerror="this.style.display='none'">`
        : `<span class="tool-icon-fallback">${tool.meta.icon}</span>`;
      item.innerHTML = `
        <input type="checkbox" value="${tool.meta.id}" ${checked ? 'checked' : ''}>
        <div class="tool-info">
          <div class="tool-name">${iconHtml} ${tool.meta.name}</div>
          <div class="tool-desc">${tool.meta.desc}</div>
        </div>
        <div class="tool-order">
          <button class="tool-order-btn" data-act="up" data-id="${tool.meta.id}" ${idx === 0 ? 'disabled' : ''} title="上移">↑</button>
          <button class="tool-order-btn" data-act="down" data-id="${tool.meta.id}" ${idx === group.tools.length - 1 ? 'disabled' : ''} title="下移">↓</button>
        </div>
      `;
      gridEl.appendChild(item);
    });

    groupEl.appendChild(gridEl);
    list.appendChild(groupEl);
  });

  updateDisableState();
}

function updateDisableState() {
  const checkboxes = document.querySelectorAll('#toolList input[type="checkbox"]');
  const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;

  checkboxes.forEach(cb => {
    const item = cb.closest('.tool-item');
    if (checkedCount <= 1 && cb.checked) {
      item.classList.add('disabled');
    } else {
      item.classList.remove('disabled');
    }
  });
}

function getCurrentOrder() {
  // 从 DOM 按分组顺序提取 tool ID，组成全局顺序数组
  const ids = [];
  document.querySelectorAll('.tool-group').forEach(group => {
    group.querySelectorAll('.tool-item').forEach(item => {
      ids.push(item.dataset.id);
    });
  });
  return ids;
}

async function moveTool(id, direction) {
  const order = getCurrentOrder();
  const idx = order.indexOf(id);
  if (idx < 0) return;

  // 找同组内相邻的 tool
  // 由于 DOM 按分组渲染，相邻位置就是相邻索引
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= order.length) return;

  // 只允许同组内交换：检查两个 tool 的 category
  const allTools = window.MynaTools || [];
  const toolA = allTools.find(t => t.meta.id === order[idx]);
  const toolB = allTools.find(t => t.meta.id === order[targetIdx]);
  if (!toolA || !toolB) return;
  const catA = toolA.meta.category || 'other';
  const catB = toolB.meta.category || 'other';
  if (catA !== catB) return; // 跨组不允许移动

  // 交换
  [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];

  await window.MynaStorage.setToolOrder(order);

  // 局部刷新：重新渲染但不重新加载 storage
  await renderToolList();
}

function bindEvents() {
  // 排序按钮
  document.getElementById('toolList').addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-order-btn');
    if (!btn || btn.disabled) return;
    e.preventDefault();
    moveTool(btn.dataset.id, btn.dataset.act);
  });

  // checkbox 变化
  document.getElementById('toolList').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      const checkboxes = document.querySelectorAll('#toolList input[type="checkbox"]');
      const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
      if (checkedCount === 0) {
        e.target.checked = true;
        showStatus('至少需要选择一个工具', true);
        return;
      }
      updateDisableState();
    }
  });

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#toolList input[type="checkbox"]');
    const enabled = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);

    if (enabled.length === 0) {
      showStatus('至少需要选择一个工具', true);
      return;
    }

    const order = getCurrentOrder();
    await window.MynaStorage.setEnabledTools(enabled);
    await window.MynaStorage.setToolOrder(order);
    showStatus('✓ 设置已保存');
  });
}

function showStatus(msg, isError = false) {
  const el = document.getElementById('saveStatus');
  el.textContent = msg;
  el.classList.remove('error', 'show');
  if (isError) el.classList.add('error');
  requestAnimationFrame(() => el.classList.add('show'));
  if (!isError) {
    setTimeout(() => el.classList.remove('show'), 2000);
  }
}

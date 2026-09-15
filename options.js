// options.js — 设置页面

document.addEventListener('DOMContentLoaded', async () => {
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
  const list = document.getElementById('toolList');

  list.innerHTML = '';

  // 按 category 分组
  const groups = {};
  const groupOrder = [];
  allTools.forEach(tool => {
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

    group.tools.forEach((tool) => {
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

function bindEvents() {
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

    await window.MynaStorage.setEnabledTools(enabled);
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

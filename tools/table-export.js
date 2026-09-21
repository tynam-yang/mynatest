// tools/table-export.js — 表格/文本导出（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'table-export',
    name: '表格导出',
    desc: '页面表格一键导出 CSV / Excel / JSON，支持复制',
    iconUrl: 'icons/table-export.png',
    category: 'format',
    categoryName: '格式转换'
  };

  let currentTables = [];
  let unsubs = [];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="te-toolbar">
        <button class="btn sc-btn" id="teScanBtn">🔍 扫描页面表格</button>
        <span class="te-summary" id="teSummary" style="display:none;"></span>
      </div>
      <div class="te-tip" id="teTip">扫描当前页面中的所有 &lt;table&gt; 元素，逐个导出</div>

      <div id="teList" class="te-list" style="display:none;"></div>
    `;

    container.querySelector('#teScanBtn').addEventListener('click', () => scan(container));
  }

  function mount(context) {
    unsubs = [];
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
    currentTables = [];
  }

  // ===== 扫描 =====
  function scan(container) {
    const btn = container.querySelector('#teScanBtn');
    const tip = container.querySelector('#teTip');
    btn.disabled = true;
    btn.textContent = '扫描中…';
    tip.textContent = '正在扫描页面表格…';

    chrome.runtime.sendMessage({ type: 'table-export:extract' }, (res) => {
      void chrome.runtime?.lastError;
      btn.disabled = false;
      btn.textContent = '🔍 扫描页面表格';

      if (chrome.runtime.lastError) {
        tip.textContent = '❌ ' + chrome.runtime.lastError.message;
        return;
      }
      if (!res?.ok) {
        tip.textContent = '❌ ' + (res?.error || '扫描失败，请刷新页面后重试');
        return;
      }

      currentTables = res.tables || [];
      const list = container.querySelector('#teList');
      const summary = container.querySelector('#teSummary');

      if (!currentTables.length) {
        summary.style.display = 'none';
        list.style.display = '';
        list.innerHTML = '<div class="te-empty">未在当前页面找到表格<br><small>页面使用了非 table 标签布局时无法识别</small></div>';
        tip.textContent = '未找到表格';
        return;
      }

      summary.style.display = '';
      summary.textContent = `共 ${currentTables.length} 个表格`;
      tip.textContent = `✓ 扫描完成，共 ${currentTables.length} 个表格，选择格式导出`;

      list.style.display = '';
      list.innerHTML = currentTables.map((t, i) => buildCard(t, i)).join('');

      // 绑定导出按钮
      list.querySelectorAll('[data-te-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.teIndex, 10);
          const action = btn.dataset.teAction;
          const table = currentTables[idx];
          if (!table) return;
          handleExport(container, table, action);
        });
      });
    });
  }

  function buildCard(t, i) {
    const dimText = `${t.rowCount} 行 × ${t.colCount} 列`;
    const capText = t.caption ? ` · ${escapeHtml(truncate(t.caption, 20))}` : '';
    const hideText = t.visible ? '' : ' · 隐藏';
    const previewRows = (t.preview || []).map(r =>
      `<div class="te-preview-row">${r.map(c => `<span class="te-preview-cell">${escapeHtml(truncate(c, 24))}</span>`).join('')}</div>`
    ).join('');

    return `
      <div class="te-card">
        <div class="te-card-head">
          <span class="te-card-title">📋 表格 ${t.index}${capText}${hideText}</span>
          <span class="te-card-dim">${dimText}</span>
        </div>
        <div class="te-preview">${previewRows || '<div class="te-preview-row">（空表格）</div>'}</div>
        <div class="te-card-actions">
          <button class="btn sc-small-btn" data-te-action="csv" data-te-index="${i}">CSV</button>
          <button class="btn sc-small-btn" data-te-action="excel" data-te-index="${i}">Excel</button>
          <button class="btn sc-small-btn" data-te-action="json" data-te-index="${i}">JSON</button>
          <button class="btn sc-small-btn" data-te-action="copy" data-te-index="${i}">复制</button>
        </div>
      </div>
    `;
  }

  // ===== 导出 =====
  function handleExport(container, table, action) {
    const rows = table.rows || [];
    if (!rows.length) { flashMessage('表格为空', 1500); return; }

    const baseName = sanitizeFilename(`table-${table.index}-${Date.now()}`);

    if (action === 'csv') {
      const csv = '\uFEFF' + toCSV(rows); // BOM 保证 Excel 中文不乱码
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), baseName + '.csv');
      flashMessage('✓ 已导出 CSV', 1500);
    } else if (action === 'excel') {
      const html = toExcelHtml(rows);
      downloadBlob(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' }), baseName + '.xls');
      flashMessage('✓ 已导出 Excel', 1500);
    } else if (action === 'json') {
      const json = toJSON(rows, table.firstRowIsHeader);
      downloadBlob(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json;charset=utf-8' }), baseName + '.json');
      flashMessage('✓ 已导出 JSON', 1500);
    } else if (action === 'copy') {
      copyText(toCSV(rows).replace(/^\uFEFF/, ''));
    }
  }

  function toCSV(rows) {
    return rows.map(r => r.map(cellEscape).join(',')).join('\r\n');
  }

  function cellEscape(val) {
    const s = String(val ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toExcelHtml(rows) {
    const body = rows.map(r =>
      '<tr>' + r.map(c => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('') + '</tr>'
    ).join('');
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"></head>
<body><table border="1" cellspacing="0">${body}</table></body></html>`;
  }

  function toJSON(rows, firstRowIsHeader) {
    if (firstRowIsHeader && rows.length > 1) {
      const headers = rows[0].map((h, i) => String(h || `col${i + 1}`));
      return rows.slice(1).map(r => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = r[i] ?? ''; });
        return obj;
      });
    }
    return rows;
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      flashMessage('✓ 已复制到剪贴板', 1500);
    }).catch(() => {
      flashMessage('复制失败', 1500);
    });
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  // ===== 工具函数 =====
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function sanitizeFilename(s) {
    return s.replace(/[\\/:*?"<>|]/g, '_');
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

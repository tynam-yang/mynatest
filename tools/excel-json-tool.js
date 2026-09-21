// tools/excel-json-tool.js — Excel ↔ JSON 双向转换（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'excel-json-tool',
    name: 'Excel↔JSON 转换',
    desc: 'Excel (.xlsx/.xls/.csv) 与 JSON 双向互转，支持多 Sheet',
    iconUrl: 'icons/excel-json-tool.png',
    icon: '📊',
    category: 'format',
    categoryName: '格式转换'
  };

  const tool = {
    meta,
    render(root) {
      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2></div>

          <div class="ug-section ug-config">
            <div class="ug-section-title">📊 Excel ↔ JSON 双向转换</div>
            <div class="ru-desc">支持 .xlsx / .xls / .csv ↔ JSON；多 Sheet 时输出为对象（key 为 Sheet 名）；纯 CSV 也能识别。</div>
            <div class="ej-mode-row">
              <button id="ej-mode-excel" class="ug-btn-primary ej-mode-btn" data-mode="excel">📥 Excel → JSON</button>
              <button id="ej-mode-json" class="ru-btn-secondary ej-mode-btn" data-mode="json">📤 JSON → Excel</button>
            </div>
            <input type="file" id="ej-file-input" accept=".xlsx,.xls,.csv" style="display:none;">
          </div>

          <!-- Excel → JSON 面板 -->
          <div id="ej-panel-excel" class="ug-section">
            <div class="ug-section-title">📥 Excel → JSON</div>
            <label for="ej-file-input" id="ej-drop-zone" class="ej-drop-zone">
              <div class="ej-drop-icon">📂</div>
              <div class="ej-drop-text">点击或拖拽文件到此处</div>
              <div class="ej-drop-sub">.xlsx / .xls / .csv</div>
            </label>
            <div class="ej-option-row">
              <label class="ej-opt"><input type="checkbox" id="ej-header" checked> 首行作 JSON key</label>
              <label class="ej-opt"><input type="checkbox" id="ej-flat-single" checked> 单 Sheet 扁平化</label>
            </div>
            <div id="ej-excel-info" class="ej-info"></div>
          </div>

          <!-- JSON → Excel 面板 -->
          <div id="ej-panel-json" class="ug-section" style="display:none;">
            <div class="ug-section-title">📤 JSON → Excel</div>
            <div class="ru-desc">粘贴 JSON 数组（数组对象或数组数组都行），或多 Sheet 对象。</div>
            <details class="ej-example">
              <summary>📋 格式示例（点击展开）</summary>
              <div class="ej-example-body">
                <div><b>单 Sheet 数组对象：</b><code>[{"name":"张三","age":20}]</code></div>
                <div><b>多 Sheet 对象：</b><code>{"用户":[{"name":"张三"}], "订单":[{"id":1}]}</code></div>
              </div>
            </details>
            <textarea id="ej-json-input" class="ug-input ej-textarea" placeholder='粘贴 JSON 到这里...'></textarea>
            <div class="ej-filename-row">
              <input id="ej-filename" class="ug-input ej-filename" value="output" placeholder="文件名">
              <button id="ej-gen-excel" class="ug-btn-primary ej-gen-btn">生成 Excel 并下载</button>
            </div>
          </div>

          <!-- 结果 -->
          <div id="ej-result-section" class="ug-section ug-result-section" style="display:none;">
            <div class="ug-section-title ej-result-title">
              <span>🔎 转换结果</span>
              <div class="ej-result-actions">
                <button id="ej-copy" class="ug-btn-tiny">复制 JSON</button>
                <button id="ej-download-json" class="ug-btn-tiny">下载 .json</button>
                <button id="ej-download-csv" class="ug-btn-tiny">下载 .csv</button>
              </div>
            </div>
            <textarea id="ej-result" class="ug-input ej-textarea" readonly></textarea>
          </div>
        </div>
      `;
    },
    mount(context) {
      const { container } = context;
      const $ = id => container.querySelector('#' + id);

      function getXlsx() {
        if (window.XLSX) return window.XLSX;
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('vendor/xlsx.full.min.js');
        script.onload = () => { flashMessage('SheetJS 加载完成，请重试', 'success'); };
        script.onerror = () => { flashMessage('SheetJS 加载失败', 'warn'); };
        document.head.appendChild(script);
        return null;
      }

      // === 模式切换 ===
      const modeExcel = $('ej-mode-excel'), modeJson = $('ej-mode-json');
      const panelExcel = $('ej-panel-excel'), panelJson = $('ej-panel-json');
      function setMode(mode) {
        if (mode === 'excel') {
          panelExcel.style.display = '';
          panelJson.style.display = 'none';
          modeExcel.classList.add('ug-btn-primary'); modeExcel.classList.remove('ru-btn-secondary');
          modeJson.classList.remove('ug-btn-primary'); modeJson.classList.add('ru-btn-secondary');
        } else {
          panelExcel.style.display = 'none';
          panelJson.style.display = '';
          modeJson.classList.add('ug-btn-primary'); modeJson.classList.remove('ru-btn-secondary');
          modeExcel.classList.remove('ug-btn-primary'); modeExcel.classList.add('ru-btn-secondary');
        }
      }
      [modeExcel, modeJson].forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

      // === Excel → JSON ===
      const fileInput = $('ej-file-input');
      const headerChk = $('ej-header'), flatSingleChk = $('ej-flat-single');
      const excelInfo = $('ej-excel-info');
      const resultSection = $('ej-result-section'), resultEl = $('ej-result');
      const dropZone = $('ej-drop-zone');

      async function handleFile(file) {
        const XLSX = getXlsx();
        if (!XLSX) return flashMessage('SheetJS 加载中，请稍候再试', 'warn');
        try {
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: 'array' });
          const header = headerChk.checked, flatSingle = flatSingleChk.checked;
          const sheets = {}, sheetMeta = [];
          let totalRows = 0, totalCols = 0;
          wb.SheetNames.forEach(name => {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: header ? 1 : undefined, defval: '' });
            sheets[name] = rows;
            totalRows += rows.length;
            const cols = rows[0] ? (Array.isArray(rows[0]) ? rows[0].length : Object.keys(rows[0]).length) : 0;
            totalCols = Math.max(totalCols, cols);
            sheetMeta.push(`${name}(${rows.length}行${cols}列)`);
          });
          let jsonData = (flatSingle && wb.SheetNames.length === 1) ? Object.values(sheets)[0] : sheets;
          resultEl.value = JSON.stringify(jsonData, null, 2);
          resultSection.style.display = '';
          excelInfo.textContent = `✅ ${file.name} · ${wb.SheetNames.length} Sheet · ${totalRows}行×${totalCols}列 · ${sheetMeta.join(' / ')}`;
          flashMessage('解析成功', 'success');
        } catch (err) {
          flashMessage('解析失败：' + err.message, 'warn');
        }
        fileInput.value = '';
      }

      fileInput.addEventListener('change', e => { const f = e.target.files?.[0]; if (f) handleFile(f); });

      // 拖拽高亮
      ['dragenter', 'dragover'].forEach(ev => dropZone.addEventListener(ev, e => {
        e.preventDefault(); dropZone.classList.add('ej-drop-active');
      }));
      ['dragleave', 'drop'].forEach(ev => dropZone.addEventListener(ev, e => {
        e.preventDefault(); dropZone.classList.remove('ej-drop-active');
      }));
      dropZone.addEventListener('drop', e => {
        const f = e.dataTransfer?.files?.[0];
        if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) handleFile(f);
        else if (f) flashMessage('只支持 .xlsx/.xls/.csv', 'warn');
      });
      // 整面板也接收拖拽
      container.addEventListener('dragover', e => e.preventDefault());
      container.addEventListener('drop', e => {
        const f = e.dataTransfer?.files?.[0];
        if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) handleFile(f);
      });

      // === JSON → Excel ===
      const jsonInput = $('ej-json-input'), filenameEl = $('ej-filename'), genExcel = $('ej-gen-excel');
      genExcel.addEventListener('click', () => {
        const XLSX = getXlsx();
        if (!XLSX) return flashMessage('SheetJS 加载中', 'warn');
        const raw = jsonInput.value.trim();
        if (!raw) return flashMessage('请先粘贴 JSON', 'warn');
        let data; try { data = JSON.parse(raw); } catch(e) { return flashMessage('JSON 解析失败：' + e.message, 'warn'); }
        try {
          const wb = XLSX.utils.book_new();
          if (Array.isArray(data)) {
            const rows = XLSX.utils.json_to_sheet(data, { header: Array.isArray(data[0]) ? undefined : 1 });
            XLSX.utils.book_append_sheet(wb, rows, 'Sheet1');
          } else if (data && typeof data === 'object') {
            Object.entries(data).forEach(([name, rows]) => {
              if (!Array.isArray(rows)) return;
              const sh = XLSX.utils.json_to_sheet(rows, { header: Array.isArray(rows[0]) ? undefined : 1 });
              XLSX.utils.book_append_sheet(wb, sh, name.slice(0, 31));
            });
          } else {
            return flashMessage('JSON 必须是数组或对象', 'warn');
          }
          const fname = (filenameEl.value.trim() || 'output') + '.xlsx';
          XLSX.writeFile(wb, fname);
          flashMessage('生成成功：' + fname, 'success');
        } catch(e) { flashMessage('生成 Excel 失败：' + e.message, 'warn'); }
      });

      // === 结果操作 ===
      $('ej-copy').addEventListener('click', async () => {
        if (!resultEl.value) return flashMessage('无结果可复制', 'warn');
        await navigator.clipboard.writeText(resultEl.value);
        flashMessage('已复制', 'success');
      });
      $('ej-download-json').addEventListener('click', () => {
        if (!resultEl.value) return flashMessage('无结果', 'warn');
        const blob = new Blob([resultEl.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = (filenameEl.value.trim() || 'output') + '.json'; a.click();
        URL.revokeObjectURL(url);
      });
      $('ej-download-csv').addEventListener('click', () => {
        const XLSX = getXlsx();
        if (!XLSX || !resultEl.value) return;
        let data; try { data = JSON.parse(resultEl.value); } catch { return; }
        let rows = Array.isArray(data) ? data : (Object.values(data)[0] || []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: Array.isArray(rows[0]) ? undefined : 1 }), 'Sheet1');
        XLSX.writeFile(wb, (filenameEl.value.trim() || 'output') + '.csv', { bookType: 'csv' });
      });
    }
  };

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

// tools/file-generator.js — 模拟文件生成工具（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'file-generator',
    name: '文件生成',
    desc: '生成指定大小、类型的测试文件，一键下载；支持文本、二进制、图片等多种文件格式',
    icon: '📄',
    iconUrl: 'icons/file-generator.png',
    category: 'data-gen',
    categoryName: '数据工具'
  };

  // 默认文件类型（按分类）
  const FILE_TYPES = [
    { cat: '文本', ext: 'txt',   mime: 'text/plain',           label: 'TXT 纯文本' },
    { cat: '文本', ext: 'csv',   mime: 'text/csv',              label: 'CSV 表格' },
    { cat: '文本', ext: 'json',  mime: 'application/json',      label: 'JSON 数据' },
    { cat: '文本', ext: 'xml',   mime: 'application/xml',       label: 'XML 数据' },
    { cat: '文本', ext: 'log',   mime: 'text/plain',           label: 'LOG 日志' },
    { cat: '文本', ext: 'md',    mime: 'text/markdown',        label: 'Markdown' },
    { cat: '文本', ext: 'html',  mime: 'text/html',            label: 'HTML 页面' },
    { cat: '二进制', ext: 'bin', mime: 'application/octet-stream', label: 'BIN 二进制' },
    { cat: '二进制', ext: 'dat', mime: 'application/octet-stream', label: 'DAT 数据' },
    { cat: '二进制', ext: 'tmp', mime: 'application/octet-stream', label: 'TMP 临时' },
    { cat: '图片', ext: 'bmp',   mime: 'image/bmp',             label: 'BMP 图片' },
    { cat: '压缩', ext: 'zip',   mime: 'application/zip',      label: 'ZIP 压缩' },
    { cat: '其他', ext: 'custom', mime: 'application/octet-stream', label: '自定义扩展名' }
  ];

  // 常用文件扩展名（自定义时参考）
  const COMMON_EXTS = ['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg', 'gif', 'mp3', 'mp4', 'wav', 'avi', 'mov', 'sql', 'yml', 'ini', 'cfg', 'py', 'js', 'ts', 'java', 'go', 'c', 'cpp', 'h', 'rb', 'php'];

  // 单位换算
  const UNITS = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  function toBytes(num, unit) { return Math.round(num * UNITS[unit]); }
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  }

  // 简易随机文本（用于文本类文件）
  const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum '.split(' ');
  function randomText(len) {
    let s = '';
    while (s.length < len) {
      const w = WORDS[Math.floor(Math.random() * WORDS.length)];
      s += w + ' ';
    }
    return s.slice(0, len);
  }

  // ========== 注册 ==========
  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({
    meta,

    render(container) {
      container.innerHTML = `
        <div class="fg-wrap">
          <div class="lc-header"><h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2></div>

          <div class="fg-section">
            <div class="fg-row">
              <label class="fg-label">文件名</label>
              <input type="text" id="fgName" class="fg-input" placeholder="file_001" value="file_${Date.now().toString().slice(-6)}">
              <span class="fg-hint">不含扩展名，留空自动生成</span>
            </div>

            <div class="fg-row">
              <label class="fg-label">文件大小</label>
              <input type="number" id="fgSize" class="fg-input fg-size-num" min="1" max="1024" value="100">
              <select id="fgUnit" class="fg-input fg-size-unit">
                <option value="B">B</option>
                <option value="KB" selected>KB</option>
                <option value="MB">MB</option>
                <option value="GB">GB</option>
              </select>
              <span class="fg-hint" id="fgSizeHint">= 102400 字节 ≈ 100 KB</span>
            </div>

            <div class="fg-row">
              <label class="fg-label">文件类型</label>
              <select id="fgType" class="fg-input fg-select-type">
                ${FILE_TYPES.map((t, i) => `<option value="${i}" data-ext="${t.ext}" data-mime="${t.mime}" data-cat="${t.cat}">${t.label}</option>`).join('')}
              </select>
            </div>

            <div class="fg-row fg-custom-ext-row" style="display:none">
              <label class="fg-label">自定义扩展名</label>
              <input type="text" id="fgCustomExt" class="fg-input" placeholder="比如 pdf / mp4 / docx" style="flex:none;width:140px">
              <span class="fg-hint">不带点号</span>
            </div>

            <div class="fg-row">
              <label class="fg-label">内容类型</label>
              <select id="fgContent" class="fg-input fg-select-content">
                <option value="text">文本内容（可预览）</option>
                <option value="binary" selected>二进制数据</option>
              </select>
              <span class="fg-hint">文本类型默认文本，其他默认二进制</span>
            </div>
          </div>

          <div class="fg-actions">
            <button id="fgGen" class="fg-btn-primary">生成文件</button>
            <button id="fgDownload" class="fg-btn-secondary" disabled>下载</button>
            <button id="fgPreview" class="fg-btn-secondary" disabled>预览</button>
          </div>

          <div class="fg-info" id="fgInfo" style="display:none"></div>
        </div>
      `;
    },

    mount(ctx) {
      const root = ctx?.container || document;

      // 单位切换 → 更新大小提示
      root.querySelector('#fgSize').addEventListener('input', () => updateSizeHint(root));
      root.querySelector('#fgUnit').addEventListener('change', () => updateSizeHint(root));

      // 文件类型切换 → 是否显示自定义扩展名
      root.querySelector('#fgType').addEventListener('change', (e) => {
        const opt = e.target.options[e.target.selectedIndex];
        const cat = opt.dataset.cat;
        const row = root.querySelector('.fg-custom-ext-row');
        if (cat === '其他') row.style.display = ''; else row.style.display = 'none';

        // 自动同步内容类型：文本类默认 text，其他默认 binary
        const contentSel = root.querySelector('#fgContent');
        contentSel.value = cat === '文本' ? 'text' : 'binary';
      });

      // 生成按钮
      let lastBlob = null;
      let lastFileName = '';
      root.querySelector('#fgGen').addEventListener('click', async () => {
        try {
          lastBlob = await generateFile(root);
          const name = root.querySelector('#fgName').value || 'file';
          const ext = getExt(root);
          lastFileName = name + '.' + ext;

          const info = root.querySelector('#fgInfo');
          info.style.display = '';
          info.innerHTML = `
            <div class="fg-info-item">✅ 生成成功</div>
            <div class="fg-info-item">📦 ${lastFileName} (${formatSize(lastBlob.size)})</div>
          `;

          // 启用下载按钮
          root.querySelector('#fgDownload').disabled = false;

          // 启用预览按钮（文本类才能预览）
          const contentSel = root.querySelector('#fgContent').value;
          const cat = root.querySelector('#fgType').selectedOptions[0].dataset.cat;
          root.querySelector('#fgPreview').disabled = !(contentSel === 'text' || cat === '文本');
        } catch (err) {
          flashMessage('❌ ' + err.message, 'error');
        }
      });

      // 下载按钮
      root.querySelector('#fgDownload').addEventListener('click', () => {
        if (!lastBlob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(lastBlob);
        a.download = lastFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      // 预览按钮
      root.querySelector('#fgPreview').addEventListener('click', () => {
        if (!lastBlob) return;
        const previewUrl = URL.createObjectURL(lastBlob);
        window.open(previewUrl, '_blank');
      });
    }
  });

  function updateSizeHint(root) {
    const num = parseFloat(root.querySelector('#fgSize').value) || 0;
    const unit = root.querySelector('#fgUnit').value;
    const bytes = toBytes(num, unit);
    root.querySelector('#fgSizeHint').textContent = `= ${bytes.toLocaleString()} 字节 ≈ ${formatSize(bytes)}`;
  }

  function getExt(root) {
    const sel = root.querySelector('#fgType');
    const opt = sel.options[sel.selectedIndex];
    if (opt.dataset.cat === '其他') {
      const custom = root.querySelector('#fgCustomExt').value.trim();
      if (custom) return custom.replace(/^\./, '');
    }
    return opt.dataset.ext;
  }

  function getMime(root) {
    const sel = root.querySelector('#fgType');
    const opt = sel.options[sel.selectedIndex];
    if (opt.dataset.cat === '其他') return 'application/octet-stream';
    return opt.dataset.mime;
  }

  async function generateFile(root) {
    const num = parseFloat(root.querySelector('#fgSize').value);
    const unit = root.querySelector('#fgUnit').value;
    if (!num || num <= 0) throw new Error('请输入有效的文件大小');
    const bytes = toBytes(num, unit);
    if (bytes <= 0) throw new Error('文件大小必须大于 0 字节');
    if (bytes > 1024 * 1024 * 1024) throw new Error('暂不支持超过 1GB 的文件');

    const ext = getExt(root).toLowerCase();
    const mime = getMime(root);
    const content = root.querySelector('#fgContent').value;

    let blob;
    if (content === 'text' || mime.startsWith('text/')) {
      // 文本内容
      if (ext === 'json') {
        // JSON 格式
        const target = Math.min(bytes, 100 * 1024); // JSON 上限 100KB 防崩
        const obj = { generated: true, size: bytes, timestamp: Date.now(), data: [] };
        const item = { id: 1, name: 'test', value: randomText(40) };
        while (JSON.stringify(obj).length < target) {
          obj.data.push({ id: obj.data.length + 1, name: randomText(10), value: randomText(30), num: Math.floor(Math.random() * 1000) });
        }
        blob = new Blob([JSON.stringify(obj, null, 2).slice(0, target)], { type: 'application/json' });
      } else if (ext === 'csv') {
        const target = Math.min(bytes, 100 * 1024);
        let s = 'id,name,email,phone,city\n';
        let i = 0;
        while (s.length < target) {
          i++;
          s += `${i},user_${i},user${i}@test.com,138${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')},beijing\n`;
        }
        blob = new Blob([s.slice(0, target)], { type: 'text/csv' });
      } else if (ext === 'xml') {
        const target = Math.min(bytes, 100 * 1024);
        let s = '<?xml version="1.0"?>\n<root>\n';
        let i = 0;
        while (s.length < target - 20) {
          i++;
          s += `  <item id="${i}"><name>user_${i}</name><value>${randomText(20)}</value></item>\n`;
        }
        s += '</root>';
        blob = new Blob([s.slice(0, target)], { type: 'application/xml' });
      } else if (ext === 'html') {
        const target = Math.min(bytes, 100 * 1024);
        const body = randomText(target - 200);
        const s = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Generated File</title></head><body><h1>测试文件</h1><p>${body}</p></body></html>`;
        blob = new Blob([s.slice(0, target)], { type: 'text/html' });
      } else {
        // 普通文本
        const text = randomText(bytes);
        blob = new Blob([text], { type: 'text/plain' });
      }
    } else {
      // 二进制内容 — 分块生成，避免大文件内存峰值
      const CHUNK = 256 * 1024; // 256KB/chunk
      const chunks = [];
      let remaining = bytes;
      while (remaining > 0) {
        const size = Math.min(CHUNK, remaining);
        const buf = new Uint8Array(size);
        if (ext === 'bmp' && chunks.length === 0) {
          // BMP 简单 BMP：header + random pixel
          const header = new Uint8Array([66, 77, size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff, 0, 0, 0, 0, 54, 0, 0, 0, 40, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 24, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
          for (let i = 0; i < header.length; i++) buf[i] = header[i];
          for (let i = header.length; i < size; i++) buf[i] = Math.floor(Math.random() * 256);
        } else {
          for (let i = 0; i < size; i++) buf[i] = Math.floor(Math.random() * 256);
        }
        chunks.push(buf);
        remaining -= size;
      }
      blob = new Blob(chunks, { type: mime });
    }

    // 如果生成的 blob 大小和请求大小差异超过 1%，在文件名里加提示
    if (Math.abs(blob.size - bytes) / bytes > 0.01 && content !== 'text') {
      // 二进制是精确的；文本类有 JSON/CSV 等格式约束可能略有差异，不报错
    }

    return blob;
  }
})();

// tools/code-generator.js — 请求转代码工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const escapeHtml = window.MynaUtils.escapeHtml;

  const meta = {
    id: 'code-generator',
    name: '请求转代码',
    desc: '捕获请求一键生成 cURL、fetch、axios、Python requests、Playwright',
    iconUrl: 'icons/code-generator.png',
    category: 'network',
    categoryName: '网络工具'
  };

  // 浏览器自动注入的请求头，默认过滤掉
  const BROWSER_HEADERS = new Set([
    'host', 'connection', 'cache-control', 'sec-ch-ua', 'sec-ch-ua-mobile',
    'sec-ch-ua-platform', 'upgrade-insecure-requests', 'user-agent',
    'accept', 'sec-fetch-site', 'sec-fetch-mode', 'sec-fetch-user',
    'sec-fetch-dest', 'accept-encoding', 'accept-language', 'origin',
    'referer'
  ]);

  let pendingCapture = false;
  let captureOff = null;
  let lastPayload = null;

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="cg-section">
        <div class="cg-section-head">
          <span class="cg-section-title">捕获请求</span>
          <button class="btn cg-capture-btn" id="cgCaptureBtn">📌 捕获请求</button>
        </div>
        <div class="cg-options">
          <label><input type="checkbox" id="cgFilterBrowser" checked> 过滤浏览器自动注入的请求头</label>
          <label><input type="checkbox" id="cgIncludeEmpty" checked> 包含空值请求头</label>
        </div>
      </div>

      <div class="cg-tabs" id="cgTabs" style="display:none;">
        <div class="cg-tab-bar">
          <button class="cg-tab-btn active" data-lang="curl">cURL</button>
          <button class="cg-tab-btn" data-lang="fetch">fetch</button>
          <button class="cg-tab-btn" data-lang="axios">axios</button>
          <button class="cg-tab-btn" data-lang="python">Python requests</button>
          <button class="cg-tab-btn" data-lang="playwright">Playwright</button>
        </div>
        <div class="cg-tab-content">
          <div class="cg-code-head">
            <span class="cg-code-title" id="cgCodeTitle">cURL</span>
            <div class="cg-code-actions">
              <button class="btn" id="cgCopyBtn">📋 复制</button>
            </div>
          </div>
          <pre class="cg-code-pre" id="cgCodePre"></pre>
        </div>
      </div>

      <div class="cg-empty" id="cgEmpty">
        <div class="cg-empty-icon">📡</div>
        <div class="cg-empty-text">点击「捕获请求」，然后在页面上触发一个接口请求</div>
      </div>
    `;
  }

  function mount(context) {
    pendingCapture = false;
    lastPayload = null;

    const c = context.container;
    let currentLang = 'curl';

    // 捕获按钮
    const captureBtn = c.querySelector('#cgCaptureBtn');
    captureBtn?.addEventListener('click', () => {
      if (pendingCapture) {
        pendingCapture = false;
        captureBtn.classList.remove('active');
        captureBtn.textContent = '📌 捕获请求';
        flashMessage('已取消等待');
        return;
      }
      pendingCapture = true;
      captureBtn.classList.add('active');
      captureBtn.textContent = '⏳ 等待中...';
      flashMessage('请在页面上触发一个接口请求...', 3000);
    });

    captureOff = context.events.on('network:request', (payload) => {
      if (!pendingCapture) return;
      pendingCapture = false;
      captureBtn?.classList.remove('active');
      if (captureBtn) captureBtn.textContent = '📌 捕获请求';

      lastPayload = payload;
      renderAll(c, currentLang);
      flashMessage('✓ 已捕获请求', 1500);
    });

    // Tab 切换
    c.querySelectorAll('.cg-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        c.querySelectorAll('.cg-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLang = btn.dataset.lang;
        renderAll(c, currentLang);
      });
    });

    // 复制按钮
    c.querySelector('#cgCopyBtn')?.addEventListener('click', () => {
      const pre = c.querySelector('#cgCodePre');
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent).then(() => {
        flashMessage('✓ 已复制到剪贴板', 1500);
      }).catch(() => {
        // 兜底：旧 API
        const range = document.createRange();
        range.selectNode(pre);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        try {
          document.execCommand('copy');
          flashMessage('✓ 已复制到剪贴板', 1500);
        } catch {
          flashMessage('复制失败，请手动选择复制', true);
        }
        window.getSelection().removeAllRanges();
      });
    });

    // 选项变更时重新渲染
    c.querySelector('#cgFilterBrowser')?.addEventListener('change', () => lastPayload && renderAll(c, currentLang));
    c.querySelector('#cgIncludeEmpty')?.addEventListener('change', () => lastPayload && renderAll(c, currentLang));

    return () => { if (captureOff) captureOff(); };
  }

  function cleanup() {
    pendingCapture = false;
    lastPayload = null;
  }

  // ============ 工具函数 ============

  function parseHeaders(raw) {
    if (!raw) return {};
    let obj = raw;
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw); } catch { obj = {}; }
    }
    const result = {};
    for (const [k, v] of Object.entries(obj || {})) {
      result[k.toLowerCase()] = String(v);
    }
    return result;
  }

  function getFilteredHeaders(c, headers) {
    const filterBrowser = c.querySelector('#cgFilterBrowser')?.checked !== false;
    const includeEmpty = c.querySelector('#cgIncludeEmpty')?.checked !== false;
    const result = {};
    for (const [k, v] of Object.entries(headers)) {
      if (filterBrowser && BROWSER_HEADERS.has(k.toLowerCase())) continue;
      if (!includeEmpty && (!v || v.trim() === '')) continue;
      result[k] = v;
    }
    return result;
  }

  function parseBody(raw) {
    if (!raw) return { raw: '', json: null, isJson: false };
    const str = String(raw);
    const r = window.MynaDiff?.parseJSONRobust?.(str);
    if (r?.ok) return { raw: str, json: r.data, isJson: true };
    return { raw: str, json: null, isJson: false };
  }

  // Shell 单引号转义（cURL）
  function shellEscape(str) {
    return `'${String(str).replace(/'/g, "'\\''")}'`;
  }

  // JS 字符串转义
  function jsEscape(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // Python 字符串转义
  function pyEscape(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // 将 JS 对象转为 Python dict/list/字面量（按类型转换，避免字符串内的 null/true/false 被误替换）
  function jsonToPython(obj, indentLevel = 0) {
    const pad = '  '.repeat(indentLevel);
    const innerPad = '  '.repeat(indentLevel + 1);

    if (obj === null) return 'None';
    if (obj === true) return 'True';
    if (obj === false) return 'False';
    if (typeof obj === 'number') return JSON.stringify(obj);  // 含 NaN/Infinity 处理
    if (typeof obj === 'string') return JSON.stringify(obj);  // JSON 字符串本身合法 Python
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.map(v => innerPad + jsonToPython(v, indentLevel + 1));
      return '[\n' + items.join(',\n') + '\n' + pad + ']';
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      const items = keys.map(k => {
        const keyStr = JSON.stringify(k);  // 字符串 key 用双引号
        return innerPad + keyStr + ': ' + jsonToPython(obj[k], indentLevel + 1);
      });
      return '{\n' + items.join(',\n') + '\n' + pad + '}';
    }
    return JSON.stringify(obj);
  }

  // ============ 渲染 ============

  function renderAll(c, lang) {
    if (!lastPayload) return;

    const empty = c.querySelector('#cgEmpty');
    const tabs = c.querySelector('#cgTabs');
    if (empty) empty.style.display = 'none';
    if (tabs) tabs.style.display = 'block';

    const headers = parseHeaders(lastPayload.requestHeaders);
    const filtered = getFilteredHeaders(c, headers);
    const bodyInfo = parseBody(lastPayload.requestBody);

    const generators = {
      curl: () => genCurl(lastPayload, filtered, bodyInfo),
      fetch: () => genFetch(lastPayload, filtered, bodyInfo),
      axios: () => genAxios(lastPayload, filtered, bodyInfo),
      python: () => genPython(lastPayload, filtered, bodyInfo),
      playwright: () => genPlaywright(lastPayload, filtered, bodyInfo)
    };

    const titles = {
      curl: 'cURL',
      fetch: 'JavaScript fetch',
      axios: 'JavaScript axios',
      python: 'Python requests',
      playwright: 'Playwright (Python)'
    };

    const code = generators[lang]?.() || '';
    const pre = c.querySelector('#cgCodePre');
    const title = c.querySelector('#cgCodeTitle');
    if (pre) pre.textContent = code;
    if (title) title.textContent = titles[lang] || lang;
  }

  // ============ 生成器 ============

  function genCurl(payload, headers, bodyInfo) {
    const parts = ['curl -X', payload.method || 'GET'];
    parts.push(shellEscape(payload.url));

    for (const [k, v] of Object.entries(headers)) {
      parts.push('-H', shellEscape(`${k}: ${v}`));
    }

    if (bodyInfo.raw) {
      parts.push('--data-raw', shellEscape(bodyInfo.raw));
    }

    // 每行一个参数，便于阅读
    return parts.join(' \\\n  ');
  }

  function genFetch(payload, headers, bodyInfo) {
    const method = (payload.method || 'GET').toUpperCase();
    const url = payload.url;

    let code = `const url = ${JSON.stringify(url)};\n`;
    code += `const options = {\n`;
    code += `  method: '${method}',\n`;

    if (Object.keys(headers).length > 0) {
      code += `  headers: ${JSON.stringify(headers, null, 2)},\n`;
    }

    if (bodyInfo.raw && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (bodyInfo.isJson) {
        code += `  body: JSON.stringify(${JSON.stringify(bodyInfo.json, null, 2)}),\n`;
      } else {
        code += `  body: ${JSON.stringify(bodyInfo.raw)},\n`;
      }
    }

    code += `};\n\n`;
    code += `fetch(url, options)\n`;
    code += `  .then(res => res.json())\n`;
    code += `  .then(data => console.log(data))\n`;
    code += `  .catch(err => console.error(err));\n`;

    return code;
  }

  function genAxios(payload, headers, bodyInfo) {
    const method = (payload.method || 'GET').toLowerCase();
    const url = payload.url;

    let code = `import axios from 'axios';\n\n`;
    code += `axios.${method}(`;
    code += `\n  ${JSON.stringify(url)}`;

    if (Object.keys(headers).length > 0 || (bodyInfo.raw && ['post', 'put', 'patch', 'delete'].includes(method))) {
      code += `,\n`;
      const config = {};
      if (Object.keys(headers).length > 0) config.headers = headers;
      if (bodyInfo.raw && ['post', 'put', 'patch', 'delete'].includes(method)) {
        config.data = bodyInfo.isJson ? bodyInfo.json : bodyInfo.raw;
      }
      const indent = '  ';
      code += indent + JSON.stringify(config, null, 2).split('\n').join('\n' + indent);
    }

    code += `\n)\n`;
    code += `  .then(res => console.log(res.data))\n`;
    code += `  .catch(err => console.error(err));\n`;

    return code;
  }

  function genPython(payload, headers, bodyInfo) {
    const method = (payload.method || 'GET').toUpperCase();
    const url = payload.url;

    let code = `import requests\n\n`;
    code += `url = ${JSON.stringify(url)}\n`;

    if (Object.keys(headers).length > 0) {
      code += `headers = ${jsonToPython(headers)}\n`;
    }

    let args = ['url'];
    if (Object.keys(headers).length > 0) args.push('headers=headers');

    if (bodyInfo.raw && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (bodyInfo.isJson) {
        code += `json_data = ${jsonToPython(bodyInfo.json)}\n`;
        args.push('json=json_data');
      } else {
        code += `data = ${JSON.stringify(bodyInfo.raw)}\n`;
        args.push('data=data');
      }
    }

    code += `\nresponse = requests.${method.toLowerCase()}(${args.join(', ')})\n`;
    code += `print(response.status_code)\n`;
    code += `print(response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text)\n`;

    return code;
  }

  function genPlaywright(payload, headers, bodyInfo) {
    const method = (payload.method || 'GET').toUpperCase();
    const url = payload.url;

    let code = `from playwright.sync_api import sync_playwright\n\n`;
    code += `with sync_playwright() as p:\n`;
    code += `    browser = p.chromium.launch()\n`;
    code += `    page = browser.new_page()\n\n`;

    // 使用 page.request API 发请求（更灵活）
    const indent = '    ';
    code += `${indent}response = page.request.fetch(\n`;
    code += `${indent}    ${JSON.stringify(url)},\n`;
    code += `${indent}    method=${JSON.stringify(method)},\n`;

    const options = {};
    if (Object.keys(headers).length > 0) options.headers = headers;
    if (bodyInfo.raw && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (bodyInfo.isJson) {
        options.data = bodyInfo.json;
      } else {
        options.data = bodyInfo.raw;
      }
    }

    const optStr = jsonToPython(options);
    const optLines = optStr.split('\n');
    for (let i = 0; i < optLines.length; i++) {
      const line = optLines[i];
      code += `${indent}    ${line}\n`;
    }

    code += `${indent})\n\n`;
    code += `${indent}print(response.status)\n`;
    code += `${indent}print(response.json() if 'application/json' in response.headers.get('content-type', '') else response.text())\n\n`;
    code += `${indent}browser.close()\n`;

    return code;
  }

  // 注册到全局
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

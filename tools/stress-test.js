// tools/stress-test.js — 轻量压测工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const escapeHtml = window.MynaUtils.escapeHtml || ((s) => String(s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])));

  const meta = {
    id: 'stress-test',
    name: '轻量压测',
    desc: '对选中接口发起多次请求，统计响应时间、成功率，支持响应断言',
    icon: '📈',
    iconUrl: 'icons/stress-test.png',
    category: 'test',
    categoryName: '测试工具'
  };

  let running = false;
  let results = [];
  let pendingCapture = false;
  let captureOff = null;

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> 轻量压测</h2>

      <!-- 基本配置 -->
      <div class="st-section">
        <div class="st-section-head">
          <span class="st-section-title">接口配置</span>
          <button class="btn st-capture-btn" id="stCaptureBtn">📌 捕获接口</button>
        </div>

        <div class="st-row">
          <select id="stMethod" class="st-method">
            <option>GET</option><option>POST</option><option>PUT</option>
            <option>DELETE</option><option>PATCH</option><option>HEAD</option>
          </select>
          <input type="text" id="stUrl" class="st-url" placeholder="https://example.com/api/xxx">
        </div>

        <div class="st-block" id="stHeadersBlock">
          <div class="st-block-head">
            <span class="st-block-title">请求 Headers</span>
            <span class="st-toggle" data-target="stHeadersBody">展开 / 收起</span>
          </div>
          <div class="st-block-body" id="stHeadersBody" style="display:none;">
            <textarea id="stHeaders" rows="3" placeholder='{"Content-Type": "application/json", "Authorization": "Bearer xxx"}'></textarea>
          </div>
        </div>

        <div class="st-block" id="stBodyBlock" style="display:none;">
          <div class="st-block-head">
            <span class="st-block-title">请求 Body</span>
            <span class="st-toggle" data-target="stBodyBody">展开 / 收起</span>
          </div>
          <div class="st-block-body" id="stBodyBody">
            <textarea id="stBody" rows="3" placeholder='{"key": "value"}'></textarea>
          </div>
        </div>
      </div>

      <!-- 压测参数 -->
      <div class="st-section">
        <div class="st-section-title">压测参数</div>
        <div class="st-param-row">
          <label>次数</label>
          <input type="number" id="stCount" value="5" min="1" max="500">
          <label>并发</label>
          <input type="number" id="stConcurrency" value="1" min="1" max="500">
        </div>
      </div>

      <!-- 断言 -->
      <div class="st-section">
        <div class="st-section-head">
          <span class="st-section-title">响应断言</span>
          <span class="st-toggle" data-target="stAssertHelp">语法说明</span>
        </div>
        <textarea id="stAsserts" rows="3" placeholder="status == 200&#10;$.code == 0&#10;body contains success"></textarea>
        <div class="st-assert-help" id="stAssertHelp" style="display:none;">
          <div class="st-assert-rule">
            <div class="st-assert-ex">status == 200</div>
            <div class="st-assert-desc">断言 HTTP 状态码</div>
          </div>
          <div class="st-assert-rule">
            <div class="st-assert-ex">status in 200,201,204</div>
            <div class="st-assert-desc">状态码是其中之一</div>
          </div>
          <div class="st-assert-rule">
            <div class="st-assert-ex">$.data.total > 0</div>
            <div class="st-assert-desc">JSONPath 读取响应字段后比较，支持 == != > < >= <=</div>
          </div>
          <div class="st-assert-rule">
            <div class="st-assert-ex">body contains 成功</div>
            <div class="st-assert-desc">响应体包含某段文本</div>
          </div>
          <div class="st-assert-rule">
            <div class="st-assert-ex">header content-type contains json</div>
            <div class="st-assert-desc">响应头包含某段文本</div>
          </div>
          <div class="st-assert-rule">
            <div class="st-assert-ex">$.list[0].id exists</div>
            <div class="st-assert-desc">字段存在（非 null/undefined）</div>
          </div>
        </div>
      </div>

      <!-- 操作栏 -->
      <div class="st-actions">
        <button class="btn primary" id="stStartBtn">▶ 开始压测</button>
        <button class="btn danger" id="stStopBtn" disabled>■ 停止</button>
        <button class="btn" id="stReportBtn" disabled>📄 下载报告</button>
      </div>

      <div class="st-progress" id="stProgress" style="display:none;">
        <div id="stProgressText">0 / 0</div>
        <div class="st-progress-bar"><div class="st-progress-fill" id="stProgressFill" style="width:0%"></div></div>
      </div>

      <div class="st-result" id="stResult" style="display:none;">
        <div class="st-stats">
          <div class="stat-card"><div class="stat-value" id="stStatTotal">-</div><div class="stat-label">总耗时</div></div>
          <div class="stat-card success"><div class="stat-value" id="stStatSuccess">-</div><div class="stat-label">成功率</div></div>
          <div class="stat-card"><div class="stat-value" id="stStatAvg">-</div><div class="stat-label">平均耗时</div></div>
          <div class="stat-card"><div class="stat-value" id="stStatMin">-</div><div class="stat-label">最小耗时</div></div>
          <div class="stat-card"><div class="stat-value" id="stStatMax">-</div><div class="stat-label">最大耗时</div></div>
          <div class="stat-card warning"><div class="stat-value" id="stStatP50">-</div><div class="stat-label">P50 (P90/P99)</div></div>
          <div class="stat-card"><div class="stat-value" id="stStatAssert">-</div><div class="stat-label">断言通过率</div></div>
          <div class="stat-card"><div class="stat-value" id="stStatRps">-</div><div class="stat-label">吞吐量 (RPS)</div></div>
        </div>
        <div class="st-history" id="stHistory"></div>
      </div>
    `;
  }

  function mount(context) {
    running = false;
    results = [];
    pendingCapture = false;

    const c = context.container;

    // Method 变化控制 body 显示
    const methodSel = c.querySelector('#stMethod');
    const bodyBlock = c.querySelector('#stBodyBlock');
    methodSel?.addEventListener('change', () => {
      bodyBlock.style.display = ['POST', 'PUT', 'PATCH'].includes(methodSel.value) ? 'block' : 'none';
    });

    // 数量输入自动 clamp
    ['#stCount', '#stConcurrency'].forEach(sel => {
      const input = c.querySelector(sel);
      if (!input) return;
      input.addEventListener('input', () => {
        const val = parseInt(input.value, 10);
        if (isNaN(val)) return;
        const max = parseInt(input.max, 10) || 500;
        const min = parseInt(input.min, 10) || 1;
        if (val > max) input.value = max;
        if (val < min) input.value = min;
      });
    });

    // 块展开/收起
    c.querySelectorAll('.st-toggle').forEach(t => {
      t.addEventListener('click', () => {
        const target = c.querySelector('#' + t.dataset.target);
        if (target) target.style.display = target.style.display === 'none' ? 'block' : 'none';
      });
    });

    c.querySelector('#stStartBtn')?.addEventListener('click', () => startStress(c));
    c.querySelector('#stStopBtn')?.addEventListener('click', () => { running = false; });
    c.querySelector('#stReportBtn')?.addEventListener('click', () => downloadReport(c));

    // 捕获按钮
    const captureBtn = c.querySelector('#stCaptureBtn');
    captureBtn?.addEventListener('click', () => {
      if (pendingCapture) {
        pendingCapture = false;
        captureBtn.classList.remove('active');
        captureBtn.textContent = '📌 捕获接口';
        flashMessage('已取消等待');
        return;
      }
      pendingCapture = true;
      captureBtn.classList.add('active');
      captureBtn.textContent = '⏳ 等待中...';
      flashMessage('请在页面上触发一个接口请求...', 3000);
    });

    captureOff = context.events.on('network:request', (payload) => {
      console.debug('[MynaTest STRESS] 📡 capture handler fired, pendingCapture:', pendingCapture, 'url:', payload?.url?.slice(0, 80));
      if (!pendingCapture) return;
      pendingCapture = false;
      captureBtn?.classList.remove('active');
      if (captureBtn) captureBtn.textContent = '📌 捕获接口';

      const urlInput = c.querySelector('#stUrl');
      const methodSel = c.querySelector('#stMethod');
      const headersInput = c.querySelector('#stHeaders');
      const bodyInput = c.querySelector('#stBody');
      const bodyBlock = c.querySelector('#stBodyBlock');

      if (urlInput) urlInput.value = payload.url || '';

      if (methodSel && payload.method) {
        const m = payload.method.toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].includes(m)) {
          methodSel.value = m;
          bodyBlock.style.display = ['POST', 'PUT', 'PATCH'].includes(m) ? 'block' : 'none';
        }
      }

      // Headers
      if (headersInput) {
        const hdrs = payload.requestHeaders;
        if (hdrs) {
          let obj = hdrs;
          if (typeof hdrs === 'string') {
            try { obj = JSON.parse(hdrs); } catch { obj = hdrs; }
          }
          headersInput.value = typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
          c.querySelector('#stHeadersBody').style.display = 'block';  // 自动展开
        }
      }

      // Body
      if (bodyInput && payload.requestBody) {
        const r = window.MynaDiff?.parseJSONRobust?.(payload.requestBody);
        bodyInput.value = r?.ok ? JSON.stringify(r.data, null, 2) : payload.requestBody;
        bodyBlock.style.display = 'block';
        c.querySelector('#stBodyBody').style.display = 'block';
      }

      flashMessage('✓ 已捕获接口（URL / Headers / Body）', 1500);
    });

    return () => { if (captureOff) captureOff(); };
  }

  function cleanup() {
    running = false;
    results = [];
    pendingCapture = false;
  }

  // ============ 断言引擎 ============

  function runAsserts(asserts, status, headers, body) {
    if (!asserts || !asserts.trim()) return { total: 0, pass: 0, results: [] };
    const lines = asserts.split('\n').map(l => l.trim()).filter(Boolean);
    const results = lines.map(expr => testAssert(expr, status, headers, body));
    const pass = results.filter(r => r.pass).length;
    return { total: results.length, pass, results };
  }

  function testAssert(expr, status, headers, body) {
    try {
      // status == 200 / status != 200 / status in 200,201
      if (/^status\s*(==|!=|>=|<=|>|<|in)\s*.+$/i.test(expr)) {
        const m = expr.match(/^status\s*(==|!=|>=|<=|>|<|in)\s*(.+)$/i);
        const op = m[1].toLowerCase();
        const val = m[2].trim();
        if (op === 'in') {
          const list = val.split(',').map(s => s.trim());
          return { expr, pass: list.includes(String(status)), type: 'status', expected: list.join(','), actual: status };
        }
        const num = Number(val);
        let pass = false;
        switch (op) {
          case '==': pass = status === num; break;
          case '!=': pass = status !== num; break;
          case '>': pass = status > num; break;
          case '<': pass = status < num; break;
          case '>=': pass = status >= num; break;
          case '<=': pass = status <= num; break;
        }
        return { expr, pass, type: 'status', expected: val, actual: status };
      }

      // body contains xxx
      if (/^body\s+contains\s+(.+)$/i.test(expr)) {
        const keyword = expr.match(/^body\s+contains\s+(.+)$/i)[1].trim();
        return { expr, pass: String(body || '').includes(keyword), type: 'body-contains', keyword };
      }

      // header xxx contains yyy
      if (/^header\s+(\S+)\s+contains\s+(.+)$/i.test(expr)) {
        const m = expr.match(/^header\s+(\S+)\s+contains\s+(.+)$/i);
        const hName = m[1].toLowerCase();
        const keyword = m[2].trim();
        const found = Object.entries(headers || {}).find(([k]) => k.toLowerCase() === hName);
        const pass = found ? String(found[1]).toLowerCase().includes(keyword.toLowerCase()) : false;
        return { expr, pass, type: 'header', header: hName, keyword };
      }

      // $.path expr  — JSONPath + 比较
      if (/^\$\./.test(expr)) {
        return testJsonPathAssert(expr, status, body);
      }

      return { expr, pass: false, type: 'unknown', error: '语法不认识' };
    } catch (e) {
      return { expr, pass: false, type: 'error', error: e.message };
    }
  }

  function testJsonPathAssert(expr, status, body) {
    // 解析: $.a.b.c == 0  /  $.a.b exists  /  $.list[0].id > 10
    const m = expr.match(/^(\$\.[\w.\[\]]+)\s*(==|!=|>=|<=|>|<|exists)\s*(.*)$/);
    if (!m) return { expr, pass: false, type: 'jsonpath', error: '语法错误' };
    const [, path, op, rawVal] = m;

    let jsonBody;
    try { jsonBody = JSON.parse(body || 'null'); } catch { jsonBody = null; }

    const actual = getByPath(jsonBody, path);

    if (op === 'exists') {
      const pass = actual !== undefined && actual !== null;
      return { expr, pass, type: 'jsonpath', path, actual };
    }

    let expected = rawVal.trim();
    // 自动类型转换
    if (expected === 'true') expected = true;
    else if (expected === 'false') expected = false;
    else if (expected === 'null') expected = null;
    else if (/^-?\d+(\.\d+)?$/.test(expected)) expected = Number(expected);

    let pass = false;
    switch (op) {
      case '==': pass = actual == expected; break;
      case '!=': pass = actual != expected; break;
      case '>': pass = Number(actual) > Number(expected); break;
      case '<': pass = Number(actual) < Number(expected); break;
      case '>=': pass = Number(actual) >= Number(expected); break;
      case '<=': pass = Number(actual) <= Number(expected); break;
    }
    return { expr, pass, type: 'jsonpath', path, expected, actual };
  }

  function getByPath(obj, path) {
    // path 形如 $.data.list[0].id
    if (!path.startsWith('$.')) return undefined;
    const sub = path.slice(2);  // data.list[0].id
    let cur = obj;
    const parts = sub.split(/\.|(\[\d+\])/).filter(Boolean);
    for (const part of parts) {
      if (cur === null || cur === undefined) return undefined;
      const arrMatch = part.match(/^\[(\d+)\]$/);
      if (arrMatch) {
        cur = cur[Number(arrMatch[1])];
      } else {
        cur = cur[part];
      }
    }
    return cur;
  }

  // ============ 压测执行 ============

  async function startStress(c) {
    const url = c.querySelector('#stUrl')?.value.trim();
    const method = (c.querySelector('#stMethod')?.value || 'GET').toUpperCase();
    const count = parseInt(c.querySelector('#stCount')?.value) || 5;
    const concurrency = parseInt(c.querySelector('#stConcurrency')?.value) || 1;
    const asserts = c.querySelector('#stAsserts')?.value || '';

    if (!url) { flashMessage('请输入 URL', true); return; }

    let headers = {};
    const headersStr = c.querySelector('#stHeaders')?.value.trim();
    if (headersStr) {
      try { headers = JSON.parse(headersStr); }
      catch { flashMessage('Headers 不是合法 JSON', true); return; }
    }

    const bodyStr = c.querySelector('#stBody')?.value;

    running = true;
    results = [];

    const startBtn = c.querySelector('#stStartBtn');
    const stopBtn = c.querySelector('#stStopBtn');
    const reportBtn = c.querySelector('#stReportBtn');
    const progressEl = c.querySelector('#stProgress');
    const resultEl = c.querySelector('#stResult');
    const historyEl = c.querySelector('#stHistory');

    startBtn.disabled = true;
    stopBtn.disabled = false;
    reportBtn.disabled = true;
    progressEl.style.display = 'block';
    resultEl.style.display = 'none';
    if (historyEl) historyEl.innerHTML = '';

    const overallStart = performance.now();
    // 语义：次数 = 轮数，并发 = 每轮同时请求数，总请求数 = 次数 × 并发
    // 每轮同时发出 concurrency 个请求，本轮全部结束后才进入下一轮
    const total = count * concurrency;
    let completed = 0;
    let idx = 0;

    async function runOne() {
      if (!running) return;
      const myIdx = idx++;
      const start = performance.now();
      let success = false;
      let status = 0;
      let errorMsg = '';
      let respBody = '';
      let respHeaders = {};
      let assertResult = null;

      try {
        const fetchOpts = { method, headers };
        if (bodyStr && ['POST', 'PUT', 'PATCH'].includes(method)) {
          fetchOpts.body = bodyStr;
        }
        const res = await fetch(url, fetchOpts);
        status = res.status;
        success = res.ok;
        respHeaders = Object.fromEntries(res.headers.entries());
        try { respBody = await res.text(); } catch {}
        if (!success) errorMsg = `HTTP ${status}`;
      } catch (e) {
        errorMsg = String(e.message || e);
      }
      const duration = Math.round(performance.now() - start);

      // 断言
      if (asserts.trim()) {
        assertResult = runAsserts(asserts, status, respHeaders, respBody);
      }

      results.push({ idx: myIdx, duration, success, status, error: errorMsg, assertResult, responseBody: respBody });
      appendHistoryItem(historyEl, results[results.length - 1]);
      updateProgress(c, ++completed, total);
    }

    for (let wave = 0; wave < count && running; wave++) {
      await Promise.all(Array.from({ length: concurrency }, () => runOne()));
    }

    const overallDuration = Math.round(performance.now() - overallStart);
    running = false;

    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (results.length > 0) reportBtn.disabled = false;
    progressEl.style.display = 'none';

    renderStats(c, overallDuration);
  }

  function updateProgress(c, done, total) {
    const textEl = c.querySelector('#stProgressText');
    const fillEl = c.querySelector('#stProgressFill');
    if (textEl) textEl.textContent = `进度: ${done} / ${total}`;
    if (fillEl) fillEl.style.width = `${(done / total) * 100}%`;
  }

  function appendHistoryItem(container, r) {
    if (!container) return;
    const div = document.createElement('div');
    let statusClass = r.success ? 'success' : 'fail';
    let assertInfo = '';
    if (r.assertResult && r.assertResult.total > 0) {
      const allPass = r.assertResult.pass === r.assertResult.total;
      statusClass = allPass && r.success ? 'success' : 'fail';
      assertInfo = ` · ${r.assertResult.pass}/${r.assertResult.total}`;
    }

    // 格式化响应体显示
    let bodyPreview = '';
    if (r.responseBody) {
      const truncated = r.responseBody.length > 3000 ? r.responseBody.slice(0, 3000) + '\n...(truncated)' : r.responseBody;
      const pretty = (() => {
        const rr = window.MynaDiff?.parseJSONRobust?.(truncated);
        if (rr?.ok) return JSON.stringify(rr.data, null, 2);
        return truncated;
      })();
      bodyPreview = `<pre class="stress-resp-body">${escapeHtml(pretty)}</pre>`;
    } else if (r.error) {
      bodyPreview = `<pre class="stress-resp-body error">${escapeHtml(r.error)}</pre>`;
    }

    div.className = `stress-history-item-wrap ${statusClass}`;
    div.innerHTML = `
      <div class="stress-history-head" tabindex="0">
        <span class="stress-idx">#${r.idx + 1}</span>
        <span>${r.success ? '✓' : '✗'}</span>
        <span>${r.duration}ms</span>
        <span class="stress-status">${r.status || r.error || '-'}</span>
        ${assertInfo ? `<span>${assertInfo}</span>` : ''}
        <span class="stress-toggle">展开</span>
      </div>
      ${bodyPreview}
    `;

    // 点击展开/收起响应体
    // 注意：必须用显式内联 block/none 控制 —— CSS 里 .stress-resp-body 默认 display:none，
    // 若展开时设为 ''（清空内联），CSS 规则会重新生效导致响应体永远无法显示
    const head = div.querySelector('.stress-history-head');
    const body = div.querySelector('.stress-resp-body');
    const toggleSpan = div.querySelector('.stress-toggle');
    if (head && body) {
      body.style.display = 'none';  // 默认收起
      head.addEventListener('click', () => {
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? 'block' : 'none';
        toggleSpan.textContent = isHidden ? '收起' : '展开';
      });
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function renderStats(c, overallDuration) {
    if (results.length === 0) return;

    const durations = results.map(r => r.duration);
    const successCount = results.filter(r => r.success).length;
    const successRate = ((successCount / results.length) * 100).toFixed(1);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    let assertPass = 0, assertTotal = 0;
    results.forEach(r => {
      if (r.assertResult) { assertTotal += r.assertResult.total; assertPass += r.assertResult.pass; }
    });
    const assertRate = assertTotal > 0 ? ((assertPass / assertTotal) * 100).toFixed(1) + '%' : '—';

    c.querySelector('#stResult').style.display = 'block';
    c.querySelector('#stStatTotal').textContent = `${overallDuration}ms`;
    c.querySelector('#stStatSuccess').textContent = `${successRate}% (${successCount}/${results.length})`;
    c.querySelector('#stStatAvg').textContent = `${avg}ms`;
    c.querySelector('#stStatMin').textContent = `${min}ms`;
    c.querySelector('#stStatMax').textContent = `${max}ms`;
    c.querySelector('#stStatP50').textContent = `${p50}ms (P90:${p90}, P99:${p99})`;
    c.querySelector('#stStatAssert').textContent = assertRate;
    const rps = results.length / ((overallDuration / 1000) || 1);
    c.querySelector('#stStatRps').textContent = `${rps.toFixed(1)}/s`;

    const historyEl = c.querySelector('#stHistory');
    if (historyEl) {
      historyEl.innerHTML = '';
      results.forEach(r => appendHistoryItem(historyEl, r));
    }
  }

  function downloadReport(c) {
    const url = c.querySelector('#stUrl')?.value || '';
    const method = c.querySelector('#stMethod')?.value || 'GET';
    const asserts = c.querySelector('#stAsserts')?.value || '';

    const durations = results.map(r => r.duration);
    const successCount = results.filter(r => r.success).length;
    const successRate = ((successCount / results.length) * 100).toFixed(1);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    let assertPass = 0, assertTotal = 0;
    const assertFailDetails = [];
    results.forEach(r => {
      if (r.assertResult) {
        assertTotal += r.assertResult.total;
        assertPass += r.assertResult.pass;
        r.assertResult.results.forEach(a => { if (!a.pass) assertFailDetails.push(`  #${r.idx + 1} ${a.expr}`); });
      }
    });
    const assertRate = assertTotal > 0 ? ((assertPass / assertTotal) * 100).toFixed(1) + '%' : '无断言';

    const md = `# MynaTest 轻量压测报告

> 生成时间：${new Date().toLocaleString()}

## 基本信息

| 项目 | 值 |
|------|-----|
| URL | \`${url}\` |
| Method | ${method} |
| 总次数 | ${results.length} |
| 成功数 | ${successCount} |
| 失败数 | ${results.length - successCount} |
| 成功率 | ${successRate}% |
| 断言通过率 | ${assertRate} |

## 响应时间统计

| 指标 | 值 |
|------|-----|
| 平均 | ${avg} ms |
| 最小 | ${min} ms |
| 最大 | ${max} ms |
| P50 | ${p50} ms |
| P90 | ${p90} ms |
| P99 | ${p99} ms |

## 断言（${assertTotal > 0 ? assertTotal + ' 条' : '未配置'}）

${asserts ? '```\n' + asserts + '\n```' : '无'}

${assertFailDetails.length > 0 ? '### ❌ 失败详情\n\n' + assertFailDetails.join('\n') : (assertTotal > 0 ? '### ✅ 全部通过' : '')}

## 逐条记录

| # | 状态 | 耗时(ms) | Status | 断言 |
|---|------|----------|--------|------|
${results.map(r => {
  const a = r.assertResult ? `${r.assertResult.pass}/${r.assertResult.total}` : '-';
  return `| ${r.idx + 1} | ${r.success ? '✓' : '✗'} | ${r.duration} | ${r.status || r.error || '-'} | ${a} |`;
}).join('\n')}
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const fname = `mynatest-stress-report-${Date.now()}.md`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    flashMessage(`✓ 报告已下载：${fname}`, 1500);
  }

  // 注册到全局
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

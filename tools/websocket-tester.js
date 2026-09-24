// tools/websocket-tester.js — WebSocket 模拟测试工具（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])));

  const meta = {
    id: 'websocket-tester',
    name: 'WebSocket 测试',
    desc: '连接 ws/wss 服务端，实时收发消息、记录日志、支持 JSON 美化与心跳保活',
    icon: '🔌',
    iconUrl: 'icons/websocket-tester.png',
    category: 'network',
    categoryName: '网络工具'
  };

  // WebSocket 状态机
  const STATE = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    OPEN: 'open',
    CLOSING: 'closing',
    CLOSED: 'closed',
    ERROR: 'error'
  };

  const STATE_LABEL = {
    idle: { text: '未连接', cls: 'ws-state-idle' },
    connecting: { text: '连接中...', cls: 'ws-state-connecting' },
    open: { text: '已连接', cls: 'ws-state-open' },
    closing: { text: '断开中...', cls: 'ws-state-closing' },
    closed: { text: '已断开', cls: 'ws-state-closed' },
    error: { text: '连接错误', cls: 'ws-state-error' }
  };

  // 状态
  let ws = null;
  let state = STATE.IDLE;
  let logs = [];           // { ts, dir, type, raw, pretty, note }
  let autoScroll = true;
  let heartTimer = null;

  // ---------- 渲染 ----------
  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <!-- 连接配置 -->
      <div class="ws-section">
        <div class="ws-section-head">
          <span class="ws-section-title">连接配置</span>
          <span class="ws-status-badge" id="wsStatus">● 未连接</span>
        </div>
        <div class="ws-row">
          <input type="text" id="wsUrl" class="ws-url" placeholder="wss://echo.websocket.org">
        </div>
        <div class="ws-row">
          <input type="text" id="wsSubProtocols" class="ws-proto" placeholder="可选：自定义 SubProtocol，多个用英文逗号分隔">
        </div>
        <div class="ws-actions">
          <button class="btn primary" id="wsConnectBtn">▶ 连接</button>
          <button class="btn danger" id="wsCloseBtn" disabled>■ 断开</button>
          <button class="btn" id="wsHeartBtn">♥ 心跳保活</button>
        </div>
      </div>

      <!-- 发送区 -->
      <div class="ws-section">
        <div class="ws-section-head">
          <span class="ws-section-title">发送消息</span>
          <span class="ws-toggle" data-target="wsSendHelp">JSON 格式化</span>
        </div>
        <textarea id="wsSendMsg" class="ws-send" rows="4" placeholder='{"hello": "world"}'></textarea>
        <div class="ws-actions">
          <button class="btn primary" id="wsSendBtn" disabled>↑ 发送</button>
          <button class="btn" id="wsFormatBtn">✎ 格式化</button>
          <button class="btn" id="wsClearSendBtn">清空</button>
        </div>
      </div>

      <!-- 日志区 -->
      <div class="ws-section">
        <div class="ws-section-head">
          <span class="ws-section-title">消息日志 <span class="ws-log-count" id="wsLogCount">(0)</span></span>
          <div class="ws-log-ops">
            <label class="ws-toggle-auto">
              <input type="checkbox" id="wsAutoScroll" checked> 自动滚动
            </label>
            <button class="btn tiny" id="wsClearLogBtn">🗑 清空</button>
            <button class="btn tiny" id="wsExportBtn">📄 导出</button>
          </div>
        </div>
        <div class="ws-log" id="wsLog"></div>
      </div>
    `;
  }

  // ---------- 挂载事件 ----------
  function mount(context) {
    const c = context.container;

    // URL 常用示例
    const urlInput = c.querySelector('#wsUrl');
    urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') connect(c);
    });

    c.querySelector('#wsConnectBtn').addEventListener('click', () => connect(c));
    c.querySelector('#wsCloseBtn').addEventListener('click', () => close(c));
    c.querySelector('#wsHeartBtn').addEventListener('click', () => toggleHeartbeat(c));
    c.querySelector('#wsSendBtn').addEventListener('click', () => send(c));
    c.querySelector('#wsFormatBtn').addEventListener('click', () => formatSend(c));
    c.querySelector('#wsClearSendBtn').addEventListener('click', () => { c.querySelector('#wsSendMsg').value = ''; });
    c.querySelector('#wsClearLogBtn').addEventListener('click', () => { logs = []; renderLog(c); flashMessage('日志已清空'); });
    c.querySelector('#wsExportBtn').addEventListener('click', () => exportLogs());

    const sc = c.querySelector('#wsAutoScroll');
    sc?.addEventListener('change', () => { autoScroll = sc.checked; });

    // 发送区 Enter 发送 / Shift+Enter 换行
    const sendArea = c.querySelector('#wsSendMsg');
    sendArea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && state === STATE.OPEN) {
        e.preventDefault();
        send(c);
      }
    });

    // 启动时恢复上次 URL
    chrome.storage.local.get(['wsTestUrl'], (res) => {
      if (res.wsTestUrl) urlInput.value = res.wsTestUrl;
    });

    return () => { cleanup(); };
  }

  // ---------- 核心逻辑 ----------
  function setState(next, note) {
    state = next;
    const info = STATE_LABEL[next] || STATE_LABEL.idle;
    document.querySelectorAll('.tool-panel .ws-status-badge').forEach(el => {
      el.className = 'ws-status-badge ' + info.cls;
      el.textContent = '● ' + info.text;
    });
    if (note) appendLog(note, 'system');
  }

  function appendLog(content, dir, type) {
    const ts = new Date();
    const tsStr = fmtTime(ts);
    let pretty = content;
    let raw = content;

    // 尝试 JSON 美化
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { pretty = JSON.stringify(JSON.parse(trimmed), null, 2); type = 'json'; }
        catch { type = type || 'text'; }
      } else {
        type = type || 'text';
      }
    } else if (content instanceof ArrayBuffer) {
      // 二进制：尝试解码 UTF-8，失败就用十六进制预览
      try {
        const decoder = new TextDecoder('utf-8');
        pretty = decoder.decode(content);
        type = 'binary';
        raw = pretty;
      } catch {
        pretty = '[ArrayBuffer byteLength=' + content.byteLength + ']';
        type = 'binary';
      }
    } else {
      // Blob 等
      pretty = String(content);
      raw = pretty;
      type = type || 'text';
    }

    logs.push({ ts: tsStr, dir, type, raw, pretty });
    // 限制日志数量，避免无限增长
    if (logs.length > 1000) logs = logs.slice(-1000);
  }

  function fmtTime(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  }

  function renderLog(c) {
    const logEl = c.querySelector('#wsLog');
    const countEl = c.querySelector('#wsLogCount');
    if (!logEl) return;
    if (countEl) countEl.textContent = `(${logs.length})`;

    if (logs.length === 0) {
      logEl.innerHTML = '<div class="ws-log-empty">暂无消息日志</div>';
      return;
    }

    const dirMap = {
      send: { label: '↑ 发送', cls: 'ws-dir-send' },
      recv: { label: '↓ 接收', cls: 'ws-dir-recv' },
      system: { label: '● 系统', cls: 'ws-dir-system' },
      error: { label: '✗ 错误', cls: 'ws-dir-error' }
    };

    const html = logs.map((item, i) => {
      const d = dirMap[item.dir] || dirMap.system;
      const short = item.pretty.length > 500 ? item.pretty.slice(0, 500) + '\n...(truncated)' : item.pretty;
      const expandedFlag = item.pretty.length > 500 ? ' data-expandable="1"' : '';
      return `
        <div class="ws-log-item ${d.cls}" ${expandedFlag}>
          <div class="ws-log-head">
            <span class="ws-log-ts">${item.ts}</span>
            <span class="ws-log-dir">${d.label}</span>
            <span class="ws-log-type">${item.type}</span>
          </div>
          <pre class="ws-log-body">${escapeHtml(short)}</pre>
        </div>
      `;
    }).join('');

    logEl.innerHTML = html;

    // 长内容支持展开/收起
    logEl.querySelectorAll('[data-expandable="1"]').forEach(el => {
      const head = el.querySelector('.ws-log-head');
      head.style.cursor = 'pointer';
      head.title = '点击展开/收起';
      head.addEventListener('click', () => {
        const body = el.querySelector('.ws-log-body');
        const isCollapsed = !el.classList.contains('ws-expanded');
        if (isCollapsed) {
          // 用原始完整内容重新设置
          const idx = Array.from(logEl.children).indexOf(el);
          if (idx >= 0 && logs[idx]) {
            body.textContent = logs[idx].pretty;
          }
          el.classList.add('ws-expanded');
        } else {
          const idx = Array.from(logEl.children).indexOf(el);
          if (idx >= 0 && logs[idx]) {
            body.textContent = logs[idx].pretty.length > 500 ? logs[idx].pretty.slice(0, 500) + '\n...(truncated)' : logs[idx].pretty;
          }
          el.classList.remove('ws-expanded');
        }
      });
    });

    if (autoScroll) logEl.scrollTop = logEl.scrollHeight;
  }

  function updateButtons(c) {
    const connectBtn = c.querySelector('#wsConnectBtn');
    const closeBtn = c.querySelector('#wsCloseBtn');
    const sendBtn = c.querySelector('#wsSendBtn');
    const heartBtn = c.querySelector('#wsHeartBtn');

    switch (state) {
      case STATE.IDLE:
      case STATE.CLOSED:
      case STATE.ERROR:
        connectBtn.disabled = false;
        connectBtn.textContent = '▶ 连接';
        closeBtn.disabled = true;
        sendBtn.disabled = true;
        heartBtn.disabled = true;
        heartBtn.classList.remove('active');
        break;
      case STATE.CONNECTING:
        connectBtn.disabled = true;
        connectBtn.textContent = '⏳ 连接中';
        closeBtn.disabled = false;
        sendBtn.disabled = true;
        heartBtn.disabled = false;
        break;
      case STATE.OPEN:
        connectBtn.disabled = true;
        closeBtn.disabled = false;
        sendBtn.disabled = false;
        heartBtn.disabled = false;
        break;
      case STATE.CLOSING:
        connectBtn.disabled = true;
        closeBtn.disabled = true;
        sendBtn.disabled = true;
        heartBtn.disabled = true;
        break;
    }
  }

  function connect(c) {
    const url = c.querySelector('#wsUrl').value.trim();
    if (!url) { flashMessage('请输入 WebSocket URL', true); return; }
    if (!/^wss?:\/\//i.test(url)) { flashMessage('URL 必须以 ws:// 或 wss:// 开头', true); return; }

    const subRaw = c.querySelector('#wsSubProtocols')?.value.trim();
    const subProtocols = subRaw ? subRaw.split(',').map(s => s.trim()).filter(Boolean) : null;

    chrome.storage.local.set({ wsTestUrl: url });
    setState(STATE.CONNECTING);
    renderLog(c); updateButtons(c);

    try {
      ws = subProtocols ? new WebSocket(url, subProtocols) : new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setState(STATE.OPEN, `✓ 连接成功：${url}`);
        renderLog(c); updateButtons(c);
      };
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string' || ev.data instanceof ArrayBuffer || ev.data instanceof Blob) {
          appendLog(ev.data, 'recv');
          renderLog(c);
        } else {
          appendLog(String(ev.data), 'recv');
          renderLog(c);
        }
      };
      ws.onerror = () => {
        setState(STATE.ERROR, '✗ WebSocket 连接错误（可能是 URL 错误、CSP 拦截、或服务器拒绝）');
        renderLog(c); updateButtons(c);
      };
      ws.onclose = (ev) => {
        setState(STATE.CLOSED, `✕ 连接已关闭：code=${ev.code}, reason=${ev.reason || '无'}`);
        renderLog(c); updateButtons(c);
        ws = null;
        stopHeartbeat();
      };
    } catch (e) {
      setState(STATE.ERROR, '✗ 创建 WebSocket 失败：' + e.message);
      renderLog(c); updateButtons(c);
      ws = null;
    }
  }

  function close(c) {
    if (!ws) return;
    setState(STATE.CLOSING, '关闭连接中...');
    renderLog(c); updateButtons(c);
    try { ws.close(1000, 'client close'); } catch {}
    stopHeartbeat();
  }

  function send(c) {
    if (!ws || state !== STATE.OPEN) { flashMessage('未连接，无法发送', true); return; }
    const input = c.querySelector('#wsSendMsg');
    const msg = input.value;
    if (!msg.trim()) { flashMessage('消息为空', true); return; }

    try {
      ws.send(msg);
      appendLog(msg, 'send');
      renderLog(c);
    } catch (e) {
      appendLog('✗ 发送失败：' + e.message, 'error');
      renderLog(c);
    }
  }

  function formatSend(c) {
    const input = c.querySelector('#wsSendMsg');
    const val = input.value.trim();
    if (!val) return;
    try {
      input.value = JSON.stringify(JSON.parse(val), null, 2);
      flashMessage('✓ 已格式化');
    } catch {
      flashMessage('不是合法 JSON', true);
    }
  }

  function toggleHeartbeat(c) {
    const btn = c.querySelector('#wsHeartBtn');
    if (heartTimer) {
      stopHeartbeat();
      btn.classList.remove('active');
      btn.textContent = '♥ 心跳保活';
      flashMessage('心跳已停止');
    } else {
      if (!ws || state !== STATE.OPEN) { flashMessage('请先建立连接', true); return; }
      startHeartbeat(c);
      btn.classList.add('active');
      btn.textContent = '♥ 心跳运行中 (5s)';
      flashMessage('✓ 已启动心跳（每 5 秒发送 {"ping":true}）');
    }
  }

  function startHeartbeat(c) {
    // WebSocket 协议层 ping/pong 无法从 JS 侧直接触发，使用应用层心跳
    heartTimer = setInterval(() => {
      if (!ws || state !== STATE.OPEN) { stopHeartbeat(); return; }
      try {
        ws.send(JSON.stringify({ ping: true, ts: Date.now() }));
        appendLog('{"ping":true, "ts":' + Date.now() + '}', 'send');
        renderLog(c);
      } catch {
        stopHeartbeat();
      }
    }, 5000);
  }

  function stopHeartbeat() {
    if (heartTimer) { clearInterval(heartTimer); heartTimer = null; }
  }

  function exportLogs() {
    if (logs.length === 0) { flashMessage('暂无日志可导出', true); return; }
    const data = logs.map(({ ts, dir, type, raw, pretty }) => ({ ts, dir, type, raw, pretty }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const fname = `mynatest-ws-log-${Date.now()}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    flashMessage(`✓ 已导出 ${logs.length} 条日志：${fname}`, 1500);
  }

  function cleanup() {
    stopHeartbeat();
    if (ws) { try { ws.close(1000, 'cleanup'); } catch {} ws = null; }
    state = STATE.IDLE;
    logs = [];
  }

  // 注册到全局
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

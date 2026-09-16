// content/mock-interceptor-main.js — MAIN world
// 职责：独立 hook fetch & XHR，根据 Mock 规则返回自定义响应
// 与 injected.js 的捕获 hook 链式共存：mock fetch 不命中时委托给捕获 fetch

(function () {
  if (window.__mynatest_mock_loaded__) return;
  window.__mynatest_mock_loaded__ = true;

  // 当前生效的 Mock 配置（由 bridge 下发）
  let mockConfig = { enabled: false, rules: [] };

  // ========== 工具函数 ==========
  function wildcardToRegex(pattern) {
    if (typeof pattern !== 'string' || !pattern) return null;
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    try { return new RegExp(escaped, 'i'); } catch { return null; }
  }

  function matchUrl(url, pattern) {
    if (!url || !pattern) return false;
    if (url.includes(pattern)) return true;
    if (pattern.indexOf('*') >= 0) {
      const re = wildcardToRegex(pattern);
      if (re && re.test(url)) return true;
    }
    return false;
  }

  function findMockRule(url, method) {
    if (!mockConfig.enabled || !mockConfig.rules) return null;
    for (const rule of mockConfig.rules) {
      if (!rule.enabled) continue;
      if (rule.method && rule.method !== '*' &&
          String(rule.method).toUpperCase() !== String(method || 'GET').toUpperCase()) continue;
      if (matchUrl(url, rule.urlPattern)) return rule;
    }
    return null;
  }

  function buildMockResponse(rule) {
    const type = rule.mockType || 'custom';
    if (type === 'timeout') return null;
    let status = 200;
    let body = '';
    let statusText = 'OK';
    const headers = { 'content-type': 'application/json; charset=utf-8', 'x-mock-interceptor': 'mynatest' };
    if (type === 'status') {
      status = Number(rule.status) || 500;
      statusText = status >= 500 ? 'Internal Server Error'
        : status === 404 ? 'Not Found'
        : status === 401 ? 'Unauthorized'
        : status === 403 ? 'Forbidden'
        : status >= 200 && status < 300 ? 'OK' : 'Mock';
      body = JSON.stringify({ code: status, message: `Mock ${status}`, mock: true });
    } else if (type === 'empty') {
      status = 200;
      statusText = 'OK';
      body = '';
      headers['content-type'] = 'text/plain; charset=utf-8';
    } else {
      // custom
      status = Number(rule.status) || 200;
      statusText = status >= 200 && status < 300 ? 'OK' : 'Mock';
      body = rule.body != null ? String(rule.body) : '';
      if (rule.headers && typeof rule.headers === 'object') {
        Object.entries(rule.headers).forEach(([k, v]) => { headers[String(k).toLowerCase()] = String(v); });
      }
    }
    return { status, statusText, body, headers };
  }

  function delay(ms) {
    return new Promise(resolve => {
      if (!ms || ms <= 0) return resolve();
      setTimeout(resolve, Math.min(ms, 60000));
    });
  }

  // ========== Hook fetch ==========
  // 关键：保存当前 window.fetch（可能是 injected.js 的捕获 fetch），不命中 Mock 时委托给它
  // 标记 __mynatest_is_hooked__ 防止 injected.js 的 setInterval 巡检覆盖
  function installFetchHook() {
    if (window.__mynatest_mock_fetch_hooked__) return;
    const currentFetch = window.fetch;
    window.__mynatest_mock_orig_fetch__ = currentFetch;

    const myFetch = async function (...args) {
      const [input, init = {}] = args;
      const url = typeof input === 'string' ? input :
        (input && input.url) ? input.url : String(input);
      const method = (init && init.method) ||
        (input && typeof input !== 'string' && input.method) || 'GET';

      const rule = findMockRule(url, method);
      if (!rule) {
        // 不命中：委托给捕获 fetch（或原生 fetch）
        return currentFetch.apply(this, args);
      }

      // 命中 Mock
      const mock = buildMockResponse(rule);
      if (mock === null) {
        // 超时：让 promise 永远 pending
        return new Promise(() => {});
      }
      await delay(Number(rule.delay) || 0);

      const bodyStr = mock.body;
      const blob = new Blob([bodyStr], { type: mock.headers['content-type'] || 'text/plain' });
      const response = new Response(blob, {
        status: mock.status,
        statusText: mock.statusText,
        headers: mock.headers
      });
      return response;
    };

    // 标记为已 hook，防止 injected.js 的 1 秒巡检覆盖
    try { myFetch.__mynatest_is_hooked__ = true; } catch {}

    try {
      Object.defineProperty(window, 'fetch', {
        value: myFetch,
        writable: true,
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      window.fetch = myFetch;
    }
    window.__mynatest_mock_fetch_hooked__ = true;
  }

  // ========== Hook XMLHttpRequest ==========
  function installXHRHook() {
    if (window.__mynatest_mock_xhr_hooked__) return;
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    window.__mynatest_mock_orig_open__ = origOpen;
    window.__mynatest_mock_orig_send__ = origSend;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__mock_method__ = method;
      this.__mock_url__ = url;
      return origOpen.call(this, method, url, ...rest);
    };

    const mySend = function (body) {
      const rule = findMockRule(this.__mock_url__, this.__mock_method__);
      if (!rule) {
        // 不命中：委托给捕获 send（injected.js 的 send）
        return origSend.call(this, body);
      }
      // 命中 Mock
      const mock = buildMockResponse(rule);
      const xhr = this;
      if (mock === null) {
        // 超时：不发响应，让请求挂起
        return;
      }
      const delayMs = Number(rule.delay) || 0;
      setTimeout(() => {
        try {
          // 根据 responseType 处理 response 值
          let responseVal = mock.body;
          const rt = xhr.responseType;
          if (rt === 'json') {
            try { responseVal = JSON.parse(mock.body); } catch { responseVal = null; }
          }
          Object.defineProperty(xhr, 'status', { value: mock.status, configurable: true });
          Object.defineProperty(xhr, 'statusText', { value: mock.statusText, configurable: true });
          Object.defineProperty(xhr, 'response', { value: responseVal, configurable: true });
          Object.defineProperty(xhr, 'responseText', { value: mock.body, configurable: true });
          Object.defineProperty(xhr, 'readyState', { value: 4, configurable: true });
          Object.defineProperty(xhr, 'responseURL', { value: '', configurable: true });
          if (typeof xhr.onreadystatechange === 'function') {
            try { xhr.onreadystatechange.call(xhr); } catch (_) {}
          }
          xhr.dispatchEvent(new Event('readystatechange'));
          xhr.dispatchEvent(new Event('load'));
          xhr.dispatchEvent(new Event('loadend'));
        } catch (e) {
          try { xhr.dispatchEvent(new Event('error')); } catch (_) {}
        }
      }, delayMs);
    };

    // 标记为已 hook，防止 injected.js 的 1 秒巡检覆盖
    try { mySend.__mynatest_is_hooked__ = true; } catch {}
    XMLHttpRequest.prototype.send = mySend;
    window.__mynatest_mock_xhr_hooked__ = true;
  }

  installFetchHook();
  installXHRHook();

  // ========== 接收 bridge 下发的配置 ==========
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.__mynatest_mock__ || e.data.type !== 'config') return;
    mockConfig = e.data.payload || { enabled: false, rules: [] };
  });

  // 通知 bridge 已就绪
  window.postMessage({ __mynatest_mock_ready__: true }, '*');
})();

// Injected Script (MAIN world)
// 职责：hook fetch & XMLHttpRequest，捕获接口请求/响应

(function () {
  if (window.__mynatest_injected_loaded__) return;
  window.__mynatest_injected_loaded__ = true;

  const BRIDGE = (type, payload) => {
    window.postMessage({ __mynatest__: true, type, payload }, '*');
  };

  /** 把各种 headers 形式统一转成 plain object */
  function normalizeHeaders(h) {
    if (!h) return null;
    if (h instanceof Headers) {
      const obj = {};
      h.forEach((v, k) => { obj[k] = v; });
      return obj;
    }
    if (Array.isArray(h)) {
      const obj = {};
      h.forEach(([k, v]) => { obj[k] = v; });
      return obj;
    }
    if (typeof h === 'object') return { ...h };
    return null;
  }

  /** 把相对 URL 归一化为绝对地址（XHR/fetch 常传 /api/xxx，缺少 host 会导致压测无法重放） */
  function absoluteUrl(u) {
    if (typeof u !== 'string' || !u) return u || '';
    try { return new URL(u, location.href).href; } catch { return u; }
  }

  // ========== Hook Fetch ==========
  let myFetchInstalled = false;

  function installFetchHook() {
    if (myFetchInstalled) return;

    // 如果 fetch 已经被覆盖成不是原生的，用当前值作为原始
    const isNative = window.fetch?.toString?.().includes('[native code]');
    const origFetch = isNative ? window.fetch : window.__mynatest_orig_fetch__ || window.fetch;
    if (!window.__mynatest_orig_fetch__) window.__mynatest_orig_fetch__ = origFetch;

    const myFetch = async function (...args) {
      const [input, init = {}] = args;
      const url = absoluteUrl(typeof input === 'string' ? input : input?.url || '');
      const method = init.method || (typeof input !== 'string' ? input?.method : null) || 'GET';
      const startAt = performance.now();

      let response, error;
      try {
        response = await origFetch.apply(this, args);
      } catch (e) {
        error = e;
      }
      const duration = Math.round(performance.now() - startAt);

      if (error) {
        BRIDGE('network:request', {
          url, method, duration,
          requestHeaders: normalizeHeaders(init.headers || (typeof input !== 'string' ? input?.headers : null)),
          error: String(error),
          success: false,
          timestamp: Date.now()
        });
        throw error;
      }

      const cloned = response.clone();
      let bodyText = '';
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('json') || contentType.includes('text') || contentType.includes('javascript') || contentType.includes('xml') || contentType.includes('graphql')) {
        try { bodyText = await cloned.text(); } catch (_) {}
      } else {
        try {
          const t = await cloned.text();
          const trimmed = t.trim();
          if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
            bodyText = t;
          } else if (trimmed.length < 10000 && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(trimmed)) {
            bodyText = t;
          } else {
            bodyText = `[binary: ${contentType || 'unknown'}]`;
          }
        } catch (_) {
          bodyText = `[binary: ${contentType || 'unknown'}]`;
        }
      }

      BRIDGE('network:request', {
        url, method, duration,
        status: response.status,
        statusText: response.statusText,
        requestHeaders: normalizeHeaders(init.headers || (typeof input !== 'string' ? input?.headers : null)),
        responseHeaders: Object.fromEntries(response.headers.entries()),
        requestBody: init.body ? (typeof init.body === 'string' ? init.body : '[body]') : null,
        responseBody: bodyText,
        success: response.ok,
        timestamp: Date.now()
      });

      return response;
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: myFetch,
        writable: false,
        configurable: true,  // 允许我们自己 redefine
        enumerable: true
      });
    } catch (e) {
      window.fetch = myFetch;
    }

    myFetchInstalled = true;
  }

  installFetchHook();

  // ========== Hook XMLHttpRequest ==========
  let xhrHookInstalled = false;

  function installXHRHook() {
    if (xhrHookInstalled) return;

    const origXHROpen = XMLHttpRequest.prototype.open;
    const origXHRSend = XMLHttpRequest.prototype.send;
    const origXHRSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      this.__mynatest_method__ = method;
      this.__mynatest_url__ = absoluteUrl(url);
      this.__mynatest_headers__ = {};
      this.__mynatest_start__ = 0;
      return origXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      if (!this.__mynatest_headers__) this.__mynatest_headers__ = {};
      this.__mynatest_headers__[name] = value;
      return origXHRSetHeader.call(this, name, value);
    };

    XMLHttpRequest.prototype.send = function (body) {
      this.__mynatest_start__ = performance.now();

      const onLoadEnd = () => {
        const duration = Math.round(performance.now() - this.__mynatest_start__);
        let responseBody = '';
        try { responseBody = this.responseText || ''; } catch (_) {}
        BRIDGE('network:request', {
          url: this.__mynatest_url__ || '',
          method: this.__mynatest_method__ || 'GET',
          duration,
          status: this.status,
          statusText: this.statusText,
          requestHeaders: this.__mynatest_headers__ || null,
          responseHeaders: (() => {
            try {
              const raw = this.getAllResponseHeaders();
              const obj = {};
              raw.split(/\r?\n/).forEach(line => {
                const idx = line.indexOf(':');
                if (idx > 0) obj[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
              });
              return obj;
            } catch { return null; }
          })(),
          requestBody: body ? (typeof body === 'string' ? body : '[body]') : null,
          responseBody,
          success: this.status >= 200 && this.status < 400,
          timestamp: Date.now()
        });
      };

      // 只监听 loadend —— 它覆盖所有终止状态：success、error、abort
      // 如果同时监听 error/abort 会导致错误场景下触发 2 次
      this.addEventListener('loadend', onLoadEnd, { once: true });

      return origXHRSend.call(this, body);
    };

    xhrHookInstalled = true;
  }

  installXHRHook();

  // ========== 主动巡检：防止被页面脚本覆盖 ==========
  // 有些 SPA 应用会在运行时重新赋值 window.fetch = xxx
  // 我们每秒检查一次，如果 fetch 不是我们的就重新 hook
  try {
    window.fetch.__mynatest_is_hooked__ = true;
  } catch {}

  try {
    XMLHttpRequest.prototype.send.__mynatest_is_hooked__ = true;
  } catch {}

  setInterval(() => {
    // 检查 fetch
    if (typeof window.fetch === 'function' && !window.fetch.__mynatest_is_hooked__) {
      window.__mynatest_orig_fetch__ = window.fetch;
      myFetchInstalled = false;
      installFetchHook();
      try { window.fetch.__mynatest_is_hooked__ = true; } catch {}
    }
    // 检查 XHR send
    if (typeof XMLHttpRequest.prototype.send === 'function' && !XMLHttpRequest.prototype.send.__mynatest_is_hooked__) {
      xhrHookInstalled = false;
      installXHRHook();
      try { XMLHttpRequest.prototype.send.__mynatest_is_hooked__ = true; } catch {}
    }
  }, 1000);

  // 通知加载完成
  BRIDGE('network:hook-ready', { ok: true });
})();

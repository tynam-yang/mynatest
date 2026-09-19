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

  // ========== Web Vitals + ResourceTiming ==========
  const VITALS = {
    lcp: null,      // { value: ms, element: tag }
    cls: 0,         // accumulated session value
    inp: null,      // p98 of all events { value: ms, element: tag }
    _inpEntries: [] // all event durations for INP p98 calc
  };

  function reportVitals() {
    BRIDGE('perf:vitals', {
      lcp: VITALS.lcp,
      cls: VITALS.cls,
      inp: VITALS.inp,
      timestamp: Date.now()
    });
  }

  // LCP
  try {
    const lcpObs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        VITALS.lcp = {
          value: Math.round(last.startTime),
          element: last.element ? last.element.tagName.toLowerCase() + (last.element.id ? '#' + last.element.id : '') : ''
        };
        reportVitals();
      }
    });
    lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_) {}

  // CLS
  try {
    let clsSession = 0;
    let clsSessionStart = performance.now();
    const clsObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // 忽略用户输入后的 layout shift
        if (entry.hadRecentInput) continue;
        clsSession += entry.value;
        // session 结束条件：shift gap > 1s 或 total session gap > 5s
        const now = performance.now();
        if (now - clsSessionStart > 5000) {
          VITALS.cls = clsSession;
          reportVitals();
          clsSession = 0;
          clsSessionStart = now;
        }
      }
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });

    // pagehide 时输出最终值
    const finalizeCLS = () => {
      if (clsSession > 0) {
        VITALS.cls += clsSession;
        clsSession = 0;
        reportVitals();
      }
    };
    addEventListener('visibilitychange', finalizeCLS);
    addEventListener('pagehide', finalizeCLS);
  } catch (_) {}

  // INP
  try {
    const inpObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // 只关注有交互的事件
        if (entry.interactionId || (entry.name === 'click' || entry.name === 'keydown' || entry.name === 'pointerdown')) {
          const dur = Math.round(entry.duration);
          VITALS._inpEntries.push({
            duration: dur,
            element: entry.target && entry.target.tagName ? entry.target.tagName.toLowerCase() : '',
            name: entry.name
          });
          // 计算 p98
          const sorted = VITALS._inpEntries.slice().sort((a, b) => a.duration - b.duration);
          const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.98) - 1);
          if (idx >= 0) {
            const top = sorted[idx];
            VITALS.inp = { value: top.duration, element: top.element, name: top.name };
            reportVitals();
          }
        }
      }
    });
    inpObs.observe({ type: 'event', buffered: true, durationThreshold: 0 });
  } catch (_) {}

  // ResourceTiming 收集（按需触发）
  function collectResources() {
    try {
      const entries = performance.getEntriesByType('resource');
      const resources = entries.map(e => {
        const phases = {
          dns: Math.max(0, e.domainLookupEnd - e.domainLookupStart),
          tcp: Math.max(0, e.connectEnd - e.connectStart),
          ttfb: Math.max(0, e.responseStart - e.requestStart),
          download: Math.max(0, e.responseEnd - e.responseStart),
          total: Math.round(e.duration)
        };
        return {
          name: e.name,
          initiatorType: e.initiatorType,
          transferSize: e.transferSize || 0,
          encodedBodySize: e.encodedBodySize || 0,
          decodedBodySize: e.decodedBodySize || 0,
          startTime: Math.round(e.startTime),
          redirectStart: Math.round(e.redirectStart),
          ...phases
        };
      });
      // 按 startTime 排序
      resources.sort((a, b) => a.startTime - b.startTime);

      // 资源类型聚合
      const typeMap = {};
      resources.forEach(r => {
        const t = r.initiatorType || 'other';
        if (!typeMap[t]) typeMap[t] = { count: 0, totalTransfer: 0, totalDecoded: 0 };
        typeMap[t].count++;
        typeMap[t].totalTransfer += r.transferSize;
        typeMap[t].totalDecoded += r.decodedBodySize;
      });

      BRIDGE('perf:resources', { resources, typeBreakdown: typeMap, timestamp: Date.now() });
    } catch (e) {
      BRIDGE('perf:resources', { resources: [], typeBreakdown: {}, error: String(e.message || e), timestamp: Date.now() });
    }
  }

  // 监听 sidepanel 发来的采集请求
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    if (!ev.data || ev.data.__mynatest__ !== true) return;
    if (ev.data.type === 'perf:collect') {
      collectResources();
      reportVitals();
    }
    if (ev.data.type === 'resource-check:collect') {
      collectFailedResources();
    }
  });

  // ========== 资源加载失败检测 ==========
  // 1) capture-phase error 监听（img/script/link 失败不会冒泡，必须 capture）
  const FAILED_RESOURCES = new Map(); // url → { url, type, element, timestamp }

  window.addEventListener('error', (e) => {
    // 只关心资源加载错误，过滤掉 JS runtime error（有 message/filename）
    const target = e.target;
    if (!target || !(target instanceof HTMLElement)) return;
    // 排除 window.onerror 上报的 JS 错误（它们的 target 是 window）
    if (target === window) return;

    let type = null;
    let url = '';
    const tag = target.tagName ? target.tagName.toLowerCase() : '';

    if (tag === 'img' || tag === 'picture') {
      type = 'image';
      url = target.currentSrc || target.src || '';
    } else if (tag === 'script') {
      type = 'js';
      url = target.src || '';
    } else if (tag === 'link') {
      const rel = (target.rel || '').toLowerCase();
      const as = (target.as || '').toLowerCase();
      if (rel === 'stylesheet') { type = 'css'; url = target.href || ''; }
      else if (as === 'font' || (target.href && /\.(woff2?|ttf|otf|eot)(\?|$)/i.test(target.href))) { type = 'font'; url = target.href || ''; }
      else if (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon') { type = 'image'; url = target.href || ''; }
      else { return; }
    } else if (tag === 'source') {
      // picture 内的 source
      const as = (target.as || '').toLowerCase();
      if (as === 'image' || target.srcset) { type = 'image'; url = target.srcset || target.src || ''; }
      else return;
    } else {
      return; // 不关心的标签
    }

    if (!url) return;
    const absUrl = absoluteUrl(url.split(/\s/)[0]); // srcset 取第一个
    if (!FAILED_RESOURCES.has(absUrl)) {
      FAILED_RESOURCES.set(absUrl, {
        url: absUrl,
        type,
        element: tag,
        timestamp: Date.now(),
        from: 'error-event'
      });
    }
  }, true); // ← capture=true 关键！资源错误不冒泡

  // 2) PerformanceObserver 补充：同域资源的 responseStatus >= 400 或 transferSize === 0
  //    （跨域资源拿不到 responseStatus，但 error event 已经覆盖了）
  try {
    const resObs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // 只检查已经有 initiatorType 的资源
        const it = entry.initiatorType;
        if (!it) continue;
        const url = entry.name;
        // 已经被 error-event 捕获的跳过
        if (FAILED_RESOURCES.has(url)) continue;

        // 同域：看 responseStatus
        if (entry.responseStatus !== undefined) {
          if (entry.responseStatus >= 400 && entry.responseStatus < 600) {
            const type = mapInitiatorToType(it);
            if (type) {
              FAILED_RESOURCES.set(url, {
                url, type, element: it,
                status: entry.responseStatus,
                timestamp: Date.now(),
                from: 'performance-observer'
              });
            }
          }
        } else {
          // 跨域：transferSize === 0 且 decodedBodySize === 0 可能是失败
          // 但 transferSize 为 0 也可能是缓存，所以跳过（依赖 error-event）
        }
      }
    });
    resObs.observe({ type: 'resource', buffered: true });
  } catch (_) {}

  function mapInitiatorToType(it) {
    if (it === 'img' || it === 'image') return 'image';
    if (it === 'script') return 'js';
    if (it === 'link') return 'css'; // link rel=stylesheet
    if (it === 'css' || it === 'stylesheet') return 'css';
    if (it === 'font') return 'font';
    return null;
  }

  // 3) 主动采集：输出所有资源（成功 + 失败），每条带 ok/error 状态
  function collectFailedResources() {
    // 先收集 PerformanceObserver 中的所有资源
    const all = [];
    const seen = new Set();

    try {
      const perfEntries = performance.getEntriesByType('resource');
      for (const e of perfEntries) {
        const it = e.initiatorType;
        const type = mapInitiatorToType(it);
        if (!type) continue;
        const url = e.name;
        seen.add(url);

        // 判断是否成功
        let ok = true;
        let status = null;
        let from = 'performance';

        if (FAILED_RESOURCES.has(url)) {
          ok = false;
          const rec = FAILED_RESOURCES.get(url);
          status = rec.status || 'error';
          from = rec.from || 'error-event';
        } else if (e.responseStatus !== undefined) {
          // 同域：看 HTTP 状态码
          status = e.responseStatus;
          if (e.responseStatus >= 400 && e.responseStatus < 600) {
            ok = false;
            from = 'performance-observer';
          }
        }
        // 跨域资源 responseStatus 为 0：无法判断，默认 ok=true

        all.push({
          url, type, ok, status, from,
          transferSize: e.transferSize || 0,
          decodedSize: e.decodedBodySize || 0,
          duration: Math.round(e.duration),
          initiatorType: it
        });
      }
    } catch (_) {}

    // 补充 error-event 捕获但不在 PerformanceObserver 中的条目（极少见）
    FAILED_RESOURCES.forEach((rec, url) => {
      if (!seen.has(url)) {
        all.push({
          url, type: rec.type, ok: false,
          status: rec.status || 'error', from: rec.from || 'error-event',
          transferSize: 0, decodedSize: 0, duration: 0,
          initiatorType: rec.element
        });
      }
    });

    // document.fonts 检查
    try {
      if (document.fonts && document.fonts.check) {
        document.fonts.forEach(fontFace => {
          if (fontFace.status === 'error' || fontFace.status === 'loadfailed') {
            const key = fontFace.family + ' (字体)';
            all.push({
              url: key, type: 'font', ok: false,
              status: 'loadfailed', from: 'document.fonts',
              transferSize: 0, decodedSize: 0, duration: 0,
              initiatorType: '@font-face'
            });
          }
        });
      }
    } catch (_) {}

    // 按 ok 分组，失败排前面，成功排后面
    all.sort((a, b) => {
      if (a.ok !== b.ok) return a.ok ? 1 : -1;
      return a.url.localeCompare(b.url);
    });

    const failedCount = all.filter(r => !r.ok).length;
    const okCount = all.length - failedCount;

    BRIDGE('resource-check:result', {
      all,
      failedCount,
      okCount,
      totalResources: all.length,
      timestamp: Date.now()
    });
  }
})();

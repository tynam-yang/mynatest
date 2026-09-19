// Content Script (ISOLATED world)
// 职责：MAIN world → background 的消息桥接
// 使用 Port 长连接（storage/onChanged 中转在部分场景会丢消息，已验证不可靠）

(function () {
  if (window.__mynatest_content_loaded__) return;
  window.__mynatest_content_loaded__ = true;

  let relayPort = null;
  // 扩展被重载后，本页的 chrome.* 上下文永久失效，只能刷新页面恢复
  let contextDead = false;

  function isContextDead() {
    try { return !chrome.runtime || !chrome.runtime.id; }
    catch { return true; } // Extension context invalidated
  }

  function connect() {
    if (contextDead) return;
    try {
      relayPort = chrome.runtime.connect({ name: 'content-relay' });
      relayPort.onDisconnect.addListener(() => { relayPort = null; });
    } catch (e) {
      relayPort = null;
      if (/context invalidated/i.test(String(e?.message)) || isContextDead()) {
        contextDead = true;
        console.warn('[MynaTest] 扩展已重载，本页需刷新后才能恢复捕获');
      }
    }
  }
  connect();

  // bfcache 恢复时重新连接 Port（页面被 Back/Forward 缓存后 IIFE 不会重跑）
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      console.info('[MynaTest] 从 bfcache 恢复，重连 Port');
      relayPort = null;
      contextDead = false;
      connect();
    }
  });

  // MAIN world → Content Script：监听 injected.js 发来的 network:*
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.__mynatest__ !== true) return;

    const { type, payload } = event.data;

    // hook-ready 只用于确认注入成功，不转发
    if (type === 'network:hook-ready') return;
    if (!type || (!String(type).startsWith('network:') && !String(type).startsWith('perf:') && !String(type).startsWith('resource-check:'))) return;

    // 上下文已失效：静默放弃，避免每次请求都报错
    if (contextDead) return;

    // Port 断了（SW 休眠回收）则重连后发送
    if (!relayPort) connect();
    try {
      relayPort.postMessage({ type, payload });
    } catch (e) {
      if (/context invalidated/i.test(String(e?.message)) || isContextDead()) {
        contextDead = true;
        console.warn('[MynaTest] 扩展已重载，本页需刷新后才能恢复捕获');
        return;
      }
      connect();
      try { relayPort.postMessage({ type, payload }); } catch (_) {}
    }
  });
})();

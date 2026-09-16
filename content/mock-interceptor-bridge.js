// content/mock-interceptor-bridge.js — ISOLATED world
// 职责：读取 chrome.storage 中的 Mock 配置 → postMessage 下发给 MAIN world
// 不直接 hook，只做配置桥接

(function () {
  const STORAGE_KEY = 'mockInterceptor';

  // 读取 storage 配置
  function readConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        resolve(result[STORAGE_KEY] || { enabled: false, scenes: [], activeSceneId: null });
      });
    });
  }

  // 计算当前生效的规则（活跃场景的规则 + 全局开关）
  function buildPayload(config) {
    const enabled = !!config.enabled;
    let activeRules = [];
    if (enabled && config.activeSceneId) {
      const scene = (config.scenes || []).find(s => s.id === config.activeSceneId);
      if (scene) activeRules = scene.rules || [];
    }
    return {
      enabled,
      rules: activeRules
    };
  }

  // 下发配置到 MAIN world
  function sendConfig(payload) {
    window.postMessage({
      __mynatest_mock__: true,
      type: 'config',
      payload
    }, '*');
  }

  // 初始下发
  readConfig().then(config => {
    sendConfig(buildPayload(config));
  });

  // 监听 storage 变化，实时下发
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    const config = changes[STORAGE_KEY].newValue || { enabled: false, scenes: [], activeSceneId: null };
    sendConfig(buildPayload(config));
  });

  // 监听 MAIN world 就绪通知，重新下发一次
  window.addEventListener('message', (e) => {
    if (!e.data || !e.data.__mynatest_mock_ready__) return;
    readConfig().then(config => {
      sendConfig(buildPayload(config));
    });
  });
})();

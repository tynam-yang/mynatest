// Env Banner Content Script (ISOLATED world)
// 读取 chrome.storage.envBanner 配置，匹配当前域名后在页面顶部注入横幅

(function () {
  if (window.__mynatest_banner_loaded__) return;
  window.__mynatest_banner_loaded__ = true;

  const BANNER_ID = '__mynatest_env_banner__';
  const CONFIG_KEY = 'envBanner';

  /** 把用户配置的 pattern 转成可匹配函数 */
  function compilePattern(pattern) {
    if (!pattern) return () => false;
    const p = String(pattern).trim();
    if (!p) return () => false;
    // 通配符：* 表示任意字符（不含点），** 表示任意字符（含点）
    // 例：*.dev.example.com → /^[^.]+\.dev\.example\.com$/
    //     dev-*.example.com → /^dev-[^.]+\.example\.com$/
    //     *local* → /local/  (contains)
    if (p.includes('*')) {
      const parts = p.split('*').map(escapeRegExp);
      // 如果只是简单 *xxx* → contains 模式
      if (p.startsWith('*') && p.endsWith('*') && (p.match(/\*/g) || []).length === 2) {
        const needle = p.slice(1, -1);
        const re = new RegExp(escapeRegExp(needle), 'i');
        return (h) => re.test(h);
      }
      // 完整通配匹配
      let reStr = '^';
      parts.forEach((part, i) => {
        if (i > 0) reStr += '[^.]*';
        reStr += part;
      });
      reStr += '$';
      const re = new RegExp(reStr, 'i');
      return (h) => re.test(h);
    }
    // 正则（以 / 开头结尾）
    if (p.startsWith('/') && p.endsWith('/')) {
      try {
        const re = new RegExp(p.slice(1, -1));
        return (h) => re.test(h);
      } catch { /* fallthrough */ }
    }
    // 精确匹配
    const re = new RegExp('^' + escapeRegExp(p) + '$', 'i');
    return (h) => re.test(h);
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** hostname 匹配某个环境的 patterns */
  function matchEnv(hostname, env) {
    if (!env || !env.patterns || !env.patterns.length) return null;
    for (const raw of env.patterns) {
      if (!raw) continue;
      const fn = compilePattern(raw);
      if (fn(hostname)) return raw;
    }
    return null;
  }

  /** 注入横幅 */
  function showBanner(env, matchedPattern) {
    // 移除旧横幅
    hideBanner();

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'right: 0',
      'z-index: 2147483647',
      'padding: 6px 16px',
      'font-size: 12px',
      'font-weight: 600',
      'font-family: -apple-system, "PingFang SC", sans-serif',
      'text-align: center',
      'cursor: pointer',
      'user-select: none',
      'box-shadow: 0 2px 6px rgba(0,0,0,0.15)',
      `background: ${env.bgColor || '#ef4444'}`,
      `color: ${env.fgColor || '#fff'}`,
    ].join(';');
    banner.textContent = `⚠️ ${env.label || env.name || '测试环境'} — ${location.hostname}`;

    // 点击显示详情 / 关闭
    banner.addEventListener('click', (e) => {
      if (e.shiftKey) { hideBanner(true); return; }
      const msg = [
        `【MynaTest · 环境横幅】`,
        `环境：${env.label || env.name}`,
        `域名：${location.hostname}`,
        `匹配规则：${matchedPattern}`,
        ``,
        `按住 Shift 点击横幅可临时关闭`,
        `右键扩展图标 → 选项 → 环境横幅 可调整配置`,
      ].join('\n');
      alert(msg);
    });

    document.documentElement.appendChild(banner);

    // 把 body 整体下移，防止横幅遮挡内容
    const bannerHeight = banner.offsetHeight;
    applyBodyOffset(bannerHeight);
  }

  function hideBanner(persist) {
    const old = document.getElementById(BANNER_ID);
    if (old) old.remove();
    applyBodyOffset(0);
    if (persist) {
      // 仅本次会话关闭（存储一个 session 级标记）
      sessionStorage.setItem(BANNER_ID + '_hidden', '1');
    } else {
      sessionStorage.removeItem(BANNER_ID + '_hidden');
    }
  }

  function applyBodyOffset(offset) {
    const key = BANNER_ID + '_offset';
    if (offset > 0) {
      document.documentElement.style.setProperty(key, offset + 'px');
      document.body.style.paddingTop = offset + 'px';
    } else {
      document.body.style.paddingTop = '';
    }
  }

  /** 主流程：读取配置 → 匹配 → 显示 */
  function checkAndShow() {
    if (sessionStorage.getItem(BANNER_ID + '_hidden')) return;

    try {
      const hostname = location.hostname;
      if (!hostname || hostname === 'chrome-extension://' || hostname.startsWith('chrome-')) return;

      chrome.storage.local.get([CONFIG_KEY], (result) => {
        const cfg = result[CONFIG_KEY];
        if (!cfg || !cfg.enabled || !Array.isArray(cfg.environments)) return;

        // 遍历所有启用的环境，按配置顺序匹配（先匹配先生效）
        for (const env of cfg.environments) {
          if (!env.enabled && env.enabled !== undefined) continue;
          // prod 默认不开启横幅（安全起见）
          const matched = matchEnv(hostname, env);
          if (matched) {
            showBanner(env, matched);
            return;
          }
        }
      });
    } catch (e) { /* context dead 等情况静默 */ }
  }

  // 首次检查
  checkAndShow();

  // SPA 路由变化时重新检查
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args) { const r = origPush.apply(this, args); setTimeout(checkAndShow, 50); return r; };
  history.replaceState = function (...args) { const r = origReplace.apply(this, args); setTimeout(checkAndShow, 50); return r; };
  window.addEventListener('popstate', () => setTimeout(checkAndShow, 50));

  // storage 变化实时响应（改了配置后无需刷新页面）
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes[CONFIG_KEY]) checkAndShow();
    });
  } catch {}
})();

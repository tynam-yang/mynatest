// tools/ua-generator.js — User-Agent 生成工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'ua-generator',
    name: 'UA 生成',
    desc: '随机生成 User-Agent，支持多浏览器多平台；显示本机当前 UA',
    icon: '🕵️',
    iconUrl: 'icons/ua-generator.png',
    category: 'data-gen',
    categoryName: '数据生成'
  };

  // ========== UA 数据库 ==========

  // Chrome — 跨平台（macOS / Windows / Linux / Android）
  const chrome = {
    versions: [
      '131.0.6778.86', '130.0.6728.119', '129.0.6668.91',
      '128.0.6613.120', '127.0.6533.88', '126.0.6478.61',
      '125.0.6422.78', '124.0.6367.60', '123.0.6312.118'
    ],
    mac: [
      'Macintosh; Intel Mac OS X 10_15_7',
      'Macintosh; Intel Mac OS X 14_7_1',
      'Macintosh; Intel Mac OS X 13_6',
      'Macintosh; Intel Mac OS X 12_6_1',
      'Macintosh; Intel Mac OS X 10_14_6'
    ],
    win: [
      'Windows NT 10.0; Win64; x64',
      'Windows NT 10.0; WOW64',
      'Windows NT 6.3; Win64; x64',
      'Windows NT 6.1; WOW64'
    ],
    linux: [
      'X11; Linux x86_64',
      'X11; Ubuntu; Linux x86_64',
      'X11; Fedora; Linux x86_64'
    ],
    android: [
      'Linux; Android 14; Pixel 8',
      'Linux; Android 13; SM-G991B',
      'Linux; Android 12; Pixel 6 Pro',
      'Linux; Android 14; SM-S928B',
      'Linux; Android 13; Mi 13 Pro'
    ]
  };

  // Safari — macOS / iOS
  const safari = {
    desktop: [
      { os: 'Macintosh; Intel Mac OS X 14_7_1', ver: '18.0', build: '605.1.15' },
      { os: 'Macintosh; Intel Mac OS X 13_6', ver: '17.6', build: '605.1.15' },
      { os: 'Macintosh; Intel Mac OS X 12_6_1', ver: '16.6', build: '605.1.15' },
      { os: 'Macintosh; Intel Mac OS X 10_15_7', ver: '15.6.1', build: '605.1.15' }
    ],
    ios: [
      { device: 'iPhone; CPU iPhone OS 18_0', ver: '18.0', build: '605.1.15' },
      { device: 'iPhone; CPU iPhone OS 17_6', ver: '17.6', build: '605.1.15' },
      { device: 'iPad; CPU OS 18_0', ver: '18.0', build: '605.1.15' },
      { device: 'iPhone; CPU iPhone OS 16_6', ver: '16.6', build: '605.1.15' }
    ]
  };

  // Firefox
  const firefox = {
    versions: ['131.0', '130.0', '129.0', '128.0', '127.0.1', '126.0'],
    mac: ['Macintosh; Intel Mac OS X 10.15', 'Macintosh; Intel Mac OS X 14.7', 'Macintosh; Intel Mac OS X 13.6'],
    win: ['Windows NT 10.0; Win64; x64', 'Windows NT 10.0; WOW64', 'Windows NT 6.1; WOW64'],
    linux: ['X11; Linux x86_64', 'X11; Ubuntu; Linux x86_64']
  };

  // Edge — Chromium 内核
  const edge = {
    versions: ['131.0.2903.120', '130.0.2849.68', '129.0.2792.65', '128.0.2739.42'],
    win: ['Windows NT 10.0; Win64; x64', 'Windows NT 10.0; WOW64'],
    mac: ['Macintosh; Intel Mac OS X 14_7_1', 'Macintosh; Intel Mac OS X 13_6']
  };

  // Samsung Internet
  const samsung = {
    versions: ['27.0.4.81', '26.0.3.56', '25.0.2.71'],
    devices: [
      'Linux; Android 14; SM-S928B',
      'Linux; Android 13; SM-G991B',
      'Linux; Android 14; SM-A546B',
      'Linux; Android 12; SM-S908B'
    ]
  };

  // ========== 生成函数 ==========

  function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pick(obj, keys) { return obj[keys[Math.floor(Math.random() * keys.length)]]; }

  function generateChrome(platform) {
    const v = rand(chrome.versions);
    const saf = rand(['537.36']); // Chrome 的 AppleWebKit 版本固定
    let os;
    switch (platform) {
      case 'mac': os = rand(chrome.mac); break;
      case 'win': os = rand(chrome.win); break;
      case 'linux': os = rand(chrome.linux); break;
      case 'android': os = rand(chrome.android); break;
      default: os = rand([...chrome.mac, ...chrome.win, ...chrome.linux]);
    }
    const isAndroid = platform === 'android' || (platform === 'random' && os.startsWith('Linux; Android'));
    if (isAndroid) {
      return `Mozilla/5.0 (${os}) AppleWebKit/${saf} (KHTML, like Gecko) Chrome/${v} Mobile Safari/${saf}`;
    }
    return `Mozilla/5.0 (${os}) AppleWebKit/${saf} (KHTML, like Gecko) Chrome/${v} Safari/${saf}`;
  }

  function generateSafari(platform) {
    if (platform === 'ios' || (platform === 'random' && Math.random() > 0.5)) {
      const d = rand(safari.ios);
      return `Mozilla/5.0 (${d.device} like Mac OS X) AppleWebKit/${d.build} (KHTML, like Gecko) Version/${d.ver} Mobile/${d.ver} Safari/${d.build}`;
    }
    const d = rand(safari.desktop);
    return `Mozilla/5.0 (${d.os}) AppleWebKit/${d.build} (KHTML, like Gecko) Version/${d.ver} Safari/${d.build}`;
  }

  function generateFirefox(platform) {
    const v = rand(firefox.versions);
    let os;
    switch (platform) {
      case 'mac': os = rand(firefox.mac); break;
      case 'win': os = rand(firefox.win); break;
      case 'linux': os = rand(firefox.linux); break;
      default: os = rand([...firefox.mac, ...firefox.win, ...firefox.linux]);
    }
    const geckoVer = Date.now().toString().slice(0, 10);
    return `Mozilla/5.0 (${os}; rv:${v.split('.')[0]}.0) Gecko/20100101 Firefox/${v}`;
  }

  function generateEdge(platform) {
    const v = rand(edge.versions);
    let os;
    switch (platform) {
      case 'win': os = rand(edge.win); break;
      case 'mac': os = rand(edge.mac); break;
      default: os = rand([...edge.win, ...edge.mac]);
    }
    const chromiumV = v.split('.')[0] + '.0.0.0';
    return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromiumV} Safari/537.36 Edg/${v}`;
  }

  function generateSamsung() {
    const v = rand(samsung.versions);
    const d = rand(samsung.devices);
    return `Mozilla/5.0 (${d}) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${v} Chrome/${v.split('.')[0]}.0.0.0 Mobile Safari/537.36`;
  }

  const generators = {
    chrome: generateChrome,
    safari: generateSafari,
    firefox: generateFirefox,
    edge: generateEdge,
    samsung: generateSamsung
  };

  function randomUA(browser, platform) {
    if (browser === 'random') {
      browser = Object.keys(generators)[Math.floor(Math.random() * Object.keys(generators).length)];
    }
    const gen = generators[browser];
    if (browser === 'samsung') return gen();
    return gen(platform);
  }

  // ========== 渲染与挂载 ==========

  function render(container) {
    const currentUA = navigator.userAgent;
    container.innerHTML = `
      <div class="uag-wrap">
        <div class="lc-header"><h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2></div>

        <!-- 本机 UA -->
        <div class="uag-section">
          <div class="uag-section-title">🖥 本机当前 User-Agent</div>
          <div class="uag-current">
            <div class="uag-current-value" id="uagCurrent">${escapeHtml(currentUA)}</div>
            <div class="uag-current-actions">
              <button class="uag-copy" data-target="uagCurrent">复制</button>
            </div>
          </div>
          <div class="uag-parse" id="uagParse">${parseUA(currentUA)}</div>
        </div>

        <!-- UA 随机生成 -->
        <div class="uag-section">
          <div class="uag-section-title">🎲 随机生成</div>
          <div class="uag-gen-row">
            <label class="uag-label">浏览器</label>
            <select id="uagBrowser" class="uag-select">
              <option value="random" selected>随机</option>
              <option value="chrome">Chrome</option>
              <option value="safari">Safari</option>
              <option value="firefox">Firefox</option>
              <option value="edge">Edge</option>
              <option value="samsung">Samsung</option>
            </select>
            <label class="uag-label">平台</label>
            <select id="uagPlatform" class="uag-select">
              <option value="random">随机</option>
              <option value="win">Windows</option>
              <option value="mac">macOS</option>
              <option value="linux">Linux</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </div>
          <div class="uag-gen-row">
            <label class="uag-label">数量</label>
            <input type="number" id="uagCount" class="uag-input uag-count" min="1" max="500" value="1">
            <button class="uag-btn uag-btn-primary" id="uagGenBtn">生成</button>
          </div>
          <div class="uag-result" id="uagResult" style="display:none;"></div>
          <div class="uag-copy-all" id="uagCopyAll" style="display:none;">
            <button class="uag-btn uag-btn-primary uag-btn-copyall" id="uagCopyAllBtn">📋 复制全部</button>
          </div>
        </div>

      </div>
    `;
  }

  function parseUA(ua) {
    const parts = [];
    // 浏览器
    if (ua.includes('Edg/')) parts.push('Edge');
    else if (ua.includes('SamsungBrowser/')) parts.push('Samsung');
    else if (ua.includes('Firefox/')) parts.push('Firefox');
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) parts.push('Safari');
    else if (ua.includes('Chrome/')) parts.push('Chrome');
    else parts.push('未知');

    // 平台
    if (ua.includes('Windows NT 10.0')) parts.push('Windows 10/11');
    else if (ua.includes('Windows NT 6.3')) parts.push('Windows 8.1');
    else if (ua.includes('Windows NT 6.1')) parts.push('Windows 7');
    else if (ua.includes('Mac OS X 14')) parts.push('macOS Sonoma');
    else if (ua.includes('Mac OS X 13')) parts.push('macOS Ventura');
    else if (ua.includes('Mac OS X 12')) parts.push('macOS Monterey');
    else if (ua.includes('Mac OS X 10_15') || ua.includes('Mac OS X 10.15')) parts.push('macOS Catalina');
    else if (ua.includes('iPhone')) parts.push('iOS');
    else if (ua.includes('iPad')) parts.push('iPadOS');
    else if (ua.includes('Android')) parts.push('Android');
    else if (ua.includes('Linux')) parts.push('Linux');

    return `<span class="uag-tag">${parts.join('</span><span class="uag-tag">')}</span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function mount(context) {
    const container = context.container;

    container.querySelector('#uagBrowser').addEventListener('change', (e) => {
      const platform = container.querySelector('#uagPlatform');
      // Samsung 只有 Android，iOS 只有 Safari
      const browser = e.target.value;
      const opts = platform.options;
      for (let i = 0; i < opts.length; i++) {
        const v = opts[i].value;
        if (browser === 'samsung') {
          opts[i].disabled = v !== 'random' && v !== 'android';
        } else if (browser === 'safari') {
          opts[i].disabled = v !== 'random' && v !== 'mac' && v !== 'ios';
        } else if (browser === 'edge') {
          opts[i].disabled = v !== 'random' && v !== 'win' && v !== 'mac';
        } else {
          opts[i].disabled = false;
        }
      }
      // 如果当前选中的被禁用，切到 random
      if (platform.options[platform.selectedIndex].disabled) {
        platform.value = 'random';
      }
    });

    // 数量输入自动 clamp
    const uagCountInput = container.querySelector('#uagCount');
    uagCountInput.addEventListener('input', () => {
      const val = parseInt(uagCountInput.value, 10);
      if (isNaN(val)) return;
      const max = parseInt(uagCountInput.max, 10) || 500;
      const min = parseInt(uagCountInput.min, 10) || 1;
      if (val > max) uagCountInput.value = max;
      if (val < min) uagCountInput.value = min;
    });

    container.querySelector('#uagGenBtn').addEventListener('click', () => {
      const browser = container.querySelector('#uagBrowser').value;
      const platform = container.querySelector('#uagPlatform').value;
      const count = Math.min(500, Math.max(1, Number(container.querySelector('#uagCount').value) || 1));
      const resultEl = container.querySelector('#uagResult');
      const copyAllEl = container.querySelector('#uagCopyAll');
      resultEl.style.display = 'block';
      copyAllEl.style.display = 'block';
      const list = [];
      const seen = new Set();
      for (let i = 0; i < count * 3 && list.length < count; i++) {
        const ua = randomUA(browser, platform);
        if (!seen.has(ua)) { seen.add(ua); list.push(ua); }
      }
      if (list.length < count) {
        // 数量不够，允许重复
        while (list.length < count) list.push(randomUA(browser, platform));
      }
      resultEl.innerHTML = list.map((ua) => `
        <div class="uag-result-item">
          <span class="uag-result-value" title="${escapeHtml(ua)}">${escapeHtml(ua)}</span>
          <div class="uag-result-actions">
            <span class="uag-meta">${parseUA(ua)}</span>
            <button class="uag-copy" data-val="${escapeHtml(ua)}">复制</button>
          </div>
        </div>
      `).join('');
      // 存储当前列表供复制全部使用
      resultEl.dataset.all = list.join('\n');
    });

    container.addEventListener('click', (e) => {
      // 复制全部
      const copyAllBtn = e.target.closest('#uagCopyAllBtn');
      if (copyAllBtn) {
        const all = container.querySelector('#uagResult').dataset.all;
        if (!all) return;
        navigator.clipboard?.writeText(all).then(() => flashMessage('✓ 已复制全部')).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = all; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
          flashMessage('✓ 已复制全部');
        });
        return;
      }
      // 单条复制
      const btn = e.target.closest('.uag-copy');
      if (!btn) return;
      const val = btn.dataset.val || document.getElementById(btn.dataset.target)?.textContent;
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => flashMessage('✓ 已复制')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = val; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        flashMessage('✓ 已复制');
      });
    });

    return () => {};
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

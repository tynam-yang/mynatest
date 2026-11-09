// tools/md5-tool.js — MD5 哈希工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'md5-tool',
    name: 'MD5 哈希',
    desc: 'MD5 哈希计算，支持 32位/16位 输出',
    iconUrl: 'icons/md5-tool.png',
    category: 'dev',
    categoryName: '开发工具'
  };

  // ========== 纯 JS MD5 实现 ==========
  function safeAdd(x, y) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function rol(n, c) {
    return (n << c) | (n >>> (32 - c));
  }

  function cmn(q, a, b, x, s, t) {
    return safeAdd(rol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = safeAdd(a, x[0]);
    x[1] = safeAdd(b, x[1]);
    x[2] = safeAdd(c, x[2]);
    x[3] = safeAdd(d, x[3]);
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i)
        + (s.charCodeAt(i + 1) << 8)
        + (s.charCodeAt(i + 2) << 16)
        + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function toHex(n) {
    let hex = '';
    for (let i = 0; i < 4; i++) {
      hex += ((n >> (i * 8 + 4)) & 0x0F).toString(16) + ((n >> (i * 8)) & 0x0F).toString(16);
    }
    return hex;
  }

  function md5String(s) {
    // UTF-8 编码
    const bytes = new TextEncoder().encode(s);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const state = md51(binary);
    return state.map(toHex).join('');
  }

  // ========== UI ==========
  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>

      <div class="md5-section">
        <div class="md5-label">输入文本</div>
        <textarea id="md5Input" class="md5-textarea" placeholder="输入要计算 MD5 的文本，支持中文..."></textarea>
      </div>

      <div class="md5-toolbar">
        <div class="md5-options">
          <label class="md5-option">
            <input type="radio" name="md5Length" value="32" checked>
            <span>32 位</span>
          </label>
          <label class="md5-option">
            <input type="radio" name="md5Length" value="16">
            <span>16 位</span>
          </label>
          <label class="md5-option">
            <input type="checkbox" id="md5Uppercase">
            <span>大写</span>
          </label>
        </div>
        <div class="md5-btns">
          <button class="btn primary" id="md5GenBtn">计算</button>
          <button class="btn danger" id="md5ClearBtn">清空</button>
        </div>
      </div>

      <div class="md5-section">
        <div class="md5-label">MD5 结果</div>
        <div class="md5-result-wrap">
          <input type="text" id="md5Result" class="md5-result" placeholder="结果将显示在这里..." readonly>
          <button class="btn-copy" id="md5CopyBtn">复制</button>
        </div>
      </div>

      <div class="md5-footer">
        <span id="md5Status" class="md5-status">就绪</span>
        <span id="md5Len" class="md5-len"></span>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;
    const input = c.querySelector('#md5Input');
    const result = c.querySelector('#md5Result');

    function setStatus(msg, isErr = false) {
      const el = c.querySelector('#md5Status');
      if (el) {
        el.textContent = msg;
        el.style.color = isErr ? '#e74c3c' : '#27ae60';
      }
    }

    function doHash() {
      const raw = input.value;
      if (!raw) { flashMessage('请输入文本', true); return; }

      try {
        let hash = md5String(raw);

        // 16 位 = 32 位的中间 16 位
        const lenRadio = c.querySelector('input[name="md5Length"]:checked');
        const len = lenRadio ? lenRadio.value : '32';
        if (len === '16') hash = hash.substring(8, 24);

        const uppercase = c.querySelector('#md5Uppercase').checked;
        if (uppercase) hash = hash.toUpperCase();

        result.value = hash;
        result.style.height = 'auto';
        result.style.height = result.scrollHeight + 'px';
        c.querySelector('#md5Len').textContent = hash.length + ' 字符';
        setStatus('✓ 计算成功');
        flashMessage('✓ MD5 计算成功');
      } catch (e) {
        setStatus('✗ 计算失败: ' + e.message, true);
        flashMessage('计算失败', true);
      }
    }

    function doClear() {
      input.value = '';
      result.value = '';
      c.querySelector('#md5Len').textContent = '';
      setStatus('已清空');
      input.focus();
    }

    function doCopy() {
      const val = result.value;
      if (!val) { flashMessage('没有内容可复制', true); return; }
      navigator.clipboard?.writeText(val).then(() => flashMessage('✓ 已复制'));
    }

    c.querySelector('#md5GenBtn').addEventListener('click', doHash);
    c.querySelector('#md5ClearBtn').addEventListener('click', doClear);
    c.querySelector('#md5CopyBtn').addEventListener('click', doCopy);

    // Ctrl/Cmd + Enter = hash
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        doHash();
      }
    });
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

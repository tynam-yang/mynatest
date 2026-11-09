// tools/base64-tool.js — Base64 编码/解码工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'base64-tool',
    name: 'Base64 编解码',
    desc: 'Base64 / Base64URL 编码与解码，支持中文',
    iconUrl: 'icons/base64-tool.png',
    category: 'format',
    categoryName: '格式转换'
  };

  // UTF-8 编码：字符串 → Base64
  function encodeUtf8(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // UTF-8 解码：Base64 → 字符串
  function decodeUtf8(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Base64 → Base64URL（去掉填充）
  function toBase64Url(b64) {
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Base64URL → Base64（恢复填充）
  function fromBase64Url(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return b64;
  }

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>

      <div class="b64-tabs">
        <button class="b64-tab active" data-mode="encode">编码</button>
        <button class="b64-tab" data-mode="decode">解码</button>
      </div>

      <div class="b64-options">
        <label class="b64-option">
          <input type="radio" name="b64Variant" value="standard" checked>
          <span>标准 Base64</span>
        </label>
        <label class="b64-option">
          <input type="radio" name="b64Variant" value="url">
          <span>Base64URL</span>
        </label>
      </div>

      <div class="b64-section">
        <div class="b64-label" id="b64InputLabel">原始文本</div>
        <textarea id="b64Input" class="b64-textarea" placeholder="输入要编码的文本..."></textarea>
      </div>

      <div class="b64-toolbar">
        <button class="btn primary" id="b64RunBtn">➡️ 编码</button>
        <button class="btn" id="b64SwapBtn">⇅ 交换</button>
        <button class="btn danger" id="b64ClearBtn">清空</button>
      </div>

      <div class="b64-section">
        <div class="b64-label" id="b64OutputLabel">Base64 结果</div>
        <textarea id="b64Output" class="b64-textarea" placeholder="结果将显示在这里..." readonly></textarea>
      </div>

      <div class="b64-footer">
        <span id="b64Status" class="b64-status">就绪</span>
        <div class="b64-actions">
          <button class="btn-copy" id="b64CopyBtn">复制结果</button>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;
    let currentMode = 'encode'; // 'encode' or 'decode'

    const input = c.querySelector('#b64Input');
    const output = c.querySelector('#b64Output');
    const inputLabel = c.querySelector('#b64InputLabel');
    const outputLabel = c.querySelector('#b64OutputLabel');
    const runBtn = c.querySelector('#b64RunBtn');

    function setMode(mode) {
      currentMode = mode;
      const tabs = c.querySelectorAll('.b64-tab');
      tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

      if (mode === 'encode') {
        inputLabel.textContent = '原始文本';
        outputLabel.textContent = 'Base64 结果';
        input.placeholder = '输入要编码的文本...';
        runBtn.textContent = '➡️ 编码';
      } else {
        inputLabel.textContent = 'Base64 字符串';
        outputLabel.textContent = '解码结果';
        input.placeholder = '输入要解码的 Base64 字符串...';
        runBtn.textContent = '➡️ 解码';
      }
      setStatus('已切换到' + (mode === 'encode' ? '编码' : '解码') + '模式');
    }

    function getVariant() {
      const radio = c.querySelector('input[name="b64Variant"]:checked');
      return radio ? radio.value : 'standard';
    }

    function setStatus(msg, isErr = false) {
      const el = c.querySelector('#b64Status');
      if (el) {
        el.textContent = msg;
        el.style.color = isErr ? '#e74c3c' : '#27ae60';
      }
    }

    function doConvert() {
      const raw = input.value;
      if (!raw.trim()) {
        flashMessage('请输入内容', true);
        return;
      }

      const variant = getVariant();

      try {
        if (currentMode === 'encode') {
          let result = encodeUtf8(raw);
          if (variant === 'url') result = toBase64Url(result);
          output.value = result;
          setStatus('✓ 编码成功');
          flashMessage('✓ 编码成功');
        } else {
          let b64 = raw.trim();
          if (variant === 'url') b64 = fromBase64Url(b64);
          const result = decodeUtf8(b64);
          output.value = result;
          setStatus('✓ 解码成功');
          flashMessage('✓ 解码成功');
        }
      } catch (e) {
        setStatus('✗ 操作失败: ' + e.message, true);
        flashMessage('操作失败，请检查输入格式', true);
      }
    }

    function doSwap() {
      const outVal = output.value;
      if (!outVal) { flashMessage('没有可交换的内容', true); return; }
      // 交换模式
      const newMode = currentMode === 'encode' ? 'decode' : 'encode';
      setMode(newMode);
      input.value = outVal;
      output.value = '';
      setStatus('已交换，点击转换获取结果');
    }

    function doClear() {
      input.value = '';
      output.value = '';
      setStatus('已清空');
      input.focus();
    }

    function doCopy() {
      const val = output.value;
      if (!val) { flashMessage('没有内容可复制', true); return; }
      navigator.clipboard?.writeText(val).then(() => flashMessage('✓ 已复制'));
    }

    // Tab 切换
    c.querySelectorAll('.b64-tab').forEach(tab => {
      tab.addEventListener('click', () => setMode(tab.dataset.mode));
    });

    runBtn.addEventListener('click', doConvert);
    c.querySelector('#b64SwapBtn').addEventListener('click', doSwap);
    c.querySelector('#b64ClearBtn').addEventListener('click', doClear);
    c.querySelector('#b64CopyBtn').addEventListener('click', doCopy);

    // Ctrl/Cmd + Enter = convert
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        doConvert();
      }
    });
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

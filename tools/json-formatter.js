// tools/json-formatter.js — JSON 格式化工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'json-formatter',
    name: 'JSON 格式化',
    desc: '格式化 / 压缩 / 转义 JSON',
    iconUrl: 'icons/json-formatter.png',
    category: 'format',
    categoryName: '格式转换'
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="jf-toolbar">
        <button class="btn primary" id="jfFormatBtn">格式化</button>
        <button class="btn" id="jfMinifyBtn">压缩</button>
        <button class="btn" id="jfEscapeBtn">转义</button>
        <button class="btn" id="jfUnescapeBtn">反转义</button>
        <button class="btn danger" id="jfClearBtn">清空</button>
      </div>
      <textarea id="jfInput" class="jf-textarea" placeholder='粘贴 JSON，例如 {"name":"test","list":[1,2,3]}'></textarea>
      <div class="jf-footer">
        <span id="jfStatus" class="jf-status">就绪</span>
        <button class="btn-copy" id="jfCopyBtn">复制结果</button>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;

    const input = c.querySelector('#jfInput');

    function doFormat() {
      const raw = input.value.trim();
      if (!raw) { flashMessage('请输入 JSON', true); return; }
      try {
        const obj = JSON.parse(raw);
        input.value = JSON.stringify(obj, null, 2);
        setStatus('✓ 格式化成功');
        flashMessage('✓ 格式化成功');
      } catch (e) {
        setStatus('✗ 语法错误: ' + e.message, true);
        flashMessage('JSON 语法错误', true);
      }
    }

    function doMinify() {
      const raw = input.value.trim();
      if (!raw) return;
      try {
        const obj = JSON.parse(raw);
        input.value = JSON.stringify(obj);
        setStatus('✓ 压缩成功');
      } catch (e) {
        setStatus('✗ 语法错误: ' + e.message, true);
      }
    }

    function doEscape() {
      const raw = input.value;
      input.value = JSON.stringify(raw);
      setStatus('✓ 转义成功');
    }

    function doUnescape() {
      const raw = input.value.trim();
      if (!raw) return;
      try {
        input.value = JSON.parse(raw);
        setStatus('✓ 反转义成功');
      } catch (e) {
        setStatus('✗ 反转义失败: ' + e.message, true);
      }
    }

    function doClear() {
      input.value = '';
      setStatus('已清空');
      input.focus();
    }

    function doCopy() {
      const val = input.value;
      if (!val) { flashMessage('没有内容可复制', true); return; }
      navigator.clipboard?.writeText(val).then(() => flashMessage('✓ 已复制'));
    }

    function setStatus(msg, isErr = false) {
      const el = c.querySelector('#jfStatus');
      if (el) { el.textContent = msg; el.style.color = isErr ? '#e74c3c' : '#27ae60'; }
    }

    c.querySelector('#jfFormatBtn').addEventListener('click', doFormat);
    c.querySelector('#jfMinifyBtn').addEventListener('click', doMinify);
    c.querySelector('#jfEscapeBtn').addEventListener('click', doEscape);
    c.querySelector('#jfUnescapeBtn').addEventListener('click', doUnescape);
    c.querySelector('#jfClearBtn').addEventListener('click', doClear);
    c.querySelector('#jfCopyBtn').addEventListener('click', doCopy);

    // Ctrl/Cmd + S = format
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doFormat();
      }
    });
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

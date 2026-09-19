// tools/snippet-manager.js — 脚本片段管理：常用注入脚本（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'snippet-manager',
    name: '脚本片段',
    desc: '常用注入脚本管理：内置解除限制/调试等预设，支持自定义脚本一键注入',
    iconUrl: 'icons/snippet-manager.png',
    category: 'dev',
    categoryName: '开发工具'
  };

  const STORAGE_KEY = 'tool:snippets';

  // 内置预设片段（在页面 MAIN world 执行）
  const PRESETS = [
    {
      name: '解除右键/复制限制',
      desc: '恢复右键菜单、文本选择与复制能力',
      code: `['contextmenu','selectstart','copy','cut','dragstart','mousedown','keydown'].forEach(t => {
  document.addEventListener(t, e => e.stopImmediatePropagation(), true);
});
['oncontextmenu','onselectstart','oncopy','oncut'].forEach(p => {
  document.documentElement[p] = null;
  document.body[p] = null;
});
'解除完成：右键/选择/复制已恢复';`
    },
    {
      name: '显示所有元素边框',
      desc: '经典调试：给全部元素加 1px 红色边框',
      code: `document.querySelectorAll('*').forEach(el => {
  el.style.outline = '1px solid rgba(255,0,0,.4)';
});
'debug: 已为 ' + document.querySelectorAll('*').length + ' 个元素添加边框';`
    },
    {
      name: '密码框明文显示',
      desc: '将页面所有 password 输入框改为明文',
      code: `const els = document.querySelectorAll('input[type=password]');
els.forEach(el => { el.type = 'text'; el.style.border = '2px solid #10B981'; });
'已转换 ' + els.length + ' 个密码框';`
    },
    {
      name: '禁用所有 CSS',
      desc: '移除 style 标签与外链样式表，查看裸 HTML',
      code: `const n = document.querySelectorAll('style,link[rel=stylesheet]').length;
document.querySelectorAll('style,link[rel=stylesheet]').forEach(el => el.remove());
document.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
'已移除 ' + n + ' 个样式源';`
    },
    {
      name: '列出页面图片信息',
      desc: '输出全部图片的尺寸与 URL 列表',
      code: `const imgs = [...document.images].map(i => ({
  src: i.src.slice(0, 100),
  w: i.naturalWidth,
  h: i.naturalHeight,
  loaded: i.complete
}));
console.table(imgs);
{ count: imgs.length, broken: imgs.filter(i => !i.loaded).length, list: imgs.slice(0, 10) };`
    },
    {
      name: '灰阶阅读模式',
      desc: '页面全局灰阶滤镜（可再点一次还原刷新）',
      code: `if (window.__grayMode) {
  document.documentElement.style.filter = '';
  window.__grayMode = false;
  '灰阶已关闭';
} else {
  document.documentElement.style.filter = 'grayscale(1)';
  window.__grayMode = true;
  '灰阶已开启';
}`
    },
    {
      name: '页面加载耗时',
      desc: '输出 DNS / TCP / 首字节 / DOM 加载耗时',
      code: `const nav = performance.getEntriesByType('navigation')[0];
const t = {
  DNS: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
  TCP: Math.round(nav.connectEnd - nav.connectStart),
  TTFB: Math.round(nav.responseStart - nav.requestStart),
  DOM加载: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
  整页完成: Math.round(nav.loadEventEnd - nav.startTime)
};
console.table(t); t;`
    },
    {
      name: '高亮超大图片',
      desc: '标记显示尺寸超过 1000px 的图片（性能排查）',
      code: `const big = [...document.images].filter(i => i.naturalWidth > 1000);
big.forEach(i => { i.style.outline = '3px solid #EF4444'; i.title = i.naturalWidth + 'x' + i.naturalHeight; });
'超大图片 ' + big.length + ' 张，已红色高亮';`
    }
  ];

  let customSnippets = [];
  let lastRunFor = null; // 记录最近运行结果对应的卡片
  let unsubs = [];
  let containerRef = null;

  function render(container) {
    containerRef = container;
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <div class="te-tip">在当前页面注入执行 JavaScript 片段（页面 MAIN world 上下文）。点击「运行」后在下方查看返回结果</div>

      <div class="sn-section-title">📦 内置预设</div>
      <div id="snPresetList" class="sn-list"></div>

      <div class="sn-section-title">
        📝 自定义片段
        <button class="btn sc-small-btn" id="snNewBtn">➕ 新建</button>
      </div>
      <div id="snCustomList" class="sn-list"></div>
      <div id="snEditor" class="sn-editor" style="display:none;">
        <input type="text" id="snEditName" class="sn-edit-name" placeholder="脚本名称…">
        <textarea id="snEditCode" class="sn-edit-code" placeholder="// 在目标页面执行的 JavaScript 代码
// 最后一个表达式作为返回值" rows="8" spellcheck="false"></textarea>
        <div class="sn-editor-actions">
          <button class="btn sc-small-btn" id="snSaveBtn">💾 保存</button>
          <button class="btn sc-small-btn" id="snCancelBtn">取消</button>
        </div>
      </div>

      <div class="sn-result" id="snResult" style="display:none;">
        <div class="sn-result-head">
          <span id="snResultTitle">结果</span>
          <button class="ck-del" id="snResultCopy" title="复制结果">📋</button>
        </div>
        <pre class="sn-result-body" id="snResultBody"></pre>
      </div>
    `;

    container.querySelector('#snNewBtn').addEventListener('click', () => openEditor(container, null));
    container.querySelector('#snSaveBtn').addEventListener('click', () => saveEditor(container));
    container.querySelector('#snCancelBtn').addEventListener('click', () => {
      container.querySelector('#snEditor').style.display = 'none';
    });
    container.querySelector('#snResultCopy').addEventListener('click', () => {
      const text = container.querySelector('#snResultBody').textContent;
      navigator.clipboard.writeText(text).then(() => flashMessage('✓ 已复制结果', 1500));
    });

    loadCustom(container);
  }

  function mount(context) { unsubs = []; }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
    containerRef = null;
  }

  // ===== 数据 =====
  function loadCustom(container) {
    chrome.storage.local.get([STORAGE_KEY], (r) => {
      void chrome.runtime?.lastError;
      customSnippets = Array.isArray(r[STORAGE_KEY]) ? r[STORAGE_KEY] : [];
      renderLists(container);
    });
  }

  function persistCustom() {
    chrome.storage.local.set({ [STORAGE_KEY]: customSnippets }, () => {
      void chrome.runtime?.lastError;
    });
  }

  // ===== 渲染 =====
  function renderLists(container) {
    const presetList = container.querySelector('#snPresetList');
    const customList = container.querySelector('#snCustomList');

    presetList.innerHTML = PRESETS.map((p, i) => buildCard(p, 'p' + i, false)).join('');
    customList.innerHTML = customSnippets.length
      ? customSnippets.map((s, i) => buildCard(s, 'c' + i, true)).join('')
      : '<div class="te-empty" style="padding:12px;">暂无自定义脚本，点击「➕ 新建」添加</div>';

    // 绑定按钮
    container.querySelectorAll('[data-sn-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kind = btn.dataset.snKind === 'p' ? 'p' : 'c';
        const idx = parseInt(btn.dataset.snIndex, 10);
        const snippet = kind === 'p' ? PRESETS[idx] : customSnippets[idx];
        if (!snippet) return;
        const action = btn.dataset.snAction;
        if (action === 'run') runSnippet(container, snippet);
        else if (action === 'copy') copySnippet(snippet);
        else if (action === 'edit') openEditor(container, { idx, ...snippet });
        else if (action === 'del') deleteSnippet(container, idx);
      });
    });
  }

  function buildCard(s, key, isCustom) {
    return `
      <div class="te-card sn-card">
        <div class="te-card-head">
          <span class="te-card-title">📜 ${escapeHtml(s.name)}</span>
          <div class="sn-card-btns">
            <button class="btn sc-small-btn" data-sn-action="run" data-sn-kind="${isCustom ? 'c' : 'p'}" data-sn-index="${key.slice(1)}">▶ 运行</button>
            <button class="btn sc-small-btn" data-sn-action="copy" data-sn-kind="${isCustom ? 'c' : 'p'}" data-sn-index="${key.slice(1)}">📋</button>
            ${isCustom ? `
              <button class="btn sc-small-btn" data-sn-action="edit" data-sn-kind="c" data-sn-index="${key.slice(1)}">✏️</button>
              <button class="btn sc-small-btn" data-sn-action="del" data-sn-kind="c" data-sn-index="${key.slice(1)}">✕</button>
            ` : ''}
          </div>
        </div>
        ${s.desc ? `<div class="sn-card-desc">${escapeHtml(s.desc)}</div>` : ''}
        <pre class="sn-card-code">${escapeHtml(truncate(s.code, 120))}</pre>
      </div>
    `;
  }

  // ===== 运行 =====
  function runSnippet(container, snippet) {
    const resultEl = container.querySelector('#snResult');
    const bodyEl = container.querySelector('#snResultBody');
    const titleEl = container.querySelector('#snResultTitle');
    resultEl.style.display = '';
    titleEl.textContent = `⏳ 执行中：${snippet.name}…`;
    bodyEl.textContent = '';

    // 走 Port 请求/响应，规避 MV3 一击式回调 "The message port closed before a response was received"
    const request = window.MynaRequest || ((t, p) => new Promise((resolve) => {
      chrome.runtime.sendMessage(Object.assign({ type: t }, p || {}), (res) => {
        void chrome.runtime?.lastError;
        resolve(res || { ok: false, error: chrome.runtime.lastError?.message || '无响应' });
      });
    }));

    request('script-snippet:run', { code: snippet.code, name: snippet.name })
      .then((res) => {
        if (!res?.ok) {
          titleEl.textContent = `❌ ${snippet.name}`;
          bodyEl.textContent = res?.error || '执行失败，请刷新页面后重试';
          return;
        }
        titleEl.textContent = `✓ ${snippet.name}`;
        const val = res.result;
        bodyEl.textContent = val === undefined || val === null
          ? '（无返回值）'
          : (typeof val === 'string' ? val : JSON.stringify(val, null, 2));
      });
  }

  function copySnippet(snippet) {
    navigator.clipboard.writeText(snippet.code).then(() => flashMessage('✓ 已复制脚本', 1500));
  }

  // ===== 编辑器 =====
  function openEditor(container, editing) {
    const editor = container.querySelector('#snEditor');
    const nameInput = container.querySelector('#snEditName');
    const codeInput = container.querySelector('#snEditCode');
    editor.dataset.editing = editing ? String(editing.idx) : '';
    nameInput.value = editing ? editing.name : '';
    codeInput.value = editing ? editing.code : '';
    editor.style.display = '';
    nameInput.focus();
  }

  function saveEditor(container) {
    const editor = container.querySelector('#snEditor');
    const name = container.querySelector('#snEditName').value.trim();
    const code = container.querySelector('#snEditCode').value;
    if (!name) { flashMessage('请输入脚本名称', 1500); return; }
    if (!code.trim()) { flashMessage('请输入脚本代码', 1500); return; }

    const editingIdx = editor.dataset.editing;
    if (editingIdx !== '') {
      customSnippets[parseInt(editingIdx, 10)] = { name, code };
    } else {
      customSnippets.push({ name, code });
    }
    persistCustom();
    editor.style.display = 'none';
    renderLists(container);
    flashMessage('✓ 已保存', 1500);
  }

  function deleteSnippet(container, idx) {
    customSnippets.splice(idx, 1);
    persistCustom();
    renderLists(container);
  }

  // ===== 工具 =====
  function truncate(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n) + '\n…' : s;
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

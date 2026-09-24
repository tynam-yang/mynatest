// tools/regex-tester.js — 正则测试器（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const escapeHtml = window.MynaUtils.escapeHtml;

  const meta = {
    id: 'regex-tester',
    name: '正则测试',
    desc: '实时测试正则表达式匹配结果',
    iconUrl: 'icons/regex-tester.png',
    category: 'data-tool',
    categoryName: '数据工具'
  };

  // 常用正则速查
  const PRESETS = [
    { name: '邮箱', pattern: '[\\w.+-]+@[\\w-]+\\.[\\w.-]+', flags: 'g' },
    { name: '手机号', pattern: '1[3-9]\\d{9}', flags: 'g' },
    { name: 'URL', pattern: 'https?:\\/\\/[^\\s]+', flags: 'gi' },
    { name: 'IP (IPv4)', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
    { name: '身份证号', pattern: '\\d{17}[\\dXx]', flags: 'g' },
    { name: '日期 YYYY-MM-DD', pattern: '\\d{4}-\\d{2}-\\d{2}', flags: 'g' },
    { name: '时间 HH:MM:SS', pattern: '\\d{2}:\\d{2}:\\d{2}', flags: 'g' },
    { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]+', flags: 'g' },
    { name: 'HTML 标签', pattern: '<([a-zA-Z][a-zA-Z0-9]*)\\b[^>]*>([\\s\\S]*?)<\\/\\1>', flags: 'g' },
    { name: '十六进制颜色', pattern: '#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\\b', flags: 'gi' },
    { name: '数字', pattern: '-?\\d+\\.?\\d*', flags: 'g' },
    { name: '整数', pattern: '-?\\d+', flags: 'g' },
    { name: 'QQ 号', pattern: '[1-9]\\d{4,10}', flags: 'g' },
    { name: 'UUID', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', flags: 'gi' },
    { name: 'Base64 字符串', pattern: '[A-Za-z0-9+/]{20,}={0,2}', flags: 'g' },
    { name: 'Markdown 链接', pattern: '\\[([^\\]]+)\\]\\(([^)]+)\\)', flags: 'g' },
    { name: 'JWT Token', pattern: 'eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+', flags: 'g' },
    { name: '车牌号', pattern: '[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5}', flags: 'g' },
  ];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="re-input-row">
        <div class="re-regex-wrap">
          <span class="re-slash">/</span>
          <input type="text" id="rePattern" class="re-input" placeholder="输入正则，例如 (\\d{3})-\\d{4}">
          <span class="re-slash">/</span>
          <input type="text" id="reFlags" class="re-flags" value="g" placeholder="flags">
        </div>
      </div>
      <div class="re-test-row">
        <div class="re-section-title">测试字符串</div>
        <textarea id="reTestString" class="re-textarea" placeholder="输入要测试的文本..."></textarea>
      </div>
      <div class="re-toolbar">
        <button class="btn primary" id="reTestBtn">测试</button>
        <button class="btn" id="reClearBtn">清空</button>
      </div>
      <div class="re-presets">
        <div class="re-presets-title">常用正则 · 点击填充</div>
        <div class="re-presets-list">
          ${PRESETS.map((p, i) => `<button class="re-preset" data-idx="${i}" title="/${p.pattern}/${p.flags}">${p.name}</button>`).join('')}
        </div>
      </div>
      <div id="reResult" class="re-result" style="display:none;">
        <div class="re-section-title">匹配结果</div>
        <div id="reMatchHighlight" class="re-highlight"></div>
        <div id="reMatches" class="re-matches"></div>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;

    function test() {
      const pattern = c.querySelector('#rePattern').value;
      const flags = c.querySelector('#reFlags').value || 'g';
      const testStr = c.querySelector('#reTestString').value;

      if (!pattern.trim()) { flashMessage('请输入正则', true); return; }
      if (!testStr) { flashMessage('请输入测试字符串', true); return; }

      let regex;
      try {
        regex = new RegExp(pattern, flags);
      } catch (e) {
        flashMessage('正则语法错误: ' + e.message, true);
        return;
      }

      const resultEl = c.querySelector('#reResult');
      resultEl.style.display = 'block';

      // 高亮显示
      const highlightEl = c.querySelector('#reMatchHighlight');
      let highlighted = escapeHtml(testStr);
      const matches = [];
      let m;

      if (flags.includes('g')) {
        while ((m = regex.exec(testStr)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (m[0].length === 0) regex.lastIndex++;
        }
        // 重新扫描做高亮
        regex.lastIndex = 0;
        let lastIdx = 0;
        highlighted = '';
        while ((m = regex.exec(testStr)) !== null) {
          highlighted += escapeHtml(testStr.slice(lastIdx, m.index));
          highlighted += `<mark class="re-match">${escapeHtml(m[0])}</mark>`;
          lastIdx = m.index + m[0].length;
          if (m[0].length === 0) regex.lastIndex++;
        }
        highlighted += escapeHtml(testStr.slice(lastIdx));
      } else {
        m = regex.exec(testStr);
        if (m) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          highlighted = escapeHtml(testStr.slice(0, m.index)) +
            `<mark class="re-match">${escapeHtml(m[0])}</mark>` +
            escapeHtml(testStr.slice(m.index + m[0].length));
        }
      }

      highlightEl.innerHTML = highlighted || escapeHtml(testStr);

      // 匹配列表
      const matchesEl = c.querySelector('#reMatches');
      if (matches.length === 0) {
        matchesEl.innerHTML = `<div class="re-no-match">没有匹配项</div>`;
      } else {
        matchesEl.innerHTML = matches.map((m, i) => {
          let html = `<div class="re-match-item">
            <span class="re-match-idx">#${i + 1}</span>
            <span class="re-match-str">${escapeHtml(m.match)}</span>
            <span class="re-match-pos">@${m.index}</span>
          </div>`;
          if (m.groups && m.groups.length > 0) {
            html += `<div class="re-match-groups">` +
              m.groups.map((g, gi) => `<span class="re-group">$${gi + 1}: ${escapeHtml(g ?? '(undefined)')}</span>`).join(' ') +
              `</div>`;
          }
          return html;
        }).join('');
      }

      flashMessage(`找到 ${matches.length} 个匹配`);
    }

    c.querySelector('#reTestBtn').addEventListener('click', test);
    c.querySelector('#reClearBtn').addEventListener('click', () => {
      c.querySelector('#rePattern').value = '';
      c.querySelector('#reFlags').value = 'g';
      c.querySelector('#reTestString').value = '';
      c.querySelector('#reResult').style.display = 'none';
      c.querySelector('#rePattern').focus();
    });

    // 实时测试（防抖 300ms）
    let debounceTimer;
    const inputs = c.querySelectorAll('#rePattern, #reFlags, #reTestString');
    inputs.forEach(inp => {
      inp.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (c.querySelector('#rePattern').value && c.querySelector('#reTestString').value) {
            test();
          }
        }, 300);
      });
    });

    // 常用正则点击填充
    c.querySelectorAll('.re-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = PRESETS[Number(btn.dataset.idx)];
        c.querySelector('#rePattern').value = preset.pattern;
        c.querySelector('#reFlags').value = preset.flags;
        flashMessage(`✓ 已填充「${preset.name}」正则`);
        // 如果已经有测试字符串，自动跑一下
        if (c.querySelector('#reTestString').value) {
          setTimeout(test, 50);
        } else {
          c.querySelector('#reTestString').focus();
        }
      });
    });
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

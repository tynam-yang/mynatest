// tools/char-counter.js — 字符统计（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'char-counter',
    name: '字符统计',
    desc: '输入文本，实时统计汉字、英文、数字、标点、空格、行数、单词数，以及 UTF-8 字节数',
    icon: '📝',
    iconUrl: 'icons/char-counter.png',
    category: 'data-tool',
    categoryName: '数据工具'
  };

  // ========== 统计引擎 ==========
  function countChars(text) {
    if (!text) return {
      totalChars: 0, totalBytes: 0, lines: 0, nonEmptyLines: 0, words: 0,
      chinese: 0, english: 0, letters: 0, digits: 0, punctuation: 0,
      spaces: 0, whitespace: 0, control: 0, other: 0,
      displayWidth: 0, byteRatio: '0.00'
    };

    let chinese = 0, english = 0, letters = 0, digits = 0;
    let punctuation = 0, spaces = 0, whitespace = 0, control = 0, other = 0;
    let displayWidth = 0;
    const bytes = new TextEncoder().encode(text);
    const totalBytes = bytes.length;

    for (const ch of text) {
      // ch 已经是 UTF-16 code unit 对应的 code point（for...of 会 surrogate pair）
      const cp = ch.codePointAt(0);

      // 汉字（CJK 统一表意文字扩展 A/B 和兼容表意文字）
      if (
        (cp >= 0x4E00 && cp <= 0x9FFF) ||
        (cp >= 0x3400 && cp <= 0x4DBF) ||
        (cp >= 0x20000 && cp <= 0x2A6DF) ||
        (cp >= 0x2A700 && cp <= 0x2B73F) ||
        (cp >= 0x2B740 && cp <= 0x2B81F) ||
        (cp >= 0x2B820 && cp <= 0x2CEAF) ||
        (cp >= 0xF900 && cp <= 0xFAFF) ||
        (cp >= 0x2F800 && cp <= 0x2FA1F)
      ) {
        chinese++;
        displayWidth += 2;
      } else if (cp >= 0x61 && cp <= 0x7A) {
        letters++; english++; displayWidth += 1;
      } else if (cp >= 0x41 && cp <= 0x5A) {
        letters++; english++; displayWidth += 1;
      } else if (cp >= 0x30 && cp <= 0x39) {
        digits++; displayWidth += 1;
      } else if (cp === 0x20 || cp === 0x0B || cp === 0x0C) {
        spaces++; whitespace++; displayWidth += 1;
      } else if (cp === 0x09) {
        spaces++; whitespace++; displayWidth += 2; // tab 按 2 列
      } else if (cp === 0x0A || cp === 0x0D) {
        whitespace++;
      } else if (cp <= 0x1F || cp === 0x7F) {
        control++;
      } else if (/[!"#$%&'()*+,.\-/:;<=>?@\\\[\]^_`{|}~]/.test(ch)) {
        // ASCII 标点
        punctuation++; displayWidth += 1;
      } else if (cp >= 0x3000 && cp <= 0x303F) {
        // CJK 标点（全角）
        punctuation++; displayWidth += 2;
      } else if (cp >= 0xFF00 && cp <= 0xFFEF && cp !== 0xFF61 && cp !== 0xFFDC) {
        // 全角字符区间（排除半角片假名）
        punctuation++; displayWidth += 2;
      } else if (cp >= 0xFF61 && cp <= 0xFF9F) {
        // 半角片假名
        punctuation++; displayWidth += 1;
      } else if (cp >= 0x3040 && cp <= 0x30FF) {
        // 假名（日韩通用）
        punctuation++; displayWidth += 2;
      } else if (cp >= 0xAC00 && cp <= 0xD7AF) {
        // 韩文
        punctuation++; displayWidth += 2;
      } else {
        other++; displayWidth += 1;
      }
    }

    const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
    const nonEmptyLines = text.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0).length;
    // 单词数：英文按空白分隔，中文按字（每字一个"词"计？不常见，这里只计英文单词）
    const words = (text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || []).length;

    const totalChars = Array.from(text).length;
    const byteRatio = totalChars ? (totalBytes / totalChars).toFixed(2) : '0.00';

    return {
      totalChars, totalBytes, lines, nonEmptyLines, words,
      chinese, english, letters, digits, punctuation,
      spaces, whitespace, control, other,
      displayWidth, byteRatio
    };
  }

  // ========== 渲染 ==========
  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <!-- 输入区 -->
      <div class="cc-section">
        <textarea id="ccInput" class="cc-input" rows="8" placeholder="把要统计的文本粘进来... 实时更新"></textarea>
      </div>

      <!-- 统计面板 -->
      <div class="cc-grid" id="ccGrid">
        ${metricCard('字符总数', 'totalChars', '输入文本的总字符数')}
        ${metricCard('字节数 (UTF-8)', 'totalBytes', '按 UTF-8 编码后的实际字节数')}
        ${metricCard('汉字', 'chinese', 'CJK 统一表意文字')}
        ${metricCard('英文字母', 'letters', 'A-Z / a-z')}
        ${metricCard('数字', 'digits', '0-9')}
        ${metricCard('标点符号', 'punctuation', 'ASCII 标点 + CJK 标点 + 假名/韩文等非汉字字符')}
        ${metricCard('空格', 'spaces', '空格 / Tab')}
        ${metricCard('空白合计', 'whitespace', '含换行')}
        ${metricCard('行数', 'lines', '含空行')}
        ${metricCard('非空行数', 'nonEmptyLines', 'trim 后有内容的行')}
        ${metricCard('英文单词', 'words', '按空白分隔的英文单词')}
        ${metricCard('显示宽度', 'displayWidth', '汉字/全角计 2，其余计 1')}
      </div>

      <!-- 辅助信息 -->
      <div class="cc-foot" id="ccFoot">
        UTF-8 平均每字符 <span class="cc-foot-val" id="ccRatio">0.00</span> 字节
        · 其他字符 <span class="cc-foot-val" id="ccOther">0</span>
        · 控制字符 <span class="cc-foot-val" id="ccCtrl">0</span>
      </div>
    `;
  }

  function metricCard(label, key, hint) {
    return `
      <div class="cc-cell" data-key="${key}" title="${hint}">
        <div class="cc-cell-label">${label}</div>
        <div class="cc-cell-value" id="cc_${key}">0</div>
      </div>
    `;
  }

  // ========== mount ==========
  function mount(context) {
    const c = context.container;
    const input = c.querySelector('#ccInput');

    // 实时统计（debounce 30ms）
    let timer = null;
    function update() {
      const text = input.value;
      const r = countChars(text);
      c.querySelectorAll('.cc-cell').forEach(cell => {
        const key = cell.dataset.key;
        const el = c.querySelector('#cc_' + key);
        if (el) el.textContent = r[key];
      });
      c.querySelector('#ccRatio').textContent = r.byteRatio;
      c.querySelector('#ccOther').textContent = r.other;
      c.querySelector('#ccCtrl').textContent = r.control;
    }
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(update, 30);
    });
    update();
  }

  function cleanup() {}

  window.MynaDataMask = window.MynaDataMask; // 防 ESLint 未使用告警（本工具独立）

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

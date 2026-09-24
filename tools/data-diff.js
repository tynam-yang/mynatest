// tools/data-diff.js — 数据对比工具（JSON / 文本，左右 / 上下布局）（全局）

(function () {
  const diffLines = window.MynaDiff.diffLines;
  const parseJSONRobust = window.MynaDiff.parseJSONRobust;
  const escapeHtml = window.MynaUtils.escapeHtml;
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'data-diff',
    name: '数据对比',
    desc: 'JSON / 文本差异对比，支持左右、上下布局切换',
    iconUrl: 'icons/data-diff.png',
    category: 'data-tool',
    categoryName: '数据工具'
  };

  // 跨工具切换保留草稿与设置
  const state = {
    left: '',
    right: '',
    mode: 'auto',      // auto | json | text
    layout: 'h',       // h=左右  v=上下
    onlyDiff: false,
    last: null         // 最近一次对比结果
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="dd-toolbar">
        <div class="dd-toolbar-row">
          <button class="btn primary" id="ddRunBtn">对比</button>
          <button class="btn" id="ddSwapBtn">交换</button>
          <button class="btn danger" id="ddClearBtn">清空</button>
        </div>
        <div class="dd-toolbar-row dd-options">
          <select class="dd-select" id="ddMode">
            <option value="auto">自动识别</option>
            <option value="json">JSON</option>
            <option value="text">纯文本</option>
          </select>
          <button class="btn" id="ddLayoutBtn" title="切换对比布局"></button>
          <label class="dd-only"><input type="checkbox" id="ddOnlyDiff"> 仅看差异</label>
        </div>
      </div>
      <div class="dd-workspace" id="ddWorkspace">
        <div class="dd-panes">
          <div class="dd-pane">
            <div class="dd-pane-label">原始内容</div>
            <textarea class="dd-textarea" id="ddLeft" placeholder="粘贴原始 JSON / 文本（Ctrl+Enter 快速对比）"></textarea>
          </div>
          <div class="dd-pane">
            <div class="dd-pane-label">新内容</div>
            <textarea class="dd-textarea" id="ddRight" placeholder="粘贴新的 JSON / 文本（Ctrl+Enter 快速对比）"></textarea>
          </div>
        </div>
        <div class="dd-status" id="ddStatus"></div>
        <div class="dd-result" id="ddResult"></div>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;
    const leftEl = c.querySelector('#ddLeft');
    const rightEl = c.querySelector('#ddRight');
    const modeEl = c.querySelector('#ddMode');
    const onlyEl = c.querySelector('#ddOnlyDiff');
    const layoutBtn = c.querySelector('#ddLayoutBtn');
    const ws = c.querySelector('#ddWorkspace');
    const resultEl = c.querySelector('#ddResult');
    const statusEl = c.querySelector('#ddStatus');

    // 恢复草稿
    leftEl.value = state.left;
    rightEl.value = state.right;
    modeEl.value = state.mode;
    onlyEl.checked = state.onlyDiff;
    ws.classList.toggle('layout-v', state.layout === 'v');
    syncLayoutBtn();
    if (state.last) { renderResult(); }

    function syncLayoutBtn() {
      layoutBtn.textContent = state.layout === 'h' ? '↕ 上下布局' : '↔ 左右布局';
    }

    // 规范化：统一换行，去掉末尾单个换行（避免幻影空行）
    function normalize(str) {
      return String(str || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n$/, '');
    }

    // 计算差异，返回 {kind, ops, formattedL, formattedR, addCount, delCount}
    function compute() {
      const rawL = normalize(leftEl.value);
      const rawR = normalize(rightEl.value);

      let kind = 'text';
      let textL = rawL;
      let textR = rawR;

      if (state.mode === 'json') {
        const p1 = parseJSONRobust(rawL);
        const p2 = parseJSONRobust(rawR);
        if (!p1.ok) { flashMessage('原始内容不是合法 JSON', true); return null; }
        if (!p2.ok) { flashMessage('新内容不是合法 JSON', true); return null; }
        kind = 'json';
        textL = JSON.stringify(p1.data, null, 2);
        textR = JSON.stringify(p2.data, null, 2);
        // JSON 模式把输入框也规范化，方便人工阅读
        leftEl.value = textL;
        rightEl.value = textR;
      } else if (state.mode === 'auto') {
        const p1 = parseJSONRobust(rawL);
        const p2 = parseJSONRobust(rawR);
        if (p1.ok && p2.ok) {
          kind = 'json';
          textL = JSON.stringify(p1.data, null, 2);
          textR = JSON.stringify(p2.data, null, 2);
        }
      }

      const ops = diffLines(textL, textR);
      let addCount = 0, delCount = 0;
      ops.forEach(op => {
        if (op.type === 'add') addCount++;
        else if (op.type === 'remove') delCount++;
      });

      return { kind, ops, textL, textR, addCount, delCount };
    }

    function runDiff() {
      if (!leftEl.value.trim() && !rightEl.value.trim()) {
        flashMessage('请输入需要对比的内容', true);
        return;
      }
      persistInputs();
      const data = compute();
      if (!data) return;
      state.last = data;
      renderResult();
    }

    function renderResult() {
      const data = state.last;
      if (!data) return;
      const { kind, ops, addCount, delCount } = data;

      // 汇总
      if (addCount === 0 && delCount === 0) {
        statusEl.className = 'dd-status ok';
        statusEl.textContent = `✓ 两段${kind === 'json' ? ' JSON' : ''}内容完全一致`;
      } else {
        statusEl.className = 'dd-status diff';
        statusEl.textContent = `${kind === 'json' ? 'JSON' : '文本'}对比 · 新增 ${addCount} 行 / 删除 ${delCount} 行`;
      }

      resultEl.innerHTML = state.layout === 'h'
        ? renderSideBySide(ops)
        : renderUnified(ops);
    }

    // —— 左右布局：把连续的删除/添加操作配对成行，两侧行号对齐 ——
    function renderSideBySide(ops) {
      const rows = pairOps(ops);
      const visible = state.onlyDiff ? rows.filter(r => r.t !== 'eq') : rows;

      const html = visible.map(r => {
        const lNum = r.ln != null ? r.ln : '';
        const rNum = r.rn != null ? r.rn : '';
        let leftCode = '', rightCode = '';

        if (r.t === 'eq') {
          leftCode = rightCode = `<span class="dd-code">${escapeHtml(r.l)}</span>`;
        } else {
          // 修改行：行内词级高亮；纯增/删行：整行转义
          if (r.t === 'mod') {
            leftCode = `<span class="dd-code">${inlineDiffHtml(r.l, r.r, 'l')}</span>`;
            rightCode = `<span class="dd-code">${inlineDiffHtml(r.l, r.r, 'r')}</span>`;
          } else {
            if (r.l != null) leftCode = `<span class="dd-code">${escapeHtml(r.l)}</span>`;
            if (r.r != null) rightCode = `<span class="dd-code">${escapeHtml(r.r)}</span>`;
          }
        }

        return `<div class="dd-row ${r.t}">
          <div class="dd-cell"><span class="dd-gutter">${lNum}</span>${leftCode}</div>
          <div class="dd-cell"><span class="dd-gutter">${rNum}</span>${rightCode}</div>
        </div>`;
      }).join('');

      return `<div class="dd-sx">
        <div class="dd-sx-head"><span>原始</span><span>新内容</span></div>
        ${html || '<div class="dd-empty-hint">没有差异行</div>'}
      </div>`;
    }

    // —— 上下布局：unified 单列视图 ——
    function renderUnified(ops) {
      let lnL = 0, lnR = 0;
      const visible = state.onlyDiff ? ops.filter(o => o.type !== 'equal') : ops;

      const html = visible.map(op => {
        let cls = 'eq', marker = '', numL = '', numR = '', code = escapeHtml(op.value);
        if (op.type === 'equal') {
          lnL++; lnR++;
          numL = lnL; numR = lnR;
        } else if (op.type === 'remove') {
          lnL++;
          cls = 'del'; marker = '−'; numL = lnL;
        } else {
          lnR++;
          cls = 'add'; marker = '+'; numR = lnR;
        }
        return `<div class="dd-u-row ${cls}">
          <span class="dd-gutter">${numL}</span><span class="dd-gutter">${numR}</span>
          <span class="dd-marker">${marker}</span><span class="dd-code">${code}</span>
        </div>`;
      }).join('');

      return `<div class="dd-un">${html || '<div class="dd-empty-hint">没有差异行</div>'}</div>`;
    }

    // LCS 操作序列 → 左右对齐的行（连续删除+添加按顺序配对为"修改"）
    function pairOps(ops) {
      const rows = [];
      let lnL = 0, lnR = 0;
      let i = 0;
      while (i < ops.length) {
        const op = ops[i];
        if (op.type === 'equal') {
          lnL++; lnR++;
          rows.push({ t: 'eq', l: op.value, r: op.value, ln: lnL, rn: lnR });
          i++;
          continue;
        }
        // 收集一段连续的非 equal 操作
        const dels = [], adds = [];
        while (i < ops.length && ops[i].type !== 'equal') {
          if (ops[i].type === 'remove') { lnL++; dels.push({ v: ops[i].value, ln: lnL }); }
          else { lnR++; adds.push({ v: ops[i].value, rn: lnR }); }
          i++;
        }
        const pairLen = Math.max(dels.length, adds.length);
        for (let k = 0; k < pairLen; k++) {
          const d = dels[k], a = adds[k];
          rows.push({
            t: d && a ? 'mod' : (d ? 'del' : 'add'),
            l: d ? d.v : null,
            r: a ? a.v : null,
            ln: d ? d.ln : null,
            rn: a ? a.rn : null
          });
        }
      }
      return rows;
    }

    // —— 行内词级差异（token LCS），不同片段加深色底高亮 ——
    function tokenize(line) {
      return line.match(/\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) || [];
    }

    function inlineDiffHtml(oldLine, newLine, side) {
      const ta = tokenize(oldLine);
      const tb = tokenize(newLine);
      // 过长的行走不起 O(n*m)，直接整行转义
      if (ta.length * tb.length > 160000) {
        return escapeHtml(side === 'l' ? oldLine : newLine);
      }

      const m = ta.length, n = tb.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let x = 1; x <= m; x++) {
        for (let y = 1; y <= n; y++) {
          dp[x][y] = ta[x - 1] === tb[y - 1]
            ? dp[x - 1][y - 1] + 1
            : Math.max(dp[x - 1][y], dp[x][y - 1]);
        }
      }
      // 回溯：标记每个 token 是否相等
      const markL = ta.map(() => false);
      const markR = tb.map(() => false);
      let x = m, y = n;
      while (x > 0 && y > 0) {
        if (ta[x - 1] === tb[y - 1]) {
          markL[x - 1] = true;
          markR[y - 1] = true;
          x--; y--;
        } else if (dp[x - 1][y] >= dp[x][y - 1]) {
          x--;
        } else {
          y--;
        }
      }

      if (side === 'l') {
        return ta.map((t, k) => markL[k]
          ? escapeHtml(t)
          : `<span class="dt-del">${escapeHtml(t)}</span>`).join('');
      }
      return tb.map((t, k) => markR[k]
        ? escapeHtml(t)
        : `<span class="dt-add">${escapeHtml(t)}</span>`).join('');
    }

    function persistInputs() {
      state.left = leftEl.value;
      state.right = rightEl.value;
    }

    // —— 事件 ——
    c.querySelector('#ddRunBtn').addEventListener('click', runDiff);
    c.querySelector('#ddSwapBtn').addEventListener('click', () => {
      const tmp = leftEl.value;
      leftEl.value = rightEl.value;
      rightEl.value = tmp;
      persistInputs();
      if (state.last) runDiff();
    });
    c.querySelector('#ddClearBtn').addEventListener('click', () => {
      leftEl.value = '';
      rightEl.value = '';
      state.last = null;
      resultEl.innerHTML = '';
      statusEl.textContent = '';
      persistInputs();
      leftEl.focus();
    });
    modeEl.addEventListener('change', () => {
      state.mode = modeEl.value;
      if (state.last) runDiff();
    });
    layoutBtn.addEventListener('click', () => {
      state.layout = state.layout === 'h' ? 'v' : 'h';
      ws.classList.toggle('layout-v', state.layout === 'v');
      syncLayoutBtn();
      if (state.last) renderResult();
    });
    onlyEl.addEventListener('change', () => {
      state.onlyDiff = onlyEl.checked;
      if (state.last) renderResult();
    });

    // Ctrl/Cmd + Enter 快速对比
    [leftEl, rightEl].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          runDiff();
        }
      });
    });

    // 输入防抖实时对比（500ms），不在输入时回写格式化 JSON
    let timer = null;
    const onInput = () => {
      persistInputs();
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (leftEl.value.trim() || rightEl.value.trim()) {
          const data = computeLive();
          if (data) { state.last = data; renderResult(); }
        }
      }, 500);
    };
    leftEl.addEventListener('input', onInput);
    rightEl.addEventListener('input', onInput);

    // 实时对比：JSON 规范化只用于计算，不回写文本框
    function computeLive() {
      const rawL = normalize(leftEl.value);
      const rawR = normalize(rightEl.value);
      let kind = 'text';
      let textL = rawL, textR = rawR;

      if (state.mode === 'json') {
        const p1 = parseJSONRobust(rawL);
        const p2 = parseJSONRobust(rawR);
        if (!p1.ok || !p2.ok) return null;
        kind = 'json';
        textL = JSON.stringify(p1.data, null, 2);
        textR = JSON.stringify(p2.data, null, 2);
      } else if (state.mode === 'auto') {
        const p1 = parseJSONRobust(rawL);
        const p2 = parseJSONRobust(rawR);
        if (p1.ok && p2.ok) {
          kind = 'json';
          textL = JSON.stringify(p1.data, null, 2);
          textR = JSON.stringify(p2.data, null, 2);
        }
      }

      const ops = diffLines(textL, textR);
      let addCount = 0, delCount = 0;
      ops.forEach(op => {
        if (op.type === 'add') addCount++;
        else if (op.type === 'remove') delCount++;
      });
      return { kind, ops, textL, textR, addCount, delCount };
    }
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

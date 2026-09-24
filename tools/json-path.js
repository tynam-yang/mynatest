// tools/json-path.js — JSONPath 测试 / 内容提取（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])));

  const meta = {
    id: 'json-path',
    name: 'JSONPath 测试',
    desc: '输入 JSON 数据，用 JSONPath 表达式提取并高亮匹配节点；支持递归下降、通配符、过滤谓词',
    icon: '🔍',
    iconUrl: 'icons/json-path.png',
    category: 'data-tool',
    categoryName: '数据工具'
  };

  // ========== JSONPath 引擎（自实现，无外部依赖） ==========
  // 支持子集：
  //   $.a.b   .key   ['key']   [0]   [-1]   [*]
  //   $..key  $..*          递归下降
  //   [?(@.field == "x")]   [?(@.price > 10)]   [?(@.name contains "abc")]   [?(@.field exists)]
  //   [1,3,5]  并集
  //   [0:5]    切片

  function tokenize(path) {
    if (typeof path !== 'string') throw new Error('path must be string');
    let i = 0, n = path.length;
    const tokens = [];
    function peek(j = 0) { return path[i + j]; }
    function next() { return path[i++]; }
    function eat(s) {
      if (path.slice(i, i + s.length) === s) { i += s.length; return true; }
      return false;
    }
    function skipWs() { while (i < n && /\s/.test(path[i])) i++; }

    while (i < n) {
      const c = path[i];
      if (c === '$') { tokens.push({ type: 'root' }); next(); }
      else if (c === '@') { tokens.push({ type: 'current' }); next(); }
      else if (c === '.') {
        next(); // 点本身
        // 递归下降？
        let recursive = false;
        if (eat('.')) recursive = true;  // '..'
        skipWs();
        // 属性名 or '*'
        if (peek() === '*') { tokens.push({ type: recursive ? 'recursive-wild' : 'wild' }); next(); }
        else if (peek() === '[') { /* 无属性名，直接进 bracket */ }
        else {
          let name = '';
          while (i < n && !/[\.\[\]]/.test(path[i])) { name += path[i++]; }
          if (name) tokens.push({ type: recursive ? 'recursive-prop' : 'prop', value: name });
        }
      }
      else if (c === '[') {
        next(); // '['
        skipWs();
        // 过滤谓词？
        if (peek() === '?') {
          next(); // '?'
          skipWs();
          if (peek() !== '(') throw new Error('Expected ( after ?');
          next(); // '('
          // 找到匹配的 ')'（忽略字符串内的）
          let depth = 1, expr = '', strChar = null, j = i;
          while (j < n && depth > 0) {
            const ch = path[j];
            if (strChar) {
              expr += ch;
              if (ch === '\\') { j++; if (j < n) expr += path[j++]; continue; }
              if (ch === strChar) strChar = null;
              j++;
              continue;
            }
            if (ch === '"' || ch === "'") { strChar = ch; expr += ch; j++; continue; }
            if (ch === '(') { depth++; expr += ch; j++; continue; }
            if (ch === ')') { depth--; if (depth === 0) { j++; break; } expr += ch; j++; continue; }
            expr += ch; j++;
          }
          i = j;
          tokens.push({ type: 'filter', expr: expr.trim() });
          skipWs();
          if (peek() === ']') next();
        }
        else {
          // index / union / slice / bracket-prop
          let inner = '', j = i, strChar = null, depth = 0;
          while (j < n) {
            const ch = path[j];
            if (strChar) { inner += ch; if (ch === '\\') { j++; if (j < n) inner += path[j++]; continue; } if (ch === strChar) strChar = null; j++; continue; }
            if (ch === '"' || ch === "'") { strChar = ch; inner += ch; j++; continue; }
            if (ch === '(') { depth++; inner += ch; j++; continue; }
            if (ch === ')') { if (depth === 0) break; depth--; inner += ch; j++; continue; }
            if (ch === ']') break;
            inner += ch; j++;
          }
          i = j;
          if (peek() === ']') next();
          const t = inner.trim();

          if (t === '*') {
            tokens.push({ type: 'wild' });
          }
          else if (/^".*"$/.test(t) || /^'.*'$/.test(t)) {
            tokens.push({ type: 'prop', value: t.slice(1, -1) });
          }
          else if (t.indexOf(',') >= 0) {
            // 并集
            tokens.push({ type: 'union', items: t.split(',').map(s => s.trim()) });
          }
          else if (t.indexOf(':') >= 0) {
            // 切片
            const parts = t.split(':');
            tokens.push({
              type: 'slice',
              start: parts[0] ? Number(parts[0]) : null,
              end: parts[1] ? Number(parts[1]) : null,
              step: (parts[2] ? Number(parts[2]) : 1)
            });
          }
          else if (/^-?\d+$/.test(t)) {
            tokens.push({ type: 'index', value: Number(t) });
          }
          else {
            tokens.push({ type: 'prop', value: t });
          }
        }
      }
      else {
        // 允许省略点的属性名（如 "a.b" 但无 "$"）
        let name = '';
        while (i < n && !/[\.\[\]]/.test(path[i])) { name += path[i++]; }
        if (name) tokens.push({ type: 'prop', value: name });
      }
    }
    return tokens;
  }

  function evalFilter(expr, ctxValue, ctxObj) {
    // 解析 @.field op value / @.field exists / @.field contains "x"
    try {
      // exists
      const existsMatch = expr.match(/^@\.([\w\-\.]+)\s+exists$/i);
      if (existsMatch) {
        const v = getByPath(ctxValue, existsMatch[1]);
        return v !== undefined;
      }
      // contains
      const containsMatch = expr.match(/^@\.([\w\-\.]+)\s+contains\s+(.+)$/i);
      if (containsMatch) {
        const v = getByPath(ctxValue, containsMatch[1]);
        const needle = parseLiteral(containsMatch[2]);
        return typeof v === 'string' && v.indexOf(String(needle)) >= 0;
      }
      // op
      const opMatch = expr.match(/^@\.([\w\-\.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
      if (opMatch) {
        const v = getByPath(ctxValue, opMatch[1]);
        const op = opMatch[2];
        const rhs = parseLiteral(opMatch[3]);
        switch (op) {
          case '==': return v == rhs;
          case '!=': return v != rhs;
          case '>':  return Number(v) >  Number(rhs);
          case '<':  return Number(v) <  Number(rhs);
          case '>=': return Number(v) >= Number(rhs);
          case '<=': return Number(v) <= Number(rhs);
        }
      }
      // 直接 true/false / @
      if (expr === '@') return true;
      if (/^true$/i.test(expr)) return true;
      if (/^false$/i.test(expr)) return false;
      return false;
    } catch { return false; }
  }

  function parseLiteral(s) {
    s = s.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\(["'\\])/g, '$1');
    }
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (/^true$/i.test(s)) return true;
    if (/^false$/i.test(s)) return false;
    if (/^null$/i.test(s)) return null;
    return s;
  }

  // key 路径内辅助：data.list[0].id
  function getByPath(obj, path) {
    if (!path) return obj;
    let cur = obj;
    const parts = path.split(/\.|(\[\d+\])/).filter(Boolean);
    for (const part of parts) {
      if (cur === null || cur === undefined) return undefined;
      const arrMatch = part.match(/^\[(\d+)\]$/);
      if (arrMatch) cur = cur[Number(arrMatch[1])];
      else cur = cur[part];
    }
    return cur;
  }

  function findAllRecursive(obj, predicate) {
    const results = [];
    function walk(o) {
      if (predicate(o)) results.push(o);
      if (o && typeof o === 'object') {
        if (Array.isArray(o)) o.forEach(walk);
        else Object.values(o).forEach(walk);
      }
    }
    walk(obj);
    return results;
  }

  function findAllRecursiveByProp(obj, propName) {
    const results = [];
    function walk(o) {
      if (o && typeof o === 'object') {
        if (Object.prototype.hasOwnProperty.call(o, propName)) results.push(o[propName]);
        if (Array.isArray(o)) o.forEach(walk);
        else Object.values(o).forEach(walk);
      }
    }
    walk(obj);
    return results;
  }

  function findAllRecursiveWild(obj) {
    const results = [];
    function walk(o) {
      results.push(o);
      if (o && typeof o === 'object') {
        if (Array.isArray(o)) o.forEach(walk);
        else Object.values(o).forEach(walk);
      }
    }
    walk(obj);
    return results;
  }

  function evaluate(root, path) {
    const tokens = tokenize(path);
    let cur = [root];  // 多结果用数组聚合

    for (let ti = 0; ti < tokens.length; ti++) {
      const tok = tokens[ti];

      if (tok.type === 'root') {
        cur = [root];
      }
      else if (tok.type === 'current') {
        // 单独 @ 没意义，跳过
      }
      else if (tok.type === 'prop') {
        const next = [];
        for (const c of cur) {
          if (c && typeof c === 'object' && !Array.isArray(c)) {
            if (Object.prototype.hasOwnProperty.call(c, tok.value)) next.push(c[tok.value]);
          }
        }
        cur = next;
      }
      else if (tok.type === 'wild') {
        const next = [];
        for (const c of cur) {
          if (Array.isArray(c)) c.forEach(v => next.push(v));
          else if (c && typeof c === 'object') Object.values(c).forEach(v => next.push(v));
        }
        cur = next;
      }
      else if (tok.type === 'index') {
        const next = [];
        for (const c of cur) {
          if (Array.isArray(c)) {
            let idx = tok.value;
            if (idx < 0) idx = c.length + idx;
            if (idx >= 0 && idx < c.length) next.push(c[idx]);
          }
        }
        cur = next;
      }
      else if (tok.type === 'slice') {
        const next = [];
        for (const c of cur) {
          if (Array.isArray(c)) {
            const len = c.length;
            let s = tok.start == null ? 0 : (tok.start < 0 ? len + tok.start : tok.start);
            let e = tok.end   == null ? len : (tok.end   < 0 ? len + tok.end   : tok.end);
            s = Math.max(0, Math.min(s, len));
            e = Math.max(0, Math.min(e, len));
            if (tok.step > 0) {
              for (let i = s; i < e; i += tok.step) next.push(c[i]);
            }
          }
        }
        cur = next;
      }
      else if (tok.type === 'union') {
        const next = [];
        for (const c of cur) {
          for (const item of tok.items) {
            const t = item.trim();
            if (/^-?\d+$/.test(t)) {
              let idx = Number(t);
              if (Array.isArray(c)) {
                if (idx < 0) idx = c.length + idx;
                if (idx >= 0 && idx < c.length) next.push(c[idx]);
              }
            } else {
              // 尝试属性
              if (c && typeof c === 'object' && Object.prototype.hasOwnProperty.call(c, t)) {
                next.push(c[t]);
              }
            }
          }
        }
        cur = next;
      }
      else if (tok.type === 'filter') {
        const next = [];
        for (const c of cur) {
          if (Array.isArray(c)) {
            c.forEach(item => { if (evalFilter(tok.expr, item, c)) next.push(item); });
          } else if (c && typeof c === 'object') {
            if (evalFilter(tok.expr, c, null)) next.push(c);
          }
        }
        cur = next;
      }
      else if (tok.type === 'recursive-prop') {
        // 下一个 tok 若是 wildcard？
        const next = [];
        for (const c of cur) {
          next.push(...findAllRecursiveByProp(c, tok.value));
        }
        cur = next;
      }
      else if (tok.type === 'recursive-wild') {
        const next = [];
        for (const c of cur) {
          next.push(...findAllRecursiveWild(c));
        }
        cur = next;
      }
      else {
        // 未知 token 跳过
      }
    }

    return cur;
  }

  // 导出引擎（挂载到 window，供工具调用）
  window.MynaJSONPath = {
    tokenize, evaluate,
    // 简洁 API：返回 { results, count, error }
    query(root, path) {
      try {
        const results = evaluate(root, path);
        return { results, count: results.length, error: null };
      } catch (e) {
        return { results: [], count: 0, error: e.message };
      }
    }
  };

  // ========== 渲染 ==========
  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="jp-section">
        <div class="jp-section-head">
          <span class="jp-section-title">JSON 输入</span>
          <div class="jp-toolbar">
            <button class="btn tiny" id="jpLoadSampleBtn">📋 示例</button>
            <button class="btn tiny" id="jpClearJsonBtn">清空</button>
          </div>
        </div>
        <textarea id="jpJsonInput" class="jp-json-input" rows="5" placeholder='{"name":"MynaTest","version":"1.0","users":[{"name":"Alice","age":25},{"name":"Bob","age":30}]}'></textarea>
      </div>

      <div class="jp-section">
        <div class="jp-section-head">
          <span class="jp-section-title">JSONPath</span>
          <span class="jp-toggle" id="jpHelpToggle">语法说明</span>
        </div>
        <div class="jp-path-row">
          <input type="text" id="jpPathInput" class="jp-path-input" placeholder="$.users[*].name ...  回车执行">
          <button class="btn primary" id="jpRunBtn">▶</button>
        </div>
        <div class="jp-help" id="jpHelp" style="display:none;">
          <div class="jp-help-row"><code>$.a.b</code><span>点号访问属性</span></div>
          <div class="jp-help-row"><code>$['a']</code><span>方括号属性（key 含特殊字符时）</span></div>
          <div class="jp-help-row"><code>[0] / [-1]</code><span>数组索引，支持倒数</span></div>
          <div class="jp-help-row"><code>[*]</code><span>数组/对象所有元素</span></div>
          <div class="jp-help-row"><code>$..key</code><span>递归下降，取所有层级 key</span></div>
          <div class="jp-help-row"><code>$..*</code><span>递归下降所有节点</span></div>
          <div class="jp-help-row"><code>[?(@.age > 20)]</code><span>过滤表达式，支持 == != > < >= <= contains exists</span></div>
          <div class="jp-help-row"><code>[0:5:2]</code><span>数组切片 [start:end:step]</span></div>
          <div class="jp-help-row"><code>[1,3,5]</code><span>并集，取多个索引</span></div>
        </div>

        <!-- 快捷示例 -->
        <div class="jp-samples">
          <span class="jp-sample-label">试试：</span>
          <button class="jp-sample" data-path="$.users[*].name">$.users[*].name</button>
          <button class="jp-sample" data-path="$.users[?(@.age > 25)]">$.users[?(@.age > 25)]</button>
          <button class="jp-sample" data-path="$..name">$..name</button>
          <button class="jp-sample" data-path="$.users[0]">$.users[0]</button>
        </div>
      </div>

      <div class="jp-section">
        <div class="jp-section-head">
          <span class="jp-section-title">结果 <span class="jp-result-count" id="jpResultCount"></span></span>
          <div class="jp-toolbar">
            <button class="btn tiny" id="jpCopyBtn">📋 复制</button>
            <button class="btn tiny" id="jpClearResultBtn">清空</button>
          </div>
        </div>
        <div id="jpResult" class="jp-result">
          <div class="jp-empty">输入 JSON 和路径表达式，点击「执行」或按 Enter</div>
        </div>
      </div>
    `;
  }

  const SAMPLE_JSON = JSON.stringify({
    name: "MynaTest",
    version: "1.0.0",
    description: "浏览器测试辅助工具集",
    categories: ["网络工具", "格式转换", "开发工具", "测试工具", "数据生成"],
    tools: [
      { id: "stress-test", name: "轻量压测", category: "network", enabled: true },
      { id: "json-formatter", name: "JSON 格式化", category: "format", enabled: true },
      { id: "json-path", name: "JSONPath 测试", category: "format", enabled: true },
      { id: "web-vitals", name: "性能面板", category: "network", enabled: false }
    ]
  }, null, 2);

  function mount(context) {
    const c = context.container;

    c.querySelector('#jpHelpToggle').addEventListener('click', () => {
      const el = c.querySelector('#jpHelp');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    });

    c.querySelector('#jpRunBtn').addEventListener('click', () => runQuery(c));
    c.querySelector('#jpPathInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runQuery(c);
    });
    c.querySelector('#jpLoadSampleBtn').addEventListener('click', () => {
      c.querySelector('#jpJsonInput').value = SAMPLE_JSON;
      flashMessage('✓ 已加载示例');
    });
    c.querySelector('#jpClearJsonBtn').addEventListener('click', () => {
      c.querySelector('#jpJsonInput').value = '';
    });
    c.querySelector('#jpClearResultBtn').addEventListener('click', () => {
      c.querySelector('#jpResult').innerHTML = '<div class="jp-empty">结果已清空</div>';
      c.querySelector('#jpResultCount').textContent = '';
    });
    c.querySelector('#jpCopyBtn').addEventListener('click', () => {
      const data = window.__jp_last_result__;
      if (!data || !data.results || data.results.length === 0) {
        flashMessage('暂无结果可复制', true);
        return;
      }
      const text = data.results.map((v, i) => `// [${i}]\n${stringifyPretty(v)}`).join('\n\n');
      navigator.clipboard?.writeText(text).then(
        () => flashMessage(`✓ 已复制 ${data.results.length} 条结果`),
        () => flashMessage('复制失败', true)
      );
    });

    c.querySelectorAll('.jp-sample').forEach(btn => {
      btn.addEventListener('click', () => {
        c.querySelector('#jpPathInput').value = btn.dataset.path;
        runQuery(c);
      });
    });

    // 恢复上次输入
    chrome.storage.local.get(['jpJsonInput', 'jpPathInput'], (res) => {
      if (res.jpJsonInput) c.querySelector('#jpJsonInput').value = res.jpJsonInput;
      if (res.jpPathInput) c.querySelector('#jpPathInput').value = res.jpPathInput;
    });

    return () => { delete window.__jp_last_result__; };
  }

  function runQuery(c) {
    const rawJson = c.querySelector('#jpJsonInput').value.trim();
    let path = c.querySelector('#jpPathInput').value.trim();
    const resultEl = c.querySelector('#jpResult');
    const countEl = c.querySelector('#jpResultCount');

    if (!rawJson) { flashMessage('请输入 JSON', true); return; }
    if (!path) { flashMessage('请输入 JSONPath 表达式', true); return; }

    // 保存输入
    chrome.storage.local.set({ jpJsonInput: rawJson, jpPathInput: path });

    // 确保路径以 $ 开头
    if (!path.startsWith('$') && !path.startsWith('@')) path = '$' + path;

    let root;
    try {
      root = JSON.parse(rawJson);
    } catch (e) {
      resultEl.innerHTML = `<div class="jp-error">✗ JSON 解析失败：${escapeHtml(e.message)}</div>`;
      countEl.textContent = '';
      return;
    }

    const data = window.MynaJSONPath.query(root, path);
    window.__jp_last_result__ = data;

    if (data.error) {
      resultEl.innerHTML = `<div class="jp-error">✗ 路径解析失败：${escapeHtml(data.error)}</div>`;
      countEl.textContent = '';
      return;
    }

    countEl.textContent = `(${data.count} 匹配)`;

    if (data.count === 0) {
      resultEl.innerHTML = '<div class="jp-empty">无匹配结果</div>';
      return;
    }

    const items = data.results.map((v, i) => {
      const pretty = stringifyPretty(v);
      const isObject = v !== null && typeof v === 'object';
      const type = Array.isArray(v) ? 'array' : (v === null ? 'null' : typeof v);
      const short = summarize(v);
      return `
        <div class="jp-result-item">
          <div class="jp-result-head">
            <span class="jp-result-idx">[${i}]</span>
            <span class="jp-result-type jp-type-${type}">${type}</span>
            <span class="jp-result-short">${escapeHtml(short)}</span>
          </div>
          <pre class="jp-result-body">${escapeHtml(pretty)}</pre>
        </div>
      `;
    }).join('');

    resultEl.innerHTML = items;
  }

  function stringifyPretty(v) {
    try {
      if (v === undefined) return 'undefined';
      return JSON.stringify(v, null, 2);
    } catch { return String(v); }
  }

  function summarize(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return `Array(${v.length})`;
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      return `Object(${keys.length}) ${keys.slice(0, 3).join(',')}${keys.length > 3 ? '...' : ''}`;
    }
    const s = String(v);
    return s.length > 60 ? s.slice(0, 60) + '...' : s;
  }

  function cleanup() { delete window.__jp_last_result__; }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

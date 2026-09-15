// tools/request-diff.js — 请求对比工具（全局）

(function () {
  const diffJSON = window.MynaDiff.diffJSON;
  const diffLines = window.MynaDiff.diffLines;
  const looksLikeJSON = window.MynaDiff.looksLikeJSON;
  const escapeHtml = window.MynaUtils.escapeHtml;
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'request-diff',
    name: '请求对比',
    desc: '捕获两次接口响应，自动 diff 高亮差异',
    iconUrl: 'icons/request-diff.png',
    category: 'network',
    categoryName: '网络工具'
  };

  let pendingSlot = null;
  let slots = [null, null];

  const FIELD_LABELS = {
    url: '请求地址',
    requestBody: '请求参数',
    responseBody: '响应结果'
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="capture-area">
        <div class="capture-hint" id="captureHint">点击下方按钮，下一个捕获到的接口响应将被保存</div>
        <div class="capture-row">
          <button class="btn capture-btn" data-slot="0" id="captureSlot1">捕获 1</button>
          <button class="btn capture-btn" data-slot="1" id="captureSlot2">捕获 2</button>
        </div>
        <div class="capture-row">
          <button class="btn danger" id="clearSlotsBtn">清空</button>
          <button class="btn primary" id="diffBtn" disabled>对比差异</button>
        </div>
      </div>

      <div class="capture-slots">
        <div class="slot slot-empty" id="slot1">
          <div class="empty-hint">等待捕获...</div>
        </div>
        <div class="slot slot-empty" id="slot2">
          <div class="empty-hint">等待捕获...</div>
        </div>
      </div>

      <div class="diff-result" id="diffResult" style="display:none;">
        <div class="diff-result-header">差异结果</div>
        <div class="diff-result-sections" id="diffSections"></div>
      </div>
    `;
  }

  function mount(context) {
    pendingSlot = null;
    slots = [null, null];

    const c = context.container;

    function setPending(idx) {
      pendingSlot = idx;
      c.querySelectorAll('.capture-btn').forEach(b => {
        b.classList.toggle('active', Number(b.dataset.slot) === idx);
      });
      c.querySelectorAll('.slot').forEach((s, i) => {
        s.classList.toggle('pending', i === idx && !slots[i]);
      });
      const hint = c.querySelector('#captureHint');
      if (hint) hint.textContent = `👉 正在等待槽位 ${idx + 1} 的响应，请在页面上触发一个接口请求...`;
    }

    function clearPending() {
      pendingSlot = null;
      c.querySelectorAll('.capture-btn').forEach(b => b.classList.remove('active'));
      c.querySelectorAll('.slot').forEach(s => s.classList.remove('pending'));
      const hint = c.querySelector('#captureHint');
      if (hint) hint.textContent = '点击下方按钮，下一个捕获到的接口响应将被保存';
    }

    c.querySelector('#captureSlot1')?.addEventListener('click', () => {
      if (pendingSlot === 0) { clearPending(); return; }
      setPending(0);
      flashMessage('请在页面上触发一个接口请求...', 2500);
    });

    c.querySelector('#captureSlot2')?.addEventListener('click', () => {
      if (pendingSlot === 1) { clearPending(); return; }
      setPending(1);
      flashMessage('请在页面上触发一个接口请求...', 2500);
    });

    c.querySelector('#clearSlotsBtn')?.addEventListener('click', () => {
      slots = [null, null];
      clearPending();
      updateSlotUI(c);
      const r = c.querySelector('#diffResult');
      if (r) r.style.display = 'none';
    });

    c.querySelector('#diffBtn')?.addEventListener('click', () => runDiff(c));

    const off = context.events.on('network:request', (payload) => {
      if (pendingSlot !== null) {
        slots[pendingSlot] = payload;
        const which = pendingSlot + 1;
        clearPending();
        updateSlotUI(c);
        flashMessage(`✓ 已捕获到槽位 ${which}`, 1500);
      }
    });

    return () => off();
  }

  function cleanup() {
    pendingSlot = null;
    slots = [null, null];
  }

  function formatBody(body) {
    if (!body) return '';
    const r = window.MynaDiff.parseJSONRobust(body);
    if (r.ok) {
      return JSON.stringify(r.data, null, 2);
    }
    return body;
  }

  function tryUrlDecode(str) {
    if (typeof str !== 'string') return str;
    try {
      // 如果字符串里有 %XX 模式，尝试 decode
      if (/[%+]/.test(str)) {
        const decoded = decodeURIComponent(str.replace(/\+/g, ' '));
        // 如果解码后比原来短（说明有编码），且不是乱码，就用解码版
        if (decoded.length >= str.length * 0.5 && !/\ufffd/.test(decoded)) {
          return decoded;
        }
      }
    } catch {}
    return str;
  }

  function formatField(field, value) {
    if (value === null || value === undefined) return '';
    let str = String(value);
    str = tryUrlDecode(str);
    if (field === 'requestBody' || field === 'responseBody') {
      return formatBody(str);
    }
    return str;
  }

  function buildSlotHTML(i, payload) {
    if (!payload) {
      return `<div class="slot-empty-state">等待捕获...</div>`;
    }

    return `
      <div class="slot-meta-row">
        <span class="slot-badge method">${escapeHtml(payload.method || 'GET')}</span>
        <span class="slot-badge ${payload.success ? 'ok' : 'err'}">${payload.status || 'N/A'}</span>
        <span class="slot-duration">${payload.duration || 0}ms</span>
      </div>

      <div class="slot-fields">
        ${buildSlotField('url', payload.url)}
        ${buildSlotField('requestBody', payload.requestBody)}
        ${buildSlotField('responseBody', payload.responseBody)}
      </div>
    `;
  }

  function buildSlotField(field, rawValue) {
    const label = FIELD_LABELS[field] || field;
    const hasValue = rawValue !== null && rawValue !== undefined && rawValue !== '';

    if (!hasValue) {
      return `
        <div class="slot-field">
          <div class="slot-field-label">${label}</div>
          <div class="slot-field-empty">(无)</div>
        </div>
      `;
    }

    const formatted = formatField(field, rawValue);
    const truncated = formatted.length > 800;
    const display = truncated ? formatted.slice(0, 800) + '\n... (截断)' : formatted;

    return `
      <div class="slot-field" data-field="${field}">
        <div class="slot-field-label">${label}</div>
        <pre class="slot-field-content" data-field="${field}"></pre>
      </div>
    `;
  }

  function updateSlotUI(c) {
    for (let i = 0; i < 2; i++) {
      const slot = slots[i];
      const slotEl = c.querySelector(`#slot${i + 1}`);
      if (!slotEl) continue;

      slotEl.classList.remove('slot-empty');
      if (slot) {
        slotEl.classList.add('filled');
      } else {
        slotEl.classList.remove('filled');
      }
      slotEl.innerHTML = buildSlotHTML(i + 1, slot);

      // 异步填充 textContent（防 XSS），用 data-field 精准定位，不靠索引
      if (slot) {
        const fields = ['url', 'requestBody', 'responseBody'];
        fields.forEach(field => {
          const pre = slotEl.querySelector(`pre.slot-field-content[data-field="${field}"]`);
          if (pre) {
            const val = slot[field];
            if (val !== null && val !== undefined && val !== '') {
              pre.textContent = formatField(field, val);
            }
          }
        });
      }
    }

    const diffBtn = c.querySelector('#diffBtn');
    if (diffBtn) diffBtn.disabled = !(slots[0] && slots[1]);
  }

  function runDiff(container) {
    console.log('[MynaTest] runDiff called');
    const s1 = slots[0], s2 = slots[1];
    console.log('[MynaTest] slots:', !!s1, !!s2);
    if (!s1 || !s2) { flashMessage('请先捕获两个请求', true); return; }

    const resultEl = container.querySelector('#diffResult');
    const sectionsEl = container.querySelector('#diffSections');
    if (!resultEl || !sectionsEl) { console.error('[MynaTest] 找不到 diffResult/diffSections DOM'); return; }

    try {
      const fields = ['url', 'requestBody', 'responseBody'];
      let totalDiffs = 0;

      let html = '';
      fields.forEach(field => {
        const v1 = s1[field] !== undefined && s1[field] !== null ? String(s1[field]) : '';
        const v2 = s2[field] !== undefined && s2[field] !== null ? String(s2[field]) : '';
        const label = FIELD_LABELS[field] || field;

        console.log('[MynaTest] diff field:', field, 'v1.len:', v1.length, 'v2.len:', v2.length);
        const section = buildDiffSection(label, v1, v2);
        totalDiffs += section.count;
        html += section.html;
      });

      sectionsEl.innerHTML = html;
      const header = container.querySelector('#diffResult .diff-result-header');
      if (header) {
        header.textContent = totalDiffs === 0
          ? '✓ 三个字段完全一致'
          : `差异结果 · 共 ${totalDiffs} 处`;
      }
      resultEl.style.display = 'block';
      bindDiffEvents(container);
      console.log('[MynaTest] runDiff done, totalDiffs:', totalDiffs);
    } catch (e) {
      console.error('[MynaTest] runDiff ERROR:', e);
      flashMessage('对比出错：' + e.message, true);
    }
  }

  function buildDiffSection(label, v1, v2) {
    // 尝试用 parseJSONRobust 把两边都解成 JSON 对象
    const r1 = window.MynaDiff.parseJSONRobust(v1);
    const r2 = window.MynaDiff.parseJSONRobust(v2);

    if (r1.ok && r2.ok) {
      const diffs = window.MynaDiff.diffJSON(r1.data, r2.data);
      if (diffs.length === 0) {
        return { count: 0, html: `<div class="diff-section"><div class="diff-section-title">${label} ✓ 一致</div></div>` };
      }
      const items = diffs.map(d => {
        let cls = 'value', label = '修改';
        if (d.type === 'added') { cls = 'add'; label = '新增'; }
        else if (d.type === 'removed') { cls = 'remove'; label = '删除'; }
        else if (d.type === 'type') { cls = 'type'; label = '类型变更'; }
        const oldStr = d.oldValue !== undefined ? `<div class="json-diff-values">- ${escapeHtml(typeof d.oldValue === 'object' ? JSON.stringify(d.oldValue) : String(d.oldValue))}</div>` : '';
        const newStr = d.newValue !== undefined ? `<div class="json-diff-values">+ ${escapeHtml(typeof d.newValue === 'object' ? JSON.stringify(d.newValue) : String(d.newValue))}</div>` : '';
        return `<div class="json-diff-item ${cls}">
          <div class="diff-path">[${label}] ${escapeHtml(d.path)}</div>
          ${oldStr}${newStr}
        </div>`;
      }).join('');
      return {
        count: diffs.length,
        html: `<div class="diff-section">
          <div class="diff-section-title">${label} · ${diffs.length} 处差异</div>
          ${items}
        </div>`
      };
    }

    // 行级 diff（兜底）
    if (v1 === v2) {
      return { count: 0, html: `<div class="diff-section"><div class="diff-section-title">${label} ✓ 一致</div></div>` };
    }
    const lines = diffLines(v1, v2);
    const changed = lines.filter(l => l.type !== 'equal');
    const equals = lines.filter(l => l.type === 'equal');

    const changedRows = lines
      .filter(l => l.type !== 'equal')
      .map(d => {
        const marker = d.type === 'add' ? '+' : '-';
        return `<div class="diff-line ${d.type}"><span class="marker">${marker}</span>${escapeHtml(d.value || '(empty)')}</div>`;
      }).join('');

    const equalRows = equals.map(d =>
      `<div class="diff-line equal"><span class="marker"></span>${escapeHtml(d.value || '(empty)')}</div>`
    ).join('');

    const collapseHint = equals.length > 0
      ? `<div class="diff-collapse" data-field="${label}">…… ${equals.length} 行相同内容 <span class="diff-toggle" data-field="${label}">[展开]</span></div>`
      : '';

    return {
      count: changed.length,
      html: `<div class="diff-section">
        <div class="diff-section-title">${label} · ${changed.length} 行变更</div>
        <div class="diff-lines-wrap">${changedRows}${collapseHint}
          <div class="diff-equal-hidden" data-field="${label}" style="display:none;">${equalRows}</div>
        </div>
      </div>`
    };
  }

  function bindDiffEvents(container) {
    // 展开/折叠相同行
    container.querySelectorAll('.diff-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const field = toggle.dataset.field;
        const hidden = container.querySelector(`.diff-equal-hidden[data-field="${field}"]`);
        if (!hidden) return;
        if (hidden.style.display === 'none') {
          hidden.style.display = 'block';
          toggle.textContent = '[折叠]';
        } else {
          hidden.style.display = 'none';
          toggle.textContent = '[展开]';
        }
      });
    });
  }

  // 注册到全局
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

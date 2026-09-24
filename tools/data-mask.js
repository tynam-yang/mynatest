// tools/data-mask.js — 敏感信息脱敏（全局 IIFE）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])));

  const meta = {
    id: 'data-mask',
    name: '敏感信息脱敏',
    desc: '一键脱敏手机号/身份证/邮箱/银行卡等；支持 JSON/CSV/纯文本三种输入；规则反向校验',
    icon: '🛡️',
    iconUrl: 'icons/data-mask.png',
    category: 'data-tool',
    categoryName: '数据工具'
  };

  // ========== 脱敏规则引擎 ==========
  // 通用 mask 参数：{ first, last, char } → 保留前 first 位 + 中间 char 填满 + 保留后 last 位
  function maskKeepFirstLast(value, first, last, char = '*') {
    if (value === null || value === undefined) return value;
    const s = String(value);
    const len = s.length;
    if (len === 0) return s;
    // 安全边界
    first = Math.max(0, Math.min(first, len));
    last = Math.max(0, Math.min(last, len));
    if (first + last >= len) {
      if (first >= len) return s;
      if (first === 0 && last === 0) return char.repeat(len);
      // 退化：保留 first，其余 mask
      return s.slice(0, first) + char.repeat(Math.max(1, len - first));
    }
    const head = s.slice(0, first);
    const tail = last > 0 ? s.slice(-last) : '';
    const midLen = len - first - last;
    return head + char.repeat(midLen) + tail;
  }

  function maskEmail(value, first, last, char = '*') {
    const at = value.indexOf('@');
    if (at < 0) return value;
    const local = value.slice(0, at);
    const host = value.slice(at);
    if (local.length <= first + last) return char.repeat(Math.max(1, local.length - (first + last))) + host;
    return local.slice(0, first) + char.repeat(local.length - first - last) + local.slice(-last) + host;
  }

  // 默认配置（首次加载 / 用户未自定义时）
  const DEFAULT_CONFIG = {
    phone:   { first: 3, last: 4, char: '*' },
    tel:     { first: 0, last: 2, char: '*' }, // 区号保留是正则整体处理，这里 mask 固话部分
    idcard:  { first: 6, last: 4, char: '*' },
    hkid:    { first: 2, last: 1, char: '*' },
    email:   { first: 1, last: 1, char: '*' },
    bank:    { first: 6, last: 4, char: ' ' }, // 银行卡默认保留空格分组
    ip:      { first: -1, last: 1, char: '*' }, // -1 表示 maskLastOnly：只替换最后一段
    name_cn: { first: 1, last: 0, char: '*' },
    address: { first: 3, last: 0, char: '*' }
  };

  // 运行时配置（可被用户自定义覆盖）
  let RULE_CONFIG = { ...DEFAULT_CONFIG };

  function applyRuleCustomConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') return;
    RULE_CONFIG = { ...DEFAULT_CONFIG, ...cfg };
  }

  // 每条规则的 mask 闭包根据 RULE_CONFIG 动态取参
  function buildMaskFn(ruleId) {
    return function (v, meta) {
      const c = RULE_CONFIG[ruleId] || DEFAULT_CONFIG[ruleId] || { first: 0, last: 0, char: '*' };
      switch (ruleId) {
        case 'name_cn': {
          const masked = maskKeepFirstLast(v, c.first, c.last, c.char);
          const prefix = meta && meta.prefix ? meta.prefix : '';
          return prefix + masked;
        }
        case 'address': {
          // 找到第一个"省市区镇"停点 → 停点之前全保留，之后走 maskKeepFirstLast
          const stop = v.search(/(省|市|区|县|镇|街|路|巷|号|栋|单元|室)/);
          if (stop < 0) return maskKeepFirstLast(v, c.first, c.last, c.char);
          const preserved = v.slice(0, stop + 1); // 到"区"为止
          const tail = v.slice(stop + 1);
          return preserved + maskKeepFirstLast(tail, Math.max(0, c.first - preserved.length), c.last, c.char);
        }
        case 'tel': {
          const m = v.match(/^(0\d{2,3})(-?)(\d{7,8})$/);
          if (!m) return v;
          const h = m[1], sep = m[2], tail = m[3];
          const maskedTail = maskKeepFirstLast(tail, c.first, c.last, c.char);
          return h + sep + maskedTail;
        }
        case 'bank': {
          const masked = maskKeepFirstLast(v, c.first, c.last, c.char);
          if (c.char === ' ') {
            const bodyLen = v.length - c.first - c.last;
            return v.slice(0, c.first) + ' ' + '**** **** **** '.slice(0, bodyLen) + v.slice(-c.last);
          }
          return masked;
        }
        case 'ip': {
          if (c.last === 0 || c.last < 0) return v.replace(/\d+$/, c.char);
          const parts = v.split('.');
          if (parts.length !== 4) return v;
          parts[3] = c.char.repeat(parts[3].length);
          return parts.join('.');
        }
        case 'email':
          return maskEmail(v, c.first, c.last, c.char);
        default:
          return maskKeepFirstLast(v, c.first, c.last, c.char);
      }
    };
  }

  function buildDescribe(ruleId) {
    const c = RULE_CONFIG[ruleId] || DEFAULT_CONFIG[ruleId];
    if (ruleId === 'ip') return '最后一段隐藏';
    if (ruleId === 'bank') return `前${c.first}后${c.last}`;
    if (ruleId === 'tel') return `固话号前${c.first}后${c.last}`;
    return `前${c.first}后${c.last}`;
  }

  const RULES = [
    {
      id: 'phone',
      label: '中国手机号',
      regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
      mask: null, // 延迟绑定
      describe: null
    },
    {
      id: 'tel',
      label: '固话',
      regex: /(?<!\d)0\d{2,3}-?\d{7,8}(?!\d)/g,
      mask: null,
      describe: null
    },
    {
      id: 'idcard',
      label: '身份证号 (大陆)',
      regex: /(?<!\d)[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g,
      mask: null,
      describe: null,
      validate: (v) => validateIdCard(v)
    },
    {
      id: 'hkid',
      label: '香港身份证',
      regex: /[A-Z]{1,2}\d{6}[\(\)][\dA-Z][\(\)]/g,
      mask: null,
      describe: null,
      validate: (v) => validateHKId(v)
    },
    {
      id: 'email',
      label: '邮箱',
      regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
      mask: null,
      describe: null,
      validate: (v) => /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(v)
    },
    {
      id: 'bank',
      label: '银行卡号',
      regex: /(?<!\d)\d{14,19}(?!\d)/g,
      mask: null,
      describe: null,
      validate: (v) => validateLuhn(v)
    },
    {
      id: 'ip',
      label: 'IP 地址',
      regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
      mask: null,
      describe: null,
      validate: (v) => /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(v)
    },
    {
      id: 'name_cn',
      label: '中文姓名',
      regex: /[\u4e00-\u9fa5]{2,4}/g,
      mask: null,
      describe: null,
      // 纯文本/CSV 里容易误伤（"产品设计"也能命中），所以只在 JSON 模式按字段名触发
      fieldOnly: true,
      jsonOnlyField: ['name', 'username', 'user_name', '姓名', '名字', '联系人']
    },
    {
      id: 'address',
      label: '地址',
      regex: /[\u4e00-\u9fa5A-Za-z0-9\-]+(?:省|市|区|县|镇|街|路|巷|号|栋|单元|室)[\u4e00-\u9fa5A-Za-z0-9\-]*/g,
      mask: null,
      describe: null,
      fieldOnly: true,
      jsonOnlyField: ['address', 'addr', '地址', 'location']
    }
  ];

  // 为每条规则动态注入 mask / describe（引用 RULE_CONFIG 最新值）
  RULES.forEach(r => {
    r.mask = buildMaskFn(r.id);
    r.describe = () => buildDescribe(r.id);
  });

  // -------- 校验辅助 --------
  function validateIdCard(id) {
    if (!/^\d{17}[\dXx]$/.test(id)) return false;
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const codes = ['1','0','X','9','8','7','6','5','4','3','2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += Number(id[i]) * weights[i];
    const expected = codes[sum % 11];
    return expected === id[17] || expected === id[17].toUpperCase();
  }

  function validateHKId(id) {
    const m = id.match(/^([A-Z]{1,2})(\d{6})\(([\dA-Z])\)$/);
    if (!m) return false;
    const prefix = m[1], digits = m[2], check = m[3].toUpperCase();
    const all = (prefix.length === 1 ? ' ' : prefix[0]) + (prefix.length === 1 ? prefix : prefix[1]) + digits;
    let sum = 0;
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      const v = c === ' ' ? 36 : (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
      sum += v * (all.length - i);
    }
    const rem = sum % 11;
    const expected = rem === 0 ? 10 : (11 - rem);
    const expectedStr = expected === 10 ? 'A' : String(expected);
    return expectedStr === check;
  }

  function validateLuhn(num) {
    num = num.replace(/\D/g, '');
    if (!/^\d{14,19}$/.test(num)) return false;
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = Number(num[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0;
  }

  // -------- 统一脱敏入口 --------
  // 算法：先收集所有规则（含未启用）的所有 match 区间 → 按起始升、长度降排 →
  // 每个区间选最长那条（最具体优先，与是否启用无关）→ 若该规则启用则 mask。
  // 这样「银行卡 \d{14,19}」不会吞掉同区间内更长/更具体的身份证号，
  // 且身份证规则关掉时这段区间完全不处理，避免跨规则误命中。
  function maskText(text, enabledIds) {
    if (!text) return { value: '', count: 0 };
    const ids = new Set(enabledIds);

    // 1. 收集所有启用规则的 match 区间
    const all = []; // { start, end, match, rule, meta }
    for (const rule of RULES) {
      if (rule.fieldOnly) continue; // 纯文本模式跳过"仅 JSON 字段"规则
      if (!ids.has(rule.id)) continue; // 未勾选的规则也不参与（与"最具体优先"兼容）
      if (!rule.regex.global) rule.regex = new RegExp(rule.regex.source, 'g');
      let m;
      while ((m = rule.regex.exec(text)) !== null) {
        let fullMatch = m[0];
        let start = m.index;
        let end = m.index + fullMatch.length;
        let meta = {};
        if (rule.useCapture && m[rule.useCapture] !== undefined) {
          // 用捕获组里的内容作为 mask 输入（保留组 1 原样）
          meta.prefix = m.slice(1, rule.useCapture).join('') || '';
          fullMatch = m[rule.useCapture];
          // 只在"中文"部分 mask，后面的消费区间要扩展到整个 full regex match（含前后缀）
          // 但 replace 时只替换捕获组那一段 → 这里用 start/end 整段替换，mask 输出会拼接 prefix
          // 简化：消费区间仍用捕获组的 start，end 也用捕获组的 end；prefix 由 mask 返回值自己处理
          const subIdx = m.index + (m[0].indexOf(m[rule.useCapture]));
          start = subIdx;
          end = subIdx + m[rule.useCapture].length;
        }
        all.push({ start, end, match: fullMatch, rule, meta });
        if (m.index === rule.regex.lastIndex) rule.regex.lastIndex++;
      }
    }

    // 2. 排序：起点升；起点相同 → 长度降（更具体优先）
    all.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // 3. 选胜者（位置不重叠 + 最具体）
    const covered = new Uint8Array(text.length);
    const kept = [];
    for (const item of all) {
      let occupied = false;
      for (let i = item.start; i < item.end; i++) { if (covered[i]) { occupied = true; break; } }
      if (occupied) continue;
      for (let i = item.start; i < item.end; i++) covered[i] = 1;
      kept.push(item);
    }

    // 4. 仅对启用规则做 mask；未启用者原样保留
    const out = [];
    let cursor = 0;
    const changes = [];
    let appliedCount = 0;
    for (const item of kept) {
      if (item.start > cursor) out.push(text.slice(cursor, item.start));
      if (ids.has(item.rule.id)) {
        const masked = item.rule.mask(item.match, item.meta || {});
        out.push(masked);
        changes.push({ rule: item.rule.label, original: item.match, masked });
        appliedCount++;
      } else {
        out.push(item.match); // 规则未启用 → 原样
      }
      cursor = item.end;
    }
    if (cursor < text.length) out.push(text.slice(cursor));

    return { value: out.join(''), count: appliedCount, changes };
  }

  // JSON 模式：遍历字段值，按字段名选择规则
  function maskJsonString(jsonStr, enabledIds, fieldRules) {
    let obj;
    try { obj = JSON.parse(jsonStr); } catch (e) { return { error: 'JSON 解析失败：' + e.message }; }
    const ids = new Set(enabledIds);
    const hits = { count: 0, changes: [] };

    const FIELD_HINTS = {
      phone: ['phone', 'mobile', 'tel', '电话', '手机'],
      idcard: ['idcard', 'idNo', 'id_no', '身份证', '证件号'],
      hkid: ['hkid', '香港身份证'],
      email: ['email', 'mail', '邮箱', '邮件'],
      bank: ['bank', 'cardNo', 'card_no', '卡号', '银行卡'],
      ip: ['ip', 'ipAddress', 'ip_address', 'ip地址'],
      name_cn: ['name', 'userName', 'user_name', '姓名', '名字'],
      address: ['address', 'addr', '地址']
    };

    function walk(o, path) {
      if (o === null || o === undefined) return o;
      if (Array.isArray(o)) return o.map((v, i) => walk(v, path + '[' + i + ']'));
      if (typeof o === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(o)) {
          out[k] = walk(v, path ? path + '.' + k : k);
        }
        return out;
      }
      if (typeof o !== 'string') return o;

      const lowerK = (path.split('.').pop() || '').toLowerCase();
      // 命中 hint 的规则集合（必须 id 属于 ids）
      const hintedIds = new Set();
      for (const rid of Object.keys(FIELD_HINTS)) {
        if (!ids.has(rid)) continue;
        if (FIELD_HINTS[rid].some(h => lowerK.includes(h.toLowerCase()))) {
          hintedIds.add(rid);
        }
      }

      // 对本字段值只应用：
      //   a) 非 jsonOnlyField 的启用规则（全量跑）+
      //   b) jsonOnlyField 白名单里且命中 hint 的（只在 name 字段下脱敏 name）
      const runIds = [];
      for (const rid of ids) {
        const rule = RULES.find(r => r.id === rid);
        if (!rule) continue;
        if (rule.jsonOnlyField && !hintedIds.has(rid)) continue; // 规则有字段白名单但当前字段没命中 → 跳过
        runIds.push(rid);
      }

      if (runIds.length === 0) return o;

      const consumed = maskText(o, runIds);
      if (consumed.count > 0) {
        consumed.changes.forEach(c => hits.changes.push({ ...c, path }));
        hits.count += consumed.count;
        return consumed.value;
      }
      return o;
    }

    const masked = walk(obj, '');
    return { value: JSON.stringify(masked, null, 2), ...hits };
  }

  // CSV 模式：简单按列遍历
  function maskCsvString(csvStr, enabledIds) {
    const ids = new Set(enabledIds);
    const lines = csvStr.split(/\r?\n/).filter(l => l.length);
    if (lines.length === 0) return { value: '', count: 0 };

    // 简单 CSV 解析（不处理引号内嵌逗号）
    const out = [];
    let total = 0;
    const changes = [];
    for (const line of lines) {
      const cells = line.split(',');
      const newCells = cells.map((cell) => {
        // 位置消费制统一入口
        const r = maskText(cell, [...ids]);
        if (r.count > 0) {
          r.changes.forEach(c => changes.push(c));
          total += r.count;
          return r.value;
        }
        return cell;
      });
      out.push(newCells.join(','));
    }
    return { value: out.join('\n'), count: total, changes };
  }

  // -------- 反向：对已脱敏文本做规则校验 --------
  function validateMaskedText(text) {
    const results = [];
    const ids = ['phone', 'tel', 'idcard', 'hkid', 'email', 'bank', 'ip'];
    for (const rid of ids) {
      const rule = RULES.find(r => r.id === rid);
      if (!rule || !rule.validate) continue;
      if (!rule.regex.global) rule.regex = new RegExp(rule.regex.source, 'g');
      const matches = text.match(rule.regex) || [];
      for (const m of matches) {
        // 如果是掩码形式（含 * ），跳过
        if (m.includes('*') || m.includes('****')) continue;
        const ok = rule.validate(m);
        results.push({ rule: rule.label, value: m, valid: ok });
      }
    }
    return results;
  }

  window.MynaDataMask = {
    maskText, maskJsonString, maskCsvString, validateMaskedText, RULES,
    DEFAULT_CONFIG, getConfig: () => ({ ...RULE_CONFIG }), applyRuleCustomConfig
  };
  const M = window.MynaDataMask;

  // ========== 渲染 ==========
  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <!-- 模式切换 -->
      <div class="dm-modes">
        <button class="dm-mode-btn active" data-mode="text">纯文本</button>
        <button class="dm-mode-btn" data-mode="json">JSON</button>
        <button class="dm-mode-btn" data-mode="csv">CSV</button>
      </div>

      <!-- 规则选择 -->
      <div class="dm-section">
        <div class="dm-section-head">
          <span class="dm-section-title">脱敏规则</span>
          <div class="dm-toolbar">
            <button class="btn tiny" id="dmSelectAll">全选</button>
            <button class="btn tiny" id="dmClearAll">清空</button>
          </div>
        </div>
        <div class="dm-rules" id="dmRules"></div>
      </div>

      <!-- 输入 -->
      <div class="dm-section">
        <div class="dm-section-head">
          <span class="dm-section-title">原始数据</span>
          <div class="dm-toolbar">
            <button class="btn tiny" id="dmLoadSample">📋 示例</button>
            <button class="btn tiny" id="dmClear">清空</button>
          </div>
        </div>
        <textarea id="dmInput" class="dm-input" rows="7" placeholder="把要脱敏的文本/JSON/CSV 粘进来"></textarea>
      </div>

      <!-- 操作 -->
      <div class="dm-actions">
        <button class="btn primary" id="dmRun">▶ 脱敏</button>
        <button class="btn" id="dmValidate">✓ 反向校验</button>
      </div>

      <!-- 输出 -->
      <div class="dm-section">
        <div class="dm-section-head">
          <span class="dm-section-title">
            结果
            <span class="dm-stat" id="dmStat"></span>
          </span>
          <div class="dm-toolbar">
            <button class="btn tiny" id="dmCopy">📋 复制</button>
          </div>
        </div>
        <textarea id="dmOutput" class="dm-output" rows="7" readonly placeholder="结果会显示在这里"></textarea>
        <!-- 变更详情 -->
        <div class="dm-diff" id="dmDiff" style="display:none;"></div>
        <!-- 校验结果 -->
        <div class="dm-validate" id="dmValidatePanel" style="display:none;"></div>
      </div>
    `;
  }

  // 刷新规则描述（applyRuleCustomConfig 后）
  function refreshRuleDescs(rulesEl) {
    rulesEl.querySelectorAll('.dm-rule').forEach((label) => {
      const cb = label.querySelector('input');
      const rid = cb.value;
      const rule = RULES.find(r => r.id === rid);
      if (!rule) return;
      const descEl = label.querySelector('.dm-rule-desc');
      descEl.textContent = (typeof rule.describe === 'function' ? rule.describe() : rule.describe) + (rule.validate ? ' · ✓可校验' : '');
    });
  }

  // 单规则参数弹窗
  function openRuleConfigModal(rootEl, ruleId) {
    const rule = RULES.find(r => r.id === ruleId);
    if (!rule) return;
    const cfg = M.getConfig()[ruleId] || M.DEFAULT_CONFIG[ruleId];

    // 弹窗容器（挂在 body 上，因为 overlay 需要全屏）
    const overlay = document.createElement('div');
    overlay.className = 'dm-modal-overlay';
    overlay.innerHTML = `
      <div class="dm-modal" role="dialog">
        <div class="dm-modal-head">
          <span>⚙ ${rule.label} · 自定义参数</span>
          <button class="dm-modal-close" aria-label="关闭">✕</button>
        </div>
        <div class="dm-modal-body">
          <div class="dm-modal-row">
            <label>前 N 位保留</label>
            <input type="number" min="0" max="30" value="${cfg.first}" data-key="first">
          </div>
          <div class="dm-modal-row">
            <label>后 N 位保留</label>
            <input type="number" min="0" max="30" value="${cfg.last}" data-key="last">
          </div>
          <div class="dm-modal-row">
            <label>替换字符</label>
            <input type="text" maxlength="1" value="${cfg.char}" data-key="char">
          </div>
          <div class="dm-modal-row dm-modal-demo">
            <label>预览</label>
            <span class="dm-modal-demo-out" id="dmDemo"></span>
          </div>
          <div class="dm-modal-tip">提示：IP 地址规则固定 mask 最后一段；地址规则自动识别"省市区镇"停点，参数作用于停点后的剩余部分。</div>
        </div>
        <div class="dm-modal-foot">
          <button class="btn tiny" id="dmReset">还原默认</button>
          <button class="btn" id="dmCancel">取消</button>
          <button class="btn primary" id="dmSave">保存</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const inputs = overlay.querySelectorAll('[data-key]');
    const demoEl = overlay.querySelector('#dmDemo');

    function refreshDemo() {
      const tmpCfg = {
        ...cfg,
        first: parseInt(overlay.querySelector('[data-key="first"]').value, 10) || 0,
        last: parseInt(overlay.querySelector('[data-key="last"]').value, 10) || 0,
        char: overlay.querySelector('[data-key="char"]').value || '*'
      };
      // 临时 apply 看下效果
      const originalConfig = M.getConfig();
      M.applyRuleCustomConfig({ ...originalConfig, [ruleId]: tmpCfg });
      // 找一个样例
      const samples = {
        phone: '13812348000', tel: '0755-12345678', idcard: '610104199001011234',
        hkid: 'A123456(7)', email: 'zhangsan.demo@example.com',
        bank: '6222021234567890123', ip: '192.168.1.100',
        name_cn: '张三', address: '广东省深圳市南山区科技园'
      };
      const out = rule.mask(samples[ruleId] || 'abcdefgh');
      M.applyRuleCustomConfig(originalConfig);
      demoEl.textContent = out;
    }
    refreshDemo();
    inputs.forEach(i => i.addEventListener('input', refreshDemo));

    overlay.querySelector('.dm-modal-close').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#dmCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#dmReset').addEventListener('click', () => {
      const d = M.DEFAULT_CONFIG[ruleId];
      overlay.querySelector('[data-key="first"]').value = d.first;
      overlay.querySelector('[data-key="last"]').value = d.last;
      overlay.querySelector('[data-key="char"]').value = d.char;
      refreshDemo();
    });

    overlay.querySelector('#dmSave').addEventListener('click', () => {
      const current = M.getConfig();
      const merged = {
        ...current,
        [ruleId]: {
          first: Math.max(0, parseInt(overlay.querySelector('[data-key="first"]').value, 10) || 0),
          last: Math.max(0, parseInt(overlay.querySelector('[data-key="last"]').value, 10) || 0),
          char: overlay.querySelector('[data-key="char"]').value || '*'
        }
      };
      M.applyRuleCustomConfig(merged);
      chrome.storage.local.set({ dmRuleConfig: merged });
      refreshRuleDescs(rootEl.querySelector('#dmRules'));
      overlay.remove();
      if (window.MynaUtils) window.MynaUtils.flashMessage('✓ 已保存，规则描述已更新');
    });
  }

  function mount(context) {
    const c = context.container;
    let currentMode = 'text';

    // 规则列表
    const rulesEl = c.querySelector('#dmRules');
    RULES.forEach((rule, idx) => {
      const label = document.createElement('label');
      label.className = 'dm-rule';
      label.innerHTML = `
        <input type="checkbox" value="${rule.id}" ${rule.id === 'name_cn' || rule.id === 'address' ? '' : 'checked'}>
        <span class="dm-rule-name">${rule.label}</span>
        <span class="dm-rule-desc">${typeof rule.describe === 'function' ? rule.describe() : rule.describe}${rule.validate ? ' · ✓可校验' : ''}</span>
        <span class="dm-rule-config" role="button" tabindex="0" title="自定义参数" data-rule="${rule.id}">⚙</span>
      `;
      // 点到 ⚙ 或它的子元素时阻止 label 的 checkbox toggle 默认行为
      label.addEventListener('click', (e) => {
        if (e.target.closest('.dm-rule-config')) e.preventDefault();
      });
      rulesEl.appendChild(label);
    });

    // 恢复上次自定义配置
    chrome.storage.local.get(['dmRuleConfig'], (res) => {
      if (res.dmRuleConfig && typeof res.dmRuleConfig === 'object') {
        M.applyRuleCustomConfig(res.dmRuleConfig);
        refreshRuleDescs(rulesEl);
      }
    });

    // 规则列表上的 ⚙ 按钮 → 弹窗编辑
    rulesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.dm-rule-config');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openRuleConfigModal(c, btn.dataset.rule);
    });
    // 键盘 Enter/Space 触发（role="button" tabindex="0" 后）
    rulesEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const btn = e.target.closest('.dm-rule-config');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openRuleConfigModal(c, btn.dataset.rule);
    });

    // 模式切换
    c.querySelectorAll('.dm-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        c.querySelectorAll('.dm-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
      });
    });

    // 全选 / 清空
    c.querySelector('#dmSelectAll').addEventListener('click', () => {
      c.querySelectorAll('#dmRules input').forEach(cb => cb.checked = true);
    });
    c.querySelector('#dmClearAll').addEventListener('click', () => {
      c.querySelectorAll('#dmRules input').forEach(cb => cb.checked = false);
    });

    // 示例
    c.querySelector('#dmLoadSample').addEventListener('click', () => {
      const samples = {
        text: [
          '用户 张三 手机号 13812348000，身份证 610104199001011234',
          '联系邮箱 zhangsan.demo@example.com',
          '办公电话 0755-12345678，IP 192.168.1.100',
          '银行卡 6222021234567890123'
        ].join('\n'),
        json: JSON.stringify({
          name: '张三',
          phone: '13812348000',
          idcard: '610104199001011234',
          email: 'zhangsan.demo@example.com',
          bank: '6222021234567890123',
          address: '广东省深圳市南山区科技园南区10栋3单元501',
          ip: '192.168.1.100'
        }, null, 2),
        csv: 'name,phone,email,idcard\n张三,13812348000,zhangsan.demo@example.com,610104199001011234\n李四,13900001111,lisi@test.com,110101199503031234'
      };
      c.querySelector('#dmInput').value = samples[currentMode];
      flashMessage('✓ 已加载示例');
    });

    c.querySelector('#dmClear').addEventListener('click', () => {
      c.querySelector('#dmInput').value = '';
      c.querySelector('#dmOutput').value = '';
      c.querySelector('#dmStat').textContent = '';
      c.querySelector('#dmDiff').style.display = 'none';
      c.querySelector('#dmValidatePanel').style.display = 'none';
    });

    c.querySelector('#dmRun').addEventListener('click', () => runMask(c, currentMode));
    c.querySelector('#dmValidate').addEventListener('click', () => runValidate(c));

    c.querySelector('#dmCopy').addEventListener('click', () => {
      const out = c.querySelector('#dmOutput').value;
      if (!out) { flashMessage('暂无结果', true); return; }
      navigator.clipboard?.writeText(out).then(
        () => flashMessage('✓ 已复制'),
        () => flashMessage('复制失败', true)
      );
    });

    return () => {};
  }

  function getEnabledIds(c) {
    const ids = [];
    c.querySelectorAll('#dmRules input:checked').forEach(cb => ids.push(cb.value));
    return ids;
  }

  function runMask(c, mode) {
    const text = c.querySelector('#dmInput').value;
    const ids = getEnabledIds(c);
    if (!ids.length) { flashMessage('请至少勾选一条规则', true); return; }
    if (!text.trim()) { flashMessage('请输入待处理数据', true); return; }

    let result;
    if (mode === 'json') result = window.MynaDataMask.maskJsonString(text, ids);
    else if (mode === 'csv') result = window.MynaDataMask.maskCsvString(text, ids);
    else result = window.MynaDataMask.maskText(text, ids);

    if (result.error) {
      c.querySelector('#dmOutput').value = '';
      c.querySelector('#dmStat').textContent = '';
      flashMessage(result.error, true);
      return;
    }

    c.querySelector('#dmOutput').value = result.value;
    c.querySelector('#dmStat').textContent = result.count ? `· 命中 ${result.count} 处` : '';

    // 变更 diff
    const diffEl = c.querySelector('#dmDiff');
    if (result.changes && result.changes.length) {
      diffEl.style.display = 'block';
      diffEl.innerHTML = `
        <div class="dm-diff-title">变更详情（前 50 条）</div>
        <div class="dm-diff-list">
          ${result.changes.slice(0, 50).map(ch => `
            <div class="dm-diff-row">
              <span class="dm-diff-rule">${escapeHtml(ch.rule)}</span>
              <span class="dm-diff-from">${escapeHtml(ch.original)}</span>
              <span class="dm-diff-arrow">→</span>
              <span class="dm-diff-to">${escapeHtml(ch.masked)}</span>
              ${ch.path ? `<span class="dm-diff-path">${escapeHtml(ch.path)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    } else {
      diffEl.style.display = 'none';
    }

    c.querySelector('#dmValidatePanel').style.display = 'none';
    flashMessage(result.count ? `✓ 脱敏完成，命中 ${result.count} 处` : '未命中敏感信息');
  }

  function runValidate(c) {
    const text = c.querySelector('#dmInput').value;
    if (!text.trim()) { flashMessage('请输入待校验文本', true); return; }

    // 先解析 JSON 拿到全部字符串
    let targets = [];
    try {
      const obj = JSON.parse(text);
      // 遍历收集所有字符串
      function collect(o) {
        if (typeof o === 'string') { targets.push(o); return; }
        if (Array.isArray(o)) o.forEach(collect);
        else if (o && typeof o === 'object') Object.values(o).forEach(collect);
      }
      collect(obj);
    } catch {
      // 纯文本
      targets = [text];
    }

    const all = targets.join('\n');
    const results = window.MynaDataMask.validateMaskedText(all);
    const panel = c.querySelector('#dmValidatePanel');

    if (results.length === 0) {
      panel.style.display = 'block';
      panel.innerHTML = `
        <div class="dm-validate-title">✓ 校验结果</div>
        <div class="dm-validate-ok">未发现可校验的敏感明文（可能已全部脱敏）</div>
      `;
    } else {
      const okCount = results.filter(r => r.valid).length;
      const badCount = results.length - okCount;
      panel.style.display = 'block';
      panel.innerHTML = `
        <div class="dm-validate-title">
          ✓ 校验结果
          <span class="dm-validate-stat">共 ${results.length} 条明文 · 合法 <span class="dm-ok">${okCount}</span> · 疑似 <span class="dm-bad">${badCount}</span></span>
        </div>
        <div class="dm-validate-list">
          ${results.map(r => `
            <div class="dm-validate-row ${r.valid ? 'ok' : 'bad'}">
              <span class="dm-diff-rule">${escapeHtml(r.rule)}</span>
              <span class="dm-diff-from">${escapeHtml(r.value)}</span>
              <span class="dm-flag">${r.valid ? '✓ 合法' : '✗ 疑似无效'}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

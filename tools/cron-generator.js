// tools/cron-generator.js — Cron 表达式生成/校验/预测（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  // ========== Cron 引擎（自实现，无依赖） ==========
  // 支持 Linux 5 段 + 带秒的 6 段 + 带年的 7 段
  // 字段顺序: [秒] 分 时 日 月 [周] [年]
  const RANGES = [
    { name: 'second', min: 0, max: 59, preset: '*', label: '秒' },
    { name: 'minute', min: 0, max: 59, preset: '*', label: '分钟' },
    { name: 'hour',   min: 0, max: 23, preset: '*', label: '小时' },
    { name: 'day',    min: 1, max: 31, preset: '*', label: '日' },
    { name: 'month',  min: 1, max: 12, preset: '*', label: '月' },
    { name: 'dow',    min: 0, max: 7,  preset: '*', label: '周' },   // 0 和 7 都是周日
    { name: 'year',   min: 1970, max: 2099, preset: '*', label: '年' },
  ];
  const MONTH_NAMES = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const DOW_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function parseCron(expr) {
    if (!expr || typeof expr !== 'string') return { ok: false, error: '表达式为空' };
    const parts = expr.trim().split(/\s+/);
    let offset = 0;
    let allowDow = true;
    let allowDay = true;
    let useSecond = false;
    let useYear = false;

    // 判断段数
    if (parts.length === 5) {
      // Linux / Quartz 无秒
    } else if (parts.length === 6) {
      // Quartz 默认带秒
      useSecond = true;
    } else if (parts.length === 7) {
      // Quartz 带秒 + 带年
      useSecond = true;
      useYear = true;
    } else {
      return { ok: false, error: `段数错误：需要 5/6/7 段，实际 ${parts.length}` };
    }

    const startIdx = useSecond ? 0 : 1;
    const fields = {};
    const fieldRange = [
      useSecond ? RANGES[0] : null,
      RANGES[1], RANGES[2], RANGES[3], RANGES[4],
      RANGES[5],
      useYear ? RANGES[6] : null,
    ].filter(Boolean);

    for (let i = 0; i < parts.length; i++) {
      const range = fieldRange[i];
      if (!range) continue;
      const token = parts[i];
      // 支持 L/W/#/? 等扩展语法
      if (token === '?' && (range.name === 'day' || range.name === 'dow')) {
        fields[range.name] = { type: 'wildcard', values: new Set(), raw: token };
        if (range.name === 'day') allowDay = false; else allowDow = false;
        continue;
      }
      if (token === 'L') { fields[range.name] = { type: 'L', values: new Set([-1]), raw: token }; continue; }
      if (token.startsWith('L-')) { fields[range.name] = { type: 'L-offset', offset: parseInt(token.slice(2),10), values: new Set([-1]), raw: token }; continue; }
      if (token.endsWith('W')) { fields[range.name] = { type: 'W', values: new Set(), raw: token }; continue; }
      if (token.includes('#')) { fields[range.name] = { type: 'hash', raw: token, values: new Set(), nth: parseInt(token.split('#')[0],10), dow: parseInt(token.split('#')[1],10) }; continue; }

      const vals = new Set();
      const pieces = token.split(',');
      for (const p of pieces) {
        if (p === '*') { for (let v = range.min; v <= range.max; v++) vals.add(v); continue; }
        if (p.startsWith('*/')) {
          const step = parseInt(p.slice(2), 10);
          if (isNaN(step) || step <= 0) return { ok: false, error: `${range.label} 步进 ${p.slice(2)} 无效` };
          for (let v = range.min; v <= range.max; v += step) vals.add(v);
          continue;
        }
        if (p.includes('/')) {
          const [base, stepStr] = p.split('/');
          const step = parseInt(stepStr, 10);
          if (isNaN(step) || step <= 0) return { ok: false, error: `${range.label} 步进无效` };
          let start = range.min;
          if (base !== '*') {
            if (base.includes('-')) { const [a, b] = base.split('-').map(Number); start = a; for (let v = a; v <= b; v += step) vals.add(v); continue; }
            start = parseInt(base, 10);
            if (isNaN(start)) return { ok: false, error: `${range.label} 值 ${base} 无效` };
          }
          for (let v = start; v <= range.max; v += step) vals.add(v);
          continue;
        }
        if (p.includes('-')) {
          const [a, b] = p.split('-').map(Number);
          if (isNaN(a) || isNaN(b)) return { ok: false, error: `${range.label} 范围 ${p} 无效` };
          for (let v = a; v <= b; v++) vals.add(v);
          continue;
        }
        const n = parseInt(p, 10);
        if (isNaN(n)) return { ok: false, error: `${range.label} 值 ${p} 不是数字` };
        if (n < range.min || n > range.max) return { ok: false, error: `${range.label} ${n} 超出范围 [${range.min}-${range.max}]` };
        vals.add(n);
      }
      fields[range.name] = { type: 'list', values: vals, raw: token };
    }

    return { ok: true, fields, useSecond, useYear, parts, offset, allowDow, allowDay };
  }

  // 生成接下来 N 次执行时间（最多迭代 10 年避免无限循环）
  function nextExecutions(expr, count = 5, from = new Date()) {
    const parsed = parseCron(expr);
    if (!parsed.ok) return { ok: false, error: parsed.error, next: [] };
    const result = [];
    let d = new Date(from.getTime() + (parsed.useSecond ? 1000 : 60000));
    d.setMilliseconds(0);
    const deadline = new Date(d.getTime() + 366 * 10 * 24 * 3600 * 1000);
    const secStep = parsed.useSecond ? 1 : 60;
    while (result.length < count && d <= deadline) {
      const checkSecond = parsed.useSecond ? d.getSeconds() : 0;
      const checkFields = [
        { name: 'second', v: checkSecond },
        { name: 'minute', v: d.getMinutes() },
        { name: 'hour',   v: d.getHours() },
        { name: 'day',    v: d.getDate() },
        { name: 'month',  v: d.getMonth() + 1 },
        { name: 'dow',    v: d.getDay() },
        { name: 'year',   v: d.getFullYear() },
      ];
      let hit = true;
      for (const cf of checkFields) {
        const f = parsed.fields[cf.name];
        if (!f) continue;
        if (f.type === 'wildcard') continue;
        if (f.values.has(cf.v)) continue;
        if (cf.name === 'day') {
          if (f.type === 'L') { hit = cf.v === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); if (!hit) break; continue; }
          if (f.type === 'W') { hit = isWeekday(d); if (!hit) break; continue; }
        }
        if (cf.name === 'dow' && f.type === 'hash') {
          // 简化：跳过 hash 计算
        }
        hit = false; break;
      }
      if (hit) { result.push(new Date(d)); }
      d = new Date(d.getTime() + secStep * 1000);
      if (!parsed.useSecond) { d.setSeconds(0, 0); }
    }
    return { ok: true, next: result, useSecond: parsed.useSecond };
  }

  function isWeekday(d) {
    const dw = d.getDay(); return dw >= 1 && dw <= 5;
  }

  // 自然语言描述（中文）
  function describeCron(expr) {
    const p = parseCron(expr);
    if (!p.ok) return { ok: false, error: p.error };
    const f = p.fields;
    let s = '';

    // 时间粒度
    const sec = f.second?.values;
    const minVals = f.minute?.values;
    const hrVals = f.hour?.values;
    const dayVals = f.day?.values;
    const dowVals = f.dow?.values;
    const monVals = f.month?.values;

    const fmtVals = (vals) => {
      if (vals.size === RANGES[0].max - RANGES[0].min + 1 || vals.size === RANGES[1].max - RANGES[1].min + 1 || vals.size === RANGES[2].max - RANGES[2].min + 1 || vals.size === RANGES[3].max - RANGES[3].min + 1 || vals.size === RANGES[4].max - RANGES[4].min + 1) return null;
      return [...vals].sort((a,b)=>a-b);
    };

    // 秒
    if (sec) {
      const sv = fmtVals(sec);
      if (!sv) s += '每秒';
      else s += `在第 ${sv.join(',')} 秒`;
    }

    // 月
    if (monVals) {
      const mv = fmtVals(monVals);
      if (mv) s += `在 ${mv.map(v => MONTH_NAMES[v]).join('、')}`;
    }

    // 日 / 周
    const dayWild = !dayVals || dayVals.size === 31;
    const dowWild = !dowVals || dowVals.size === 7;
    if (!dayWild && !dowWild) {
      const dv = fmtVals(dayVals);
      const wv = fmtVals(dowVals);
      if (dv) s += `在每月 ${dv.join('/')} 日`;
      if (wv) s += `${wv.map(v => DOW_NAMES[v]).join('、')}`;
    } else if (!dayWild) {
      const dv = fmtVals(dayVals);
      if (dv) s += `每月 ${dv.join('/')} 日`;
    } else if (!dowWild) {
      const wv = fmtVals(dowVals);
      if (wv) s += `每周 ${wv.map(v => DOW_NAMES[v]).join('、')}`;
    } else {
      s += '每天';
    }

    // 小时 / 分钟
    if (hrVals && fmtVals(hrVals)) {
      const hv = fmtVals(hrVals);
      s += `${hv.join(':')} 时`;
    }
    if (minVals && fmtVals(minVals)) {
      const mv = fmtVals(minVals);
      if (mv) s += `${mv.join(':')} 分`;
    } else if (!minVals || minVals.size === 60) {
      s += ' 每分钟';
    }

    // 常见模式识别
    const raw = expr.trim();
    const common = identifyCommon(raw);
    if (common) s = common;

    return { ok: true, desc: s.trim() };
  }

  function identifyCommon(raw) {
    // 标准 5/6/7 段拆分
    const parts = raw.trim().split(/\s+/);
    const hasSec = parts.length >= 6 && parts.length <= 7;
    const hasYear = parts.length === 7;
    const p = hasSec ? parts : ['*', ...parts]; // 补足秒位便于比较

    const patterns = [
      { key: '0 0 * * * ?', match: () => p[0]==='0' && p[1]==='0' && p[2]==='*' && p[3]==='*' && p[4]==='*' && p[5]==='?', desc: '每天 00:00 执行' },
      { key: '0 0 * * ? *', match: () => p[0]==='0' && p[1]==='0' && p[2]==='*' && p[3]==='*' && p[4]==='?' && p[5]==='*', desc: '每天 00:00 执行' },
      { key: '0 */5 * * * ?', match: () => p[1]==='*/5', desc: '每 5 分钟执行' },
      { key: '0 0/15 * * * ?', match: () => p[1]==='0/15', desc: '每 15 分钟执行' },
      { key: '0 0 */1 * * ?', match: () => p[2]==='*/1', desc: '每小时整点执行' },
      { key: '0 0 8 * * ?', match: () => p[1]==='0' && p[2]==='8', desc: '每天 08:00 执行' },
      { key: '0 0 0 ? * MON', match: () => p[0]==='0' && p[1]==='0' && p[2]==='0' && p[3]==='?' && p[5]==='2', desc: '每周一 00:00 执行' },
      { key: '0 0 0 1 * ?', match: () => p[0]==='0' && p[1]==='0' && p[2]==='0' && p[3]==='1', desc: '每月 1 日 00:00 执行' },
      { key: '0 0 12 ? * FRI', match: () => p[1]==='0' && p[2]==='12' && p[5]==='5', desc: '每周五 12:00 执行' },
    ];
    for (const pt of patterns) if (pt.match()) return pt.desc;
    return null;
  }

  // ========== Cron 构造器（可视化生成）==========
  function buildCron(opts) {
    // opts: { second, minute, hour, day, month, dow, secondStep, minuteStep, hourStep, dayStep, monthStep, dowStep, useSecond, useYear, year, yearStep }
    const buildSegment = (val, step, rangeMin, rangeMax, useStar) => {
      if (useStar) return '*';
      if (step && step > 1 && val === rangeMin) return `*/${step}`;
      if (step && step > 1) return `${val}/${step}`;
      return String(val);
    };

    const hasStep = opts.mode === 'every';
    const everySecond = opts.unit === 'second' || hasStep && opts.everyEvery === 'second';
    const everyMinute = opts.unit === 'minute' || hasStep && opts.everyEvery === 'minute';
    const everyHour = opts.unit === 'hour' || hasStep && opts.everyEvery === 'hour';
    const everyDay = opts.unit === 'day' || hasStep && opts.everyEvery === 'day';
    const everyMonth = opts.unit === 'month' || hasStep && opts.everyEvery === 'month';
    const everyDow = opts.unit === 'dow' || hasStep && opts.everyEvery === 'dow';

    let sec = '*', min = '*', hr = '*', day = '*', mon = '*', dow = '?', year = '*';
    let useSecond = opts.useSecond !== false;

    if (hasStep) {
      // 每 N 秒/分/时/天执行
      const step = opts.step || 1;
      if (opts.everyEvery === 'second') { sec = `*/${step}`; min = '*'; hr = '*'; day = '*'; mon = '*'; dow = '?'; useSecond = true; }
      else if (opts.everyEvery === 'minute') { sec = '0'; min = `*/${step}`; hr = '*'; day = '*'; mon = '*'; dow = '?'; }
      else if (opts.everyEvery === 'hour') { sec = '0'; min = '0'; hr = `*/${step}`; day = '*'; mon = '*'; dow = '?'; }
      else if (opts.everyEvery === 'day') { sec = '0'; min = '0'; hr = '0'; day = `*/${step}`; mon = '*'; dow = '?'; }
      else if (opts.everyEvery === 'dow') { sec = '0'; min = '0'; hr = '0'; day = '?'; mon = '*'; dow = opts.dowList ? opts.dowList.join(',') : '*'; }
    } else if (opts.mode === 'once') {
      // 单次执行（每天某时间）
      sec = '0'; min = opts.onceMinute ?? 0; hr = opts.onceHour ?? 9; day = '*'; mon = '*'; dow = '?';
    } else if (opts.mode === 'weekdays') {
      // 工作日 / 周末 每天某时间
      sec = '0'; min = opts.onceMinute ?? 9; hr = opts.onceHour ?? 9;
      if (opts.weekdaysType === 'workday') { day = '?'; mon = '*'; dow = '1-5'; }
      else { day = '?'; mon = '*'; dow = '0,6'; }
    } else if (opts.mode === 'monthly') {
      // 每月某号某时间
      sec = '0'; min = opts.onceMinute ?? 0; hr = opts.onceHour ?? 0; day = opts.monthDay ?? 1; mon = '*'; dow = '?';
    } else if (opts.mode === 'yearly') {
      // 每年某月某日
      sec = '0'; min = opts.onceMinute ?? 0; hr = opts.onceHour ?? 0; day = opts.monthDay ?? 1; mon = opts.monthMonth ?? 1; dow = '?';
    } else if (opts.mode === 'custom') {
      // 自定义六段
      sec = opts.second ?? '*'; min = opts.minute ?? '*'; hr = opts.hour ?? '*';
      day = opts.day ?? '*'; mon = opts.month ?? '*'; dow = opts.dow ?? '?';
    }

    const parts = useSecond ? [sec, min, hr, day, mon, dow] : [min, hr, day, mon, dow];
    return parts.join(' ');
  }

  // ========== UI 工具函数 ==========
  function _pad(n, l) { return String(n).padStart(l, '0'); }
  function _fmt(d) { return `${d.getFullYear()}-${_pad(d.getMonth()+1,2)}-${_pad(d.getDate(),2)} ${_pad(d.getHours(),2)}:${_pad(d.getMinutes(),2)}:${_pad(d.getSeconds(),2)}`; }

  // ========== 主对象 ==========
  const tool = {
    meta: { id: 'cron-generator', name: 'Cron 表达式', desc: '生成/校验 Cron 表达式，预测未来执行时间', icon: '⏱️', iconUrl: 'icons/cron-generator.png', category: 'data-tool', categoryName: '数据工具' },
    _currentCron: '0 0 9 * * ?',
    _currentMode: 'once',
    _useSecond: true,

    render(root) {
      const months = Array.from({length:12}, (_,i) => `<option value="${i+1}">${MONTH_NAMES[i+1]}</option>`).join('');
      const hrs = Array.from({length:24}, (_,i) => `<option value="${i}">${_pad(i,2)}</option>`).join('');
      const mins = Array.from({length:60}, (_,i) => `<option value="${i}">${_pad(i,2)}</option>`).join('');
      const dowChk = (v) => v === 0 ? 'checked' : '';

      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${this.meta.iconUrl}" alt="${this.meta.name}"> ${this.meta.name}</h2></div>

          <!-- 可视化生成器 -->
          <div class="ug-section">
            <div class="ug-section-title">🛠️ 生成器</div>
            <div class="ug-section-sub">
              <div class="cr-row">
                <label class="ug-label">模式</label>
                <select id="crMode" class="ug-select" style="flex:none">
                  <option value="every">每隔 N 次</option>
                  <option value="once" selected>每天某时间</option>
                  <option value="weekdays">工作日/周末</option>
                  <option value="monthly">每月某日</option>
                  <option value="yearly">每年某月某日</option>
                  <option value="custom">自定义六段</option>
                </select>
                <label class="ug-label" style="margin-left:8px">格式</label>
                <select id="crFormat" class="ug-select" style="flex:none">
                  <option value="quartz" selected>Quartz (6段)</option>
                  <option value="linux">Linux (5段)</option>
                </select>
              </div>

              <!-- 每隔 N -->
              <div class="cr-block" data-mode="every" style="display:none">
                <div class="cr-row">
                  <label class="ug-label">每</label>
                  <input id="crEveryStep" type="number" min="1" max="59" value="5" class="ug-input" style="width:60px">
                  <select id="crEveryUnit" class="ug-select" style="flex:none">
                    <option value="second">秒</option>
                    <option value="minute" selected>分钟</option>
                    <option value="hour">小时</option>
                    <option value="day">天</option>
                  </select>
                </div>
              </div>

              <!-- 每天某时间 -->
              <div class="cr-block" data-mode="once">
                <div class="cr-row">
                  <label class="ug-label">每天</label>
                  <select id="crOnceHour" class="ug-select" style="flex:none">${hrs}</select>
                  <label class="ug-label">:</label>
                  <select id="crOnceMinute" class="ug-select" style="flex:none">${mins}</select>
                </div>
              </div>

              <!-- 工作日/周末 -->
              <div class="cr-block" data-mode="weekdays" style="display:none">
                <div class="cr-row">
                  <label class="ug-label">类型</label>
                  <select id="crWDType" class="ug-select" style="flex:none">
                    <option value="workday" selected>工作日（周一至周五）</option>
                    <option value="weekend">周末（周六日）</option>
                    <option value="custom">自定义勾选</option>
                  </select>
                </div>
                <div class="cr-row" id="crWDCustom" style="display:none">
                  <label class="ug-label">周数</label>
                  ${DOW_NAMES.map((n,i) => `<label style="margin-right:4px"><input type="checkbox" class="cr-dow" value="${i}" ${[1,2,3,4,5].includes(i)?'checked':''}>${n}</label>`).join('')}
                </div>
                <div class="cr-row">
                  <label class="ug-label">时间</label>
                  <select id="crWDHour" class="ug-select" style="flex:none">${hrs}</select>
                  <label class="ug-label">:</label>
                  <select id="crWDMinute" class="ug-select" style="flex:none">${mins}</select>
                </div>
              </div>

              <!-- 每月某日 -->
              <div class="cr-block" data-mode="monthly" style="display:none">
                <div class="cr-row">
                  <label class="ug-label">每月</label>
                  <input id="crMonthDay" type="number" min="1" max="31" value="1" class="ug-input" style="width:60px">
                  <label class="ug-label">日</label>
                  <select id="crMonthHour" class="ug-select" style="flex:none">${hrs}</select>
                  <label class="ug-label">:</label>
                  <select id="crMonthMinute" class="ug-select" style="flex:none">${mins}</select>
                </div>
              </div>

              <!-- 每年某月某日 -->
              <div class="cr-block" data-mode="yearly" style="display:none">
                <div class="cr-row">
                  <label class="ug-label">每年</label>
                  <select id="crYearMonth" class="ug-select" style="flex:none">${months}</select>
                  <label class="ug-label">月</label>
                  <input id="crYearDay" type="number" min="1" max="31" value="1" class="ug-input" style="width:60px">
                  <label class="ug-label">日</label>
                  <select id="crYearHour" class="ug-select" style="flex:none">${hrs}</select>
                  <label class="ug-label">:</label>
                  <select id="crYearMinute" class="ug-select" style="flex:none">${mins}</select>
                </div>
              </div>

              <!-- 自定义六段 -->
              <div class="cr-block" data-mode="custom" style="display:none">
                <div class="cr-row">
                  <label class="ug-label">秒</label><input id="crCSecond" type="text" class="ug-input" style="flex:none;width:60px" value="0">
                  <label class="ug-label">分</label><input id="crCMinute" type="text" class="ug-input" style="flex:none;width:60px" value="0">
                  <label class="ug-label">时</label><input id="crCHour" type="text" class="ug-input" style="flex:none;width:60px" value="9">
                  <label class="ug-label">日</label><input id="crCDay" type="text" class="ug-input" style="flex:none;width:60px" value="*">
                  <label class="ug-label">月</label><input id="crCMonth" type="text" class="ug-input" style="flex:none;width:60px" value="*">
                  <label class="ug-label">周</label><input id="crCDow" type="text" class="ug-input" style="flex:none;width:60px" value="?">
                </div>
              </div>

              <div class="cr-actions">
                <button class="ug-btn-primary ug-gen-btn" id="crBuildBtn">生成 Cron</button>
              </div>
            </div>
          </div>

          <!-- 表达式输入 + 校验 -->
          <div class="ug-section">
            <div class="ug-section-title">✍️ 表达式输入</div>
            <div class="cr-expr-row">
              <input id="crExpr" type="text" class="ug-input cr-expr-input" style="flex:1;min-width:220px" value="${this._currentCron}">
              <button id="crRunBtn" class="ug-btn-primary ug-gen-btn">解析</button>
              <button id="crCopyBtn" class="ug-btn-primary ug-gen-btn" style="flex:none">复制</button>
            </div>
            <div id="crNatural" class="cr-natural"></div>
            <div id="crStatus" class="cr-status"></div>
          </div>

          <!-- 预测结果 -->
          <div class="ug-section ug-result-section">
            <div class="ug-section-title">
              <span>📅 未来执行时间</span>
              <span id="crCountLabel" class="ug-count"></span>
            </div>
            <div id="crNext" class="cr-next">
              <div class="ug-empty">点击「解析 + 预测」查看未来执行时间 📅</div>
            </div>
            <div class="ug-copy-bar">
              <button id="crDownloadBtn" class="ug-btn-primary ug-copy-all">📥 下载 CSV</button>
            </div>
          </div>

          <!-- 语法帮助 -->
          <div class="ug-section">
            <div class="ug-section-title" style="cursor:pointer" id="crHelpToggle">📖 语法帮助</div>
            <div id="crHelp" class="cr-help" style="display:none">
              <div class="cr-help-row"><code>*</code> 任意值</div>
              <div class="cr-help-row"><code>?</code> 不指定（日/周 字段，Quartz 专用）</div>
              <div class="cr-help-row"><code>*/N</code> 每隔 N 次（如 <code>*/5</code> 每 5 分钟）</div>
              <div class="cr-help-row"><code>A-B</code> 范围（如 <code>1-5</code> 周一到周五）</div>
              <div class="cr-help-row"><code>A-B/N</code> 范围内每隔 N 次</div>
              <div class="cr-help-row"><code>A,B,C</code> 枚举（如 <code>1,3,5</code>）</div>
              <div class="cr-help-row"><code>L</code> 最后（日字段）</div>
              <div class="cr-help-row"><code>LW</code> 最后一个工作日（日字段）</div>
              <div class="cr-help-row"><code>W</code> 工作日（日字段）</div>
              <div class="cr-help-row"><code>#</code> 第几个星期几（周字段，如 <code>6#3</code> 每月第 3 个周五）</div>
              <div style="margin-top:6px;font-size:11px;color:var(--text-tertiary)">
                Quartz 6段: <code>秒 分 时 日 月 周</code> &nbsp;|&nbsp; Linux 5段: <code>分 时 日 月 周</code>
              </div>
              <div style="margin-top:4px;font-size:11px;color:var(--text-tertiary)">
                周字段: 0/7=周日, 1=周一 … 6=周六
              </div>
            </div>
          </div>
        </div>
      `;
    },

    mount(context) {
      const root = context.container;

      // 模式切换
      const modeSel = root.querySelector('#crMode');
      const blocks = root.querySelectorAll('.cr-block');
      modeSel.addEventListener('change', () => {
        blocks.forEach(b => b.style.display = b.dataset.mode === modeSel.value ? '' : 'none');
      });
      // 工作日自定义勾选
      const wdType = root.querySelector('#crWDType');
      const wdCustom = root.querySelector('#crWDCustom');
      wdType.addEventListener('change', () => { wdCustom.style.display = wdType.value === 'custom' ? '' : 'none'; });

      // 格式化切换
      root.querySelector('#crFormat').addEventListener('change', (e) => {
        this._useSecond = e.target.value === 'quartz';
      });

      // 生成器按钮
      root.querySelector('#crBuildBtn').addEventListener('click', () => {
        const mode = root.querySelector('#crMode').value;
        const useSecond = this._useSecond;
        const opts = { mode, useSecond };
        if (mode === 'every') {
          opts.everyEvery = root.querySelector('#crEveryUnit').value;
          opts.step = parseInt(root.querySelector('#crEveryStep').value, 10);
        } else if (mode === 'once') {
          opts.onceHour = parseInt(root.querySelector('#crOnceHour').value, 10);
          opts.onceMinute = parseInt(root.querySelector('#crOnceMinute').value, 10);
        } else if (mode === 'weekdays') {
          opts.weekdaysType = wdType.value;
          opts.onceHour = parseInt(root.querySelector('#crWDHour').value, 10);
          opts.onceMinute = parseInt(root.querySelector('#crWDMinute').value, 10);
          if (wdType.value === 'custom') {
            const cbs = root.querySelectorAll('.cr-dow:checked');
            opts.dowList = Array.from(cbs).map(c => parseInt(c.value, 10)).sort();
          }
        } else if (mode === 'monthly') {
          opts.monthDay = parseInt(root.querySelector('#crMonthDay').value, 10);
          opts.onceHour = parseInt(root.querySelector('#crMonthHour').value, 10);
          opts.onceMinute = parseInt(root.querySelector('#crMonthMinute').value, 10);
        } else if (mode === 'yearly') {
          opts.monthMonth = parseInt(root.querySelector('#crYearMonth').value, 10);
          opts.monthDay = parseInt(root.querySelector('#crYearDay').value, 10);
          opts.onceHour = parseInt(root.querySelector('#crYearHour').value, 10);
          opts.onceMinute = parseInt(root.querySelector('#crYearMinute').value, 10);
        } else if (mode === 'custom') {
          opts.second = root.querySelector('#crCSecond').value || '*';
          opts.minute = root.querySelector('#crCMinute').value || '*';
          opts.hour = root.querySelector('#crCHour').value || '*';
          opts.day = root.querySelector('#crCDay').value || '*';
          opts.month = root.querySelector('#crCMonth').value || '*';
          opts.dow = root.querySelector('#crCDow').value || '?';
          useSecond = true;
        }
        opts.useSecond = useSecond;

        const expr = buildCron(opts);
        const exprInput = root.querySelector('#crExpr');
        exprInput.value = expr;
        this._currentCron = expr;
        this._runAll(root);
      });

      // 运行按钮
      root.querySelector('#crRunBtn').addEventListener('click', () => this._runAll(root));

      // 复制
      root.querySelector('#crCopyBtn').addEventListener('click', () => {
        const v = root.querySelector('#crExpr').value.trim();
        if (!v) { flashMessage('表达式为空', 'warn'); return; }
        navigator.clipboard.writeText(v).then(() => flashMessage('✓ 已复制', 'success'));
      });

      // 下载
      root.querySelector('#crDownloadBtn').addEventListener('click', () => this._downloadCsv(root));

      // 语法帮助折叠
      root.querySelector('#crHelpToggle').addEventListener('click', () => {
        const h = root.querySelector('#crHelp');
        h.style.display = h.style.display === 'none' ? '' : 'none';
      });

      // 回车触发
      root.querySelector('#crExpr').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._runAll(root);
      });

      // 初始渲染一次
      this._runAll(root);
    },

    _runAll(root) {
      const expr = root.querySelector('#crExpr').value.trim();
      if (!expr) { this._setStatus(root, 'warn', '表达式为空'); return; }
      const count = 20;

      // 校验
      const parsed = parseCron(expr);
      if (!parsed.ok) {
        this._setStatus(root, 'error', `❌ 校验失败：${parsed.error}`);
        root.querySelector('#crNatural').innerHTML = '';
        root.querySelector('#crCountLabel').textContent = '';
        root.querySelector('#crNext').innerHTML = `<div class="cr-next-item cr-next-error">${parsed.error}</div>`;
        return;
      }
      this._setStatus(root, 'ok', parsed.useSecond ? '✅ Quartz 6段（带秒）' : (parsed.parts.length === 7 ? '✅ Quartz 7段（带秒+年）' : '✅ Linux 5段'));

      // 自然语言
      const d = describeCron(expr);
      root.querySelector('#crNatural').innerHTML = d.ok ? `<span class="cr-nat-chip">💡 ${d.desc}</span>` : '';

      // 预测
      const r = nextExecutions(expr, count);
      root.querySelector('#crCountLabel').textContent = `${r.next.length} 次`;
      if (r.ok && r.next.length > 0) {
        const html = r.next.map((t, i) => {
          const fromNow = _fmtRel(t);
          return `<div class="cr-next-item"><span class="cr-next-idx">#${i+1}</span><span class="cr-next-time">${_fmt(t)}</span><span class="cr-next-rel">${fromNow}</span></div>`;
        }).join('');
        root.querySelector('#crNext').innerHTML = html;
      } else if (r.ok) {
        root.querySelector('#crNext').innerHTML = '<div class="cr-next-error">⚠️ 未找到执行时间（未来 10 年内）</div>';
      } else {
        root.querySelector('#crNext').innerHTML = `<div class="cr-next-error">${r.error}</div>`;
      }
    },

    _validateOnly(root) {
      const expr = root.querySelector('#crExpr').value.trim();
      if (!expr) { this._setStatus(root, 'warn', '表达式为空'); return; }
      const parsed = parseCron(expr);
      if (!parsed.ok) {
        this._setStatus(root, 'error', `❌ 非法：${parsed.error}`);
      } else {
        const tag = parsed.useSecond ? 'Quartz 6段' : (parsed.parts.length === 7 ? 'Quartz 7段' : 'Linux 5段');
        // 字段范围汇总
        const f = parsed.fields;
        const fieldSummary = Object.entries(f).map(([k,v]) => {
          const labelMap = { second:'秒', minute:'分', hour:'时', day:'日', month:'月', dow:'周', year:'年' };
          const size = v.values ? v.values.size : '-';
          return `${labelMap[k]||k}:${size}值`;
        }).join(' · ');
        this._setStatus(root, 'ok', `✅ ${tag} · ${parsed.parts.join(' ')} · ${fieldSummary}`);
      }
    },

    _setStatus(root, type, html) {
      const el = root.querySelector('#crStatus');
      el.className = 'cr-status cr-status-' + type;
      el.innerHTML = html;
    },

    _downloadCsv(root) {
      const expr = root.querySelector('#crExpr').value.trim();
      const r = nextExecutions(expr, 50);
      if (!r.ok) { flashMessage('先成功预测再下载', 'warn'); return; }
      const rows = [['序号', '执行时间', 'ISO']];
      r.next.forEach((t, i) => rows.push([i+1, _fmt(t), t.toISOString()]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cron_next_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    cleanup() {}
  };

  // ========== 自然时间差辅助 ==========
  function _fmtRel(target) {
    const now = new Date();
    const diffMs = target - now;
    if (diffMs < 0) return '已过期';
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '不到 1 分钟';
    if (diffMin < 60) return `${diffMin} 分钟后`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时${diffMin % 60 ? (diffMin % 60) + ' 分' : ''}后`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay} 天${diffHr % 24 ? (diffHr % 24) + ' 小时' : ''}后`;
    const diffMon = Math.floor(diffDay / 30);
    if (diffMon < 12) return `${diffMon} 个月${diffDay % 30 ? (diffDay % 30) + ' 天' : ''}后`;
    return `${Math.floor(diffMon / 12)} 年后`;
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

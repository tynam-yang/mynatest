// tools/timestamp.js — 时间戳转换工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'timestamp',
    name: '时间戳转换',
    desc: '时间与时间戳互转，支持秒/毫秒级',
    iconUrl: 'icons/timestamp.png',
    category: 'dev',
    categoryName: '开发工具'
  };

  let tickTimer = null;

  function pad(n, len = 2) {
    return String(n).padStart(len, '0');
  }

  function formatDate(d) {
    if (!(d instanceof Date)) d = new Date(d);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function toLocalInputValue(d) {
    // yyyy-MM-ddTHH:mm 格式给 <input type="datetime-local">
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function fromLocalInputValue(str) {
    // "2026-09-15T14:30" -> Date
    if (!str) return null;
    const [date, time] = str.split('T');
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = (time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, h, min, 0, 0);
  }

  function render(container) {
    const now = new Date();
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>

      <!-- 当前时间 -->
      <div class="ts-section">
        <div class="ts-section-title">📅 当前时间</div>
        <div class="ts-now" id="tsNow">--</div>
        <div class="ts-row">
          <div class="ts-field">
            <div class="ts-label">秒级时间戳</div>
            <div class="ts-value-wrap">
              <div class="ts-value" id="tsNowSec">--</div>
              <button class="btn-copy" data-target="tsNowSec" title="复制">复制</button>
            </div>
          </div>
          <div class="ts-field">
            <div class="ts-label">毫秒级时间戳</div>
            <div class="ts-value-wrap">
              <div class="ts-value" id="tsNowMs">--</div>
              <button class="btn-copy" data-target="tsNowMs" title="复制">复制</button>
            </div>
          </div>
        </div>
        <div class="ts-btn-row">
          <button class="btn" id="tsRefreshBtn">🔄 刷新</button>
          <button class="btn" id="tsNowUtcBtn">🌐 查看 UTC</button>
        </div>
      </div>

      <!-- 时间 → 时间戳 -->
      <div class="ts-section">
        <div class="ts-section-title">🕐 时间 → 时间戳</div>
        <div class="ts-input-row">
          <input type="datetime-local" id="tsDateTimeLocal">
          <button class="btn primary" id="tsDateToTsBtn">转换</button>
        </div>
        <div class="ts-result" id="tsDateResult" style="display:none;"></div>
      </div>

      <!-- 时间戳 → 时间 -->
      <div class="ts-section">
        <div class="ts-section-title">🔢 时间戳 → 时间</div>
        <div class="ts-input-row">
          <input type="text" id="tsTimestampInput" placeholder="输入秒级或毫秒级时间戳，例如 1757980800 或 1757980800000">
          <button class="btn primary" id="tsTsToDateBtn">转换</button>
        </div>
        <div class="ts-result" id="tsTsResult" style="display:none;"></div>
      </div>
    `;
  }

  function mount(context) {
    const container = context.container;
    updateNow(container);
    tickTimer = setInterval(() => updateNow(container), 1000);

    container.querySelector('#tsRefreshBtn')?.addEventListener('click', () => updateNow(container));

    container.querySelector('#tsNowUtcBtn')?.addEventListener('click', () => {
      const now = new Date();
      const utcStr = now.toISOString().replace('T', ' ').replace('Z', '');
      flashMessage(`UTC: ${utcStr}`, 3000);
    });

    container.querySelector('#tsDateToTsBtn')?.addEventListener('click', () => {
      const val = container.querySelector('#tsDateTimeLocal').value;
      const date = fromLocalInputValue(val);
      if (!date || isNaN(date.getTime())) {
        flashMessage('请输入合法的时间', true);
        return;
      }
      const sec = Math.floor(date.getTime() / 1000);
      const ms = date.getTime();
      const resultEl = container.querySelector('#tsDateResult');
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="ts-result-item">
          <span class="ts-result-label">秒级</span>
          <span class="ts-result-value">${sec}</span>
          <button class="btn-copy" data-val="${sec}">复制</button>
        </div>
        <div class="ts-result-item">
          <span class="ts-result-label">毫秒级</span>
          <span class="ts-result-value">${ms}</span>
          <button class="btn-copy" data-val="${ms}">复制</button>
        </div>
      `;
    });

    container.querySelector('#tsTsToDateBtn')?.addEventListener('click', () => {
      const input = container.querySelector('#tsTimestampInput').value.trim();
      const num = Number(input);
      if (!input || isNaN(num)) {
        flashMessage('请输入合法的时间戳', true);
        return;
      }
      // 自动判断：13 位左右是毫秒，10 位左右是秒
      const isMs = input.length >= 13;
      const ms = isMs ? num : num * 1000;
      const date = new Date(ms);
      if (isNaN(date.getTime())) {
        flashMessage('时间戳无效', true);
        return;
      }
      const utcStr = date.toISOString().replace('T', ' ').replace('Z', '');
      const resultEl = container.querySelector('#tsTsResult');
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div class="ts-result-item">
          <span class="ts-result-label">本地时间</span>
          <span class="ts-result-value">${formatDate(date)}</span>
          <button class="btn-copy" data-val="${formatDate(date)}">复制</button>
        </div>
        <div class="ts-result-item">
          <span class="ts-result-label">UTC 时间</span>
          <span class="ts-result-value">${utcStr}</span>
          <button class="btn-copy" data-val="${utcStr}">复制</button>
        </div>
        <div class="ts-result-item">
          <span class="ts-result-label">ISO</span>
          <span class="ts-result-value">${date.toISOString()}</span>
          <button class="btn-copy" data-val="${date.toISOString()}">复制</button>
        </div>
      `;
    });

    container.querySelector('#tsDateTimeLocal').addEventListener('change', (e) => {
      if (!e.target.value) {
        e.target.value = toLocalInputValue(new Date());
      }
    });

    // 复制按钮通用代理
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-copy');
      if (!btn) return;
      const val = btn.dataset.val || document.getElementById(btn.dataset.target)?.textContent;
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => {
        flashMessage('✓ 已复制');
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = val;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashMessage('✓ 已复制');
      });
    });

    // 初始 datetime-local 设为当前时间
    const input = container.querySelector('#tsDateTimeLocal');
    if (input) input.value = toLocalInputValue(now());

    return () => {
      if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    };
  }

  function cleanup() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  }

  function now() {
    return new Date();
  }

  function updateNow(container) {
    const n = now();
    const sec = Math.floor(n.getTime() / 1000);
    const ms = n.getTime();
    const nowEl = container.querySelector('#tsNow');
    const secEl = container.querySelector('#tsNowSec');
    const msEl = container.querySelector('#tsNowMs');
    if (nowEl) nowEl.textContent = formatDate(n);
    if (secEl) secEl.textContent = sec;
    if (msEl) msEl.textContent = ms;
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

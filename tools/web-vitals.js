// tools/web-vitals.js — Web Vitals / 性能面板（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  const meta = {
    id: 'web-vitals',
    name: '性能面板',
    desc: 'LCP/CLS/INP、慢请求、资源大小、瀑布图',
    iconUrl: 'icons/web-vitals.png',
    category: 'network',
    categoryName: '网络工具'
  };

  const THRESHOLDS = {
    lcp:    { good: 2500,  poor: 4000,  unit: 'ms', label: 'LCP',    tip: '最大内容绘制时间，<2.5s 为良好' },
    cls:    { good: 0.1,   poor: 0.25,  unit: '',   label: 'CLS',    tip: '累计布局偏移，<0.1 为良好' },
    inp:    { good: 200,   poor: 500,   unit: 'ms', label: 'INP',    tip: '下次输入延迟(P98)，<200ms 为良好' }
  };

  const INITIATOR_LABEL = {
    script: '脚本', css: '样式', img: '图片', link: '链接',
    fetch: 'XHR/Fetch', xmlhttprequest: 'XHR', video: '视频',
    audio: '音频', font: '字体', beacon: 'Beacon', other: '其他'
  };

  let currentVitals = { lcp: null, cls: 0, inp: null };
  let currentResources = null;
  let unsubs = [];

  function classify(type, value) {
    const t = THRESHOLDS[type];
    if (value == null) return 'unknown';
    if (value <= t.good) return 'good';
    if (value <= t.poor) return 'needs';
    return 'poor';
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function formatMs(ms) {
    if (ms == null || isNaN(ms)) return '—';
    if (ms < 1000) return Math.round(ms) + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
  }

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>

      <div class="pv-toolbar">
        <button class="btn" data-pv-action="collect">🔄 采集数据</button>
        <span class="pv-status" data-pv-status>等待采集…</span>
      </div>

      <div class="pv-cards">
        ${renderVitalsCard('lcp')}
        ${renderVitalsCard('cls')}
        ${renderVitalsCard('inp')}
      </div>

      <div class="pv-section">
        <div class="pv-section-head">
          <span class="pv-section-title">资源瀑布图</span>
          <span class="pv-section-sub" data-pv-sub="rc">—</span>
        </div>
        <div class="pv-waterfall-wrap" data-pv-waterfall>
          <div class="pv-empty">采集数据后显示资源加载瀑布图</div>
        </div>
      </div>

      <div class="pv-section">
        <div class="pv-section-head">
          <span class="pv-section-title">慢请求 TOP</span>
          <span class="pv-section-sub" data-pv-sub="sl">—</span>
        </div>
        <div class="pv-slow-wrap" data-pv-slow>
          <div class="pv-empty">采集数据后显示慢请求列表</div>
        </div>
      </div>

      <div class="pv-section">
        <div class="pv-section-head">
          <span class="pv-section-title">资源大小分布</span>
        </div>
        <div class="pv-breakdown-wrap" data-pv-breakdown>
          <div class="pv-empty">采集数据后显示资源大小分布</div>
        </div>
      </div>
    `;

    // 按钮事件
    container.querySelector('[data-pv-action="collect"]').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'perf:collect' }, (res) => {
        if (chrome.runtime.lastError || !res?.ok) {
          flashMessage('采集失败：' + (res?.error || chrome.runtime.lastError?.message || '未知错误'));
        } else {
          flashMessage('数据已发送，等待采集结果…');
          setStatus(container, '采集中…');
        }
      });
    });

    // 向 background 请求缓存
    chrome.runtime.sendMessage({ type: 'perf:get-latest' }, (res) => {
      if (!res?.ok) return;
      if (res.vitals && (res.vitals.lcp || res.vitals.inp || res.vitals.cls)) {
        currentVitals = res.vitals;
        updateVitalsUI(container, currentVitals);
      }
      if (res.resources) {
        currentResources = res.resources;
        updateResourcesUI(container, currentResources);
      }
    });
  }

  function mount(context) {
    const { container, events } = context;

    // 如果已有缓存数据，立刻渲染
    if (currentVitals.lcp || currentVitals.inp || currentVitals.cls) {
      updateVitalsUI(container, currentVitals);
    }
    if (currentResources) {
      updateResourcesUI(container, currentResources);
    }

    // 订阅事件
    unsubs = [];
    if (events && typeof events.on === 'function') {
      unsubs.push(events.on('perf:vitals', (payload) => {
        currentVitals = { ...currentVitals, ...payload };
        updateVitalsUI(container, currentVitals);
        setStatus(container, 'Vitals 已更新');
      }));
      unsubs.push(events.on('perf:resources', (payload) => {
        currentResources = payload;
        updateResourcesUI(container, payload);
        setStatus(container, '资源数据已更新');
      }));
    }
  }

  function renderVitalsCard(type) {
    const t = THRESHOLDS[type];
    return `
      <div class="pv-card pv-card-${type} pv-card-unknown">
        <div class="pv-card-head">
          <span class="pv-card-label" title="${t.tip}">${t.label}</span>
          <span class="pv-card-badge">—</span>
        </div>
        <div class="pv-card-value">—</div>
        <div class="pv-card-sub"></div>
      </div>
    `;
  }

  function setStatus(container, text) {
    const el = container.querySelector('[data-pv-status]');
    if (el) el.textContent = text;
  }

  function updateVitalsUI(container, v) {
    ['lcp', 'cls', 'inp'].forEach(type => {
      const card = container.querySelector(`.pv-card-${type}`);
      if (!card) return;
      const t = THRESHOLDS[type];
      const val = v[type];
      const badge = card.querySelector('.pv-card-badge');
      const valueEl = card.querySelector('.pv-card-value');
      const subEl = card.querySelector('.pv-card-sub');

      if (val == null || (type === 'cls' && val === 0)) {
        card.className = `pv-card pv-card-${type} pv-card-unknown`;
        badge.textContent = '未采集';
        valueEl.textContent = '—';
        subEl.textContent = type === 'lcp' ? '需要页面加载完成' : type === 'inp' ? '需要用户交互' : '需要产生布局偏移';
        return;
      }

      const cls = classify(type, type === 'cls' ? val : val.value);
      card.className = `pv-card pv-card-${type} pv-card-${cls}`;

      if (type === 'cls') {
        badge.textContent = cls === 'good' ? '良好' : cls === 'needs' ? '需改进' : '较差';
        valueEl.textContent = val.toFixed(3);
        subEl.textContent = `< 0.1 良好 / 0.1-0.25 需改进 / > 0.25 较差`;
      } else {
        const vv = val.value;
        badge.textContent = cls === 'good' ? '良好' : cls === 'needs' ? '需改进' : '较差';
        valueEl.textContent = formatMs(vv);
        const targetVal = type === 'lcp' ? 2500 : 200;
        const subParts = [];
        if (val.element) subParts.push(val.element);
        if (type === 'inp' && val.name) subParts.push(val.name);
        subEl.textContent = (subParts.join(' · ') || '') + (subParts.length ? ' · ' : '') + `< ${formatMs(targetVal)} 良好`;
      }
    });
  }

  function updateResourcesUI(container, data) {
    if (!data || !data.resources || data.resources.length === 0) {
      container.querySelector('[data-pv-sub="rc"]').textContent = '0';
      container.querySelector('[data-pv-sub="sl"]').textContent = '0';
      container.querySelector('[data-pv-waterfall]').innerHTML = '<div class="pv-empty">无资源数据</div>';
      container.querySelector('[data-pv-slow]').innerHTML = '<div class="pv-empty">无慢请求数据</div>';
      container.querySelector('[data-pv-breakdown]').innerHTML = '<div class="pv-empty">无资源数据</div>';
      return;
    }

    container.querySelector('[data-pv-sub="rc"]').textContent = data.resources.length + ' 个';
    container.querySelector('[data-pv-sub="sl"]').textContent = 'TOP 10';

    const totalDuration = Math.max(...data.resources.map(r => r.startTime + r.total), 1);
    container.querySelector('[data-pv-waterfall]').innerHTML = renderWaterfall(data.resources, totalDuration);

    const slowTop = data.resources
      .filter(r => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    container.querySelector('[data-pv-slow]').innerHTML = renderSlowList(slowTop);

    container.querySelector('[data-pv-breakdown]').innerHTML = renderBreakdown(data.typeBreakdown);
  }

  function renderWaterfall(resources, totalDuration) {
    const tickCount = 5;
    let ticksHTML = '<div class="pv-waterfall-ticks">';
    for (let i = 0; i <= tickCount; i++) {
      const t = (totalDuration / tickCount) * i;
      ticksHTML += `<span style="left:${(i / tickCount) * 100}%">${formatMs(t)}</span>`;
    }
    ticksHTML += '</div>';

    const rows = resources.map(r => {
      const leftPct = (r.startTime / totalDuration) * 100;
      const widthPct = Math.max(0.5, (r.total / totalDuration) * 100);
      // 各阶段百分比相对于该资源自身 total（bar 已按 totalDuration 定位，内部用自身比例）
      const dnsW = r.total > 0 ? Math.max(0, (r.dns / r.total) * 100) : 0;
      const tcpW = r.total > 0 ? Math.max(0, (r.tcp / r.total) * 100) : 0;
      const ttfbW = r.total > 0 ? Math.max(0, (r.ttfb / r.total) * 100) : 0;
      const dlW = r.total > 0 ? Math.max(0, (r.download / r.total) * 100) : 0;
      const shortName = r.name.replace(/^https?:\/\//, '').slice(0, 60);

      return `
        <div class="pv-waterfall-row" title="${r.name}">
          <div class="pv-waterfall-name" title="${r.name}">${shortName}</div>
          <div class="pv-waterfall-bar-area">
            <div class="pv-waterfall-bar" style="left:${leftPct}%;width:${widthPct}%;">
              ${dnsW > 2 ? `<span class="pv-phase pv-phase-dns" style="width:${dnsW}%" title="DNS: ${r.dns}ms"></span>` : ''}
              ${tcpW > 2 ? `<span class="pv-phase pv-phase-tcp" style="width:${tcpW}%" title="TCP: ${r.tcp}ms"></span>` : ''}
              ${ttfbW > 2 ? `<span class="pv-phase pv-phase-ttfb" style="width:${ttfbW}%" title="TTFB: ${r.ttfb}ms"></span>` : ''}
              ${dlW > 2 ? `<span class="pv-phase pv-phase-dl" style="width:${dlW}%" title="Download: ${r.download}ms"></span>` : ''}
            </div>
            <div class="pv-waterfall-meta">
              <span class="pv-meta-dur">${formatMs(r.total)}</span>
              <span class="pv-meta-size">${formatBytes(r.transferSize || r.encodedBodySize || 0)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const legend = `
      <div class="pv-waterfall-legend">
        <span class="pv-legend-item"><i class="pv-phase pv-phase-dns"></i>DNS</span>
        <span class="pv-legend-item"><i class="pv-phase pv-phase-tcp"></i>TCP</span>
        <span class="pv-legend-item"><i class="pv-phase pv-phase-ttfb"></i>TTFB</span>
        <span class="pv-legend-item"><i class="pv-phase pv-phase-dl"></i>Download</span>
      </div>
    `;

    return ticksHTML + legend + rows;
  }

  function renderSlowList(resources) {
    if (!resources.length) return '<div class="pv-empty">无慢请求数据</div>';
    return '<div class="pv-slow-table">' + resources.map((r, i) => {
      const shortName = r.name.replace(/^https?:\/\//, '').slice(0, 55);
      const slowCls = r.total > 3000 ? 'pv-slow-poor' : r.total > 1000 ? 'pv-slow-mid' : 'pv-slow-ok';
      return `
        <div class="pv-slow-row ${slowCls}" title="${r.name}">
          <span class="pv-slow-rank">#${i + 1}</span>
          <span class="pv-slow-name" title="${r.name}">${shortName}</span>
          <span class="pv-slow-type">${INITIATOR_LABEL[r.initiatorType] || r.initiatorType || '-'}</span>
          <span class="pv-slow-dur">${formatMs(r.total)}</span>
          <span class="pv-slow-size">${formatBytes(r.transferSize || r.encodedBodySize || 0)}</span>
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderBreakdown(typeBreakdown) {
    const entries = Object.entries(typeBreakdown).sort((a, b) => b[1].totalTransfer - a[1].totalTransfer);
    if (!entries.length) return '<div class="pv-empty">无分布数据</div>';
    const maxTransfer = Math.max(...entries.map(([, v]) => v.totalTransfer), 1);
    return '<div class="pv-breakdown-list">' + entries.map(([type, info]) => {
      const label = INITIATOR_LABEL[type] || type;
      const pct = (info.totalTransfer / maxTransfer) * 100;
      return `
        <div class="pv-breakdown-row">
          <span class="pv-breakdown-label">${label}</span>
          <div class="pv-breakdown-bar-bg">
            <div class="pv-breakdown-bar" style="width:${pct}%;"></div>
          </div>
          <span class="pv-breakdown-val">${info.count} 个 · ${formatBytes(info.totalTransfer)}</span>
        </div>
      `;
    }).join('') + '</div>';
  }

  function cleanup() {
    unsubs.forEach(fn => { try { fn(); } catch {} });
    unsubs = [];
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

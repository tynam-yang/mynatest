// tools/snapshot-diff.js — 元素快照对比（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'snapshot-diff',
    name: '快照对比',
    desc: '捕获元素基准图，自动像素比对 UI 变更',
    iconUrl: 'icons/snapshot-diff.png',
    icon: '📸',
    category: 'test',
    categoryName: '测试工具'
  };

  function render(container) {
    container.innerHTML = `
      <div class="sd-wrap">
        <div class="sd-header">
          <div class="sd-title">元素快照对比</div>
        </div>

        <div class="sd-tip">点击元素生成基准图，下次打开自动比对；支持手动校验 UI 变更。</div>

        <div class="sd-section">
          <div class="sd-section-title">📌 当前页面</div>
          <div class="sd-row">
            <select id="sd-selector-type" class="sd-selector-type">
              <option value="css">CSS</option>
              <option value="xpath">XPath</option>
            </select>
            <input type="text" id="sd-selector" class="sd-selector" placeholder="选择器（点击右侧按钮获取）">
            <button id="sd-pick" class="sd-btn sd-btn-secondary sd-pick-btn">🎯</button>
          </div>
          <div class="sd-row">
            <input type="text" id="sd-name" class="sd-input" placeholder="基线名称（如「登录按钮」）">
            <button id="sd-save" class="sd-btn sd-btn-primary sd-save-btn">💾 保存</button>
          </div>
        </div>

        <div class="sd-section">
          <div class="sd-section-title">📚 基线列表</div>
          <div id="sd-baselines" class="sd-baselines"><div class="sd-empty">暂无基线，点击「保存」创建</div></div>
        </div>

        <div id="sd-diff-result" class="sd-diff-result" style="display:none;">
          <div class="sd-section-title">🔍 比对结果</div>
          <div class="sd-diff-stats" id="sd-diff-stats"></div>
          <div class="sd-diff-images">
            <div class="sd-diff-item">
              <div class="sd-diff-label">基准</div>
              <img id="sd-img-baseline" class="sd-diff-img" alt="baseline">
            </div>
            <div class="sd-diff-item">
              <div class="sd-diff-label">当前</div>
              <img id="sd-img-current" class="sd-diff-img" alt="current">
            </div>
            <div class="sd-diff-item">
              <div class="sd-diff-label">差异高亮</div>
              <img id="sd-img-diff" class="sd-diff-img" alt="diff">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const container = context.container;
    let baselines = [];
    let picking = false;
    let offPicked = null;

    function bindEvents() {
      container.querySelector('#sd-pick').addEventListener('click', onPick);
      container.querySelector('#sd-save').addEventListener('click', onSave);
      container.querySelector('#sd-selector').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') manualCapture();
      });

      // 监听 sidepanel Port 转发的 picked 结果
      offPicked = context.events.on('snapshot:picked', (payload) => {
        if (!picking) return;
        picking = false;
        onElementPicked(payload);
      });
    }

    bindEvents();
    loadBaselines();

    async function onPick() {
      picking = true;
      flashMessage('请在页面上点击要捕获的元素');
      await chrome.runtime.sendMessage({ type: 'snapshot:activate-picker' });
    }

    async function onElementPicked(msg) {
      if (!msg.ok) { flashMessage(msg.error || '选择失败'); return; }
      if (msg.selectorType) {
        container.querySelector('#sd-selector-type').value = msg.selectorType;
      }
      container.querySelector('#sd-selector').value = msg.selector;
      flashMessage('元素已选中，可保存为基准或手动比对');
    }

    async function manualCapture() {
      const selector = container.querySelector('#sd-selector').value.trim();
      const selectorType = container.querySelector('#sd-selector-type').value;
      if (!selector) { flashMessage('请先填写选择器或点击选择器'); return; }
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) { flashMessage('无活跃标签页'); return; }

      // 从 content script 获取 rect
      const rectRes = await chrome.tabs.sendMessage(tab.id, { type: 'snapshot:get-rect', selector, selectorType });
      if (!rectRes?.ok) { flashMessage(rectRes?.error || '元素不存在'); return; }

      const capture = await chrome.runtime.sendMessage({
        type: 'snapshot:capture',
        tabId: tab.id,
        rect: rectRes.rect,
        viewport: rectRes.viewport
      });
      return { capture, selector, selectorType, rect: rectRes.rect, viewport: rectRes.viewport };
    }

    async function onSave() {
      const selector = container.querySelector('#sd-selector').value.trim();
      const selectorType = container.querySelector('#sd-selector-type').value;
      const name = container.querySelector('#sd-name').value.trim();
      if (!selector) { flashMessage('请先填写选择器'); return; }
      if (!name) { flashMessage('请填写基线名称'); return; }

      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) { flashMessage('无活跃标签页'); return; }

      const rectRes = await chrome.tabs.sendMessage(tab.id, { type: 'snapshot:get-rect', selector, selectorType });
      if (!rectRes?.ok) { flashMessage(rectRes?.error || '元素不存在'); return; }

      const capture = await chrome.runtime.sendMessage({
        type: 'snapshot:capture',
        tabId: tab.id,
        rect: rectRes.rect,
        viewport: rectRes.viewport
      });
      if (!capture.ok) { flashMessage(capture.error || '截图失败'); return; }

      const url = (tab.url || '').split('#')[0];
      await chrome.runtime.sendMessage({
        type: 'snapshot:save-baseline',
        baseline: {
          name, selector, selectorType, pageUrl: url,
          imageUrl: capture.dataUrl,
          rect: rectRes.rect,
          viewport: rectRes.viewport
        }
      });
      flashMessage('✅ 基准已保存');
      container.querySelector('#sd-name').value = '';
      loadBaselines();
    }

    async function loadBaselines() {
      const res = await chrome.runtime.sendMessage({ type: 'snapshot:list-baselines' });
      if (res?.ok) {
        baselines = res.baselines || [];
        renderBaselines();
      }
    }

    function renderBaselines() {
      const list = container.querySelector('#sd-baselines');
      if (baselines.length === 0) {
        list.innerHTML = '<div class="sd-empty">暂无基线，点击「保存为基准」创建</div>';
        return;
      }
      list.innerHTML = '';
      baselines.forEach(b => {
        const item = document.createElement('div');
        item.className = 'sd-baseline-item';
        const timeStr = new Date(b.updatedAt || b.createdAt).toLocaleString();
        const typeTag = b.selectorType === 'xpath' ? 'XPath' : 'CSS';
        item.innerHTML = `
          <div class="sd-baseline-info">
            <div class="sd-baseline-name">${escapeHtml(b.name)} <span class="sd-baseline-tag sd-tag-${typeTag.toLowerCase()}">${typeTag}</span></div>
            <div class="sd-baseline-url" title="${escapeHtml(b.pageUrl)}">${escapeHtml(b.pageUrl)}</div>
            <div class="sd-baseline-selector" title="${escapeHtml(b.selector)}">${escapeHtml(b.selector)}</div>
            <div class="sd-baseline-time">⏱ ${timeStr}</div>
          </div>
          <div class="sd-baseline-actions">
            <button class="sd-mini-btn" data-act="compare" data-id="${b.id}" title="比对">🔍</button>
            <button class="sd-mini-btn sd-mini-danger" data-act="delete" data-id="${b.id}" title="删除">🗑</button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    container.querySelector('#sd-baselines').addEventListener('click', async (e) => {
      const btn = e.target.closest('.sd-mini-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === 'delete') {
        if (!confirm('确定删除此基线？')) return;
        await chrome.runtime.sendMessage({ type: 'snapshot:delete-baseline', id });
        flashMessage('已删除');
        loadBaselines();
      } else if (btn.dataset.act === 'compare') {
        await doCompare(id);
      }
    });

    async function doCompare(baselineId) {
      const baseline = baselines.find(b => b.id === baselineId);
      if (!baseline) return;

      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) { flashMessage('无活跃标签页'); return; }

      const rectRes = await chrome.tabs.sendMessage(tab.id, { type: 'snapshot:get-rect', selector: baseline.selector, selectorType: baseline.selectorType || 'css' });
      if (!rectRes?.ok) { flashMessage(rectRes?.error || '元素不存在'); return; }

      flashMessage('正在比对...');
      const res = await chrome.runtime.sendMessage({
        type: 'snapshot:compare',
        baselineId,
        rect: rectRes.rect,
        viewport: rectRes.viewport
      });

      if (!res?.ok) { flashMessage(res?.error || '比对失败'); return; }

      // 显示结果
      const resultEl = container.querySelector('#sd-diff-result');
      resultEl.style.display = '';
      const diffRatePct = (res.diffRate * 100).toFixed(2);
      const hasDiff = res.diffRate > 0.01;

      container.querySelector('#sd-diff-stats').innerHTML = `
        <div class="sd-stat-item ${hasDiff ? 'sd-stat-fail' : 'sd-stat-ok'}">
          <span class="sd-stat-num">${diffRatePct}%</span>
          <span class="sd-stat-label">差异率</span>
        </div>
        <div class="sd-stat-item">
          <span class="sd-stat-num">${res.diffCount}</span>
          <span class="sd-stat-label">差异像素</span>
        </div>
        <div class="sd-stat-item">
          <span class="sd-stat-num">${res.width}×${res.height}</span>
          <span class="sd-stat-label">尺寸</span>
        </div>
      `;

      // 加载基准图（需要单独获取，因为 list 不含 dataURL）
      const detail = await getBaselineImage(baselineId);
      container.querySelector('#sd-img-baseline').src = detail?.imageUrl || '';
      container.querySelector('#sd-img-current').src = res.currentImageUrl || '';
      container.querySelector('#sd-img-diff').src = res.diffImageUrl || '';
    }

    async function getBaselineImage(id) {
      return new Promise((resolve) => {
        chrome.storage.local.get(['snapshotBaselines'], (r) => {
          const list = r.snapshotBaselines || [];
          resolve(list.find(b => b.id === id));
        });
      });
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    return () => { offPicked?.(); };
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount });
})();

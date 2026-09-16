// tools/bug-report.js — Bug 报告助手（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const STORAGE_KEY = 'bugReport';

  const meta = {
    id: 'bug-report',
    name: 'Bug 报告助手',
    desc: '区域截图 + 标注，自动带入环境信息，生成 Jira/禅道 bug 模板',
    iconUrl: 'icons/bug-report.png',
    category: 'test',
    categoryName: '测试工具'
  };

  const DEFAULT_CONFIG = {
    template: 'jira',
    customTemplate: `## Bug 报告

### 问题描述
{{summary}}

### 复现步骤
1. 
2. 

### 预期结果


### 实际结果


### 环境信息
- **URL**: {{url}}
- **页面标题**: {{title}}
- **浏览器**: {{platform}} / {{userAgent}}
- **屏幕**: {{screenWidth}}×{{screenHeight}}
- **时间**: {{timestamp}}

### 附件
（截图粘贴在这里）`,
    summary: '',
  };

  let config = null;
  let currentContainer = null;

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY], (r) => {
        const saved = r[STORAGE_KEY];
        resolve(saved ? { ...DEFAULT_CONFIG, ...saved } : { ...DEFAULT_CONFIG });
      });
    });
  }
  function saveConfig() {
    return new Promise((res) => { chrome.storage.local.set({ [STORAGE_KEY]: config }, res); });
  }

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>

      <div class="br-section">
        <div class="br-section-title">📸 截图 & 标注</div>
        <button class="btn br-shot" id="brStartShot">
          <span class="br-shot-icon">📷</span>
          启动截图 & 标注
        </button>
        <div class="br-hint">在当前页面拖动框选区域，支持矩形/箭头/文字/马赛克标注，完成后直接复制到剪贴板</div>
      </div>

      <div class="br-section">
        <div class="br-section-title">🐛 问题描述</div>
        <textarea id="brSummary" class="br-summary" placeholder="简要描述问题...（支持多行）"></textarea>
      </div>

      <div class="br-section">
        <div class="br-section-title">📋 模板类型</div>
        <div class="br-template-tabs">
          <button class="br-tpl-tab" data-tpl="jira">Jira</button>
          <button class="br-tpl-tab" data-tpl="zentao">禅道</button>
          <button class="br-tpl-tab" data-tpl="custom">自定义</button>
        </div>
        <textarea id="brCustomTpl" class="br-custom-tpl" placeholder="自定义模板..."></textarea>
        <div class="br-vars">可用变量：<code>{{url}}</code> <code>{{title}}</code> <code>{{platform}}</code> <code>{{userAgent}}</code> <code>{{screenWidth}}</code> <code>{{screenHeight}}</code> <code>{{viewportWidth}}</code> <code>{{viewportHeight}}</code> <code>{{timestamp}}</code> <code>{{hostname}}</code> <code>{{cookieCount}}</code> <code>{{summary}}</code> <code>{{attachNote}}</code></div>
      </div>

      <div class="br-section">
        <div class="br-section-title">✅ 环境信息</div>
        <button class="btn br-collect-btn" id="brCollectEnv">🔄 采集当前页面</button>
        <div id="brEnvBox" class="br-env-box">— 点击按钮采集当前页面环境 —</div>
      </div>

      <div class="br-section">
        <div class="br-section-title">🖼️ 截图附件</div>
        <div id="brScreenshotBox" class="br-screenshot-box">— 标注完成后点击「确认标注」自动添加 —</div>
      </div>

      <div class="br-actions">
        <button class="btn btn-primary" id="brGenerate">生成 Bug 模板</button>
        <button class="btn" id="brCopy">📋 复制全部</button>
        <button class="btn" id="brCopyShot" style="display:none">📋 复制截图</button>
      </div>

      <textarea id="brOutput" class="br-output" placeholder="点击「生成 Bug 模板」查看预览..."></textarea>
    `;
  }

  async function mount(context) {
    config = await getConfig();
    currentContainer = context.container;
    bind(context.container);
    // 检查是否有已保存的截图
    checkSavedScreenshot(context.container);
    // 监听 content script 标注完成通知，实时刷新截图预览
    if (!window.__bt_sidepanel_listener__) {
      window.__bt_sidepanel_listener__ = true;
      const port = chrome.runtime.connect({ name: 'sidepanel' });
      port.onMessage.addListener((msg) => {
        if (msg?.type === 'bug-report:screenshot-ready' && currentContainer) {
          checkSavedScreenshot(currentContainer);
        }
      });
    }
  }

  function checkSavedScreenshot(container) {
    chrome.storage.local.get(['bugReportScreenshot'], (r) => {
      if (r.bugReportScreenshot) {
        showScreenshot(container, r.bugReportScreenshot);
      }
    });
  }

  function showScreenshot(container, dataUrl) {
    const box = container.querySelector('#brScreenshotBox');
    if (!box) return;
    box.innerHTML = `
      <div style="position:relative;display:inline-block;width:100%;">
        <img src="${dataUrl}" style="max-width:100%;border:1px solid #e5e7eb;border-radius:6px;" />
        <button id="brRemoveShot" title="删除截图" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border-radius:50%;background:rgba(239,68,68,0.9);color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;">✕</button>
      </div>
      <div style="margin-top:4px;font-size:11px;color:#9ca3af;">✅ 截图已就绪，生成模板时自动添加到附件</div>
    `;
    container.querySelector('#brRemoveShot').addEventListener('click', () => {
      chrome.storage.local.remove('bugReportScreenshot', () => {
        delete container.dataset.screenshot;
        box.innerHTML = '— 标注完成后点击「确认标注」自动添加 —';
        const copyBtn = container.querySelector('#brCopyShot');
        if (copyBtn) copyBtn.style.display = 'none';
        flashMessage('已删除截图', 1200);
      });
    });
    const copyBtn = container.querySelector('#brCopyShot');
    if (copyBtn) copyBtn.style.display = '';
    container.dataset.screenshot = dataUrl;
  }

  function bind(container) {
    container.querySelector('#brStartShot').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { flashMessage('无活跃标签页'); return; }
      if (!/^https?:\/\//.test(tab.url || '')) {
        flashMessage('⚠️ 请先在 HTTP/HTTPS 页面上操作');
        return;
      }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/bug-report-content.js'],
        });
        flashMessage('✅ 请切回页面开始截图');
        setTimeout(async () => {
          await chrome.tabs.sendMessage(tab.id, { type: 'bug-report:start' });
        }, 200);
      } catch (e) {
        flashMessage('注入失败：' + e.message);
      }
    });

    const tabs = container.querySelectorAll('.br-tpl-tab');
    function setActiveTpl(name) {
      tabs.forEach(b => b.classList.toggle('active', b.dataset.tpl === name));
    }
    setActiveTpl(config.template);
    tabs.forEach(b => b.addEventListener('click', async () => {
      config.template = b.dataset.tpl;
      setActiveTpl(config.template);
      await saveConfig();
      flashMessage('模板已切换：' + (config.template.toUpperCase()));
    }));

    const tplInput = container.querySelector('#brCustomTpl');
    tplInput.value = config.customTemplate || '';
    tplInput.addEventListener('input', async () => {
      config.customTemplate = tplInput.value;
      await saveConfig();
    });

    const summaryInput = container.querySelector('#brSummary');
    summaryInput.value = config.summary || '';
    summaryInput.addEventListener('input', async () => {
      config.summary = summaryInput.value;
      await saveConfig();
    });

    container.querySelector('#brCollectEnv').addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      if (!/^https?:\/\//.test(tab.url || '')) {
        flashMessage('⚠️ 请先在 HTTP/HTTPS 页面上操作');
        return;
      }
      try {
        // 直接用 executeScript 采集，不依赖 content script 是否已注入
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => ({
            url: location.href,
            hostname: location.hostname,
            title: document.title,
            userAgent: navigator.userAgent,
            cookieCount: (document.cookie || '').split(';').filter(c => c.trim()).length,
            screenWidth: screen.width,
            screenHeight: screen.height,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            platform: navigator.platform || '未知',
            language: navigator.language,
            timestamp: new Date().toISOString()
          })
        });
        const env = result?.result;
        if (env) {
          renderEnv(container, env);
          container.dataset.env = JSON.stringify(env);
          flashMessage('✅ 环境信息已采集', 1500);
        } else {
          flashMessage('采集失败：无返回');
        }
      } catch (e) {
        flashMessage('采集失败：' + e.message);
      }
    });

    container.querySelector('#brGenerate').addEventListener('click', async () => {
      const env = JSON.parse(container.dataset.env || 'null');
      if (!env) {
        flashMessage('⚠️ 请先采集环境信息');
        return;
      }
      const hasShot = !!container.dataset.screenshot;
      const text = buildTemplate(config, env, hasShot);
      container.querySelector('#brOutput').value = text;
      flashMessage(hasShot ? '✅ 模板已生成（含截图附件）' : '✅ 模板已生成');
    });

    container.querySelector('#brCopy').addEventListener('click', async () => {
      const output = container.querySelector('#brOutput').value;
      if (!output) { flashMessage('⚠️ 先生成模板'); return; }
      try {
        await navigator.clipboard.writeText(output);
        flashMessage('✅ 已复制到剪贴板', 1500);
      } catch (e) { flashMessage('复制失败：' + e.message); }
    });

    const copyShotBtn = container.querySelector('#brCopyShot');
    if (copyShotBtn) {
      copyShotBtn.addEventListener('click', async () => {
        const dataUrl = container.dataset.screenshot;
        if (!dataUrl) { flashMessage('⚠️ 无截图'); return; }
        try {
          const blob = await new Promise(r => fetch(dataUrl).then(r).then(r));
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          flashMessage('✅ 截图已复制到剪贴板', 1500);
        } catch (e) { flashMessage('复制截图失败：' + e.message); }
      });
    }
  }

  function renderEnv(container, env) {
    const box = container.querySelector('#brEnvBox');
    box.innerHTML = `
      <div class="br-env-item"><span class="br-env-k">URL</span><span class="br-env-v" title="${escapeAttr(env.url)}">${escapeAttr(env.url)}</span></div>
      <div class="br-env-item"><span class="br-env-k">页面</span><span class="br-env-v">${escapeAttr(env.title)}</span></div>
      <div class="br-env-item"><span class="br-env-k">平台</span><span class="br-env-v">${escapeAttr(env.platform)} · ${env.language}</span></div>
      <div class="br-env-item"><span class="br-env-k">屏幕</span><span class="br-env-v">${env.screenWidth}×${env.screenHeight} · 视口 ${env.viewportWidth}×${env.viewportHeight}</span></div>
      <div class="br-env-item"><span class="br-env-k">UA</span><span class="br-env-v br-env-ua" title="${escapeAttr(env.userAgent)}">${escapeAttr(env.userAgent)}</span></div>
      ${env.cookieCount ? `<div class="br-env-item"><span class="br-env-k">Cookie</span><span class="br-env-v">${env.cookieCount} 项（安全跳过）</span></div>` : ''}
    `;
  }

  function escapeAttr(s) { return String(s || '').replace(/"/g, '&quot;'); }

  function buildTemplate(cfg, env, hasShot) {
    const attachNote = hasShot
      ? '✅ 截图已就绪 — 点击侧边栏「复制截图」按钮，复制截图'
      : '（请粘贴截图）';
    if (cfg.template === 'jira') {
      return `h3. 问题描述
${cfg.summary || '（请填写）'}

h3. 复现步骤
# 进入页面：${env.url}
# 执行操作：
# 观察结果：

h3. 预期结果


h3. 实际结果


h3. 环境信息
* *URL*: ${env.url}
* *Host*: ${env.hostname}
* *页面标题*: ${env.title}
* *平台*: ${env.platform}
* *UA*: {code}${env.userAgent}{code}
* *屏幕*: ${env.screenWidth}×${env.screenHeight}
* *时间*: ${env.timestamp}

h3. 附件
${attachNote}`;
    }
    if (cfg.template === 'zentao') {
      return `| 所属模块 | |
| 关联需求 | |
| 影响版本 | |
| 严重程度 | 2 |
| 优先级 | 3 |

**问题描述**
${cfg.summary || '（请填写）'}

**复现步骤**
1. 访问：${env.url}
2. 
3. 

**期望结果**

**实际结果**

**环境信息**
- 操作系统：${env.platform}
- 浏览器 UA：\`${env.userAgent}\`
- 屏幕分辨率：${env.screenWidth}×${env.screenHeight}
- 页面地址：${env.url}
- 采集时间：${env.timestamp}

**附件**
${attachNote}`;
    }
    let tpl = cfg.customTemplate || '';
    const vars = { ...env, summary: cfg.summary || '', attachNote };
    return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] !== undefined ? String(vars[k]) : m);
  }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup() {} });
})();

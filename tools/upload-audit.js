// tools/upload-audit.js — 文件上传漏洞辅助：类型绕过载荷 / 大小边界 / 路径穿越 / 内容校验（全局）

(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const escapeHtml = window.MynaUtils?.escapeHtml || ((s) => String(s));

  const meta = {
    id: 'upload-audit',
    name: '上传漏洞辅助',
    desc: '文件上传测试辅助：文件名绕过清单、polyglot 载荷、检查清单（仅授权测试）',
    iconUrl: 'icons/upload-audit.png',
    category: 'test',
    categoryName: '测试工具'
  };

  // 文件名绕过清单
  const NAME_BYPASS = [
    { n: 'shell.jpg.php', why: '双扩展名：只检查最后一个之外的白名单' },
    { n: 'shell.php.jpg', why: 'Apache 老配置把右侧未知扩展解析为 PHP' },
    { n: 'shell.phP', why: '扩展名大小写绕过' },
    { n: 'shell.php5', why: '其他 PHP 解析扩展（php3/4/5/phtml/pht）' },
    { n: 'shell.asp;.jpg', why: 'IIS 分号截断' },
    { n: 'shell.jpg%00.php', why: '老版本 PHP null byte 截断（URL 编码）' },
    { n: '../upload/shell.php', why: '路径穿越：写到目录外' },
    { n: '..%2f..%2fshell.php', why: 'URL 编码路径穿越' },
    { n: 'shell.p_h_p.jpg', why: '替换下划线的畸形扩展' },
    { n: 'a'.repeat(120) + '.jpg', why: '超长文件名：路径缓冲/截断异常' },
    { n: 'shell.jpg::$DATA', why: 'Windows NTFS 交换数据流' },
    { n: '.htaccess', why: 'Apache 配置覆盖（配合 AddHandler）' }
  ];

  // polyglot 载荷（GIF 头 + 文本标记）
  const POLYGLOTS = [
    {
      name: 'gif-webshell.txt',
      filename: 'shell.gif',
      mime: 'image/gif',
      desc: 'GIF89a 魔数开头 + 文本标记，可测「仅凭魔数/Content-Type 校验」的过滤',
      build: () => 'GIF89a' + '\n<?php echo "myna-test-ok"; ?>'
    },
    {
      name: 'svg-xxe.svg',
      filename: 'payload.svg',
      mime: 'image/svg+xml',
      desc: 'SVG 内嵌脚本 / XXE 探针，测试 SVG 被内联渲染或解析的风险',
      build: () => '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
        '<script type="text/javascript">alert("myna-svg-xss")</script></svg>'
    },
    {
      name: 'html-in-jpg.html',
      filename: 'payload.jpg.html',
      mime: 'text/html',
      desc: '伪图片扩展的 HTML，测试 content-type 覆盖与 X-Content-Type-Options 缺失',
      build: () => '<html><body><img src=x onerror="alert(\'myna-html-xss\')"></body></html>'
    }
  ];

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <div class="up-warn">⚠ 仅用于自己拥有或已获得书面授权的系统。生成的载荷仅用于验证上传过滤逻辑，不包含可执行的攻击代码。</div>

      <div class="sn-section-title">📛 文件名 / 扩展名绕过清单</div>
      <div class="kb-list">${NAME_BYPASS.map((b) => `
        <div class="kb-row up-row">
          <span class="up-name" title="${escapeHtml(b.n)}">${escapeHtml(b.n.length > 40 ? b.n.slice(0, 37) + '…' : b.n)}</span>
          <span class="up-why">${escapeHtml(b.why)}</span>
          <button class="btn sc-small-btn up-copy" data-name="${escapeHtml(b.n)}">复制</button>
        </div>`).join('')}
      </div>

      <div class="sn-section-title">🧬 Polyglot / 内容校验载荷（生成并下载）</div>
      <div class="kb-list">${POLYGLOTS.map((p, i) => `
        <div class="te-card up-card">
          <div class="te-card-head">
            <span class="te-card-title">${escapeHtml(p.filename)}</span>
            <button class="btn sc-small-btn" data-gen="${i}">⬇ 生成下载</button>
          </div>
          <div class="sn-card-desc">${escapeHtml(p.desc)}</div>
        </div>`).join('')}
      </div>

      <div class="sn-section-title">✅ 上传点安全检查清单</div>
      <div class="kb-list">
        ${[
          '前端扩展名校验 → 可直接绕过，需服务端校验',
          '仅校验 Content-Type → 伪造请求头即可绕过',
          '扩展名黑名单 → 用 php5/phtml/$DATA 等变体绕过',
          '应使用扩展名白名单 + 魔数（magic number）双重校验',
          '文件重命名（随机 UUID）且不保留用户扩展名之外的信息',
          '上传目录禁止执行权限（Nginx/Apache 均需配置）',
          '存储路径与 Web 根隔离，或使用对象存储 + CDN',
          '限制文件大小与数量，防 DoS',
          '图片二次处理（重编码）可摧毁大部分注入载荷',
          '响应中不回显服务器保存路径，防路径猜测'
        ].map((t) => `<div class="kb-row"><span>☐</span><span class="up-why" style="flex:1">${escapeHtml(t)}</span></div>`).join('')}
      </div>
    `;

    // 绑定
    container.querySelectorAll('.up-copy').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.name).then(() => flashMessage('✓ 文件名已复制', 1200));
      });
    });
    container.querySelectorAll('[data-gen]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = POLYGLOTS[parseInt(btn.dataset.gen, 10)];
        downloadBlob(p.build(), p.filename, p.mime);
        flashMessage('✓ 已生成 ' + p.filename, 1500);
      });
    });
  }

  function mount() {}
  function cleanup() {}

  function downloadBlob(content, filename, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  if (!window.MynaTools) window.MynaTools = [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

// tools/jwt-parser.js — JWT 解析工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;
  const escapeHtml = window.MynaUtils.escapeHtml;

  const meta = {
    id: 'jwt-parser',
    name: 'JWT 解析',
    desc: '解码 JWT 的 Header 和 Payload',
    iconUrl: 'icons/jwt-parser.png',
    category: 'network',
    categoryName: '网络工具'
  };

  function base64UrlDecode(str) {
    // Base64URL -> Base64
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
      const decoded = atob(b64);
      // UTF-8 decode
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch (e) {
      return null;
    }
  }

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt="${meta.name}"> ${meta.name}</h2>
      <div class="jwt-input-row">
        <textarea id="jwtInput" class="jwt-textarea" placeholder='粘贴 JWT Token，例如:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'></textarea>
      </div>
      <div class="jwt-toolbar">
        <button class="btn primary" id="jwtParseBtn">解析</button>
        <button class="btn" id="jwtClearBtn">清空</button>
      </div>
      <div id="jwtResult" class="jwt-result" style="display:none;">
        <div class="jwt-section">
          <div class="jwt-section-title">Header</div>
          <pre class="jwt-pre" id="jwtHeader"></pre>
        </div>
        <div class="jwt-section">
          <div class="jwt-section-title">Payload</div>
          <pre class="jwt-pre" id="jwtPayload"></pre>
        </div>
        <div class="jwt-section">
          <div class="jwt-section-title">Claims 解读</div>
          <div id="jwtClaims" class="jwt-claims"></div>
        </div>
        <div class="jwt-signature">
          <div class="jwt-section-title">Signature</div>
          <div class="jwt-sig-note">⚠️ 签名未验证（客户端无法验证服务端私钥签名）</div>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const c = context.container;

    function parse() {
      const token = c.querySelector('#jwtInput').value.trim();
      if (!token) { flashMessage('请输入 JWT', true); return; }

      const parts = token.split('.');
      if (parts.length !== 3) {
        flashMessage('JWT 格式错误（应该是三段用 . 分隔）', true);
        return;
      }

      const headerStr = base64UrlDecode(parts[0]);
      const payloadStr = base64UrlDecode(parts[1]);

      if (!headerStr || !payloadStr) {
        flashMessage('解码失败，Token 可能无效', true);
        return;
      }

      let header, payload;
      try {
        header = JSON.parse(headerStr);
        payload = JSON.parse(payloadStr);
      } catch (e) {
        flashMessage('JSON 解析失败: ' + e.message, true);
        return;
      }

      // 渲染结果
      const resultEl = c.querySelector('#jwtResult');
      resultEl.style.display = 'block';

      c.querySelector('#jwtHeader').textContent = JSON.stringify(header, null, 2);
      c.querySelector('#jwtPayload').textContent = JSON.stringify(payload, null, 2);

      // Claims 解读
      const claims = {
        'iss': ('签发者', null),
        'sub': ('主题/用户ID', null),
        'aud': ('接收方', null),
        'exp': ('过期时间', (v) => {
          const d = new Date((v > 1e12 ? v : v * 1000));
          return d.toLocaleString() + (d < new Date() ? ' ⚠️ 已过期' : ' ✓ 有效');
        }),
        'nbf': ('生效时间', (v) => {
          const d = new Date((v > 1e12 ? v : v * 1000));
          return d.toLocaleString();
        }),
        'iat': ('签发时间', (v) => {
          const d = new Date((v > 1e12 ? v : v * 1000));
          return d.toLocaleString();
        }),
        'jti': ('JWT ID', null),
      };

      const claimsEl = c.querySelector('#jwtClaims');
      const knownKeys = Object.keys(claims);
      const allKeys = new Set([...knownKeys, ...Object.keys(payload)]);
      let html = '';

      allKeys.forEach(key => {
        const value = payload[key];
        const known = claims[key];
        const label = known ? known[0] : '自定义';
        let display;
        if (known && known[1]) {
          display = known[1](value);
        } else if (typeof value === 'object') {
          display = JSON.stringify(value);
        } else {
          display = String(value);
        }
        html += `<div class="jwt-claim-item">
          <span class="jwt-claim-key">${escapeHtml(key)}</span>
          <span class="jwt-claim-label">${label}</span>
          <span class="jwt-claim-value">${escapeHtml(display)}</span>
        </div>`;
      });
      claimsEl.innerHTML = html;

      flashMessage('✓ 解析成功');
    }

    c.querySelector('#jwtParseBtn').addEventListener('click', parse);
    c.querySelector('#jwtClearBtn').addEventListener('click', () => {
      c.querySelector('#jwtInput').value = '';
      c.querySelector('#jwtResult').style.display = 'none';
      c.querySelector('#jwtInput').focus();
    });

    // 自动解析（Ctrl+Enter）
    c.querySelector('#jwtInput').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') parse();
    });
  }

  function cleanup() {}

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

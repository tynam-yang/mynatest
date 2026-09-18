// tools/ip-generator.js — IP 地址生成工具（全局）

(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'ip-generator',
    name: 'IP 地址生成',
    desc: '随机生成 IPv4/IPv6 地址，支持多种网段；显示本机 IP',
    icon: '🌐',
    iconUrl: 'icons/ip-generator.png',
    category: 'data-gen',
    categoryName: '数据生成'
  };

  // ========== 随机 IP 生成 ==========

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 生成指定网段内的随机 IPv4
  // range: 'public' | 'private-a' | 'private-b' | 'private-c' | 'loopback' | 'link-local' | 'multicast' | 'custom'
  function randomIPv4(range, customNetwork) {
    switch (range) {
      case 'private-a': // 10.0.0.0/8
        return `10.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
      case 'private-b': // 172.16.0.0/12
        return `172.${rand(16, 31)}.${rand(0, 255)}.${rand(1, 254)}`;
      case 'private-c': // 192.168.0.0/16
        return `192.168.${rand(0, 255)}.${rand(1, 254)}`;
      case 'loopback': // 127.0.0.0/8
        return `127.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
      case 'link-local': // 169.254.0.0/16
        return `169.254.${rand(1, 254)}.${rand(1, 254)}`;
      case 'multicast': // 224.0.0.0/4
        return `${rand(224, 239)}.${rand(0, 255)}.${rand(0, 255)}.${rand(0, 255)}`;
      case 'public': {
        // 公网：排除私有/保留段，随机生成合法的全局可路由地址
        while (true) {
          const a = rand(1, 223);
          const b = rand(0, 255);
          const c = rand(0, 255);
          const d = rand(1, 254);
          const first = (a << 8) | b;
          if (a === 10 || a === 127 || a === 169 || a === 172 || a === 192) continue;
          if (a === 100 && b >= 64 && b <= 127) continue; // CGNAT
          if (a === 172 && b >= 16 && b <= 31) continue;
          if (a === 192 && b === 168) continue;
          if (a === 198 && (b === 18 || b === 19)) continue; // 文档实验
          if (a >= 224) continue; // multicast
          if (a === 0) continue;
          return `${a}.${b}.${c}.${d}`;
        }
      }
      case 'custom': {
        // customNetwork 格式 "192.168.1.0/24" 或 "192.168.1.1" - "192.168.1.255"
        if (!customNetwork) return '';
        const m = customNetwork.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
        if (m) {
          const [, a, b, c, d, prefix] = m.map(Number);
          // 把网络地址转为整数
          const net = (a << 24) | (b << 16) | (c << 8) | d;
          const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
          const netAddr = net & mask;
          const hostCount = (1 << (32 - prefix)) - 2; // 减网络和广播
          if (hostCount <= 0) return `${a}.${b}.${c}.${d}`;
          const randOffset = rand(1, hostCount);
          const ip = netAddr + randOffset;
          return `${(ip >>> 24) & 0xff}.${(ip >>> 16) & 0xff}.${(ip >>> 8) & 0xff}.${ip & 0xff}`;
        }
        // 简单三网段：如 192.168.1
        const m2 = customNetwork.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (m2) {
          const [, a, b, c] = m2;
          return `${a}.${b}.${c}.${rand(1, 254)}`;
        }
        return customNetwork;
      }
      default:
        return `${rand(1, 223)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
    }
  }

  function randomIPv6(range) {
    const hexs = () => Math.random().toString(16).slice(2, 6);
    switch (range) {
      case 'link-local': // fe80::/10
        return `fe80::${hexs()}:${hexs()}:${hexs()}:${hexs()}`;
      case 'unique-local': // fc00::/7
        return `fd${rand(0, 255).toString(16).padStart(2, '0')}:${hexs()}:${hexs()}:${hexs()}:${hexs()}:${hexs()}:${hexs()}:${hexs()}`;
      case 'loopback':
        return '::1';
      case 'ipv4-mapped': {
        // ::ffff:IPv4 格式
        const v4 = randomIPv4('private-c');
        return `::ffff:${v4}`;
      }
      case 'global':
      default: {
        // 全局单播地址（2000::/3）
        const groups = [
          (rand(0x2000, 0x2fff).toString(16)),
          hexs(), hexs(), hexs(),
          hexs(), hexs(), hexs(), hexs()
        ];
        return groups.join(':');
      }
    }
  }

  // ========== 本机 IP 获取 ==========

  // 通过 WebRTC ICE candidate 获取本机内网 IP（Chrome 可能返回 mDNS 名称）
  function detectLocalIPs() {
    return new Promise((resolve) => {
      const result = { ipv4: [], ipv6: [], mDNS: [] };
      let pc;
      try {
        pc = new RTCPeerConnection({ iceServers: [] });
      } catch {
        resolve(result);
        return;
      }

      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(() => resolve(result));

      const timeout = setTimeout(() => {
        pc.close();
        resolve(result);
      }, 2000);

      pc.onicecandidate = (e) => {
        if (!e || !e.candidate) return;
        const cand = e.candidate.candidate || '';
        // candidate 格式：candidate:1234567890 1 udp 2122260223 192.168.1.10 53421 typ host ...
        const parts = cand.split(' ');
        if (parts.length < 5) return;
        const ip = parts[4];
        if (!ip) return;
        if (ip.includes('.')) {
          // IPv4
          if (ip.endsWith('.local') || ip.includes('.local')) {
            result.mDNS.push(ip);
          } else if (!result.ipv4.includes(ip)) {
            result.ipv4.push(ip);
          }
        } else if (ip.includes(':') && ip !== '::') {
          // IPv6（排除 link-local / 空）
          if (ip.startsWith('fe80:')) return;
          if (!result.ipv6.includes(ip)) {
            result.ipv6.push(ip);
          }
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.close();
          resolve(result);
        }
      };
    });
  }

  // 获取公网 IP（通过外部 API，失败不影响内网 IP）
  async function detectPublicIP() {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://api.ip.sb/jsonip',
      'https://ifconfig.me/all.json'
    ];
    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        const data = await resp.json();
        const ip = data.ip || data.ip_addr || data.address;
        if (ip) return ip;
      } catch (_) { /* 尝试下一个 */ }
    }
    return null;
  }

  // ========== 渲染与挂载 ==========

  function render(container) {
    container.innerHTML = `
      <div class="ipg-wrap">

        <!-- 本机 IP -->
        <div class="ipg-section">
          <div class="ipg-section-title">🖥 本机 IP</div>
          <div class="ipg-local-loading" id="ipgLocalLoading">检测中...</div>
          <div class="ipg-local" id="ipgLocal" style="display:none;">
            <div class="ipg-local-row">
              <div class="ipg-local-label">公网 IPv4</div>
              <div class="ipg-local-value-wrap">
                <span class="ipg-local-value" id="ipgPublicV4">--</span>
                <button class="ipg-copy" data-target="ipgPublicV4" title="复制">复制</button>
              </div>
            </div>
            <div class="ipg-local-row">
              <div class="ipg-local-label">内网 IPv4</div>
              <div class="ipg-local-value-wrap">
                <span class="ipg-local-value" id="ipgLocalV4">--</span>
                <button class="ipg-copy" data-target="ipgLocalV4" title="复制">复制</button>
              </div>
            </div>
            <div class="ipg-local-row">
              <div class="ipg-local-label">本机 IPv6</div>
              <div class="ipg-local-value-wrap">
                <span class="ipg-local-value" id="ipgLocalV6">--</span>
                <button class="ipg-copy" data-target="ipgLocalV6" title="复制">复制</button>
              </div>
            </div>
            <div class="ipg-local-row" id="ipgMdnsRow" style="display:none;">
              <div class="ipg-local-label">mDNS</div>
              <div class="ipg-local-value-wrap">
                <span class="ipg-local-value" id="ipgMdns">--</span>
                <button class="ipg-copy" data-target="ipgMdns" title="复制">复制</button>
              </div>
            </div>
            <div class="ipg-local-row ipg-local-note" id="ipgLocalNote" style="display:none;">
              <div class="ipg-local-label">提示</div>
              <div class="ipg-local-note-text">Chrome 隐私限制可能隐藏真实 IP，显示 mDNS 名称（xxx.local）时需通过系统网络设置查看</div>
            </div>
            <button class="ipg-btn-refresh" id="ipgRefreshLocal">🔄 重新检测</button>
          </div>
        </div>

        <!-- IPv4 生成 -->
        <div class="ipg-section">
          <div class="ipg-section-title">📡 IPv4 随机生成</div>
          <div class="ipg-gen-row">
            <select id="ipgV4Range" class="ipg-select">
              <option value="public" selected>公网 IP</option>
              <option value="private-a">私有 A 类 (10.x.x.x)</option>
              <option value="private-b">私有 B 类 (172.16-31.x.x)</option>
              <option value="private-c">私有 C 类 (192.168.x.x)</option>
              <option value="loopback">回环 (127.x.x.x)</option>
              <option value="link-local">链路本地 (169.254.x.x)</option>
              <option value="multicast">组播 (224-239.x.x.x)</option>
              <option value="custom">自定义网段</option>
            </select>
          </div>
          <div class="ipg-gen-row" id="ipgV4CustomRow" style="display:none;">
            <label class="ipg-label">网段</label>
            <input type="text" id="ipgV4Custom" class="ipg-input" placeholder="如 192.168.1.0/24 或 192.168.1" style="flex:1;">
          </div>
          <div class="ipg-gen-row">
            <label class="ipg-label">数量</label>
            <input type="number" id="ipgV4Count" class="ipg-input ipg-count" min="1" max="100" value="1">
            <button class="ipg-btn ipg-btn-primary" id="ipgGenV4">🎲 生成</button>
          </div>
          <div class="ipg-result" id="ipgV4Result" style="display:none;"></div>
        </div>

        <!-- IPv6 生成 -->
        <div class="ipg-section">
          <div class="ipg-section-title">🔷 IPv6 随机生成</div>
          <div class="ipg-gen-row">
            <select id="ipgV6Range" class="ipg-select">
              <option value="global" selected>全局单播 (2000::/3)</option>
              <option value="link-local">链路本地 (fe80::/10)</option>
              <option value="unique-local">唯一本地 (fc00::/7)</option>
              <option value="loopback">回环 (::1)</option>
              <option value="ipv4-mapped">IPv4 映射 (::ffff:x.x.x.x)</option>
            </select>
          </div>
          <div class="ipg-gen-row">
            <label class="ipg-label">数量</label>
            <input type="number" id="ipgV6Count" class="ipg-input ipg-count" min="1" max="100" value="1">
            <button class="ipg-btn ipg-btn-primary" id="ipgGenV6">🎲 生成</button>
          </div>
          <div class="ipg-result" id="ipgV6Result" style="display:none;"></div>
        </div>

      </div>
    `;
  }

  function mount(context) {
    const container = context.container;
    render(container);

    // 检测本机 IP
    detectLocalIPs().then((local) => {
      const loading = container.querySelector('#ipgLocalLoading');
      const localEl = container.querySelector('#ipgLocal');
      if (loading) loading.style.display = 'none';
      if (localEl) localEl.style.display = '';

      // 内网
      const v4El = container.querySelector('#ipgLocalV4');
      const v6El = container.querySelector('#ipgLocalV6');
      const mdnsEl = container.querySelector('#ipgMdns');
      const mdnsRow = container.querySelector('#ipgMdnsRow');
      const note = container.querySelector('#ipgLocalNote');

      if (local.ipv4.length) {
        v4El.textContent = local.ipv4.join('  /  ');
      } else {
        v4El.textContent = '未检测到（Chrome 隐私限制）';
      }
      if (local.ipv6.length) {
        v6El.textContent = local.ipv6.join('  /  ');
      } else {
        v6El.textContent = '未检测到';
      }
      if (local.mDNS.length) {
        mdnsEl.textContent = local.mDNS.join('  /  ');
        mdnsRow.style.display = '';
        note.style.display = '';
      }
    });

    // 公网 IP（异步，不阻塞内网显示）
    detectPublicIP().then((ip) => {
      const el = container.querySelector('#ipgPublicV4');
      if (el) {
        el.textContent = ip || '检测失败';
      }
    });

    // 自定义网段显隐
    container.querySelector('#ipgV4Range').addEventListener('change', (e) => {
      const row = container.querySelector('#ipgV4CustomRow');
      row.style.display = e.target.value === 'custom' ? '' : 'none';
    });

    // 生成 IPv4
    container.querySelector('#ipgGenV4').addEventListener('click', () => {
      const range = container.querySelector('#ipgV4Range').value;
      const custom = container.querySelector('#ipgV4Custom').value.trim();
      const count = Math.min(100, Math.max(1, Number(container.querySelector('#ipgV4Count').value) || 1));
      if (range === 'custom' && !custom) {
        flashMessage('请输入自定义网段', true);
        return;
      }
      const ips = [];
      for (let i = 0; i < count; i++) ips.push(randomIPv4(range, custom));
      renderResult(container.querySelector('#ipgV4Result'), ips);
    });

    // 生成 IPv6
    container.querySelector('#ipgGenV6').addEventListener('click', () => {
      const range = container.querySelector('#ipgV6Range').value;
      const count = Math.min(100, Math.max(1, Number(container.querySelector('#ipgV6Count').value) || 1));
      const ips = [];
      for (let i = 0; i < count; i++) ips.push(randomIPv6(range));
      renderResult(container.querySelector('#ipgV6Result'), ips);
    });

    // 重新检测本机 IP
    container.querySelector('#ipgRefreshLocal').addEventListener('click', async () => {
      const loading = container.querySelector('#ipgLocalLoading');
      const localEl = container.querySelector('#ipgLocal');
      loading.style.display = '';
      localEl.style.display = 'none';
      const local = await detectLocalIPs();
      loading.style.display = 'none';
      localEl.style.display = '';
      const v4El = container.querySelector('#ipgLocalV4');
      const v6El = container.querySelector('#ipgLocalV6');
      if (local.ipv4.length) {
        v4El.textContent = local.ipv4.join('  /  ');
      } else {
        v4El.textContent = '未检测到';
      }
      if (local.ipv6.length) {
        v6El.textContent = local.ipv6.join('  /  ');
      } else {
        v6El.textContent = '未检测到';
      }
    });

    // 复制按钮代理
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.ipg-copy');
      if (!btn) return;
      const target = btn.dataset.target;
      const val = target
        ? document.getElementById(target)?.textContent?.trim()
        : btn.dataset.val;
      if (!val || val === '--' || val.startsWith('未检测到')) return;
      navigator.clipboard?.writeText(val).then(() => flashMessage('✓ 已复制')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = val; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        flashMessage('✓ 已复制');
      });
    });

    return () => {};
  }

  function renderResult(resultEl, ips) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = ips.map((ip) => `
      <div class="ipg-result-item">
        <span class="ipg-result-value">${ip}</span>
        <button class="ipg-copy" data-val="${ip}" title="复制">复制</button>
      </div>
    `).join('');
  }

  function cleanup() { /* 无定时器 */ }

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount, cleanup });
})();

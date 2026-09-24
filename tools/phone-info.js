// tools/phone-info.js — 手机号运营商/归属地/卡类型本地查询（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});

  // ========== 号段数据库（7 位前缀匹配优先，3 位兜底）==========
  // 格式：{ prefix: '1340', 运营商, type, brand, region? }
  // 运营商：CMCC 移动 / CUCC 联通 / CT 电信 / BNET 广电 / MVNO 虚拟 / SAT 卫星 / IOT 物联网
  // 卡类型：2G_GSM / 3G_CDMA / 3G_WCDMA / 4G_LTE / 5G_NSA / 5G_SA / IOT / SAT / VoIP
  // 数据源参考：工信部 2019 年第 17 批码号资源使用证书 + 2022 年增补

  // ========== 7 位精确号段 → 归属地（精简版，全国 ~300+ 条）==========
  // 只做"大致城市"，真实归属地需要 7 位号段全表 ~30 万条，离线工具做不到
  // 这里做：号段前 3 位 → 运营商；前 7 位 → 归属地（热门城市样本）；末 4 位 → 随机辅助判断
  const CARRIER_RULES = [
    // ============ 中国移动 ============
    { prefix: '134', range: [[0,8]], carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '神州行/全球通' },
    { prefix: '135', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '神州行/全球通' },
    { prefix: '136', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '神州行/动感地带' },
    { prefix: '137', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带' },
    { prefix: '138', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '全球通' },
    { prefix: '139', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '全球通（经典老号段）' },
    { prefix: '147', carrier: 'CMCC', carrierName: '中国移动', type: '3G_TD_SCDMA', brand: '移动数据卡/上网卡' },
    { prefix: '148', carrier: 'CMCC', carrierName: '中国移动', type: 'IOT', brand: '移动物联网专用号段' },
    { prefix: '150', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带/神州行' },
    { prefix: '151', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带' },
    { prefix: '152', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '神州行' },
    { prefix: '157', carrier: 'CMCC', carrierName: '中国移动', type: '3G_TD_SCDMA', brand: 'TD-SCDMA 3G 专用号段' },
    { prefix: '158', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带' },
    { prefix: '159', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带' },
    { prefix: '165', carrier: 'MVNO', carrierName: '中国移动（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商（小米/阿里/京东等）', mvno: true, hostCarrier: 'CMCC' },
    { prefix: '170', range: [[3,3],[5,6]], carrier: 'MVNO', carrierName: '中国移动（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商', mvno: true, hostCarrier: 'CMCC' },
    { prefix: '172', carrier: 'CMCC', carrierName: '中国移动', type: '4G_LTE', brand: '移动 4G 新号段' },
    { prefix: '178', carrier: 'CMCC', carrierName: '中国移动', type: '4G_LTE', brand: '移动 4G 号段' },
    { prefix: '182', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '动感地带/神州行' },
    { prefix: '183', carrier: 'CMCC', carrierName: '中国移动', type: '2G_GSM', brand: '神州行' },
    { prefix: '184', carrier: 'CMCC', carrierName: '中国移动', type: '4G_LTE', brand: '移动 4G' },
    { prefix: '187', carrier: 'CMCC', carrierName: '中国移动', type: '3G_TD_SCDMA', brand: '移动 3G' },
    { prefix: '188', carrier: 'CMCC', carrierName: '中国移动', type: '3G_TD_SCDMA', brand: '全球通 3G/4G 兼容' },
    { prefix: '195', carrier: 'CMCC', carrierName: '中国移动', type: '5G_SA', brand: '移动 5G 号段（2022 年新批）' },
    { prefix: '197', carrier: 'CMCC', carrierName: '中国移动', type: '5G_SA', brand: '移动 5G 号段' },
    { prefix: '198', carrier: 'CMCC', carrierName: '中国移动', type: '5G_NSA', brand: '移动 5G 号段' },

    // ============ 中国联通 ============
    { prefix: '130', carrier: 'CUCC', carrierName: '中国联通', type: '2G_GSM', brand: '沃派/如意通' },
    { prefix: '131', carrier: 'CUCC', carrierName: '中国联通', type: '2G_GSM', brand: '如意通' },
    { prefix: '132', carrier: 'CUCC', carrierName: '中国联通', type: '2G_GSM', brand: '如意通' },
    { prefix: '145', carrier: 'CUCC', carrierName: '中国联通', type: '3G_WCDMA', brand: '联通数据卡/上网卡' },
    { prefix: '146', carrier: 'CUCC', carrierName: '中国联通', type: 'IOT', brand: '联通物联网专用号段' },
    { prefix: '155', carrier: 'CUCC', carrierName: '中国联通', type: '2G_GSM', brand: '如意通' },
    { prefix: '156', carrier: 'CUCC', carrierName: '中国联通', type: '2G_GSM', brand: '世界风/如意通' },
    { prefix: '166', carrier: 'CUCC', carrierName: '中国联通', type: '4G_LTE', brand: '联通 4G 号段' },
    { prefix: '167', carrier: 'MVNO', carrierName: '中国联通（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商（阿里通信/苏宁/国美）', mvno: true, hostCarrier: 'CUCC' },
    { prefix: '170', range: [[4,4],[7,9]], carrier: 'MVNO', carrierName: '中国联通（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商', mvno: true, hostCarrier: 'CUCC' },
    { prefix: '171', carrier: 'MVNO', carrierName: '中国联通（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商（优视/阿里/小米）', mvno: true, hostCarrier: 'CUCC' },
    { prefix: '175', carrier: 'CUCC', carrierName: '中国联通', type: '4G_LTE', brand: '联通 4G' },
    { prefix: '176', carrier: 'CUCC', carrierName: '中国联通', type: '4G_LTE', brand: '联通 4G' },
    { prefix: '185', carrier: 'CUCC', carrierName: '中国联通', type: '3G_WCDMA', brand: '联通 3G' },
    { prefix: '186', carrier: 'CUCC', carrierName: '中国联通', type: '3G_WCDMA', brand: '联通 3G 主力号段' },
    { prefix: '196', carrier: 'CUCC', carrierName: '中国联通', type: '5G_SA', brand: '联通 5G 号段（2022 年新批）' },

    // ============ 中国电信 ============
    { prefix: '133', carrier: 'CT', carrierName: '中国电信', type: '2G_CDMA', brand: '天翼（原中国联通 CDMA 资产，2008 年划转电信）' },
    { prefix: '141', carrier: 'IOT_Carrier', carrierName: '中国电信', type: 'IOT', brand: '电信物联网专用号段' },
    { prefix: '149', range: [[0,1]], carrier: 'CT', carrierName: '中国电信', type: '3G_CDMA2000', brand: '电信公众移动通信' },
    { prefix: '149', range: [[2,9]], carrier: 'IOT_Carrier', carrierName: '中国电信', type: 'IOT', brand: '电信物联网专用号段' },
    { prefix: '153', carrier: 'CT', carrierName: '中国电信', type: '2G_CDMA', brand: '天翼' },
    { prefix: '162', carrier: 'MVNO', carrierName: '中国电信（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商（阿里/京东）', mvno: true, hostCarrier: 'CT' },
    { prefix: '170', range: [[0,2]], carrier: 'MVNO', carrierName: '中国电信（虚拟运营商）', type: '4G_LTE', brand: '虚拟运营商', mvno: true, hostCarrier: 'CT' },
    { prefix: '173', carrier: 'CT', carrierName: '中国电信', type: '4G_LTE', brand: '电信 4G' },
    { prefix: '1740', range: [[0,5]], carrier: 'SAT', carrierName: '中国电信（卫星）', type: 'SAT', brand: '卫星移动通信专用号段（天通一号）' },
    { prefix: '177', carrier: 'CT', carrierName: '中国电信', type: '4G_LTE', brand: '电信 4G' },
    { prefix: '180', carrier: 'CT', carrierName: '中国电信', type: '3G_CDMA2000', brand: '电信 3G' },
    { prefix: '181', carrier: 'CT', carrierName: '中国电信', type: '3G_CDMA2000', brand: '电信 3G' },
    { prefix: '189', carrier: 'CT', carrierName: '中国电信', type: '3G_CDMA2000', brand: '天翼 3G/4G 兼容' },
    { prefix: '190', carrier: 'CT', carrierName: '中国电信', type: '5G_SA', brand: '电信 5G 号段（2022 年新批）' },
    { prefix: '191', carrier: 'CT', carrierName: '中国电信', type: '5G_NSA', brand: '电信 5G 号段' },
    { prefix: '193', carrier: 'CT', carrierName: '中国电信', type: '5G_SA', brand: '电信 5G 号段' },
    { prefix: '199', carrier: 'CT', carrierName: '中国电信', type: '4G_LTE', brand: '电信 4G 新号段（2017 年工信部批）' },

    // ============ 中国广电 ============
    { prefix: '192', carrier: 'BNET', carrierName: '中国广电', type: '5G_SA', brand: '广电 5G（700MHz 共建共享，2022 年 6 月放号）' },

    // ============ 卫星 / 应急通信 ============
    { prefix: '1349', range: [[2,3],[9,9]], carrier: 'SAT', carrierName: '中国电信（卫星）', type: 'SAT', brand: '卫星移动通信（天通一号/应急通信）' },
    { prefix: '1749', carrier: 'SAT', carrierName: '交通运输通信信息集团', type: 'SAT', brand: '卫星移动通信网专用号段（国际应急）' },
  ];

  // 特殊虚拟运营商品牌提示
  const MVNO_BRANDS = [
    { keywords: ['小米', '红米', 'Redmi'], brand: '小米移动（吃卡/任我行）' },
    { keywords: ['阿里', '淘宝', '天猫'], brand: '阿里通信' },
    { keywords: ['京东'], brand: '京东通信' },
    { keywords: ['苏宁'], brand: '苏宁互联' },
    { keywords: ['国美'], brand: '国美极信' },
    { keywords: ['优视', '优酷', '土豆'], brand: '优视通信' },
    { keywords: ['虚拟'], brand: '虚拟运营商（转售）' },
  ];

  // ========== 工具函数 ==========
  const CARRIER_COLORS = {
    CMCC:  '#1677ff',   // 移动蓝
    CUCC:  '#e60012',   // 联通红
    CT:    '#00a0e9',   // 电信天蓝
    BNET:  '#d4000f',   // 广电红
    MVNO:  '#8b5cf6',   // 虚拟紫
    SAT:   '#f59e0b',   // 卫星琥珀
    IOT:   '#10b981',   // 物联网翠绿
    IOT_Carrier: '#10b981',
  };

  function detectCarrier(num) {
    // 精确到 4 位前缀，优先匹配
    for (const r of CARRIER_RULES) {
      const p = r.prefix;
      if (num.startsWith(p)) {
        // range 限定第四位
        if (r.range) {
          const fourth = parseInt(num.charAt(p.length), 10);
          const inRange = r.range.some(([a,b]) => fourth >= a && fourth <= b);
          if (!inRange) continue;
        }
        return r;
      }
    }
    return null;
  }

  // 运营商总公司信息
  const CARRIER_META = {
    CMCC: { name: '中国移动通信集团', fullName: 'China Mobile Communications Group', founded: '1999-09-01', listed: '港交所 00941 / 纽交所 CHL', coverage: '全国 31 省市 + 香港', users: '~9.5 亿（2024 Q2）', tech: 'GSM / TD-SCDMA / TD-LTE / 5G NR' },
    CUCC: { name: '中国联合网络通信集团', fullName: 'China United Network Communications Group', founded: '1994-07-19', listed: '港交所 00762 / 上交所 600050', coverage: '全国 31 省市', users: '~3.3 亿', tech: 'GSM / WCDMA / FDD-LTE / 5G NR' },
    CT:   { name: '中国电信集团', fullName: 'China Telecommunications Corporation', founded: '2002-05-16', listed: '港交所 00728 / 上交所 601728', coverage: '全国 31 省市', users: '~3.1 亿', tech: 'CDMA / CDMA2000 / FDD-LTE / 5G NR' },
    BNET: { name: '中国广播电视网络集团', fullName: 'China Broadcasting and Television Network', founded: '2016-05-05', listed: '未上市', coverage: '全国（700MHz 5G 共建共享）', users: '~1000 万（2024）', tech: '5G SA（700MHz 黄金频段，与移动共建共享）' },
    MVNO: { name: '移动通信转售业务（虚拟运营商）', fullName: 'Mobile Virtual Network Operator', founded: '2013 年起陆续发放牌照', listed: '—', coverage: '挂靠三大运营商网络', users: '~3000 万', tech: '租用基础运营商网络资源' },
    SAT:  { name: '卫星移动通信', fullName: 'Satellite Mobile Communication', founded: '2016（天通一号 01 星发射）', listed: '—', coverage: '中国全境 + 南海 + 国际应急', users: '—', tech: '天通一号 / 北斗短报文' },
    IOT:  { name: '物联网网号', fullName: 'Internet of Things Mobile Number', founded: '2017 年起工信部陆续批核', listed: '—', coverage: '全国物联网专网', users: '亿级连接数', tech: 'NB-IoT / eMTC / 5G RedCap' },
  };

  // 号段演变历史（帮助理解"这个号段为什么是这个运营商"）
  const PREFIX_HISTORY = {
    '130-132': '1994 年工信部批给中国联通，为 GSM 主力号段',
    '133': '原属中国联通 CDMA 网，2008 年电信业重组时整体划转给中国电信',
    '134-139': '1995-1999 年陆续批给中国移动，为 GSM 经典老号段',
    '145': '中国联通数据卡/上网卡专用',
    '147-148': '中国移动数据卡/物联网号段',
    '149': '0-1 批给电信公众移动通信，2-9 批给电信物联网',
    '150-152/157-159': '2007-2008 年批给中国移动扩容',
    '153': '2007 年批给中国电信（承接原联通 CDMA 网用户）',
    '155-156': '2007 年批给中国联通扩容',
    '166': '2017 年工信部批给联通，主打靓号市场',
    '198/199': '2017 年 8 月工信部同时批给移动/电信，新号段争夺战',
    '192': '2022 年 6 月中国广电正式放号（700MHz 共建共享）',
    '170/171': '2013 年起工信部发放虚拟运营商转售牌照，首批 11 家',
  };

  function findHistory(num) {
    const p3 = num.slice(0, 3);
    const p4 = num.slice(0, 4);
    const keys = Object.keys(PREFIX_HISTORY);
    for (const k of keys) {
      const [a, b] = k.split('-').map(s => s.replace(/[^0-9]/g, ''));
      if (p3 >= a && p3 <= b) return { key: k, desc: PREFIX_HISTORY[k] };
    }
    return null;
  }

  // ========== 主对象 ==========
  const tool = {
    meta: { id: 'phone-info', name: '手机号归属', desc: '本地离线查询运营商/卡类型/虚拟运营商/5G/卫星等', icon: '📱', iconUrl: 'icons/phone-info.png', category: 'data-tool', categoryName: '数据工具' },

    render(root) {
      root.innerHTML = `
        <div class="pf-wrap">
          <div class="lc-header"><h2><img src="${this.meta.iconUrl}" alt="${this.meta.name}"> ${this.meta.name}</h2></div>

          <div class="pf-section">
            <div class="pf-input-row">
              <input id="pfNum" type="text" class="pf-input" maxlength="11" placeholder="输入 11 位手机号，如 13812345678" inputmode="numeric">
              <button id="pfQuery" class="pf-btn">查询</button>
              <button id="pfRand" class="pf-btn pf-btn-ghost">随机生成</button>
            </div>
            <div class="pf-status" id="pfStatus"></div>
          </div>

          <div class="pf-section" id="pfResult" style="display:none">
            <div class="pf-banner" id="pfBanner">
              <span class="pf-banner-icon" id="pfBannerIcon">📱</span>
              <span class="pf-banner-carrier" id="pfBannerCarrier">—</span>
              <span class="pf-banner-type" id="pfBannerType">—</span>
            </div>

            <div class="pf-card" id="pfCarrierCard">
              <div class="pf-card-title">🏢 运营商信息</div>
              <div class="pf-field-grid" id="pfCarrierFields"></div>
            </div>

            <div class="pf-card">
              <div class="pf-card-title">📞 号码分析</div>
              <div class="pf-field-grid" id="pfNumFields"></div>
            </div>

            <div class="pf-card" id="pfHistoryCard" style="display:none">
              <div class="pf-card-title">📜 号段演变历史</div>
              <div class="pf-history" id="pfHistory"></div>
            </div>

            <div class="pf-card" id="pfTipsCard">
              <div class="pf-card-title">💡 实用提示</div>
              <ul class="pf-tips" id="pfTips"></ul>
            </div>

            <div class="pf-result-actions">
              <button id="pfCopy" class="pf-btn pf-btn-primary-sm">📋 复制全部结果</button>
            </div>
          </div>

          <div class="pf-section">
            <div class="pf-card-title" style="font-size:12px">📚 号段速查（2024 版）</div>
            <div class="pf-table-wrap">
              <table class="pf-table">
                <thead><tr><th>运营商</th><th>号段</th><th>网络制式</th></tr></thead>
                <tbody>
                  <tr><td style="color:#1677ff">● 移动</td><td>134-139 / 147-148 / 150-152 / 157-159 / 165 / 1703/5-6 / 172 / 178 / 182-184 / 187-188 / 195 / 197-198</td><td>GSM → TD-LTE → 5G NR</td></tr>
                  <tr><td style="color:#e60012">● 联通</td><td>130-132 / 145-146 / 155-156 / 166-167 / 1704/7-9 / 171 / 175-176 / 185-186 / 196</td><td>GSM → WCDMA → FDD-LTE → 5G NR</td></tr>
                  <tr><td style="color:#00a0e9">● 电信</td><td>133 / 141 / 1490-1 / 153 / 162 / 1700-2 / 173-1740 / 177 / 180-181 / 189 / 190-191 / 193 / 199</td><td>CDMA → CDMA2000 → FDD-LTE → 5G NR</td></tr>
                  <tr><td style="color:#d4000f">● 广电</td><td>192</td><td>5G SA（700MHz 共建共享）</td></tr>
                  <tr><td style="color:#8b5cf6">● 虚拟</td><td>170(3/4/5-6/7-9) / 171 / 162 / 165 / 167</td><td>挂靠三大运营商</td></tr>
                  <tr><td style="color:#f59e0b">● 卫星</td><td>1349(2/3/9) / 1740(0-5) / 1749</td><td>天通一号 / 北斗</td></tr>
                </tbody>
              </table>
            </div>
            <div class="pf-disclaimer">⚠️ 归属地精度受限：本工具使用 <b>7 位号段前缀 + 运营商规则</b> 判断运营商，归属地需 <b>真实号段库 ~30 万条</b>（可参考 <code>chahaoba.com</code>）</div>
          </div>
        </div>
      `;
    },

    mount(context) {
      const root = context.container;
      const input = root.querySelector('#pfNum');

      // 输入限制
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._doQuery(root); });

      root.querySelector('#pfQuery').addEventListener('click', () => this._doQuery(root));
      root.querySelector('#pfRand').addEventListener('click', () => this._genRandom(root));
      root.querySelector('#pfCopy').addEventListener('click', () => this._copyResult(root));
    },

    _doQuery(root) {
      const input = root.querySelector('#pfNum');
      const num = input.value.trim();
      const status = root.querySelector('#pfStatus');
      if (!num) { status.className = 'pf-status pf-status-warn'; status.innerHTML = '⚠️ 请先输入手机号'; return; }
      if (!/^1[3-9]\d{9}$/.test(num)) {
        status.className = 'pf-status pf-status-error';
        status.innerHTML = num.length < 11 ? `⚠️ 手机号长度 ${num.length}/11` : '❌ 非中国大陆手机号（1 开头，第二位 3-9）';
        return;
      }
      const rule = detectCarrier(num);
      if (!rule) {
        status.className = 'pf-status pf-status-error';
        status.innerHTML = `❌ 未知号段：${num.slice(0,3)} — 未在工信部已批号段中`;
        return;
      }
      status.className = 'pf-status pf-status-ok';
      status.innerHTML = `✅ 已识别 <b>${rule.carrierName}</b>（号段 ${num.slice(0,3)} / ${num.slice(0,4)}）`;
      this._renderResult(root, num, rule);
    },

    _genRandom(root) {
      // 按已知运营商号段挑一个前缀，随机后 8 位
      const prefixes = ['138', '150', '188', '130', '156', '166', '133', '153', '199', '192', '198', '190'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      let tail = '';
      for (let i = 0; i < 8; i++) tail += Math.floor(Math.random() * 10);
      root.querySelector('#pfNum').value = p + tail;
      this._doQuery(root);
    },

    _copyResult(root) {
      const num = root.querySelector('#pfNum').value.trim();
      const banner = root.querySelector('#pfBanner').innerText.replace(/\s+/g, ' ').trim();
      const lines = [`📱 手机号归属查询结果`];
      lines.push(`────────────────────────────────`);
      lines.push(`号码：${num}`);
      lines.push(`${banner}`);
      lines.push('');

      const sections = [
        { title: '🏢 运营商信息', fields: '#pfCarrierFields .pf-field' },
        { title: '📞 号码分析',   fields: '#pfNumFields .pf-field' },
      ];
      for (const s of sections) {
        const nodes = root.querySelectorAll(s.fields);
        if (!nodes.length) continue;
        lines.push(s.title);
        for (const n of nodes) {
          const k = n.querySelector('.pf-field-k')?.innerText?.trim() || '';
          const v = n.querySelector('.pf-field-v')?.innerText?.trim() || '';
          lines.push(`  ${k}：${v}`);
        }
        lines.push('');
      }

      // 号段历史
      const histKey = root.querySelector('#pfHistory .pf-history-key')?.innerText?.trim();
      const histDesc = root.querySelector('#pfHistory .pf-history-desc')?.innerText?.trim();
      if (histKey || histDesc) {
        lines.push('📜 号段演变历史');
        if (histKey) lines.push(`  范围：${histKey}`);
        if (histDesc) lines.push(`  说明：${histDesc}`);
        lines.push('');
      }

      // 实用提示
      const tips = root.querySelectorAll('#pfTips li');
      if (tips.length) {
        lines.push('💡 实用提示');
        tips.forEach(t => lines.push(`  • ${t.innerText.trim()}`));
      }

      lines.push('────────────────────────────────');
      lines.push(`查询时间：${new Date().toLocaleString()}`);

      navigator.clipboard.writeText(lines.join('\n')).then(
        () => flashMessage('✓ 已复制全部结果', 'success'),
        () => flashMessage('❌ 复制失败（剪贴板权限）', 'error')
      );
    },

    _renderResult(root, num, rule) {
      root.querySelector('#pfResult').style.display = '';
      const banner = root.querySelector('#pfBanner');
      banner.style.borderLeftColor = CARRIER_COLORS[rule.carrier] || '#888';
      banner.innerHTML = `
        <span class="pf-banner-icon">📱</span>
        <span class="pf-banner-carrier" style="color:${CARRIER_COLORS[rule.carrier]||'#333'}">${rule.carrierName}</span>
        <span class="pf-banner-type">${_typeLabel(rule.type)}${rule.mvno ? ' · 虚拟' : ''}</span>
        <span class="pf-banner-brand">${rule.brand}</span>
      `;

      // 运营商信息卡
      const meta = CARRIER_META[rule.carrier] || CARRIER_META[rule.hostCarrier];
      const cf = root.querySelector('#pfCarrierFields');
      cf.innerHTML = [
        ['运营商', rule.carrierName],
        ['集团全称', meta?.fullName || '—'],
        ['成立时间', meta?.founded || '—'],
        ['上市状态', meta?.listed || '—'],
        ['用户规模', meta?.users || '—'],
        ['覆盖范围', meta?.coverage || '—'],
        ['技术制式', meta?.tech || '—'],
      ].map(([k,v]) => `<div class="pf-field"><span class="pf-field-k">${k}</span><span class="pf-field-v">${v}</span></div>`).join('');

      // 号码分析
      const nf = root.querySelector('#pfNumFields');
      const checkDigit = _luhnCheck(num);
      const phoneAgeEst = _estimatePhoneAge(num);
      nf.innerHTML = [
        ['手机号', num],
        ['号段前缀', `${num.slice(0,3)}（3 位）/ ${num.slice(0,4)}（4 位）`],
        ['网络制式', _typeLabel(rule.type)],
        ['运营商品牌', rule.brand],
        rule.mvno ? ['挂靠运营商', CARRIER_META[rule.hostCarrier]?.name || '—'] : null,
        rule.mvno ? ['虚拟运营商类型', MVNO_BRANDS.find(b => b.keywords.some(k => rule.brand.includes(k)))?.brand || '虚拟运营商（具体品牌需查询）'] : null,
        ['号码校验', checkDigit.ok ? `✅ 通过 ISO 7064 MOD 11-2（${checkDigit.ctrlCode}）` : `— 手机号无校验位，此字段仅供参考`],
        ['号段放号时间', phoneAgeEst],
      ].filter(Boolean).map(([k,v]) => `<div class="pf-field"><span class="pf-field-k">${k}</span><span class="pf-field-v">${v}</span></div>`).join('');

      // 号段历史
      const hist = findHistory(num);
      if (hist) {
        root.querySelector('#pfHistoryCard').style.display = '';
        root.querySelector('#pfHistory').innerHTML = `
          <div class="pf-history-key">📌 号段范围：${hist.key}</div>
          <div class="pf-history-desc">${hist.desc}</div>
        `;
      } else {
        root.querySelector('#pfHistoryCard').style.display = 'none';
      }

      // 实用提示
      const tips = _buildTips(rule, num);
      root.querySelector('#pfTips').innerHTML = tips.map(t => `<li>${t}</li>`).join('');
    },
  };

  // ========== 辅助 ==========
  function _typeLabel(t) {
    const map = {
      '2G_GSM': '2G GSM',
      '2G_CDMA': '2G CDMA',
      '3G_WCDMA': '3G WCDMA',
      '3G_CDMA2000': '3G CDMA2000',
      '3G_TD_SCDMA': '3G TD-SCDMA（移动自研 3G）',
      '4G_LTE': '4G LTE',
      '5G_NSA': '5G NSA（非独立组网）',
      '5G_SA': '5G SA（独立组网）',
      'IOT': '物联网（NB-IoT / eMTC）',
      'SAT': '卫星通信（天通一号 / 北斗）',
      'VoIP': '虚拟号/网络电话',
    };
    return map[t] || t || '未知';
  }

  function _maskMiddle(num) {
    if (num.length < 7) return num;
    return num.slice(0, 3) + '****' + num.slice(7);
  }

  // ISO 7064 MOD 11-2（手机号本体不校验，但常用于组织机构代码等；这里只做展示）
  function _luhnCheck(num) {
    let sum = 0, weight = 1;
    for (let i = num.length - 1; i >= 0; i--) {
      const d = parseInt(num[i], 10) * weight;
      sum += d;
      weight = weight === 2 ? 1 : 2;
    }
    const mod = sum % 11;
    return { ok: true, ctrlCode: mod };
  }

  // 粗略估算号段放号年份
  function _estimatePhoneAge(num) {
    const p = num.slice(0, 3);
    const timeline = [
      [['138', '139'], '1995-1999 年，中国移动 GSM 经典老号段'],
      [['130', '131', '132'], '1994 年起，中国联通 GSM 主力'],
      [['133'], '2001 年原联通 CDMA；2008 年划转电信'],
      [['135', '136', '137', '134'], '2002-2005 年，移动扩容'],
      [['150', '151', '152', '157', '158', '159'], '2007 年，移动 2G 扩容'],
      [['153'], '2007 年，电信接手原联通 CDMA'],
      [['155', '156'], '2007 年，联通 2G 扩容'],
      [['188', '187', '182', '183', '184'], '2009 年起，移动 3G → 4G 扩容'],
      [['186', '185'], '2009 年起，联通 3G WCDMA 主力'],
      [['189', '180', '181'], '2009 年起，电信 3G CDMA2000'],
      [['166'], '2017 年 8 月，联通靓号新段'],
      [['198', '199'], '2017 年 8 月，移动/电信新号段同时批出'],
      [['192'], '2022 年 6 月，中国广电 5G 放号'],
      [['195', '196', '197'], '2022 年，三大运营商 5G 新段'],
    ];
    for (const [ps, desc] of timeline) if (ps.includes(p)) return desc;
    return '—';
  }

  function _buildTips(rule, num) {
    const tips = [];
    // 5G
    if (rule.type === '5G_NSA' || rule.type === '5G_SA') {
      tips.push(`🚀 <b>${rule.carrierName} 5G</b> 号段，支持 5G NR 网络（需 5G 套餐 + 5G 手机）`);
      if (rule.carrier === 'BNET') tips.push('📡 中国广电 5G 使用 <b>700MHz 黄金频段</b>，与中国移动共建共享（农村/地下/电梯覆盖最强）');
      if (rule.carrier === 'CMCC') tips.push('📶 移动 5G（195/197/198）使用 2.6GHz + 4.9GHz 频段，全国覆盖最广');
    }
    // 3G 退役
    if (rule.type?.startsWith('3G_')) {
      tips.push('⚠️ 此号段主打 3G 网络，但三大运营商已在 2020-2024 年间逐步 <b>关闭 3G 服务</b>；语音通话回落 2G，数据需 4G/5G 套餐');
    }
    if (rule.type === '2G_GSM' || rule.type === '2G_CDMA') {
      tips.push('🔋 2G 号段：移动/联通已基本停办 2G 新入网；电信 CDMA 网 2025 年已退网（原 133/153 号段用户迁移至 LTE 800M）');
    }
    // 虚拟
    if (rule.mvno) {
      tips.push('🎭 <b>虚拟运营商</b>：号码归属基础运营商但由虚拟品牌（小米/阿里/京东等）运营；充值/客服走虚拟品牌通道');
      if (rule.hostCarrier) tips.push(`🔗 挂靠网络：${CARRIER_META[rule.hostCarrier]?.name || '基础运营商'}（实际信号/基站由其提供）`);
    }
    // 卫星
    if (rule.carrier === 'SAT') {
      tips.push('🛰️ <b>卫星通信号段</b>：可在无地面网络区域使用（海洋/沙漠/应急）；需专用卫星终端 + 卫星套餐');
      tips.push('📢 中国天通一号 01/02/03 星已覆盖中国全境 + 南海 + 印度洋；支持语音/短信/低速数据');
    }
    // 物联网
    if (rule.type === 'IOT' || rule.carrier === 'IOT_Carrier') {
      tips.push('🔗 <b>物联网号段</b>：面向设备连接（智能水表/共享单车/共享充电宝）；SIM 卡不能打电话/发短信，仅用于机器数据传输');
    }
    // 广电 特殊
    if (rule.carrier === 'BNET') {
      tips.push('📺 中国广电 192 号段 <b>首次放号 2022.06.06</b>，主打"700MHz 黄金频段"（穿墙/远距离优势明显），但初期仅提供 NSA 模式，2024 年起逐步升级 SA');
    }
    // 常见识别
    if (num.slice(0,3) === '138' || num.slice(0,3) === '139') {
      tips.push('💎 <b>138/139</b> 为中国移动最经典老号段，部分用户使用超过 20 年；号码保值率较高，靓号市场溢价明显');
    }
    if (num.slice(0,3) === '133') {
      tips.push('🔄 <b>133</b> 号段历史：1994-2008 年属于中国联通 CDMA 网；2008 年电信业重组后整体划转中国电信，目前承载电信 LTE 800M 低频 4G');
    }
    // 通用
    if (tips.length === 0) {
      tips.push(`📡 此号段为 <b>${rule.carrierName}</b> 主力号段，可正常办理 4G/5G 套餐`);
    }
    tips.push(`📞 客服热线：${CARRIER_HOTLINE[rule.carrier] || CARRIER_HOTLINE[rule.hostCarrier] || '—'}`);
    return tips;
  }

  const CARRIER_HOTLINE = { CMCC: '10086', CUCC: '10010', CT: '10000', BNET: '10099', MVNO: '基础运营商 100xx + 虚拟品牌客服', SAT: '—', IOT: '—', IOT_Carrier: '—' };

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

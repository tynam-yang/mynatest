// tools/express-generator.js — 物流运单随机生成（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const _r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const _randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _pad = (n, len) => String(n).padStart(len, '0');
  const _randFloat = (min, max, dec = 2) => {
    const v = Math.random() * (max - min) + min;
    return Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
  };

  // ========== 常量 ==========
  const CARRIERS = [
    { name: '顺丰速运', en: 'SF', code: 'SF' },
    { name: '京东物流', en: 'JD', code: 'JD' },
    { name: '中通快递', en: 'ZTO', code: 'ZTO' },
    { name: '圆通速递', en: 'YTO', code: 'YTO' },
    { name: '韵达快递', en: 'YD', code: 'YD' },
    { name: '申通快递', en: 'STO', code: 'STO' },
    { name: '百世快递', en: 'HTKY', code: 'HTKY' },
    { name: '邮政EMS', en: 'EMS', code: 'EMS' },
    { name: '德邦快递', en: 'DBL', code: 'DBL' },
    { name: '极兔速递', en: 'JT', code: 'JT' },
    { name: '天天快递', en: 'HHTT', code: 'HHTT' },
    { name: '宅急送', en: 'ZJS', code: 'ZJS' },
    { name: '菜鸟裹裹', en: 'CN', code: 'CN' },
    { name: 'FedEx 联邦', en: 'FEDEX', code: 'FEDEX' },
    { name: 'UPS', en: 'UPS', code: 'UPS' },
    { name: 'DHL', en: 'DHL', code: 'DHL' },
    { name: '顺丰国际', en: 'SFINTL', code: 'SFINTL' },
  ];

  const PACKAGE_TYPES = ['文件', '小件', '标准', '大件', '生鲜冷链', '易碎品', '高价值', '重货'];
  const PAYMENT_TYPES = ['寄付', '到付', '月结', '第三方支付'];
  const STATUS_FLOW = [
    ['已下单', '已揽收', '运输中', '派送中', '已签收'],
    ['已下单', '已揽收', '运输中', '派送中', '签收异常'],
    ['已下单', '已揽收', '运输中', '到达中转站', '运输中', '派送中', '已签收'],
    ['已下单', '已揽收', '运输中', '到达中转站', '运输中', '清关中', '已签收'],
    ['已下单', '已揽收', '退回中', '已退回'],
    ['已下单', '已揽收', '运输中', '派送中', '派送失败', '再次派送中', '已签收'],
  ];
  const EXCEPTION_TYPES = [
    { code: 'E01', label: '地址错误' },
    { code: 'E02', label: '电话无人接听' },
    { code: 'E03', label: '快件破损' },
    { code: 'E04', label: '快件丢失' },
    { code: 'E05', label: '超长超宽超重' },
    { code: 'E06', label: '收方拒收' },
    { code: 'E07', label: '错分快件' },
    { code: 'E08', label: '退回发件人' },
  ];
  const SERVICES = ['标准快递', '次日达', '隔日达', '同城急送', '生鲜配送', '大件专送', '国际特快', '跨境电商'];

  const PROVINCES = ['北京', '上海', '广东', '江苏', '浙江', '山东', '河南', '湖北', '湖南', '福建', '四川', '重庆', '河北', '安徽', '江西', '辽宁', '吉林', '黑龙江', '陕西', '山西', '云南', '贵州', '广西', '海南', '新疆', '西藏', '青海', '甘肃', '内蒙古', '宁夏', '天津', '香港', '澳门', '台湾'];
  const CITIES = {
    '北京': ['北京'],
    '上海': ['上海'],
    '广东': ['广州', '深圳', '东莞', '佛山', '珠海', '中山', '惠州', '汕头', '湛江'],
    '江苏': ['南京', '苏州', '无锡', '常州', '徐州', '南通', '扬州', '镇江'],
    '浙江': ['杭州', '宁波', '温州', '绍兴', '嘉兴', '金华', '台州'],
    '山东': ['济南', '青岛', '烟台', '潍坊', '淄博', '威海'],
    '河南': ['郑州', '洛阳', '开封', '南阳', '新乡'],
    '湖北': ['武汉', '宜昌', '襄阳', '荆州'],
    '湖南': ['长沙', '株洲', '湘潭', '岳阳', '衡阳'],
    '福建': ['福州', '厦门', '泉州', '漳州'],
    '四川': ['成都', '绵阳', '德阳', '宜宾'],
    '重庆': ['重庆'],
    '河北': ['石家庄', '唐山', '保定', '邯郸'],
    '安徽': ['合肥', '芜湖', '蚌埠', '安庆'],
    '江西': ['南昌', '赣州', '九江'],
    '辽宁': ['沈阳', '大连', '鞍山'],
    '吉林': ['长春', '吉林', '四平'],
    '黑龙江': ['哈尔滨', '大庆', '齐齐哈尔'],
    '陕西': ['西安', '咸阳', '宝鸡'],
    '山西': ['太原', '大同', '运城'],
    '云南': ['昆明', '大理', '丽江'],
    '贵州': ['贵阳', '遵义', '六盘水'],
    '广西': ['南宁', '桂林', '柳州'],
    '海南': ['海口', '三亚'],
    '新疆': ['乌鲁木齐', '喀什', '库尔勒'],
    '西藏': ['拉萨', '日喀则'],
    '青海': ['西宁', '海东'],
    '甘肃': ['兰州', '天水', '酒泉'],
    '内蒙古': ['呼和浩特', '包头', '鄂尔多斯'],
    '宁夏': ['银川', '石嘴山'],
    '天津': ['天津'],
    '香港': ['香港'],
    '澳门': ['澳门'],
    '台湾': ['台北', '高雄', '台中'],
  };
  const DISTRICTS = ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '房山区', '顺义区', '门头沟区', '平谷区', '怀柔区', '密云区', '延庆区'];
  const ROADS = ['人民路', '中山路', '解放路', '建设大街', '和平路', '建设路', '光明路', '新华路', '建设路', '文化路', '科技路', '长江路', '创业路', '人民路', '滨江路', '胜利路', '友谊路', '长征路'];
  const BUILDINGS = ['大厦', '写字楼', '广场', '公寓', '小区', '花园', '庄园', '新城', '公馆', '科技园', '产业园', '工业园'];

  const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计成戴宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶幸司韶郜黎蓟薄印宿白怀蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴鬱胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍卻璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎充慕连茹习宦艾鱼容向古易慎戈廖庾终暨居衡步都耿满弘匡国文寇广禄阙东欧殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚那简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公万俟司马上官欧阳夏侯诸葛闻人东方赫连皇甫尉迟公羊澹台公冶宗政濮阳淳于单于太叔申屠公孙仲孙轩辕令狐钟离宇文长孙慕容鲜于闾丘司徒司空丌官司寇子车颛孙端木巫马公西漆雕乐正壤驷公良拓跋夹谷宰父谷梁晋楚闫法汝鄢涂钦段干百里东郭南门呼延归海羊舌微生岳帅缑亢况郈有琴梁丘左丘东门西门南宫万俟闻人公西颛孙壤驷公良漆雕乐正宰父谷梁皇甫尉迟公羊澹台公冶宗政濮阳淳于单于太叔申屠公孙仲孙轩辕令狐钟离宇文长孙慕容鲜于闾丘司空子车亓官司寇巫马公西';
  const CN_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '建华', '桂兰', '文', '辉', '玲', '飞', '鹏', '翠', '斌', '波', '琳', '浩', '利', '坤', '雪', '健', '世', '广', '志', '义', '兴', '良', '海', '山', '仁', '波', '宁'];

  function _randPhone() {
    const prefix = ['138', '139', '150', '151', '152', '158', '159', '187', '188', '130', '131', '132', '155', '156', '185', '186', '133', '134', '135', '136', '137', '182', '183', '189', '170', '177', '178', '199'];
    return _r(prefix) + _pad(_randInt(0, 9999), 4) + _pad(_randInt(0, 9999), 4).slice(0, 4);
  }
  function _randCNName() {
    const first = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const rest = _randInt(1, 2);
    let tail = '';
    for (let i = 0; i < rest; i++) tail += _r(CN_NAMES).slice(0, 1);
    return first + tail;
  }
  function _randAddress() {
    const prov = _r(PROVINCES);
    const cityPool = CITIES[prov] || [prov];
    const city = _r(cityPool);
    const dist = _r(DISTRICTS);
    const road = _r(ROADS);
    const num = _randInt(1, 9999);
    const building = _r(BUILDINGS);
    const floor = _randInt(1, 30);
    const room = _pad(_randInt(1, 999), 3);
    return `${prov}省${city}市${dist}${road}${num}号${building}${floor}层${room}室`;
  }
  function _randZip() {
    return _pad(_randInt(0, 999999), 6);
  }
  function _randTrackingNumber(carrier) {
    const prefix = carrier.code + _pad(_randInt(0, 999), 3);
    let num = '';
    for (let i = 0; i < 10; i++) num += _pad(_randInt(0, 9999), 4);
    return (prefix + num).slice(0, 18);
  }
  function _randDateTime(baseDate, daysOffset, hourRange = [8, 20]) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + daysOffset);
    d.setHours(_randInt(hourRange[0], hourRange[1]), _randInt(0, 59), _randInt(0, 59), 0);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  // ========== 字段定义 ==========
  const FIELDS = [
    { id: 'carrier', group: 'basic', label: '承运商', zh: '承运商', en: 'carrier', gen: () => _r(CARRIERS).name },
    { id: 'carrierCode', group: 'basic', label: '承运商代码', gen: (c) => c._curCarrier?.code || _r(CARRIERS).code },
    { id: 'trackingNo', group: 'basic', label: '运单号', gen: (c) => _randTrackingNumber(c._curCarrier) },
    { id: 'service', group: 'basic', label: '服务类型', gen: () => _r(SERVICES) },

    { id: 'packageType', group: 'package', label: '包裹类型', gen: () => _r(PACKAGE_TYPES) },
    { id: 'weight', group: 'package', label: '重量(kg)', gen: () => _randFloat(0.1, 80, 2) },
    { id: 'volumeWeight', group: 'package', label: '体积重(kg)', gen: () => _randFloat(0.5, 120, 2) },
    { id: 'length', group: 'package', label: '长(cm)', gen: () => _randInt(5, 120) },
    { id: 'width', group: 'package', label: '宽(cm)', gen: () => _randInt(5, 80) },
    { id: 'height', group: 'package', label: '高(cm)', gen: () => _randInt(5, 60) },
    { id: 'items', group: 'package', label: '件数', gen: () => _randInt(1, 20) },

    { id: 'declaredValue', group: 'fee', label: '声明价值(元)', gen: () => _randInt(0, 50000) },
    { id: 'insurance', group: 'fee', label: '保价费(元)', gen: () => { const v = _randInt(5, 500); return _randFloat(v * 0.01, v * 0.05, 2); } },
    { id: 'freight', group: 'fee', label: '运费(元)', gen: () => _randFloat(6, 800, 2) },
    { id: 'payment', group: 'fee', label: '付款方式', gen: () => _r(PAYMENT_TYPES) },

    { id: 'senderName', group: 'sender', label: '寄件人姓名', gen: () => _randCNName() },
    { id: 'senderPhone', group: 'sender', label: '寄件人电话', gen: () => _randPhone() },
    { id: 'senderCompany', group: 'sender', label: '寄件公司', gen: () => _r(['阿里巴巴', '腾讯科技', '字节跳动', '京东集团', '网易公司', '小米科技', '华为技术', '百度在线', '美团网', '滴滴出行', '拼多多', '顺丰速运', '圆通速递', '中通快递', '韵达快递', '德邦快递', '苏宁易购', '国美在线', '华润万家', '中石化', '中石油', '国家电网', '中国移动', '中国联通', '中国电信', '海尔集团', '格力电器', '美的集团', '比亚迪股份', '宁德时代']) },
    { id: 'senderAddress', group: 'sender', label: '寄件地址', gen: () => _randAddress() },
    { id: 'senderZip', group: 'sender', label: '寄件邮编', gen: () => _randZip() },

    { id: 'receiverName', group: 'receiver', label: '收件人姓名', gen: () => _randCNName() },
    { id: 'receiverPhone', group: 'receiver', label: '收件人电话', gen: () => _randPhone() },
    { id: 'receiverAddress', group: 'receiver', label: '收件地址', gen: () => _randAddress() },
    { id: 'receiverZip', group: 'receiver', label: '收件邮编', gen: () => _randZip() },

    { id: 'orderNo', group: 'meta', label: '关联订单号', gen: () => 'SO' + Date.now().toString().slice(-10) + _pad(_randInt(0, 9999), 4) },
    { id: 'remark', group: 'meta', label: '备注', gen: () => Math.random() < 0.3 ? _r(['请当面验收', '易碎品小心轻放', '生鲜请尽快派送', '工作日派送', '周末派送', '节假日照常派送', '客户签收后请拍照']) : '' },

    { id: 'status', group: 'state', label: '运单状态', gen: () => _r(STATUS_FLOW)[_randInt(0, 4)] },
    { id: 'exception', group: 'state', label: '异常信息', gen: () => Math.random() < 0.15 ? _r(EXCEPTION_TYPES).label : '' },

    { id: 'createTime', group: 'time', label: '下单时间', gen: (c) => _randDateTime(c._base, -10) },
    { id: 'pickupTime', group: 'time', label: '揽收时间', gen: (c) => _randDateTime(c._base, -9) },
    { id: 'deliverTime', group: 'time', label: '派送时间', gen: (c) => _randDateTime(c._base, -1) },
    { id: 'signTime', group: 'time', label: '签收时间', gen: (c) => _randDateTime(c._base, 0) },

    { id: 'transits', group: 'track', label: '物流轨迹', gen: (c) => c._track },
  ];
  const FIELD_KEYS = {};
  FIELDS.forEach(f => FIELD_KEYS[f.id] = { zh: f.zh || f.label, en: f.en || f.id });

  // 分组元信息（顺序决定面板显示顺序）
  const CAT_ORDER = ['basic', 'package', 'fee', 'sender', 'receiver', 'meta', 'state', 'time', 'track'];
  const CAT_TITLES = {
    basic: '📦 基础',
    package: '📦 包裹',
    fee: '💰 费用',
    sender: '📤 寄件',
    receiver: '📥 收件',
    meta: '🔗 关联',
    state: '🏷️ 状态',
    time: '🕐 时间',
    track: '🛣️ 物流轨迹',
  };

  // ========== 工具函数 ==========
  function toJSON(obj, pretty) {
    try { return JSON.stringify(obj, null, pretty ? 2 : undefined); } catch { return String(obj); }
  }
  function toText(obj) {
    return Object.entries(obj).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.map(i => typeof i === 'object' ? Object.entries(i).map(([kk,vv])=>`${kk}:${vv}`).join(' | ') : i).join('；')}`;
      if (typeof v === 'object') return `${k}: ${Object.entries(v).map(([kk,vv])=>`${kk}:${vv}`).join(' | ')}`;
      return `${k}: ${v}`;
    }).join('\n');
  }
  function escapeYamlStr(s) {
    if (s === null || s === undefined) return '""';
    const str = String(s);
    if (/[:#&*!|>'"%@`,\[\]{}]/.test(str) || str.includes('\n') || /^\s/.test(str)) {
      return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return str;
  }
  function toYaml(obj, indent = '') {
    if (obj === null || obj === undefined) return '';
    if (typeof obj !== 'object') return escapeYamlStr(obj);
    const isArray = Array.isArray(obj);
    const keys = isArray ? null : Object.keys(obj);
    let out = '';
    if (isArray) {
      if (obj.length === 0) return '[]';
      for (const item of obj) {
        if (item && typeof item === 'object') {
          const k = Object.keys(item)[0];
          const v = item[k];
          out += `${indent}- ${k}: ${toYaml(v, indent + '  ').trim()}\n`;
        } else {
          out += `${indent}- ${toYaml(item)}\n`;
        }
      }
    } else {
      for (const k of keys) {
        const v = obj[k];
        if (v === null || v === undefined || v === '') { out += `${indent}${k}: ~\n`; continue; }
        if (Array.isArray(v)) {
          if (v.length === 0) { out += `${indent}${k}: []\n`; continue; }
          out += `${indent}${k}:\n`;
          for (const item of v) {
            if (item && typeof item === 'object') {
              const subKeys = Object.keys(item);
              out += `${indent}- ${subKeys[0]}: ${escapeYamlStr(item[subKeys[0]])}\n`;
              for (let i = 1; i < subKeys.length; i++) {
                out += `${indent}  ${subKeys[i]}: ${escapeYamlStr(item[subKeys[i]])}\n`;
              }
            } else {
              out += `${indent}- ${escapeYamlStr(item)}\n`;
            }
          }
        } else if (typeof v === 'object') {
          out += `${indent}${k}:\n${toYaml(v, indent + '  ')}`;
        } else {
          out += `${indent}${k}: ${escapeYamlStr(v)}\n`;
        }
      }
    }
    return out;
  }

  // ========== 主对象 ==========
  const tool = {
    meta: { id: 'express-generator', name: '物流运单生成', desc: '随机生成快递运单数据，含承运商、运单号、收/寄件人、物流轨迹', icon: '📦', iconUrl: 'icons/express-generator.png', category: 'data-gen', categoryName: '数据生成' },
    _selected: FIELDS.map(f => f.id),
    _generated: [],
    _currentFmt: 'text',

    render(root) {
      // 按 group 分组
      const byGroup = {};
      FIELDS.forEach(f => { (byGroup[f.group] = byGroup[f.group] || []).push(f); });
      const groupsHtml = CAT_ORDER.map(gid => {
        const fields = byGroup[gid] || [];
        if (fields.length === 0) return '';
        const items = fields.map(f =>
          `<label class="ug-field"><input type="checkbox" class="ug-field-check" value="${f.id}" checked> ${f.label}</label>`
        ).join('');
        return `
          <div class="ug-cat-group">
            <div class="ug-cat-title">
              <span>${CAT_TITLES[gid] || gid}（${fields.length}）</span>
              <div class="ug-cat-btns">
                <button class="ug-btn-tiny ug-cat-sel" data-cat="${gid}">全选</button>
                <button class="ug-btn-tiny ug-cat-clr" data-cat="${gid}">清空</button>
              </div>
            </div>
            <div class="ug-field-grid ug-cat-grid">${items}</div>
          </div>`;
      }).join('');

      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${this.meta.iconUrl}" alt="${this.meta.name}"> ${this.meta.name}</h2></div>

          <div class="ug-section ug-config">
              <div class="ug-section-title">⚙️ 生成配置</div>
            <div class="ug-section-sub" style="max-height: 220px; overflow-y: auto;">
              <div class="ug-section-title">
                <span>📋 选择字段（${FIELDS.length}项 · ${CAT_ORDER.length}组）</span>
                <div class="ug-field-actions">
                  <button id="ugSelectAll" class="ug-btn-tiny">全选</button>
                  <button id="ugSelectDefault" class="ug-btn-tiny">默认</button>
                  <button id="ugClearAll" class="ug-btn-tiny">清空</button>
                </div>
              </div>
              <div id="ugFieldGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${groupsHtml}</div>
            </div>
          </div>
          <div class="ug-config-row">
            <label class="ug-label">Key 语言</label>
            <select class="ug-select" id="ugKeyLang" style="flex:none;width:auto">
              <option value="zh">中文</option>
              <option value="en">英文</option>
            </select>
            <label class="ug-label" style="margin-left:8px">数量</label>
            <input type="number" id="ugCount" class="ug-input ug-count" min="1" max="500" value="3">
            <button id="ugGen" class="ug-btn-primary ug-gen-btn">生成</button>
          </div>

          <div class="ug-section ug-result-section">
            <div class="ug-section-title">
              <span>📝 生成结果</span>
              <div class="ug-format-tabs">
                <button class="ug-format-tab active" data-fmt="text">文本</button>
                <button class="ug-format-tab" data-fmt="json">JSON</button>
                <button class="ug-format-tab" data-fmt="yaml">YAML</button>
              </div>
            </div>
            <div id="ugResult" class="ug-result">
              <div class="ug-empty">点击「生成」按钮，生成物流运单数据 📦</div>
            </div>
            <div class="ug-copy-bar">
              <button id="ugCopyAll" class="ug-btn-primary ug-copy-all">📋 复制全部</button>
            </div>
          </div>
        </div>
      `;
    },

    mount(context) {
      const root = context.container;
      this.fieldConfig = { keyLang: 'zh' };
      this._currentFmt = 'text';

      // 数量输入自动 clamp（与商品生成器一致）
      const ugCountInput = root.querySelector('#ugCount');
      ugCountInput?.addEventListener('input', () => {
        const val = parseInt(ugCountInput.value, 10);
        if (isNaN(val)) return;
        const max = parseInt(ugCountInput.max, 10) || 500;
        const min = parseInt(ugCountInput.min, 10) || 1;
        if (val > max) ugCountInput.value = max;
        if (val < min) ugCountInput.value = min;
      });

      // 格式切换 tab
      root.querySelectorAll('.ug-format-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          root.querySelectorAll('.ug-format-tab').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this._currentFmt = btn.dataset.fmt;
          this._renderResult(root);
        });
      });

      const keyLangSel = root.querySelector('#ugKeyLang');
      keyLangSel?.addEventListener('change', () => {
        this.fieldConfig.keyLang = keyLangSel.value;
        this._renderResult(root);
      });

      // 分组全选/清空
      root.querySelectorAll('.ug-cat-sel').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupRoot = btn.closest('.ug-cat-group');
          groupRoot.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = true);
        });
      });
      root.querySelectorAll('.ug-cat-clr').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupRoot = btn.closest('.ug-cat-group');
          groupRoot.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = false);
        });
      });

      // 全局全选/清空
      root.querySelector('#ugSelectAll').addEventListener('click', () => root.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = true));
      root.querySelector('#ugClearAll').addEventListener('click', () => root.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = false));
      root.querySelector('#ugSelectDefault').addEventListener('click', () => root.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = true));

      // 生成 / 复制
      root.querySelector('#ugGen').addEventListener('click', () => this._gen(root));
      root.querySelector('#ugCopyAll').addEventListener('click', () => {
        const out = this._getCurrentOutput(root);
        if (!out) { flashMessage('没有内容', 'warn'); return; }
        navigator.clipboard.writeText(out).then(() => flashMessage('✓ 已复制全部', 'success'));
      });
    },

    _gen(root) {
      const ids = this._getSelected(root);
      if (ids.length === 0) { flashMessage('请先选择至少一个字段', 'warn'); return; }
      const count = Math.max(1, Math.min(500, parseInt(root.querySelector('#ugCount').value) || 1));
      const results = [];
      for (let i = 0; i < count; i++) {
        const item = {};
        const curCarrier = _r(CARRIERS);
        const base = new Date();
        const transitCount = _randInt(3, 7);
        const track = [];
        let prevCity = null;
        for (let t = 0; t < transitCount; t++) {
          const stepCity = prevCity ? _r(CITIES[prevCity] || [prevCity]) : _r(CITIES[_r(PROVINCES)] || ['中转站']);
          prevCity = _r(PROVINCES);
          track.push({
            time: _randDateTime(base, -10 + t * 2),
            location: _r(PROVINCES) + _r(CITIES[_r(PROVINCES)] || ['']),
            status: _r(['已揽收', '运输中', '到达中转站', '发往中转站', '到达分拨中心', '派送中', '已签收']),
            remark: _r(['正常', '经停', '已安检', '中转', '已复核'])
          });
        }
        const ctx = { _curCarrier: curCarrier, _base: base, _track: track };
        for (const fid of ids) {
          const field = FIELDS.find(f => f.id === fid);
          if (field) {
            const keyDef = FIELD_KEYS[fid] || { zh: field.label, en: fid };
            const key = this.fieldConfig.keyLang === 'en' ? keyDef.en : keyDef.zh;
            try { item[key] = field.gen(ctx, this.fieldConfig); }
            catch (e) { item[key] = '(生成失败)'; }
          }
        }
        results.push(item);
      }
      this._generated = results;
      this._renderResult(root);
    },

    _getSelected(root) {
      return Array.from(root.querySelectorAll('.ug-field-check:checked')).map(i => i.value);
    },

    _renderResult(root) {
      const box = root.querySelector('#ugResult');
      if (!this._generated || this._generated.length === 0) {
        box.innerHTML = '<div class="ug-empty">点击「生成运单」按钮，生成物流运单数据 📦</div>';
        return;
      }
      const fmt = this._currentFmt || 'text';
      box.classList.toggle('ug-result-code', fmt !== 'text');
      if (fmt === 'text') {
        box.innerHTML = this._generated.map((item, idx) => {
          const lines = Object.entries(item).map(([k, v]) => {
            const valStr = Array.isArray(v)
              ? v.map(m => {
                  if (m && typeof m === 'object') return Object.entries(m).map(([k2, v2]) => `${k2}:${v2}`).join(' | ');
                  return String(m);
                }).join('；')
              : (v === null || v === undefined) ? ''
              : (typeof v === 'object') ? Object.entries(v).map(([k2, v2]) => `${k2}:${v2}`).join(' | ')
              : String(v);
            return `<div class="ug-row"><span class="ug-row-label">${k}</span><span class="ug-row-val">${valStr}</span></div>`;
          });
          const header = this._generated.length > 1 ? `<div class="ug-entry-header">#${idx + 1}</div>` : '';
          return `<div class="ug-entry">${header}${lines.join('')}</div>`;
        }).join('<div class="ug-entry-sep"></div>');
      } else if (fmt === 'json') {
        box.innerHTML = `<pre>${toJSON(this._generated.length === 1 ? this._generated[0] : this._generated, true)}</pre>`;
      } else {
        const yaml = this._generated.length === 1
          ? toYaml(this._generated[0])
          : this._generated.map(item => '- ' + toYaml(item).replace(/\n/g, '\n  ')).join('\n');
        box.innerHTML = `<pre>${yaml}</pre>`;
      }
    },

    _getCurrentOutput(root) {
      if (!this._generated) return '';
      const fmt = this._currentFmt || 'text';
      if (fmt === 'json') return toJSON(this._generated.length === 1 ? this._generated[0] : this._generated, true);
      if (fmt === 'yaml') return this._generated.length === 1 ? toYaml(this._generated[0]) : this._generated.map(item => '- ' + toYaml(item).replace(/\n/g, '\n  ')).join('\n');
      return this._generated.map(item => toText(item)).join('\n\n');
    },

    cleanup() {}
  };

  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

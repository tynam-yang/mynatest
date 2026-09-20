// tools/contract-generator.js — 合同票据信息随机生成（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const NAME = 'contract-generator';

  // ========== 常量表 ==========
  const DIGITS = '0123456789';

  // 公司名前缀
  const COMPANY_PREFIX = ['北方', '南方', '东方', '西部', '中环', '新世纪', '蓝天', '银河',
    '云创', '智联', '鼎盛', '万达', '华润', '保利', '中信', '华夏',
    '长江', '黄河', '泰山', '华山', '创新', '腾飞', '科技', '实业',
    '集团', '控股', '投资', '发展'];
  const COMPANY_SUFFIX = ['有限公司', '集团有限公司', '股份有限公司', '科技股份有限公司', '合伙企业', '研究院'];

  // 姓名
  const SUR_NAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const GIVEN_NAMES = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超',
    '芳', '娜', '敏', '静', '丽', '虹', '艳', '娟', '霞', '慧',
    '建华', '晓明', '志远', '文博', '思琪', '雨婷', '浩然', '子轩'];

  // 合同类型
  const CONTRACT_TYPES = ['采购合同', '销售合同', '服务协议', '技术开发合同', '租赁合同', '劳动合同'];

  // 票据类型
  const INVOICE_TYPES = ['增值税专用发票', '增值税普通发票', '电子普通发票', '电子专票', '海关缴款书'];

  // 税率
  const TAX_RATES = [0, 3, 6, 9, 13];

  // 附件扩展名
  const ATTACH_EXTS = ['pdf', 'zip', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'rar'];
  const ATTACH_NAMES = ['合同扫描件', '技术附件', '补充协议', '报价单', '清单明细', '图纸', '验收报告', '附件'];

  // 备注注入 payload 池
  const INJECTION_PAYLOADS = [
    "' OR 1=1--",
    '; DROP TABLE users;',
    '<script>alert(document.cookie)</script>',
    '{{7*7}}',
    '${7*7}',
    "{{constructor.constructor('return this')()}}",
    '../../etc/passwd',
    '💣🚀💥'
  ];

  // 合同状态
  const CONTRACT_STATUSES = ['草稿', '待审批', '已签订', '已履行', '已终止', '已撤销'];

  // 省市区
  const PROVINCES = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '山东省', '福建省', '天津市', '重庆市', '河南省', '湖南省', '河北省', '安徽省'];
  const CITIES = ['朝阳区', '海淀区', '黄浦区', '徐汇区', '天河区', '越秀区', '南山区', '福田区', '西湖区', '滨江区', '鼓楼区', '玄武区', '锦江区', '武侯区', '洪山区', '武昌区', '历下区', '市中区', '鼓楼区', '台江区', '和平区', '南开区', '渝中区', '江北区', '金水区', '二七区', '芙蓉区', '岳麓区', '长安区', '桥西区', '庐阳区', '蜀山区'];
  // 地名前缀词池：形容词 × 名词 = 约 1600+ 种组合
  const STREET_ADJ = ['中', '人', '建', '解', '和', '文', '光', '团', '新', '幸', '财', '富', '金', '银', '玉', '龙', '凤', '鹤', '燕', '青', '绿', '红', '白', '黑', '黄', '蓝', '紫', '翠', '赤', '橙', '江', '河', '湖', '海', '山', '石', '林', '木', '花', '草', '桃', '杏', '桂', '竹', '松', '柏', '梅', '兰', '菊', '荷'];
  const STREET_NOUN = ['山', '水', '洲', '湾', '港', '岛', '滩', '岸', '堤', '坡', '谷', '峰', '岭', '岩', '泉', '溪', '涧', '潭', '池', '塘', '桥', '岗', '坝', '坪', '田', '庄', '园', '林', '村', '坊', '阁', '轩', '居', '苑', '府', '庭', '院', '宫', '殿', '堂'];
  const STREET_SUFFIX = ['路', '街', '大道', '巷', '广场', '花园', '大厦', '写字楼', '科技园', '产业园', '小区', '公寓', '巷', '弄', '胡同', '里', '坊', '院', '村', '庄'];

  // 身份证前缀
  const ID_CARD_PREFIXES = ['110101', '110102', '310101', '310104', '440101', '440301', '330101', '320101', '510101', '420101'];

  // 统一社会信用代码前缀
  const CREDIT_CODE_PREFIXES = ['91110000', '91310000', '91440000', '91330000', '91320000', '91510000', '91420000', '91370000', '91350000', '91300000'];

  // 信用代码字符表 & 权重
  const CREDIT_CODE_CHARS = '0123456789ABCDEFGHJKMNPQRTUVWXY';
  const CREDIT_CODE_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 4, 5, 7, 20, 15, 13, 11, 8, 12];

  // ========== 工具函数 ==========
  const _r = (a) => a[Math.floor(Math.random() * a.length)];
  const _randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _pad = (n, len) => String(n).padStart(len, '0');

  function _randDateISO(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + _pad(d.getMonth() + 1, 2) + '-' + _pad(d.getDate(), 2);
  }

  function _dateAdd(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + _pad(d.getMonth() + 1, 2) + '-' + _pad(d.getDate(), 2);
  }

  // 金额转大写（人民币）
  function _amountToChinese(num) {
    const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    const unitsInt = ['', '拾', '佰', '仟', '万', '拾', '佰', '仟', '亿', '拾', '佰', '仟'];
    const unitsDec = ['角', '分'];
    if (!isFinite(num) || num < 0) return '无效金额';
    let s = '';
    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);
    const intStr = String(intPart);
    for (let i = 0; i < intStr.length; i++) {
      const d = parseInt(intStr[i]);
      const unit = unitsInt[intStr.length - 1 - i];
      if (d === 0) {
        if (s && !s.endsWith('零') && i < intStr.length - 1) s += '零';
      } else {
        s += digits[d] + unit;
      }
    }
    s = s.replace(/零$/, '') || '零';
    s += '元';
    if (decPart === 0) return s + '整';
    const jiao = Math.floor(decPart / 10);
    const fen = decPart % 10;
    if (jiao) s += digits[jiao] + unitsDec[0];
    if (fen) s += digits[fen] + unitsDec[1];
    return s;
  }

  // 统一社会信用代码（18 位，带校验码）
  function _genCreditCode() {
    const prefix = _r(CREDIT_CODE_PREFIXES);
    let org = '';
    for (let i = 0; i < 8; i++) org += CREDIT_CODE_CHARS.charAt(_randInt(0, 31));
    const head = prefix + org;
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += CREDIT_CODE_CHARS.indexOf(head.charAt(i)) * CREDIT_CODE_WEIGHTS[i];
    }
    const check = CREDIT_CODE_CHARS.charAt((31 - sum % 31) % 31);
    return head + check;
  }

  // 身份证号（简化版）
  function _genIdCard() {
    const prefix = _r(ID_CARD_PREFIXES);
    const year = _randInt(1960, 2000);
    const month = _pad(_randInt(1, 12), 2);
    const day = _pad(_randInt(1, 28), 2);
    let tail = '';
    for (let i = 0; i < 3; i++) tail += _randInt(0, 9);
    const codes = '0123456789X';
    return prefix + year + month + day + tail + codes.charAt(_randInt(0, 10));
  }

  // 地址生成：支持三种格式
  function _genAddress(format) {
    const province = _r(PROVINCES);
    const city = _r(CITIES);
    if (format === 'short') return province + ' ' + city;
    const streetName = _r(STREET_ADJ) + _r(STREET_NOUN) + _r(STREET_SUFFIX);
    const streetNo = _randInt(1, 999);
    if (format === 'medium') return province + ' ' + city + ' ' + streetName + streetNo + '号';
    // long 或默认
    const unitNo = _randInt(1, 30);
    const roomNo = _randInt(101, 2902);
    return province + ' ' + city + ' ' + streetName + streetNo + '号 ' + unitNo + '栋 ' + roomNo + '室';
  }

  // 部门列表
  const DEPARTMENTS = ['采购部', '销售部', '研发部', '财务部', '人力资源部', '市场部', '法务部', '运营部', '行政部', '质量部'];
  // 职务列表
  const POSITIONS = ['经理', '主管', '专员', '总监', '助理', '主任', '部长', '工程师', '架构师', '技术负责人'];

  // 合同编号生成
  function genContractNo(cfg) {
    cfg = cfg || {};
    const prefix = cfg.prefix !== undefined ? cfg.prefix : 'HT-';
    const dateFmt = cfg.dateFmt || 'year';
    const seqLen = cfg.seqLen !== undefined ? cfg.seqLen : 5;
    const bad = cfg.bad || false;

    // 畸形模式
    if (bad && Math.random() < 0.5) {
      const wt = _randInt(0, 3);
      if (wt === 0) return ''; // 空
      if (wt === 1) {
        // 纯数字
        let s = '';
        for (let i = 0; i < _randInt(8, 15); i++) s += DIGITS[_randInt(0, 9)];
        return s;
      }
      if (wt === 2) {
        // 超长
        let s = prefix;
        for (let i = 0; i < _randInt(30, 60); i++) s += DIGITS[_randInt(0, 9)];
        return s;
      }
      // wt===3 含特殊字符
      return prefix + _pad(_randInt(1000, 9999), 4) + '@#￥%';
    }

    const year = new Date().getFullYear();
    let datePart = '';
    if (dateFmt === 'year') datePart = String(year);
    else if (dateFmt === 'yyyymmdd') {
      const d = new Date();
      datePart = d.getFullYear() + _pad(d.getMonth() + 1, 2) + _pad(d.getDate(), 2);
    }
    // none: 不加日期

    let seq = '';
    for (let i = 0; i < seqLen; i++) seq += DIGITS[_randInt(0, 9)];

    return prefix + datePart + seq;
  }

  // 发票代码（12 位纯数字）
  function genInvoiceCode() {
    let s = '';
    for (let i = 0; i < 12; i++) s += DIGITS[_randInt(0, 9)];
    return s;
  }

  // 发票号码（8 位或 20 位电子票）
  function genInvoiceNo(isElectronic) {
    const len = isElectronic ? 20 : 8;
    let s = '';
    for (let i = 0; i < len; i++) s += DIGITS[_randInt(0, 9)];
    return s;
  }

  // 公司名称
  function genCompanyName() {
    return _r(COMPANY_PREFIX) + _r(COMPANY_PREFIX) + _r(COMPANY_SUFFIX);
  }

  // 不重复公司名（用于甲乙方）
  function genTwoCompanyNames() {
    let a = genCompanyName();
    let b = genCompanyName();
    while (b === a) b = genCompanyName();
    return [a, b];
  }

  // 姓名
  function genPersonName() {
    const sur = _r(SUR_NAMES);
    const gn = Math.random() < 0.4 ? _r(GIVEN_NAMES) + _r(GIVEN_NAMES) : _r(GIVEN_NAMES);
    return sur + gn;
  }

  // 合同名称
  function genContractName(cfg) {
    cfg = cfg || {};
    const mode = cfg.nameMode || 'normal';
    const types = cfg.contractTypes && cfg.contractTypes.length > 0 ? cfg.contractTypes : CONTRACT_TYPES;
    const type = _r(types);
    const company = genCompanyName();
    const company2 = genCompanyName();

    if (mode === 'special') {
      // 带特殊符号
      return `${company}与${company2}关于【${_r(['设备采购', '技术服务', '产品供应', '项目合作'])}】的${type}★◆●`;
    }
    if (mode === 'superLong') {
      // 超长名称 80-200 字
      const base = `${company}与${company2}关于${_r(['大型智能化设备采购', '新一代信息技术服务外包', '高端精密仪器产品供应及后续配套维护', '企业数字化转型项目全面合作'])}的${type}合同及其全部补充协议、附件、技术标准文件、质量验收规范框架协议`;
      const extra = '，具体条款详见合同正文及所有附件材料';
      let name = base;
      while (name.length < _randInt(80, 200)) {
        name += extra;
      }
      return name.substring(0, _randInt(80, 200));
    }
    // normal
    return `${company}与${company2}${type}`;
  }

  // 金额格式化（保留 2 位小数）
  function _round2(n) {
    return Math.round(n * 100) / 100;
  }

  // ========== 字段 key 中英文映射 ==========
  const FIELD_KEYS = {
    contractNo: { zh: '合同编号', en: 'contractNo' },
    contractName: { zh: '合同名称', en: 'contractName' },
    contractType: { zh: '合同类型', en: 'contractType' },
    contractStatus: { zh: '合同状态', en: 'contractStatus' },
    contractAmountBig: { zh: '金额大写', en: 'contractAmountBig' },
    contractSigner: { zh: '法定代表人签字', en: 'contractSigner' },
    attachmentName: { zh: '附件名称', en: 'attachmentName' },
    partyA: { zh: '甲方名称', en: 'partyA' },
    partyAContact: { zh: '甲方联系人', en: 'partyAContact' },
    partyACreditCode: { zh: '甲方统一社会信用代码', en: 'partyACreditCode' },
    partyAAddress: { zh: '甲方地址', en: 'partyAAddress' },
    partyB: { zh: '乙方名称', en: 'partyB' },
    partyBContact: { zh: '乙方联系人', en: 'partyBContact' },
    partyBCreditCode: { zh: '乙方统一社会信用代码', en: 'partyBCreditCode' },
    partyBAddress: { zh: '乙方地址', en: 'partyBAddress' },
    amountWithTax: { zh: '合同金额(含税)', en: 'amountWithTax' },
    amountNoTax: { zh: '不含税金额', en: 'amountNoTax' },
    taxRate: { zh: '税率', en: 'taxRate' },
    signDate: { zh: '签订日期', en: 'signDate' },
    effectiveDate: { zh: '生效日期', en: 'effectiveDate' },
    expireDate: { zh: '到期日期', en: 'expireDate' },
    contractPeriod: { zh: '合同期限', en: 'contractPeriod' },
    invoiceType: { zh: '票据类型', en: 'invoiceType' },
    invoiceCode: { zh: '发票代码', en: 'invoiceCode' },
    invoiceNo: { zh: '发票号码', en: 'invoiceNo' },
    invoiceDate: { zh: '开票日期', en: 'invoiceDate' },
    invoiceAmount: { zh: '开票金额', en: 'invoiceAmount' },
    taxAmount: { zh: '税额', en: 'taxAmount' },
    totalAmount: { zh: '价税合计', en: 'totalAmount' },
    invoiceBuyer: { zh: '购买方', en: 'invoiceBuyer' },
    invoiceSeller: { zh: '销售方', en: 'invoiceSeller' },
    remark: { zh: '备注', en: 'remark' }
  };

  // ========== configUI 辅助模板 ==========
  function _tplCheckboxes(name, options, selected) {
    const set = new Set(selected || []);
    return `<div class="ug-cfg-row"><div class="ug-checkbox-group" data-cfg-key="${name}">
      ${options.map(opt => `<label><input type="checkbox" value="${opt}" ${set.has(opt) ? 'checked' : ''}>${opt}</label>`).join('')}
    </div></div>`;
  }
  function _tplRange(name, curMin, curMax, minV, maxV) {
    return `<div class="ug-cfg-row"><div class="ug-range-pair" data-cfg-min="${name}" data-cfg-max="${name}">
      <span class="ug-sub-label">最小</span>
      <input type="number" class="ug-input" min="${minV}" max="${maxV}" value="${curMin}">
      <span class="ug-sub-label">最大</span>
      <input type="number" class="ug-input" min="${minV}" max="${maxV}" value="${curMax}">
    </div></div>`;
  }
  function _tplTextarea(name, value, placeholder, rows) {
    return `<div class="ug-cfg-row"><textarea class="ug-input ug-textlist" rows="${rows || 2}" placeholder="${placeholder}" data-cfg-text="${name}">${value || ''}</textarea></div>`;
  }
  function _tplRadio(name, options, selected, label) {
    return `<div class="ug-cfg-row"><span class="ug-sub-label">${label || ''}</span>
      <select class="ug-input" data-cfg-simple="${name}">
        ${options.map(opt => `<option value="${opt.value !== undefined ? opt.value : opt}" ${selected === (opt.value !== undefined ? opt.value : opt) ? 'selected' : ''}>${opt.label !== undefined ? opt.label : opt}</option>`).join('')}
      </select></div>`;
  }

  // ========== 字段分类 ==========
  const CATEGORIES = [
    { id: 'contract', title: '📑 合同主体' },
    { id: 'contractParty', title: '🏢 甲乙双方' },
    { id: 'contractMoney', title: '💰 合同金额' },
    { id: 'contractDate', title: '📅 合同日期' },
    { id: 'invoice', title: '🧾 票据信息' },
    { id: 'remark', title: '📝 备注' }
  ];

  // ========== 字段注册表 ==========
  const FIELDS = [
    // ===== 一、合同主体 contract =====
    {
      id: 'contractNo', group: 'contract', label: '合同编号', defaultSelected: true,
      configUI: (cfg) => {
        const prefix = cfg.prefix !== undefined ? cfg.prefix : 'HT-';
        const dateFmt = cfg.dateFmt || 'year';
        const seqLen = cfg.seqLen !== undefined ? cfg.seqLen : 5;
        const badChecked = cfg.bad ? 'checked' : '';
        return `
          <div class="ug-cfg-row"><span class="ug-sub-label">前缀：</span><input type="text" class="ug-input" data-cfg-simple="prefix" value="${prefix}"></div>
          <div class="ug-cfg-row"><span class="ug-sub-label">日期格式：</span>
            <select class="ug-input" data-cfg-simple="dateFmt">
              <option value="year" ${dateFmt === 'year' ? 'selected' : ''}>仅年份(如 2026)</option>
              <option value="yyyymmdd" ${dateFmt === 'yyyymmdd' ? 'selected' : ''}>完整日期(如 20260918)</option>
              <option value="none" ${dateFmt === 'none' ? 'selected' : ''}>不加日期</option>
            </select>
          </div>
          <div class="ug-cfg-row"><span class="ug-sub-label">流水号位数(3-8)：</span>
            <input type="number" class="ug-input" min="3" max="8" value="${seqLen}" data-cfg-simple="seqLen">
          </div>
          <div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="bad" ${badChecked}> 畸形编号(空/纯数字/超长/特殊字符)</label></div>
        `;
      },
      gen: (ctx, cfg) => genContractNo(cfg)
    },
    {
      id: 'contractName', group: 'contract', label: '合同名称', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.nameMode || 'normal';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">模式：</span>
          <select class="ug-input" data-cfg-simple="nameMode">
            <option value="normal" ${mode === 'normal' ? 'selected' : ''}>普通名称</option>
            <option value="special" ${mode === 'special' ? 'selected' : ''}>带特殊符号</option>
            <option value="superLong" ${mode === 'superLong' ? 'selected' : ''}>超长名称(80-200字)</option>
          </select></div>`;
      },
      gen: (ctx, cfg) => genContractName(cfg)
    },
    {
      id: 'contractType', group: 'contract', label: '合同类型', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.contractTypes || CONTRACT_TYPES;
        const custom = cfg.contractTypeCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">类型(多选)：</span></div>
          ${_tplCheckboxes('contractTypes', CONTRACT_TYPES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义(逗号分隔)：</span></div>
          <div class="ug-cfg-row"><textarea class="ug-textarea" rows="2" data-cfg-text="contractTypeCustom" placeholder="如：技术咨询合同,保密协议">${custom}</textarea></div>`;
      },
      gen: (ctx, cfg) => {
        const pool = [];
        if (cfg.contractTypes && cfg.contractTypes.length > 0) pool.push(...cfg.contractTypes);
        if (cfg.contractTypeCustom) cfg.contractTypeCustom.split(/[,，\n]/).map(s => s.trim()).filter(Boolean).forEach(s => pool.push(s));
        return pool.length > 0 ? _r(pool) : _r(CONTRACT_TYPES);
      }
    },
    {
      id: 'attachmentName', group: 'contract', label: '附件名称', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.attachmentExts || ATTACH_EXTS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">扩展名(多选)：</span></div>
          ${_tplCheckboxes('attachmentExts', ATTACH_EXTS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const exts = cfg.attachmentExts && cfg.attachmentExts.length > 0 ? cfg.attachmentExts : ATTACH_EXTS;
        return _r(ATTACH_NAMES) + '.' + _r(exts);
      }
    },
    {
      id: 'contractStatus', group: 'contract', label: '合同状态', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.contractStatuses || CONTRACT_STATUSES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">合同状态(多选)：</span></div>
          ${_tplCheckboxes('contractStatuses', CONTRACT_STATUSES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.contractStatuses && cfg.contractStatuses.length > 0 ? cfg.contractStatuses : CONTRACT_STATUSES;
        return _r(pool);
      }
    },
    {
      id: 'contractAmountBig', group: 'contract', label: '金额大写', defaultSelected: true,
      gen: (ctx, cfg) => {
        // 基于 amountWithTax 转大写
        const amount = ctx.amountWithTax !== undefined ? ctx.amountWithTax : _round2(_randInt(800000, 1000000000) / 100);
        return _amountToChinese(amount);
      }
    },
    {
      id: 'contractSigner', group: 'contract', label: '法定代表人签字', defaultSelected: true,
      gen: () => genPersonName()
    },

    // ===== 二、甲乙双方 contractParty =====
    {
      id: 'partyA', group: 'contractParty', label: '甲方名称', defaultSelected: true,
      configUI: (cfg) => {
        const t = cfg.partyAType || 'enterprise';
        return _tplRadio('partyAType', [
          { value: 'enterprise', label: '企业(公司名)' },
          { value: 'person', label: '个人(姓名+身份证)' }
        ], t, '甲方类型：');
      },
      gen: (ctx, cfg) => {
        const t = cfg.partyAType || 'enterprise';
        if (t === 'person') {
          if (!ctx._partyAPerson) {
            ctx._partyAPerson = genPersonName();
            ctx._partyAIdCard = _genIdCard();
          }
          return ctx._partyAPerson;
        }
        if (!ctx._partyPair) ctx._partyPair = genTwoCompanyNames();
        return ctx._partyPair[0];
      }
    },
    {
      id: 'partyAContact', group: 'contractParty', label: '甲方联系人', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.partyAContactMode || 'name';
        return _tplRadio('partyAContactMode', [
          { value: 'name', label: '联系人姓名' },
          { value: 'dept', label: '部门' },
          { value: 'pos', label: '职务' },
          { value: 'full', label: '完整(姓名/部门/职务)' }
        ], mode, '联系人模式：');
      },
      gen: (ctx, cfg) => {
        const mode = cfg.partyAContactMode || 'name';
        if (mode === 'dept') return _r(DEPARTMENTS);
        if (mode === 'pos') return _r(POSITIONS);
        if (mode === 'full') return genPersonName() + ' / ' + _r(DEPARTMENTS) + ' / ' + _r(POSITIONS);
        return genPersonName();
      }
    },
    {
      id: 'partyB', group: 'contractParty', label: '乙方名称', defaultSelected: true,
      configUI: (cfg) => {
        const t = cfg.partyBType || 'enterprise';
        return _tplRadio('partyBType', [
          { value: 'enterprise', label: '企业(公司名)' },
          { value: 'person', label: '个人(姓名+身份证)' }
        ], t, '乙方类型：');
      },
      gen: (ctx, cfg) => {
        const t = cfg.partyBType || 'enterprise';
        if (t === 'person') {
          if (!ctx._partyBPerson) {
            ctx._partyBPerson = genPersonName();
            ctx._partyBIdCard = _genIdCard();
          }
          return ctx._partyBPerson;
        }
        if (!ctx._partyPair) ctx._partyPair = genTwoCompanyNames();
        return ctx._partyPair[1];
      }
    },
    {
      id: 'partyBContact', group: 'contractParty', label: '乙方联系人', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.partyBContactMode || 'name';
        return _tplRadio('partyBContactMode', [
          { value: 'name', label: '联系人姓名' },
          { value: 'dept', label: '部门' },
          { value: 'pos', label: '职务' },
          { value: 'full', label: '完整(姓名/部门/职务)' }
        ], mode, '联系人模式：');
      },
      gen: (ctx, cfg) => {
        const mode = cfg.partyBContactMode || 'name';
        if (mode === 'dept') return _r(DEPARTMENTS);
        if (mode === 'pos') return _r(POSITIONS);
        if (mode === 'full') return genPersonName() + ' / ' + _r(DEPARTMENTS) + ' / ' + _r(POSITIONS);
        return genPersonName();
      }
    },
    {
      id: 'partyACreditCode', group: 'contractParty', label: '甲方统一社会信用代码', defaultSelected: true,
      gen: (ctx) => {
        const t = ctx.partyAType || 'enterprise';
        if (t === 'person') return '（个人无）';
        if (!ctx._partyACreditCode) ctx._partyACreditCode = _genCreditCode();
        return ctx._partyACreditCode;
      }
    },
    {
      id: 'partyBCreditCode', group: 'contractParty', label: '乙方统一社会信用代码', defaultSelected: true,
      gen: (ctx) => {
        const t = ctx.partyBType || 'enterprise';
        if (t === 'person') return '（个人无）';
        if (!ctx._partyBCreditCode) ctx._partyBCreditCode = _genCreditCode();
        return ctx._partyBCreditCode;
      }
    },
    {
      id: 'partyAAddress', group: 'contractParty', label: '甲方地址', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
          <select class="ug-input" data-cfg-simple="partyAAddressFmt">
            <option value="long" ${!cfg.partyAAddressFmt || cfg.partyAAddressFmt === 'long' ? 'selected' : ''}>详细(省市区+门牌号+栋+室)</option>
            <option value="medium" ${cfg.partyAAddressFmt === 'medium' ? 'selected' : ''}>中等(省市区+门牌号)</option>
            <option value="short" ${cfg.partyAAddressFmt === 'short' ? 'selected' : ''}>极简(省+市)</option>
          </select></div>`,
      gen: (ctx, cfg) => _genAddress(cfg.partyAAddressFmt)
    },
    {
      id: 'partyBAddress', group: 'contractParty', label: '乙方地址', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
          <select class="ug-input" data-cfg-simple="partyBAddressFmt">
            <option value="long" ${!cfg.partyBAddressFmt || cfg.partyBAddressFmt === 'long' ? 'selected' : ''}>详细(省市区+门牌号+栋+室)</option>
            <option value="medium" ${cfg.partyBAddressFmt === 'medium' ? 'selected' : ''}>中等(省市区+门牌号)</option>
            <option value="short" ${cfg.partyBAddressFmt === 'short' ? 'selected' : ''}>极简(省+市)</option>
          </select></div>`,
      gen: (ctx, cfg) => _genAddress(cfg.partyBAddressFmt)
    },

    // ===== 三、合同金额 contractMoney =====
    {
      id: 'amountWithTax', group: 'contractMoney', label: '合同金额(含税)', defaultSelected: true,
      configUI: (cfg) => _tplRange('amountWithTax', cfg.amountWithTaxMin !== undefined ? cfg.amountWithTaxMin : 8000, cfg.amountWithTaxMax !== undefined ? cfg.amountWithTaxMax : 10000000, 0, 999999999),
      gen: (ctx, cfg) => {
        const mn = cfg.amountWithTaxMin !== undefined ? cfg.amountWithTaxMin : 8000;
        const mx = cfg.amountWithTaxMax !== undefined ? cfg.amountWithTaxMax : 10000000;
        const val = _randInt(mn * 100, mx * 100) / 100;
        return _round2(val);
      }
    },
    {
      id: 'amountNoTax', group: 'contractMoney', label: '不含税金额', defaultSelected: true,
      configUI: (cfg) => {
        return `
          <div class="ug-cfg-row"><span class="ug-sub-label" style="color:#888">⚠ 此值会根据含税金额÷(1+税率)自动联动计算</span></div>
          ${_tplRange('amountNoTax', cfg.amountNoTaxMin !== undefined ? cfg.amountNoTaxMin : 0, cfg.amountNoTaxMax !== undefined ? cfg.amountNoTaxMax : 10000000, 0, 999999999)}
        `;
      },
      gen: (ctx, cfg) => {
        const amount = ctx.amountWithTax !== undefined ? ctx.amountWithTax : _round2(_randInt(800000, 1000000000) / 100);
        const rate = (ctx.taxRate !== undefined ? ctx.taxRate : _r(TAX_RATES)) / 100;
        const val = _round2(amount / (1 + rate));
        ctx._amountNoTax = val;
        return val;
      }
    },
    {
      id: 'taxRate', group: 'contractMoney', label: '税率', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.taxRates || TAX_RATES;
        const opts = TAX_RATES.map(r => r + '%');
        const curSet = selected.map(r => r + '%');
        return `<div class="ug-cfg-row"><span class="ug-sub-label">税率(多选)：</span></div>
          ${_tplCheckboxes('taxRates', opts, curSet)}`;
      },
      gen: (ctx, cfg) => {
        const selected = cfg.taxRates && cfg.taxRates.length > 0 ? cfg.taxRates.map(s => parseInt(s, 10)) : TAX_RATES;
        return _r(selected);
      }
    },

    // ===== 四、合同日期 contractDate =====
    {
      id: 'signDate', group: 'contractDate', label: '签订日期', defaultSelected: true,
      configUI: (cfg) => _tplRange('signDate', cfg.signDateMin !== undefined ? cfg.signDateMin : 0, cfg.signDateMax !== undefined ? cfg.signDateMax : 365, 0, 3650),
      gen: (ctx, cfg) => {
        const mn = cfg.signDateMin !== undefined ? cfg.signDateMin : 0;
        const mx = cfg.signDateMax !== undefined ? cfg.signDateMax : 365;
        const offset = -_randInt(mn, mx); // 过去 0-365 天
        const d = _randDateISO(offset);
        ctx._signDate = d;
        return d;
      }
    },
    {
      id: 'effectiveDate', group: 'contractDate', label: '生效日期', defaultSelected: true,
      configUI: (cfg) => _tplRange('effectiveDate', cfg.effectiveDateMin !== undefined ? cfg.effectiveDateMin : -30, cfg.effectiveDateMax !== undefined ? cfg.effectiveDateMax : 30, -365, 365),
      gen: (ctx, cfg) => {
        // 基于签订日期 ± 30 天
        const signDate = ctx._signDate || _randDateISO(-_randInt(0, 365));
        const mn = cfg.effectiveDateMin !== undefined ? cfg.effectiveDateMin : -30;
        const mx = cfg.effectiveDateMax !== undefined ? cfg.effectiveDateMax : 30;
        const offset = _randInt(mn, mx);
        const d = _dateAdd(signDate, offset);
        ctx._effectiveDate = d;
        return d;
      }
    },
    {
      id: 'expireDate', group: 'contractDate', label: '到期日期', defaultSelected: true,
      configUI: (cfg) => {
        const abnChecked = cfg.expireAbnormal ? 'checked' : '';
        return `
          ${_tplRange('expireDate', cfg.expireDateMin !== undefined ? cfg.expireDateMin : 90, cfg.expireDateMax !== undefined ? cfg.expireDateMax : 1095, 1, 3650)}
          <div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="expireAbnormal" ${abnChecked}> 异常模式(生效日期 > 到期日期)</label></div>
        `;
      },
      gen: (ctx, cfg) => {
        // 基于生效日期 + 90-1095 天
        const effectiveDate = ctx._effectiveDate || _randDateISO(-_randInt(0, 365));
        const mn = cfg.expireDateMin !== undefined ? cfg.expireDateMin : 90;
        const mx = cfg.expireDateMax !== undefined ? cfg.expireDateMax : 1095;

        let exp;
        if (cfg.expireAbnormal) {
          const offset = _randInt(mn, mx);
          exp = _dateAdd(effectiveDate, -offset);
        } else {
          const offset = _randInt(mn, mx);
          exp = _dateAdd(effectiveDate, offset);
        }
        ctx._expireDate = exp;
        return exp;
      }
    },
    {
      id: 'contractPeriod', group: 'contractDate', label: '合同期限', defaultSelected: true,
      gen: (ctx) => {
        const eff = ctx._effectiveDate || _randDateISO(-_randInt(0, 365));
        const exp = ctx._expireDate || _dateAdd(eff, _randInt(90, 1095));
        // 计算年/月数
        const ed = new Date(exp + 'T00:00:00');
        const sd = new Date(eff + 'T00:00:00');
        const diffDays = Math.round((ed - sd) / (1000 * 60 * 60 * 24));
        const years = Math.floor(diffDays / 365);
        const months = Math.round((diffDays % 365) / 30);
        let period;
        if (years > 0 && months > 0) period = years + '年' + months + '个月';
        else if (years > 0) period = years + '年';
        else if (months > 0) period = months + '个月';
        else period = diffDays + '天';
        return '自 ' + eff + ' 至 ' + exp + '，共 ' + period;
      }
    },

    // ===== 五、票据 invoice =====
    {
      id: 'invoiceType', group: 'invoice', label: '票据类型', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.invoiceTypes || INVOICE_TYPES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">票据类型(多选)：</span></div>
          ${_tplCheckboxes('invoiceTypes', INVOICE_TYPES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.invoiceTypes && cfg.invoiceTypes.length > 0 ? cfg.invoiceTypes : INVOICE_TYPES;
        const t = _r(pool);
        ctx._isElectronic = t.includes('电子');
        return t;
      }
    },
    {
      id: 'invoiceCode', group: 'invoice', label: '发票代码', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.invoiceCodeLen || '12';
        return _tplRadio('invoiceCodeLen', [
          { value: '10', label: '10位(旧版普通发票)' },
          { value: '12', label: '12位(增值税专用/普通)' }
        ], mode, '长度：');
      },
      gen: (ctx, cfg) => {
        const len = parseInt(cfg.invoiceCodeLen || '12', 10);
        let s = '';
        for (let i = 0; i < len; i++) s += DIGITS[_randInt(0, 9)];
        return s;
      }
    },
    {
      id: 'invoiceNo', group: 'invoice', label: '发票号码', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.invoiceNoLen || 'auto';
        return _tplRadio('invoiceNoLen', [
          { value: 'auto', label: '自动(根据票据类型)' },
          { value: '8', label: '8位(普通发票)' },
          { value: '20', label: '20位(电子发票)' }
        ], mode, '长度：');
      },
      gen: (ctx, cfg) => {
        let len;
        const mode = cfg.invoiceNoLen || 'auto';
        if (mode === 'auto') len = ctx._isElectronic ? 20 : 8;
        else len = parseInt(mode, 10);
        let s = '';
        for (let i = 0; i < len; i++) s += DIGITS[_randInt(0, 9)];
        return s;
      }
    },
    {
      id: 'invoiceAmount', group: 'invoice', label: '开票金额', defaultSelected: true,
      configUI: (cfg) => _tplRange('invoiceAmount', cfg.invoiceAmountMin !== undefined ? cfg.invoiceAmountMin : 500, cfg.invoiceAmountMax !== undefined ? cfg.invoiceAmountMax : 500000, 0, 99999999),
      gen: (ctx, cfg) => {
        const mn = cfg.invoiceAmountMin !== undefined ? cfg.invoiceAmountMin : 500;
        const mx = cfg.invoiceAmountMax !== undefined ? cfg.invoiceAmountMax : 500000;
        const val = _randInt(mn * 100, mx * 100) / 100;
        ctx._invoiceAmount = _round2(val);
        return ctx._invoiceAmount;
      }
    },
    {
      id: 'taxAmount', group: 'invoice', label: '税额', defaultSelected: true,
      configUI: (cfg) => {
        return `
          <div class="ug-cfg-row"><span class="ug-sub-label" style="color:#888">⚠ 此值会根据不含税金额×税率自动联动计算</span></div>
          ${_tplRange('taxAmount', cfg.taxAmountMin !== undefined ? cfg.taxAmountMin : 0, cfg.taxAmountMax !== undefined ? cfg.taxAmountMax : 1500000, 0, 99999999)}
        `;
      },
      gen: (ctx, cfg) => {
        const amount = ctx._invoiceAmount !== undefined ? ctx._invoiceAmount : _round2(_randInt(50000, 50000000) / 100);
        const rate = (ctx.taxRate !== undefined ? ctx.taxRate : _r(TAX_RATES)) / 100;
        const tax = _round2(amount * rate);
        ctx._taxAmount = tax;
        return tax;
      }
    },
    {
      id: 'totalAmount', group: 'invoice', label: '价税合计', defaultSelected: true,
      configUI: (cfg) => {
        return `
          <div class="ug-cfg-row"><span class="ug-sub-label" style="color:#888">⚠ 此值会根据开票金额+税额自动联动计算</span></div>
          ${_tplRange('totalAmount', cfg.totalAmountMin !== undefined ? cfg.totalAmountMin : 0, cfg.totalAmountMax !== undefined ? cfg.totalAmountMax : 6500000, 0, 99999999)}
        `;
      },
      gen: (ctx, cfg) => {
        const amount = ctx._invoiceAmount !== undefined ? ctx._invoiceAmount : _round2(_randInt(50000, 50000000) / 100);
        const tax = ctx._taxAmount !== undefined ? ctx._taxAmount : _round2(amount * ((ctx.taxRate !== undefined ? ctx.taxRate : _r(TAX_RATES)) / 100));
        return _round2(amount + tax);
      }
    },
    {
      id: 'invoiceDate', group: 'invoice', label: '开票日期', defaultSelected: true,
      configUI: (cfg) => _tplRange('invoiceDate', cfg.invoiceDateMin !== undefined ? cfg.invoiceDateMin : -30, cfg.invoiceDateMax !== undefined ? cfg.invoiceDateMax : 0, -365, 365),
      gen: (ctx, cfg) => {
        const mn = cfg.invoiceDateMin !== undefined ? cfg.invoiceDateMin : -30;
        const mx = cfg.invoiceDateMax !== undefined ? cfg.invoiceDateMax : 0;
        const offset = _randInt(mn, mx);
        return _randDateISO(offset);
      }
    },
    {
      id: 'invoiceBuyer', group: 'invoice', label: '购买方', defaultSelected: true,
      gen: (ctx) => {
        // 优先复用甲方
        let name;
        if (ctx.partyA) name = ctx.partyA;
        else name = genCompanyName();
        if (!ctx._invoiceBuyerCode) ctx._invoiceBuyerCode = _genCreditCode();
        return name + ' | ' + ctx._invoiceBuyerCode;
      }
    },
    {
      id: 'invoiceSeller', group: 'invoice', label: '销售方', defaultSelected: true,
      gen: (ctx) => {
        let name;
        if (ctx.partyB) name = ctx.partyB;
        else name = genCompanyName();
        if (!ctx._invoiceSellerCode) ctx._invoiceSellerCode = _genCreditCode();
        return name + ' | ' + ctx._invoiceSellerCode;
      }
    },

    // ===== 六、备注 remark =====
    {
      id: 'remark', group: 'remark', label: '备注', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.remarkMode || 'normal';
        const custom = cfg.remarkCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">模式：</span>
          <select class="ug-input" data-cfg-simple="remarkMode">
            <option value="normal" ${mode === 'normal' ? 'selected' : ''}>随机普通备注</option>
            <option value="superLong" ${mode === 'superLong' ? 'selected' : ''}>超长(500-2000字)</option>
            <option value="injection" ${mode === 'injection' ? 'selected' : ''}>注入payload</option>
            <option value="custom" ${mode === 'custom' ? 'selected' : ''}>自定义文本</option>
          </select></div>
          <div class="ug-cfg-row" data-cfg-depend="remarkMode:custom"><span class="ug-sub-label">自定义内容：</span></div>
          <div class="ug-cfg-row" data-cfg-depend="remarkMode:custom"><textarea class="ug-textarea" rows="3" data-cfg-text="remarkCustom" placeholder="在此输入固定备注内容，直接返回不随机">${custom}</textarea></div>`;
      },
      gen: (ctx, cfg) => {
        const mode = cfg.remarkMode || 'normal';
        if (mode === 'custom') {
          return cfg.remarkCustom || '';
        }
        if (mode === 'superLong') {
          const base = '本合同未尽事宜，双方可另行签订补充协议，补充协议与本合同具有同等法律效力。本合同一式两份，甲乙双方各执一份，自双方签字盖章之日起生效。';
          let remark = base;
          while (remark.length < _randInt(500, 2000)) {
            remark += base + ' ' + _r(['如有争议', '请及时沟通', '双方应本着友好协商的原则', '共同维护合同履行', '确保各方权益得到保障']);
          }
          return remark.substring(0, _randInt(500, 2000));
        }
        if (mode === 'injection') {
          return _r(INJECTION_PAYLOADS);
        }
        // normal
        return _r([
          '请在付款前确认合同信息无误',
          '本合同自签订之日起生效',
          '附件为本合同不可分割的一部分',
          '双方应按合同约定履行各自义务',
          '如有疑问请联系合同联系人',
          ''
        ]);
      }
    }
  ];

  // ========== 渲染工具 ==========
  function _stringifyVal(v) {
    if (Array.isArray(v)) {
      return v.map(item => {
        if (item && typeof item === 'object') {
          return Object.entries(item).map(([k, v2]) => `${k}:${v2}`).join(' | ');
        }
        return String(item);
      }).join('；');
    }
    if (v && typeof v === 'object') {
      return Object.entries(v).map(([k, v2]) => `${k}:${v2}`).join(' | ');
    }
    return v === undefined || v === null ? '' : String(v);
  }

  function escapeYaml(v) {
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    const s = _stringifyVal(v);
    if (/[:#&*!?|>%@`,\[\]]/.test(s) || s.includes('\n') || s === '' || s !== s.trim()) {
      return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    }
    return s;
  }

  function toJSON(data, pretty) {
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  function toYaml(data) {
    const lines = [];
    for (const [k, v] of Object.entries(data)) {
      lines.push(k + ': ' + escapeYaml(v));
    }
    return lines.join('\n');
  }

  function toText(data) {
    const lines = [];
    for (const [k, v] of Object.entries(data)) {
      lines.push(k + '：' + _stringifyVal(v));
    }
    return lines.join('\n');
  }

  // ========== 工具定义 ==========
  const tool = {
    meta: {
      id: NAME,
      name: '合同票据生成',
      desc: '随机生成合同/票据信息：合同编号/金额/甲乙双方/发票代码/备注等，支持 ERP/OA 系统测试',
      icon: '',
      iconUrl: 'icons/contract-generator.png',
      category: 'data-gen',
      categoryName: '数据工具'
    },
    fieldConfig: {
      keyLang: 'zh',
      // 合同编号
      prefix: 'HT-',
      dateFmt: 'year',
      seqLen: 5,
      bad: false,
      // 合同名称
      nameMode: 'normal',
      // 合同类型
      contractTypes: CONTRACT_TYPES.slice(),
      // 合同状态
      contractStatuses: CONTRACT_STATUSES.slice(),
      // 附件
      attachmentExts: ATTACH_EXTS.slice(),
      // 甲方乙方类型
      partyAType: 'enterprise',
      partyBType: 'enterprise',
      partyAContactMode: 'name',
      partyBContactMode: 'name',
      // 合同金额
      amountWithTaxMin: 8000, amountWithTaxMax: 10000000,
      amountNoTaxMin: 0, amountNoTaxMax: 10000000,
      taxRates: TAX_RATES.map(r => r + '%'),
      // 日期
      signDateMin: 0, signDateMax: 365,
      effectiveDateMin: -30, effectiveDateMax: 30,
      expireDateMin: 90, expireDateMax: 1095,
      expireAbnormal: false,
      // 票据
      invoiceTypes: INVOICE_TYPES.slice(),
      invoiceCodeLen: '12',
      invoiceNoLen: 'auto',
      invoiceAmountMin: 500, invoiceAmountMax: 500000,
      taxAmountMin: 0, taxAmountMax: 1500000,
      totalAmountMin: 0, totalAmountMax: 6500000,
      invoiceDateMin: -30, invoiceDateMax: 0,
      // 备注
      remarkMode: 'normal'
    },
    _currentFmt: 'text',
    _generated: null,
    _toastTimer: null,

    render(root) {
      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${tool.meta.iconUrl}" alt="${tool.meta.name}"> ${tool.meta.name}</h2></div>
          <div class="ug-section ug-config">
              <div class="ug-section-title">生成配置</div>

            <div class="ug-section-sub">
              <div class="ug-section-title">
                <span>选择字段（${FIELDS.length}项）</span>
                <div class="ug-field-actions">
                  <button id="ugSelectAll" class="ug-btn-tiny">全选</button>
                  <button id="ugSelectDefault" class="ug-btn-tiny">默认</button>
                  <button id="ugClearAll" class="ug-btn-tiny">清空</button>
                </div>
              </div>
              <div id="ugFieldGrid" class="ug-field-grid"></div>
              <div id="ugFieldConfig" class="ug-field-config"></div>
            </div>
          </div>
            <div class="ug-config-row">
              <label class="ug-label">Key 语言</label>
              <select class="ug-select" id="ugKeyLang" style="flex:none;width:auto">
                <option value="zh" ${this.fieldConfig.keyLang === 'zh' ? 'selected' : ''}>中文</option>
                <option value="en" ${this.fieldConfig.keyLang === 'en' ? 'selected' : ''}>英文</option>
              </select>
              <label class="ug-label" style="margin-left:8px">数量</label>
              <input type="number" id="ugCount" class="ug-input ug-count" min="1" max="500" value="1">
              <button id="ugGen" class="ug-btn-primary ug-gen-btn">生成</button>
            </div>
          <div class="ug-section ug-result-section">
            <div class="ug-section-title">
              <span>生成结果</span>
              <div class="ug-format-tabs">
                <button class="ug-format-tab active" data-fmt="text">文本</button>
                <button class="ug-format-tab" data-fmt="json">JSON</button>
                <button class="ug-format-tab" data-fmt="yaml">YAML</button>
              </div>
            </div>
            <div id="ugResult" class="ug-result">
              <div class="ug-empty">点击「生成」按钮，生成合同票据信息</div>
            </div>
            <div class="ug-copy-bar">
              <button id="ugCopyAll" class="ug-btn-primary ug-copy-all">复制全部</button>
            </div>
          </div>
        </div>
      `;

      // 渲染字段选择网格（按 CATEGORIES 分组）
      const grid = root.querySelector('#ugFieldGrid');
      const byGroup = {};
      FIELDS.forEach(f => {
        const g = f.group || 'contract';
        (byGroup[g] = byGroup[g] || []).push(f);
      });
      grid.innerHTML = CATEGORIES.map(cat => {
        const fields = byGroup[cat.id] || [];
        if (fields.length === 0) return '';
        const items = fields.map(f => {
          const checked = f.defaultSelected ? 'checked' : '';
          const cfgBtn = f.configUI ? `<button class="ug-cfg-toggle" data-field="${f.id}" title="配置"></button>` : '';
          return `<label class="ug-field-item">
            <input type="checkbox" class="ug-field-check" data-id="${f.id}" ${checked}>
            <span>${f.label}</span>
            ${cfgBtn}
          </label>`;
        }).join('');
        return `<div class="ug-cat-group">
          <div class="ug-cat-title">
            <span>${cat.title}（${fields.length}）</span>
            <div class="ug-cat-btns">
              <button class="ug-btn-tiny ug-cat-sel" data-cat="${cat.id}">全选</button>
              <button class="ug-btn-tiny ug-cat-clr" data-cat="${cat.id}">清空</button>
            </div>
          </div>
          <div class="ug-field-grid ug-cat-grid">${items}</div>
        </div>`;
      }).join('');
      this._currentFmt = 'text';
      this._generated = null;
    },

    mount(context) {
      const { container } = context;

      // 事件绑定
      container.querySelector('#ugGen').addEventListener('click', () => this.doGenerate(container));

      // 数量输入自动 clamp
      const ugCountInput = container.querySelector('#ugCount');
      ugCountInput.addEventListener('input', () => {
        const val = parseInt(ugCountInput.value, 10);
        if (isNaN(val)) return;
        const max = parseInt(ugCountInput.max, 10) || 500;
        const min = parseInt(ugCountInput.min, 10) || 1;
        if (val > max) ugCountInput.value = max;
        if (val < min) ugCountInput.value = min;
      });
      container.querySelector('#ugSelectAll').addEventListener('click', () => this._selectAll(container, true));
      container.querySelector('#ugSelectDefault').addEventListener('click', () => this._selectAll(container, 'default'));
      container.querySelector('#ugClearAll').addEventListener('click', () => this._selectAll(container, false));

      // 全局 key 语言
      container.querySelector('#ugKeyLang').addEventListener('change', (e) => {
        this.fieldConfig.keyLang = e.target.value;
        this._renderResult(container);
      });

      // 字段配置按钮
      const grid = container.querySelector('#ugFieldGrid');
      grid.querySelectorAll('.ug-cfg-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const fieldId = btn.dataset.field;
          const field = FIELDS.find(f => f.id === fieldId);
          const cfgBox = container.querySelector('#ugFieldConfig');
          if (cfgBox.dataset.forField === fieldId && cfgBox.innerHTML) {
            cfgBox.innerHTML = ''; cfgBox.dataset.forField = '';
          } else if (field && field.configUI) {
            cfgBox.innerHTML = `<div class="ug-cfg-block">${field.configUI(this.fieldConfig)}</div>`;
            cfgBox.dataset.forField = fieldId;
            this._bindCfgEvents(cfgBox);
          }
        });
      });

      // 分组全选/清空
      grid.querySelectorAll('.ug-cat-sel').forEach(btn => {
        btn.addEventListener('click', () => {
          const groupRoot = btn.closest('.ug-cat-group');
          groupRoot.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = true);
        });
      });
      grid.querySelectorAll('.ug-cat-clr').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const groupRoot = btn.closest('.ug-cat-group');
          groupRoot.querySelectorAll('.ug-field-check').forEach(cb => cb.checked = false);
        });
      });

      // 格式切换
      container.querySelectorAll('.ug-format-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          container.querySelectorAll('.ug-format-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this._currentFmt = tab.dataset.fmt;
          this._renderResult(container);
        });
      });

      // 复制
      container.querySelector('#ugCopyAll').addEventListener('click', () => {
        const text = this._getCurrentOutput(container);
        navigator.clipboard.writeText(text).then(() => this._toast('已复制全部'));
      });

      this._renderResult(container);
    },

    _bindCfgEvents(box) {
      // 0) bool checkbox
      box.querySelectorAll('[data-cfg-bool]').forEach(cb => {
        cb.checked = !!this.fieldConfig[cb.dataset.cfgBool];
        cb.addEventListener('change', () => { this.fieldConfig[cb.dataset.cfgBool] = cb.checked; });
      });
      // 1) 简单 select / text / number
      box.querySelectorAll('[data-cfg-simple]').forEach(el => {
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT') {
          const key = el.dataset.cfgSimple;
          const cur = this.fieldConfig[key];
          if (cur !== undefined) {
            if (el.type === 'number') el.value = cur;
            else if (el.type === 'text') el.value = cur;
            else el.value = cur;
          }
          el.addEventListener('change', () => {
            if (el.type === 'number') this.fieldConfig[key] = parseInt(el.value, 10);
            else this.fieldConfig[key] = el.value;
          });
        }
      });
      // 2) 多选 checkbox-group
      box.querySelectorAll('[data-cfg-key]').forEach(group => {
        const key = group.dataset.cfgKey;
        const sync = () => {
          const arr = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
          this.fieldConfig[key] = arr;
        };
        group.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', sync));
      });
      // 3) 数字范围（两个 input）
      box.querySelectorAll('[data-cfg-min]').forEach(pair => {
        const key = pair.dataset.cfgMin;
        const inputs = pair.querySelectorAll('input[type="number"]');
        let minKey, maxKey;
        minKey = key + 'Min'; maxKey = key + 'Max';
        inputs[0].addEventListener('change', () => { this.fieldConfig[minKey] = parseInt(inputs[0].value, 10); });
        inputs[1].addEventListener('change', () => { this.fieldConfig[maxKey] = parseInt(inputs[1].value, 10); });
      });
      // 4) textarea
      box.querySelectorAll('[data-cfg-text]').forEach(ta => {
        ta.value = this.fieldConfig[ta.dataset.cfgText] || '';
        ta.addEventListener('input', () => { this.fieldConfig[ta.dataset.cfgText] = ta.value; });
      });
      // 4) 条件显示/隐藏（data-cfg-depend="key:value"）
      const updateDepends = () => {
        box.querySelectorAll('[data-cfg-depend]').forEach(el => {
          const [key, val] = el.dataset.cfgDepend.split(':');
          const show = String(this.fieldConfig[key]) === val;
          el.style.display = show ? '' : 'none';
        });
      };
      updateDepends();
      box.querySelectorAll('[data-cfg-simple]').forEach(el => {
        el.addEventListener('change', updateDepends);
      });
    },

    _selectAll(root, all) {
      const checks = root.querySelectorAll('.ug-field-check');
      checks.forEach((cb) => {
        if (all === true) cb.checked = true;
        else if (all === false) cb.checked = false;
        else cb.checked = FIELDS.find(f => f.id === cb.dataset.id).defaultSelected;
      });
    },

    _getSelected(root) {
      const checks = root.querySelectorAll('.ug-field-check:checked');
      return Array.from(checks).map(c => c.dataset.id);
    },

    // 生成前预填充共享上下文
    _prepareCtx() {
      return { ...this.fieldConfig };
    },

    doGenerate(root) {
      const ids = this._getSelected(root);
      if (ids.length === 0) { flashMessage('请先选择至少一个字段', 'warn'); return; }
      const count = Math.max(1, Math.min(500, parseInt(root.querySelector('#ugCount').value) || 1));

      const results = [];
      for (let i = 0; i < count; i++) {
        const ctx = this._prepareCtx();
        const item = {};
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

    _renderResult(root) {
      const box = root.querySelector('#ugResult');
      if (!this._generated || this._generated.length === 0) {
        box.innerHTML = '<div class="ug-empty">点击「生成」按钮，生成合同票据信息</div>';
        return;
      }
      const fmt = this._currentFmt || 'text';
      box.classList.toggle('ug-result-code', fmt !== 'text');

      if (fmt === 'text') {
        box.innerHTML = this._generated.map((item, idx) => {
          const lines = Object.entries(item).map(([k, v]) => {
            const valStr = Array.isArray(v)
              ? v.map(m => Object.entries(m).map(([k2, v2]) => `${k2}:${v2}`).join(' | ')).join('；')
              : (v === null || v === undefined) ? '' : v;
            return `<div class="ug-row"><span class="ug-row-label">${k}</span><span class="ug-row-val">${valStr}</span></div>`;
          });
          const header = this._generated.length > 1 ? `<div class="ug-entry-header">#${idx + 1}</div>` : '';
          return `<div class="ug-entry">${header}${lines.join('')}</div>`;
        }).join('<div class="ug-entry-sep"></div>');
      } else if (fmt === 'json') {
        box.innerHTML = `<pre>${toJSON(this._generated.length === 1 ? this._generated[0] : this._generated, true)}</pre>`;
      } else {
        let yaml;
        if (this._generated.length === 1) {
          yaml = toYaml(this._generated[0]);
        } else {
          yaml = this._generated.map(item => '- ' + toYaml(item).replace(/\n/g, '\n  ')).join('\n');
        }
        box.innerHTML = `<pre>${yaml}</pre>`;
      }
    },

    _getCurrentOutput(root) {
      if (!this._generated) return '';
      const fmt = this._currentFmt || 'text';
      if (fmt === 'json') return toJSON(this._generated.length === 1 ? this._generated[0] : this._generated, true);
      if (fmt === 'yaml') {
        return this._generated.length === 1
          ? toYaml(this._generated[0])
          : this._generated.map(item => '- ' + toYaml(item).replace(/\n/g, '\n  ')).join('\n');
      }
      return this._generated.map(item => toText(item)).join('\n\n');
    },

    _toast(msg) {
      flashMessage(msg, 'success');
    }
  };

  // 注册
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

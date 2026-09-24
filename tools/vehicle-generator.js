// tools/vehicle-generator.js — 车辆信息随机生成（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const NAME = 'vehicle-generator';

  // ========== 常量表 ==========
  // 省级简称
  const PROV_SHORT = ['京', '沪', '粤', '浙', '苏', '鲁', '豫', '川', '鄂', '湘',
    '闽', '皖', '冀', '黑', '吉', '辽', '秦', '晋', '赣', '云',
    '贵', '桂', '琼', '甘', '青', '蒙', '新', '藏', '宁', '渝', '港', '澳'];

  // 字母池（排除 O / I）
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  // 数字
  const DIGITS = '0123456789';
  // 字母+数字（排除 O/I）
  const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  // VIN 字符池（排除 I/O/Q）
  const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

  // 车辆类型
  const VEHICLE_TYPES = ['小型轿车', 'SUV', '货车', '客车', '面包车', '摩托车', '新能源汽车', '中型轿车', '重型货车', '越野车'];

  // 品牌 + 型号
  const BRAND_MODELS = [
    { brand: '比亚迪', models: ['秦PLUS', '汉EV', '唐DM', '宋PLUS', '元PLUS', '海豹', '海豚', '海鸥', '护卫舰07'] },
    { brand: '丰田', models: ['凯美瑞', '卡罗拉', '汉兰达', 'RAV4', '亚洲龙', '奕泽', '雷凌', '威兰达', '赛那'] },
    { brand: '大众', models: ['帕萨特', '迈腾', '朗逸', '途观L', '探岳', '速腾', '宝来', '高尔夫', '途昂', 'ID.4'] },
    { brand: '宝马', models: ['3系', '5系', '7系', 'X3', 'X5', 'X7', '1系', '2系', '4系', 'iX3'] },
    { brand: '奔驰', models: ['C级', 'E级', 'S级', 'GLC', 'GLE', 'GLB', 'A级', 'B级', 'G级', 'EQC'] },
    { brand: '奥迪', models: ['A4L', 'A6L', 'A8L', 'Q5L', 'Q7', 'Q3', 'A3', 'A5', 'Q2L', 'e-tron'] },
    { brand: '吉利', models: ['博越', '星越L', '帝豪', '缤瑞', '豪越', '几何C', '星瑞', '星越S', '缤越'] },
    { brand: '长城', models: ['哈弗H6', '哈弗神兽', '长城炮', '欧拉好猫', '欧拉黑猫', '魏牌摩卡', '坦克300'] },
    { brand: '特斯拉', models: ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck'] },
    { brand: '理想', models: ['L9', 'L8', 'L7', 'L6', '理想ONE'] },
    { brand: '蔚来', models: ['ES8', 'ES6', 'EC6', 'ET7', 'ET5', 'EL7'] },
    { brand: '小鹏', models: ['P7', 'G3', 'P5', 'G9', 'X9'] },
    { brand: '本田', models: ['雅阁', '思域', 'CR-V', '皓影', '飞度', '型格', '冠道', 'UR-V', '奥德赛'] },
    { brand: '日产', models: ['天籁', '轩逸', '奇骏', '逍客', '楼兰', '蓝鸟', 'GT-R'] },
    { brand: '福特', models: ['蒙迪欧', '福克斯', '锐界', '探险者', '锐际', 'Mustang', 'F-150'] },
    { brand: '别克', models: ['君威', '君越', '昂科威', '昂科旗', '威朗', 'GL8', '微蓝6'] },
    { brand: '雪佛兰', models: ['迈锐宝XL', '科鲁泽', '探界者', '开拓者', '赛欧'] },
    { brand: '马自达', models: ['阿特兹', '马自达3', 'CX-5', 'CX-30', 'MX-5'] },
    { brand: '现代', models: ['索纳塔', '伊兰特', '途胜L', '胜达', '菲斯塔', '库斯途'] },
    { brand: '起亚', models: ['K5', 'K3', '智跑', '嘉华', '焕驰', '奕跑'] }
  ];

  // 颜色
  const COLORS = ['白色', '黑色', '灰色', '红色', '蓝色', '银色', '棕色', '橙色', '黄色', '绿色'];

  // 使用性质
  const USAGE_TYPES = ['非营运', '营运', '租赁', '教练', '出租客运', '公交客运', '货运'];

  // 车辆状态
  const VEHICLE_STATUSES = ['正常', '查封', '抵押', '锁定', '注销', '暂扣', '盗抢'];

  // 燃料种类
  const FUEL_TYPES = ['汽油', '柴油', '纯电', '混动', '天然气', '插电混动', '增程式'];

  // 排量
  const DISPLACEMENTS = ['1.0L', '1.2L', '1.4T', '1.5L', '1.5T', '1.6L', '1.8L', '2.0L', '2.0T', '2.5L', '3.0L', '3.0T', '4.0T', '电动'];

  // 准驾车型
  const LICENSE_TYPES = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'C3', 'C4', 'D', 'E', 'F'];

  // 驾照状态
  const LICENSE_STATUSES = ['正常', '暂扣', '注销', '超分', '停止使用', '扣留'];

  // 违章代码前缀（简化）
  const VIOLATION_CODES = ['1001', '1002', '1039', '1043', '1044', '1045', '1046', '1047',
    '1048', '1049', '1050', '1051', '1052', '1053', '1054', '1055',
    '1301', '1302', '1303', '1304', '1305', '1306', '1307', '1308',
    '1309', '1310', '1311', '1312', '1313', '1314', '1315', '1316',
    '1625', '1626', '1627', '1628', '1629', '1630', '1631', '1632',
    '5005', '5006', '5007', '5008', '5009', '5010', '5011', '5012'];

  // 违章地点路名
  const VIOLATION_ROADS = ['长安街', '人民路', '建设路', '解放路', '中山路', '和平路',
    '文化路', '科技路', '创新路', '幸福路', '光明路', '团结路',
    '友谊路', '健康路', '工农路', '劳动路', '青年大街', '人民广场',
    '二环路', '三环路', '四环路', '高新区大道', '滨海大道', '滨江路',
    '中山大道', '天府大道', '中环高架', '东方明珠路', '深南大道', '北环大道'];

  // 保险公司
  const INSURANCE_COMPANIES = ['中国人民财产保险', '平安财产保险', '太平洋财产保险', '中国人寿财产保险',
    '中华联合财产保险', '大地保险', '阳光财产保险', '天安财产保险', '太平财产保险',
    '华泰财产保险', '永诚财产保险', '安邦财产保险'];

  // 车主姓名用姓氏
  const SUR_NAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const GIVEN_NAMES = ['伟', '强', '磊', '军', '洋', '勇', '杰', '涛', '明', '超',
    '芳', '娜', '敏', '静', '丽', '虹', '艳', '娟', '霞', '慧'];

  // 手机号号段
  const PHONE_PREFIXES = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '145', '146', '147', '149',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '162', '165', '166', '167',
    '170', '171', '172', '173', '175', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
    '190', '191', '193', '195', '197', '198', '199'];

  // 地址
  const PROVINCES = ['北京', '上海', '广东', '浙江', '江苏', '山东', '河南', '四川', '湖北', '湖南',
    '福建', '安徽', '河北', '辽宁', '吉林', '黑龙江', '陕西', '山西', '江西', '云南'];
  const CITIES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '宁波市', '南京市', '苏州市',
    '济南市', '青岛市', '郑州市', '成都市', '武汉市', '长沙市', '福州市', '合肥市', '石家庄市',
    '沈阳市', '长春市', '哈尔滨市', '西安市', '太原市', '南昌市', '昆明市', '大连市', '无锡市',
    '常州市', '厦门市', '东莞市', '佛山市'];
  const DISTRICTS = ['朝阳区', '海淀区', '浦东新区', '徐汇区', '天河区', '越秀区', '福田区', '南山区',
    '西湖区', '滨江区', '鼓楼区', '玄武区', '历下区', '市南区', '金水区', '武侯区', '锦江区', '武昌区',
    '洪山区', '岳麓区', '芙蓉区', '思明区', '庐阳区', '长安区', '和平区', '沈河区', '朝阳区', '南关区',
    '道里区', '雁塔区', '小店区', '青云谱区', '盘龙区', '铁西区', '姑苏区', '梁溪区', '湖里区', '禅城区'];

  // 企业名称
  const COMPANY_PREFIX = ['华信', '中兴', '华夏', '中联', '宏达', '恒通', '万达', '中天',
    '鼎盛', '卓越', '兴业', '富邦', '金汇', '环球', '新世纪', '东方'];
  const COMPANY_INDUSTRY = ['科技', '信息', '网络', '数据', '智能', '电子', '生物', '医药',
    '能源', '环保', '材料', '机械', '汽车', '金融', '投资', '贸易'];
  const COMPANY_SUFFIX = ['有限公司', '股份有限公司', '集团有限公司', '有限责任公司'];

  // 统一社会信用代码
  const USCC_CHARS = '0123456789ABCDEFGHJKLMNPQRTUWXY';
  const USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 4, 5, 7, 20, 6, 23, 15, 19, 1];
  const USCC_REG_CODES = ['9', '5', '1', 'Y', '6'];

  // ========== 工具函数 ==========
  const _r = (a) => a[Math.floor(Math.random() * a.length)];
  const _randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _pad = (n, len) => String(n).padStart(len, '0');

  function _randDateISO(offsetDays) {
    // offsetDays 正数=未来，负数=过去
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + '-' + _pad(d.getMonth() + 1, 2) + '-' + _pad(d.getDate(), 2);
  }

  function _genFutureDate(minDays, maxDays) {
    return _randDateISO(_randInt(minDays, maxDays));
  }

  function _genPastDate(minDays, maxDays) {
    return _randDateISO(-_randInt(minDays, maxDays));
  }

  function _genNormalDate(startYear, endYear) {
    const year = _randInt(startYear, endYear);
    const month = _randInt(1, 12);
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = _randInt(1, daysInMonth);
    return year + '-' + _pad(month, 2) + '-' + _pad(day, 2);
  }

  function genPlate(cfg) {
    // 牌种多选
    const types = cfg.plateTypes || ['blue'];
    const weird = cfg.plateWeird || false;

    // 正常车牌
    const plateType = _r(types);
    const prov = _r(PROV_SHORT);
    const letter = LETTERS[_randInt(0, LETTERS.length - 1)];

    let body = '';
    if (plateType === 'blue') {
      // 蓝牌：5位
      for (let i = 0; i < 5; i++) body += ALNUM[_randInt(0, ALNUM.length - 1)];
    } else if (plateType === 'green') {
      // 绿牌新能源：6位，第6位用 D/F/H/A
      for (let i = 0; i < 5; i++) body += ALNUM[_randInt(0, ALNUM.length - 1)];
      body += _r(['D', 'F', 'H', 'A']);
    } else if (plateType === 'yellow') {
      // 黄牌：6位
      for (let i = 0; i < 6; i++) body += ALNUM[_randInt(0, ALNUM.length - 1)];
    } else if (plateType === 'coach') {
      // 教练车
      for (let i = 0; i < 5; i++) body += ALNUM[_randInt(0, ALNUM.length - 1)];
      body += '学';
    } else if (plateType === 'police') {
      // 警车
      for (let i = 0; i < 5; i++) body += ALNUM[_randInt(0, ALNUM.length - 1)];
      body += '警';
    }

    let plate = prov + letter + body;

    // 畸形
    if (weird) {
      const wt = _randInt(0, 3);
      if (wt === 0) plate = ''; // 空
      else if (wt === 1) plate = plate + '_EXTRA_LONG_' + _randInt(100, 999); // 超长
      else if (wt === 2) plate = plate + '@#￥'; // 特殊字符
      // wt===3 保持正常（概率较低）
    }
    return plate;
  }

  function genVIN(cfg) {
    const weird = cfg.vinWeird || false;
    if (weird && Math.random() < 0.6) {
      const wt = _randInt(0, 2);
      if (wt === 0) {
        // 长度不对
        const len = _randInt(5, 20);
        let v = '';
        for (let i = 0; i < len; i++) v += VIN_CHARS[_randInt(0, VIN_CHARS.length - 1)];
        return v;
      } else if (wt === 1) {
        // 含 I/O/Q
        let v = '';
        for (let i = 0; i < 14; i++) v += VIN_CHARS[_randInt(0, VIN_CHARS.length - 1)];
        v += _r(['I', 'O', 'Q']);
        v += VIN_CHARS[_randInt(0, VIN_CHARS.length - 1)];
        v += _r(['I', 'O', 'Q']);
        return v;
      } else {
        // 空/null
        return Math.random() < 0.5 ? '' : null;
      }
    }
    let v = '';
    for (let i = 0; i < 17; i++) v += VIN_CHARS[_randInt(0, VIN_CHARS.length - 1)];
    return v;
  }

  function genEngine() {
    const len = _randInt(10, 20);
    let e = '';
    for (let i = 0; i < len; i++) e += ALNUM[_randInt(0, ALNUM.length - 1)];
    return e;
  }

  function genIdCard() {
    // 身份证校验码
    function checksum(first17) {
      const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
      const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
      let sum = 0;
      for (let i = 0; i < 17; i++) sum += parseInt(first17[i]) * weights[i];
      return codes[sum % 11];
    }
    const area = _pad(_randInt(110000, 659999), 6);
    const birthYear = _randInt(1950, 2005);
    const birthMonth = _pad(_randInt(1, 12), 2);
    const birthDay = _pad(_randInt(1, 28), 2);
    const seq = _pad(_randInt(1, 999), 3);
    const first17 = area + birthYear + birthMonth + birthDay + seq;
    return first17 + checksum(first17);
  }

  function genPhone() {
    return _r(PHONE_PREFIXES) + _pad(_randInt(10000000, 99999999), 8);
  }

  function genAddress() {
    const prov = _r(PROVINCES);
    const city = _r(CITIES);
    const district = _r(DISTRICTS);
    const streetAdj = _r(['中', '人', '建', '解', '和', '文', '光', '团', '新', '幸', '财', '富', '金', '银', '玉', '龙', '凤', '鹤', '燕', '青', '绿', '红', '白', '黑', '黄', '蓝', '紫', '翠', '江', '河', '湖', '海', '山', '石', '林', '花', '草', '桃', '杏', '桂']);
    const streetNoun = _r(['山', '水', '洲', '湾', '港', '岛', '滩', '岸', '堤', '坡', '谷', '峰', '岭', '泉', '溪', '潭', '桥', '岗', '坝', '坪', '田', '庄', '园', '林', '村', '坊', '阁', '轩', '居', '苑', '府', '庭', '院', '宫', '殿', '堂']);
    const streetSuffix = _r(['路', '街', '大道', '巷', '广场', '花园', '大厦', '写字楼', '科技园', '产业园', '小区', '公寓', '弄', '胡同', '里', '坊', '院', '庄']);
    const street = streetAdj + streetNoun + streetSuffix;
    return prov + city + district + street + _randInt(1, 999) + '号';
  }

  function genUSCC() {
    function usccChecksum(first17) {
      let sum = 0;
      for (let i = 0; i < 17; i++) {
        const idx = USCC_CHARS.indexOf(first17[i]);
        if (idx < 0) return '0';
        sum += idx * USCC_WEIGHTS[i];
      }
      const remainder = sum % 31;
      const check = (31 - remainder) % 31;
      return USCC_CHARS[check];
    }
    const regCode = _r(USCC_REG_CODES);
    const catCode = _r(['1', '2', '3', '9']);
    const area = _pad(_randInt(110000, 659999), 6);
    let orgCode = '';
    for (let i = 0; i < 8; i++) orgCode += USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)];
    const first17 = regCode + catCode + area + orgCode;
    return first17 + usccChecksum(first17);
  }

  function genCompanyName() {
    return _r(COMPANY_PREFIX) + _r(COMPANY_INDUSTRY) + _r(COMPANY_SUFFIX);
  }

  function genViolation() {
    return {
      location: _r(VIOLATION_ROADS) + _randInt(1, 999) + '号',
      code: _r(VIOLATION_CODES),
      fine: _randInt(50, 2000),
      points: _randInt(0, 12),
      time: _genPastDate(1, 720)
    };
  }

  // ========== 字段 key 中英文映射 ==========
  const FIELD_KEYS = {
    plateNumber: { zh: '车牌号', en: 'plateNumber' },
    vehicleType: { zh: '车辆类型', en: 'vehicleType' },
    brand: { zh: '车辆品牌', en: 'brand' },
    model: { zh: '车辆型号', en: 'model' },
    color: { zh: '车身颜色', en: 'color' },
    vin: { zh: 'VIN车架号', en: 'vin' },
    engineNumber: { zh: '发动机号', en: 'engineNumber' },
    vehicleId: { zh: '车辆识别代号', en: 'vehicleId' },
    licenseNo: { zh: '行驶证编号', en: 'licenseNo' },
    registerNo: { zh: '登记证书编号', en: 'registerNo' },
    registerDate: { zh: '注册日期', en: 'registerDate' },
    issueDate: { zh: '发证日期', en: 'issueDate' },
    scrapDate: { zh: '强制报废日期', en: 'scrapDate' },
    usageType: { zh: '使用性质', en: 'usageType' },
    inspectExpire: { zh: '年检有效期', en: 'inspectExpire' },
    insuranceExpire: { zh: '交强险到期时间', en: 'insuranceExpire' },
    vehicleStatus: { zh: '车辆状态', en: 'vehicleStatus' },
    totalMass: { zh: '总质量(kg)', en: 'totalMass' },
    curbMass: { zh: '整备质量(kg)', en: 'curbMass' },
    seatCount: { zh: '核定载人数', en: 'seatCount' },
    displacement: { zh: '排量', en: 'displacement' },
    fuelType: { zh: '燃料种类', en: 'fuelType' },
    ownerName: { zh: '车主姓名', en: 'ownerName' },
    ownerIdCard: { zh: '车主身份证号', en: 'ownerIdCard' },
    ownerPhone: { zh: '车主手机号', en: 'ownerPhone' },
    ownerAddress: { zh: '车主地址', en: 'ownerAddress' },
    ownerType: { zh: '车主类型', en: 'ownerType' },
    ownerCreditCode: { zh: '统一社会信用代码', en: 'ownerCreditCode' },
    policyNo: { zh: '保单号', en: 'policyNo' },
    violations: { zh: '违章记录', en: 'violations' },
    driverLicense: { zh: '驾驶证信息', en: 'driverLicense' },
    mileage: { zh: '里程(km)', en: 'mileage' },
    currentLocation: { zh: '当前位置', en: 'currentLocation' },
    coordinates: { zh: '经纬度', en: 'coordinates' }
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

  // ========== 字段分类 ==========
  const CATEGORIES = [
    { id: 'basic', title: '🚗 车辆基础' },
    { id: 'cert', title: '📄 车辆证件' },
    { id: 'status', title: '📊 业务/状态' },
    { id: 'owner', title: '👤 车主信息' },
    { id: 'traffic', title: '🪪 交管业务' }
  ];

  // ========== 字段注册表 ==========
  const FIELDS = [
    // ===== 一、车辆基础 basic =====
    {
      id: 'plateNumber', group: 'basic', label: '车牌号', defaultSelected: true,
      configUI: (cfg) => {
        const types = cfg.plateTypes || ['blue', 'green', 'yellow', 'coach', 'police'];
        const weirdChecked = cfg.plateWeird ? 'checked' : '';
        return `
          <div class="ug-cfg-row"><span class="ug-sub-label">牌种(多选)：</span></div>
          <div class="ug-cfg-row"><div class="ug-checkbox-group" data-cfg-key="plateTypes">
            <label><input type="checkbox" value="blue" ${types.includes('blue') ? 'checked' : ''}>蓝牌</label>
            <label><input type="checkbox" value="green" ${types.includes('green') ? 'checked' : ''}>绿牌(新能源)</label>
            <label><input type="checkbox" value="yellow" ${types.includes('yellow') ? 'checked' : ''}>黄牌</label>
            <label><input type="checkbox" value="coach" ${types.includes('coach') ? 'checked' : ''}>教练车(学)</label>
            <label><input type="checkbox" value="police" ${types.includes('police') ? 'checked' : ''}>警车(警)</label>
          </div></div>
          <div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="plateWeird" ${weirdChecked}> 畸形车牌(空/超长/特殊字符)</label></div>
        `;
      },
      gen: (ctx, cfg) => genPlate(cfg)
    },
    {
      id: 'vehicleType', group: 'basic', label: '车辆类型', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.vehicleTypes || VEHICLE_TYPES;
        const custom = cfg.vehicleTypeCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">车辆类型(多选)：</span></div>
          ${_tplCheckboxes('vehicleTypes', VEHICLE_TYPES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义(逗号分隔)：</span></div>
          ${_tplTextarea('vehicleTypeCustom', custom, '如: 皮卡, 房车')}`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.vehicleTypes && cfg.vehicleTypes.length > 0 ? cfg.vehicleTypes : VEHICLE_TYPES;
        if (cfg.vehicleTypeCustom) {
          const extra = cfg.vehicleTypeCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        return _r(pool);
      }
    },
    {
      id: 'brand', group: 'basic', label: '车辆品牌', defaultSelected: true,
      configUI: (cfg) => {
        const brands = BRAND_MODELS.map(b => b.brand);
        const selected = cfg.brands || brands;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">品牌(多选)：</span></div>
          ${_tplCheckboxes('brands', brands, selected)}`;
      },
      gen: (ctx, cfg) => {
        const brands = cfg.brands && cfg.brands.length > 0 ? cfg.brands : BRAND_MODELS.map(b => b.brand);
        return _r(brands);
      }
    },
    {
      id: 'model', group: 'basic', label: '车辆型号', defaultSelected: true,
      gen: (ctx, cfg) => {
        // 自动跟随品牌生成
        const brands = cfg.brands && cfg.brands.length > 0 ? cfg.brands : BRAND_MODELS.map(b => b.brand);
        const brandName = _r(brands);
        const brandObj = BRAND_MODELS.find(b => b.brand === brandName);
        const modelName = brandObj ? _r(brandObj.models) : '未知型号';
        return brandName + ' ' + modelName;
      }
    },
    {
      id: 'color', group: 'basic', label: '车身颜色', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.colors || COLORS;
        const colorWeird = cfg.colorWeird || false;
        const weirdChecked = colorWeird ? 'checked' : '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">颜色(多选)：</span></div>
          ${_tplCheckboxes('colors', COLORS, selected)}
          <div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="colorWeird" ${weirdChecked}> 畸形颜色(超长/特殊符号)</label></div>`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.colors && cfg.colors.length > 0 ? cfg.colors : COLORS;
        let c = _r(pool);
        if (cfg.colorWeird && Math.random() < 0.3) {
          const wt = _randInt(0, 2);
          if (wt === 0) c = c + '-金属漆+珍珠漆+哑光';
          else if (wt === 1) c = c + '@#￥%';
          else c = '';
        }
        return c;
      }
    },
    {
      id: 'vin', group: 'basic', label: 'VIN车架号', defaultSelected: true,
      configUI: (cfg) => {
        const weird = cfg.vinWeird ? 'checked' : '';
        return `<div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="vinWeird" ${weird}> 畸形VIN(长度不对/含I/O/Q)</label></div>`;
      },
      gen: (ctx, cfg) => genVIN(cfg)
    },
    {
      id: 'engineNumber', group: 'basic', label: '发动机号', defaultSelected: true,
      gen: () => genEngine()
    },
    {
      id: 'vehicleId', group: 'basic', label: '车辆识别代号', defaultSelected: false,
      gen: () => genVIN({ vinWeird: false })
    },
    {
      id: 'mileage', group: 'basic', label: '里程(km)', defaultSelected: false,
      configUI: (cfg) => _tplRange('mileage', cfg.mileageMin || 0, cfg.mileageMax || 300000, 0, 999999),
      gen: (ctx, cfg) => {
        const mn = cfg.mileageMin !== undefined ? cfg.mileageMin : 0;
        const mx = cfg.mileageMax !== undefined ? cfg.mileageMax : 300000;
        return _randInt(mn, mx);
      }
    },

    {
      id: 'currentLocation', group: 'basic', label: '当前位置', defaultSelected: false,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
          <select class="ug-input" data-cfg-simple="locationFmt">
            <option value="detail" ${cfg.locationFmt !== 'simple' && cfg.locationFmt !== 'short' ? 'selected' : ''}>详细地址</option>
            <option value="short" ${cfg.locationFmt === 'short' ? 'selected' : ''}>极简地址（省+市）</option>
            <option value="long" ${cfg.locationFmt === 'long' ? 'selected' : ''}>超长地址（含门牌号楼层）</option>
          </select>
        </div>`,
      gen: (ctx, cfg) => {
        const fmt = cfg.locationFmt || 'detail';
        const prov = _r(PROVINCES);
        const city = _r(CITIES);
        if (fmt === 'short') return prov + city;
        const district = _r(DISTRICTS);
        if (fmt === 'long') {
          const road = _r(['中山路', '人民路', '解放路', '建设路', '和平路', '文化路', '商业街', '科技路', '滨江路', '环城路']);
          const num = _randInt(1, 999);
          const floor = _randInt(1, 30);
          return prov + city + district + road + num + '号' + floor + '层';
        }
        return prov + city + district;
      }
    },

    {
      id: 'coordinates', group: 'basic', label: '经纬度', defaultSelected: false,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
          <select class="ug-input" data-cfg-simple="coordFmt">
            <option value="pair" ${cfg.coordFmt !== 'latFirst' && cfg.coordFmt !== 'lonFirst' && cfg.coordFmt !== 'dms' ? 'selected' : ''}>纬度,经度（浮点）</option>
            <option value="latFirst" ${cfg.coordFmt === 'latFirst' ? 'selected' : ''}>纬度,经度（明确标注）</option>
            <option value="lonFirst" ${cfg.coordFmt === 'lonFirst' ? 'selected' : ''}>经度,纬度（GeoJSON 风格）</option>
            <option value="dms" ${cfg.coordFmt === 'dms' ? 'selected' : ''}>度分秒</option>
          </select>
        </div>
        <div class="ug-cfg-row"><span class="ug-sub-label">坐标系：</span>
          <select class="ug-input" data-cfg-simple="coordSys">
            <option value="WGS84" ${!cfg.coordSys || cfg.coordSys === 'WGS84' ? 'selected' : ''}>WGS84（GPS）</option>
            <option value="GCJ02" ${cfg.coordSys === 'GCJ02' ? 'selected' : ''}>GCJ02（国测局/高德）</option>
            <option value="BD09" ${cfg.coordSys === 'BD09' ? 'selected' : ''}>BD09（百度）</option>
          </select>
        </div>`,
      gen: (ctx, cfg) => {
        const fmt = cfg.coordFmt || 'pair';
        // 中国境内随机点：纬度 18-53，经度 73-135
        const lat = +(_randInt(1800000, 5300000) / 100000).toFixed(6);
        const lon = +(_randInt(7300000, 13500000) / 100000).toFixed(6);
        if (fmt === 'latFirst') return '纬度:' + lat + ', 经度:' + lon;
        if (fmt === 'lonFirst') return lon + ',' + lat; // GeoJSON 风格 [lon, lat]
        if (fmt === 'dms') {
          function toDms(d, isLat) {
            const abs = Math.abs(d);
            const deg = Math.floor(abs);
            const min = Math.floor((abs - deg) * 60);
            const sec = ((abs - deg - min / 60) * 3600).toFixed(2);
            const dir = isLat ? (d >= 0 ? 'N' : 'S') : (d >= 0 ? 'E' : 'W');
            return deg + '°' + min + "'" + sec + '"' + dir;
          }
          return toDms(lat, true) + ' ' + toDms(lon, false);
        }
        return lat + ',' + lon;
      }
    },

    // ===== 二、车辆证件 cert =====
    {
      id: 'licenseNo', group: 'cert', label: '行驶证编号', defaultSelected: true,
      gen: () => {
        const prov = _r(PROV_SHORT);
        const letter = LETTERS[_randInt(0, LETTERS.length - 1)];
        let num = '';
        for (let i = 0; i < 8; i++) num += DIGITS[_randInt(0, 9)];
        return prov + letter + num;
      }
    },
    {
      id: 'registerNo', group: 'cert', label: '登记证书编号', defaultSelected: true,
      gen: () => {
        let s = '';
        for (let i = 0; i < 12; i++) s += DIGITS[_randInt(0, 9)];
        return s;
      }
    },
    {
      id: 'registerDate', group: 'cert', label: '注册日期', defaultSelected: true,
      gen: () => _genNormalDate(2000, new Date().getFullYear())
    },
    {
      id: 'issueDate', group: 'cert', label: '发证日期', defaultSelected: false,
      gen: () => _genNormalDate(2000, new Date().getFullYear())
    },
    {
      id: 'scrapDate', group: 'cert', label: '强制报废日期', defaultSelected: false,
      gen: () => _genNormalDate(new Date().getFullYear(), new Date().getFullYear() + 25)
    },
    {
      id: 'usageType', group: 'cert', label: '使用性质', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.usageTypes || USAGE_TYPES.slice();
        return `<div class="ug-cfg-row"><span class="ug-sub-label">使用性质(多选)：</span></div>
          ${_tplCheckboxes('usageTypes', USAGE_TYPES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.usageTypes && cfg.usageTypes.length > 0 ? cfg.usageTypes : USAGE_TYPES.slice();
        return _r(pool);
      }
    },

    // ===== 三、车辆业务 & 状态 status =====
    {
      id: 'inspectExpire', group: 'status', label: '年检有效期', defaultSelected: true,
      configUI: (cfg) => {
        const mode = cfg.inspectMode || 'normal';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">年检状态：</span>
          <select class="ug-select" data-cfg-simple="inspectMode">
            <option value="normal" ${mode === 'normal' ? 'selected' : ''}>正常(未来30-365天)</option>
            <option value="expired" ${mode === 'expired' ? 'selected' : ''}>已过期(过去30-365天)</option>
            <option value="invalid" ${mode === 'invalid' ? 'selected' : ''}>非法值(空/null/异常)</option>
          </select></div>`;
      },
      gen: (ctx, cfg) => {
        const mode = cfg.inspectMode || 'normal';
        if (mode === 'normal') return _genFutureDate(30, 365);
        if (mode === 'expired') return _genPastDate(30, 365);
        // invalid
        const t = _randInt(0, 2);
        if (t === 0) return '';
        if (t === 1) return null;
        return '非法日期：' + _randInt(100, 9999);
      }
    },
    {
      id: 'insuranceExpire', group: 'status', label: '交强险到期时间', defaultSelected: true,
      gen: () => _genFutureDate(1, 365)
    },
    {
      id: 'vehicleStatus', group: 'status', label: '车辆状态', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.vehicleStatuses || ['正常'];
        const custom = cfg.vehicleStatusCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">车辆状态(多选)：</span></div>
          ${_tplCheckboxes('vehicleStatuses', VEHICLE_STATUSES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义(逗号分隔)：</span></div>
          ${_tplTextarea('vehicleStatusCustom', custom, '如: 事故待处理')}`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.vehicleStatuses && cfg.vehicleStatuses.length > 0 ? cfg.vehicleStatuses : ['正常'];
        if (cfg.vehicleStatusCustom) {
          const extra = cfg.vehicleStatusCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        return _r(pool);
      }
    },
    {
      id: 'totalMass', group: 'status', label: '总质量(kg)', defaultSelected: false,
      configUI: (cfg) => _tplRange('totalMass', cfg.totalMassMin || 3000, cfg.totalMassMax || 25000, 500, 100000),
      gen: (ctx, cfg) => {
        const mn = cfg.totalMassMin !== undefined ? cfg.totalMassMin : 3000;
        const mx = cfg.totalMassMax !== undefined ? cfg.totalMassMax : 25000;
        return _randInt(mn, mx);
      }
    },
    {
      id: 'curbMass', group: 'status', label: '整备质量(kg)', defaultSelected: false,
      configUI: (cfg) => _tplRange('curbMass', cfg.curbMassMin || 1000, cfg.curbMassMax || 8000, 500, 50000),
      gen: (ctx, cfg) => {
        const mn = cfg.curbMassMin !== undefined ? cfg.curbMassMin : 1000;
        const mx = cfg.curbMassMax !== undefined ? cfg.curbMassMax : 8000;
        return _randInt(mn, mx);
      }
    },
    {
      id: 'seatCount', group: 'status', label: '核定载人数', defaultSelected: false,
      configUI: (cfg) => _tplRange('seatCount', cfg.seatCountMin || 2, cfg.seatCountMax || 55, 1, 99),
      gen: (ctx, cfg) => {
        const mn = cfg.seatCountMin !== undefined ? cfg.seatCountMin : 2;
        const mx = cfg.seatCountMax !== undefined ? cfg.seatCountMax : 55;
        return _randInt(mn, mx);
      }
    },
    {
      id: 'displacement', group: 'status', label: '排量', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.displacements || DISPLACEMENTS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">排量(多选)：</span></div>
          ${_tplCheckboxes('displacements', DISPLACEMENTS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.displacements && cfg.displacements.length > 0 ? cfg.displacements : DISPLACEMENTS;
        return _r(pool);
      }
    },
    {
      id: 'fuelType', group: 'status', label: '燃料种类', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.fuelTypes || FUEL_TYPES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">燃料(多选)：</span></div>
          ${_tplCheckboxes('fuelTypes', FUEL_TYPES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.fuelTypes && cfg.fuelTypes.length > 0 ? cfg.fuelTypes : FUEL_TYPES;
        return _r(pool);
      }
    },

    // ===== 四、车主 owner =====
    {
      id: 'ownerType', group: 'owner', label: '车主类型', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.ownerTypes || ['个人'];
        return `<div class="ug-cfg-row"><span class="ug-sub-label">车主类型(多选)：</span></div>
          ${_tplCheckboxes('ownerTypes', ['个人', '企业'], selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.ownerTypes && cfg.ownerTypes.length > 0 ? cfg.ownerTypes : ['个人'];
        return _r(pool);
      }
    },
    {
      id: 'ownerName', group: 'owner', label: '车主姓名', defaultSelected: true,
      gen: (ctx) => {
        // 如果车主类型是企业，gen 返回公司名
        const type = ctx.ownerType || '个人';
        if (type === '企业') return genCompanyName();
        const sur = _r(SUR_NAMES);
        const gn = Math.random() < 0.3 ? _r(GIVEN_NAMES) + _r(GIVEN_NAMES) : _r(GIVEN_NAMES);
        return sur + gn;
      }
    },
    {
      id: 'ownerIdCard', group: 'owner', label: '车主身份证号', defaultSelected: true,
      gen: (ctx) => {
        if (ctx.ownerType === '企业') return genUSCC();
        return genIdCard();
      }
    },
    {
      id: 'ownerPhone', group: 'owner', label: '车主手机号', defaultSelected: true,
      gen: () => genPhone()
    },
    {
      id: 'ownerAddress', group: 'owner', label: '车主地址', defaultSelected: false,
      gen: () => genAddress()
    },

    // ===== 五、交通业务扩展 traffic =====
    {
      id: 'policyNo', group: 'traffic', label: '保单号', defaultSelected: true,
      gen: () => {
        const company = _r(INSURANCE_COMPANIES);
        const year = new Date().getFullYear();
        let suffix = '';
        for (let i = 0; i < 10; i++) suffix += DIGITS[_randInt(0, 9)];
        return company + year + suffix;
      }
    },
    {
      id: 'violations', group: 'traffic', label: '违章记录', defaultSelected: true,
      configUI: (cfg) => _tplRange('violations', cfg.violationsMin !== undefined ? cfg.violationsMin : 0, cfg.violationsMax !== undefined ? cfg.violationsMax : 3, 0, 20),
      gen: (ctx, cfg) => {
        const mn = cfg.violationsMin !== undefined ? cfg.violationsMin : 0;
        const mx = cfg.violationsMax !== undefined ? cfg.violationsMax : 3;
        const count = _randInt(mn, mx);
        const list = [];
        for (let i = 0; i < count; i++) list.push(genViolation());
        return list;
      }
    },
    {
      id: 'driverLicense', group: 'traffic', label: '驾驶证信息', defaultSelected: true,
      configUI: (cfg) => {
        const selected = cfg.licenseTypes || ['C1'];
        const statuses = cfg.licenseStatuses || ['正常'];
        return `<div class="ug-cfg-row"><span class="ug-sub-label">准驾车型(多选)：</span></div>
          ${_tplCheckboxes('licenseTypes', LICENSE_TYPES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">驾照状态(多选)：</span></div>
          ${_tplCheckboxes('licenseStatuses', LICENSE_STATUSES, statuses)}`;
      },
      gen: (ctx, cfg) => {
        const typePool = cfg.licenseTypes && cfg.licenseTypes.length > 0 ? cfg.licenseTypes : ['C1'];
        const statusPool = cfg.licenseStatuses && cfg.licenseStatuses.length > 0 ? cfg.licenseStatuses : ['正常'];
        return {
          licenseNo: genIdCard(),
          licenseType: _r(typePool),
          expireDate: _genFutureDate(365, 3650),
          status: _r(statusPool),
          issueDate: _genNormalDate(2000, new Date().getFullYear())
        };
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
      name: '车辆生成',
      desc: '随机生成车辆信息：车牌号/VIN/证件/车主/违章/驾照等，支持多字段组合',
      icon: '🚗',
      iconUrl: 'icons/vehicle-generator.png',
      category: 'data-gen',
      categoryName: '数据生成'
    },
    fieldConfig: {
      keyLang: 'zh',
      // 车牌配置
      plateTypes: ['blue'],
      plateWeird: false,
      // 车辆类型
      vehicleTypes: VEHICLE_TYPES.slice(),
      vehicleTypeCustom: '',
      // 品牌
      brands: BRAND_MODELS.map(b => b.brand),
      // 颜色
      colors: COLORS.slice(),
      colorWeird: false,
      // VIN
      vinWeird: false,
      // 里程
      mileageMin: 0, mileageMax: 200000,
      // 年检
      inspectMode: 'normal',
      // 车辆状态
      vehicleStatuses: ['正常'],
      vehicleStatusCustom: '',
      // 质量
      totalMassMin: 3000, totalMassMax: 25000,
      curbMassMin: 1000, curbMassMax: 8000,
      seatCountMin: 2, seatCountMax: 55,
      // 排量/燃料
      displacements: DISPLACEMENTS.slice(),
      fuelTypes: FUEL_TYPES.slice(),
      // 使用性质
      usageTypes: USAGE_TYPES.slice(0, 2),
      // 车主
      ownerTypes: ['个人'],
      // 违章
      violationsMin: 0, violationsMax: 3,
      // 驾照
      licenseTypes: ['C1'],
      licenseStatuses: ['正常']
    },
    _currentFmt: 'text',
    _generated: null,
    _toastTimer: null,

    render(root) {
      root.innerHTML = `
        <div class="ug-wrap">
          <div class="lc-header"><h2><img src="${tool.meta.iconUrl}" alt="${tool.meta.name}"> ${tool.meta.name}</h2></div>
          <div class="ug-section ug-config">
              <div class="ug-section-title">⚙️ 生成配置</div>

            <div class="ug-section-sub">
              <div class="ug-section-title">
                <span>📋 选择字段（${FIELDS.length}项）</span>
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
              <span>📝 生成结果</span>
              <div class="ug-format-tabs">
                <button class="ug-format-tab active" data-fmt="text">文本</button>
                <button class="ug-format-tab" data-fmt="json">JSON</button>
                <button class="ug-format-tab" data-fmt="yaml">YAML</button>
              </div>
            </div>
            <div id="ugResult" class="ug-result">
              <div class="ug-empty">点击「生成」按钮，生成车辆信息 🚗</div>
            </div>
            <div class="ug-copy-bar">
              <button id="ugCopyAll" class="ug-btn-primary ug-copy-all">📋 复制全部</button>
            </div>
          </div>
        </div>
      `;

      // 渲染字段选择网格（按 CATEGORIES 分组）
      const grid = root.querySelector('#ugFieldGrid');
      const byGroup = {};
      FIELDS.forEach(f => {
        const g = f.group || 'basic';
        (byGroup[g] = byGroup[g] || []).push(f);
      });
      grid.innerHTML = CATEGORIES.map(cat => {
        const fields = byGroup[cat.id] || [];
        if (fields.length === 0) return '';
        const items = fields.map(f => {
          const checked = f.defaultSelected ? 'checked' : '';
          const cfgBtn = f.configUI ? `<button class="ug-cfg-toggle" data-field="${f.id}" title="配置">⚙️</button>` : '';
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
        navigator.clipboard.writeText(text).then(() => this._toast('✓ 已复制全部'));
      });

      this._renderResult(container);
    },

    _bindCfgEvents(box) {
      // 0) bool checkbox
      box.querySelectorAll('[data-cfg-bool]').forEach(cb => {
        cb.checked = !!this.fieldConfig[cb.dataset.cfgBool];
        cb.addEventListener('change', () => { this.fieldConfig[cb.dataset.cfgBool] = cb.checked; });
      });
      // 1) 简单 select
      box.querySelectorAll('[data-cfg-simple]').forEach(sel => {
        sel.value = this.fieldConfig[sel.dataset.cfgSimple] !== undefined ? this.fieldConfig[sel.dataset.cfgSimple] : sel.value;
        sel.addEventListener('change', () => {
          this.fieldConfig[sel.dataset.cfgSimple] = sel.value;
        });
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
      const cfg = this.fieldConfig;
      const ctx = { ...cfg };
      // 先确定车主类型
      ctx.ownerType = (cfg.ownerTypes && cfg.ownerTypes.length > 0) ? _r(cfg.ownerTypes) : '个人';
      return ctx;
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
        box.innerHTML = '<div class="ug-empty">点击「生成」按钮，生成车辆信息 🚗</div>';
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

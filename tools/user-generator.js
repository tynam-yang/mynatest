// tools/user-generator.js — 用户信息随机生成（全局）
(function () {
  const NAME = 'user-generator';

  // ========== 常量表 ==========
  const SUR_NAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
    '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
    '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
    '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
    '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎'];

  // 复姓
  const COMPOUND_SUR = ['欧阳', '司马', '上官', '夏侯', '诸葛', '闻人', '东方', '赫连',
    '皇甫', '尉迟', '公羊', '澹台', '公冶', '宗政', '濮阳', '淳于',
    '单于', '太叔', '申屠', '公孙', '仲孙', '轩辕', '令狐', '钟离',
    '宇文', '长孙', '慕容', '鲜于', '闾丘', '司徒', '司空', '亓官',
    '司寇', '子车', '颛孙', '端木', '巫马', '公西', '漆雕', '乐正',
    '壤驷', '公良', '拓跋', '夹谷', '宰父', '谷梁', '晋', '楚',
    '阎', '法', '汝', '鄢', '涂', '钦', '段干', '百里', '东郭', '南门',
    '呼延', '归海', '羊舌', '微生', '岳', '帅', '缑', '亢', '况', '后',
    '有', '琴', '梁丘', '左丘', '东门', '西门', '南宫', '公'];

  // 生成随机单字（Unicode CJK 基本区 U+4E00~U+9FFF）
  function _randHan() {
    const code = _randInt(0x4E00, 0x9FFF);
    return String.fromCharCode(code);
  }

  // 生成随机英文名（用于昵称/邮箱）
  const EN_ADJ = ['happy', 'cool', 'hot', 'smart', 'fast', 'slow', 'big', 'small',
    'red', 'blue', 'green', 'black', 'white', 'gold', 'silver', 'dark',
    'light', 'wild', 'cute', 'crazy', 'lazy', 'busy', 'young', 'old',
    'super', 'ultra', 'mega', 'hyper', 'turbo', 'neo', 'pro', 'max',
    'mini', 'tiny', 'huge', 'giant', 'tiny', 'quick', 'sharp', 'soft',
    'hard', 'smooth', 'rough', 'clean', 'dirty', 'fresh', 'sweet', 'bitter'];
  const EN_NOUN = ['cat', 'dog', 'fish', 'bird', 'tiger', 'lion', 'bear', 'wolf',
    'fox', 'rabbit', 'mouse', 'panda', 'koala', 'whale', 'dolphin', 'shark',
    'dragon', 'phoenix', 'unicorn', 'robot', 'ninja', 'pirate', 'wizard', 'ghost',
    'alien', 'cyborg', 'hero', 'king', 'queen', 'prince', 'princess', 'warrior',
    'knight', 'mage', 'archer', 'assassin', 'samurai', 'ronin', 'viking', 'cowboy',
    'chef', 'artist', 'singer', 'dancer', 'writer', 'poet', 'thinker', 'dreamer'];
  const EN_CHAR = 'abcdefghijklmnopqrstuvwxyz';

  // 大学名称前缀/后缀
  const SCHOOL_PREFIX = ['北京', '上海', '天津', '重庆', '广东', '山东', '江苏', '浙江',
    '湖北', '湖南', '四川', '福建', '安徽', '河北', '河南', '辽宁',
    '吉林', '黑龙江', '陕西', '山西', '江西', '云南', '贵州', '广西',
    '海南', '甘肃', '内蒙古', '新疆', '西藏', '宁夏', '香港', '澳门',
    '深圳', '大连', '青岛', '苏州', '厦门', '宁波', '佛山', '东莞',
    '珠海', '无锡', '常州', '徐州', '温州', '绍兴', '金华', '台州',
    '中山', '惠州', '汕头', '湛江', '江门', '肇庆', '清远', '韶关'];
  const SCHOOL_MID = ['理工', '工业', '农业', '师范', '财经', '政法', '医科', '中医药',
    '民族', '海洋', '财经政法', '农林科技', '科技', '交通', '邮电', '电子科技',
    '语言', '外国语', '传媒', '艺术', '体育', '军事', '航空航天', '信息工程'];
  const SCHOOL_SUFFIX = ['大学', '学院', '职业技术学院', '高等专科学校'];
  const SCHOOL_ELITE = ['清华大学', '北京大学', '复旦大学', '上海交通大学', '浙江大学',
    '南京大学', '中国科学技术大学', '武汉大学', '华中科技大学', '中山大学',
    '四川大学', '哈尔滨工业大学', '西安交通大学', '同济大学', '北京航空航天大学',
    '北京理工大学', '天津大学', '南开大学', '厦门大学', '山东大学',
    '吉林大学', '中南大学', '东南大学', '大连理工大学', '华南理工大学',
    '北京师范大学', '中国人民大学', '复旦大学', '上海财经大学', '北京邮电大学'];

  // 学院名称
  const COLLEGES = ['计算机学院', '软件学院', '信息工程学院', '电子工程学院', '通信工程学院',
    '人工智能学院', '数据科学学院', '网络空间安全学院', '自动化学院', '机械工程学院',
    '材料科学与工程学院', '化学化工学院', '物理学院', '数学学院', '生物科学学院',
    '地质学院', '能源与动力工程学院', '环境科学学院', '土木工程学院', '建筑学院',
    '经济学院', '管理学院', '金融学院', '会计学院', '法学院', '外国语学院',
    '人文学院', '历史学院', '哲学学院', '教育学院', '马克思主义学院', '体育学院',
    '艺术学院', '新闻传播学院', '音乐学院', '美术学院', '设计学院', '医学院',
    '药学院', '护理学院', '口腔医学院', '公共卫生学院', '生命科学学院',
    '大气科学学院', '海洋学院', '食品科学学院', '纺织学院', '轻工学院'];

  // 专业名称
  const MAJORS = ['计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术', '网络安全',
    '物联网工程', '信息安全', '电子信息工程', '通信工程', '自动化',
    '电气工程及其自动化', '机械设计制造及其自动化', '材料成型及控制工程', '高分子材料与工程',
    '化学工程与工艺', '应用化学', '生物工程', '生物技术', '生物科学',
    '数学与应用数学', '信息与计算科学', '物理学', '应用物理学', '核工程与核技术',
    '地质工程', '建筑学', '城乡规划', '土木工程', '环境工程', '给排水科学与工程',
    '车辆工程', '航空航天工程', '能源与动力工程', '新能源科学与工程',
    '经济学', '金融学', '国际经济与贸易', '工商管理', '市场营销', '会计学',
    '财务管理', '人力资源管理', '物流管理', '电子商务', '旅游管理',
    '法学', '英语', '日语', '法语', '德语', '俄语', '西班牙语',
    '汉语言文学', '新闻学', '广播电视学', '广告学', '编辑出版学',
    '音乐表演', '舞蹈表演', '戏剧影视文学', '绘画', '雕塑', '视觉传达设计',
    '临床医学', '口腔医学', '预防医学', '药学', '中药学', '护理学'];

  // 微信昵称字符池
  const NICK_EMOJIS = ['😊', '😄', '😎', '🤖', '🐱', '🐶', '🦊', '🐼', '🐯', '🦁',
    '🐸', '🦄', '🐙', '🌸', '🌙', '⭐', '🌈', '🔥', '💎', '🎮',
    '🎯', '🎨', '🎵', '📚', '💻', '⚡', '🍀', '🍜', '🍰', '☕'];
  const NICK_HAN = ['风', '雨', '云', '月', '星', '日', '山', '水', '花', '草',
    '竹', '梅', '松', '雪', '冰', '火', '光', '影', '梦', '幻',
    '灵', '仙', '神', '侠', '客', '友', '爱', '心', '情', '意',
    '思', '念', '忆', '怀', '望', '归', '来', '去', '走', '飞'];

  function _randQQ() {
    // QQ 5-11 位数字（排除前导 0）
    const len = _randInt(7, 10);
    let qq = String(_randInt(1, 9));
    for (let i = 1; i < len; i++) qq += _randInt(0, 9);
    return qq;
  }

  function _randWechat() {
    // 微信昵称：字母数字下划线 6-20 位，或中英文名+数字
    const style = _randInt(0, 3);
    let w = '';
    if (style === 0) {
      // 英文名 + 数字
      const a = _r(EN_ADJ); const n = _r(EN_NOUN);
      w = a + n + _randInt(1, 9999);
    } else if (style === 1) {
      // 全随机字母数字
      w = EN_CHAR[_randInt(0, 25)].toUpperCase();
      const pool = EN_CHAR + '_1234567890';
      for (let i = 1; i < _randInt(7, 18); i++) w += pool[_randInt(0, pool.length - 1)];
    } else if (style === 2) {
      // 中文名拼音首字母 + 数字
      w = EN_CHAR[_randInt(0, 25)].toUpperCase() + EN_CHAR[_randInt(0, 25)].toUpperCase() + _randInt(1000, 99999);
    } else {
      // 复姓拼音
      w = EN_CHAR[_randInt(0, 25)] + EN_CHAR[_randInt(0, 25)] + EN_CHAR[_randInt(0, 25)] + _randInt(1, 999);
    }
    return w;
  }

  function _randNickname() {
    // 昵称：中英文混合 + emoji + 数字后缀，尽量多样
    const style = _randInt(0, 5);
    let n = '';
    if (style === 0) {
      // 纯中文 2-5 字
      const len = _randInt(2, 5);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
    } else if (style === 1) {
      // 中文 + 数字
      const len = _randInt(1, 3);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
      n += _randInt(0, 9999);
    } else if (style === 2) {
      // emoji + 中文
      n += _r(NICK_EMOJIS);
      const len = _randInt(1, 3);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
      if (Math.random() < 0.5) n += _r(NICK_EMOJIS);
    } else if (style === 3) {
      // emoji + 英文 + 数字
      n += _r(NICK_EMOJIS);
      n += _r(EN_ADJ) + _r(EN_NOUN) + _randInt(0, 99);
    } else if (style === 4) {
      // 随机汉字 + 随机字母 + 数字
      n += _randHan() + _randHan();
      n += EN_CHAR[_randInt(0, 25)].toUpperCase() + _randInt(10, 999);
    } else {
      // 随机 ASCII 装饰符 + 中文
      const deco = ['「', '『', '【', '☆', '★', '✿', '❀', '✧', '༺', '༻', '꧁', '꧂'];
      n += _r(deco);
      const len = _randInt(2, 4);
      for (let i = 0; i < len; i++) n += _randHan();
      n += _r(deco);
    }
    return n;
  }

  function _randSchool() {
    if (Math.random() < 0.25) return _r(SCHOOL_ELITE);
    // 组合生成：前缀 + 中间 + 后缀
    const prefix = _r(SCHOOL_PREFIX);
    const mid = _r(SCHOOL_MID);
    const suffix = _r(SCHOOL_SUFFIX);
    return prefix + mid + suffix;
  }

  const GIVEN_NAMES = {
    male: ['伟', '强', '磊', '军', '洋', '勇', '艳', '杰', '涛', '明',
      '超', '秀', '兰', '平', '刚', '桂', '文', '辉', '华', '国',
      '建', '林', '祥', '智', '诚', '仁', '波', '宁', '贵', '福',
      '生', '龙', '元', '全', '国', '胜', '学', '祥', '才', '发',
      '武', '新', '利', '清', '飞', '彬', '富', '顺', '信', '子轩',
      '浩然', '子涵', '宇轩', '梓豪', '睿', '俊', '凯', '文轩', '文博', '天佑'],
    female: ['芳', '娜', '敏', '静', '丽', '莉', '娟', '霞', '慧', '玲',
      '洁', '蕾', '颖', '燕', '云', '梅', '莉', '丽', '秀英', '桂英',
      '秀兰', '桂兰', '玉兰', '玉珍', '巧云', '巧英', '美华', '美珍', '慧敏', '淑芬',
      '淑华', '淑娟', '淑芳', '淑丽', '桂琴', '桂珍', '桂华', '凤英', '凤珍', '凤华',
      '雅', '雅婷', '雅雯', '欣怡', '欣妍', '欣悦', '婉婷', '婉清', '思琪', '思涵',
      '语涵', '梓涵', '梦瑶', '梦琪', '睿婷', '若曦', '若琳', '语嫣', '雨涵', '雨桐']
  };

  const NATIONS = ['汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族',
    '布依族', '朝鲜族', '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族',
    '哈萨克族', '傣族', '黎族', '傈僳族', '佤族', '畲族', '高山族', '拉祜族',
    '水族', '东乡族', '纳西族', '景颇族', '柯尔克孜族', '土族', '达斡尔族', '仫佬族',
    '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族', '阿昌族', '普米族',
    '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族', '保安族', '裕固族',
    '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'];

  const PROVINCES = {
    '11': '北京', '12': '天津', '13': '河北', '14': '山西', '15': '内蒙古',
    '21': '辽宁', '22': '吉林', '23': '黑龙江',
    '31': '上海', '32': '江苏', '33': '浙江', '34': '安徽', '35': '福建', '36': '江西', '37': '山东',
    '41': '河南', '42': '湖北', '43': '湖南', '44': '广东', '45': '广西', '46': '海南',
    '50': '重庆', '51': '四川', '52': '贵州', '53': '云南', '54': '西藏',
    '61': '陕西', '62': '甘肃', '63': '青海', '64': '宁夏', '65': '新疆',
    '71': '台湾', '81': '香港', '82': '澳门'
  };

  const EDUCATIONS = ['小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士'];

  const MARRIAGES = ['未婚', '已婚', '离异', '丧偶'];

  const OCCUPATIONS = ['教师', '医生', '护士', '律师', '工程师', '设计师', '程序员', '产品经理',
    '运营', '销售', '财务', '会计', '公务员', '警察', '军人', '司机',
    '厨师', '服务员', '快递员', '外卖员', '保安', '保洁', '工人', '农民',
    '自由职业', '待业', '学生', '退休', 'HR', '行政', '市场专员', '摄影师',
    '记者', '编辑', '主播', '模特', '运动员', '教练', '心理咨询师', '营养师'];

  // 手机号号段
  const PHONE_PREFIXES = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '145', '146', '147', '149',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '162', '165', '166', '167',
    '170', '171', '172', '173', '175', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
    '190', '191', '193', '195', '197', '198', '199'];

  // 银行前缀（简化版，用于生成假卡号）
  const BANKS = [
    { name: '工商银行', prefix: ['622202', '622208', '621226'], code: '102100000000' },
    { name: '建设银行', prefix: ['622700', '621700', '622280'], code: '105100000000' },
    { name: '农业银行', prefix: ['622848', '621336', '622846'], code: '103100000000' },
    { name: '中国银行', prefix: ['621661', '622262', '621660'], code: '104100000000' },
    { name: '招商银行', prefix: ['621483', '621286', '621485'], code: '308100000000' },
    { name: '交通银行', prefix: ['622260', '621559', '622262'], code: '301100000000' },
    { name: '中信银行', prefix: ['622690', '621713', '622691'], code: '302100000000' },
    { name: '光大银行', prefix: ['622660', '621766', '622662'], code: '303100000000' },
    { name: '浦发银行', prefix: ['622516', '621277', '622517'], code: '310100000000' },
    { name: '民生银行', prefix: ['622622', '621691', '622623'], code: '305100000000' },
    { name: '兴业银行', prefix: ['622908', '621362', '622909'], code: '309100000000' },
    { name: '广发银行', prefix: ['622508', '621462', '622509'], code: '306100000000' },
    { name: '平安银行', prefix: ['622155', '621528', '622156'], code: '307100000000' },
    { name: '华夏银行', prefix: ['622630', '621260', '622631'], code: '304100000000' },
    { name: '邮储银行', prefix: ['622188', '621226', '622199'], code: '403100000000' },
    { name: '北京银行', prefix: ['622263', '621420', '622264'], code: '403100000000' },
    { name: '上海银行', prefix: ['622273', '621423', '622274'], code: '402100000000' }
  ];

  const EMAIL_DOMAINS = ['qq.com', '163.com', '126.com', 'sina.com', 'gmail.com', 'outlook.com',
    'foxmail.com', 'yeah.net', '139.com', 'icloud.com', 'yahoo.com'];

  const STREET_PREFIXES = ['长安街', '人民路', '建设路', '解放路', '中山路', '和平路',
    '文化路', '科技路', '创新路', '幸福路', '光明路', '团结路',
    '友谊路', '健康路', '工农路', '劳动路', '青年广场', '人民广场'];

  const CITY_SUFFIXES = ['市', '自治州', '地区', '盟'];
  const DISTRICT_SUFFIXES = ['区', '县', '市', '旗'];

  const PROFILE_TEMPLATES = [
    '性格开朗，善于沟通，喜欢{hobby}。',
    '做事认真负责，有耐心，热爱{hobby}。',
    '外向开朗，待人友善，平时喜欢{hobby}。',
    '低调内敛，专注于工作，偶尔{hobby}放松。',
    '积极乐观，追求进步，闲暇时喜欢{hobby}。',
    '为人正直，乐于助人，爱好{hobby}。',
    '踏实稳重，有团队精神，喜欢{hobby}。',
    '聪明好学，适应能力强，业余爱好{hobby}。'
  ];

  const HOBBIES = ['阅读', '健身', '旅行', '摄影', '音乐', '电影', '美食', '运动',
    '绘画', '书法', '编程', '写作', '养花', '钓鱼', '登山', '骑车',
    '瑜伽', '跳舞', '唱歌', '游戏', '追剧', '网购', '做饭', '手工'];

  // 统一社会信用代码字符集
  const USCC_CHARS = '0123456789ABCDEFGHJKLMNPQRTUWXY';
  const USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 4, 5, 7, 20, 6, 23, 15, 19, 1];
  const USCC_REG_CODES = ['9', '5', '1', 'Y', '6']; // 登记管理部门代码

  // ========== 工具函数 ==========
  const _r = (a) => a[Math.floor(Math.random() * a.length)];
  const _randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _pad = (n, len) => String(n).padStart(len, '0');

  // 身份证校验码（GB 11643-1999）
  function idChecksum(first17) {
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += parseInt(first17[i]) * weights[i];
    return codes[sum % 11];
  }

  // Luhn 校验码（银行卡）
  function luhnChecksum(firstDigits) {
    let sum = 0;
    let alt = true;
    for (let i = firstDigits.length - 1; i >= 0; i--) {
      let n = parseInt(firstDigits[i]);
      if (alt) n *= 2;
      if (n > 9) n -= 9;
      sum += n;
      alt = !alt;
    }
    return (sum * 9) % 10;
  }

  // 统一社会信用代码校验码（GB 32100-2015）
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

  // 生成随机日期
  function randomDate(startYear, endYear) {
    const year = _randInt(startYear, endYear);
    const month = _randInt(1, 12);
    const daysInMonth = new Date(year, month, 0).getDate();
    const day = _randInt(1, daysInMonth);
    return { year, month, day };
  }

  function formatDate(d, fmt) {
    return fmt
      .replace('YYYY', _pad(d.year, 4))
      .replace('MM', _pad(d.month, 2))
      .replace('DD', _pad(d.day, 2));
  }

  // ========== 字段注册表 ==========
  // 每个字段 { id, label, defaultSelected, gen(ctx), configUI? }
  // ctx = { birthDate, gender, ... } 共享上下文
  const FIELDS = [
    {
      id: 'name', label: '姓名', defaultSelected: true,
      gen: (ctx) => {
        const sex = ctx.gender !== undefined ? ctx.gender : _randInt(0, 1);
        const pool = sex === 1 ? GIVEN_NAMES.male : GIVEN_NAMES.female;
        const gn = Math.random() < 0.35 ? _r(pool) + _r(pool) : _r(pool);
        // 15% 概率使用复姓
        const sur = Math.random() < 0.15 ? _r(COMPOUND_SUR) : _r(SUR_NAMES);
        return sur + gn;
      }
    },
    {
      id: 'gender', label: '性别', defaultSelected: true,
      gen: (ctx) => { return ctx.gender === 1 ? '男' : '女'; }
    },
    {
      id: 'age', label: '年龄', defaultSelected: true,
      gen: (ctx) => { return ctx.age; }
    },
    {
      id: 'birthDate', label: '出生日期', defaultSelected: true,
      gen: (ctx) => { return ctx.birthDateStr; },
      configUI: (ctx) => `<label class="ug-sub-label">格式：</label>
        <select class="ug-select" data-ug-config="birthFmt">
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          <option value="YYYYMMDD">YYYYMMDD</option>
          <option value="YYYY年MM月DD日">YYYY年MM月DD日</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
        </select>`
    },
    {
      id: 'nation', label: '民族', defaultSelected: false,
      gen: () => _r(NATIONS)
    },
    {
      id: 'idCard', label: '身份证号', defaultSelected: true,
      gen: (ctx) => {
        // 随机省市区县码
        const provinceCode = _r(Object.keys(PROVINCES));
        const cityCode = _randInt(1, 20);
        const districtCode = _randInt(1, 20);
        const area = provinceCode + _pad(cityCode, 2) + _pad(districtCode, 2);

        const birth = ctx.birthDate || randomDate(1950, 2005);
        const birthStr = _pad(birth.year, 4) + _pad(birth.month, 2) + _pad(birth.day, 2);

        const seq = _pad(_randInt(1, 999), 3);
        const first17 = area + birthStr + seq;
        return first17 + idChecksum(first17);
      }
    },
    {
      id: 'phone', label: '手机号码', defaultSelected: true,
      gen: () => _r(PHONE_PREFIXES) + _randInt(10000000, 99999999)
    },
    {
      id: 'tel', label: '固定电话', defaultSelected: false,
      gen: () => {
        const area = ['010', '021', '022', '023', '020', '0755', '0571', '025', '028', '029'];
        return _r(area) + '-' + _randInt(60000000, 69999999);
      }
    },
    {
      id: 'emergencyContact', label: '紧急联系人', defaultSelected: false,
      gen: () => _r(SUR_NAMES) + _r(GIVEN_NAMES.female.concat(GIVEN_NAMES.male))
    },
    {
      id: 'emergencyPhone', label: '紧急联系电话', defaultSelected: false,
      gen: () => _r(PHONE_PREFIXES) + _randInt(10000000, 99999999)
    },
    {
      id: 'email', label: '邮箱', defaultSelected: true,
      gen: (ctx) => {
        const namePart = (ctx.name || '').length > 0
          ? (ctx.name.match(/[\u4e00-\u9fa5]/g) || []).map(c => c.charCodeAt(0).toString(16)).join('').slice(0, 8)
          : 'user' + _randInt(1000, 9999);
        return namePart.toLowerCase() + '@' + _r(EMAIL_DOMAINS);
      }
    },
    {
      id: 'qq', label: 'QQ号', defaultSelected: false,
      gen: () => _randQQ()
    },
    {
      id: 'wechat', label: '微信号', defaultSelected: false,
      gen: () => _randWechat()
    },
    {
      id: 'nickname', label: '昵称', defaultSelected: false,
      gen: () => _randNickname()
    },
    {
      id: 'school', label: '毕业学校', defaultSelected: false,
      gen: () => _randSchool()
    },
    {
      id: 'college', label: '学院', defaultSelected: false,
      gen: () => _r(COLLEGES)
    },
    {
      id: 'major', label: '专业', defaultSelected: false,
      gen: () => _r(MAJORS)
    },
    {
      id: 'address', label: '地址', defaultSelected: true,
      gen: () => {
        const isDirect = ['北京', '上海', '天津', '重庆'];
        const province = _r(Object.values(PROVINCES).filter(p => p !== '台湾' && p !== '香港' && p !== '澳门'));
        const provincePart = isDirect.includes(province) ? province : province + '省';
        const city = province + _r(CITY_SUFFIXES);
        const district = _r(['朝阳', '海淀', '浦东', '南山', '天河', '鼓楼', '西湖', '玄武', '岳麓', '历下']) + _r(DISTRICT_SUFFIXES);
        const street = _r(STREET_PREFIXES);
        const number = _randInt(1, 999) + '号';
        const building = _randInt(1, 30) + '栋';
        const room = _randInt(101, 3001) + '室';
        return provincePart + city + district + street + number + building + room;
      }
    },
    {
      id: 'postcode', label: '邮编', defaultSelected: false,
      gen: () => _pad(_randInt(100000, 999999), 6)
    },
    {
      id: 'bankCard', label: '银行卡号', defaultSelected: false,
      gen: () => {
        const bank = _r(BANKS);
        const prefix = _r(bank.prefix);
        const remaining = 16 - prefix.length;
        let first = prefix;
        for (let i = 0; i < remaining - 1; i++) first += _randInt(0, 9);
        return first + luhnChecksum(first);
      }
    },
    {
      id: 'bankName', label: '开户行', defaultSelected: false,
      gen: () => _r(BANKS).name + ' 总行'
    },
    {
      id: 'bankCode', label: '开户行联行号', defaultSelected: false,
      gen: () => _r(BANKS).code + _pad(_randInt(1, 99), 2)
    },
    {
      id: 'account', label: '账号', defaultSelected: false,
      gen: () => {
        const pools = ['user', 'admin', 'test', 'member', 'vip', 'guest', 'developer', 'manager'];
        return _r(pools) + _randInt(1000, 9999);
      }
    },
    {
      id: 'password', label: '密码', defaultSelected: false,
      gen: () => {
        const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let pwd = '';
        for (let i = 0; i < _randInt(8, 14); i++) pwd += chars[_randInt(0, chars.length - 1)];
        return pwd;
      }
    },
    {
      id: 'uscc', label: '统一社会信用代码', defaultSelected: false,
      gen: () => {
        const regCode = _r(USCC_REG_CODES);       // 1
        const catCode = _r(['1', '2', '3', '9']);  // 1
        const area = _pad(_randInt(110000, 659999), 6); // 6
        const orgCode = USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]
          + USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)]; // 8
        const first17 = regCode + catCode + area + orgCode;
        return first17 + usccChecksum(first17);
      }
    },
    {
      id: 'height', label: '身高(cm)', defaultSelected: false,
      gen: (ctx) => {
        if (ctx.gender === 1) return _randInt(160, 190);
        return _randInt(150, 175);
      }
    },
    {
      id: 'weight', label: '体重(kg)', defaultSelected: false,
      gen: (ctx) => {
        if (ctx.gender === 1) return _randInt(55, 90);
        return _randInt(40, 70);
      }
    },
    {
      id: 'education', label: '学历', defaultSelected: false,
      gen: () => _r(EDUCATIONS)
    },
    {
      id: 'occupation', label: '职业', defaultSelected: false,
      gen: () => _r(OCCUPATIONS)
    },
    {
      id: 'marriage', label: '婚姻状态', defaultSelected: false,
      gen: (ctx) => {
        const age = ctx.age || _randInt(18, 65);
        if (age < 22) return '未婚';
        if (age > 60) return Math.random() < 0.5 ? '已婚' : '丧偶';
        return _r(MARRIAGES);
      }
    },
    {
      id: 'passport', label: '护照号', defaultSelected: false,
      gen: () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let p = letters[_randInt(0, letters.length - 1)];
        p += letters[_randInt(0, letters.length - 1)];
        p += _pad(_randInt(1, 999999), 7);
        return p;
      }
    },
    {
      id: 'hkMacau', label: '港澳通行证号', defaultSelected: false,
      gen: () => {
        return 'C' + _pad(_randInt(10000000, 99999999), 8);
      }
    },
    {
      id: 'residence', label: '居住证号码', defaultSelected: false,
      gen: () => {
        const area = _pad(_randInt(110000, 440000), 6);
        const birth = formatDate(randomDate(1950, 2005), 'YYYYMMDD');
        return area + birth + _pad(_randInt(1, 999), 3);
      }
    },
    {
      id: 'hukou', label: '户籍所在地', defaultSelected: false,
      gen: () => {
        const province = _r(Object.values(PROVINCES));
        const cities = province === '北京' || province === '上海' || province === '天津' || province === '重庆'
          ? ['东城', '西城', '朝阳', '海淀', '浦东', '黄浦']
          : ['市辖区', '县', '区', '自治县'];
        return province + '省' + _r(cities) + '区';
      }
    },
    {
      id: 'profile', label: '个人简介', defaultSelected: false,
      gen: () => {
        const tpl = _r(PROFILE_TEMPLATES);
        return tpl.replace('{hobby}', _r(HOBBIES));
      }
    }
  ];

  // ========== 渲染工具 ==========
  function escapeYaml(v) {
    if (typeof v === 'number') return String(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    const s = String(v);
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
    // 中文标签 + 值，等号分隔，行显示
    const lines = [];
    for (const [k, v] of Object.entries(data)) {
      const f = FIELDS.find(f => f.id === k);
      const label = f ? f.label : k;
      lines.push(label + '：' + v);
    }
    return lines.join('\n');
  }

  // ========== 工具定义 ==========
  const meta = {
    id: NAME,
    name: '用户信息生成',
    desc: '28 字段可选随机生成（姓名/身份证/银行卡/统一社会信用代码等），支持文本/JSON/YAML 导出',
    icon: '👤',
    iconUrl: 'icons/user-generator.png',
    category: 'data-gen',
    categoryName: '数据生成'
  };

  const tool = {
    meta,
    fieldConfig: { birthFmt: 'YYYY-MM-DD' },
    _currentFmt: 'text',
    _generated: null,
    _toastTimer: null,

    render(root) {
      root.innerHTML = `
        <div class="ug-wrap">
          <div class="ug-section ug-config">
            <div class="ug-section-title">⚙️ 生成配置</div>
            <div class="ug-config-row">
              <label class="ug-label">数量</label>
              <input type="number" id="ugCount" class="ug-input ug-count" min="1" max="20" value="1">
              <button id="ugGen" class="ug-btn-primary ug-gen-btn">🎲 生成</button>
            </div>
          </div>

          <div class="ug-section ug-fields">
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
              <div class="ug-empty">点击「生成」按钮，生成用户信息 👤</div>
            </div>
            <div class="ug-copy-bar">
              <button id="ugCopyAll" class="ug-btn-primary ug-copy-all">📋 复制全部</button>
            </div>
          </div>
        </div>
      `;

      // 渲染字段选择网格
      const grid = root.querySelector('#ugFieldGrid');
      grid.innerHTML = FIELDS.map((f, i) => {
        const checked = f.defaultSelected ? 'checked' : '';
        const cfgBtn = f.configUI ? `<button class="ug-cfg-toggle" data-field="${f.id}" title="配置">⚙️</button>` : '';
        return `<label class="ug-field-item">
          <input type="checkbox" class="ug-field-check" data-id="${f.id}" ${checked}>
          <span>${f.label}</span>
          ${cfgBtn}
        </label>`;
      }).join('');

      // 事件绑定
      root.querySelector('#ugGen').addEventListener('click', () => this.doGenerate(root));
      root.querySelector('#ugSelectAll').addEventListener('click', () => this._selectAll(root, true));
      root.querySelector('#ugSelectDefault').addEventListener('click', () => this._selectAll(root, 'default'));
      root.querySelector('#ugClearAll').addEventListener('click', () => this._selectAll(root, false));

      // 字段配置按钮
      grid.querySelectorAll('.ug-cfg-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const fieldId = btn.dataset.field;
          const field = FIELDS.find(f => f.id === fieldId);
          const cfgBox = root.querySelector('#ugFieldConfig');
          if (cfgBox.dataset.forField === fieldId && cfgBox.innerHTML) {
            cfgBox.innerHTML = ''; cfgBox.dataset.forField = '';
          } else if (field && field.configUI) {
            cfgBox.innerHTML = `<div class="ug-cfg-block">${field.label} 配置：${field.configUI(this.fieldConfig)}</div>`;
            cfgBox.dataset.forField = fieldId;
            cfgBox.querySelectorAll('[data-ug-config]').forEach(sel => {
              sel.value = this.fieldConfig[sel.dataset.ugConfig] || '';
              sel.addEventListener('change', () => {
                this.fieldConfig[sel.dataset.ugConfig] = sel.value;
              });
            });
          }
        });
      });

      // 格式切换
      root.querySelectorAll('.ug-format-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          root.querySelectorAll('.ug-format-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this._currentFmt = tab.dataset.fmt;
          this._renderResult(root);
        });
      });

      // 复制
      root.querySelector('#ugCopyAll').addEventListener('click', () => {
        const text = this._getCurrentOutput(root);
        navigator.clipboard.writeText(text).then(() => this._toast('✓ 已复制全部'));
      });

      this._currentFmt = 'text';
      this._generated = null;
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

    // 生成前预填充共享上下文，确保字段间依赖一致
    _prepareCtx() {
      const ctx = { ...this.fieldConfig };
      ctx.gender = _randInt(0, 1);
      ctx.age = _randInt(18, 65);
      ctx.birthDate = randomDate(new Date().getFullYear() - ctx.age - 1, new Date().getFullYear() - ctx.age);
      ctx.birthDateStr = formatDate(ctx.birthDate, ctx.birthFmt || 'YYYY-MM-DD');
      return ctx;
    },

    doGenerate(root) {
      const ids = this._getSelected(root);
      if (ids.length === 0) { this._toast('请先选择至少一个字段'); return; }
      const count = Math.max(1, Math.min(20, parseInt(root.querySelector('#ugCount').value) || 1));

      const results = [];
      for (let i = 0; i < count; i++) {
        const ctx = this._prepareCtx();
        const item = {};
        for (const fid of ids) {
          const field = FIELDS.find(f => f.id === fid);
          if (field) {
            const label = field.label;
            try { item[label] = field.gen(ctx); }
            catch (e) { item[label] = '(生成失败)'; }
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
        box.innerHTML = '<div class="ug-empty">点击「生成」按钮，生成用户信息 👤</div>';
        return;
      }
      const fmt = this._currentFmt || 'text';
      box.classList.toggle('ug-result-code', fmt !== 'text');

      if (fmt === 'text') {
        box.innerHTML = this._generated.map((item, idx) => {
          const lines = Object.entries(item).map(([k, v]) => `<div class="ug-row"><span class="ug-row-label">${k}</span><span class="ug-row-val">${v}</span></div>`);
          const header = this._generated.length > 1 ? `<div class="ug-entry-header">#${idx + 1}</div>` : '';
          return `<div class="ug-entry">${header}${lines.join('')}</div>`;
        }).join('<div class="ug-entry-sep"></div>');
      } else if (fmt === 'json') {
        box.innerHTML = `<pre>${toJSON(this._generated.length === 1 ? this._generated[0] : this._generated, true)}</pre>`;
      } else {
        // YAML
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
      // text
      return this._generated.map(item => toText(item)).join('\n\n');
    },

    _toast(msg) {
      let t = document.getElementById('ug-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'ug-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#4ade80;color:#fff;padding:8px 16px;border-radius:6px;font-size:13px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.15);';
      t.style.display = 'block';
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { t.style.display = 'none'; }, 1500);
    }
  };

  // 注册
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push(tool);
})();

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

  const EN_FIRST_MALE = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
    'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
    'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
    'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan',
    'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory',
    'Frank', 'Alexander', 'Patrick', 'Jack', 'Dennis', 'Jerry'];
  const EN_FIRST_FEMALE = ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
    'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Dorothy', 'Melissa', 'Deborah',
    'Stephanie', 'Rebecca', 'Laura', 'Sharon', 'Cynthia', 'Amy', 'Kathleen', 'Angela', 'Shirley', 'Anna',
    'Brenda', 'Pamela', 'Emma', 'Nicole', 'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel',
    'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather'];
  const EN_LAST = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris',
    'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall'];

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
      const a = _r(EN_ADJ); const n = _r(EN_NOUN);
      w = a + n + _randInt(1, 9999);
    } else if (style === 1) {
      w = EN_CHAR[_randInt(0, 25)].toUpperCase();
      const pool = EN_CHAR + '_1234567890';
      for (let i = 1; i < _randInt(7, 18); i++) w += pool[_randInt(0, pool.length - 1)];
    } else if (style === 2) {
      w = EN_CHAR[_randInt(0, 25)].toUpperCase() + EN_CHAR[_randInt(0, 25)].toUpperCase() + _randInt(1000, 99999);
    } else {
      w = EN_CHAR[_randInt(0, 25)] + EN_CHAR[_randInt(0, 25)] + EN_CHAR[_randInt(0, 25)] + _randInt(1, 999);
    }
    return w;
  }

  function _randNickname() {
    const style = _randInt(0, 5);
    let n = '';
    if (style === 0) {
      const len = _randInt(2, 5);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
    } else if (style === 1) {
      const len = _randInt(1, 3);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
      n += _randInt(0, 9999);
    } else if (style === 2) {
      n += _r(NICK_EMOJIS);
      const len = _randInt(1, 3);
      for (let i = 0; i < len; i++) n += _r(NICK_HAN);
      if (Math.random() < 0.5) n += _r(NICK_EMOJIS);
    } else if (style === 3) {
      n += _r(NICK_EMOJIS);
      n += _r(EN_ADJ) + _r(EN_NOUN) + _randInt(0, 99);
    } else if (style === 4) {
      n += _randHan() + _randHan();
      n += EN_CHAR[_randInt(0, 25)].toUpperCase() + _randInt(10, 999);
    } else {
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

  // ========== 新增数据常量 ==========
  const DEGREES = ['无', '学士', '硕士', '博士'];
  const HEALTH_STATUSES = ['良好', '健康', '亚健康', '一般', '较差'];
  const POLITICAL_STATUSES = ['中共党员', '中共预备党员', '共青团员', '民革党员', '民盟盟员',
    '民建会员', '民进会员', '农工党党员', '致公党党员', '九三学社社员',
    '台盟盟员', '无党派人士', '群众'];
  const TITLES = ['正高级工程师', '高级工程师', '工程师', '助理工程师',
    '正教授', '副教授', '讲师', '研究员', '副研究员', '实习研究员',
    '主任医师', '副主任医师', '主治医师', '住院医师',
    '正高级', '副高级', '中级', '助理级', '员级'];
  const POSITIONS = ['CEO', 'CTO', 'CFO', 'COO', '总经理', '副总经理', '总监', '副总监',
    '经理', '副经理', '主管', '组长', '副组长', '专员', '助理', '实习生',
    '高级工程师', '架构师', '技术专家', '产品经理', '高级产品经理', '设计师',
    '运营', '高级运营', '销售', '高级销售', '财务', 'HR', '行政'];
  const HOBBIES_POOL = ['阅读', '健身', '旅行', '摄影', '音乐', '电影', '美食', '运动',
    '绘画', '书法', '编程', '写作', '养花', '钓鱼', '登山', '骑车',
    '瑜伽', '跳舞', '唱歌', '游戏', '追剧', '网购', '做饭', '手工',
    '下棋', '滑板', '滑雪', '冲浪', '潜水', '攀岩'];

  // 虚构公司
  const COMPANY_PREFIX = ['华信', '中兴', '华夏', '中联', '宏达', '恒通', '万达', '中天',
    '鼎盛', '卓越', '兴业', '富邦', '金汇', '鼎盛', '环球', '新世纪',
    '东方', '南方', '北方', '西部', '中科', '中创', '创新', '未来',
    '蓝海', '红杉', '青松', '梅花', '玉兰', '金鼎', '鸿图', '宏图'];
  const COMPANY_INDUSTRY = ['科技', '信息', '网络', '数据', '智能', '电子', '生物', '医药',
    '能源', '环保', '材料', '机械', '汽车', '金融', '投资', '贸易',
    '传媒', '文化', '教育', '咨询', '设计', '建筑', '地产', '物流',
    '食品', '农业', '航天', '航空', '化工', '软件', '通信', '半导体'];
  const COMPANY_SUFFIX = ['有限公司', '股份有限公司', '集团有限公司', '有限责任公司'];

  const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
  const RH_TYPES = ['Rh+', 'Rh-'];
  const NATIONALITIES = ['中国', '美国', '英国', '法国', '德国', '日本', '韩国', '加拿大', '澳大利亚', '俄罗斯', '新加坡', '马来西亚'];
  const RESIDENCE_TYPES = ['农业户口', '非农业户口', '集体户口', '城镇户口', '农村户口'];
  const CERT_TYPES = ['毕业证', '学位证', '结业证', '肄业证'];
  const FAMILY_RELATIONS = ['父亲', '母亲', '配偶', '儿子', '女儿', '兄弟', '姐妹', '祖父', '祖母', '外祖父', '外祖母'];
  const SKILL_CERTS = ['计算机二级', '计算机三级', '计算机四级', '驾驶证C1', '驾驶证C2', '驾驶证A1', '注册会计师', '初级会计师', '中级会计师', '教师资格证', '法律职业资格A证', '法律职业资格B证', '英语四级', '英语六级', '雅思', '托福', '普通话一级', '普通话二级', '软件设计师', '系统分析师', '项目经理PMP', '网络工程师', '人力资源管理师', '心理咨询师', '营养师', '护士执业资格', '医师资格证'];

  // 手机号号段
  const PHONE_PREFIXES = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '145', '146', '147', '149',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '162', '165', '166', '167',
    '170', '171', '172', '173', '175', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
    '190', '191', '193', '195', '197', '198', '199'];

  const TEL_AREAS = ['010', '021', '022', '023', '020', '0755', '0571', '025', '028', '029',
    '024', '027', '0591', '0531', '0371', '0411', '0451', '0512', '0551', '0731'];

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

  // 统一社会信用代码字符集
  const USCC_CHARS = '0123456789ABCDEFGHJKLMNPQRTUWXY';
  const USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 4, 5, 7, 20, 6, 23, 15, 19, 1];
  const USCC_REG_CODES = ['9', '5', '1', 'Y', '6'];

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

  // ========== 字段 key 中英文映射 ==========
  const FIELD_KEYS = {
    name: { zh: '姓名', en: 'name' },
    enName: { zh: '英文名', en: 'enName' },
    gender: { zh: '性别', en: 'gender' },
    age: { zh: '年龄', en: 'age' },
    birthDate: { zh: '出生日期', en: 'birthDate' },
    nation: { zh: '民族', en: 'nation' },
    idCard: { zh: '身份证号', en: 'idCard' },
    phone: { zh: '手机号码', en: 'phone' },
    tel: { zh: '固定电话', en: 'tel' },
    emergencyContact: { zh: '紧急联系人', en: 'emergencyContact' },
    emergencyPhone: { zh: '紧急联系电话', en: 'emergencyPhone' },
    email: { zh: '邮箱', en: 'email' },
    qq: { zh: 'QQ号', en: 'qq' },
    wechat: { zh: '微信号', en: 'wechat' },
    nickname: { zh: '昵称', en: 'nickname' },
    school: { zh: '毕业学校', en: 'school' },
    college: { zh: '学院', en: 'college' },
    major: { zh: '专业', en: 'major' },
    degree: { zh: '学位', en: 'degree' },
    healthStatus: { zh: '健康状态', en: 'healthStatus' },
    politicalStatus: { zh: '政治面貌', en: 'politicalStatus' },
    title: { zh: '职称', en: 'title' },
    company: { zh: '单位', en: 'company' },
    companyAddr: { zh: '单位地址', en: 'companyAddr' },
    companyTel: { zh: '单位电话', en: 'companyTel' },
    position: { zh: '职务', en: 'position' },
    hobby: { zh: '特长/爱好', en: 'hobby' },
    birthPlace: { zh: '出生地', en: 'birthPlace' },
    address: { zh: '地址', en: 'address' },
    postcode: { zh: '邮编', en: 'postcode' },
    bankCard: { zh: '银行卡号', en: 'bankCard' },
    bankName: { zh: '开户行', en: 'bankName' },
    bankCode: { zh: '开户行联行号', en: 'bankCode' },
    account: { zh: '账号', en: 'account' },
    password: { zh: '密码', en: 'password' },
    uscc: { zh: '统一社会信用代码', en: 'uscc' },
    height: { zh: '身高(cm)', en: 'height' },
    weight: { zh: '体重(kg)', en: 'weight' },
    education: { zh: '学历', en: 'education' },
    occupation: { zh: '职业', en: 'occupation' },
    marriage: { zh: '婚姻状态', en: 'marriage' },
    passport: { zh: '护照号', en: 'passport' },
    hkMacau: { zh: '港澳通行证号', en: 'hkMacau' },
    residence: { zh: '居住证号码', en: 'residence' },
    hukou: { zh: '户籍所在地', en: 'hukou' },
    profile: { zh: '个人简介', en: 'profile' },
    bloodType: { zh: '血型', en: 'bloodType' },
    nationality: { zh: '国籍', en: 'nationality' },
    formerName: { zh: '曾用名', en: 'formerName' },
    pinyin: { zh: '姓名拼音', en: 'pinyin' },
    residenceType: { zh: '户口性质', en: 'residenceType' },
    highestEducation: { zh: '最高学历', en: 'highestEducation' },
    certificateNo: { zh: '学历证书编号', en: 'certificateNo' },
    familyMembers: { zh: '家庭信息成员', en: 'familyMembers' },
    skillCerts: { zh: '技能证书', en: 'skillCerts' }
  };

  // ========== configUI 辅助模板 ==========
  // 渲染一组 checkbox（多选）
  function _tplCheckboxes(name, options, selected) {
    const set = new Set(selected || []);
    return `<div class="ug-cfg-row"><div class="ug-checkbox-group" data-cfg-key="${name}">
      ${options.map(opt => `<label><input type="checkbox" value="${opt}" ${set.has(opt) ? 'checked' : ''}>${opt}</label>`).join('')}
    </div></div>`;
  }
  // 渲染数字范围
  function _tplRange(name, curMin, curMax, minV, maxV) {
    return `<div class="ug-cfg-row"><div class="ug-range-pair" data-cfg-min="${name}" data-cfg-max="${name}">
      <span class="ug-sub-label">最小</span>
      <input type="number" class="ug-input" min="${minV}" max="${maxV}" value="${curMin}">
      <span class="ug-sub-label">最大</span>
      <input type="number" class="ug-input" min="${minV}" max="${maxV}" value="${curMax}">
    </div></div>`;
  }
  // 渲染文本列表（逗号分隔自定义）
  function _tplTextarea(name, value, placeholder, rows) {
    return `<div class="ug-cfg-row"><textarea class="ug-input ug-textlist" rows="${rows || 2}" placeholder="${placeholder}" data-cfg-text="${name}">${value || ''}</textarea></div>`;
  }

  // ========== 字段分类 ==========
  const CATEGORIES = [
    { id: 'basic', title: '🧑 基础信息' },
    { id: 'contact', title: '📱 联系方式' },
    { id: 'address', title: '📍 地址信息' },
    { id: 'id', title: '🪪 证件编号' },
    { id: 'edu', title: '🎓 教育经历' },
    { id: 'work', title: '💼 工作单位' },
    { id: 'finance', title: '💰 金融账户' },
    { id: 'social', title: '🏥 社会与家庭' },
    { id: 'socialmedia', title: '🌐 网络社交' }
  ];

  // ========== 字段注册表 ==========
  // 每个字段 { id, label, group, defaultSelected, gen(ctx, cfg), configUI?(cfg) }
  // ctx = { birthDate, gender, age, ... } 共享上下文; cfg = fieldConfig
  const FIELDS = [
    {
      id: 'name', group: 'basic', label: '姓名', defaultSelected: true,
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
        <select class="ug-select" data-cfg-simple="nameStyle">
          <option value="zh" ${cfg.nameStyle === 'zh' ? 'selected' : ''}>中文</option>
          <option value="en" ${cfg.nameStyle === 'en' ? 'selected' : ''}>英文</option>
        </select></div>`,
      gen: (ctx, cfg) => {
        const style = cfg.nameStyle || 'zh';
        if (style === 'en') {
          const sex = ctx.gender !== undefined ? ctx.gender : _randInt(0, 1);
          const first = sex === 1 ? _r(EN_FIRST_MALE) : _r(EN_FIRST_FEMALE);
          return first + ' ' + _r(EN_LAST);
        }
        const sex = ctx.gender !== undefined ? ctx.gender : _randInt(0, 1);
        const pool = sex === 1 ? GIVEN_NAMES.male : GIVEN_NAMES.female;
        const gn = Math.random() < 0.35 ? _r(pool) + _r(pool) : _r(pool);
        const sur = Math.random() < 0.15 ? _r(COMPOUND_SUR) : _r(SUR_NAMES);
        return sur + gn;
      }
    },
    {
      id: 'pinyin', group: 'basic', label: '姓名拼音', defaultSelected: false,
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">风格：</span>
        <select class="ug-select" data-cfg-simple="pinyinStyle">
          <option value="upper" ${cfg.pinyinStyle === 'upper' ? 'selected' : ''}>全大写</option>
          <option value="first" ${cfg.pinyinStyle === 'first' ? 'selected' : ''}>首字母大写</option>
          <option value="lower" ${cfg.pinyinStyle === 'lower' ? 'selected' : ''}>全小写</option>
        </select></div>`,
      gen: (ctx, cfg) => {
        const style = cfg.pinyinStyle || 'first';
        const len = _randInt(6, 14);
        let s = '';
        for (let i = 0; i < len; i++) s += EN_CHAR[_randInt(0, 25)];
        if (style === 'upper') return s.toUpperCase();
        if (style === 'lower') return s.toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
      }
    },
    {
      id: 'enName', group: 'basic', label: '英文名', defaultSelected: false,
      gen: (ctx) => {
        const sex = ctx.gender !== undefined ? ctx.gender : _randInt(0, 1);
        const first = sex === 1 ? _r(EN_FIRST_MALE) : _r(EN_FIRST_FEMALE);
        return first + ' ' + _r(EN_LAST);
      }
    },
    {
      id: 'gender', group: 'basic', label: '性别', defaultSelected: true,
      configUI: (cfg) => {
        const genders = cfg.genders || ['男', '女'];
        const custom = cfg.genderCustom || '';
        const all = ['男', '女', '未知', '空'];
        return `<div class="ug-cfg-row"><span class="ug-sub-label">可选值(多选)：</span></div>
          ${_tplCheckboxes('genders', all, genders)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义值（逗号分隔，选入结果）：</span></div>
          ${_tplTextarea('genderCustom', custom, '如: 保密, 其它')}`;
      },
      gen: (ctx, cfg) => {
        const base = cfg.genders && cfg.genders.length > 0 ? cfg.genders : ['男', '女'];
        let pool = base.slice();
        if (cfg.genderCustom) {
          const customArr = cfg.genderCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(customArr);
        }
        return pool.length > 0 ? _r(pool) : '';
      }
    },
    {
      id: 'age', group: 'basic', label: '年龄', defaultSelected: true,
      configUI: (cfg) => _tplRange('age', cfg.ageMin || 18, cfg.ageMax || 65, 1, 120),
      gen: (ctx) => { return ctx.age; }
    },
    {
      id: 'birthDate', group: 'basic', label: '出生日期', defaultSelected: true,
      gen: (ctx) => { return ctx.birthDateStr; },
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">格式：</span>
        <select class="ug-select" data-cfg-simple="birthFmt">
          <option value="YYYY-MM-DD" ${cfg.birthFmt === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
          <option value="YYYYMMDD" ${cfg.birthFmt === 'YYYYMMDD' ? 'selected' : ''}>YYYYMMDD</option>
          <option value="YYYY年MM月DD日" ${cfg.birthFmt === 'YYYY年MM月DD日' ? 'selected' : ''}>YYYY年MM月DD日</option>
          <option value="MM/DD/YYYY" ${cfg.birthFmt === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
        </select></div>`
    },
    {
      id: 'nation', group: 'basic', label: '民族', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.nations || NATIONS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">选择民族(默认全部，不选则为空)：</span></div>
          ${_tplCheckboxes('nations', NATIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.nations && cfg.nations.length > 0 ? cfg.nations : NATIONS;
        return _r(pool);
      }
    },
    {
      id: 'idCard', group: 'id', label: '身份证号', defaultSelected: true,
      gen: (ctx) => {
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
      id: 'phone', group: 'contact', label: '手机号码', defaultSelected: true,
      gen: () => _r(PHONE_PREFIXES) + _randInt(10000000, 99999999)
    },
    {
      id: 'tel', group: 'contact', label: '固定电话', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.telAreas || TEL_AREAS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">区号选择(多选)：</span></div>
          ${_tplCheckboxes('telAreas', TEL_AREAS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.telAreas && cfg.telAreas.length > 0 ? cfg.telAreas : TEL_AREAS;
        return _r(pool) + '-' + _randInt(60000000, 69999999);
      }
    },
    {
      id: 'emergencyContact', group: 'contact', label: '紧急联系人', defaultSelected: false,
      gen: () => _r(SUR_NAMES) + _r(GIVEN_NAMES.female.concat(GIVEN_NAMES.male))
    },
    {
      id: 'emergencyPhone', group: 'contact', label: '紧急联系电话', defaultSelected: false,
      gen: () => _r(PHONE_PREFIXES) + _randInt(10000000, 99999999)
    },
    {
      id: 'email', group: 'contact', label: '邮箱', defaultSelected: true,
      configUI: (cfg) => {
        const domains = cfg.emailDomains || EMAIL_DOMAINS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">邮箱后缀(多选)：</span></div>
          ${_tplCheckboxes('emailDomains', EMAIL_DOMAINS, domains)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义后缀（逗号分隔）：</span></div>
          ${_tplTextarea('emailDomainExtra', cfg.emailDomainExtra || '', '如: company.com, test.org')}`;
      },
      gen: (ctx, cfg) => {
        const base = cfg.emailDomains && cfg.emailDomains.length > 0 ? cfg.emailDomains : EMAIL_DOMAINS;
        let pool = base.slice();
        if (cfg.emailDomainExtra) {
          const extra = cfg.emailDomainExtra.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        const baseName = (ctx.gender === 1 ? _r(EN_FIRST_MALE) : _r(EN_FIRST_FEMALE)).toLowerCase();
        const namePart = baseName.replace(/[^a-z0-9]/g, '') + _randInt(1, 99);
        return namePart + '@' + _r(pool);
      }
    },
    {
      id: 'qq', group: 'socialmedia', label: 'QQ号', defaultSelected: false,
      gen: () => _randQQ()
    },
    {
      id: 'wechat', group: 'socialmedia', label: '微信号', defaultSelected: false,
      gen: () => _randWechat()
    },
    {
      id: 'nickname', group: 'socialmedia', label: '昵称', defaultSelected: false,
      gen: () => _randNickname()
    },
    {
      id: 'school', group: 'edu', label: '毕业学校', defaultSelected: false,
      gen: () => _randSchool()
    },
    {
      id: 'college', group: 'edu', label: '学院', defaultSelected: false,
      gen: () => _r(COLLEGES)
    },
    {
      id: 'major', group: 'edu', label: '专业', defaultSelected: false,
      gen: () => _r(MAJORS)
    },
    {
      id: 'degree', group: 'edu', label: '学位', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.degrees || DEGREES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">学位(多选)：</span></div>
          ${_tplCheckboxes('degrees', DEGREES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.degrees && cfg.degrees.length > 0 ? cfg.degrees : DEGREES;
        return _r(pool);
      }
    },
    {
      id: 'healthStatus', group: 'social', label: '健康状态', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.healthStatuses || HEALTH_STATUSES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">健康状态(多选)：</span></div>
          ${_tplCheckboxes('healthStatuses', HEALTH_STATUSES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.healthStatuses && cfg.healthStatuses.length > 0 ? cfg.healthStatuses : HEALTH_STATUSES;
        return _r(pool);
      }
    },
    {
      id: 'politicalStatus', group: 'social', label: '政治面貌', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.politicalStatuses || POLITICAL_STATUSES;
        const custom = cfg.politicalStatusCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">政治面貌(多选)：</span></div>
          ${_tplCheckboxes('politicalStatuses', POLITICAL_STATUSES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义值（逗号分隔）：</span></div>
          ${_tplTextarea('politicalStatusCustom', custom, '如: 民主党派人士')}`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.politicalStatuses && cfg.politicalStatuses.length > 0 ? cfg.politicalStatuses : POLITICAL_STATUSES;
        if (cfg.politicalStatusCustom) {
          const extra = cfg.politicalStatusCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        return _r(pool);
      }
    },
    {
      id: 'title', group: 'work', label: '职称', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.titles || TITLES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">职称(多选)：</span></div>
          ${_tplCheckboxes('titles', TITLES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.titles && cfg.titles.length > 0 ? cfg.titles : TITLES;
        return _r(pool);
      }
    },
    {
      id: 'position', group: 'work', label: '职务', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.positions || POSITIONS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">职务(多选)：</span></div>
          ${_tplCheckboxes('positions', POSITIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.positions && cfg.positions.length > 0 ? cfg.positions : POSITIONS;
        return _r(pool);
      }
    },
    {
      id: 'company', group: 'work', label: '单位', defaultSelected: false,
      gen: () => {
        // 10% 精英企业
        if (Math.random() < 0.1) {
          const elites = ['华为技术有限公司', '阿里巴巴集团控股有限公司', '腾讯科技(深圳)有限公司',
            '字节跳动科技有限公司', '百度在线网络技术(北京)有限公司', '小米科技有限责任公司',
            '京东集团', '美团网', '网易(杭州)网络有限公司', '滴滴出行科技有限公司',
            '中国移动通信集团有限公司', '国家电网有限公司', '中国石油化工集团公司'];
          return _r(elites);
        }
        return _r(COMPANY_PREFIX) + _r(COMPANY_INDUSTRY) + _r(COMPANY_SUFFIX);
      }
    },
    {
      id: 'companyAddr', group: 'work', label: '单位地址', defaultSelected: false,
      gen: () => {
        const province = _r(Object.values(PROVINCES).filter(p => p !== '台湾' && p !== '香港' && p !== '澳门'));
        const provincePart = ['北京', '上海', '天津', '重庆'].includes(province) ? province : province + '省';
        const city = province + _r(CITY_SUFFIXES);
        const district = _r(['朝阳', '海淀', '浦东', '南山', '天河', '鼓楼', '西湖', '玄武', '岳麓', '历下']) + _r(DISTRICT_SUFFIXES);
        const street = _r(STREET_PREFIXES);
        return provincePart + city + district + street + _randInt(1, 999) + '号';
      }
    },
    {
      id: 'companyTel', group: 'work', label: '单位电话', defaultSelected: false,
      gen: () => _r(TEL_AREAS) + '-' + _randInt(80000000, 89999999)
    },
    {
      id: 'hobby', group: 'social', label: '特长/爱好', defaultSelected: false,
      gen: () => {
        const count = _randInt(1, 3);
        const shuffled = HOBBIES_POOL.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count).join('、');
      }
    },
    {
      id: 'birthPlace', group: 'basic', label: '出生地', defaultSelected: false,
      gen: () => {
        const province = _r(Object.values(PROVINCES).filter(p => p !== '台湾' && p !== '香港' && p !== '澳门'));
        const isDirect = ['北京', '上海', '天津', '重庆'];
        if (isDirect.includes(province)) return province;
        return province + _r(CITY_SUFFIXES);
      }
    },
    {
      id: 'address', group: 'address', label: '地址', defaultSelected: true,
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">详细程度：</span>
        <select class="ug-select" data-cfg-simple="addrType">
          <option value="full" ${cfg.addrType === 'full' ? 'selected' : ''}>省市区详细地址</option>
          <option value="simple" ${cfg.addrType === 'simple' ? 'selected' : ''}>极简地址（省/市）</option>
          <option value="long" ${cfg.addrType === 'long' ? 'selected' : ''}>超长地址（含楼层门牌）</option>
        </select></div>`,
      gen: (ctx, cfg) => {
        const isDirect = ['北京', '上海', '天津', '重庆'];
        const province = _r(Object.values(PROVINCES).filter(p => p !== '台湾' && p !== '香港' && p !== '澳门'));
        const provincePart = isDirect.includes(province) ? province : province + '省';
        const city = province + _r(CITY_SUFFIXES);
        const district = _r(['朝阳', '海淀', '浦东', '南山', '天河', '鼓楼', '西湖', '玄武', '岳麓', '历下']) + _r(DISTRICT_SUFFIXES);
        const street = _r(STREET_PREFIXES);
        const number = _randInt(1, 999) + '号';
        const type = cfg.addrType || 'full';
        if (type === 'simple') return provincePart + city;
        if (type === 'long') {
          const building = _randInt(1, 30) + '栋';
          const unit = _randInt(1, 6) + '单元';
          const floor = _randInt(1, 30) + '层';
          const room = _randInt(101, 3001) + '室';
          return provincePart + city + district + street + number + building + unit + floor + room;
        }
        return provincePart + city + district + street + number;
      }
    },
    {
      id: 'postcode', group: 'address', label: '邮编', defaultSelected: false,
      gen: () => _pad(_randInt(100000, 999999), 6)
    },
    {
      id: 'bankCard', group: 'finance', label: '银行卡号', defaultSelected: false,
      configUI: (cfg) => {
        const names = BANKS.map(b => b.name);
        const selected = cfg.banks || names;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">银行(多选，与开户行/联行号共用)：</span></div>
          ${_tplCheckboxes('banks', names, selected)}`;
      },
      gen: (ctx, cfg) => {
        let banks = cfg.banks && cfg.banks.length > 0 ? BANKS.filter(b => cfg.banks.includes(b.name)) : BANKS;
        if (banks.length === 0) banks = BANKS;
        const bank = _r(banks);
        const prefix = _r(bank.prefix);
        const remaining = 16 - prefix.length;
        let first = prefix;
        for (let i = 0; i < remaining - 1; i++) first += _randInt(0, 9);
        return first + luhnChecksum(first);
      }
    },
    {
      id: 'bankName', group: 'finance', label: '开户行', defaultSelected: false,
      configUI: (cfg) => {
        const names = BANKS.map(b => b.name);
        const selected = cfg.banks || names;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">银行(多选)：</span></div>
          ${_tplCheckboxes('banks', names, selected)}`;
      },
      gen: (ctx, cfg) => {
        const names = BANKS.map(b => b.name);
        const pool = cfg.banks && cfg.banks.length > 0 ? cfg.banks : names;
        return _r(pool) + ' 总行';
      }
    },
    {
      id: 'bankCode', group: 'finance', label: '开户行联行号', defaultSelected: false,
      gen: (ctx, cfg) => {
        let banks = cfg.banks && cfg.banks.length > 0 ? BANKS.filter(b => cfg.banks.includes(b.name)) : BANKS;
        if (banks.length === 0) banks = BANKS;
        return _r(banks).code + _pad(_randInt(1, 99), 2);
      }
    },
    {
      id: 'account', group: 'finance', label: '账号', defaultSelected: false,
      gen: () => {
        const pools = ['user', 'admin', 'test', 'member', 'vip', 'guest', 'developer', 'manager'];
        return _r(pools) + _randInt(1000, 9999);
      }
    },
    {
      id: 'password', group: 'finance', label: '密码', defaultSelected: false,
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">强度：</span>
        <select class="ug-select" data-cfg-simple="pwdType">
          <option value="weak" ${cfg.pwdType === 'weak' ? 'selected' : ''}>弱密码（字母+数字 6-8位）</option>
          <option value="strong" ${cfg.pwdType === 'strong' ? 'selected' : ''}>强密码（大小写+数字+符号 10-16位）</option>
          <option value="space" ${cfg.pwdType === 'space' ? 'selected' : ''}>带空格密码（单词组合）</option>
        </select></div>`,
      gen: (ctx, cfg) => {
        const type = cfg.pwdType || 'strong';
        if (type === 'weak') {
          const chars = 'abcdefghijkmnopqrstuvwxyz23456789';
          let p = '';
          for (let i = 0; i < _randInt(6, 8); i++) p += chars[_randInt(0, chars.length - 1)];
          return p;
        }
        if (type === 'space') {
          const a = _r(EN_ADJ); const n = _r(EN_NOUN);
          return (a + ' ' + n + ' ' + _randInt(1, 9999)).trim();
        }
        // strong
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lower = 'abcdefghijkmnopqrstuvwxyz';
        const sym = '!@#$%^&*()-_=+[]{};:,.<>?';
        let p = upper[_randInt(0, upper.length - 1)]
          + lower[_randInt(0, lower.length - 1)]
          + String(_randInt(0, 9))
          + sym[_randInt(0, sym.length - 1)];
        const pool = upper + lower + '23456789' + sym;
        const len = _randInt(10, 16);
        for (let i = 4; i < len; i++) p += pool[_randInt(0, pool.length - 1)];
        return p.split('').sort(() => Math.random() - 0.5).join('');
      }
    },
    {
      id: 'uscc', group: 'id', label: '统一社会信用代码', defaultSelected: false,
      gen: () => {
        const regCode = _r(USCC_REG_CODES);
        const catCode = _r(['1', '2', '3', '9']);
        const area = _pad(_randInt(110000, 659999), 6);
        let orgCode = '';
        for (let i = 0; i < 8; i++) orgCode += USCC_CHARS[_randInt(0, USCC_CHARS.length - 1)];
        const first17 = regCode + catCode + area + orgCode;
        return first17 + usccChecksum(first17);
      }
    },
    {
      id: 'height', group: 'basic', label: '身高(cm)', defaultSelected: false,
      gen: (ctx) => {
        if (ctx.gender === 1) return _randInt(160, 190);
        return _randInt(150, 175);
      }
    },
    {
      id: 'weight', group: 'basic', label: '体重(kg)', defaultSelected: false,
      configUI: (cfg) => `<div class="ug-cfg-row">
        <span class="ug-sub-label">范围(男)：</span>
        <div class="ug-range-pair" data-cfg-min="weight" data-cfg-max="weight">
          <span class="ug-sub-label">最小</span>
          <input type="number" class="ug-input" min="30" max="200" value="${cfg.weightMinMale !== undefined ? cfg.weightMinMale : 55}">
          <span class="ug-sub-label">最大</span>
          <input type="number" class="ug-input" min="30" max="200" value="${cfg.weightMaxMale !== undefined ? cfg.weightMaxMale : 90}">
        </div>
        <span class="ug-sub-label" style="margin-left:8px">范围(女)：</span>
        <div class="ug-range-pair" data-cfg-min="weightF" data-cfg-max="weightF">
          <span class="ug-sub-label">最小</span>
          <input type="number" class="ug-input" min="30" max="200" value="${cfg.weightMinFemale !== undefined ? cfg.weightMinFemale : 40}">
          <span class="ug-sub-label">最大</span>
          <input type="number" class="ug-input" min="30" max="200" value="${cfg.weightMaxFemale !== undefined ? cfg.weightMaxFemale : 70}">
        </div>
      </div>`,
      gen: (ctx, cfg) => {
        if (ctx.gender === 1) {
          const mn = cfg.weightMinMale !== undefined ? cfg.weightMinMale : 55;
          const mx = cfg.weightMaxMale !== undefined ? cfg.weightMaxMale : 90;
          return _randInt(mn, mx);
        }
        const mn = cfg.weightMinFemale !== undefined ? cfg.weightMinFemale : 40;
        const mx = cfg.weightMaxFemale !== undefined ? cfg.weightMaxFemale : 70;
        return _randInt(mn, mx);
      }
    },
    {
      id: 'education', group: 'edu', label: '学历', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.educations || EDUCATIONS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">学历(多选)：</span></div>
          ${_tplCheckboxes('educations', EDUCATIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.educations && cfg.educations.length > 0 ? cfg.educations : EDUCATIONS;
        return _r(pool);
      }
    },
    {
      id: 'occupation', group: 'work', label: '职业', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.occupations || OCCUPATIONS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">职业(多选)：</span></div>
          ${_tplCheckboxes('occupations', OCCUPATIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.occupations && cfg.occupations.length > 0 ? cfg.occupations : OCCUPATIONS;
        return _r(pool);
      }
    },
    {
      id: 'marriage', group: 'social', label: '婚姻状态', defaultSelected: false,
      gen: (ctx) => {
        const age = ctx.age || _randInt(18, 65);
        if (age < 22) return '未婚';
        if (age > 60) return Math.random() < 0.5 ? '已婚' : '丧偶';
        return _r(MARRIAGES);
      }
    },
    {
      id: 'passport', group: 'id', label: '护照号', defaultSelected: false,
      gen: () => {
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        let p = letters[_randInt(0, letters.length - 1)];
        p += letters[_randInt(0, letters.length - 1)];
        p += _pad(_randInt(1, 999999), 7);
        return p;
      }
    },
    {
      id: 'hkMacau', group: 'id', label: '港澳通行证号', defaultSelected: false,
      gen: () => 'C' + _pad(_randInt(10000000, 99999999), 8)
    },
    {
      id: 'residence', group: 'id', label: '居住证号码', defaultSelected: false,
      gen: () => {
        const area = _pad(_randInt(110000, 440000), 6);
        const birth = formatDate(randomDate(1950, 2005), 'YYYYMMDD');
        return area + birth + _pad(_randInt(1, 999), 3);
      }
    },
    {
      id: 'hukou', group: 'address', label: '户籍所在地', defaultSelected: false,
      gen: () => {
        const province = _r(Object.values(PROVINCES));
        const cities = province === '北京' || province === '上海' || province === '天津' || province === '重庆'
          ? ['东城', '西城', '朝阳', '海淀', '浦东', '黄浦']
          : ['市辖区', '县', '区', '自治县'];
        return province + '省' + _r(cities) + '区';
      }
    },
    {
      id: 'profile', group: 'social', label: '个人简介', defaultSelected: false,
      gen: () => {
        const tpl = _r(PROFILE_TEMPLATES);
        return tpl.replace('{hobby}', _r(HOBBIES_POOL));
      }
    },
    {
      id: 'bloodType', group: 'basic', label: '血型', defaultSelected: false,
      configUI: (cfg) => `<div class="ug-cfg-row"><span class="ug-sub-label">ABO：</span>
        <select class="ug-select" data-cfg-simple="bloodABO">
          ${BLOOD_TYPES.map(t => `<option value="${t}" ${cfg.bloodABO === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
        <div class="ug-cfg-row"><span class="ug-sub-label">Rh：</span>
        <select class="ug-select" data-cfg-simple="bloodRh">
          ${RH_TYPES.map(t => `<option value="${t}" ${cfg.bloodRh === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>`,
      gen: (ctx, cfg) => `${cfg.bloodABO || 'O'}型 (${cfg.bloodRh || 'Rh+'})`
    },
    {
      id: 'nationality', group: 'basic', label: '国籍', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.nationalities || NATIONALITIES;
        const custom = cfg.nationalityCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">国籍(多选)：</span></div>
          ${_tplCheckboxes('nationalities', NATIONALITIES, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义后缀（逗号分隔）：</span></div>
          ${_tplTextarea('nationalityCustom', custom, '如: 无国籍, 双重国籍')}`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.nationalities && cfg.nationalities.length > 0 ? cfg.nationalities : NATIONALITIES;
        if (cfg.nationalityCustom) {
          const extra = cfg.nationalityCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        return _r(pool);
      }
    },
    {
      id: 'formerName', group: 'basic', label: '曾用名', defaultSelected: false,
      gen: () => {
        if (Math.random() < 0.7) return '';
        const sex = _randInt(0, 1);
        const pool = sex === 1 ? GIVEN_NAMES.male : GIVEN_NAMES.female;
        const gn = Math.random() < 0.35 ? _r(pool) + _r(pool) : _r(pool);
        const sur = Math.random() < 0.15 ? _r(COMPOUND_SUR) : _r(SUR_NAMES);
        return sur + gn;
      }
    },
    {
      id: 'residenceType', group: 'address', label: '户口性质', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.residenceTypes || RESIDENCE_TYPES;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">户口性质(多选)：</span></div>
          ${_tplCheckboxes('residenceTypes', RESIDENCE_TYPES, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.residenceTypes && cfg.residenceTypes.length > 0 ? cfg.residenceTypes : RESIDENCE_TYPES;
        return _r(pool);
      }
    },
    {
      id: 'highestEducation', group: 'edu', label: '最高学历', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.highestEducations || EDUCATIONS;
        return `<div class="ug-cfg-row"><span class="ug-sub-label">最高学历(多选)：</span></div>
          ${_tplCheckboxes('highestEducations', EDUCATIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.highestEducations && cfg.highestEducations.length > 0 ? cfg.highestEducations : EDUCATIONS;
        return _r(pool);
      }
    },
    {
      id: 'certificateNo', group: 'id', label: '学历证书编号', defaultSelected: false,
      gen: () => {
        const type = _randInt(0, 1);
        const num = _pad(_randInt(10000000, 99999999), 8);
        if (type === 0) return `毕证第${num}号`;
        return `学位证字第${num}号`;
      }
    },
    {
      id: 'familyMembers', group: 'social', label: '家庭信息成员', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.familyRelations || FAMILY_RELATIONS.slice(0, 4);
        return `<div class="ug-cfg-row"><span class="ug-sub-label">关系(多选，默认父/母/配偶/儿子)：</span></div>
          ${_tplCheckboxes('familyRelations', FAMILY_RELATIONS, selected)}`;
      },
      gen: (ctx, cfg) => {
        const pool = cfg.familyRelations && cfg.familyRelations.length > 0 ? cfg.familyRelations : FAMILY_RELATIONS.slice(0, 4);
        const count = _randInt(1, Math.min(3, pool.length));
        const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, count);
        return shuffled.map(rel => {
          const sex = _randInt(0, 1);
          const gpool = sex === 1 ? GIVEN_NAMES.male : GIVEN_NAMES.female;
          const gn = Math.random() < 0.35 ? _r(gpool) + _r(gpool) : _r(gpool);
          const sur = Math.random() < 0.15 ? _r(COMPOUND_SUR) : _r(SUR_NAMES);
          return {
            '关系': rel,
            '姓名': sur + gn,
            '职业': _r(OCCUPATIONS),
            '单位': Math.random() < 0.1
              ? _r(['华为技术有限公司', '阿里巴巴集团控股有限公司', '腾讯科技(深圳)有限公司', '字节跳动科技有限公司'])
              : _r(COMPANY_PREFIX) + _r(COMPANY_INDUSTRY) + _r(COMPANY_SUFFIX),
            '联系方式': _r(PHONE_PREFIXES) + _pad(_randInt(10000000, 99999999), 8)
          };
        });
      }
    },
    {
      id: 'skillCerts', group: 'social', label: '技能证书', defaultSelected: false,
      configUI: (cfg) => {
        const selected = cfg.skillCerts || SKILL_CERTS;
        const custom = cfg.skillCertsCustom || '';
        return `<div class="ug-cfg-row"><span class="ug-sub-label">技能证书(多选)：</span></div>
          ${_tplCheckboxes('skillCerts', SKILL_CERTS, selected)}
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义后缀（逗号分隔）：</span></div>
          ${_tplTextarea('skillCertsCustom', custom, '如: 初级电工证, 安全员证', 2)}`;
      },
      gen: (ctx, cfg) => {
        let pool = cfg.skillCerts && cfg.skillCerts.length > 0 ? cfg.skillCerts : SKILL_CERTS;
        if (cfg.skillCertsCustom) {
          const extra = cfg.skillCertsCustom.split(/[,，\s]+/).filter(Boolean);
          pool = pool.concat(extra);
        }
        const count = _randInt(1, Math.min(3, pool.length));
        const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, count);
        return shuffled.join('、');
      }
    }
  ];

  // ========== 渲染工具 ==========
  // 把任意值（含数组/对象）安全转成字符串表示
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
      name: '用户信息生成',
      desc: '50+ 字段可选随机生成，支持中英文 key、多选/范围/格式配置，文本/JSON/YAML 导出，分组选择',
      icon: '👤',
      iconUrl: 'icons/user-generator.png',
      category: 'data-gen',
      categoryName: '数据工具'
    },
    fieldConfig: {
      // 全局
      keyLang: 'zh',
      // 已有字段配置默认
      birthFmt: 'YYYY-MM-DD',
      nameStyle: 'zh',
      ageMin: 18, ageMax: 65,
      emailDomains: EMAIL_DOMAINS.slice(),
      emailDomainExtra: '',
      banks: BANKS.map(b => b.name),
      weightMinMale: 55, weightMaxMale: 90,
      weightMinFemale: 40, weightMaxFemale: 70,
      genders: ['男', '女'],
      genderCustom: '',
      nations: NATIONS.slice(),
      telAreas: TEL_AREAS.slice(),
      addrType: 'full',
      pwdType: 'strong',
      educations: EDUCATIONS.slice(),
      occupations: OCCUPATIONS.slice(),
      degrees: DEGREES.slice(),
      healthStatuses: HEALTH_STATUSES.slice(),
      politicalStatuses: POLITICAL_STATUSES.slice(),
      politicalStatusCustom: '',
      titles: TITLES.slice(),
      positions: POSITIONS.slice(),
      // 新增字段配置默认值
      bloodABO: 'O', bloodRh: 'Rh+',
      nationalities: NATIONALITIES.slice(),
      residenceTypes: RESIDENCE_TYPES.slice(),
      highestEducations: EDUCATIONS.slice(),
      familyRelations: FAMILY_RELATIONS.slice(0, 4),
      skillCerts: SKILL_CERTS.slice(),
      skillCertsCustom: '',
      nationalityCustom: '',
      pinyinStyle: 'first'
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
              <div class="ug-empty">点击「生成」按钮，生成用户信息 👤</div>
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
            // 绑定配置事件（统一处理 4 种类型）
            this._bindCfgEvents(cfgBox);
          }
        });
      });

      // 分组全选/清空
      grid.querySelectorAll('.ug-cat-sel').forEach(btn => {
        btn.addEventListener('click', (e) => {
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
        // 找 max 和 min 的键
        let minKey, maxKey;
        if (key === 'weightF') {
          minKey = 'weightMinFemale'; maxKey = 'weightMaxFemale';
        } else if (key === 'weight') {
          minKey = 'weightMinMale'; maxKey = 'weightMaxMale';
        } else {
          minKey = key + 'Min'; maxKey = key + 'Max';
        }
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
      ctx.gender = _randInt(0, 1);
      ctx.age = _randInt(cfg.ageMin || 18, cfg.ageMax || 65);
      const birthYear = new Date().getFullYear() - ctx.age - 1;
      const birthYear2 = new Date().getFullYear() - ctx.age;
      ctx.birthDate = randomDate(birthYear, birthYear2);
      ctx.birthDateStr = formatDate(ctx.birthDate, cfg.birthFmt || 'YYYY-MM-DD');
      return ctx;
    },

    doGenerate(root) {
      const ids = this._getSelected(root);
      if (ids.length === 0) { this._toast('请先选择至少一个字段'); return; }
      const count = Math.max(1, Math.min(500, parseInt(root.querySelector('#ugCount').value) || 1));

      const results = [];
      for (let i = 0; i < count; i++) {
        const ctx = this._prepareCtx();
        const item = {};
        for (const fid of ids) {
          const field = FIELDS.find(f => f.id === fid);
          if (field) {
            // 根据 keyLang 选择 key
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
        box.innerHTML = '<div class="ug-empty">点击「生成」按钮，生成用户信息 👤</div>';
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

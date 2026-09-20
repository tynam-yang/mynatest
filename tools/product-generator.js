// tools/product-generator.js — 商品 & 电商信息随机生成（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const NAME = 'product-generator';

  // ========== 工具函数 ==========
  function _r(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function _randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function _randFloat(min, max, dec = 2) {
    const v = Math.random() * (max - min) + min;
    return Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
  }
  function _pad(n, len) { return String(n).padStart(len, '0'); }

  // ========== 常量表 ==========
  // 品牌
  const BRANDS = [
    '华为', '小米', '苹果', '三星', 'OPPO', 'vivo', '荣耀', '魅族', '一加', '锤子',
    '戴尔', '联想', '华硕', '宏碁', '惠普', 'ThinkPad', '机械革命', '拯救者', 'ROG',
    '耐克', '阿迪达斯', '李宁', '安踏', '特步', '匹克', '361°', '优衣库', 'ZARA', 'H&M',
    '欧莱雅', '雅诗兰黛', '兰蔻', '资生堂', 'SK-II', '屈臣氏', '理肤泉', '薇诺娜',
    '三只松鼠', '良品铺子', '百草味', '周黑鸭', '绝味', '卫龙', '良品铺子',
    '美的', '格力', '海尔', '小天鹅', '方太', '老板', '博世', '西门子', '松下',
    '可口可乐', '百事', '农夫山泉', '康师傅', '统一', '伊利', '蒙牛',
    '迪士尼', '乐高', '万代', '小米有品', '网易严选', '拼多多', '淘宝心选',
    '宝马', '奔驰', '奥迪', '特斯拉', '比亚迪', '蔚来', '理想', '小鹏',
    '无品牌', 'OEM'
  ];

  // 一级类目
  const CATE_L1 = ['手机数码', '家用电器', '服饰鞋包', '美妆个护', '食品饮料', '母婴玩具', '家居家装', '运动户外', '汽车用品', '图书文娱', '办公文具', '宠物用品'];
  // 二级类目（映射到 L1，随机匹配）
  const CATE_L2_POOL = [
    '手机通讯', '平板电脑', '笔记本', '台式机', '相机', '智能穿戴', '耳机音响',
    '大家电', '厨房电器', '生活电器', '个护电器', '影音电器', '安防电器',
    '男装', '女装', '童装', '内衣', '鞋靴', '箱包', '配饰', '中老年装',
    '面部护肤', '身体护理', '彩妆', '香水', '美发', '口腔护理', '个人清洁',
    '零食', '饮料', '冲调', '粮油', '生鲜', '保健品', '特产', '进口食品',
    '奶粉', '纸尿裤', '童装', '玩具', '童车', '孕产', '辅食', '童鞋',
    '家具', '家纺', '灯具', '厨具', '餐具', '收纳', '清洁工具', '装修材料',
    '运动鞋服', '户外装备', '骑行', '球类', '健身器材', '垂钓', '露营',
    '汽车配件', '车载用品', '新车', '二手车', '自驾装备', '摩托用品',
    '图书', '音像', '电子书', '文创', '乐器', '游戏', '动漫周边',
    '办公设备', '文具', '耗材', '员工福利', '财会用品', '教学用品',
    '宠物食品', '宠物用品', '宠物医疗', '水族', '异宠', '宠物洗护'
  ];
  // 三级类目（叶子）
  const CATE_L3_POOL = [
    '智能手机', '平板电脑', '游戏笔记本', '轻薄笔记本', '单反相机', '微单相机', '智能手表', '无线耳机',
    '冰箱', '洗衣机', '空调', '电视', '油烟机', '燃气灶', '电饭煲', '扫地机器人', '微波炉', '豆浆机',
    'T恤', '衬衫', '牛仔裤', '连衣裙', '西装', '羽绒服', '风衣', '毛衣', '卫衣', '工装裤',
    '运动鞋', '皮鞋', '帆布鞋', '雪地靴', '高跟鞋', '凉鞋', '马丁靴', '板鞋',
    '双肩包', '单肩包', '钱包', '公文包', '拉杆箱', '手提包', '托特包',
    '爽肤水', '乳液', '面霜', '精华', '眼霜', '口红', '粉底液', '香水', '面膜', '防晒霜',
    '饼干', '坚果', '糖果', '薯片', '辣条', '巧克力', '方便面', '咖啡', '茶叶', '红酒',
    '配方奶粉', '纸尿裤', '婴儿车', '辅食', '玩具积木', '遥控玩具', '绘本', '童装套装',
    '床', '沙发', '餐桌', '衣柜', '书桌', '茶几', '电视柜', '书柜',
    '四件套', '被子', '枕头', '窗帘', '地毯', '台灯', '吊灯', '壁灯',
    '运动鞋', '瑜伽服', '跑步鞋', '登山包', '帐篷', '睡袋', '鱼竿', '自行车', '跑步机', '哑铃',
    '轮胎', '机油', '车蜡', '行车记录仪', '车载导航', '车载冰箱', '汽车脚垫', '贴膜',
    '小说', '传记', '童书', '教材', '漫画', '游戏卡带', '乐器', '文创产品',
    '打印机', '复印机', '中性笔', '笔记本', '文件夹', '订书机', '碎纸机', '员工礼品',
    '狗粮', '猫粮', '鱼缸', '猫砂', '狗窝', '猫爬架', '鸟笼', '水族箱', '宠物玩具'
  ];

  // 商品标签
  const TAGS = ['新品', '爆款', '热销', '包邮', '限时', '特价', '秒杀', '清仓', '满减', '套装', '预售', '定金', '尾款', '人气', '精选', '推荐', '自营', '旗舰店', '无理由', '保障'];

  // 商品状态
  const STATUS = ['草稿', '待审核', '已上架', '已下架', '审核驳回'];

  // 运费模板（模拟）
  const FREIGHT_TEMPLATES = ['全国包邮模板', '偏远地区不包邮', '满 99 元包邮', '重量计费模板', '体积计费模板', '固定运费 10 元', '货到付款模板'];

  // 颜色属性
  const COLOR_ATTRS = ['黑色', '白色', '红色', '蓝色', '灰色', '银色', '金色', '粉色', '紫色', '绿色', '棕色', '黄色', '藏青', '酒红', '卡其', '驼色', '军绿'];

  // 尺寸属性（多品类）
  const SIZE_ATTRS_CLOTH = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '均码'];
  const SIZE_ATTRS_SHOE = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
  const SIZE_ATTRS_GENERAL = ['小号', '中号', '大号', '加大号', '特大号'];

  // 材质属性
  const MATERIAL_ATTRS = ['纯棉', '涤纶', '雪纺', '真丝', '羊毛', '皮革', 'PU', '牛仔', '亚麻', '莫代尔', '锦纶', '氨纶', '混纺', '铜氨丝', '蚕丝', '羊绒', '羽绒', '棉麻', '针织', '缎面'];

  // 关键词词库（造商品名用）
  const KW_ADJ = ['爆款', '精选', '热销', '时尚', '经典', '舒适', '透气', '轻薄', '耐磨', '防水', '智能', '便携', '静音', '节能', '环保', '高档', '轻奢', '大牌', '旗舰', '进口'];
  const KW_BODY = ['无线耳机', '智能手机', '机械键盘', '蓝牙音箱', '智能手表', '运动手环', '羽绒服', 'T恤', '连衣裙', '运动鞋', '帆布鞋', '双肩包', '拉杆箱', '爽肤水', '面膜', '精华液', '口红', '面霜', '香水', '电饭煲', '电饭煲', '空气炸锅', '扫地机器人', '吹风机', '电动牙刷', '保温杯', '雨伞', '台灯', '笔记本支架', '鼠标垫', '零食大礼包', '坚果礼盒', '咖啡豆', '普洱茶', '橄榄油', '五常大米', '牛奶', '矿泉水', '乐高积木', '儿童绘本', '宠物粮', '猫砂', '狗粮', '猫粮'];

  // 图片路径池
  function _genImageUrl(idx) {
    // 用占位图服务生成随机图
    const seed = Math.random().toString(36).slice(2, 8);
    return `https://picsum.photos/seed/${seed}/800/800`;
  }

  function _genImages(n) {
    return Array.from({ length: _randInt(1, n) }, () => _genImageUrl());
  }

  // ========== 字段定义（按 group 分组） ==========
  const FIELDS = [
    // --- 一、商品基础 ---
    { group: 'basic', groupName: '📦 商品基础', id: 'spuId', zh: '商品ID', en: 'spuId' },
    { group: 'basic', groupName: '📦 商品基础', id: 'name', zh: '商品名称', en: 'name' },
    { group: 'basic', groupName: '📦 商品基础', id: 'subTitle', zh: '商品短标题', en: 'subTitle' },
    { group: 'basic', groupName: '📦 商品基础', id: 'productCode', zh: '商品编码', en: 'productCode' },
    { group: 'basic', groupName: '📦 商品基础', id: 'brandName', zh: '品牌名称', en: 'brandName' },
    { group: 'basic', groupName: '📦 商品基础', id: 'summary', zh: '商品简介', en: 'summary' },
    { group: 'basic', groupName: '📦 商品基础', id: 'description', zh: '商品详情', en: 'description' },

    // --- 二、类目属性 ---
    { group: 'category', groupName: '🏷️ 类目属性', id: 'cateIdL1', zh: '一级类目', en: 'cateIdL1' },
    { group: 'category', groupName: '🏷️ 类目属性', id: 'cateIdL2', zh: '二级类目', en: 'cateIdL2' },
    { group: 'category', groupName: '🏷️ 类目属性', id: 'cateIdL3', zh: '三级类目', en: 'cateIdL3' },
    { group: 'category', groupName: '🏷️ 类目属性', id: 'tagList', zh: '商品标签', en: 'tagList' },

    // --- 三、价格 ---
    { group: 'price', groupName: '💰 价格', id: 'marketPrice', zh: '市场价', en: 'marketPrice' },
    { group: 'price', groupName: '💰 价格', id: 'salePrice', zh: '销售价', en: 'salePrice' },
    { group: 'price', groupName: '💰 价格', id: 'costPrice', zh: '成本价', en: 'costPrice' },
    { group: 'price', groupName: '💰 价格', id: 'memberPrice', zh: '会员价', en: 'memberPrice' },
    { group: 'price', groupName: '💰 价格', id: 'discount', zh: '折扣', en: 'discount' },

    // --- 四、库存 & SKU ---
    { group: 'stock', groupName: '📊 库存 & SKU', id: 'skuList', zh: 'SKU 列表', en: 'skuList' },

    // --- 五、图文媒体 ---
    { group: 'media', groupName: '🖼️ 图文媒体', id: 'mainImages', zh: '商品主图', en: 'mainImages' },
    { group: 'media', groupName: '🖼️ 图文媒体', id: 'detailImages', zh: '详情图', en: 'detailImages' },
    { group: 'media', groupName: '🖼️ 图文媒体', id: 'videoUrl', zh: '视频地址', en: 'videoUrl' },

    // --- 六、上下架状态 ---
    { group: 'status', groupName: '📡 上下架状态', id: 'status', zh: '商品状态', en: 'status' },
    { group: 'status', groupName: '📡 上下架状态', id: 'onlineTime', zh: '上架时间', en: 'onlineTime' },
    { group: 'status', groupName: '📡 上下架状态', id: 'offlineTime', zh: '下架时间', en: 'offlineTime' },

    // --- 七、物流规格 ---
    { group: 'logistics', groupName: '🚚 物流规格', id: 'weight', zh: '重量(g)', en: 'weight' },
    { group: 'logistics', groupName: '🚚 物流规格', id: 'dimensions', zh: '长宽高(cm)', en: 'dimensions' },
    { group: 'logistics', groupName: '🚚 物流规格', id: 'freightTemplateId', zh: '运费模板', en: 'freightTemplateId' },
    { group: 'logistics', groupName: '🚚 物流规格', id: 'isFreeShipping', zh: '是否包邮', en: 'isFreeShipping' },
  ];

  // ========== FIELD_KEYS（中英文 key 映射） ==========
  const FIELD_KEYS = {};
  FIELDS.forEach(f => {
    FIELD_KEYS[f.id] = { zh: f.zh, en: f.en };
  });

  const GROUPS = [...new Set(FIELDS.map(f => f.group))];

  // ========== 默认配置 ==========
  const DEFAULT_CONFIG = {
    // spuId
    spuId: { mode: 'normal', len: 16, prefix: '' },
    // name
    name: { mode: 'normal' },
    // brand
    brandName: { mode: 'normal', customText: '' },
    // category attrs — 直接生成，无 configUI
    // price
    marketPrice: { min: 100, max: 9999 },
    salePrice: { min: 100, max: 9999 },
    costPrice: { min: 50, max: 5000 },
    discount: { min: 5.0, max: 9.9 },
    // stock
    // sku
    sku: { skuCount: _randInt(2, 5), colorAttrs: COLOR_ATTRS.slice(), sizeAttrs: SIZE_ATTRS_GENERAL.slice() },
    // mainImages
    mainImages: { minCount: 3, maxCount: 5 },
    detailImages: { minCount: 6, maxCount: 15 },
    videoUrl: { enabled: _randInt(0, 1) === 1 },
    // status
    status: { allowed: STATUS.slice() },
    onlineTime: { offsetDays: _randInt(-30, 30) },
    offlineTime: { validDays: _randInt(90, 365) },
    // logistics
    weight: { min: 100, max: 5000 },
    dimensions: { min: 5, max: 60 },
    isFreeShipping: { prob: 0.7 },
  };

  // ========== Gen 函数 ==========
  function _genSpuId(cfg) {
    const mode = cfg.mode || 'normal';
    const len = cfg.len || 16;
    const prefix = cfg.prefix || '';
    if (mode === 'empty') return '';
    if (mode === 'duplicate') return 'SPU' + _pad(1, len - 3);
    if (mode === 'tooLong') return 'A'.repeat(255);
    if (mode === 'chinese') return _r(['手机', '耳机', '电脑', '运动']);
    if (mode === 'special') return 'A@#B$%C';
    // normal
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let s = prefix;
    const need = len - prefix.length;
    for (let i = 0; i < need; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s.slice(0, 32);
  }

  function _genName(cfg) {
    const mode = cfg.mode || 'normal';
    if (mode === 'empty') return '';
    if (mode === 'superLong') return _r(KW_ADJ) + _r(BRANDS) + '牌' + _r(KW_BODY) + '旗舰典藏奢华至尊版·年度限定钜惠装';
    if (mode === 'specialChar') return 'A<B>XSS' + "' OR 1=1--";
    if (mode === 'emoji') return '🎉🎁🔥💥⭐⭐⭐ ' + _r(KW_BODY);
    // normal: 品牌 + 形容词 + 主体 + 规格
    return `${_r(KW_ADJ)}${_r(BRANDS)}${_r(KW_BODY)}`;
  }

  function _genSubTitle() {
    const r = Math.random();
    if (r < 0.15) return '';
    if (r < 0.3) return '\n\n\n超长换行测试';
    return `官方旗舰店正品 · 假一赔十 · 限时特惠中`;
  }

  function _genProductCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let s = 'SH';
    for (let i = 0; i < _randInt(6, 12); i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function _genBrandName(cfg) {
    const mode = cfg.mode || 'normal';
    if (mode === 'empty') return '';
    if (mode === 'custom' && cfg.customText) return _r(cfg.customText.split(/[,，\n]/).map(s => s.trim()).filter(Boolean));
    if (mode === 'superLong') return 'A'.repeat(120);
    return _r(BRANDS);
  }

  function _genSummary() {
    const r = Math.random();
    if (r < 0.1) return '超长'.repeat(30);
    if (r < 0.2) return "'; DROP TABLE products;--";
    return _r(KW_BODY) + '，品质保证，厂家直供，限时特惠。';
  }

  function _genDescription() {
    const r = Math.random();
    if (r < 0.15) return '<script>alert(document.cookie)</script>';
    if (r < 0.25) return '';
    if (r < 0.35) return 'A'.repeat(5000);
    // normal：一段富文本
    return `<p>${_r(KW_ADJ)}${_r(KW_BODY)}，${_r(KW_ADJ)}设计，${_r(['采用环保材料', '舒适透气', '经久耐用', '时尚百搭', '智能控制'])}</p>
<img src="${_genImageUrl()}" />
<p>规格参数：颜色 ${_r(COLOR_ATTRS)}，材质 ${_r(MATERIAL_ATTRS)}，产地 ${_r(['中国大陆', '越南', '孟加拉国', '日本', '韩国'])}</p>
<p>售后服务：7 天无理由退换，全国联保。</p>`;
  }

  function _genCateIdL1() { return _randInt(1, 99); }
  function _genCateIdL2() { return _randInt(100, 999); }
  function _genCateIdL3() { return _randInt(1000, 9999); }

  function _genTagList() {
    const n = _randInt(1, 5);
    const shuffled = [...TAGS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  function _genMoney(min, max) {
    const r = Math.random();
    if (r < 0.05) return 0.00;
    if (r < 0.1) return -99.99;
    if (r < 0.15) return NaN;
    if (r < 0.2) return 0;  // 0 元
    if (r < 0.25) return 123456789.12;  // 超大
    return _randFloat(min, max, 2);
  }

  function _genMarketPrice(cfg) {
    return _genMoney(cfg.min || 100, cfg.max || 9999);
  }
  function _genSalePrice(cfg) {
    return _genMoney(cfg.min || 100, cfg.max || 9999);
  }
  function _genCostPrice(cfg) {
    return _genMoney(cfg.min || 50, cfg.max || 5000);
  }
  function _genMemberPrice() {
    return _randFloat(50, 5000, 2);
  }
  function _genDiscount(cfg) {
    const r = Math.random();
    if (r < 0.1) return 0;
    if (r < 0.2) return 12.5;
    if (r < 0.3) return -1;
    return _randFloat(cfg.min || 5.0, cfg.max || 9.9, 1);
  }

  // SKU 生成：颜色 + 尺寸 笛卡尔积
  function _genSkuList(cfg) {
    const nColors = _randInt(1, 3);
    const nSizes = _randInt(1, 3);
    const colors = [...COLOR_ATTRS].sort(() => Math.random() - 0.5).slice(0, nColors);
    const sizes = [...SIZE_ATTRS_GENERAL].sort(() => Math.random() - 0.5).slice(0, nSizes);
    const skus = [];
    for (const c of colors) {
      for (const s of sizes) {
        skus.push({
          skuCode: 'SK' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase(),
          attrs: { color: c, size: s },
          salePrice: _randFloat(50, 9999, 2),
          stock: _randInt(0, 9999),
          warnStock: _randInt(5, 50),
        });
      }
    }
    return skus;
  }

  function _genMainImages(cfg) { return _genImages(_randInt(cfg.minCount || 3, cfg.maxCount || 5)); }
  function _genDetailImages(cfg) { return _genImages(_randInt(cfg.minCount || 6, cfg.maxCount || 15)); }
  function _genVideoUrl(cfg) {
    if (cfg.enabled && Math.random() < 0.5) {
      return `https://cdn.example.com/product/video/${Date.now()}.mp4`;
    }
    return '';
  }

  function _genStatus(cfg) {
    const pool = cfg.allowed || STATUS;
    return _r(pool);
  }
  function _genOnlineTime() {
    const d = new Date();
    d.setDate(d.getDate() + _randInt(-30, 30));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }
  function _genOfflineTime() {
    const d = new Date();
    d.setDate(d.getDate() + _randInt(90, 365));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function _genWeight(cfg) {
    const r = Math.random();
    if (r < 0.05) return -100;
    return _randInt(cfg.min || 100, cfg.max || 5000);
  }
  function _genDimensions(cfg) {
    const r = Math.random();
    if (r < 0.05) return { length: -5, width: 10, height: 10 };
    return {
      length: _randInt(cfg.min || 5, cfg.max || 60),
      width: _randInt(cfg.min || 5, cfg.max || 60),
      height: _randInt(cfg.min || 5, cfg.max || 60),
    };
  }
  function _genFreightTemplateId() {
    const r = Math.random();
    if (r < 0.05) return '';
    return _r(FREIGHT_TEMPLATES);
  }
  function _genIsFreeShipping(cfg) {
    return Math.random() < (cfg.prob || 0.7);
  }

  // ========== Gen 分发 ==========
  const GENERS = {
    spuId: _genSpuId,
    name: _genName,
    subTitle: _genSubTitle,
    productCode: _genProductCode,
    brandName: _genBrandName,
    summary: _genSummary,
    description: _genDescription,
    cateIdL1: _genCateIdL1,
    cateIdL2: _genCateIdL2,
    cateIdL3: _genCateIdL3,
    tagList: _genTagList,
    marketPrice: _genMarketPrice,
    salePrice: _genSalePrice,
    costPrice: _genCostPrice,
    memberPrice: _genMemberPrice,
    discount: _genDiscount,
    skuList: _genSkuList,
    mainImages: _genMainImages,
    detailImages: _genDetailImages,
    videoUrl: _genVideoUrl,
    status: _genStatus,
    onlineTime: _genOnlineTime,
    offlineTime: _genOfflineTime,
    weight: _genWeight,
    dimensions: _genDimensions,
    freightTemplateId: _genFreightTemplateId,
    isFreeShipping: _genIsFreeShipping,
  };

  // ========== Meta + Render/Mount ==========
  const meta = {
    id: NAME,
    name: '商品信息生成',
    desc: '商品 SPU/SKU 全字段随机生成（基础/类目/价格/库存/图文/物流），含边界 & 异常数据场景',
    iconUrl: 'icons/product-generator.png',
    category: 'data',
    categoryName: '数据生成',
  };

  function _renderCfgRow(field) {
    // 每种字段的 configUI（只有有可配置项的才渲染）
    const cfgHtml = _tplFieldCfg(field.id);
    return cfgHtml;
  }

  function _tplFieldCfg(id) {
    // 只给部分字段加 configUI，其他字段直接用默认 cfg
    const tpls = {
      spuId: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row"><span class="ug-sub-label">模式</span>
            <select data-cfg-simple="spuId.mode">
              <option value="normal">正常（字母数字混合）</option>
              <option value="empty">空值</option>
              <option value="tooLong">超长（255 位）</option>
              <option value="chinese">中文 ID</option>
              <option value="special">特殊字符 @#$</option>
            </select>
          </div>
          <div class="ug-cfg-row"><span class="ug-sub-label">前缀</span>
            <input data-cfg-simple="spuId.prefix" value="SPU" style="width:80px">
          </div>
          <div class="ug-cfg-row"><span class="ug-sub-label">长度</span>
            <input type="number" min="4" max="32" data-cfg-simple="spuId.len" value="16" style="width:60px">
          </div>
        </div>`,
      name: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row"><span class="ug-sub-label">模式</span>
            <select data-cfg-simple="name.mode">
              <option value="normal">正常（品牌+形容词+主体）</option>
              <option value="empty">空值</option>
              <option value="superLong">超长（>200 字）</option>
              <option value="specialChar">XSS/SQL 注入 payload</option>
              <option value="emoji">大量 emoji</option>
            </select>
          </div>
        </div>`,
      brandName: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row"><span class="ug-sub-label">模式</span>
            <select data-cfg-simple="brandName.mode">
              <option value="normal">品牌池随机</option>
              <option value="empty">空值</option>
              <option value="superLong">超长品牌名</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义品牌（逗号分隔）</span></div>
          <textarea rows="2" data-cfg-simple="brandName.customText" placeholder="如：Apple, 小米, 华为" style="width:100%"></textarea>
        </div>`,
      marketPrice: _tplRange('marketPrice', '最低', '最高', 100, 9999),
      salePrice: _tplRange('salePrice', '最低', '最高', 100, 9999),
      costPrice: _tplRange('costPrice', '最低', '最高', 50, 5000),
      discount: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">最小</span><input type="number" step="0.1" min="0" max="10" data-cfg-min="discount" value="5.0" style="width:42px">
            <span class="ug-sub-label">最大</span><input type="number" step="0.1" min="0" max="10" data-cfg-max="discount" value="9.9" style="width:42px">
          </div>
        </div>`,
      mainImages: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">最少</span><input type="number" min="0" max="9" data-cfg-min="mainImages" value="3" style="width:42px">
            <span class="ug-sub-label">最多</span><input type="number" min="0" max="9" data-cfg-max="mainImages" value="5" style="width:42px">
          </div>
        </div>`,
      detailImages: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">最少</span><input type="number" min="0" max="50" data-cfg-min="detailImages" value="6" style="width:42px">
            <span class="ug-sub-label">最多</span><input type="number" min="0" max="50" data-cfg-max="detailImages" value="15" style="width:42px">
          </div>
        </div>`,
      videoUrl: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <label><input type="checkbox" data-cfg-bool="videoUrl.enabled" checked> 可能生成视频 URL</label>
          </div>
        </div>`,
      status: _tplCheckboxes('status', STATUS, STATUS.slice(), 'allowed'),
      weight: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">最小(g)</span><input type="number" min="0" data-cfg-min="weight" value="100" style="width:42px">
            <span class="ug-sub-label">最大(g)</span><input type="number" min="0" data-cfg-max="weight" value="5000" style="width:42px">
          </div>
        </div>`,
      dimensions: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">最小(cm)</span><input type="number" min="0" data-cfg-min="dimensions" value="5" style="width:42px">
            <span class="ug-sub-label">最大(cm)</span><input type="number" min="0" data-cfg-max="dimensions" value="60" style="width:42px">
          </div>
        </div>`,
      isFreeShipping: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">包邮概率</span>
            <select data-cfg-simple="isFreeShipping.prob">
              <option value="1">100%</option>
              <option value="0.9">90%</option>
              <option value="0.7" selected>70%</option>
              <option value="0.5">50%</option>
              <option value="0.3">30%</option>
              <option value="0">0%</option>
            </select>
          </div>
        </div>`,
      brandName_custom: `
        <div class="ug-cfg-wrap">
          <div class="ug-cfg-row"><span class="ug-sub-label">自定义品牌（逗号分隔）</span></div>
          <textarea rows="2" data-cfg-simple="brandName.customText" placeholder="如：Apple, 小米, 华为" style="width:100%"></textarea>
        </div>`,
    };
    return tpls[id] || '';
  }

  function _tplRange(id, minLabel, maxLabel, defaultMin, defaultMax) {
    return `
      <div class="ug-cfg-wrap">
        <div class="ug-cfg-row">
          <span class="ug-sub-label">${minLabel}</span><input type="number" min="0" data-cfg-min="${id}" value="${defaultMin}" style="width:42px">
          <span class="ug-sub-label">${maxLabel}</span><input type="number" min="0" data-cfg-max="${id}" value="${defaultMax}" style="width:42px">
        </div>
      </div>`;
  }

  function _tplCheckboxes(id, pool, defaults, attr) {
    const selected = new Set(defaults);
    return `
      <div class="ug-cfg-wrap">
        <div class="ug-cfg-row"><span class="ug-sub-label">可选值（多选）</span></div>
        <div data-cfg-key="${id}.${attr}">
          ${pool.map((v, i) => `
            <label style="margin-right:8px;white-space:nowrap">
              <input type="checkbox" value="${v}" ${selected.has(v) ? 'checked' : ''}> ${v}
            </label>
          `).join('')}
        </div>
      </div>`;
  }

  function render(container) {
    const selected = _loadSelected();
    const keyLang = _loadKeyLang();
    container.innerHTML = `
      <div class="ug-wrap">
        <div class="lc-header">
          <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
        </div>
        <div class="ug-section">
          <div class="ug-cfg-row">
            <span class="ug-sub-label">Key 语言</span>
            <select id="pgKeyLang">
              <option value="zh" ${keyLang === 'zh' ? 'selected' : ''}>中文</option>
              <option value="en" ${keyLang === 'en' ? 'selected' : ''}>英文</option>
            </select>
            <span class="ug-sub-label" style="margin-left:16px">数量</span>
            <input type="number" min="1" max="500" id="pgCount" value="1" class="ug-count" style="width:60px;flex:none">
            <button id="pgGenBtn" class="btn" style="flex:none">生成</button>
          </div>
          <div class="ug-section-sub">
            <div class="ug-section-sub-title">📋 选择字段（${FIELDS.length} 项）</div>
            <div id="pgFieldGrid"></div>
          </div>
        </div>
        <div class="ug-section">
          <div class="ug-section-title">📝 生成结果</div>
          <div id="pgResult" class="ug-result"></div>
          <div class="ug-cfg-row">
            <button id="pgCopyJson" class="btn" style="flex:none;width:100px">复制 JSON</button>
            <button id="pgCopyYaml" class="btn" style="flex:none;width:100px">复制 YAML</button>
            <button id="pgCopyText" class="btn" style="flex:none;width:100px">复制文本</button>
            <button id="pgCopyAll" class="btn" style="flex:none;width:140px">复制全部</button>
          </div>
        </div>
      </div>
    `;
  }

  function mount(context) {
    const root = context.container;

    // ===== 渲染字段网格（按 group） =====
    const grid = root.querySelector('#pgFieldGrid');
    let html = '';
    GROUPS.forEach(group => {
      const gFields = FIELDS.filter(f => f.group === group);
      const cfgDefaultSelected = gFields.map(f => f.id);
      html += `<div class="ug-cat-group">`;
      html += `<div class="ug-cat-title">${gFields[0].groupName} <span class="ug-cat-count">${gFields.length}</span>
        <button type="button" data-group="${group}" data-action="all" class="ug-cat-btn">全选</button>
        <button type="button" data-group="${group}" data-action="none" class="ug-cat-btn">清空</button>
      </div>`;
      html += `<div class="ug-cat-grid">`;
      gFields.forEach(f => {
        const checked = selected.includes(f.id) ? 'checked' : '';
        const cfgHtml = _renderCfgRow(f);
        html += `<div class="ug-field-item">
          <label><input type="checkbox" class="pg-field-cb" value="${f.id}" data-group="${group}" ${checked}> ${f.zh} <span style="color:#888;font-size:11px">(${f.en})</span></label>
          ${cfgHtml}
        </div>`;
      });
      html += `</div></div>`;
    });
    grid.innerHTML = html;

    // ===== 事件绑定 =====
    // Key 语言
    root.querySelector('#pgKeyLang').addEventListener('change', e => {
      localStorage.setItem(`${NAME}_keyLang`, e.target.value);
    });

    // 字段选择
    root.querySelectorAll('.pg-field-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const allCbs = [...root.querySelectorAll('.pg-field-cb')];
        const v = allCbs.filter(x => x.checked).map(x => x.value);
        localStorage.setItem(`${NAME}_selected`, JSON.stringify(v));
      });
    });

    // 分组全选 / 清空
    root.querySelectorAll('.ug-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.group;
        const action = btn.dataset.action;
        root.querySelectorAll(`.pg-field-cb[data-group="${g}"]`).forEach(cb => {
          cb.checked = action === 'all';
        });
        root.querySelector(`.pg-field-cb`).dispatchEvent(new Event('change', { bubbles: true }));
        // 手动触发保存
        const allCbs = [...root.querySelectorAll('.pg-field-cb')];
        const v = allCbs.filter(x => x.checked).map(x => x.value);
        localStorage.setItem(`${NAME}_selected`, JSON.stringify(v));
      });
    });

    // ===== 通用 config 绑定 =====
    _bindCfgEvents(root);

    // 数量 clamp
    root.querySelector('#pgCount').addEventListener('input', function () {
      const v = parseInt(this.value) || 1;
      if (v > 500) { this.value = 500; }
      if (v < 1) { this.value = 1; }
    });

    // 生成按钮
    root.querySelector('#pgGenBtn').addEventListener('click', () => {
      _generate(root);
    });

    // 复制按钮
    root.querySelector('#pgCopyJson').addEventListener('click', () => _copyResult(root, 'json'));
    root.querySelector('#pgCopyYaml').addEventListener('click', () => _copyResult(root, 'yaml'));
    root.querySelector('#pgCopyText').addEventListener('click', () => _copyResult(root, 'text'));
    root.querySelector('#pgCopyAll').addEventListener('click', () => _copyResult(root, 'all'));

    // 首次渲染
    _generate(root);
  }

  function _bindCfgEvents(root) {
    // simple: 纯 input/select，直接写 cfg key
    root.querySelectorAll('[data-cfg-simple]').forEach(el => {
      const key = el.dataset.cfgSimple;
      const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
      // 尝试从 stored 恢复初始值
      try {
        let node = stored;
        for (const k of key.split('.')) { node = node?.[k]; }
        if (node !== undefined && el.tagName === 'SELECT') el.value = node;
        if (node !== undefined && el.tagName === 'INPUT') el.value = node;
        if (node !== undefined && el.tagName === 'TEXTAREA') el.value = node;
      } catch (e) {}
      el.addEventListener('change', () => {
        const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
        let node = stored;
        const parts = key.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
          node[parts[i]] = node[parts[i]] || {};
          node = node[parts[i]];
        }
        node[parts[parts.length - 1]] = el.value;
        localStorage.setItem(`${NAME}_cfg`, JSON.stringify(stored));
      });
    });
    // bool: checkbox
    root.querySelectorAll('[data-cfg-bool]').forEach(el => {
      const key = el.dataset.cfgBool;
      const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
      try { let n = stored; for (const k of key.split('.')) n = n?.[k]; if (n !== undefined) el.checked = !!n; } catch(e){}
      el.addEventListener('change', () => {
        const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
        let node = stored; const parts = key.split('.');
        for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
        node[parts[parts.length - 1]] = el.checked;
        localStorage.setItem(`${NAME}_cfg`, JSON.stringify(stored));
      });
    });
    // min / max: range pair
    ['min', 'max'].forEach(tag => {
      root.querySelectorAll(`[data-cfg-${tag}]`).forEach(el => {
        const baseKey = el.dataset[tag === 'min' ? 'cfgMin' : 'cfgMax'];
        const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
        try {
          const sub = baseKey === 'dimensions' ? '' : ''; // dimensions 共用 min/max
          const cfgKey = baseKey === 'dimensions' ? `dimensions${tag.charAt(0).toUpperCase()+tag.slice(1)}` : `${baseKey}${tag.charAt(0).toUpperCase()+tag.slice(1)}`;
          let n = stored; for (const k of cfgKey.split('.')) n = n?.[k];
          if (n !== undefined) el.value = n;
        } catch(e) {}
        el.addEventListener('change', () => {
          const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
          const cfgKey = baseKey === 'dimensions' ? `dimensions${tag.charAt(0).toUpperCase()+tag.slice(1)}` : `${baseKey}${tag.charAt(0).toUpperCase()+tag.slice(1)}`;
          let node = stored; const parts = cfgKey.split('.');
          for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
          node[parts[parts.length - 1]] = parseFloat(el.value) || 0;
          localStorage.setItem(`${NAME}_cfg`, JSON.stringify(stored));
        });
      });
    });
    // key: checkbox 多选
    root.querySelectorAll('[data-cfg-key]').forEach(container => {
      const key = container.dataset.cfgKey;
      const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
      const parts = key.split('.');
      let node = stored;
      for (let i = 0; i < parts.length - 1; i++) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
      const listKey = parts[parts.length - 1];
      const saved = node[listKey];
      if (Array.isArray(saved)) {
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = saved.includes(cb.value);
        });
      }
      container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const s = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
          let n = s; const p = key.split('.');
          for (let i = 0; i < p.length - 1; i++) { n[p[i]] = n[p[i]] || {}; n = n[p[i]]; }
          const vals = [...container.querySelectorAll('input[type="checkbox"]')].filter(x => x.checked).map(x => x.value);
          n[p[p.length - 1]] = vals;
          localStorage.setItem(`${NAME}_cfg`, JSON.stringify(s));
        });
      });
    });
  }

  function _loadSelected() {
    const saved = JSON.parse(localStorage.getItem(`${NAME}_selected`) || 'null');
    if (Array.isArray(saved) && saved.length > 0) return saved;
    // 默认：全部基础 + 类目 + 价格 + SKU + 主图 + 状态
    const defaults = [
      'spuId', 'name', 'brandName', 'productCode', 'summary',
      'cateIdL1', 'cateIdL2', 'cateIdL3', 'tagList',
      'marketPrice', 'salePrice', 'discount',
      'skuList',
      'mainImages', 'detailImages',
      'status',
      'weight', 'dimensions', 'isFreeShipping',
    ];
    return defaults;
  }

  function _loadCfg() {
    const stored = JSON.parse(localStorage.getItem(`${NAME}_cfg`) || '{}');
    // 合并 DEFAULT_CONFIG
    const merged = {};
    Object.keys(DEFAULT_CONFIG).forEach(k => {
      merged[k] = { ...DEFAULT_CONFIG[k] };
    });
    Object.keys(stored).forEach(k => {
      if (typeof stored[k] === 'object' && stored[k] !== null) {
        merged[k] = { ...(merged[k] || {}), ...stored[k] };
      }
    });
    return merged;
  }

  function _loadKeyLang() {
    return localStorage.getItem(`${NAME}_keyLang`) || 'zh';
  }

  function _generate(root) {
    try {
      const selected = _loadSelected();
      const cfg = _loadCfg();
      const keyLang = _loadKeyLang();
      const count = Math.max(1, Math.min(500, parseInt(root.querySelector('#pgCount').value) || 1));
      const data = [];
      for (let i = 0; i < count; i++) {
        const row = {};
        selected.forEach(id => {
          const g = GENERS[id];
          if (typeof g === 'function') {
            const fieldCfg = cfg[id] || DEFAULT_CONFIG[id] || {};
            try { row[id] = g(fieldCfg); } catch (e) { row[id] = null; }
          }
        });
        data.push(row);
      }
      _lastData = data;
      _lastSelected = selected;
      _lastKeyLang = keyLang;
      _renderResult(root);
      flashMessage(`✅ 已生成 ${count} 条商品数据`);
    } catch (e) {
      console.error('[product-generator] generate failed:', e);
      flashMessage(`❌ 生成失败：${e.message}`);
    }
  }

  let _lastData = [];
  let _lastSelected = [];
  let _lastKeyLang = 'zh';

  function _renderResult(root) {
    const result = root.querySelector('#pgResult');
    if (!_lastData.length) { result.innerHTML = '<div style="color:#888">请点击上方「生成」按钮</div>'; return; }
    // 只渲染第一条做预览，完整 JSON/YAML 用复制按钮
    const fmt = _lastKeyLang === 'zh'
      ? row => Object.fromEntries(_lastSelected.map(id => [FIELD_KEYS[id].zh, row[id]]))
      : row => Object.fromEntries(_lastSelected.map(id => [FIELD_KEYS[id].en, row[id]]));
    result.innerHTML = `<pre>${JSON.stringify(_lastData.map(fmt), null, 2)}</pre>`;
  }

  function _copyResult(root, fmt) {
    if (!_lastData.length) { flashMessage('请先生成数据'); return; }
    const rows = _lastData.map(row => Object.fromEntries(_lastSelected.map(id => [
      _lastKeyLang === 'zh' ? FIELD_KEYS[id].zh : FIELD_KEYS[id].en,
      row[id]
    ])));
    let text = '';
    if (fmt === 'json') text = JSON.stringify(rows, null, 2);
    else if (fmt === 'yaml') text = _toYaml(rows);
    else if (fmt === 'text') text = _toText(rows);
    else text = JSON.stringify(rows, null, 2) + '\n' + _toYaml(rows) + '\n' + _toText(rows);
    navigator.clipboard.writeText(text).then(() => flashMessage('✅ 已复制'));
  }

  function _toYaml(rows) {
    return rows.map(row => {
      return _objToYaml(row, 0);
    }).join('\n---\n');
  }

  function _objToYaml(obj, indent) {
    const pad = '  '.repeat(indent);
    return Object.entries(obj).map(([k, v]) => {
      if (v === null || v === undefined) return `${pad}${k}: null`;
      if (Array.isArray(v)) {
        if (!v.length) return `${pad}${k}: []`;
        return `${pad}${k}:\n` + v.map(item => {
          if (typeof item === 'object' && item !== null) {
            return `${pad}  -\n` + _objToYaml(item, indent + 2);
          }
          return `${pad}  - ${JSON.stringify(item)}`;
        }).join('\n');
      }
      if (typeof v === 'object') {
        const sub = _objToYaml(v, indent + 1);
        return `${pad}${k}:\n${sub}`;
      }
      return `${pad}${k}: ${JSON.stringify(v)}`;
    }).join('\n');
  }

  function _toText(rows) {
    return rows.map(row => {
      return Object.entries(row).map(([k, v]) => {
        const val = Array.isArray(v) ? JSON.stringify(v) : (typeof v === 'object' ? JSON.stringify(v) : v);
        return `${k}: ${val}`;
      }).join('\n');
    }).join('\n\n');
  }

  // ========== 注册 ==========
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount });
})();

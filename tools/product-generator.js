// tools/product-generator.js — 商品 & 电商信息随机生成（全局）
(function () {
  const flashMessage = window.MynaUtils?.flashMessage || (() => {});
  const NAME = 'product-generator';

  // ========== 工具函数 ==========
  const _r = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const _randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const _randFloat = (min, max, dec = 2) => {
    const v = Math.random() * (max - min) + min;
    return Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
  };
  const _pad = (n, len) => String(n).padStart(len, '0');

  // ========== 常量表 ==========
  const BRANDS = [
    '华为', '小米', '苹果', '三星', 'OPPO', 'vivo', '荣耀', '魅族', '一加', '锤子',
    '戴尔', '联想', '华硕', '宏碁', '惠普', 'ThinkPad', '机械革命', '拯救者', 'ROG',
    '耐克', '阿迪达斯', '李宁', '安踏', '特步', '匹克', '361°', '优衣库', 'ZARA', 'H&M',
    '欧莱雅', '雅诗兰黛', '兰蔻', '资生堂', 'SK-II', '屈臣氏', '理肤泉', '薇诺娜',
    '三只松鼠', '良品铺子', '百草味', '周黑鸭', '绝味', '卫龙',
    '美的', '格力', '海尔', '小天鹅', '方太', '老板', '博世', '西门子', '松下',
    '可口可乐', '百事', '农夫山泉', '康师傅', '统一', '伊利', '蒙牛',
    '迪士尼', '乐高', '万代', '小米有品', '网易严选', '拼多多', '淘宝心选',
    '宝马', '奔驰', '奥迪', '特斯拉', '比亚迪', '蔚来', '理想', '小鹏',
    '无品牌', 'OEM'
  ];

  const CATE_L1 = ['手机数码', '家用电器', '服饰鞋包', '美妆个护', '食品饮料', '母婴玩具', '家居家装', '运动户外', '汽车用品', '图书文娱', '办公文具', '宠物用品'];
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

  const TAGS = ['新品', '爆款', '热销', '包邮', '限时', '特价', '秒杀', '清仓', '满减', '套装', '预售', '定金', '尾款', '人气', '精选', '推荐', '自营', '旗舰店', '无理由', '保障'];
  const STATUS = ['草稿', '待审核', '已上架', '已下架', '审核驳回'];
  const FREIGHT_TEMPLATES = ['全国包邮模板', '偏远地区不包邮', '满 99 元包邮', '重量计费模板', '体积计费模板', '固定运费 10 元', '货到付款模板'];
  const COLOR_ATTRS = ['黑色', '白色', '红色', '蓝色', '灰色', '银色', '金色', '粉色', '紫色', '绿色', '棕色', '黄色', '藏青', '酒红', '卡其', '驼色', '军绿'];
  const SIZE_ATTRS_CLOTH = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '均码'];
  const SIZE_ATTRS_SHOE = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
  const SIZE_ATTRS_GENERAL = ['小号', '中号', '大号', '加大号', '特大号'];
  const MATERIAL_ATTRS = ['纯棉', '涤纶', '雪纺', '真丝', '羊毛', '皮革', 'PU', '牛仔', '亚麻', '莫代尔', '锦纶', '氨纶', '混纺', '铜氨丝', '蚕丝', '羊绒', '羽绒', '棉麻', '针织', '缎面'];
  const KW_ADJ = ['爆款', '精选', '热销', '时尚', '经典', '舒适', '透气', '轻薄', '耐磨', '防水', '智能', '便携', '静音', '节能', '环保', '高档', '轻奢', '大牌', '旗舰', '进口'];
  const KW_BODY = ['无线耳机', '智能手机', '机械键盘', '蓝牙音箱', '智能手表', '运动手环', '羽绒服', 'T恤', '连衣裙', '运动鞋', '帆布鞋', '双肩包', '拉杆箱', '爽肤水', '面膜', '精华液', '口红', '面霜', '香水', '电饭煲', '空气炸锅', '扫地机器人', '吹风机', '电动牙刷', '保温杯', '雨伞', '台灯', '笔记本支架', '鼠标垫', '零食大礼包', '坚果礼盒', '咖啡豆', '普洱茶', '橄榄油', '五常大米', '牛奶', '矿泉水', '乐高积木', '儿童绘本', '宠物粮', '猫砂', '狗粮', '猫粮'];

  function _genImageUrl() {
    // 真实电商 CDN 短路径（避免 JSON/YAML 里长链接撑满）
    const seed = Math.random().toString(36).slice(2, 8);
    const hosts = ['img.jd.com', 'img.alicdn.com', 'img.tmall.com', 'img.taobao.com', 'img.vip.com'];
    const paths = ['goods', 'product', 'item', 'upload', 'spu'];
    const exts = ['jpg', 'png', 'webp'];
    return `https://${_r(hosts)}/${_r(paths)}/${seed}.${_r(exts)}`;
  }
  function _genImages(n) {
    return Array.from({ length: _randInt(1, n) }, () => _genImageUrl());
  }

  // ========== Gen 函数 ==========
  function _genSpuId(cfg) {
    const mode = cfg.mode || 'normal';
    const len = cfg.len || 16;
    const prefix = cfg.prefix || '';
    if (mode === 'empty') return '';
    if (mode === 'tooLong') return 'A'.repeat(255);
    if (mode === 'chinese') return _r(['手机', '耳机', '电脑', '运动']);
    if (mode === 'special') return 'A@#B$%C';
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let s = prefix;
    for (let i = 0; i < Math.max(0, len - prefix.length); i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s.slice(0, 32);
  }
  function _genName(cfg) {
    const mode = cfg.mode || 'normal';
    if (mode === 'empty') return '';
    if (mode === 'superLong') return _r(KW_ADJ) + _r(BRANDS) + '牌' + _r(KW_BODY) + '旗舰典藏奢华至尊版·年度限定钜惠装';
    if (mode === 'specialChar') return `A<B>XSS' OR 1=1--`;
    if (mode === 'emoji') return '🎉🎁🔥💥⭐⭐⭐ ' + _r(KW_BODY);
    // 真实电商标题：品牌 + 商品类型 + 核心卖点/规格（淘宝/京东风格）
    const patterns = [
      () => `${_r(BRANDS)} ${_r(KW_BODY)} ${_r(['2024新款', '官方正品', '直营', '旗舰店', '热销'])}, ${_r(['顺丰包邮', '闪电发货', '假一赔十', '全国联保', '终身质保'])}`,
      () => `${_r(BRANDS)}【${_r(['旗舰', '爆款', '尊享', '经典', '限量'])}】${_r(KW_BODY)} ${_r(['轻薄便携', '智能降噪', '舒适透气', '持久续航', '高端定制'])}`,
      () => `${_r(KW_ADJ)}${_r(KW_BODY)} ${_r(['新品首发', '限时特惠', '满减活动', '年货节', '618大促'])}, ${_r(BRANDS)}品质保障`,
      () => `${_r(BRANDS)} ${_r(KW_ADJ)}${_r(KW_BODY)} ${_r(['4.9高分', '百万销量', '好评如潮', '回购率98%', '明星同款'])}`,
    ];
    return _r(patterns)();
  }
  function _genSubTitle() {
    const r = Math.random();
    if (r < 0.1) return '';
    if (r < 0.2) return '\n\n\n超长换行测试';
    // 真实电商副标题/卖点
    return _r([
      '官方旗舰店正品 · 假一赔十 · 限时特惠中',
      '顺丰包邮 · 24小时发货 · 7天无理由退换',
      '现货速发 · 品质保证 · 售后无忧',
      '旗舰店直营 · 支持开发票 · 享运费险',
      '厂家直供 · 一件也是批发价 · 终身质保',
      '全网销量第一 · 百万用户口碑之选',
    ]);
  }
  function _genProductCode() {
    // 真实电商编码：SPU/型号 + 年份 + 序号
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numChars = '0123456789';
    const prefix = _r(['SPU', 'SKU', 'P', 'M', '']);
    const year = new Date().getFullYear() - _randInt(0, 3);
    let model = '';
    for (let i = 0; i < _randInt(1, 3); i++) model += chars[Math.floor(Math.random() * chars.length)];
    let seq = '';
    for (let i = 0; i < _randInt(4, 6); i++) seq += numChars[Math.floor(Math.random() * numChars.length)];
    return `${prefix}${model}${year}${seq}`.trim();
  }
  function _genBrandName(cfg) {
    const mode = cfg.mode || 'normal';
    if (mode === 'empty') return '';
    if (mode === 'custom' && cfg.customText) {
      const pool = cfg.customText.split(/[,，\n]/).map(s => s.trim()).filter(Boolean);
      if (pool.length) return _r(pool);
    }
    if (mode === 'superLong') return 'A'.repeat(120);
    return _r(BRANDS);
  }
  function _genSummary(cfg) {
    if (cfg && cfg.allowInvalid) {
      const r = Math.random();
      if (r < 0.1) return '超长'.repeat(30);
      if (r < 0.2) return "'; DROP TABLE products;--";
    }
    return _r(KW_BODY) + '，品质保证，厂家直供，限时特惠。';
  }
  function _genDescription(cfg) {
    // 默认正常模式只生成真实电商详情 HTML；异常模式由 cfg.allowInvalid 开启
    if (cfg && cfg.allowInvalid) {
      const r = Math.random();
      if (r < 0.15) return '<script>alert(document.cookie)</script>';
      if (r < 0.25) return '';
      if (r < 0.35) return 'A'.repeat(5000);
    }
    // 图片用纯链接文本展示（Text/JSON/YAML 三种模式下一致，不会渲染成破图或 HTML 片段）
    const descImg = _genImageUrl();
    return `<p>${_r(KW_ADJ)}${_r(KW_BODY)}，${_r(KW_ADJ)}设计，${_r(['采用环保材料', '舒适透气', '经久耐用', '时尚百搭', '智能控制'])}</p>
图：${descImg}
<p>规格参数：颜色 ${_r(COLOR_ATTRS)}，材质 ${_r(MATERIAL_ATTRS)}</p>
<p>售后服务：7 天无理由退换，全国联保。</p>`;
  }
  function _genCateIds() {
    // 真实电商类目：L1 1-99, L2 101-999, L3 1001-9999 层级关联
    const l1 = _randInt(1, 99);
    const l2 = _randInt(l1 * 10 + 1, l1 * 10 + 99);
    const l3 = _randInt(l2 * 10 + 1, l2 * 10 + 99);
    return { l1, l2, l3, l1Name: _r(CATE_L1), l2Name: _r(CATE_L2_POOL), l3Name: _r(CATE_L3_POOL) };
  }
  function _genTagList() {
    const n = _randInt(1, 5);
    return [...TAGS].sort(() => Math.random() - 0.5).slice(0, n);
  }
  function _genMoney(min, max, allowInvalid) {
    // 默认正常模式下不注入异常值；异常模式由 cfg 开关开启
    if (allowInvalid) {
      const r = Math.random();
      if (r < 0.1) return 0;
      if (r < 0.2) return -99.99;
      if (r < 0.25) return 123456789.12;
      if (r < 0.28) return NaN;
    }
    return _randFloat(min, max, 2);
  }
  function _genMarketPrice(cfg) { return _genMoney(cfg.min || 100, cfg.max || 9999, cfg.allowInvalid); }
  function _genSalePrice(cfg) { return _genMoney(cfg.min || 100, cfg.max || 9999, cfg.allowInvalid); }
  function _genCostPrice(cfg) { return _genMoney(cfg.min || 50, cfg.max || 5000, cfg.allowInvalid); }
  function _genMemberPrice() { return _randFloat(50, 5000, 2); }
  function _genDiscount(cfg) {
    if (cfg.allowInvalid) {
      const r = Math.random();
      if (r < 0.15) return 0;
      if (r < 0.25) return -1;
      if (r < 0.3) return 12.5;
    }
    return _randFloat(cfg.min || 5.0, cfg.max || 9.9, 1);
  }
  function _genSkuList() {
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
  function _genMainImages(cfg) { return _genImages(_randInt(cfg.min || 3, cfg.max || 9)); }
  function _genDetailImages(cfg) { return _genImages(_randInt(cfg.min || 6, cfg.max || 50)); }
  function _genVideoUrl(cfg) {
    if (cfg.enabled === false) return '';
    if (Math.random() < 0.5) return '';
    const hosts = ['video.jd.com', 'video.alicdn.com', 'video.tmall.com'];
    const sid = Math.random().toString(36).slice(2, 8);
    return `https://${_r(hosts)}/video/${sid}.mp4`;
  }
  function _genStatus(cfg) { return _r(cfg.allowed || STATUS); }
  function _genOnlineTime() {
    const d = new Date(); d.setDate(d.getDate() + _randInt(-30, 30));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }
  function _genOfflineTime() {
    const d = new Date(); d.setDate(d.getDate() + _randInt(90, 365));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }
  function _genWeight(cfg) {
    return _randInt(cfg.min || 100, cfg.max || 5000);
  }
  function _genDimensions(cfg) {
    // 中文 key，展示时更友好
    return {
      长: _randInt(cfg.min || 5, cfg.max || 60),
      宽: _randInt(cfg.min || 5, cfg.max || 60),
      高: _randInt(cfg.min || 5, cfg.max || 60),
    };
  }
  function _genFreightTemplateId() {
    return _r(FREIGHT_TEMPLATES);
  }
  function _genIsFreeShipping(cfg) {
    // 中文输出：true→是, false→否
    const p = cfg.prob !== undefined ? parseFloat(cfg.prob) : 0.7;
    return Math.random() < p ? '是' : '否';
  }

  // ========== GENERS ==========
  const GENERS = {
    spuId: _genSpuId, name: _genName, subTitle: _genSubTitle, productCode: _genProductCode,
    brandName: _genBrandName, summary: _genSummary, description: _genDescription,
    cateIds: _genCateIds, tagList: _genTagList,
    marketPrice: _genMarketPrice, salePrice: _genSalePrice, costPrice: _genCostPrice,
    memberPrice: _genMemberPrice, discount: _genDiscount,
    skuList: _genSkuList,
    mainImages: _genMainImages, detailImages: _genDetailImages, videoUrl: _genVideoUrl,
    status: _genStatus, onlineTime: _genOnlineTime, offlineTime: _genOfflineTime,
    weight: _genWeight, dimensions: _genDimensions, freightTemplateId: _genFreightTemplateId,
    isFreeShipping: _genIsFreeShipping,
  };

  // ========== configUI 辅助模板（和 vehicle-generator 风格一致） ==========
  function _tplCheckboxes(name, options, selected) {
    const arr = Array.isArray(selected) ? selected : [];
    const set = new Set(arr);
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
    { id: 'basic', title: '📦 商品基础' },
    { id: 'category', title: '🏷️ 类目属性' },
    { id: 'price', title: '💰 价格' },
    { id: 'stock', title: '📊 库存 & SKU' },
    { id: 'media', title: '🖼️ 图文媒体' },
    { id: 'status', title: '📡 上下架状态' },
    { id: 'logistics', title: '🚚 物流规格' },
  ];

  // ========== 字段注册表（vehicle 风格：label + defaultSelected + configUI） ==========
  const FIELDS = [
    { id: 'spuId', group: 'basic', label: '商品ID', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">模式：</span>
          <select class="ug-input" style="flex:none;max-width:110px" data-cfg-simple="spuId_mode">
            <option value="normal" ${cfg.spuId_mode !== 'empty' && cfg.spuId_mode !== 'tooLong' && cfg.spuId_mode !== 'chinese' && cfg.spuId_mode !== 'special' ? 'selected' : ''}>正常</option>
            <option value="empty" ${cfg.spuId_mode === 'empty' ? 'selected' : ''}>空值</option>
            <option value="tooLong" ${cfg.spuId_mode === 'tooLong' ? 'selected' : ''}>超长</option>
            <option value="chinese" ${cfg.spuId_mode === 'chinese' ? 'selected' : ''}>中文</option>
            <option value="special" ${cfg.spuId_mode === 'special' ? 'selected' : ''}>特殊字符</option>
          </select>
        </div>
        <div class="ug-cfg-row"><span class="ug-sub-label">前缀：</span>
          <input type="text" class="ug-input" data-cfg-simple="spuId_prefix" value="${cfg.spuId_prefix || 'SPU'}">
        </div>
        <div class="ug-cfg-row"><span class="ug-sub-label">长度：</span>
          <select class="ug-input" style="flex:none;max-width:110px" data-cfg-simple="spuId_len" style="width:auto">
            <option value="8" ${cfg.spuId_len === '8' ? 'selected' : ''}>8位</option>
            <option value="12" ${cfg.spuId_len === '12' ? 'selected' : ''}>12位</option>
            <option value="16" ${cfg.spuId_len !== '8' && cfg.spuId_len !== '12' && cfg.spuId_len !== '24' && cfg.spuId_len !== '32' ? 'selected' : ''}>16位（默认）</option>
            <option value="24" ${cfg.spuId_len === '24' ? 'selected' : ''}>24位</option>
            <option value="32" ${cfg.spuId_len === '32' ? 'selected' : ''}>32位（最大）</option>
          </select>
        </div>`,
      gen: (ctx, cfg) => _genSpuId({ mode: cfg.spuId_mode, prefix: cfg.spuId_prefix, len: parseInt(cfg.spuId_len, 10) || 16 })
    },
    { id: 'name', group: 'basic', label: '商品名称', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">模式：</span>
          <select class="ug-input" style="flex:none;max-width:110px" data-cfg-simple="name_mode">
            <option value="normal" ${cfg.name_mode !== 'empty' && cfg.name_mode !== 'superLong' && cfg.name_mode !== 'specialChar' && cfg.name_mode !== 'emoji' ? 'selected' : ''}>正常</option>
            <option value="empty" ${cfg.name_mode === 'empty' ? 'selected' : ''}>空值</option>
            <option value="superLong" ${cfg.name_mode === 'superLong' ? 'selected' : ''}>超长</option>
            <option value="specialChar" ${cfg.name_mode === 'specialChar' ? 'selected' : ''}>XSS/SQL</option>
            <option value="emoji" ${cfg.name_mode === 'emoji' ? 'selected' : ''}>大量 emoji</option>
          </select>
        </div>`,
      gen: (ctx, cfg) => _genName({ mode: cfg.name_mode })
    },
    { id: 'subTitle', group: 'basic', label: '短标题', defaultSelected: false,
      gen: () => _genSubTitle() },
    { id: 'productCode', group: 'basic', label: '商品编码', defaultSelected: true,
      gen: () => _genProductCode() },
    { id: 'brandName', group: 'basic', label: '品牌名称', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">模式：</span>
          <select class="ug-input" style="flex:none;max-width:110px" data-cfg-simple="brand_mode">
            <option value="normal" ${cfg.brand_mode !== 'empty' && cfg.brand_mode !== 'superLong' && cfg.brand_mode !== 'custom' ? 'selected' : ''}>品牌池随机</option>
            <option value="empty" ${cfg.brand_mode === 'empty' ? 'selected' : ''}>空值</option>
            <option value="superLong" ${cfg.brand_mode === 'superLong' ? 'selected' : ''}>超长</option>
            <option value="custom" ${cfg.brand_mode === 'custom' ? 'selected' : ''}>自定义</option>
          </select>
        </div>
        <div class="ug-cfg-row"><span class="ug-sub-label">自定义(逗号分隔)：</span></div>
        ${_tplTextarea('brand_customText', cfg.brand_customText, '如: Apple, 小米')}`,
      gen: (ctx, cfg) => _genBrandName({ mode: cfg.brand_mode, customText: cfg.brand_customText })
    },
    { id: 'summary', group: 'basic', label: '商品简介', defaultSelected: false,
      gen: (ctx, cfg) => _genSummary(cfg) },
    { id: 'description', group: 'basic', label: '商品详情', defaultSelected: false,
      gen: (ctx, cfg) => _genDescription(cfg) },

    { id: 'cateIds', group: 'category', label: '类目(三级)', defaultSelected: true,
      gen: () => _genCateIds() },
    { id: 'tagList', group: 'category', label: '商品标签', defaultSelected: true,
      gen: () => _genTagList() },

    { id: 'marketPrice', group: 'price', label: '市场价', defaultSelected: true,
      configUI: (cfg) => _tplRange('marketPrice', cfg.marketPriceMin !== undefined ? cfg.marketPriceMin : 100, cfg.marketPriceMax !== undefined ? cfg.marketPriceMax : 9999, 0, 999999),
      gen: (ctx, cfg) => _genMoney(cfg.marketPriceMin !== undefined ? cfg.marketPriceMin : 100, cfg.marketPriceMax !== undefined ? cfg.marketPriceMax : 9999) },
    { id: 'salePrice', group: 'price', label: '销售价', defaultSelected: true,
      configUI: (cfg) => _tplRange('salePrice', cfg.salePriceMin !== undefined ? cfg.salePriceMin : 100, cfg.salePriceMax !== undefined ? cfg.salePriceMax : 9999, 0, 999999),
      gen: (ctx, cfg) => _genMoney(cfg.salePriceMin !== undefined ? cfg.salePriceMin : 100, cfg.salePriceMax !== undefined ? cfg.salePriceMax : 9999) },
    { id: 'costPrice', group: 'price', label: '成本价', defaultSelected: true,
      configUI: (cfg) => _tplRange('costPrice', cfg.costPriceMin !== undefined ? cfg.costPriceMin : 50, cfg.costPriceMax !== undefined ? cfg.costPriceMax : 5000, 0, 999999),
      gen: (ctx, cfg) => _genMoney(cfg.costPriceMin !== undefined ? cfg.costPriceMin : 50, cfg.costPriceMax !== undefined ? cfg.costPriceMax : 5000) },
    { id: 'memberPrice', group: 'price', label: '会员价', defaultSelected: false,
      gen: () => _genMemberPrice() },
    { id: 'discount', group: 'price', label: '折扣', defaultSelected: true,
      configUI: (cfg) => _tplRange('discount', cfg.discountMin !== undefined ? cfg.discountMin : 5, cfg.discountMax !== undefined ? cfg.discountMax : 9.9, 0, 12),
      gen: (ctx, cfg) => _genDiscount({ min: cfg.discountMin, max: cfg.discountMax }) },

    { id: 'skuList', group: 'stock', label: 'SKU 列表', defaultSelected: true,
      gen: () => _genSkuList() },

    { id: 'mainImages', group: 'media', label: '商品主图', defaultSelected: true,
      configUI: (cfg) => _tplRange('mainImages', cfg.mainImagesMin !== undefined ? cfg.mainImagesMin : 3, cfg.mainImagesMax !== undefined ? cfg.mainImagesMax : 9, 1, 50),
      gen: (ctx, cfg) => _genImages(_randInt(cfg.mainImagesMin !== undefined ? cfg.mainImagesMin : 3, cfg.mainImagesMax !== undefined ? cfg.mainImagesMax : 9)) },
    { id: 'detailImages', group: 'media', label: '详情图', defaultSelected: false,
      configUI: (cfg) => _tplRange('detailImages', cfg.detailImagesMin !== undefined ? cfg.detailImagesMin : 6, cfg.detailImagesMax !== undefined ? cfg.detailImagesMax : 50, 1, 100),
      gen: (ctx, cfg) => _genImages(_randInt(cfg.detailImagesMin !== undefined ? cfg.detailImagesMin : 6, cfg.detailImagesMax !== undefined ? cfg.detailImagesMax : 50)) },
    { id: 'videoUrl', group: 'media', label: '视频地址', defaultSelected: false,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><label><input type="checkbox" data-cfg-bool="videoUrl_enabled" ${cfg.videoUrl_enabled ? 'checked' : ''}> 可能生成视频 URL</label></div>`,
      gen: (ctx, cfg) => _genVideoUrl({ enabled: cfg.videoUrl_enabled }) },

    { id: 'status', group: 'status', label: '商品状态', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">可选值：</span></div>
        ${_tplCheckboxes('status_pool', STATUS, cfg.status_pool)}`,
      gen: (ctx, cfg) => _genStatus({ allowed: cfg.status_pool }) },
    { id: 'onlineTime', group: 'status', label: '上架时间', defaultSelected: true,
      gen: () => _genOnlineTime() },
    { id: 'offlineTime', group: 'status', label: '下架时间', defaultSelected: true,
      gen: () => _genOfflineTime() },

    { id: 'weight', group: 'logistics', label: '重量(g)', defaultSelected: true,
      configUI: (cfg) => _tplRange('weight', cfg.weightMin !== undefined ? cfg.weightMin : 100, cfg.weightMax !== undefined ? cfg.weightMax : 5000, 0, 99999),
      gen: (ctx, cfg) => _genWeight({ min: cfg.weightMin, max: cfg.weightMax }) },
    { id: 'dimensions', group: 'logistics', label: '长宽高(cm)', defaultSelected: true,
      configUI: (cfg) => _tplRange('dimensions', cfg.dimensionsMin !== undefined ? cfg.dimensionsMin : 5, cfg.dimensionsMax !== undefined ? cfg.dimensionsMax : 60, 0, 200),
      gen: (ctx, cfg) => _genDimensions({ min: cfg.dimensionsMin, max: cfg.dimensionsMax }) },
    { id: 'freightTemplateId', group: 'logistics', label: '运费模板', defaultSelected: false,
      gen: () => _genFreightTemplateId() },
    { id: 'isFreeShipping', group: 'logistics', label: '是否包邮', defaultSelected: true,
      configUI: (cfg) => `
        <div class="ug-cfg-row"><span class="ug-sub-label">包邮概率：</span>
          <select class="ug-input" style="flex:none;max-width:110px" data-cfg-simple="isFreeShipping_prob">
            <option value="1" ${cfg.isFreeShipping_prob === '1' ? 'selected' : ''}>100%</option>
            <option value="0.9" ${cfg.isFreeShipping_prob === '0.9' ? 'selected' : ''}>90%</option>
            <option value="0.7" ${cfg.isFreeShipping_prob === '0.7' || !cfg.isFreeShipping_prob ? 'selected' : ''}>70%</option>
            <option value="0.5" ${cfg.isFreeShipping_prob === '0.5' ? 'selected' : ''}>50%</option>
            <option value="0.3" ${cfg.isFreeShipping_prob === '0.3' ? 'selected' : ''}>30%</option>
            <option value="0" ${cfg.isFreeShipping_prob === '0' ? 'selected' : ''}>0%</option>
          </select>
        </div>`,
      gen: (ctx, cfg) => _genIsFreeShipping({ prob: parseFloat(cfg.isFreeShipping_prob) || 0.7 }) },
  ];

  // ========== FIELD_KEYS ==========
  const FIELD_KEYS = {};
  FIELDS.forEach(f => { FIELD_KEYS[f.id] = { zh: f.label, en: f.id }; });

  // ========== 渲染工具（和 vehicle-generator 完全一致） ==========
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
      name: '商品信息生成',
      desc: '商品 SPU/SKU 全字段随机生成，含异常数据场景',
      iconUrl: 'icons/product-generator.png',
      category: 'data-gen',
      categoryName: '数据工具',
    },
    fieldConfig: {
      keyLang: 'zh',
      spuId_mode: 'normal', spuId_prefix: 'SPU', spuId_len: 16,
      name_mode: 'normal',
      brand_mode: 'normal', brand_customText: '',
      marketPriceMin: 100, marketPriceMax: 9999,
      salePriceMin: 100, salePriceMax: 9999,
      costPriceMin: 50, costPriceMax: 5000,
      discountMin: 5.0, discountMax: 9.9,
      mainImagesMin: 3, mainImagesMax: 9,
      detailImagesMin: 6, detailImagesMax: 15,
      videoUrl_enabled: true,
      status_pool: STATUS.slice(),
      weightMin: 100, weightMax: 5000,
      dimensionsMin: 5, dimensionsMax: 60,
      isFreeShipping_prob: '0.7',
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
              <div class="ug-empty">点击「生成」按钮，生成商品信息 📦</div>
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
      // 1) 简单 select / input / textarea
      box.querySelectorAll('[data-cfg-simple]').forEach(el => {
        const key = el.dataset.cfgSimple;
        const v = this.fieldConfig[key];
        if (v !== undefined) el.value = v;
        el.addEventListener('change', () => { this.fieldConfig[key] = el.value; });
        if (el.tagName === 'TEXTAREA') el.addEventListener('input', () => { this.fieldConfig[key] = el.value; });
      });
      // 2) 多选 checkbox-group
      box.querySelectorAll('[data-cfg-key]').forEach(group => {
        const key = group.dataset.cfgKey;
        const sync = () => {
          const arr = Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
          this.fieldConfig[key] = arr;
        };
        const saved = this.fieldConfig[key];
        group.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          if (Array.isArray(saved)) cb.checked = saved.includes(cb.value);
          cb.addEventListener('change', sync);
        });
      });
      // 3) 数字范围（两个 input），Min/Max 后缀
      box.querySelectorAll('[data-cfg-min]').forEach(pair => {
        const key = pair.dataset.cfgMin;
        const inputs = pair.querySelectorAll('input[type="number"]');
        let minKey, maxKey;
        minKey = key + 'Min'; maxKey = key + 'Max';
        inputs[0].addEventListener('change', () => { this.fieldConfig[minKey] = parseFloat(inputs[0].value); });
        inputs[1].addEventListener('change', () => { this.fieldConfig[maxKey] = parseFloat(inputs[1].value); });
      });
      // 4) textarea（data-cfg-text）
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

    doGenerate(root) {
      const ids = this._getSelected(root);
      if (ids.length === 0) { flashMessage('请先选择至少一个字段', 'warn'); return; }
      const count = Math.max(1, Math.min(500, parseInt(root.querySelector('#ugCount').value) || 1));

      const results = [];
      for (let i = 0; i < count; i++) {
        const ctx = { ...this.fieldConfig };
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
        box.innerHTML = '<div class="ug-empty">点击「生成」按钮，生成商品信息 📦</div>';
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

# MynaTest

基于 Chrome Manifest V3 的测试辅助工具集，专为 Web 测试人员打造。可在设置页自主选择启用哪些工具，侧边栏形式随时可用。

[![GitHub](https://img.shields.io/badge/GitHub-tynam--yang%2Fmynatest-blue?logo=github)](https://github.com/tynam-yang/mynatest)

## 快速开始

加载扩展、侧边栏使用、设置页等详见下方「操作指南」章节。

> 注意：**扩展重载后需刷新目标网页**，否则旧页面的捕获脚本已失效（会提示刷新）。

## 操作指南

### 加载扩展

1. 打开 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择本项目根目录
4. 点击扩展图标打开侧边栏

### 侧边栏使用

- 侧边栏位于浏览器右侧，点击工具图标切换当前工具
- **拖动排序**：按住图标上下拖动可调整顺序，松手后自动保存
- **悬停提示**：鼠标悬停在图标上会显示工具名称
- 底部齿轮图标打开设置页

### 设置页

- 扩展图标右键 → **选项** 进入设置页
- 勾选启用需要的工具，保存后侧边栏立即生效
- 工具按「网络工具 / 开发工具」分组展示

## 项目结构

```
mynatest/
├── manifest.json                   # MV3 清单（content_scripts 声明式注入 MAIN/ISOLATED world）
├── background.js                   # Service Worker：侧栏 + Port 中转 + 截图
├── sidepanel.html/css/js           # 侧边栏 UI 框架
├── options.html/css/js             # 设置页（Tab 式，按分类管理工具）
├── core/                           # 共享核心模块（全局脚本，挂 window）
│   ├── storage.js                 # chrome.storage 封装 + 启用工具管理
│   ├── diff.js                    # diffJSON / diffLines / parseJSONRobust
│   └── utils.js                   # escapeHtml / flashMessage
├── content/                        # ⭐ Content Scripts（注入页面，manifest 声明式）
│   ├── injected.js                # MAIN world：hook fetch/XHR，捕获请求/响应
│   ├── content.js                 # ISOLATED world：Port 长连接转发
│   ├── env-banner-content.js      # 环境横幅：域名匹配 + 顶部横幅注入
│   ├── bug-report-content.js      # Bug 报告：框选 + Canvas 标注 + 环境采集
│   ├── mock-interceptor-main.js   # Mock：MAIN world 独立 hook fetch/XHR
│   ├── mock-interceptor-bridge.js # Mock：ISOLATED world 读 storage → postMessage 下发配置
│   └── snapshot-picker.js         # 快照：元素选择器 + 自动比对 + DOM 徽章
├── tools/                          # ⭐ 所有工具集中在这里（全局 IIFE 自注册）
│   ├── request-diff.js            # 请求对比
│   ├── stress-test.js             # 轻量压测
│   ├── timestamp.js               # 时间戳转换
│   ├── json-formatter.js          # JSON 格式化
│   ├── data-diff.js               # 数据对比
│   ├── storage-manager.js         # Cookie/Storage 管理
│   ├── jwt-parser.js              # JWT 解析
│   ├── regex-tester.js            # 正则测试
│   ├── env-banner.js              # 测试环境横幅
│   ├── bug-report.js              # Bug 报告助手
│   ├── mock-interceptor.js        # 接口 Mock 拦截器
│   ├── link-checker.js            # 链接可用性检查
│   ├── snapshot-diff.js           # 元素快照对比
│   ├── ip-generator.js            # IP 地址生成 + 本机 IP
│   ├── ua-generator.js            # User-Agent 随机生成 + 本机 UA
│   ├── user-generator.js          # 用户信息随机生成（55 字段可选 · 9 分类 · 文本/JSON/YAML 导出）
│   ├── file-generator.js          # 文件生成（自定义大小/类型/二进制 · 自动下载）
│   ├── vehicle-generator.js       # 车辆信息随机生成（33 字段 · 5 分类）
│   ├── contract-generator.js      # 合同 & 票据信息随机生成（32 字段 · 6 分类）
│   ├── code-generator.js          # 请求转代码（cURL/fetch/axios/Python requests/Playwright）
│   ├── web-vitals.js              # 性能面板（LCP/CLS/INP · 慢请求 · 资源瀑布图 · 大小分布）
│   ├── selector-generator.js      # 选择器生成（CSS/XPath/Playwright · 唯一性校验）
│   ├── resource-checker.js         # 资源检查（图片/JS/CSS/字体 加载失败检测）
│   ├── screen-capture.js           # 截图 & 录屏（可视/全页截图 · getDisplayMedia 录屏）
│   ├── table-export.js             # 表格导出（页面表格转 CSV/Excel/JSON · 复制）
│   ├── checklist.js                # 测试检查清单（发布前 checklist · 自定义项 · Markdown 导出）
│   ├── snippet-manager.js          # 脚本片段管理（常用注入脚本 · 一键执行 · 自定义脚本）
│   ├── api-docs.js                 # 接口文档生成（捕获请求 → Markdown / OpenAPI 3.0）
│   ├── keyboard-nav.js             # 键盘导航测试（焦点链扫描 · Enter/Space/Esc/Tab 行为监控）
│   ├── timing-breakdown.js         # 请求耗时分解（DNS/TCP/TLS/TTFB/下载 各阶段明细）
│   └── upload-audit.js             # 上传漏洞辅助（绕过载荷 · polyglot · 大小边界 · 检查清单）
├── icons/                          # 工具图标（16×16 PNG）
├── assets/                         # 静态资源（收款码等）
```

## 现有工具

<table>
<colgroup>
  <col>
  <col style="width:5em;white-space:nowrap">
  <col style="word-break:break-word">
</colgroup>
<tr><th>工具</th><th>分类</th><th>说明</th></tr>
<tr><td><b>请求对比</b></td><td>网络工具</td><td>捕获两次接口响应 → 自动 diff（JSON 路径级 / 行级文本）</td></tr>
<tr><td><b>轻量压测</b></td><td>网络工具</td><td>捕获接口一键填入；数据统计、响应断言、响应查看、报告下载</td></tr>
<tr><td><b>JWT 解析</b></td><td>网络工具</td><td>解码 JWT 的 Header / Payload</td></tr>
<tr><td><b>请求转代码</b></td><td>网络工具</td><td>捕获请求一键生成 cURL、fetch、axios、Python requests、Playwright</td></tr>
<tr><td><b>性能面板</b></td><td>网络工具</td><td>LCP/CLS/INP 实时监控；慢请求 TOP 10；资源瀑布图（DNS/TCP/TTFB/Download 分段）；资源大小按类型分布</td></tr>
<tr><td><b>选择器生成</b></td><td>测试工具</td><td>点击页面元素生成 CSS / XPath / Playwright 选择器；自动校验唯一性；逐级增强直到唯一</td></tr>
<tr><td><b>资源检查</b></td><td>测试工具</td><td>检测页面中图片/JS/CSS/字体的加载失败（404 等）；capture-phase error 监听 + PerformanceObserver 补充 + document.fonts</td></tr>
<tr><td><b>截图 & 录屏</b></td><td>开发工具</td><td>可见区域截图（captureVisibleTab）+ 全页截图（chrome.debugger Page.captureScreenshot）+ 录屏（getDisplayMedia + MediaRecorder）</td></tr>
<tr><td><b>表格导出</b></td><td>数据工具</td><td>扫描页面所有 &lt;table&gt;，逐个导出 CSV（UTF-8 BOM）/ Excel / JSON（表头自动识别为对象键）；支持一键复制</td></tr>
<tr><td><b>测试检查清单</b></td><td>测试工具</td><td>发布前 checklist：内置 7 组 24 项模板（功能/接口/兼容/安全/性能/上线/文档）；所有清单项支持行内编辑与删除（含内置项，持久化）；自定义项添加；进度条跟踪；一键复制 Markdown</td></tr>
<tr><td><b>脚本片段</b></td><td>开发工具</td><td>常用注入脚本管理：内置 8 个预设（解除右键/复制限制、显示边框、密码明文、禁用 CSS、图片信息、灰阶、加载耗时、超大图高亮）；一键注入执行（MAIN world eval）并回显返回值；自定义脚本增删改（持久化）</td></tr>
<tr><td><b>接口文档生成</b></td><td>网络工具</td><td>实时捕获接口请求（去重聚合），勾选后一键生成 Markdown 文档（Query/请求头/请求体/响应头）或 OpenAPI 3.0 JSON（自动推导 schema，可直接导入 Swagger/Apifox）；支持复制与下载</td></tr>
<tr><td><b>键盘导航测试</b></td><td>测试工具</td><td>扫描页面全部可聚焦元素（标记无 aria-label/text 名称、tabindex&gt;0 等可访问性问题）；开启监控后实时记录 Tab/Enter/Space/Esc 按键行为、目标元素与默认动作是否被 preventDefault 拦截</td></tr>
<tr><td><b>请求耗时分解</b></td><td>网络工具</td><td>基于 Performance API 分解每个请求的 DNS / TCP / TLS / TTFB / 内容下载各阶段耗时；彩色分段条可视化、总量占比条、均值与最慢请求摘要、全列排序；含文档导航时序</td></tr>
<tr><td><b>上传漏洞辅助</b></td><td>测试工具</td><td>文件上传测试辅助：12 种文件名/扩展名绕过清单（双扩展、大小写、截断、路径穿越等）一键复制；GIF/SVG/HTML polyglot 载荷生成下载；10 项上传点安全检查清单（仅授权测试）</td></tr>
<tr><td><b>时间戳转换</b></td><td>开发工具</td><td>时间与时间戳互转，支持秒/毫秒级</td></tr>
<tr><td><b>JSON 格式化</b></td><td>开发工具</td><td>格式化 / 压缩 / 转义 / 反转义</td></tr>
<tr><td><b>数据对比</b></td><td>开发工具</td><td>JSON / 文本行级 diff</td></tr>
<tr><td><b>Cookie/Storage 管理</b></td><td>开发工具</td><td>登录态快照切换</td></tr>
<tr><td><b>正则测试</b></td><td>开发工具</td><td>实时匹配结果，内置邮箱/手机号/IP 等 18 个常用正则速查</td></tr>
<tr><td><b>环境横幅</b></td><td>开发工具</td><td>域名规则匹配 + 页面顶部彩色横幅，防误操作生产</td></tr>
<tr><td><b>Mock 拦截器</b></td><td>测试工具</td><td>拦截指定 URL 返回自定义响应；多套场景一键切换</td></tr>
<tr><td><b>链接检查</b></td><td>测试工具</td><td>批量扫描页面 a 标签，校验可访问性与跳转地址</td></tr>
<tr><td><b>快照对比</b></td><td>测试工具</td><td>捕获元素基准图，自动像素比对 UI 变更；差异高亮红色标注</td></tr>
<tr><td><b>IP 地址生成</b></td><td>数据生成</td><td>随机生成 IPv4/IPv6；显示本机内外网 IP</td></tr>
<tr><td><b>UA 生成</b></td><td>数据生成</td><td>随机生成 User-Agent（多浏览器 × 多平台）；显示本机当前 UA</td></tr>
<tr><td><b>用户信息生成</b></td><td>数据生成</td><td>55 字段数据；支持文本/JSON/YAML 导出</td></tr>
<tr><td><b>文件生成</b></td><td>数据生成</td><td>自定义文件（文本/二进制/BMP）；生成后自动下载</td></tr>
<tr><td><b>车辆信息生成</b></td><td>数据生成</td><td>33 字段车辆信息；支持畸形车牌/异常 VIN/违章记录/驾驶证信息</td></tr>
<tr><td><b>合同票据生成</b></td><td>数据生成</td><td>32 字段合同票据</td></tr>
</table>

## 新增工具（插件化）

工具以**全局脚本（IIFE）**形式自注册到 `window.MynaTools`。
⚠️ 不要使用 ES modules —— `<script type="module">` 在 Side Panel 中会静默失败。

### 第 1 步：在 `tools/` 下创建新模块

```js
// tools/my-tool.js
(function () {
  const flashMessage = window.MynaUtils.flashMessage;

  const meta = {
    id: 'my-tool',
    name: '我的工具',
    desc: '一句话描述',
    iconUrl: 'icons/my-tool.png',      // PNG 图标（侧边栏/设置页统一使用）
    category: 'dev',                   // 分类 key
    categoryName: '开发工具'            // 分类显示名（设置页按此分组）
  };

  function render(container) {
    container.innerHTML = `
      <h2><img src="${meta.iconUrl}" alt=""> ${meta.name}</h2>
      <button class="btn" id="btn">点我</button>
    `;
  }

  function mount(context) {
    context.container.querySelector('#btn')?.addEventListener('click', () => {
      flashMessage('Hello!');
    });
    // 订阅捕获的网络请求
    const off = context.events.on('network:request', (payload) => { /* ... */ });
    return () => off();  // 可选：返回 cleanup 函数
  }

  // 注册到全局，侧边栏与设置页自动出现
  window.MynaTools = window.MynaTools || [];
  window.MynaTools.push({ meta, render, mount });
})();
```

### 第 2 步：在两个 HTML 里各加一行 script

```html
<!-- sidepanel.html 和 options.html 的 <body> 末尾，必须在 sidepanel.js / options.js 之前 -->
<script src="tools/my-tool.js"></script>
```

完成！侧边栏和设置页自动多出对应图标和勾选项。

### 工具接口

| 字段 | 必填 | 说明 |
|------|------|------|
| `meta` | ✅ | `{ id, name, desc, icon, iconUrl, category, categoryName }` |
| `render(container)` | ✅ | 往 container DOM 填 HTML |
| `mount(context)` | ✅ | 绑定事件 / 订阅总线；可返回 cleanup 函数 |
| `cleanup()` | ❌ | 预留 |

mount 的 `context`：

```js
{
  container,         // HTMLElement — 工具根 DOM
  events: {
    on(event, fn)     // 订阅事件，返回取消函数
    emit(event, payload)
  }
}
```

### 可用事件

| 事件 | payload |
|------|---------|
| `network:request` | `{ url, method, status, duration, success, requestHeaders, responseHeaders, requestBody, responseBody, timestamp }` |

> `url` 已归一化为绝对地址（`new URL(u, location.href)`），可直接用于压测重放。

## 架构

```
页面 fetch/XHR（MAIN world，injected.js hook，manifest content_scripts 声明注入 @document_start）
        ↓ window.postMessage
content.js（ISOLATED world）── Port 'content-relay' ──→ background.js
        ↓                                   （缓冲最近 100 条请求）
background.js ── Port 'sidepanel' 广播 ──→ sidepanel.js（eventBus）──→ 各 tool.mount() 订阅
```

链路的健壮性设计：

- **MV3 Service Worker 约 30 秒空闲即挂起**，Port 随之断开：sidepanel 断线后 1 秒自动重连；断线期间的请求由 background 缓冲，重连时自动回放，不丢消息
- **content.js Port 断开自动重连**（SW 被唤醒后是新实例）
- **扩展重载后的旧页面**：chrome 上下文已失效，content.js 只警告一次并提示刷新页面；sidepanel 保留 `chrome.storage.onChanged` 兜底通道兼容旧脚本
- **为什么 hook MAIN world？** MV3 的 `chrome.webRequest` 拿不到 response body，注入 MAIN world 脚本才能完整劫持 fetch/XHR（通过 manifest `content_scripts` 的 `world: "MAIN"` 声明注入，非 `executeScript`）
- **XHR 只监听 `loadend`**：它覆盖 success / error / abort 所有终止状态，避免错误场景重复上报
- **fetch 被页面覆盖时自动重新 hook**（每秒巡检标记位）
- **控制台保持干净**：仅保留必要的失败告警（如"扩展已重载，请刷新页面"）

## 权限

| 权限 | 用途 |
|------|------|
| `storage` | 持久化启用的工具列表 + 捕获消息兜底通道 + Storage 管理登录态快照 |
| `sidePanel` | 打开侧边栏 |
| `scripting` | Cookie/Storage 管理器注入 MAIN world 读写 localStorage/sessionStorage |
| `activeTab` | 获取当前标签页 URL |
| `cookies` | Cookie/Storage 管理器读写 Cookie |
| `tabs` | 查询活动标签页 URL 和 ID |
| `<all_urls>` | host_permissions — 声明式注入捕获脚本 + 压测工具直接 fetch 任意 URL（绕过 CORS） + Storage 管理注入 |

## License

MIT



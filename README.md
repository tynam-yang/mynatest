# MynaTest

基于 Chrome Manifest V3 的测试辅助工具集，专为 Web 测试人员打造。可在设置页自主选择启用哪些工具，侧边栏形式随时可用。

## 快速开始

1. 打开 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**，选择本项目根目录
4. 点击扩展图标打开侧边栏

> 注意：**扩展重载后需刷新目标网页**，否则旧页面的捕获脚本已失效（会提示刷新）。

## 项目结构

```
mynatest/
├── manifest.json           # MV3 清单（content_scripts 声明式注入 MAIN/ISOLATED world）
├── background.js           # Service Worker：打开侧边栏 + Port 消息中转与缓冲
├── content.js              # ISOLATED world：Port 长连接，转发页面捕获的请求
├── injected.js             # MAIN world：hook fetch/XHR，捕获请求/响应
├── icons/                  # 扩展与工具图标（16×16 PNG）
│
├── core/                   # 共享核心模块（全局脚本，挂 window）
│   ├── storage.js          # chrome.storage 封装 + 启用工具管理
│   ├── diff.js             # diffJSON / diffLines / parseJSONRobust
│   └── utils.js            # escapeHtml / flashMessage
│
├── tools/                  # ⭐ 所有工具集中在这里（每个文件自注册）
│   ├── request-diff.js     # 请求对比
│   ├── stress-test.js      # 轻量压测（次数×并发 / 断言 / Markdown 报告）
│   ├── timestamp.js        # 时间戳转换
│   ├── json-formatter.js   # JSON 格式化
│   ├── jwt-parser.js       # JWT 解析
│   └── regex-tester.js     # 正则测试（含常用正则速查）
│
├── sidepanel.html/css/js   # 侧边栏 UI 框架
├── options.html/css/js     # 设置页（Tab 式，按分类管理工具）
└── README.md
```

## 现有工具

| 工具 | 分类 | 说明 |
|------|------|------|
| **请求对比** | 网络工具 | 捕获两次接口响应 → 自动 diff（JSON 路径级 / 行级文本） |
| **轻量压测** | 网络工具 | 捕获接口一键填入；总请求数 = 次数 × 并发（按轮同步发送）；统计总耗时/成功率/平均/最小/最大/P50/P90/P99/断言通过率/RPS；支持响应断言（status / JSONPath / body contains / header contains）；响应体可展开查看；生成 Markdown 报告下载 |
| **JWT 解析** | 网络工具 | 解码 JWT 的 Header / Payload |
| **时间戳转换** | 开发工具 | 时间与时间戳互转，支持秒/毫秒级 |
| **JSON 格式化** | 开发工具 | 格式化 / 压缩 / 转义 / 反转义 |
| **正则测试** | 开发工具 | 实时匹配结果，内置邮箱/手机号/IP 等 18 个常用正则速查 |

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
| `storage` | 持久化启用的工具列表 + 捕获消息兜底通道 |
| `sidePanel` | 打开侧边栏 |
| `scripting` | 预留（当前注入由 manifest `content_scripts` 声明完成） |
| `activeTab` | 预留 |
| `<all_urls>` | host_permissions — 声明式注入捕获脚本 + 压测工具直接 fetch 任意 URL（绕过 CORS） |

## License

MIT

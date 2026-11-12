+++
title = "把 Lean 4 塞进浏览器：Lean Init IDE 介绍"
date = 2026-11-13T03:00:00+08:00
draft = false
tags = ["Lean 4", "WebAssembly", "TypeScript", "Cloudflare"]
categories = ["项目"]
author = "安卓人"
description = "Lean Init IDE 是一个不用安装工具链的 Lean 4 学习环境：真实语言服务器跑在 Web Worker 里，102MB 运行时按需分发，打开网页就能写证明。"
+++

学 Lean 的第一道门槛，往往不是证明本身，而是环境。

装 elan、配 Lake、拉 Mathlib，再等编辑器把 language server 启动起来——这套流程对熟悉工具链的人不算什么，但对只是想试试“命题即类型”到底是什么意思的人，成本太高了。于是就有了 [Lean Init IDE](https://github.com/3y3y3y-huaiji/lean-init-ide)：一个跑在浏览器里的 Lean 4 学习环境，打开网页就能写证明、看诊断、看 Goal，不需要安装任何东西。

在线地址是 [criticalthinking.de5.net](https://criticalthinking.de5.net)，备用地址 [lean-init-ide.pages.dev](https://lean-init-ide.pages.dev)。

## 它到底是什么

一句话：Monaco 编辑器加上真正运行在 Web Worker 里的 Lean 4.34.1 语言服务器。

不是语法高亮玩具，也不是把代码发到服务器上编译的在线沙箱。Lean 的 Init 运行时被编译成 WebAssembly，language server 在浏览器里完成解析、精化和诊断，代码不会上传，也没有应用后端。页面、课程和编辑器都是静态资源，Cloudflare Pages Functions 只负责资产网关和运行指标接收。

适合三类人：

- 想试试 Lean、但不想装 elan / Lake / Mathlib 的人；
- 课堂上要给学生演示“命题即类型”的老师；
- 想研究“语言服务器能不能跑在浏览器里”的开发者。

## 打开之后能做什么

编辑器该有的都有：诊断、Goal 面板、悬停、补全、跳转定义。Lean 的 Unicode 缩写也做了——输入 `\to`、`\forall`，按空格或 Tab 就会展开成 `→`、`∀`，不用去查符号表。

课程一共 21 节，分两条路径。入门路径 9 节，从 `#check`、`#eval` 开始，讲蕴含、与或、归纳、改写、`simp`、量词和 List；数学与验证路径 12 节，从整除、奇偶、最大公约数一路走到素数、集合、函数、等价关系、强归纳，最后用插入排序和递归求和做正确性证明，收尾讨论公理、`sorry` 和从 Init 到 Mathlib 的差距。

每节课有 2–4 个可运行代码块和一个练习，练习可以带着 starter 直接跳到编辑器。草稿存在本机，刷新不丢，也能一键导出 `.lean` 文件。

界面支持中英文切换，`/zh/`、`/en/` 双前缀，主题有亮色、暗色和跟随系统，Monaco 会跟着同步。

## 技术上最有意思的两件事

**第一件：语言服务器真的在浏览器里跑。**

应用层、语言层、资产层三层之间只通过明确的接口通信。Monaco 负责编辑体验，`@wasm-idle/lsp` 在 Web Worker 里跑 Lean 4.34.1，LSP 消息走 `postMessage`。用户输入后 350ms 防抖触发 `didChange`，诊断通过 `publishDiagnostics` 回到编辑器；光标移动后 250ms 防抖请求 `$/lean/plainGoal`，Goal 面板据此更新。

**第二件：102MB 的运行时怎么送到浏览器。**

Lean 的 Init 资产压缩后大约 102MB，直接让浏览器跨源下载体验会很糟。这里的做法是：资产放在 R2，浏览器只请求站点自己的域名，由 Pages Functions 的 `/cdn/<key>` 通过 R2 binding 在 Cloudflare 内网读取。Service Worker 按 4MB 分片并行下载，每个分片都做 SHA-256 校验，组装后再用同源的 zstd 解码器解压。

主源不可用时会依次回退到魔搭镜像和同源静态副本。首次访问需要下载运行时，之后走浏览器持久缓存，二次进入通常 4–7 秒可用。低内存设备（`navigator.deviceMemory ≤ 4`）不会自动下载，需要手动点“启动 Lean”；持久缓存上限也会从 512MB 降到 128MB。如果只想读课程，完全不用启动引擎。

## 边界也要说清楚

项目只内置 Init，不含 Std、Lean、Lake 和 Mathlib，所以课程内容限定在基础类型、List 和命题逻辑，不会假装能替代完整的 Lean 环境。

另外它依赖 cross-origin isolation 和 SharedArrayBuffer，Chromium 系浏览器体验最佳。这也是“把语言服务器搬进浏览器”绕不开的代价。

隐私方面，运行指标不包含 cookie、用户代码或设备指纹，可以在浏览器开启 Do Not Track 退出；页面浏览和 Core Web Vitals 由 Cloudflare Web Analytics 统计。

## 想自己跑或者改

```bash
pnpm install         # 安装依赖并应用 @wasm-idle/lsp 补丁
pnpm run dev         # 开发服务器，首次会下载并校验运行时
pnpm run build:web   # 只构建前端，跳过 102MB 资产
pnpm test            # Vitest + 覆盖率阈值
pnpm run smoke       # 线上冒烟
```

仓库里 `AGENTS.md` 写了硬约束、模块边界和已知陷阱，`docs/ARCHITECTURE.md` 讲三层架构和运行时分发，`docs/DEVELOPMENT.md` 与 `docs/OPERATIONS.md` 分别覆盖本地门禁和部署排查。

许可证是双协议，Apache-2.0 和木兰宽松许可证第 2 版任选其一。

## 最后

这个项目想解决的不是“Lean 难学”，而是“Lean 难开始”。把工具链的门槛拿掉之后，剩下的就只是证明本身了——而这部分，本来就该由学习者自己面对。

仓库在这里：[3y3y3y-huaiji/lean-init-ide](https://github.com/3y3y3y-huaiji/lean-init-ide)。如果它帮你省下了一次装环境的时间，目的就达到了。

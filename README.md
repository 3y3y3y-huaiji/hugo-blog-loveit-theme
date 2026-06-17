# 🤖 AI-Blog-Pulse | 全自动 AI 驱动的科技前沿博客

[![Hugo Version](https://img.shields.io/badge/Hugo-v0.163.2--extended-blue.svg?style=flat-down)](https://gohugo.io/)
[![Theme LoveIt](https://img.shields.io/badge/Theme-LoveIt--v0.3.1-orange.svg)](https://github.com/dillonzq/LoveIt)
[![License MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![AI Engine](https://img.shields.io/badge/AI--Engine-NVIDIA--NIM-blueviolet.svg)](https://build.nvidia.com)
[![Build Status](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/actions/workflows/gh-pages.yml/badge.svg)](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/actions)

> 💡 **这是一个全自动运行、智能撰写、零人工干预的科技博客站。** 
> 
> 本项目基于 **Hugo (Extended)** 静态站点生成器和重构版 **LoveIt v0.3.1** 主题，通过对接 **NVIDIA API Catalog** 大模型资源池与主流科技媒体 **RSS 订阅源**，实现每日自动追踪全球科技热点、自主撰写深度技术分析博文，并全自动编译部署发布。

---

## 🌟 核心功能特性

* **🤖 多模型智能撰写**：内置 5 大国产与开源顶尖模型资源池，每次随机指派。
  * `DeepSeek V4 Pro` / `Kimi K2.6` / `MiniMax M3` / `GLM 5.1` / `Gemma 4 31B`
* **📡 动态热点抓取**：实时读取少数派（SSPAI）、Solidot 奇客、Hacker News、TechCrunch 等优质科技 RSS 订阅源，自动追踪当日最火科技动态。
* **🛡️ 工业级容灾弹性（Model Fallback）**：具备自动防挂死及多模型轮询回退逻辑。若首选模型响应超时（设定 2 分钟）或报错，脚本将自动秒级切换至备用模型，保证流水线 100% 成功。
* **⚡ 优美的主题与极致性能**：
  * 主题升级至 **LoveIt v0.3.1**，采用 TypeScript 核心重写并自动 Babel 编译。
  * 内置 **FlexSearch** 搜索引擎，支持毫秒级本地全文快速搜索。
  * 完美适配暗色/浅色模式、Mermaid 时序图绘制、移动端自适应。

---

## 📂 项目结构

```text
hugo-blog-loveit-theme/
├── .github/
│   └── workflows/
│       ├── ai-blog-cron.yml  # 定时 AI 撰写工作流（已移除 skip-ci 限制）
│       └── gh-pages.yml      # 自动编译与 Pages 部署工作流
├── content/
│   ├── about/
│   │   └── index.md          # “关于”页面（包含 Mermaid 时序流程图）
│   └── posts/                # 博客博文目录（包含 AI 自动生成的博文）
├── scripts/
│   ├── generate-ai-post.ts   # AI 博文自动生成核心 TypeScript 脚本
│   └── generate-flexsearch-index.ts # FlexSearch 索引生成脚本
├── themes/
│   └── LoveIt/               # LoveIt 主题（已升级至 v0.3.1 并完成 TS 适配）
├── hugo.toml                 # Hugo 站点全局配置文件
├── package.json              # 依赖与编译脚本配置
└── docs/                     # 项目开发规范与状态文档
```

---

## ⚙️ 工作流架构图

```mermaid
graph TD
    A[每日定时 Cron 触发 / 手动触发] --> B(读取科技 RSS 订阅源)
    B -->|抓取成功| C(提取最新热门话题)
    B -->|网络失败| D(降级为内置高价值话题)
    C & D --> E[初始化 NVIDIA NIM API 客户端]
    E --> F{随机打乱大模型顺序并尝试}
    F -->|模型A超时或故障| G(自动切换尝试模型B)
    F -->|模型成功响应| H(格式化为 Markdown 博文)
    G --> H
    H --> I(提交新博文并 Push 回 GitHub)
    I --> J[触发 GitHub Pages 构建部署]
    J --> K[网站编译并发布上线]
```

---

## 🛠️ 多种部署教程

您可以根据自己的技术栈与需求，选择以下三种部署方式之一：

### 方案一：GitHub Pages 自动部署 (官方推荐，全自动闭环)

这是最省心、最彻底的部署方式，完全依靠 GitHub 免费提供的 Actions 和托管服务。

#### 1. 配置仓库 Secrets (密钥配置)
为了使流水线在运行时能调用大模型 API 并自动发布，您需要绑定您的密钥：
* 进入您的 GitHub 仓库页面，点击顶部 **Settings** -> 左侧 **Secrets and variables** -> **Actions**。
* 点击右上角 **New repository secret**：
  * **Name** 填入：`NVIDIA_API_KEY`
  * **Secret** 贴入您从 [NVIDIA Build](https://build.nvidia.com/) 平台获取的以 `nvapi-` 开头的密钥值。
* 点击 **Add secret** 保存。

#### 2. 启用 Pages 服务
* 点击仓库顶部 **Settings** -> 左侧 **Pages**。
* 在 **Build and deployment** 下的 **Source**，选择 **`GitHub Actions`**。

#### 3. 运行与验证
* 代码推送到 `main` 分支后，会自动进行首次部署。
* 访问仓库的 **Actions** 标签页，选择 **`Auto Generate AI Post`**，点击 **Run workflow** 手动运行一次，即可立即看到 AI 生成文章并发布上线的全流程。

---

### 方案二：Serverless 托管平台部署 (Cloudflare Pages / Vercel / Netlify)

如果您喜欢使用第三方的 Serverless 托管服务来提速，可以按照以下方式配置：

#### 1. 平台连接与基本配置
在 Cloudflare Pages、Vercel 或 Netlify 控制台导入您的 GitHub 仓库：
* **框架预设 (Framework Preset)**: 选择 **`Hugo`**。
* **构建命令 (Build Command)**: 
  ```bash
  npm run build:theme && hugo --gc --minify && npm run build:index
  ```
  *(注：该命令会先编译 TS 主题，然后构建静态网站，最后为全站生成 FlexSearch 搜索索引)*
* **发布目录 (Publish Directory)**: `public`。

#### 2. 环境变量配置
在这些托管平台的项目设置 (Environment Variables) 中：
* 添加环境变量：`HUGO_VERSION = 0.145.0` (或更高版本，确保使用 extended 扩展版以支持 Sass/SCSS 编译)。
* 如果您也想在这些平台上运行构建前调用脚本，请同样注入 `NVIDIA_API_KEY` 变量。

#### 3. 设置每日定时撰写工作流
由于这些平台不提供原生的定时 cron 代码运行（只有构建托管），您依然需要让 GitHub 的定时工作流跑起来：
* 保留 GitHub Actions 的 `.github/workflows/ai-blog-cron.yml`。
* 每天早上 GitHub Action 会自动写文章并 push 到 GitHub。
* GitHub 收到 push 后，会自动触发 Cloudflare Pages/Vercel/Netlify 的 **Deploy Hook** 自动进行拉取、编译并发布更新。

---

### 方案三：本地预览与手动构建

如果您想在本地电脑上进行开发、预览或手动生成文章。

#### 1. 前置依赖准备
确保您的本地电脑上已安装：
* [Hugo Extended](https://gohugo.io/getting-started/installing/) (扩展版，且版本推荐在 v0.120.0 以上)。
* [Node.js](https://nodejs.org/) (v20+)。

#### 2. 本地初始化
```bash
# 1. 克隆仓库
git clone https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme.git
cd hugo-blog-loveit-theme

# 2. 安装 Node 依赖项
npm install
```

#### 3. 配置本地环境变量
在项目根目录创建一个名为 `.env` 的文件（该文件已被 `.gitignore` 保护，不会被推送到公网）：
```env
NVIDIA_API_KEY=nvapi-your-real-nvidia-api-key-here
```

#### 4. 本地测试运行
```bash
# 编译主题核心 JS 资源
npm run build:theme

# 调用 AI 撰写一篇新文章（会自动存入 content/posts 目录中）
npm run generate:ai-post

# 启动本地预览服务器
hugo server -D
```
启动后在浏览器访问 `http://localhost:1313/hugo-blog-loveit-theme/` 即可实时预览并进行调试。

---

## 📝 贡献与开发指南

如果您希望对此项目做出贡献：
1. **类型检查**：在本地修改完 JS/TS 后，请务必执行 `npm run typecheck` 保证类型无错。
2. **代码风格**：在提交前，请运行 `npm run lint` 进行规范检测。

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 允许个人及商业性免费修改使用。

## 💖 致谢

* [Hugo](https://gohugo.io/) - 世界上最快的静态网站生成框架。
* [LoveIt Theme](https://github.com/dillonzq/LoveIt) - 精致而强大的 Hugo 博客主题。
* [NVIDIA Build Platform](https://build.nvidia.com) - 感谢提供极其丰富且支持 OpenAI 兼容 API 接入的先进大模型服务。
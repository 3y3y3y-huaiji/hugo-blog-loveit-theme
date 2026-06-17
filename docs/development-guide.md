# 📘 AI 科技前沿博客 - 开发与运维手册

本手册记录了本站的核心技术架构、本地开发规范、AI 自动发贴逻辑、性能优化指标以及 CI/CD 自动部署流程，供维护与日常开发参考。

---

## 🚀 1. 项目技术栈概述
本博客是一个**全自动智能化驱动的静态科技博客**，采用以下技术搭建：
* **静态站点生成器 (SSG)：** [Hugo](https://gohugo.io/) (Extended 版本，v0.158.0+)
* **主题 (Theme)：** [LoveIt](https://github.com/dillonzq/LoveIt) (进行过局部样式重写)
* **AI 自动化脚本：** TypeScript + Node.js (使用 `ts-node` 驱动)
* **大模型服务：** NVIDIA NIM / API Catalog (大模型资源池多模型自动轮询与降级机制)
* **CI/CD：** GitHub Actions (使用 Node.js 24 LTS 运行环境)
* **托管部署：** GitHub Pages (Actions 自动构建与分发模式)

---

## 💻 2. 本地开发与环境配置

### 2.1 依赖安装
确保本地安装了 Node.js 20+ (推荐 24+) 与 Hugo 命令行工具。在项目根目录下执行：
```bash
# 安装开发依赖
npm install
```

### 2.2 常用开发指令
本站的快捷指令已封装在 `package.json` 中：
```json
"scripts": {
  "lint": "eslint scripts",
  "typecheck": "tsc --noEmit && tsc --project themes/LoveIt/tsconfig.json --noEmit",
  "build:theme": "babel themes/LoveIt/src/js --out-file themes/LoveIt/assets/js/theme.js --extensions \".ts\" --presets @babel/preset-env,@babel/preset-typescript",
  "build:index": "ts-node scripts/generate-flexsearch-index.ts",
  "generate:ai-post": "ts-node scripts/generate-ai-post.ts"
}
```

* **本地预览 Hugo 站点：**
  ```bash
  hugo server
  ```
  在浏览器访问 `http://localhost:1313` 进行实时热更新预览。
* **手动测试 AI 博文生成：**
  在本地根目录下创建 `.env` 文件，并配置你的密钥：
  ```text
  NVIDIA_API_KEY=你的NVIDIA_API_KEY
  ```
  然后执行：
  ```bash
  npm run generate:ai-post
  ```

---

## 🤖 3. AI 自动发帖逻辑设计 (`scripts/generate-ai-post.ts`)

自动生成博文的控制流如下：
1. **抓取热点 (RSS 抓取)：** 轮询抓取 `RSS_FEEDS` 列表（包括少数派、Solidot、Hacker News、TechCrunch），随机选择一条最新热点。若网络抓取全部失败，则自动降级启用 `FALLBACK_TOPICS` 预置科技主题。
2. **大模型随机指派与自动降级机制：**
   从大模型候选池 `MODEL_POOL` 中提取模型并随机打乱顺序：
   * `deepseek-ai/deepseek-v4-pro`
   * `minimaxai/minimax-m3`
   * `moonshotai/kimi-k2.6`
   * `z-ai/glm-5.1`
   * `google/gemma-4-31b-it`
   按顺序尝试向 NVIDIA API 提交撰写请求。若遇到网络超时或报错，**自动切换并回退到下一个模型**，直至请求成功。
3. **元数据过滤与 Hugo 写入：** 脚本自动剥离大模型前后的 Markdown 杂质，提取出标题、摘要和正文，生成包含 TOML 格式 Front Matter 的 Markdown 文章，写入 [content/posts/](file:///d:/Users/Administrator/Documents/博客在hugo/hugo-blog-loveit-theme/content/posts) 文件夹。

---

## ⚡ 4. 性能优化 (Performance) 与 SEO 规范

为了在 Google PageSpeed 评估中获取优秀得分，必须严格遵守以下优化规范：

### 4.1 图片压缩规范
* **物理尺寸限制：** 严禁直接使用大尺寸（如 1024px+）的 JPEG/PNG 作为主页头像或插图。
* **WebP 标准：** 所有主要页面资源（如头像）必须转换为 WebP 格式（推荐尺寸 `256x256`），体积限制在 **20KB 以内**。
* **布局重置 (防止 CLS)：** 主页头像的重写布局存放在 [layouts/partials/home/profile.html](file:///d:/Users/Administrator/Documents/博客在hugo/hugo-blog-loveit-theme/layouts/partials/home/profile.html)。在 `<img>` 标签上必须显式标明 `width` 与 `height` 物理像素属性（如 `width="256" height="256"`），并写明 `alt` 描述，以满足无障碍与 CLS 零偏移规范。

### 4.2 全站静态资源 CDN 与 SRI 规范
* 在 [hugo.toml](file:///d:/Users/Administrator/Documents/博客在hugo/hugo-blog-loveit-theme/hugo.toml) 中必须保留以下性能与安全设置：
  ```toml
  # 开启全局 SRI 签名
  fingerprint = "sha256"

  # 开启 jsDelivr 全球 CDN 加速
  [params.cdn]
    data = "jsdelivr.yml"
  ```

### 4.3 评论区布局优化
评论区自定义排版重写于 [assets/css/_custom.scss](file:///d:/Users/Administrator/Documents/博客在hugo/hugo-blog-loveit-theme/assets/css/_custom.scss)：
* 评论框最大宽度限制为 **`800px`**，并强制水平居中（与文章正文完美垂直对齐）。
* 顶部 padding 缩减为 **`3rem`**，消除空旷感。
* 使用 `clear: both` 消除右侧浮动目录造成的排版挤压。

---

## 🔄 5. CI/CD 流水线设计 (GitHub Actions)

### 5.1 自动生成与部署合一流水线 (`ai-blog-cron.yml`)
* **痛点解决：** 解决由 `GITHUB_TOKEN` 推送的文章无法二次唤醒 `gh-pages.yml` 的 GitHub 限制。
* **业务流程：** 
  `获取热点并用 AI 生成文章` -> `Git Commit` -> `Git Pull --rebase (避开多人推送冲突)` -> `Git Push` -> `Hugo 编译 (包含最新文章)` -> `打包并部署到 GitHub Pages`。
* **必要权限 (Permissions)：**
  ```yaml
  permissions:
    contents: write # 写入仓库以推送博文
    pages: write    # 写入 GitHub Pages 进行网页发布
    id-token: write # 生成 OIDC 部署令牌
  ```

### 5.2 开发者手动推送部署流水线 (`gh-pages.yml`)
* 用户手动修改项目或推送博文时触发，先进行本地规范检测（`eslint`、`typecheck`），通过后自动构建发布。

---

## 🔍 6. 常见故障排查 (Troubleshooting)

### 6.1 流水线部署报 403 权限拒绝 (Permission Denied)
* **原因：** 仓库的默认 Workflow 权限是只读的，或者 Pages 的发布源选择错误。
* **解决：** 
  1. 进入仓库 **Settings -> Actions -> General**，将 **Workflow permissions** 修改为 **`Read and write permissions`** 并保存。
  2. 进入仓库 **Settings -> Pages**，将 **Build and deployment -> Source** 改选为 **`GitHub Actions`**。

### 6.2 博文生成流遇到推送冲突被拒绝 (Push Rejected)
* **原因：** 定时发文时，远程仓库包含了本地 runner 没有的代码（如你刚刚在本地提交了性能改动）。
* **解决：** 流水线步骤中已加入 `git pull --rebase`。如在本地开发提交遇到该问题，在本地先执行 `git pull --rebase origin main` 融合历史，然后再进行 push 即可。

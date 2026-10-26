# 📘 开发与运维手册

本手册记录本站的技术架构、本地开发规范与 CI/CD 流程。

---

## 🚀 1. 技术栈概述

* **静态站点生成器：** Hugo Extended 0.140.0
* **主题：** LoveIt（局部 TypeScript 重写，Babel 编译）
* **静态资源：** 主题内置本地资源（Font Awesome、KaTeX、Lunr 等），不使用第三方 CDN
* **CI：** GitHub Actions（Node.js 24、pnpm 11.22.0）
* **托管部署：** Cloudflare Pages（Git 集成，自定义域名 `sumingkai.de5.net`）

---

## 💻 2. 本地开发

### 2.1 环境要求

- Node.js 24
- pnpm 11.22.0
- Hugo Extended 0.140.0

```bash
pnpm install
pnpm run build:theme
hugo server -D
```

本地预览地址：http://localhost:1313

### 2.2 常用命令

| 指令 | 用途 |
|------|------|
| `pnpm run lint` | ESLint 静态代码检查（主题 TS 源码） |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm run build:theme` | Babel 编译主题 TS → JS |
| `pnpm run build` | 编译主题资源并执行 Hugo 构建 |
| `hugo server -D` | 本地预览（包含草稿） |

---

## ✍️ 3. 写作与发布流程

1. 从 `main` 创建 Feature 分支：`git checkout -b post/my-new-post`
2. 在 `content/posts/` 新建 Markdown 文件，文件名使用 kebab-case；
3. 本地运行 `hugo server -D` 检查排版、数学公式与链接；
4. 提交并推送分支，创建 Pull Request；
5. CI 通过后合并到 `main`，Cloudflare Pages 自动部署生产站点。

---

## 🔄 4. CI 流水线设计

`.github/workflows/ci.yml` 包含三个任务：

1. **Theme Lint & Typecheck**：ESLint → TypeScript 类型检查 → 编译主题 JS
2. **Hugo Site Build Test**：使用与 Pages 相同的 Hugo 0.140.0 执行整站构建
3. **Site Link Integrity**：Lychee 检查 Hugo 构建产物 `public/` 中的站内与站外链接，失败会阻断合并

---

## 🔍 5. 常见故障排查

### 本地找不到 `hugo`

安装 Hugo Extended 0.140.0 并加入 PATH，或使用与 CI 相同的版本。

### 页面样式或交互异常

主题 JS 可能未重新编译，执行：

```bash
pnpm run build:theme
```

### 数学公式不渲染

确认文章 front matter 所在页面启用了 `math`，并检查 `hugo.toml` 中的 `params.page.math.enable`。

### Cloudflare Pages 构建失败

参见 `docs/cloudflare-deployment.md` 的故障排查章节。

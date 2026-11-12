# 开发与运维手册

本手册记录本站的技术架构、本地开发规范、周报生成链路与 CI/CD 流程。

---

## 1. 技术栈概述

* **静态站点生成器：** Hugo Extended 0.169.0（CI 与 Cloudflare Pages 同版本）
* **主题：** LoveIt（局部 TypeScript 重写，Babel 编译）
* **周报脚本：** Node.js + `.mjs` + GitHub CLI
* **写作 agent：** OpenCode CLI 2.2.7 + GLM 5.3 Flash（`nvidia/z-ai/glm-5.3-flash`）
* **CI：** GitHub Actions（Node.js 26.13.1、pnpm 11.22.0）
* **托管部署：** Cloudflare Pages Git 集成（不需要 API Token）
* **站点域名：** https://hugo-blog-loveit-theme.pages.dev/

---

## 2. 本地开发

### 2.1 环境要求

- 本机全局 Node.js 26.13.1（CI 使用 `.node-version` 固定 26.13.1；Cloudflare Pages 会自动安装 Node 依赖，`NODE_VERSION` 建议保留 `24`）
- 全局 pnpm 11.22.0
- Hugo Extended 0.169.0
- GitHub CLI（本地采集活动）
- OpenCode CLI 2.2.7（本机 Windows 上 native binary 不兼容，建议 WSL/CI）

```bash
pnpm install
pnpm run build:theme
hugo server -D
```

本地预览地址：http://localhost:1313

### 2.2 常用命令

| 指令 | 用途 |
|------|------|
| `pnpm run check` | 格式 + ESLint + 类型检查 + 单测 + 内容契约 |
| `pnpm run check:full` | check + Hugo 构建 + 产物契约 |
| `pnpm run lint` | ESLint（主题 + scripts） |
| `pnpm run typecheck` | 主题 TypeScript 类型检查 |
| `pnpm run verify:content` | 周报与归档文章 front matter 校验 |
| `pnpm run test` | 内容、活动采集、周报解析单测 |
| `pnpm run collect:activity` | 采集公开 GitHub 活动，输出 JSON |
| `pnpm run report:weekly` | 调用 OpenCode + GLM 5.3 Flash 生成周报 |
| `pnpm run build:theme` | Babel 编译主题 TS → JS |
| `pnpm run build` | 编译主题并执行 Hugo 构建 |
| `pnpm run smoke` | 线上冒烟（可用 `SITE_ORIGIN` 指定目标） |
| `hugo server -D` | 本地预览（包含草稿） |

---

## 3. 写作与发布流程

### 3.1 周报

1. 每周一 00:00 UTC（北京 08:00），`weekly-report.yml` 采集公开 GitHub 活动。
2. `generate-weekly-report.mjs` 在临时目录调用 OpenCode CLI + GLM 5.3 Flash，只允许读取 `prompt.md` 与 `activity.json`。
3. 脚本重建 front matter、校验正文与标签，写入 `content/posts/weekly-YYYY-Www.md`。
4. workflow 再跑 `verify:content`，通过后提交并 push `main`。
5. Cloudflare Pages Git 集成自动构建并发布。

### 3.2 普通文章

1. 从 `main` 创建 Feature 分支：`git checkout -b post/my-new-post`。
2. 在 `content/posts/` 新建 Markdown 文件，文件名使用 kebab-case。
3. 本地运行 `hugo server -D` 检查排版与链接。
4. 提交并推送分支，创建 Pull Request。
5. CI 通过后合并到 `main`，Cloudflare Pages 自动部署。

> 人工/Agent 改动禁止直推 `main`；唯一例外是 `weekly-report.yml` 的 bot 周报发布。

---

## 4. CI 流水线设计

`.github/workflows/ci.yml` 包含五个任务：

1. **Format / Lint / Typecheck**：Prettier → ESLint → 主题 TypeScript 类型检查
2. **Content Contract & Tests**：内容契约 → 20 个 `node:test` 单测
3. **Hugo Build & Artifact Contract**：编译主题 → Hugo 0.169.0 构建 → 产物契约
4. **Production Dependency Audit**：仅审计生产依赖的高危漏洞
5. **Site Link Integrity**：Lychee 检查 `public/` 中的站内与站外链接

`weekly-report.yml` 用 `GITHUB_TOKEN` push 不会触发 `push` workflow，因此 `ci.yml` 通过 `workflow_run` 接续检查。Cloudflare Pages 负责部署，CI 不执行 `wrangler deploy`。

---

## 5. 常见故障排查

### 本地找不到 `hugo`

安装 Hugo Extended 0.169.0 并加入 PATH，或使用与 CI/Pages 相同的版本。

### 周报任务提示缺少 GH_PAT

创建一个只读公开仓库的 PAT，保存为 `GH_PAT`。不要授予私有仓库权限。

### 周报任务提示找不到 opencode

确认 workflow 执行了 `npm install -g @opencode/cli@2.2.7`；本地 Windows 建议用 WSL 或直接跑 CI。

### 周报内容为空或过短

检查 `prompts/weekly-report.md` 的输出标记是否被改坏，以及 `activity.json` 是否有足够活动。模型输出不合约时任务会直接失败，不会写入残缺文章。

### 本周没有周报

本周没有公开 GitHub 活动时脚本会跳过，这是正常行为。

### Cloudflare Pages 构建失败

参见 `docs/cloudflare-deployment.md` 的故障排查章节。

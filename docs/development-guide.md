# 📘 AI 科技前沿博客 - 开发与运维手册

本手册记录了本站的核心技术架构、本地开发规范、AI 自动发帖逻辑以及 CI/CD 自动部署流程。

---

## 🚀 1. 项目技术栈概述

* **静态站点生成器：** Hugo Extended (v0.163.2+)
* **主题：** LoveIt (局部 TypeScript 重写)
* **AI 自动化脚本：** TypeScript + Node.js (ts-node)
* **大模型服务：** NVIDIA NIM / API Catalog (多模型自动轮询与降级)
* **CI/CD：** GitHub Actions (Node.js 24 LTS)
* **托管部署：** Cloudflare Workers Assets (纯静态托管，自定义域名 berry.ccwu.cc)

---

## 💻 2. 本地开发与环境配置

### 2.1 依赖安装

确保本地安装了 Node.js 20+ 与 Hugo Extended。在项目根目录执行：

```bash
npm install
```

### 2.2 常用开发指令

| 指令 | 用途 |
|------|------|
| `npm run lint` | ESLint 静态代码检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build:theme` | Babel 编译主题 TS → JS |
| `npm run generate:ai-post` | AI 生成一篇新博文 |
| `npm run build:cloudflare` | 完整构建（主题编译 + Hugo 构建） |
| `hugo server` | 本地预览服务器 (http://localhost:1313) |

---

## 🤖 3. AI 自动发帖逻辑 (`scripts/generate-ai-post.ts`)

1. **抓取热点**：读取 RSS 订阅源（少数派、Solidot、Hacker News、TechCrunch），失败则降级为内置备用主题
2. **随机指派模型**：从 5 个大模型中随机挑选，失败自动回退到下一个
3. **写入博文**：解析 LLM 输出，生成包含 TOML Front Matter 的 Markdown 文件，写入 `content/posts/`

---

## 🔄 4. CI/CD 流水线设计

### 4.1 定时 AI 生成流水线 (`ai-blog-cron.yml`)

* 触发：每日北京时间 08:00 / 手动触发
* 流程：生成博文 → Git Commit → Push 到 main
* Push 后自动触发下方的部署流水线

### 4.2 推送部署流水线 (`cloudflare-deploy.yml`)

* 触发：Push 到 main 分支 / 手动触发
* 流程：ESLint → TypeScript Typecheck → Build Theme → Hugo Build → Deploy to Cloudflare Workers

---

## 🔍 5. 常见故障排查

### 流水线部署报 403 权限拒绝

进入仓库 **Settings → Actions → General**，将 **Workflow permissions** 改为 **Read and write permissions**。

### 博文生成流遇到推送冲突

流水线已内置 `git pull --rebase`。本地开发遇到此问题时，执行 `git pull --rebase origin main` 后再 push。

### Cloudflare 部署后访问返回 404

确保 `wrangler.jsonc` 中 `"workers_dev": true` 已配置，重新运行 `npx wrangler deploy` 并等待完成。

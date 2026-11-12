# 个人技术周记开发与维护规范

本文件是本项目中所有协作与 AI Agent 的统一工程规范。

## 1. 项目概述

- **站长**：安卓人
- **定位**：个人技术周记。每周记录我在 GitHub 上的公开活动、代码决策、踩坑和下周打算。
- **技术栈**：Hugo Extended 0.169.0 + LoveIt 主题（TypeScript 构建）+ OpenCode CLI + GLM 5.3 Flash
- **站点地址**：https://hugo-blog-loveit-theme.pages.dev/
- **部署方式**：Cloudflare Pages Git 集成（push `main` 触发构建，零 API Token）
- **CI 质量体系**：`.github/workflows/ci.yml`（Prettier、ESLint、TypeScript 类型检查、内容契约、单测、Hugo 构建、产物契约、生产依赖审计、Lychee 死链检查）
- **历史内容**：`content/archive/ai-generated-*` 是早期 RSS 自动发文，保留归档，不再新增

## 2. Git 分支与安全策略

### 核心原则：保护 `main` 分支

- **人工/Agent 改动严禁直推 `main`**；所有改动走 Feature 分支 + Pull Request。
- 必须通过 GitHub Actions CI（跑绿）后才允许合并。
- **唯一例外**：`.github/workflows/weekly-report.yml` 的 bot 可以在生成周报后直接 push `main`，用于每周自动发布。不要把这个例外扩大到其他 workflow。
- 利用 Cloudflare Pages 的 Preview Deployments 在合并前验证真实渲染。

### 提交规范（Conventional Commits）

```text
<type>(<scope>): <简要描述>
```

常用类型：`feat`、`fix`、`docs`、`refactor`、`chore`、`ci`。

## 3. 内容规范

### 周报

- 文件：`content/posts/weekly-YYYY-Www.md`
- Front Matter：TOML（`+++`），必须包含 `title`、`date`、`draft = false`、`description`、`author = "安卓人"`。
- 标签：必须包含 `周报`、`AI Generated`、`GLM 5.3 Flash`。
- 分类：必须包含 `周报`。
- 正文：≥ 500 字符；第一人称、轻松随笔型；事实只来自 `activity.json`；引用公开 commit/PR 链接。
- 写作风格：只改 `prompts/weekly-report.md`，不要改 `TITLE/DESCRIPTION/BODY/END_OF_REPORT` 标记。

### 普通文章

- 文件：`content/posts/<kebab-case-title>.md`
- 支持 KaTeX inline `$ ... $` 与 display `$$ ... $$`（如果需要）。
- 不要在 `content/posts/` 写入 RSS 热点水文；历史自动文章只在 `content/archive/`。

### 归档

- `content/archive/ai-generated-*` 不改名、不改正文、不批量清理历史警告。

## 4. 周报生成链路

1. `getReportRange()` 取上一个完整的北京时间自然周。
2. `collect-github-activity.mjs` 读取 `/users/{user}/events/public`，按 head 补拉 PushEvent 提交明细，并用 search API 补全 PR / issue。
3. `select-nvidia-key.mjs` 按 `NVIDIA_API_KEY`、`NVIDIA_API_KEY_2`、`NVIDIA_API_KEY_3` 顺序探测 `z-ai/glm-5.3-flash`，把第一把可用的 key 写入 `GITHUB_ENV` 的 `NVIDIA_API_KEY`。
4. `generate-weekly-report.mjs` 在 `.weekly-report/` 写入 `prompt.md`、`activity.json`，并在仓库根目录写临时 `opencode.json`；执行 `opencode --standalone run --agent plan -m nvidia/z-ai/glm-5.3-flash`。
5. OpenCode 只允许读取 `.weekly-report/` 下的临时文件；不允许 bash/edit/webfetch。
6. 解析 `TITLE/DESCRIPTION/BODY/END_OF_REPORT`，重建 canonical front matter，校验后写入 `content/posts/weekly-YYYY-Www.md`。
7. `weekly-report.yml` 再跑 `verify:content`，通过后 commit + push；Pages Git 集成自动构建。

只分析公开仓库；不采集私有仓库、代码 diff、token 或邮箱。

## 5. 关键文件

| 文件 | 为什么危险 |
| --- | --- |
| `hugo.toml` | `baseURL` 锁定为 `https://hugo-blog-loveit-theme.pages.dev/`；站点标题、作者、搜索与语言配置直接影响线上 |
| `config/weekly-report.json` | `githubUser`、`model`、`maxEvents`、`excludeRepos` 决定采集范围与写作模型 |
| `prompts/weekly-report.md` | 周报语气、结构、输出标记；改标记会直接让解析器失败 |
| `scripts/collect-github-activity.mjs` | 只采公开活动、时间窗、commit 补拉与 search 查询 |
| `scripts/select-nvidia-key.mjs` | 多把 NVIDIA key 顺序探测，选出可用 key 写入 `GITHUB_ENV` |
| `scripts/generate-weekly-report.mjs` | OpenCode 权限、`.weekly-report/` 临时文件、模型调用、front matter 与落盘 |
| `scripts/verify-content.mjs` | 周报与归档文章的硬性契约 |
| `.github/workflows/weekly-report.yml` | 持有 `contents: write`，使用 `GH_PAT` 与 `NVIDIA_API_KEY` |
| `.github/workflows/ci.yml` | PR 门禁；不要在多个 workflow 里重复触发部署 |
| `themes/LoveIt/**` | 主题源码；改动后必须重新执行 `build:theme` |

**单一事实来源**：站点地址只有 `hugo.toml` 的 `baseURL`；CI Node 版本只有 `.ci-node-version`；Pages Node 版本只有 `.node-version`；Hugo 版本只有 `.hugo-version`；周报范围只有 `config/weekly-report.json`；写作风格只有 `prompts/weekly-report.md`；内容契约只有 `scripts/verify-content.mjs`。

## 6. 环境与版本

- **本机**：全局 Node v26.13.1、全局 pnpm 11.22.0（PATH 中优先使用）。
- **CI**：Node 26.13.1（`.ci-node-version`）、Hugo Extended 0.169.0（`.hugo-version`）、pnpm 11.22.0。
- **Cloudflare Pages**：构建命令只有 `hugo --gc --minify`；Pages 读取 `.node-version`（`24`）安装 Node 并自动执行 `pnpm install`，无需设置 `NODE_VERSION`；未设置 `HUGO_VERSION` 时使用 Pages 默认 `0.147.7`，模板兼容 0.140+，如需与 CI 对齐可设为 `0.169.0`。
- **Hugo**：本机未全局安装；本地跑 `check:full` 需要自行安装 0.169.0，或使用临时二进制。
- **TypeScript**：固定 6.0.3；TypeScript 7 目前不被 typescript-eslint 支持，不要升级。
- **OpenCode CLI**：CI 使用 2.2.7；当前 Windows 上 native binary 不兼容，本地生成周报优先用 WSL/CI。
- **npm registry**：本机为华为云镜像；`pnpm audit` 已内置 `--registry=https://registry.npmjs.org`。

## 7. 质量门禁

```bash
pnpm run format:check   # Prettier
pnpm run lint           # ESLint（主题 + scripts）
pnpm run typecheck      # 主题 TypeScript 类型检查
pnpm run test           # 24 个 node:test 单测
pnpm run verify:content # 内容契约（周报 + 归档文章）
pnpm run env:check      # 核对本机环境与依赖版本
pnpm run build          # build:theme + hugo --gc --minify（Hugo 0.169.0）
pnpm run verify:build   # 构建产物契约
pnpm run audit          # 生产依赖高危漏洞
pnpm run smoke          # 线上冒烟（可设 SITE_ORIGIN）
pnpm run report:weekly  # 本地生成周报（需要 NVIDIA_API_KEY、GH_TOKEN、OpenCode CLI）
```

- `pnpm run check` = format + lint + typecheck + test + verify:content，提交前必须通过。
- `pnpm run check:full` = check + build + verify:build，改主题/布局/Hugo 配置时必须通过。
- 新增纯函数、解析器、校验规则必须补 `node:test` 单测；不要为了过门禁降低校验强度。

## 8. 已知陷阱

- **`gh api events/public` 的 PushEvent 没有 commits 明细。** 必须按 `payload.head` 补拉 commits；compare API 在 rebase/force-push 时会返回大量历史提交，不要用。
- **`repos/{repo}/commits` 的 `since`/`until` 必须 URL 编码。** 北京时间带 `+08:00`，不编码会被当成空格。
- **`GITHUB_TOKEN` 只能读当前仓库。** 跨仓库公开分析需要 `GH_PAT`（公开仓库只读）。
- **events API 只覆盖最近 90 天、最多 300 条事件。** 采集上限到达时会给出 warning。
- **Search API 有独立的每分钟限额。** 每周一次 4 个查询足够，不要循环翻页。
- **多把 NVIDIA key 只解决 key 级问题。** 如果 `glm-5.3-flash` 模型后端整体无响应，所有 key 都会超时；不要把它当成模型级回退。
- **OpenCode 的 Windows 原生二进制在当前机器上不兼容。** 本地用 WSL/Docker；CI 用 `ubuntu-latest`。
- **`weekly-report.yml` 用 `GITHUB_TOKEN` push 不会触发 `push` workflow。** 因此 `ci.yml` 声明了 `workflow_run` 触发；删掉它周报就不会过 CI。
- **`workflow_run` 的 checkout 必须显式使用 `github.event.workflow_run.head_branch || github.ref`。** 否则可能检出上游触发提交而不是最新 `main`。
- **Pages 会读取 `.node-version` 安装 Node。** 不要把 Pages 安装器不支持的版本写进 `.node-version`；CI 的 Node 版本放在 `.ci-node-version`，两者分开。
- **Pages 使用 Hugo 默认 0.147.7（未设 HUGO_VERSION 时）。** 模板同时兼容 0.140+；本地验证建议对齐 `.hugo-version` 的 0.169.0，但不要假定 Pages 一定运行 0.169.0。
- **`pnpm audit` 在华为云镜像返回 405。** 使用 `pnpm run audit` 内置的 npmjs registry。
- **历史内容不满足新契约。** 归档文章存在空 `description`、YAML front matter、正文极短等情况；校验脚本只告警，不要批量改写。
- **`pages.dev` 可能拦截 CI 机房 IP。** 冒烟返回 403 不一定是站点坏了；用 `SITE_ORIGIN` 指向可达的预览地址复核。
- **本周无公开活动时周报会跳过。** 不要为了“有产出”让模型编造活动。

## 9. 文档维护

改了以下任一项，必须同步更新文档：

- 域名、部署方式或 Pages 配置 → `README.md`、`docs/cloudflare-deployment.md`、
  `docs/development-guide.md` 与本文件
- 模型、OpenCode 版本或采集范围 → `README.md` 与本文件的「项目概述」「周报生成链路」
- 周报风格或输出标记 → `prompts/weekly-report.md` 与本文件
- 质量门禁命令或 CI job → `README.md` 与本文件的命令表
- 新增目录或脚本 → `README.md` 的「项目结构」

# 周报自动生成配置

本项目每周一 08:00（北京时间）自动生成一篇个人技术周报，流程是：公开 GitHub 活动采集 → OpenCode CLI + Step 5 Preview 写作 → 内容契约校验 → 创建 PR → 人工合并 → Cloudflare Pages Git 集成构建。

---

## 1. 核心配置

### 1.1 写作模型

- `nvidia/stepfun-ai/step-5-preview`（Step 5 Preview）
- 通过 OpenCode CLI 的内置 `nvidia` provider 调用，读取 `NVIDIA_API_KEY`
- 模型只负责写作；采集、校验、落盘、发布都是确定性脚本
- 模型失败或输出不合约时任务直接失败，不回退到其他模型
- 同一模型内支持多把 NVIDIA key 轮换：按 `NVIDIA_API_KEY`、`NVIDIA_API_KEY_2`、`NVIDIA_API_KEY_3` 顺序探测，使用第一把可用的 key

### 1.2 采集范围

- GitHub 用户：`config/weekly-report.json` 的 `githubUser`（当前 `3y3y3y-huaiji`）
- 数据源：`/users/{user}/events/public` + search API
- 只分析公开仓库；不采集私有仓库、代码 diff、token 或邮箱
- PushEvent 只有 `head/before`，脚本会按 `head` 补拉提交明细
- 可通过 `excludeRepos` 排除不想出现在周报里的公开仓库

### 1.3 周报风格

- 文件：`prompts/weekly-report.md`
- 风格：第一人称、轻松随笔型、技术细节适度
- 输出标记：`TITLE:` / `DESCRIPTION:` / `BODY:` / `END_OF_REPORT`
- 改风格可以，但不要改标记，否则 `generate-weekly-report.ts` 无法解析

---

## 2. GitHub 仓库 Secret 配置

在 GitHub 仓库 **Settings** → **Secrets and variables** → **Actions** 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `NVIDIA_API_KEY` | 从 NVIDIA Build 获取的 `nvapi-` 开头密钥（第 1 把） |
| `NVIDIA_API_KEY_2` | 可选，第 2 把备用 key |
| `NVIDIA_API_KEY_3` | 可选，第 3 把备用 key |
| `GH_PAT` | 公开仓库只读 PAT（classic `public_repo` 或 fine-grained 公开仓库只读）；不要授予私有仓库权限 |

多把 key 由 `scripts/select-nvidia-key.ts` 逐把探测（CI 中先 `pnpm run build:scripts`，再运行 `node dist/select-nvidia-key.js`）；只有 key 级故障（额度、失效、限流）能通过轮换解决。如果 `step-5-preview` 模型后端整体无响应，所有 key 都会超时，本次周报会跳过。

Cloudflare Pages 使用 Git 集成，不需要 `CLOUDFLARE_API_TOKEN` 或 `CLOUDFLARE_ACCOUNT_ID`。

可选仓库变量 `SITE_ORIGIN` 用于部署后冒烟，默认 `https://hugo-blog-loveit-theme.pages.dev`。

---

## 3. 定时与手动触发

- 定时：`.github/workflows/weekly-report.yml`，cron `0 0 * * 1`（周一 00:00 UTC，即北京 08:00）
- 手动：仓库 **Actions** → **Weekly GitHub Report** → **Run workflow**
- 本周没有公开活动时脚本直接退出，不生成周报、不提交
- 生成成功后 job 会运行 `pnpm run verify:content`，通过后创建 `weekly-report/YYYY-Www` 分支和 PR，并触发 CI；人工合并后部署

---

## 4. 本地测试

前置：本机全局 Node 26.13.1、全局 pnpm 11.22.0；CI 使用 Node 26.13.1 与 Hugo Extended 0.169.0。GitHub CLI 已登录，OpenCode CLI 2.2.7（当前 Windows 上 native binary 不兼容，建议 WSL/CI）。

```bash
pnpm install

# scripts 是 TypeScript，会先编译到 dist/ 再执行
pnpm run build:scripts

# 只采集活动，验证数据结构
pnpm run collect:activity -- --now 2026-11-12T12:00:00+08:00

# 完整生成（需要 NVIDIA_API_KEY、GH_TOKEN）
pnpm run report:weekly
```

本地 `.env`：

```env
NVIDIA_API_KEY=nvapi-your-real-key
GH_TOKEN=github_pat_public_read_only
```

Windows 上 OpenCode 的 native binary 可能无法启动，建议用 WSL、Docker 或直接跑 GitHub Actions。

---

## 5. 失败排查

| 现象 | 检查 |
|------|------|
| `缺少 NVIDIA_API_KEY` | GitHub Secrets 是否配置（至少配置 `NVIDIA_API_KEY`、`NVIDIA_API_KEY_2`、`NVIDIA_API_KEY_3` 之一） |
| `所有 NVIDIA key 对当前模型均不可用` | 查看每把 key 的 HTTP 状态；超时通常表示 NVIDIA 模型后端不可用，换 key 无效 |
| `缺少 GH_PAT` | 是否创建只读公开仓库 PAT，并命名为 `GH_PAT` |
| `gh api ... 失败：401/403` | PAT 是否过期、是否有 public repo 读权限 |
| `找不到 opencode 命令` | 是否执行 `npm install -g @opencode/cli@2.2.7` |
| `模型输出缺少 TITLE` | 提示词标记是否被改坏，或模型输出被日志污染 |
| `正文过短` | 提示词要求 1200-2500 字；检查 activity.json 是否有足够素材 |
| `本周没有公开 GitHub 活动，跳过周报` | 正常行为，不是故障 |

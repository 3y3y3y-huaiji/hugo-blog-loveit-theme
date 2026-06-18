# AI 自动博客配置与使用指南

本项目集成了全自动的 AI 科技博文定时撰写与自动部署系统。

---

## 1. 核心运行机制

### 1.1 大模型资源池 (NVIDIA API Catalog)

1. `deepseek-ai/deepseek-v4-pro` (DeepSeek V4 Pro)
2. `minimaxai/minimax-m3` (MiniMax M3)
3. `moonshotai/kimi-k2.6` (Kimi K2.6)
4. `z-ai/glm-5.1` (GLM 5.1)
5. `google/gemma-4-31b-it` (Gemma 4 31B)

### 1.2 自动运行闭环

* **资讯源**：脚本依次抓取少数派、Solidot、Hacker News、TechCrunch 等 RSS 源，失败则自动降级启用内置备选主题
* **定时流水线**：`.github/workflows/ai-blog-cron.yml`，北京时间每日 08:00 运行
* **部署闭环**：定时流水线生成并 push 博文后，自动触发 `cloudflare-deploy.yml` 进行构建和部署

---

## 2. GitHub 仓库 Secret 配置

在 GitHub 仓库 **Settings** → **Secrets and variables** → **Actions** 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `NVIDIA_API_KEY` | 从 NVIDIA Build 获取的 `nvapi-` 开头密钥 |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

---

## 3. 本地手动测试

在项目根目录创建 `.env` 文件：

```env
NVIDIA_API_KEY=nvapi-your-real-key-here
```

运行生成测试：

```bash
npm run generate:ai-post
```

本地预览：

```bash
hugo server
```

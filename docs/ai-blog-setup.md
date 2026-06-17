# AI 自动博客配置与使用指南

本项目集成了全自动的 AI 科技博文定时撰写与自动部署系统。每次运行会在您的 5 大指定模型池中随机选取一个大模型对最新的科技热点进行深度撰写，并在文末提供署名。

---

## 1. 核心运行机制

### 1.1 大模型资源池 (NVIDIA API Catalog)
大模型资源池由以下 5 款优秀的国产与谷歌开源模型组成：
1. **`deepseek-ai/deepseek-v4-pro`** (DeepSeek V4 Pro)
2. **`minimax/m3`** (MiniMax M3)
3. **`moonshotai/kimi-k2.6`** (Kimi K2.6)
4. **`zhipuai/glm5.1`** (GLM 5.1)
5. **`google/gemma-4-31b-it`** (Gemma 4 31B)

### 1.2 自动运行闭环
* **资讯源**：脚本在每次运行时会依次抓取包含少数派、Solidot 奇客、Hacker News、TechCrunch 等优质科技 RSS 订阅源（若全部抓取失败，将自动降级选用内置的高价值备选科技热搜题目，绝对不会因网络原因中断构建）。
* **定时流水线**：工作流配置在 `.github/workflows/ai-blog-cron.yml` 中，设置北京时间**每日早上 08:00** 运行。
* **双流水线串联**：定时流水线生成 Markdown 文件并 commit 推送后，会自动触发 `.github/workflows/gh-pages.yml`，进行静态分析、主题编译、Hugo 构建以及最新的 FlexSearch 索引附加，实现从热点抓取到最终发布的**零人工全自动闭环**。

---

## 2. GitHub 仓库 Secret 配置步骤

为了使 GitHub Actions 能够调用 NVIDIA 大模型 API，您需要在 GitHub 仓库中托管您的 API 密钥：

1. **获取 API 密钥**：
   * 登录 [NVIDIA Build 官方平台](https://build.nvidia.com/)。
   * 选择任意上述的文本大模型页面，点击 **"Get API Key"** 并复制生成的密钥（通常为 `nvapi-...` 开头）。
2. **在 GitHub 绑定密钥**：
   * 访问您的 GitHub 仓库主页。
   * 依次点击：**Settings** -> **Secrets and variables** -> **Actions**。
   * 点击 **"New repository secret"**。
   * **Name** 填入：`NVIDIA_API_KEY`。
   * **Value** 贴入您复制的密钥。
   * 点击 **"Add secret"** 完成保存。

---

## 3. 本地开发与手动测试

您可以在本地开发环境对博文生成效果进行手动测试：

### 3.1 本地环境变量配置
在项目根目录创建一个 `.env` 配置文件（已在 `.gitignore` 中配置，不会提交到公网），写入您的密钥：
```env
NVIDIA_API_KEY=nvapi-your-real-key-here
```

### 3.2 运行生成测试
在终端执行以下命令：
```bash
# 自动抓取热搜并调用模型写博文
npm run generate:ai-post
```
运行成功后，您会在 `content/posts/` 目录下看到新生成的以 `ai-generated-...` 命名的 Markdown 文件。

### 3.3 本地效果预览
您可以启动本地 Hugo 预览服务器查看排版和尾部的模型专属署名：
```bash
# 启动预览
hugo server
```
并在浏览器访问 `http://localhost:1313/hugo-blog-loveit-theme/` 进行预览。

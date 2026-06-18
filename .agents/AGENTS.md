# AI Agent 开发规范

本文件是本项目中所有 AI Agent（包括 Gemini、Copilot、Trae 等）的统一行为规范。

## 项目概述

- **技术栈**：Hugo (Extended) + LoveIt 主题 + TypeScript + Cloudflare Workers Assets
- **站点地址**：https://berry.ccwu.cc/
- **仓库地址**：https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme
- **部署方式**：通过 GitHub Actions 自动构建，经 Wrangler CLI 部署为 Cloudflare Workers Assets（纯静态托管）
- **自动化**：每日北京时间 08:00 由 AI 自动生成科技博文并部署

## Git 规范

### 分支策略

- **仅使用 `main` 分支**，不设 develop / feature / release 等分支
- AI 生成内容和日常修改均直接 push 到 `main`

### 提交信息格式

采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <简要描述>
```

| type     | 用途                     |
| -------- | ----------------------- |
| feat     | 新功能                   |
| fix      | 修复 bug                 |
| docs     | 文档更新                 |
| style    | 代码风格（不影响功能）     |
| refactor | 重构                     |
| chore    | 构建/CI/依赖等杂项        |

- 提交信息使用**中文或英文**均可
- scope 示例：`config`、`workflow`、`theme`、`script`、`content`

### Git 用户信息

- 用户名：安卓人
- 邮箱：sumingkai1@outlook.com

## 文件命名规范

- 所有文件名使用**小写字母 + 短横线**（kebab-case）：`my-new-post.md`
- 目录名同理
- Hugo 博文文件名：`ai-generated-YYYY-MM-DD-标题摘要.md`
- 禁止使用空格、下划线或驼峰命名

## 代码风格

- **TypeScript / JavaScript**：遵循 ESLint 配置（`eslint.config.js`），启用 `typescript-eslint` 推荐规则
- **TypeScript Strict Mode**：项目根目录 `tsconfig.json` 已开启 `strict: true`
- **缩进**：4 个空格
- **引号**：单引号优先
- **分号**：必须使用

## Hugo 内容规范

### Front Matter 格式

统一使用 **TOML** 格式（`+++` 分隔符）：

```toml
+++
title = "文章标题"
date = 2026-01-01T08:00:00+08:00
draft = false
tags = ["AI Generated", "模型名称"]
categories = ["AI博客", "前沿技术"]
description = "文章摘要"
author = "AI Writer"
+++
```

### 标签 / 分类约定

- AI 生成文章必须包含 `"AI Generated"` 标签
- 分类固定使用 `"AI博客"` + 具体领域分类

## 禁止事项

1. **不得泄露 API Key**：任何密钥必须通过 `.env`（本地）或 GitHub Secrets（CI）传入
2. **不得虚构用户身份信息**：如需涉及身份信息，必须先询问用户确认
3. **不得直接修改 `themes/LoveIt/` 下的文件**：除非用户明确要求。样式定制通过 `assets/css/_custom.scss` 覆盖，布局定制通过 `layouts/` 目录覆盖
4. **不得修改 `hugo.toml` 中的 `baseURL`**：当前锁定为 `https://berry.ccwu.cc/`

## 关键路径速查

| 用途               | 路径                                    |
| ------------------ | --------------------------------------- |
| Hugo 主配置         | `hugo.toml`                             |
| AI 文章生成脚本     | `scripts/generate-ai-post.ts`           |
| CI: 定时生成        | `.github/workflows/ai-blog-cron.yml`    |
| CI: 推送部署        | `.github/workflows/cloudflare-deploy.yml` |
| 自定义 CSS          | `assets/css/_custom.scss`               |
| 布局覆盖            | `layouts/`                              |
| Cloudflare 配置     | `wrangler.jsonc`                        |
| 静态资源            | `static/`                               |
| 博文目录            | `content/posts/`                        |

# 个人博客开发与维护规范

本文件是本项目中所有协作与 AI Agent 的统一工程规范。

## 1. 项目概述

- **站长**：安卓人
- **定位**：形式化数学 (Lean 4)、几何深度学习架构与底层系统工程的技术研究博客。
- **技术栈**：Hugo (Extended) + LoveIt 主题 (TypeScript 构建) + KaTeX
- **站点地址**：https://sumingkai.de5.net/
- **部署方式**：Cloudflare Pages Git 集成（零 API Token，push main 触发全球边缘部署）
- **CI 质量体系**：`.github/workflows/ci.yml`（自动化执行 TypeScript 类型检查、Hugo 整站干跑验证、Lychee 死链审计）

## 2. Git 分支与安全策略

### 核心原则：保护 `main` 分支
- **严禁直推 `main` 分支**；
- 所有博文撰写、主题调整或配置更新，均需通过 Feature 分支（如 `post/lean4-formalization` 或 `feat/math-render`）提交 Pull Request；
- 必须通过 GitHub Actions CI 检查（跑绿）后方可合并进 `main`；
- 利用 Cloudflare Pages 的 Preview Deployments 特性，在合并前验证真实渲染与数学公式排版效果。

### 提交规范 (Conventional Commits)
```
<type>(<scope>): <简要描述>
```
常用类型：`feat`（新功能/新博文）、`fix`（修复）、`docs`（文档说明）、`refactor`（重构/归档）、`chore`（依赖或配置）。

## 3. 文章编写规范
- 文件存放：`content/posts/<kebab-case-title>.md`
- 开启数学公式：正文支持 KaTeX inline `$ ... $` 与 display `$$ ... $$`
- 历史自动化早报已归档至 `content/archive/`，禁止再向 `posts/` 写入自动化流水线水文。

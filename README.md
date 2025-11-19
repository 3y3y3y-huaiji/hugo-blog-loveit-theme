# Hugo博客项目 (LoveIt主题)

[![GitHub license](https://img.shields.io/github/license/3y3y3y-huaiji/hugo-blog-loveit-theme.svg)](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/release/3y3y3y-huaiji/hugo-blog-loveit-theme.svg)](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/releases)
[![GitHub stars](https://img.shields.io/github/stars/3y3y3y-huaiji/hugo-blog-loveit-theme.svg?style=social)](https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme/stargazers)

一个使用Hugo静态网站生成器和LoveIt主题构建的个人博客项目，具有响应式设计、搜索功能和评论系统。

## 🚀 在线预览

博客已部署到GitHub Pages，可通过以下地址访问：

[https://3y3y3y-huaiji.github.io/hugo-blog-loveit-theme/](https://3y3y3y-huaiji.github.io/hugo-blog-loveit-theme/)

## 📋 目录

- [项目特性](#项目特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [安装与使用](#安装与使用)
- [配置说明](#配置说明)
- [部署指南](#部署指南)
- [维护与优化](#维护与优化)
- [常见问题](#常见问题)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## ✨ 项目特性

- 🎨 基于[LoveIt](https://github.com/dillonzq/LoveIt)主题，界面美观现代
- 📱 完全响应式设计，适配各种设备
- 🔍 内置全文搜索功能（FlexSearch）
- 💬 集成Giscus评论系统
- 🌙 支持明暗主题切换
- 📊 支持文章分类和标签
- ⚡ 高性能，快速加载
- 🔧 SEO优化
- 🚀 自动部署到GitHub Pages

## 🛠 技术栈

- **静态网站生成器**: [Hugo](https://gohugo.io/)
- **主题**: [LoveIt](https://github.com/dillonzq/LoveIt)
- **评论系统**: [Giscus](https://giscus.app/)
- **搜索**: [FlexSearch](https://github.com/nextapps-de/flexsearch)
- **部署平台**: GitHub Pages
- **CI/CD**: GitHub Actions

## 📁 项目结构

```
hugo-blog-loveit-theme/
├── .github/
│   └── workflows/           # GitHub Actions工作流
│       └── gh-pages.yml     # 自动部署到GitHub Pages
├── archetypes/              # 内容模板
├── assets/                  # 资源文件（SCSS、JS等）
├── content/                 # 网站内容
│   ├── about/               # 关于页面
│   └── posts/               # 博客文章
├── data/                    # 数据文件
├── i18n/                    # 国际化文件
├── layouts/                 # 布局模板
│   ├── partials/            # 部分模板
│   └── statistics/          # 统计相关
├── static/                  # 静态资源
│   ├── css/                 # 自定义CSS
│   ├── images/              # 图片资源
│   └── lib/                 # 第三方库
├── themes/                  # 主题文件
│   └── LoveIt/              # LoveIt主题
├── docs/                    # 项目文档
├── hugo.toml               # Hugo配置文件
└── README.md               # 项目说明文档
```

## 🚀 安装与使用

### 环境要求

- [Hugo](https://gohugo.io/getting-started/installing/) (版本 >= 0.112.0)
- [Git](https://git-scm.com/)

### 本地运行

1. 克隆仓库
   ```bash
   git clone https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme.git
   cd hugo-blog-loveit-theme
   ```

2. 启动本地服务器
   ```bash
   hugo server -D
   ```

3. 在浏览器中访问 [http://localhost:1313](http://localhost:1313)

### 创建新文章

使用Hugo命令创建新文章：

```bash
hugo new posts/your-post-title.md
```

或者手动在 `content/posts/` 目录下创建Markdown文件。

### 构建网站

```bash
hugo --minify
```

构建后的静态文件将生成在 `public/` 目录中。

## ⚙️ 配置说明

### 基本配置

主要配置在 `hugo.toml` 文件中：

```toml
baseURL = 'https://your-username.github.io/your-repo-name/'
languageCode = 'zh-cn'
title = '你的博客标题'
theme = 'LoveIt'
```

### 主题配置

LoveIt主题提供了丰富的配置选项，主要在 `[params]` 部分：

- 网站基本信息（标题、描述、关键词）
- 作者信息
- 搜索功能配置
- 导航栏配置
- 页脚配置
- 主页配置
- 评论系统配置

### 评论系统

本项目使用Giscus作为评论系统，配置如下：

```toml
[params.page.comment.giscus]
  enable = true
  repo = "your-username/your-repo"
  repoId = "your-repo-id"
  category = "Announcements"
  categoryId = "your-category-id"
  lang = "zh-CN"
  mapping = "pathname"
  # ...其他配置
```

## 🚀 部署指南

### GitHub Pages自动部署

本项目已配置GitHub Actions自动部署到GitHub Pages：

1. 将代码推送到GitHub仓库的main分支
2. GitHub Actions将自动构建并部署网站
3. 部署完成后，网站将在GitHub Pages上可用

### 手动部署到其他平台

1. 构建网站：
   ```bash
   hugo --minify
   ```

2. 将 `public/` 目录中的内容部署到你选择的托管平台

## 🔧 维护与优化

### 定期更新

1. **更新Hugo版本**：
   ```bash
   # 检查最新版本
   hugo version
   
   # 更新Hugo（根据你的安装方式）
   # 例如使用Homebrew：
   brew upgrade hugo
   ```

2. **更新主题**：
   ```bash
   cd themes/LoveIt
   git pull
   ```

3. **更新依赖**：
   ```bash
   # 如果主题使用npm管理依赖
   cd themes/LoveIt
   npm install
   npm update
   ```

### 性能优化

1. **图片优化**：
   - 使用适当的图片格式（WebP、AVIF）
   - 压缩图片大小
   - 使用响应式图片

2. **CSS/JS优化**：
   - 启用资源压缩（Hugo默认启用）
   - 使用CDN加载第三方资源

3. **缓存策略**：
   - 配置适当的缓存头
   - 使用Service Worker缓存静态资源

### SEO优化

1. **元数据优化**：
   - 为每篇文章添加描述和关键词
   - 使用适当的标题结构（H1、H2、H3等）

2. **站点地图**：
   - Hugo自动生成sitemap.xml
   - 确保在搜索引擎中提交站点地图

3. **结构化数据**：
   - 添加适当的微数据和JSON-LD

## ❓ 常见问题

### Q: 如何修改网站颜色主题？

A: 在 `hugo.toml` 中修改 `[params]` 部分的颜色配置，或者在 `assets/css/` 目录下创建自定义CSS文件。

### Q: 如何添加自定义页面？

A: 在 `content/` 目录下创建新的Markdown文件，例如 `content/contact/index.md`，然后在 `hugo.toml` 中添加菜单项。

### Q: 如何配置域名？

A: 在GitHub仓库的Settings > Pages中配置自定义域名，并在 `static/` 目录下添加CNAME文件。

### Q: 如何备份网站内容？

A: 定期备份 `content/` 目录和 `hugo.toml` 配置文件，这些是网站的核心内容。

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进这个项目！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个Pull Request

## 📄 许可证

本项目采用 [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) 许可证。

## 🙏 致谢

- [Hugo](https://gohugo.io/) - 强大的静态网站生成器
- [LoveIt](https://github.com/dillonzq/LoveIt) - 美观的主题
- [Giscus](https://giscus.app/) - 基于GitHub Discussions的评论系统
- [GitHub Pages](https://pages.github.com/) - 免费的静态网站托管服务

## 📞 联系方式

- 作者：安卓人
- 邮箱：sumingkai1@outlook.com
- GitHub：[3y3y3y-huaiji](https://github.com/3y3y3y-huaiji)

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
# Hugo博客 - LoveIt主题

这是一个使用[Hugo](https://gohugo.io/)静态站点生成器和[LoveIt主题](https://github.com/dillonzq/LoveIt)构建的个人博客。

## 功能特性

- 响应式设计
- 暗色模式支持
- 评论系统（Giscus）
- 搜索功能
- SEO优化
- 社交媒体集成
- 分析功能集成

## 前置要求

- [Hugo](https://gohugo.io/getting-started/installing/)（扩展版）
- Git

## 快速开始

1. 克隆此仓库：
   ```bash
   git clone https://github.com/3y3y3y-huaiji/hugo-blog-loveit-theme.git
   cd hugo-blog-loveit-theme
   ```

2. 初始化并更新主题子模块：
   ```bash
   git submodule init
   git submodule update
   ```

3. 启动开发服务器：
   ```bash
   hugo server -D
   ```

4. 在浏览器中打开 `http://localhost:1313` 查看网站。

## 部署

此博客使用 GitHub Actions 自动部署到 GitHub Pages。工作流定义在 `.github/workflows/gh-pages.yml` 中。

要手动部署，构建网站并将 `public` 目录推送到 `gh-pages` 分支：
```bash
hugo -D
# 然后将 public 目录部署到您的托管服务
```

## 项目结构

```
hugo-blog-loveit-theme/
├── .github/
│   └── workflows/
│       └── gh-pages.yml      # GitHub Actions 工作流
├── content/
│   ├── about/
│   │   └── index.md          # 关于页面
│   ├── posts/
│   │   ├── first-post.md     # 示例文章
│   │   └── ...
│   └── _index.md             # 首页内容
├── static/
│   └── images/
│       └── avatar.png        # 头像图片
├── themes/
│   └── LoveIt/               # LoveIt 主题子模块
├── hugo.toml                 # Hugo 配置
├── README.md                 # 本文档（中文版本）
├── README.en.md              # 本文档（英文版本）
└── docs/                     # 项目文档
    ├── 需求文档.md
    ├── 待办清单.md
    └── 项目状态.md
```

## 配置

主要配置文件是 `hugo.toml`。关键设置包括：

- 站点元数据（标题、描述等）
- 主题参数
- 菜单配置
- 社交媒体链接
- 评论系统（Giscus）设置

## 自定义

您可以通过修改以下内容来自定义主题：

- `hugo.toml`：站点配置
- `content/`：博客文章和页面
- `static/`：静态资源如图片
- `themes/LoveIt/`：主题文件（更新主题时需注意）

## 贡献

1. Fork 此仓库
2. 创建一个新的功能分支
3. 提交您的更改
4. 推送到该分支
5. 创建一个新的 Pull Request

## 许可证

本项目采用 MIT 许可证 - 有关详细信息，请参阅 [LICENSE](LICENSE) 文件。

## 致谢

- [Hugo](https://gohugo.io/) - 世界上最快的网站构建框架
- [LoveIt Theme](https://github.com/dillonzq/LoveIt) - 一个干净、优雅但功能强大的 Hugo 博客主题
- [Giscus](https://giscus.app/) - 一个由 GitHub Discussions 驱动的评论系统
# 安卓人的个人技术博客

[![Hugo Version](https://badgen.net/badge/Hugo/v0.125+/blue)](https://gohugo.io/)
[![Theme LoveIt](https://badgen.net/badge/Theme/LoveIt/orange)](https://github.com/dillonzq/LoveIt)
[![License MIT](https://badgen.net/badge/License/MIT/green)](LICENSE)
[![Hosting](https://badgen.net/badge/Hosting/Cloudflare%20Pages/F38020)](https://pages.cloudflare.com/)

> 专注于形式化数学验证 (Lean 4)、几何深度学习架构与底层系统工程的个人技术沉淀。

🌐 **在线站点**：[https://sumingkai.de5.net/](https://sumingkai.de5.net/)

---

## 🛠️ 技术架构

* **静态站点生成器**：Hugo Extended
* **主题**：LoveIt（基于 TypeScript 重构与 Babel 自动打包）
* **数学公式排版**：KaTeX 原生支持（满足 Lean 4 定理证明、流形注意力数学推导）
* **托管部署**：Cloudflare Pages Git 集成（边缘全球 CDN、自动 Universal SSL）
* **代码与构建质量门禁 (CI)**：GitHub Actions（复用成熟官方与社区事实标准 Actions 进行类型校验、Hugo 整站试构建与死链审计）

---

## 📂 项目结构

```text
hugo-blog-loveit-theme/
├── .agents/                  # 协作与规范文档
├── .github/
│   └── workflows/
│       └── ci.yml            # 工业级 CI 质量守门人 (Lint / Hugo Build / Link Audit)
├── content/
│   ├── about/                # 关于页面
│   ├── posts/                # 正式技术博文
│   └── archive/              # 历史早报归档分区
├── themes/
│   └── LoveIt/               # LoveIt 主题目录
├── hugo.toml                 # Hugo 站点配置
└── package.json              # 前端资源与构建脚本
```

---

## 💻 本地开发

1. **安装依赖**：
   ```bash
   pnpm install
   ```

2. **构建主题 JS 资源**：
   ```bash
   pnpm run build:theme
   ```

3. **本地启动预览服务器**：
   ```bash
   hugo server -D
   ```

---

## 🛡️ 贡献与写作流

1. 创建新分支：`git checkout -b post/my-new-post`
2. 撰写文章并在本地通过 `hugo server` 调试；
3. 推送分支并向 `main` 发起 Pull Request；
4. CI 自动运行类型检查与 Hugo 构建测试，Cloudflare Pages 生成临时 Preview URL；
5. 验证排版无误后合并进 `main` 分支，由 Cloudflare Pages 自动部署上线。

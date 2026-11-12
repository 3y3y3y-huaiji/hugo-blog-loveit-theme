# ☁️ Cloudflare Pages 部署指南

本站通过 Cloudflare Pages 的 GitHub 集成部署，仓库无需保存 Cloudflare API Token。

---

## 1. 构建配置

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Build command | `hugo --gc --minify` |
| Build output directory | `public` |
| Root directory | 仓库根目录 |
| `HUGO_VERSION` | 可选；不设置时使用 Pages 默认 `0.147.7`。模板兼容 0.140+，如需与 CI 对齐可设为 `0.169.0` |
| `NODE_VERSION` | `24`（可选；Pages 检测到 `pnpm-lock.yaml` 会自动执行 `pnpm install`） |

主题 JS 已编译并提交在 `themes/LoveIt/assets/js/theme.js`，构建命令本身只需要 Hugo，不需要手动执行 `pnpm install`；但 Pages 构建环境仍会自动安装 Node 依赖。

---

## 2. 域名与规范链接

- 生产域名：https://hugo-blog-loveit-theme.pages.dev/
- 页面通过 `<link rel="canonical">` 统一指向该域名。
- Pull Request 会自动生成独立的 Preview URL，用于合并前验证。

---

## 3. 响应头与缓存

`static/_headers` 会在构建时复制到 `public/_headers`，由 Cloudflare Pages 应用：

- 全站安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、HSTS
- `/css/*`、`/js/*`、`/svg/*`：带指纹的资源缓存一年并标记 `immutable`
- `/lib/*`：缓存 30 天
- `/images/*`：缓存 7 天

---

## 4. 自动部署流程

1. 从 `main` 创建 Feature 分支并提交修改；
2. 推送分支并创建 Pull Request；
3. GitHub Actions 执行 Prettier、ESLint、类型检查、内容契约、单测、Hugo 构建、产物契约、依赖审计和死链检查；
4. Cloudflare Pages 生成 Preview URL；
5. 合并到 `main` 后，Pages 自动构建并发布到生产域名。

周报任务每周一 08:00（北京时间）生成 `content/posts/weekly-YYYY-Www.md` 并 push `main`，随后同样由 Pages 构建发布；`ci.yml` 通过 `workflow_run` 对周报提交补跑检查。

---

## 5. 本地验证

```bash
pnpm install
pnpm run build:theme
hugo --gc --minify
```

构建完成后检查 `public/_headers`、`public/site.webmanifest` 是否生成，并确认 `public/index.html` 中的图标与 OG 图路径正确。

---

## 6. 故障排查

### 构建失败

- 若设置了 `HUGO_VERSION`，确认其未被改回旧版本（模板兼容 0.140+，但 CI 使用 0.169.0 验证）；
- 在本地执行 `hugo --gc --minify` 复现错误；
- 检查 `hugo.toml` 的 `baseURL` 是否为 `https://hugo-blog-loveit-theme.pages.dev/`。

### 页面样式或交互异常

- 确认 `themes/LoveIt/assets/js/theme.js` 已提交；
- 本地执行 `pnpm run build:theme` 后重新构建。

### 自定义域名无法访问

- 在 Pages 项目的 Custom domains 中确认 `hugo-blog-loveit-theme.pages.dev` 状态为 Active；
- 检查 DNS 记录与 Cloudflare 证书状态。

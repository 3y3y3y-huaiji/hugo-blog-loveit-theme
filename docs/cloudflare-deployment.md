# ☁️ Cloudflare Workers Assets 部署指南

本博客统一部署在 Cloudflare Workers Assets，使用自定义域名 `berry.ccwu.cc`。

---

## 1. 为什么选择 Cloudflare Workers Assets？

* **根路径支持**：静态站点直接运行在自定义域名根路径 `/`
* **全球 CDN 加速**：Cloudflare 300+ 边缘节点，加载速度极快
* **免费静态托管**：Asset-Only 模式不消耗 Workers 计算配额
* **广告接入友好**：根路径 + 自定义域名满足 AdSense 审核要求

---

## 2. wrangler.jsonc 配置

```jsonc
{
  "name": "hugo-blog",
  "compatibility_date": "2026-06-17",
  "workers_dev": true,
  "assets": {
    "directory": "./public"
  }
}
```

* `workers_dev: true` — 启用 `*.workers.dev` 访问路由
* `assets.directory` — Hugo 默认输出目录

---

## 3. 自动部署（推荐）

代码推送到 `main` 分支后，GitHub Actions (`cloudflare-deploy.yml`) 会自动：

1. 运行 ESLint 和 TypeScript 类型检查
2. 编译主题 JS 资源
3. Hugo 构建静态站点
4. 通过 Wrangler 部署到 Cloudflare

---

## 4. 手动部署

```bash
# 首次登录
npx wrangler login

# 构建
npm run build:cloudflare

# 部署
npx wrangler deploy
```

---

## 5. 故障排查

### 访问返回 404

检查 `wrangler.jsonc` 中 `"workers_dev": true` 是否已配置，重新运行 `npx wrangler deploy`。

### 部署过程挂起

文件已上传成功，可能是边缘节点同步延迟。等待几分钟后刷新浏览器确认。

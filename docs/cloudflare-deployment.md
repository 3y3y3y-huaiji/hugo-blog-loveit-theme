# ☁️ Cloudflare Workers Assets 部署指南

本指南详细介绍了如何将本博客部署到 Cloudflare Workers Assets，以实现主域名/子域名根路径访问（如用于 Google AdSense 广告集成），同时不影响 GitHub Pages 子路径部署的兼容方案。

---

## 1. 为什么选择 Cloudflare Workers Assets？

* **根路径支持**：GitHub Pages 默认托管在 `https://3y3y3y-huaiji.github.io/hugo-blog-loveit-theme/` 子路径下。而 Cloudflare Workers Assets 允许我们将其托管在 `https://hugo-blog.sumingkai548.workers.dev/` 等自定义域名或 Workers 子域名的根路径 `/`。
* **自定义域名与广告集成**：Google AdSense 等广告联盟通常要求站点运行在顶级域名或根路径，且根目录下需要放置验证文件（如 `ads.txt`）。Cloudflare Workers Assets 完美支持这一需求。
* **全球 Edge CDN 加速**：静态资源直接发布到 Cloudflare 的全球边缘网络，加载速度极快。

---

## 2. wrangler.jsonc 配置文件详解

我们在项目根目录下配置了 `wrangler.jsonc`。由于本站是纯静态站点，我们使用了 Cloudflare Workers Assets 的 **Asset-Only** 模式，无需编写任何 Worker JS 代码。

```json
{
  "name": "hugo-blog",
  "compatibility_date": "2026-06-17",
  "workers_dev": true,
  "assets": {
    "directory": "./public"
  }
}
```

### 配置项说明：
* **`name`**: Cloudflare 上的服务名称。
* **`compatibility_date`**: 兼容性日期。
* **`workers_dev`**: 必须设置为 `true`，以启用分配给 Workers 的默认 `*.workers.dev` 访问路由。如果不配置，部署后访问可能会返回 404。
* **`assets.directory`**: 静态资源上传目录，本站 Hugo 默认输出到 `./public`。

---

## 3. 双平台 baseURL 兼容性构建方案

由于 GitHub Pages 和 Cloudflare Workers 部署在不同的基准路径（子路径 vs 根路径），使用静态的 `hugo.toml` 配置文件会导致其中一方的样式或链接失效。我们采用了**“动态重写 baseURL”**的策略解决此冲突。

### 3.1 默认配置（面向 GitHub Pages）
在 [hugo.toml](file:///d:/Users/Administrator/Documents/博客在hugo/hugo-blog-loveit-theme/hugo.toml) 中，`baseURL` 保持默认的 GitHub Pages 路径：
```toml
baseURL = 'https://3y3y3y-huaiji.github.io/hugo-blog-loveit-theme/'
```

### 3.2 命令行重写配置（面向 Cloudflare）
在本地构建 Cloudflare 部署包时，在 `package.json` 中加入了特定的构建指令：
```json
"scripts": {
  "build:cloudflare": "npm run build:theme && npm run build:index && hugo --baseURL=\"https://hugo-blog.sumingkai548.workers.dev/\" --minify"
}
```
* **工作原理**：命令行参数 `--baseURL="https://hugo-blog.sumingkai548.workers.dev/"` 会强行覆盖 `hugo.toml` 中配置的 baseURL。
* **输出结果**：Hugo 会为根路径重新编译所有的绝对路径与相对路径，并输出到 `./public` 目录，准备好上传到 Workers Assets。

---

## 4. 手动部署流程

在本地发布到 Cloudflare 的具体步骤如下：

### 第一步：安装依赖并登录 Cloudflare
如果您是首次部署，需要登录您的 Cloudflare 账号：
```bash
npx wrangler login
```
该命令会打开浏览器完成 OAuth 2.0 授权。

### 第二步：一键构建
执行以下命令，编译主题资源、搜索索引并生成 Cloudflare 版的静态文件：
```bash
npm run build:cloudflare
```

### 第三步：部署到 Edge
运行 wrangler 进行资产部署：
```bash
npx wrangler deploy
```
控制台会显示上传进度，完成上传后会输出类似如下的地址：
```text
Uploaded 150 files (1.20 sec)
✨ Success! Uploaded 150 files
Deployment uploaded!
Your site is now available at: https://hugo-blog.sumingkai548.workers.dev/
```

---

## 5. 常见故障与排查 (Troubleshooting)

### 5.1 Wrangler 部署过程挂起或超时
* **现象**：命令行在上传完文件后，卡在 `POST /deployments` 或路由同步阶段。
* **原因**：Cloudflare Edge 节点在进行全球网络同步时，局部接口响应延迟，导致 CLI 进程没有及时收到返回。
* **解决**：其实文件已经上传成功。您可以耐心等待几分钟，或强行结束进程后刷新浏览器访问 `https://hugo-blog.sumingkai548.workers.dev/` 进行确认。

### 5.2 访问返回 Cloudflare 404 (Not Found)
* **原因 1**：没有在 `wrangler.jsonc` 中设置 `"workers_dev": true`，导致分配的 `workers.dev` 访问路由未启用。
* **原因 2**：刚刚部署完成，Cloudflare DNS 路由正在生效，一般需要等待 1-2 分钟。
* **解决**：检查 `wrangler.jsonc` 配置文件，并在 Cloudflare Workers 控制台确认该 Worker 服务已开启默认子域名。

### 5.3 页面样式错乱或点击链接跳转到 GitHub Pages
* **原因**：构建时没有使用 `npm run build:cloudflare`，而是误用了普通的 `hugo` 构建，导致静态文件里硬编码了 GitHub Pages 的子路径。
* **解决**：重新运行 `npm run build:cloudflare`，然后再执行 `npx wrangler deploy` 重新发布。

---

## 6. 后续扩展：配置自定义域名与 AdSense

如果您后续购买了自定义顶级域名（如 `yourtechblog.com`）：
1. 在 Cloudflare 仪表板中，进入该 Worker 服务，选择 **Settings -> Triggers -> Custom Domains**，将您的自定义域名绑定至该 Worker。
2. 修改 `package.json` 中的 `build:cloudflare` 脚本，将 `--baseURL` 的值更新为您的自定义域名：
   ```json
   "build:cloudflare": "npm run build:theme && npm run build:index && hugo --baseURL=\"https://yourtechblog.com/\" --minify"
   ```
3. 在本地的 `static` 目录下放置 `ads.txt` 验证文件。构建后，它会被自动复制到根目录，您可以通过 `https://yourtechblog.com/ads.txt` 成功通过 Google AdSense 校验。

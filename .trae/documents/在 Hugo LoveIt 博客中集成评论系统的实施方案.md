## 项目架构概览
- 技术栈：Hugo 静态站点，主题 `LoveIt`，主配置 `hugo.toml`。
- 评论渲染：主题已内置评论入口，在 `themes/LoveIt/layouts/_default/single.html:21-23` 通过 `partial "comment.html"` 插入评论。
- 启用机制：仅在生产环境加载评论，逻辑见 `themes/LoveIt/layouts/partials/init.html:5-23`；实际渲染实现于 `themes/LoveIt/layouts/partials/comment.html:6-149`。
- 当前状态：根目录 `hugo.toml` 尚未配置 `[params.page.comment]`，因此未启用任何提供者。

## 方案选型建议
- 一线推荐：Giscus（GitHub Discussions）。优点：免费、无追踪、与 GitHub 工作流自然融合、LoveIt 原生支持。
- 备选一：Utterances（GitHub Issues）。优点：配置简单、LoveIt 原生支持；缺点：基于 Issue，长期维护与整理稍繁琐。
- 备选二：Disqus。优点：成熟商用；缺点：隐私与广告、需外部账户。
- 非必须：Valine/Gitalk/Facebook/Telegram/Commento 也原生支持，但通常需额外服务或更复杂配置。

## 集成步骤（Giscus 主方案）
1. 准备工作
- 在用于承载评论的 GitHub 仓库开启 Discussions（Settings → General → Discussions）。
- 访问 giscus.app 登录并选择仓库，复制 `repoId`、`categoryId` 等参数。

2. 站点配置
- 在根 `hugo.toml` 添加全局评论配置块：
```toml
[params.page.comment]
  enable = true
  [params.page.comment.giscus]
    enable = true
    repo = "owner/repo"
    repoId = "REPO_ID"
    category = "Announcements"
    categoryId = "CATEGORY_ID"
    lang = "zh-CN"
    mapping = "pathname"
    reactionsEnabled = "1"
    emitMetadata = "0"
    inputPosition = "bottom"
    lazyLoading = true
    lightTheme = "github-light"
    darkTheme = "github-dark"
```
- 说明：键名与 LoveIt 示例一致，见 `themes/LoveIt/exampleSite/hugo.toml:574-592` 与 `comment.html:129-144`。

3. 页面级开关（可选）
- 在文章 Front Matter 可加 `comment: true|false` 控制单页渲染，逻辑由 `init.html:18-23` 处理。

4. 本地验证
- 开启生产模式预览以启用评论：`hugo server -e production`。
- 访问任一文章页，确认 giscus 组件加载并能正常创建/展示讨论。

## 集成步骤（Utterances 备选）
- 配置块示例：
```toml
[params.page.comment]
  enable = true
  [params.page.comment.utterances]
    enable = true
    repo = "owner/repo"
    issueTerm = "pathname"
    label = "comment"
    lightTheme = "github-light"
    darkTheme = "github-dark"
```
- 参考实现：`themes/LoveIt/exampleSite/hugo.toml:563-573` 与 `comment.html:115-127`。

## 部署与环境注意
- 生产环境才加载评论与 CDN/Fingerprint（`init.html:5-23`），EdgeOne Pages 部署无需额外变更。
- 若需国际化，`lang` 可留空以适配主题 i18n；或显式设为 `zh-CN`。

## 安全与隐私
- Giscus/Utterances均基于 GitHub 授权，无需在站点持有密钥；避免在仓库记录任何私密信息。
- 如选 Disqus，注意隐私与追踪策略，必要时在隐私声明中补充说明。

## 回滚与切换
- 回滚：将 `[params.page.comment]` 或对应提供者 `enable` 设为 `false` 即禁用。
- 切换提供者：保持 `enable = true`，改为开启另一个提供者配置块即可（LoveIt 支持并行，但通常只启用一个）。

## 验收标准
- 文章页出现评论组件并可正常登录、读取与提交。
- 新建文章自动挂载评论，或按 Front Matter 控制。
- 生产预览与正式部署行为一致，加载性能正常，无控制台错误。

## 下一步
- 确认选择的提供者（建议 Giscus）。
- 我将按上述步骤为 `hugo.toml` 添加配置，并在本地生产环境验证后提交变更与部署。
# TypeScript 重构与静态分析指南

---

## 1. 静态分析体系

### 1.1 ESLint

使用 Flat Config 规范的 `eslint.config.js`，基于 `typescript-eslint` 推荐规则。

```bash
pnpm run lint
```

### 1.2 TypeScript 类型系统

目前只有一个 TS 编译上下文：

- **主题脚本（浏览器 DOM）**：`themes/LoveIt/tsconfig.json`，`strict: false`（避免第三方库缺类型导致编译阻断）

周报与校验脚本使用 `.mjs` + Node 内置模块，由 ESLint 和 `node:test` 覆盖，不再走 `tsc`。

```bash
pnpm run typecheck
```

---

## 2. 主题编译

主题核心交互文件已重构为 TypeScript：

* 源文件：`themes/LoveIt/src/js/theme.ts`
* 编译输出：`themes/LoveIt/assets/js/theme.js`
* 编译工具：Babel + `@babel/preset-typescript`

```bash
pnpm run build:theme
```

---

## 3. CI 集成

`.github/workflows/ci.yml` 会在 Pull Request 和推送 `main` 时自动执行：

1. Prettier 格式检查
2. ESLint 检测
3. 主题 TypeScript 类型检查
4. 内容契约校验与 20 个单测
5. Babel 编译主题 JS
6. 使用 Hugo 0.169.0 构建并校验产物
7. 生产依赖审计与 Lychee 死链检查

任一步骤失败，流水线即时终止，防止缺陷代码合并。合并到 `main` 后由 Cloudflare Pages 自动构建并部署。

# TypeScript 重构与静态分析指南

---

## 1. 静态分析体系

### 1.1 ESLint

使用 Flat Config 规范的 `eslint.config.js`，基于 `typescript-eslint` 推荐规则。

```bash
npm run lint
```

### 1.2 TypeScript 类型系统

项目分为两个独立的 TS 编译上下文：

1. **构建脚本 (Node.js)**：根目录 `tsconfig.json`，`strict: true`，NodeNext 模块解析
2. **主题脚本 (浏览器 DOM)**：`themes/LoveIt/tsconfig.json`，`strict: false`（避免第三方库缺类型导致编译阻断）

```bash
npm run typecheck
```

---

## 2. 主题编译

主题核心交互文件已重构为 TypeScript：

* 源文件：`themes/LoveIt/src/js/theme.ts`
* 编译输出：`themes/LoveIt/assets/js/theme.js`
* 编译工具：Babel + `@babel/preset-typescript`

```bash
npm run build:theme
```

---

## 3. CI/CD 集成

`cloudflare-deploy.yml` 流水线在部署前自动执行：

1. ESLint 检测
2. TypeScript 类型检查
3. Babel 编译主题 JS
4. Hugo 构建

任一步骤失败，流水线即时终止，防止缺陷代码上线。

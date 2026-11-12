import path from 'node:path';

// 编译后位于 dist/，__dirname 的上一级仍是仓库根目录。
export const ROOT = path.resolve(__dirname, '..');

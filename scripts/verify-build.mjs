#!/usr/bin/env node
// 构建产物契约：Hugo 构建完成后检查站点关键文件与搜索索引，避免部署出「能上传但不可用」的空站点。
// 只读本地 public/，不访问网络。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ORIGIN = 'https://hugo-blog-loveit-theme.pages.dev';

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function findPostPage(publicDir) {
    // permalinks 为 /:year/:month/:day/:contentbasename/，按年份目录向下找任意文章页
    for (const entry of fs.readdirSync(publicDir, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^\d{4}$/.test(entry.name)) {
            continue;
        }
        const yearDir = path.join(publicDir, entry.name);
        const stack = [yearDir];
        while (stack.length > 0) {
            const current = stack.pop();
            for (const child of fs.readdirSync(current, { withFileTypes: true })) {
                const childPath = path.join(current, child.name);
                if (child.isDirectory()) {
                    stack.push(childPath);
                } else if (child.name === 'index.html') {
                    return childPath;
                }
            }
        }
    }
    return null;
}

export function verifyBuild(publicDir, { siteOrigin = process.env.SITE_ORIGIN || DEFAULT_ORIGIN } = {}) {
    const errors = [];
    const origin = siteOrigin.replace(/\/$/, '');
    const requiredFiles = ['index.html', 'index.json', 'sitemap.xml', 'index.xml', 'robots.txt', '404.html'];

    for (const fileName of requiredFiles) {
        const filePath = path.join(publicDir, fileName);
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            errors.push(`缺少产物文件：public/${fileName}`);
        }
    }

    if (errors.length === 0) {
        const indexHtml = readText(path.join(publicDir, 'index.html'));
        if (!indexHtml.includes(origin)) {
            errors.push(`首页未包含站点地址 ${origin}，请检查 hugo.toml 的 baseURL`);
        }
        if (/localhost:1313|example\.org/.test(indexHtml)) {
            errors.push('首页仍包含 localhost 或 example.org，构建使用了错误的 baseURL');
        }

        try {
            const searchIndex = JSON.parse(readText(path.join(publicDir, 'index.json')));
            if (!Array.isArray(searchIndex) || searchIndex.length === 0) {
                errors.push('public/index.json 为空，搜索索引未生成');
            } else if (!searchIndex.every((item) => item && item.objectID && item.uri)) {
                errors.push('public/index.json 条目缺少 objectID/uri，搜索索引结构异常');
            }
        } catch (error) {
            errors.push(`public/index.json 不是合法 JSON：${error.message}`);
        }

        if (!readText(path.join(publicDir, 'sitemap.xml')).includes('<urlset')) {
            errors.push('public/sitemap.xml 缺少 <urlset>');
        }
        if (!readText(path.join(publicDir, 'index.xml')).includes('<rss')) {
            errors.push('public/index.xml 缺少 <rss>');
        }
        if (!readText(path.join(publicDir, 'robots.txt')).includes('Sitemap:')) {
            errors.push('public/robots.txt 缺少 Sitemap 声明');
        }
        if (!findPostPage(publicDir)) {
            errors.push('public/ 下没有找到任何文章页（/:year/:month/:day/:slug/）');
        }
    }

    return { errors };
}

export function main() {
    const publicDir = path.join(fileURLToPath(new URL('..', import.meta.url)), 'public');
    if (!fs.existsSync(publicDir)) {
        console.error('[错误] public/ 不存在，请先执行 hugo --minify');
        process.exit(1);
    }

    const { errors } = verifyBuild(publicDir);
    if (errors.length > 0) {
        console.error(`构建产物校验失败：${errors.length} 项`);
        for (const error of errors) {
            console.error(`[错误] ${error}`);
        }
        process.exit(1);
    }
    console.log('构建产物校验通过：首页、搜索索引、Sitemap、RSS、robots.txt、文章页均存在');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
    main();
}

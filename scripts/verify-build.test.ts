import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { verifyBuild } from './verify-build.js';

function createValidPublicDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-build-test-'));
    const write = (relPath: string, content: string): void => {
        const fullPath = path.join(dir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
    };

    write(
        'index.html',
        '<html><head><link rel="canonical" href="https://hugo-blog-loveit-theme.pages.dev/"></head></html>',
    );
    write('index.json', JSON.stringify([{ objectID: '/2026/11/14/post/', uri: '/2026/11/14/post/' }]));
    write('sitemap.xml', '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    write('index.xml', '<?xml version="1.0"?><rss version="2.0"></rss>');
    write('robots.txt', 'User-agent: *\nSitemap: https://hugo-blog-loveit-theme.pages.dev/sitemap.xml\n');
    write('404.html', '<html><body>404</body></html>');
    write(path.join('2026', '11', '14', 'sample-post', 'index.html'), '<html><body>post</body></html>');
    write(path.join('archive', 'index.html'), '<html><body>archive</body></html>');
    write(path.join('archive', 'first-post', 'index.html'), '<html><body>old post</body></html>');
    write(
        path.join('2025', '06', '18', 'first-post', 'index.html'),
        '<html><head><meta http-equiv="refresh" content="0; url=/archive/first-post/"></head></html>',
    );
    return dir;
}

test('verifyBuild 在完整合法产物目录下无错误', () => {
    const dir = createValidPublicDir();
    try {
        const { errors } = verifyBuild(dir);
        assert.deepEqual(errors, []);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('verifyBuild 能检出缺失的关键产物文件', () => {
    const dir = createValidPublicDir();
    try {
        fs.rmSync(path.join(dir, 'index.json'));
        fs.rmSync(path.join(dir, '404.html'));
        const { errors } = verifyBuild(dir);
        assert.ok(errors.some((msg) => msg.includes('public/index.json')));
        assert.ok(errors.some((msg) => msg.includes('public/404.html')));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('verifyBuild 能检出错误的 baseURL 或 localhost 泄漏', () => {
    const dir = createValidPublicDir();
    try {
        fs.writeFileSync(
            path.join(dir, 'index.html'),
            '<html><head><link rel="canonical" href="http://localhost:1313/"></head></html>',
            'utf8',
        );
        const { errors } = verifyBuild(dir);
        assert.ok(errors.some((msg) => msg.includes('baseURL')));
        assert.ok(errors.some((msg) => msg.includes('localhost')));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('verifyBuild 能检出非法或空的搜索索引', () => {
    const dir = createValidPublicDir();
    try {
        fs.writeFileSync(path.join(dir, 'index.json'), '[]', 'utf8');
        const emptyResult = verifyBuild(dir);
        assert.ok(emptyResult.errors.some((msg) => msg.includes('搜索索引未生成')));

        fs.writeFileSync(path.join(dir, 'index.json'), '{bad json', 'utf8');
        const badJsonResult = verifyBuild(dir);
        assert.ok(badJsonResult.errors.some((msg) => msg.includes('不是合法 JSON')));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('verifyBuild 能检出缺失归档与旧链接别名页', () => {
    const dir = createValidPublicDir();
    try {
        fs.rmSync(path.join(dir, '2025', '06', '18', 'first-post', 'index.html'));
        const { errors } = verifyBuild(dir);
        assert.ok(errors.some((msg) => msg.includes('/archive/first-post/')));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

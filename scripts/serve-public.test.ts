import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createPublicServer, resolveFile } from './serve-public.js';

function createSamplePublicDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'serve-public-test-'));
    const write = (relPath: string, content: string): void => {
        const fullPath = path.join(dir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
    };

    write('index.html', '<h1>home</h1>');
    write('about.html', '<h1>about</h1>');
    write(path.join('posts', 'index.html'), '<h1>posts</h1>');
    write('404.html', '<h1>404</h1>');
    return dir;
}

test('resolveFile 支持首页、目录索引、无扩展名路径并拦截目录穿越', () => {
    const dir = createSamplePublicDir();
    try {
        assert.equal(resolveFile('/', dir), path.join(dir, 'index.html'));
        assert.equal(resolveFile('/posts/?q=test', dir), path.join(dir, 'posts', 'index.html'));
        assert.equal(resolveFile('/about', dir), path.join(dir, 'about.html'));
        assert.equal(resolveFile('/../package.json', dir), null);
        assert.equal(resolveFile('/%2e%2e/package.json', dir), null);
        assert.equal(resolveFile('/%ZZ', dir), null);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('createPublicServer 正确处理 GET/HEAD/404/405', async () => {
    const dir = createSamplePublicDir();
    const server = createPublicServer(dir);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
        server.close();
        throw new Error('Failed to get server address');
    }
    const origin = `http://127.0.0.1:${address.port}`;

    try {
        const home = await fetch(`${origin}/`);
        assert.equal(home.status, 200);
        assert.match(home.headers.get('content-type') || '', /text\/html/);
        assert.equal(await home.text(), '<h1>home</h1>');

        const head404 = await fetch(`${origin}/missing-page/`, { method: 'HEAD' });
        assert.equal(head404.status, 404);
        assert.equal(await head404.text(), '');

        const get404 = await fetch(`${origin}/missing-page/`);
        assert.equal(get404.status, 404);
        assert.equal(await get404.text(), '<h1>404</h1>');

        const post405 = await fetch(`${origin}/`, { method: 'POST' });
        assert.equal(post405.status, 405);
    } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

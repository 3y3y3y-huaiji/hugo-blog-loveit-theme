import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

import { runSmoke } from './smoke.js';

async function withMockServer(handler: http.RequestListener, fn: (origin: string) => Promise<void>): Promise<void> {
    const server = http.createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
        server.close();
        throw new Error('Failed to get server address');
    }
    const origin = `http://127.0.0.1:${address.port}`;
    try {
        await fn(origin);
    } finally {
        await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
}

test('runSmoke 在所有端点正常时返回 0 错误', async () => {
    await withMockServer(
        (req, res) => {
            switch (req.url) {
                case '/':
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<html><head><title>Test</title></head><body>ok</body></html>');
                    return;
                case '/index.json':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify([{ objectID: '/post/', uri: '/post/' }]));
                    return;
                case '/sitemap.xml':
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end('<urlset></urlset>');
                    return;
                case '/index.xml':
                    res.writeHead(200, { 'Content-Type': 'application/xml' });
                    res.end('<rss version="2.0"></rss>');
                    return;
                case '/robots.txt':
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('User-agent: *\nSitemap: https://example.com/sitemap.xml\n');
                    return;
                default:
                    res.writeHead(404);
                    res.end('Not Found');
            }
        },
        async (origin) => {
            const { errors } = await runSmoke(origin);
            assert.deepEqual(errors, []);
        },
    );
});

test('runSmoke 能捕获 HTTP 错误、非 HTML 首页与非法索引', async () => {
    await withMockServer(
        (req, res) => {
            switch (req.url) {
                case '/':
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('plain text');
                    return;
                case '/index.json':
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end('not-json');
                    return;
                case '/sitemap.xml':
                    res.writeHead(500);
                    res.end('error');
                    return;
                default:
                    res.writeHead(404);
                    res.end('missing');
            }
        },
        async (origin) => {
            const { errors } = await runSmoke(origin);
            assert.equal(errors.length, 5);
            assert.ok(errors.some((msg) => msg.includes('Content-Type 不是 text/html')));
            assert.ok(errors.some((msg) => msg.includes('不是合法 JSON')));
            assert.ok(errors.some((msg) => msg.includes('HTTP 500')));
        },
    );
});

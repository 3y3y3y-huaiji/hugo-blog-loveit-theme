// 本地 E2E 用的静态服务器：直接服务 Hugo 构建产物 public/，尽量贴近 Cloudflare Pages 的行为。

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { ROOT } from './root.js';

const PUBLIC_DIR = path.join(ROOT, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
};

function resolveFile(pathname: string): string | null {
    let decoded: string;
    try {
        decoded = decodeURIComponent(pathname.split('?')[0]);
    } catch {
        return null;
    }

    const relative = path.normalize(decoded).replace(/^([/\\])+/, '');
    if (relative.startsWith('..')) {
        return null;
    }

    const base = path.resolve(PUBLIC_DIR, relative);
    if (base !== PUBLIC_DIR && !base.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
        return null;
    }

    const candidates = decoded.endsWith('/')
        ? [path.join(base, 'index.html')]
        : [base, `${base}.html`, path.join(base, 'index.html')];

    for (const candidate of candidates) {
        try {
            if (fs.statSync(candidate).isFile()) {
                return candidate;
            }
        } catch {
            // 尝试下一个候选路径
        }
    }
    return null;
}

function sendFile(response: http.ServerResponse, filePath: string, statusCode = 200): void {
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(statusCode, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
    });
    response.end(fs.readFileSync(filePath));
}

const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Method Not Allowed');
        return;
    }

    const filePath = resolveFile(request.url || '/');
    if (filePath) {
        if (request.method === 'HEAD') {
            const ext = path.extname(filePath).toLowerCase();
            response.writeHead(200, {
                'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
                'Cache-Control': 'no-store',
            });
            response.end();
            return;
        }
        sendFile(response, filePath);
        return;
    }

    const notFoundPage = path.join(PUBLIC_DIR, '404.html');
    if (fs.existsSync(notFoundPage)) {
        sendFile(response, notFoundPage, 404);
        return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
});

server.listen(PORT, HOST, () => {
    console.log(`Serving ${PUBLIC_DIR} at http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        server.close(() => process.exit(0));
    });
}

#!/usr/bin/env node
// 线上冒烟：部署后与每日巡检共用。只依赖 Node 内置 fetch，不读 node_modules。
// 目标可用 SITE_ORIGIN 覆盖，默认打自定义域；被 Cloudflare 机器人规则拦截时可改用 workers.dev 地址。

const DEFAULT_ORIGIN = 'https://hugo-blog-loveit-theme.pages.dev';
const TIMEOUT_MS = 15000;

interface SmokeResponse {
    response: Response;
    body: string;
}

interface SmokeCheck {
    name: string;
    path: string;
    validate: (result: SmokeResponse) => string | null;
}

function getOrigin(): string {
    return (process.env.SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
}

async function request(origin: string, pathname: string): Promise<SmokeResponse> {
    const response = await fetch(`${origin}${pathname}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'hugo-blog-smoke/1.0' },
    });
    const body = await response.text();
    return { response, body };
}

export async function runSmoke(origin: string = getOrigin()): Promise<{ origin: string; errors: string[] }> {
    const checks: SmokeCheck[] = [
        {
            name: '首页',
            path: '/',
            validate: ({ response, body }) => {
                if (!response.ok) return `HTTP ${response.status}`;
                if (!/text\/html/i.test(response.headers.get('content-type') || ''))
                    return 'Content-Type 不是 text/html';
                if (!body.includes('<html') || !body.includes('<title')) return '缺少 html/title 标记';
                return null;
            },
        },
        {
            name: '搜索索引',
            path: '/index.json',
            validate: ({ response, body }) => {
                if (!response.ok) return `HTTP ${response.status}`;
                try {
                    const index = JSON.parse(body);
                    if (!Array.isArray(index) || index.length === 0) return '索引为空';
                    if (!index.every((item) => item && item.objectID && item.uri)) return '索引条目缺少 objectID/uri';
                    return null;
                } catch {
                    return '不是合法 JSON';
                }
            },
        },
        {
            name: 'Sitemap',
            path: '/sitemap.xml',
            validate: ({ response, body }) => {
                if (!response.ok) return `HTTP ${response.status}`;
                return body.includes('<urlset') ? null : '缺少 <urlset>';
            },
        },
        {
            name: 'RSS',
            path: '/index.xml',
            validate: ({ response, body }) => {
                if (!response.ok) return `HTTP ${response.status}`;
                return body.includes('<rss') ? null : '缺少 <rss>';
            },
        },
        {
            name: 'robots.txt',
            path: '/robots.txt',
            validate: ({ response, body }) => {
                if (!response.ok) return `HTTP ${response.status}`;
                return body.includes('Sitemap:') ? null : '缺少 Sitemap 声明';
            },
        },
    ];

    const errors: string[] = [];
    for (const check of checks) {
        try {
            const result = await request(origin, check.path);
            const error = check.validate(result);
            if (error) {
                errors.push(`${check.name} (${check.path})：${error}`);
                console.error(`[失败] ${check.name} ${check.path} -> ${error}`);
            } else {
                console.log(`[通过] ${check.name} ${check.path} -> HTTP ${result.response.status}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            errors.push(`${check.name} (${check.path})：${message}`);
            console.error(`[失败] ${check.name} ${check.path} -> ${message}`);
        }
    }

    return { origin, errors };
}

export async function main(): Promise<void> {
    const origin = getOrigin();
    console.log(`冒烟目标：${origin}`);
    const { errors } = await runSmoke(origin);
    if (errors.length > 0) {
        console.error(`冒烟失败：${errors.length} 项`);
        process.exit(1);
    }
    console.log('冒烟通过');
}

if (require.main === module) {
    main();
}

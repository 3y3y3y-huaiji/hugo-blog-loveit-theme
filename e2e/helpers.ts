import { expect, type Page } from '@playwright/test';

export function trackPageErrors(page: Page, { allow404 = false }: { allow404?: boolean } = {}): () => void {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedResponses: string[] = [];

    page.on('pageerror', (error) => {
        pageErrors.push(error.message);
    });

    page.on('console', (message) => {
        if (message.type() === 'error') {
            const text = message.text();
            // 第三方统计/评论/广告资源在离线或受限网络下可能断开；快速跳转时的 404 测试也会触发浏览器内置 404 日志。
            if (text.startsWith('Failed to load resource: net::ERR_')) {
                return;
            }
            if (allow404 && text.includes('status of 404')) {
                return;
            }
            consoleErrors.push(text);
        }
    });

    page.on('requestfailed', (request) => {
        const url = request.url();
        const errorText = request.failure()?.errorText || 'unknown';
        // 页面导航中断尚未完成的预加载脚本属于正常行为（net::ERR_ABORTED）。
        if (url.startsWith('http://127.0.0.1:4173') && errorText !== 'net::ERR_ABORTED') {
            failedResponses.push(`REQUEST_FAILED ${url} (${errorText})`);
        }
    });

    page.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        if (!url.startsWith('http://127.0.0.1:4173')) {
            return;
        }
        if (status >= 400 && !(allow404 && status === 404)) {
            failedResponses.push(`${status} ${url}`);
        }
    });

    return () => {
        expect(pageErrors, 'Expected no uncaught page errors').toEqual([]);
        expect(consoleErrors, 'Expected no console.error messages').toEqual([]);
        expect(failedResponses, 'Expected no failed same-origin responses').toEqual([]);
    };
}

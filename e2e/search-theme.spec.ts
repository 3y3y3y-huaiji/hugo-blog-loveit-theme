import { test, expect } from '@playwright/test';

import { trackPageErrors } from './helpers.js';

test('搜索能返回结果并跳转到文章页', async ({ page }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.goto('/');
    await page.locator('#search-toggle-desktop').click();
    await page.locator('#search-input-desktop').fill('周记');
    const firstResult = page.locator('#search-dropdown-desktop .suggestion-title').first();
    await expect(firstResult).toBeVisible({ timeout: 10_000 });
    await firstResult.click();
    await expect(page.locator('article.page.single')).toBeVisible();

    assertNoErrors();
});

test('暗色模式切换生效并在刷新后保持', async ({ page }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.goto('/');
    // 主题循环顺序是 auto -> light -> dark；最多点三次，避免初始状态差异。
    for (let index = 0; index < 3; index += 1) {
        await page.locator('#header-desktop .theme-switch').click();
        await page.waitForTimeout(100);
        if ((await page.locator('body').getAttribute('theme')) === 'dark') {
            break;
        }
    }
    await expect(page.locator('body')).toHaveAttribute('theme', 'dark');

    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('theme', 'dark');

    assertNoErrors();
});

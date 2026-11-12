import { test, expect } from '@playwright/test';

test('搜索能返回新版说明文章', async ({ page }) => {
    await page.goto('/');
    await page.locator('#search-toggle-desktop').click();
    await page.locator('#search-input-desktop').fill('周记');
    await expect(page.locator('#search-dropdown-desktop')).toContainText('周记', { timeout: 10_000 });
});

test('暗色模式切换生效', async ({ page }) => {
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
});

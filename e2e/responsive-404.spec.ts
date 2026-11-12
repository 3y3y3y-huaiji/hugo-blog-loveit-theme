import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('移动端菜单可以展开并导航', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menu-toggle-mobile').click();
    await expect(page.locator('#menu-mobile')).toHaveClass(/active/);
    await page.locator('#menu-mobile a[href="/posts/"]').click();
    await expect(page).toHaveURL(/\/posts\/$/);
});

test('不存在的路径返回 404 页面', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('body')).toContainText('页面不存在');
});

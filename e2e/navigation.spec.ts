import { test, expect } from '@playwright/test';

test('首页与桌面导航可用', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#header-desktop .header-title')).toContainText('安卓人的技术周记');
    await expect(page.locator('a[href*="new-weekly-notes"]').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/posts/"]').click();
    await expect(page).toHaveURL(/\/posts\/$/);
    await expect(page.locator('a[href*="new-weekly-notes"]').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/archive/"]').click();
    await expect(page).toHaveURL(/\/archive\/$/);
    await expect(page.getByRole('heading', { name: '历史文章归档' })).toBeVisible();

    await page.locator('#header-desktop a[href="/about/"]').click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.getByRole('heading', { name: '关于', exact: true })).toBeVisible();
});

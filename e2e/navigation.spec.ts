import { test, expect } from '@playwright/test';

import { trackPageErrors } from './helpers.js';

test('首页与桌面导航可用', async ({ page }) => {
    const assertNoErrors = trackPageErrors(page);

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#header-desktop .header-title')).toContainText('安卓人的技术周记');
    await expect(page.locator('article.summary .single-title a').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/posts/"]').click();
    await expect(page).toHaveURL(/\/posts\/$/);
    await expect(page.locator('.archive-item-link').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/tags/"]').click();
    await expect(page).toHaveURL(/\/tags\/$/);
    await expect(page.locator('.tag-cloud-tags a').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/categories/"]').click();
    await expect(page).toHaveURL(/\/categories\/$/);
    await expect(page.locator('.categories-card .card-item').first()).toBeVisible();

    await page.locator('#header-desktop a[href="/archive/"]').click();
    await expect(page).toHaveURL(/\/archive\/$/);
    await expect(page.getByRole('heading', { name: '历史文章归档' })).toBeVisible();

    await page.locator('#header-desktop a[href="/about/"]').click();
    await expect(page).toHaveURL(/\/about\/$/);
    await expect(page.getByRole('heading', { name: '关于', exact: true })).toBeVisible();

    assertNoErrors();
});

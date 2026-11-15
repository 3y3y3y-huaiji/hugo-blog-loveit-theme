import { test, expect } from '@playwright/test';

import { trackPageErrors } from './helpers.js';

test('文章详情页渲染、SEO 元数据与图片资源正常', async ({ page }) => {
    const assertNoErrors = trackPageErrors(page);

    await page.goto('/posts/');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
    const firstPostLink = page.locator('.archive-item-link').first();
    await expect(firstPostLink).toBeVisible();
    await firstPostLink.click();

    await expect(page).toHaveURL(/\/\d{4}\/\d{2}\/\d{2}\/.+\/$/);
    await expect(page.locator('article.page.single h1.single-title')).toBeVisible();
    await expect(page.locator('article.page.single .content')).toBeVisible();

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();

    const description = await page
        .locator('meta[name="Description"], meta[name="description"]')
        .first()
        .getAttribute('content');
    expect(description && description.trim().length).toBeGreaterThan(0);

    const brokenImages = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img'))
            .filter((img) => img.complete && img.naturalWidth === 0)
            .map((img) => img.src),
    );
    expect(brokenImages).toEqual([]);

    assertNoErrors();
});

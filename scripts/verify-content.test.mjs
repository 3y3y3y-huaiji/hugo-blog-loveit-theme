import test from 'node:test';
import assert from 'node:assert/strict';

import { parseFrontMatter, normalizeTitle, validatePosts } from './verify-content.mjs';

function tomlArray(values) {
    return `[${values.map((value) => `"${value}"`).join(', ')}]`;
}

function makePost(fileName, overrides = {}) {
    const {
        title = '一个足够长的测试标题',
        date = '2026-11-12T08:00:00+08:00',
        draft = false,
        tags = ['AI Generated', 'GLM 5.2'],
        categories = ['AI博客', '前沿技术'],
        description = '这是一段测试摘要',
        body = '这是一段足够长的测试正文。'.repeat(80),
    } = overrides;

    return {
        fileName,
        raw: `+++
title = "${title}"
date = ${date}
draft = ${draft}
tags = ${tomlArray(tags)}
categories = ${tomlArray(categories)}
description = "${description}"
author = "AI Writer"
+++

${body}
`,
    };
}

function makeWeekly(fileName, overrides = {}) {
    const {
        title = '这周我把周报流水线接上了',
        date = '2026-11-16T08:00:00+08:00',
        draft = false,
        tags = ['周报', 'GitHub', 'AI Generated', 'Step 5 Preview'],
        categories = ['周报', '工程复盘'],
        description = '这周主要在处理 GitHub 活动采集和周报生成。',
        body = '这是一段足够长的周报正文。'.repeat(80),
    } = overrides;

    return {
        fileName,
        raw: `+++
title = "${title}"
date = ${date}
draft = ${draft}
tags = ${tomlArray(tags)}
categories = ${tomlArray(categories)}
description = "${description}"
author = "安卓人"
+++

${body}
`,
    };
}

test('parseFrontMatter 能识别 TOML 与 YAML', () => {
    const toml = parseFrontMatter('+++\ntitle = "标题"\n+++\n正文');
    assert.equal(toml?.format, 'toml');
    assert.match(toml?.data ?? '', /title/);
    assert.equal(toml?.body.trim(), '正文');

    const yaml = parseFrontMatter('---\ntitle: "标题"\n---\n正文');
    assert.equal(yaml?.format, 'yaml');
    assert.equal(yaml?.body.trim(), '正文');
});

test('normalizeTitle 忽略标点、空白与大小写', () => {
    assert.equal(normalizeTitle('AI 时代：Hello, World!'), normalizeTitle('ai时代helloworld'));
});

test('合规的新 AI 文章没有错误', () => {
    const result = validatePosts([makePost('ai-generated-2026-11-12-合规文章.md')]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.ai, 1);
});

test('新 AI 文章缺少 AI Generated 标签会报错', () => {
    const result = validatePosts([makePost('ai-generated-2026-11-12-缺标签.md', { tags: ['GLM 5.2'] })]);
    assert.ok(result.errors.some((error) => error.includes('AI Generated')));
});

test('历史 AI 文章的空描述与短正文只告警', () => {
    const result = validatePosts([makePost('ai-generated-2026-01-01-历史文章.md', { description: '', body: '太短' })]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.warnings.length, 2);
});

test('新 AI 文章的空描述与短正文会报错', () => {
    const result = validatePosts([makePost('ai-generated-2026-11-12-严格文章.md', { description: '', body: '太短' })]);
    assert.ok(result.errors.some((error) => error.includes('description 为空')));
    assert.ok(result.errors.some((error) => error.includes('正文过短')));
});

test('新 AI 文章必须是 draft = false', () => {
    const result = validatePosts([makePost('ai-generated-2026-11-12-草稿.md', { draft: true })]);
    assert.ok(result.errors.some((error) => error.includes('draft = false')));
});

test('当前周报重复标题会报错', () => {
    const result = validatePosts([makeWeekly('weekly-2026-W46.md'), makeWeekly('weekly-2026-W47.md')]);
    assert.ok(result.errors.some((error) => error.includes('标题与')));
});

test('缺少 front matter 或缺必填字段会报错', () => {
    const noFrontMatter = validatePosts([{ fileName: 'no-front-matter.md', raw: '# 只有正文' }]);
    assert.ok(noFrontMatter.errors.some((error) => error.includes('缺少 TOML')));

    const missingDate = makePost('ai-generated-2026-11-12-缺日期.md').raw.replace(/^date = .+$/m, '');
    const result = validatePosts([{ fileName: 'ai-generated-2026-11-12-缺日期.md', raw: missingDate }]);
    assert.ok(result.errors.some((error) => error.includes('缺少 date')));
});

test('合规的周报没有错误', () => {
    const result = validatePosts([makeWeekly('weekly-2026-W46.md')]);
    assert.deepEqual(result.errors, []);
    assert.equal(result.stats.weekly, 1);
});

test('周报缺少必需标签或分类会报错', () => {
    const noWeeklyTag = validatePosts([
        makeWeekly('weekly-2026-W47.md', { tags: ['GitHub', 'AI Generated', 'Step 5 Preview'] }),
    ]);
    assert.ok(noWeeklyTag.errors.some((error) => error.includes('"周报"')));

    const noModelTag = validatePosts([makeWeekly('weekly-2026-W48.md', { tags: ['周报', 'GitHub', 'AI Generated'] })]);
    assert.ok(noModelTag.errors.some((error) => error.includes('模型标签')));

    const noCategory = validatePosts([makeWeekly('weekly-2026-W49.md', { categories: ['工程复盘'] })]);
    assert.ok(noCategory.errors.some((error) => error.includes('categories 缺少 "周报"')));
});

test('旧版 GLM 模型标签仍然兼容', () => {
    const result = validatePosts([
        makeWeekly('weekly-2026-W52.md', { tags: ['周报', 'GitHub', 'AI Generated', 'GLM 5.3 Flash'] }),
    ]);
    assert.deepEqual(result.errors, []);
});

test('周报必须是 draft = false 且正文足够长', () => {
    const draft = validatePosts([makeWeekly('weekly-2026-W50.md', { draft: true })]);
    assert.ok(draft.errors.some((error) => error.includes('draft = false')));

    const short = validatePosts([makeWeekly('weekly-2026-W51.md', { body: '太短' })]);
    assert.ok(short.errors.some((error) => error.includes('正文过短')));
});

test('周报文件名必须符合 weekly-YYYY-Www.md', () => {
    const result = validatePosts([makeWeekly('weekly-2026-46.md')]);
    assert.ok(result.errors.some((error) => error.includes('weekly-YYYY-Www.md')));
});

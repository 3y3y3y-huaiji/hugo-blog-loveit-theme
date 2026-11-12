#!/usr/bin/env node
// 内容契约校验：所有博文必须能被 Hugo 解析，AI 生成的文章还必须满足固定元数据约定。
// 历史文章存在空描述、YAML front matter 等情况，严格检查从 STRICT_FROM 起生效，只收紧不放松。

import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './root.js';
import type { FrontMatter, PostInput } from './types.js';

export const STRICT_FROM = '2026-11-12';
export const REQUIRED_KEYS = ['title', 'date', 'draft'];
export const MIN_BODY_LENGTH = 500;
export const WEEKLY_MODEL_TAGS = ['Step 5 Preview', 'GLM 5.3 Flash'];

const FRONT_MATTER_RE = /^(?:\uFEFF)?(\+\+\+|---)\r?\n([\s\S]*?)\r?\n\1[ \t]*(?:\r?\n|$)/;
const AI_FILE_RE = /^ai-generated-(\d{4})-(\d{2})-(\d{2})-.+\.md$/;
const WEEKLY_FILE_RE = /^weekly-(\d{4})-W(\d{2})\.md$/;

export function parseFrontMatter(raw: string): FrontMatter | null {
    const match = FRONT_MATTER_RE.exec(raw);
    if (!match) {
        return null;
    }
    return {
        format: match[1] === '+++' ? 'toml' : 'yaml',
        data: match[2],
        body: raw.slice(match[0].length),
    };
}

export function extractKeys(data: string, format: FrontMatter['format']): Set<string> {
    const re = format === 'toml' ? /^([A-Za-z0-9_-]+)\s*=/gm : /^([A-Za-z0-9_-]+)\s*:/gm;
    const keys = new Set<string>();
    for (const match of data.matchAll(re)) {
        keys.add(match[1]);
    }
    return keys;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 读取标量值：兼容 TOML 的无引号日期与带引号字符串、YAML 的 quoted/bare 值
export function readScalar(data: string, format: FrontMatter['format'], key: string): string {
    const re =
        format === 'toml'
            ? new RegExp(`^${escapeRegExp(key)}\\s*=\\s*(.+)$`, 'm')
            : new RegExp(`^${escapeRegExp(key)}\\s*:\\s*(.+)$`, 'm');
    const match = re.exec(data);
    if (!match) {
        return '';
    }
    let value = match[1].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
    }
    return value.trim();
}

export function readArray(data: string, key: string): string[] {
    const re = new RegExp(`^${escapeRegExp(key)}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm');
    const match = re.exec(data);
    if (!match) {
        return [];
    }
    return [...match[1].matchAll(/"([^"]*)"|'([^']*)'/g)].map((item) => item[1] ?? item[2]);
}

export function normalizeTitle(title: string): string {
    return title.replace(/[^\p{Script=Han}a-zA-Z0-9]/gu, '').toLowerCase();
}

export function validatePosts(
    posts: PostInput[],
    { strictFrom = STRICT_FROM }: { strictFrom?: string } = {},
): { errors: string[]; warnings: string[]; stats: { total: number; ai: number; weekly: number } } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenTitles = new Map<string, string>();
    let aiCount = 0;
    let weeklyCount = 0;

    for (const { fileName, raw } of posts) {
        const frontMatter = parseFrontMatter(raw);
        if (!frontMatter) {
            errors.push(`${fileName}: 缺少 TOML（+++）或 YAML（---）front matter`);
            continue;
        }

        const keys = extractKeys(frontMatter.data, frontMatter.format);
        for (const key of REQUIRED_KEYS) {
            if (!keys.has(key)) {
                errors.push(`${fileName}: front matter 缺少 ${key}`);
            }
        }

        const title = readScalar(frontMatter.data, frontMatter.format, 'title');
        if (keys.has('title') && !title) {
            errors.push(`${fileName}: title 为空`);
        }
        // 历史归档允许标题重复（早期自动文章存在近似重复），当前文章与周报仍要求唯一。
        const isLegacyArchivePost = fileName.startsWith('ai-generated-');
        if (title && !isLegacyArchivePost) {
            const normalized = normalizeTitle(title);
            if (normalized && seenTitles.has(normalized)) {
                errors.push(`${fileName}: 标题与 ${seenTitles.get(normalized)} 重复`);
            } else if (normalized) {
                seenTitles.set(normalized, fileName);
            }
        }

        const dateValue = readScalar(frontMatter.data, frontMatter.format, 'date');
        if (keys.has('date') && !Number.isFinite(Date.parse(dateValue))) {
            errors.push(`${fileName}: date 无法解析（${dateValue || '空'}）`);
        }

        const weeklyMatch = WEEKLY_FILE_RE.exec(fileName);
        if (weeklyMatch) {
            weeklyCount += 1;
            if (frontMatter.format !== 'toml') {
                errors.push(`${fileName}: 周报必须使用 TOML front matter（+++）`);
            }

            const tags = readArray(frontMatter.data, 'tags');
            const categories = readArray(frontMatter.data, 'categories');
            if (!tags.includes('周报')) {
                errors.push(`${fileName}: tags 缺少 "周报"`);
            }
            if (!tags.includes('AI Generated')) {
                errors.push(`${fileName}: tags 缺少 "AI Generated"`);
            }
            if (!WEEKLY_MODEL_TAGS.some((tag) => tags.includes(tag))) {
                errors.push(`${fileName}: tags 缺少模型标签（${WEEKLY_MODEL_TAGS.join(' 或 ')}）`);
            }
            if (!categories.includes('周报')) {
                errors.push(`${fileName}: categories 缺少 "周报"`);
            }
            if (keys.has('draft') && readScalar(frontMatter.data, frontMatter.format, 'draft') !== 'false') {
                errors.push(`${fileName}: 周报必须 draft = false`);
            }

            const description = readScalar(frontMatter.data, frontMatter.format, 'description');
            const body = frontMatter.body.trim();
            if (!description) {
                errors.push(`${fileName}: description 为空`);
            }
            if (body.length < MIN_BODY_LENGTH) {
                errors.push(`${fileName}: 正文过短（${body.length} < ${MIN_BODY_LENGTH} 字符）`);
            }
            if (parseFrontMatter(body.trimStart())) {
                errors.push(`${fileName}: 正文疑似重复包含 front matter 元数据块`);
            }
            continue;
        }

        const aiMatch = AI_FILE_RE.exec(fileName);
        if (!aiMatch) {
            if (fileName.startsWith('ai-generated-')) {
                errors.push(`${fileName}: AI 文章文件名必须符合 ai-generated-YYYY-MM-DD-标题.md`);
            } else if (fileName.startsWith('weekly-')) {
                errors.push(`${fileName}: 周报文件名必须符合 weekly-YYYY-Www.md`);
            }
            continue;
        }

        aiCount += 1;
        if (frontMatter.format !== 'toml') {
            errors.push(`${fileName}: AI 文章必须使用 TOML front matter（+++）`);
        }

        const tags = readArray(frontMatter.data, 'tags');
        const categories = readArray(frontMatter.data, 'categories');
        if (!tags.includes('AI Generated')) {
            errors.push(`${fileName}: tags 缺少 "AI Generated"`);
        }
        if (!categories.includes('AI博客')) {
            errors.push(`${fileName}: categories 缺少 "AI博客"`);
        }
        if (keys.has('draft') && readScalar(frontMatter.data, frontMatter.format, 'draft') !== 'false') {
            errors.push(`${fileName}: AI 文章必须 draft = false`);
        }

        const postDate = `${aiMatch[1]}-${aiMatch[2]}-${aiMatch[3]}`;
        const isStrict = postDate >= strictFrom;
        const description = readScalar(frontMatter.data, frontMatter.format, 'description');
        const body = frontMatter.body.trim();

        if (isStrict) {
            if (!description) {
                errors.push(`${fileName}: description 为空（严格检查自 ${strictFrom} 起）`);
            }
            if (body.length < MIN_BODY_LENGTH) {
                errors.push(`${fileName}: 正文过短（${body.length} < ${MIN_BODY_LENGTH} 字符）`);
            }
            if (parseFrontMatter(body.trimStart())) {
                errors.push(`${fileName}: 正文疑似重复包含 front matter 元数据块`);
            }
        } else {
            if (!description) {
                warnings.push(`${fileName}: description 为空（历史内容）`);
            }
            if (body.length < MIN_BODY_LENGTH) {
                warnings.push(`${fileName}: 正文过短（历史内容，${body.length} 字符）`);
            }
        }
    }

    return {
        errors,
        warnings,
        stats: { total: posts.length, ai: aiCount, weekly: weeklyCount },
    };
}

export function loadPosts(postsDir: string): PostInput[] {
    if (!fs.existsSync(postsDir)) {
        return [];
    }
    return fs
        .readdirSync(postsDir)
        .filter((fileName) => fileName.endsWith('.md') && !fileName.startsWith('_'))
        .sort()
        .map((fileName) => ({
            fileName,
            raw: fs.readFileSync(path.join(postsDir, fileName), 'utf8'),
        }));
}

export function main() {
    const rootDir = ROOT;
    const postsDir = path.join(rootDir, 'content', 'posts');
    const archiveDir = path.join(rootDir, 'content', 'archive');
    const posts = [...loadPosts(postsDir), ...loadPosts(archiveDir)];
    const { errors, warnings, stats } = validatePosts(posts);

    console.log(
        `内容校验：${stats.total} 篇（AI 历史 ${stats.ai} 篇，周报 ${stats.weekly} 篇），错误 ${errors.length}，警告 ${warnings.length}`,
    );
    for (const error of errors) {
        console.error(`[错误] ${error}`);
    }
    for (const warning of warnings.slice(0, 10)) {
        console.warn(`[警告] ${warning}`);
    }
    if (warnings.length > 10) {
        console.warn(`[警告] 另有 ${warnings.length - 10} 条历史警告未逐条列出`);
    }

    if (errors.length > 0) {
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

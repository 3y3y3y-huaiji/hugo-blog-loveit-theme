#!/usr/bin/env node
// 周报生成：采集公开 GitHub 活动 -> 交给 OpenCode CLI（Step 5 Preview）写作 -> 校验并写入 content/posts。
// OpenCode 只允许读取 .weekly-report/ 里的 prompt.md 与 activity.json，不能执行命令或修改仓库。

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { collectActivity, getReportRange, loadConfig } from './collect-github-activity.js';
import { validatePosts } from './verify-content.js';
import { ROOT } from './root.js';
import type { ApiRecord, ReportOutput } from './types.js';

export interface DedupedCommit {
    sha: string;
    message: string;
    url: string;
    date: string;
    repeatCount: number;
}

export interface RankedRepoDigest {
    name: string;
    url: string;
    tier: 'primary' | 'secondary';
    score: number;
    rawCommitCount: number;
    dedupedCommits: DedupedCommit[];
    pullRequests: ApiRecord[];
    issues: ApiRecord[];
    releases: ApiRecord[];
}

export interface ActivityDigest {
    range: { since: string; until: string; label: string };
    summary: ApiRecord;
    rankedRepos: RankedRepoDigest[];
    reviews: ApiRecord[];
    warnings: string[];
}

export function buildActivityDigest(activity: {
    range: { since: string; until: string; label: string };
    summary: ApiRecord;
    repos: Array<{
        name: string;
        url: string;
        commits: ApiRecord[];
        pullRequests: ApiRecord[];
        issues: ApiRecord[];
        releases: ApiRecord[];
    }>;
    reviews: ApiRecord[];
    warnings: string[];
}): ActivityDigest {
    const scored = activity.repos.map((repo) => {
        const commitMap = new Map<string, DedupedCommit>();
        for (const commit of repo.commits || []) {
            const message = String(commit.message || '').trim();
            const key = message.toLowerCase();
            if (!key) {
                continue;
            }
            const existing = commitMap.get(key);
            if (!existing) {
                commitMap.set(key, {
                    sha: String(commit.sha || ''),
                    message,
                    url: String(commit.url || ''),
                    date: String(commit.date || ''),
                    repeatCount: 1,
                });
            } else {
                existing.repeatCount += 1;
                if (String(commit.date || '') >= existing.date) {
                    existing.sha = String(commit.sha || '');
                    existing.url = String(commit.url || '');
                    existing.date = String(commit.date || '');
                }
            }
        }

        const dedupedCommits = [...commitMap.values()];
        const pullRequests = repo.pullRequests || [];
        const issues = repo.issues || [];
        const releases = repo.releases || [];
        const score = dedupedCommits.length * 2 + pullRequests.length * 4 + issues.length * 2 + releases.length * 3;

        return {
            name: repo.name,
            url: repo.url,
            score,
            rawCommitCount: (repo.commits || []).length,
            dedupedCommits,
            pullRequests,
            issues,
            releases,
        };
    });

    scored.sort((a, b) => b.score - a.score || b.rawCommitCount - a.rawCommitCount);

    const rankedRepos: RankedRepoDigest[] = scored.map((item, index) => ({
        ...item,
        tier: index < 2 && item.score > 0 ? 'primary' : 'secondary',
    }));

    return {
        range: activity.range,
        summary: activity.summary,
        rankedRepos,
        reviews: activity.reviews,
        warnings: activity.warnings,
    };
}

const MODEL_DISPLAY = 'Step 5 Preview';
const AUTHOR = '安卓人';
const TAGS = ['周报', 'GitHub', 'AI Generated', MODEL_DISPLAY];
const CATEGORIES = ['周报', '工程复盘'];
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

function escapeToml(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ').trim();
}

function cleanModelOutput(output: string): string {
    let cleaned = output.replace(ANSI_RE, '').trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned
            .replace(/^```[a-zA-Z]*\r?\n/, '')
            .replace(/\r?\n```$/, '')
            .trim();
    }
    // 兼容模型把标记写成 **TITLE:** 的情况
    return cleaned.replace(/^\*\*(TITLE|DESCRIPTION|BODY):\*\*\s*/gm, '$1: ');
}

export function parseReportOutput(output: string): ReportOutput {
    const cleaned = cleanModelOutput(output);
    const titleMatch = /^TITLE:\s*(.+)$/m.exec(cleaned);
    const descriptionMatch = /^DESCRIPTION:\s*(.+)$/m.exec(cleaned);
    if (!titleMatch || !descriptionMatch) {
        throw new Error('模型输出缺少 TITLE 或 DESCRIPTION 标记');
    }

    const title = titleMatch[1].trim();
    const description = descriptionMatch[1].trim();
    const bodyMarker = cleaned.indexOf('BODY:');
    let body;
    if (bodyMarker !== -1) {
        body = cleaned.slice(bodyMarker + 'BODY:'.length);
    } else {
        const descriptionLineEnd = cleaned.indexOf('\n', descriptionMatch.index + descriptionMatch[0].length);
        body = descriptionLineEnd === -1 ? '' : cleaned.slice(descriptionLineEnd);
    }

    const endMarker = body.lastIndexOf('END_OF_REPORT');
    if (endMarker !== -1) {
        body = body.slice(0, endMarker);
    }
    body = body
        .replace(/^```[a-zA-Z]*\r?\n/, '')
        .replace(/\r?\n```$/, '')
        .trim();

    if (!title) {
        throw new Error('模型输出的标题为空');
    }
    if (!description) {
        throw new Error('模型输出的摘要为空');
    }
    if (body.length < 500) {
        throw new Error(`模型输出的正文过短（${body.length} 字符）`);
    }

    return { title, description, body };
}

function parseReportOutputWithContext(output: string): ReportOutput {
    try {
        return parseReportOutput(output);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const snippet = output.slice(0, 2000).trim() || '(空)';
        throw new Error(`${message}\nOpenCode 输出片段：\n${snippet}`);
    }
}

function runOpenCode({
    files,
    prompt,
    model,
}: {
    files: Record<string, string>;
    prompt: string;
    model: string;
}): string {
    // OpenCode 的 server 以仓库根目录为 workspace，不跟随 spawn 的 cwd；
    // 因此把临时文件放在仓库内的 .weekly-report/，并把临时 opencode.json 写到根目录。
    const workDir = path.join(ROOT, '.weekly-report');
    const configPath = path.join(ROOT, 'opencode.json');
    const configBackup = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });

    try {
        for (const [fileName, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(workDir, fileName), content, 'utf8');
        }
        fs.writeFileSync(
            configPath,
            `${JSON.stringify(
                {
                    $schema: 'https://opencode.ai/config.json',
                    model,
                    permission: {
                        '*': 'deny',
                        read: 'allow',
                    },
                },
                null,
                2,
            )}\n`,
            'utf8',
        );

        const options = {
            cwd: ROOT,
            encoding: 'utf8' as const,
            timeout: 20 * 60 * 1000,
            maxBuffer: 50 * 1024 * 1024,
            env: process.env,
        };
        // --standalone 是全局 flag，必须放在 run 前面；否则会连到仓库根目录的共享 server。
        // plan 是只读 agent，避免 build agent 反复尝试被 deny 的 edit/bash 工具。
        const result =
            process.platform === 'win32'
                ? spawnSync(
                      process.env.ComSpec || 'cmd.exe',
                      [
                          '/d',
                          '/s',
                          '/c',
                          `opencode.cmd --log-level debug --standalone run --auto --print-logs --agent plan -m ${model} ${prompt}`,
                      ],
                      options,
                  )
                : spawnSync(
                      'opencode',
                      [
                          '--log-level',
                          'debug',
                          '--standalone',
                          'run',
                          '--auto',
                          '--print-logs',
                          '--agent',
                          'plan',
                          '-m',
                          model,
                          prompt,
                      ],
                      options,
                  );

        const stderrText = `${result.stderr || ''}`.trim();
        const stderrTail = stderrText.slice(-2000);
        const stderrErrors = stderrText
            .split('\n')
            .filter((line) => /error|invalid|unknown|not found|failed|401|403|model|agent/i.test(line))
            .slice(-20)
            .join('\n');
        if (result.error) {
            if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new Error(
                    '找不到 opencode 命令。请先安装：npm install -g --allow-scripts=@opencode/cli @opencode/cli@2.2.7；Windows 本地建议在 WSL/Git Bash 或 CI 中运行。',
                );
            }
            const detail = stderrErrors || stderrTail;
            throw new Error(`OpenCode 执行失败：${result.error.message}${detail ? `\n${detail}` : ''}`);
        }
        if (result.status !== 0) {
            const detail = stderrErrors || stderrTail;
            throw new Error(`OpenCode 退出码 ${result.status}${detail ? `：\n${detail}` : ''}`);
        }

        const stdout = result.stdout || '';
        if (!stdout.trim()) {
            throw new Error(`OpenCode 未返回内容。stderr 末尾：\n${stderrTail || '(空)'}`);
        }
        return stdout;
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
        if (configBackup) {
            fs.writeFileSync(configPath, configBackup);
        } else {
            fs.rmSync(configPath, { force: true });
        }
    }
}

function buildPost({ title, description, body, publishDate }: ReportOutput & { publishDate: string }): string {
    return `+++
title = "${escapeToml(title)}"
date = ${publishDate}
draft = false
tags = ${JSON.stringify(TAGS)}
categories = ${JSON.stringify(CATEGORIES)}
description = "${escapeToml(description)}"
author = "${AUTHOR}"
+++

${body}

---

*基于公开 GitHub 活动自动整理，所有链接均来自公开数据。*
`;
}

export function main(): void {
    const config = loadConfig();
    const now = process.env.WEEKLY_REPORT_NOW ? new Date(process.env.WEEKLY_REPORT_NOW) : new Date();
    const range = getReportRange(now);

    console.log(`周报周期：${range.since} -> ${range.until}（${range.label}）`);
    const activity = collectActivity({
        user: config.githubUser,
        range,
        maxEvents: config.maxEvents,
        excludeRepos: config.excludeRepos,
    });

    if (activity.summary.total === 0) {
        console.log('本周没有公开 GitHub 活动，跳过周报。');
        return;
    }

    const digest = buildActivityDigest(activity);
    const styleGuide = fs.readFileSync(path.join(ROOT, 'prompts', 'weekly-report.md'), 'utf8');
    const activityJson = `${JSON.stringify(activity, null, 2)}\n`;
    const digestJson = `${JSON.stringify(digest, null, 2)}\n`;

    console.log(`Stage 1：生成初稿，模型：${config.model}`);
    // prompt 保持无空格短句，避免 Windows cmd 把它拆成多个参数。
    const stage1Output = runOpenCode({
        files: {
            'prompt.md': styleGuide,
            'activity-digest.json': digestJson,
            'activity.json': activityJson,
        },
        prompt: '读取.weekly-report/prompt.md和.weekly-report/activity-digest.json，严格按prompt.md的格式写周报。只使用.weekly-report下的文件，不要调用其他工具。',
        model: config.model,
    });

    let report = parseReportOutputWithContext(stage1Output);

    const editorPromptPath = path.join(ROOT, 'prompts', 'weekly-editor.md');
    if (process.env.WEEKLY_PIPELINE_MODE !== 'single-stage' && fs.existsSync(editorPromptPath)) {
        try {
            console.log('Stage 2：去 AI 腔审校与事实核对...');
            const editorGuide = fs.readFileSync(editorPromptPath, 'utf8');
            const draftText = `TITLE: ${report.title}\nDESCRIPTION: ${report.description}\nBODY:\n${report.body}\nEND_OF_REPORT\n`;
            const stage2Output = runOpenCode({
                files: {
                    'editor-prompt.md': editorGuide,
                    'draft.md': draftText,
                    'activity-digest.json': digestJson,
                },
                prompt: '读取.weekly-report/editor-prompt.md、.weekly-report/draft.md和.weekly-report/activity-digest.json，严格按格式输出审校后的周报。只使用.weekly-report下的文件，不要调用其他工具。',
                model: config.model,
            });
            report = parseReportOutputWithContext(stage2Output);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`[警告] Stage 2 审校未通过，回退使用 Stage 1 初稿：${message}`);
        }
    }

    const fileName = `weekly-${range.label}.md`;
    const raw = buildPost({ ...report, publishDate: range.publishDate });
    const { errors } = validatePosts([{ fileName, raw }]);
    if (errors.length > 0) {
        throw new Error(`周报未通过内容契约：\n${errors.join('\n')}`);
    }

    const postsDir = path.join(ROOT, 'content', 'posts');
    fs.mkdirSync(postsDir, { recursive: true });
    const outputPath = path.join(postsDir, fileName);
    fs.writeFileSync(outputPath, raw, 'utf8');
    console.log(`周报已写入：${outputPath}`);
    console.log(`标题：${report.title}`);
}

if (require.main === module) {
    main();
}

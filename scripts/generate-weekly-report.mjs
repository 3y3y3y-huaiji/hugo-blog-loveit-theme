#!/usr/bin/env node
// 周报生成：采集公开 GitHub 活动 -> 交给 OpenCode CLI（GLM 5.3 Flash）写作 -> 校验并写入 content/posts。
// OpenCode 只允许读取 .weekly-report/ 里的 prompt.md 与 activity.json，不能执行命令或修改仓库。

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { collectActivity, getReportRange, loadConfig } from './collect-github-activity.mjs';
import { validatePosts } from './verify-content.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODEL_DISPLAY = 'GLM 5.3 Flash';
const AUTHOR = '安卓人';
const TAGS = ['周报', 'GitHub', 'AI Generated', MODEL_DISPLAY];
const CATEGORIES = ['周报', '工程复盘'];
const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

function escapeToml(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ').trim();
}

function cleanModelOutput(output) {
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

export function parseReportOutput(output) {
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

function runOpenCode({ promptContent, activity, model }) {
    // OpenCode 的 server 以仓库根目录为 workspace，不跟随 spawn 的 cwd；
    // 因此把临时文件放在仓库内的 .weekly-report/，并把临时 opencode.json 写到根目录。
    const workDir = path.join(ROOT, '.weekly-report');
    const configPath = path.join(ROOT, 'opencode.json');
    const configBackup = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });

    try {
        fs.writeFileSync(path.join(workDir, 'prompt.md'), promptContent, 'utf8');
        fs.writeFileSync(path.join(workDir, 'activity.json'), `${JSON.stringify(activity, null, 2)}\n`, 'utf8');
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

        // prompt 保持无空格短句，避免 Windows cmd 把它拆成多个参数。
        const prompt =
            '读取.weekly-report/prompt.md和.weekly-report/activity.json，严格按prompt.md的格式写周报。只使用这两个文件，不要调用其他工具。';
        const options = {
            cwd: ROOT,
            encoding: 'utf8',
            timeout: 5 * 60 * 1000,
            maxBuffer: 20 * 1024 * 1024,
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
                          `opencode.cmd --log-level DEBUG --standalone run --auto --print-logs --agent plan -m ${model} ${prompt}`,
                      ],
                      options,
                  )
                : spawnSync(
                      'opencode',
                      [
                          '--log-level',
                          'DEBUG',
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

        const stderrTail = `${result.stderr || ''}`.trim().slice(-2000);
        if (result.error) {
            if (result.error.code === 'ENOENT') {
                throw new Error(
                    '找不到 opencode 命令。请先安装：npm install -g --allow-scripts=@opencode/cli @opencode/cli@2.2.7；Windows 本地建议在 WSL/Git Bash 或 CI 中运行。',
                );
            }
            const suffix = stderrTail ? `\n${stderrTail}` : '';
            throw new Error(`OpenCode 执行失败：${result.error.message}${suffix}`);
        }
        if (result.status !== 0) {
            throw new Error(`OpenCode 退出码 ${result.status}${stderrTail ? `：\n${stderrTail}` : ''}`);
        }

        return result.stdout || '';
    } finally {
        fs.rmSync(workDir, { recursive: true, force: true });
        if (configBackup) {
            fs.writeFileSync(configPath, configBackup);
        } else {
            fs.rmSync(configPath, { force: true });
        }
    }
}

function buildPost({ title, description, body, publishDate }) {
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

*本文由 ${MODEL_DISPLAY} 根据我本周的 GitHub 公开活动自动整理，数据和链接均来自 GitHub。*
`;
}

export function main() {
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

    const styleGuide = fs.readFileSync(path.join(ROOT, 'prompts', 'weekly-report.md'), 'utf8');
    const promptContent = `${styleGuide.replaceAll('`activity.json`', '`.weekly-report/activity.json`')}\n\n## 本次数据文件\n\n\`.weekly-report/activity.json\` 是本次周报的唯一事实来源。\n`;
    console.log(`调用 OpenCode CLI，模型：${config.model}`);
    const output = runOpenCode({
        promptContent,
        activity,
        model: config.model,
    });

    const report = parseReportOutput(output);
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

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
    main();
}

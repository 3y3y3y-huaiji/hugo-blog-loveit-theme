#!/usr/bin/env node
// 在 weekly-report workflow 中按顺序探测 NVIDIA_API_KEY_1/2/3，
// 选出第一把可用的 key 写入 GITHUB_ENV，供后续 OpenCode 使用。

import fs from 'node:fs';

import { loadConfig } from './collect-github-activity.mjs';
import { collectNvidiaKeys, probeNvidiaKey, selectWorkingKey } from './nvidia-key-pool.mjs';

const TIMEOUT_MS = Number(process.env.NVIDIA_KEY_PROBE_TIMEOUT_MS || 60000);

function resolveProbeModel() {
    const configured = process.env.WEEKLY_REPORT_NVIDIA_MODEL || loadConfig().model;
    return configured.startsWith('nvidia/') ? configured.slice('nvidia/'.length) : configured;
}

async function main() {
    const keys = collectNvidiaKeys(process.env);
    if (keys.length === 0) {
        console.error('缺少 NVIDIA_API_KEY（或 NVIDIA_API_KEY_2/3）');
        process.exit(1);
    }

    const model = resolveProbeModel();
    console.log(`检测到 ${keys.length} 把 NVIDIA key，开始探测 ${model}...`);
    const selected = await selectWorkingKey(keys, (key) => probeNvidiaKey(key, { model, timeoutMs: TIMEOUT_MS }));

    if (!selected) {
        console.error('所有 NVIDIA key 对当前模型均不可用；本次跳过周报。');
        process.exit(1);
    }

    if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `NVIDIA_API_KEY=${selected.value}\n`);
        console.log(`已选择 ${selected.name}，并写入后续步骤的 NVIDIA_API_KEY。`);
    } else {
        console.log(`可用 key：${selected.name}；本地运行请手动 export NVIDIA_API_KEY。`);
    }
}

main().catch((error) => {
    console.error(`NVIDIA key 选择失败：${error.message}`);
    process.exit(1);
});

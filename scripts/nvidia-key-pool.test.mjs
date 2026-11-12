import test from 'node:test';
import assert from 'node:assert/strict';

import { collectNvidiaKeys, probeNvidiaKey, selectWorkingKey } from './nvidia-key-pool.mjs';

test('collectNvidiaKeys 按顺序收集非空 key，忽略其他变量', () => {
    const keys = collectNvidiaKeys({
        NVIDIA_API_KEY: ' key-1 ',
        NVIDIA_API_KEY_10: 'key-10',
        NVIDIA_API_KEY_2: 'key-2',
        NVIDIA_API_KEY_3: '',
        OTHER_KEY: 'nope',
    });

    assert.deepEqual(
        keys.map((key) => key.name),
        ['NVIDIA_API_KEY', 'NVIDIA_API_KEY_2', 'NVIDIA_API_KEY_10'],
    );
    assert.equal(keys[0].value, 'key-1');
});

test('selectWorkingKey 跳过失败 key，返回第一把可用的', async () => {
    const keys = [
        { name: 'NVIDIA_API_KEY_1', value: 'key-1' },
        { name: 'NVIDIA_API_KEY_2', value: 'key-2' },
    ];
    const logs = [];
    const selected = await selectWorkingKey(
        keys,
        async (key) => ({ name: key.name, status: key.name.endsWith('_1') ? 401 : 200, ok: key.name.endsWith('_2') }),
        (line) => logs.push(line),
    );

    assert.equal(selected.name, 'NVIDIA_API_KEY_2');
    assert.deepEqual(logs, ['NVIDIA_API_KEY_1: HTTP 401', 'NVIDIA_API_KEY_2: HTTP 200（可用）']);
});

test('selectWorkingKey 全部失败时返回 null', async () => {
    const selected = await selectWorkingKey(
        [{ name: 'NVIDIA_API_KEY', value: 'key-1' }],
        async () => ({ name: 'NVIDIA_API_KEY', status: 0, ok: false }),
        () => {},
    );

    assert.equal(selected, null);
});

test('probeNvidiaKey 返回 HTTP 状态，失败时状态为 0', async () => {
    const ok = await probeNvidiaKey(
        { name: 'NVIDIA_API_KEY', value: 'key-1' },
        {
            model: 'stepfun-ai/step-5-preview',
            fetchImpl: async () => ({ status: 200, ok: true }),
        },
    );
    assert.deepEqual(ok, { name: 'NVIDIA_API_KEY', status: 200, ok: true });

    const timeout = new Error('timed out');
    timeout.name = 'TimeoutError';
    const failed = await probeNvidiaKey(
        { name: 'NVIDIA_API_KEY', value: 'key-1' },
        {
            model: 'stepfun-ai/step-5-preview',
            fetchImpl: async () => {
                throw timeout;
            },
        },
    );
    assert.deepEqual(failed, { name: 'NVIDIA_API_KEY', status: 0, ok: false, error: 'timeout' });
});

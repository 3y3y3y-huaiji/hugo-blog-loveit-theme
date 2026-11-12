// NVIDIA API key 轮换：同一模型下按顺序探测多把 key，选出第一把可用的。
// key 的值只用于请求和写入 GITHUB_ENV，不会打印到日志。

const KEY_NAME_RE = /^NVIDIA_API_KEY(?:_(\d+))?$/;
const CHAT_COMPLETIONS_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export function collectNvidiaKeys(env = process.env) {
    return Object.entries(env)
        .map(([name, value]) => {
            const match = KEY_NAME_RE.exec(name);
            if (!match || typeof value !== 'string' || value.trim() === '') {
                return null;
            }
            return {
                name,
                value: value.trim(),
                order: match[1] === undefined ? 0 : Number(match[1]),
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
        .map(({ name, value }) => ({ name, value }));
}

export async function probeNvidiaKey(key, { model, fetchImpl = fetch, timeoutMs = 20000 } = {}) {
    try {
        const response = await fetchImpl(CHAT_COMPLETIONS_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key.value}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                stream: false,
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        return { name: key.name, status: response.status, ok: response.ok };
    } catch (error) {
        return {
            name: key.name,
            status: 0,
            ok: false,
            error: error.name === 'TimeoutError' ? 'timeout' : error.message,
        };
    }
}

export async function selectWorkingKey(keys, probe, log = console.log) {
    for (const key of keys) {
        const result = await probe(key);
        log(`${key.name}: HTTP ${result.status}${result.ok ? '（可用）' : ''}`);
        if (result.ok) {
            return key;
        }
    }
    return null;
}

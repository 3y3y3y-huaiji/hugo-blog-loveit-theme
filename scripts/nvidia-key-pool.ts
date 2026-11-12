// NVIDIA API key 轮换：同一模型下按顺序探测多把 key，选出第一把可用的。
// key 的值只用于请求和写入 GITHUB_ENV，不会打印到日志。

export interface NvidiaKey {
    name: string;
    value: string;
}

export interface NvidiaProbeResult {
    name: string;
    status: number;
    ok: boolean;
    error?: string;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<{ status: number; ok: boolean }>;

export interface NvidiaProbeOptions {
    model: string;
    fetchImpl?: FetchLike;
    timeoutMs?: number;
}

const KEY_NAME_RE = /^NVIDIA_API_KEY(?:_(\d+))?$/;
const CHAT_COMPLETIONS_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export function collectNvidiaKeys(env: Record<string, string | undefined> = process.env): NvidiaKey[] {
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
        .filter((item): item is { name: string; value: string; order: number } => item !== null)
        .sort((a, b) => a.order - b.order)
        .map(({ name, value }) => ({ name, value }));
}

export async function probeNvidiaKey(
    key: NvidiaKey,
    { model, fetchImpl = fetch, timeoutMs = 60000 }: NvidiaProbeOptions,
): Promise<NvidiaProbeResult> {
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
        const err = error instanceof Error ? error : new Error(String(error));
        return {
            name: key.name,
            status: 0,
            ok: false,
            error: err.name === 'TimeoutError' ? 'timeout' : err.message,
        };
    }
}

export async function selectWorkingKey(
    keys: NvidiaKey[],
    probe: (key: NvidiaKey) => Promise<NvidiaProbeResult>,
    log: (line: string) => void = console.log,
): Promise<NvidiaKey | null> {
    for (const key of keys) {
        const result = await probe(key);
        log(`${key.name}: HTTP ${result.status}${result.ok ? '（可用）' : ''}`);
        if (result.ok) {
            return key;
        }
    }
    return null;
}

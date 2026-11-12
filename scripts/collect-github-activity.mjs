#!/usr/bin/env node
// 采集公开 GitHub 活动：events/public + search（PR / Issue）。
// 只输出结构化摘要，不抓取代码 diff，也不访问私有仓库。供周报生成脚本使用。

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const API_REPO_PREFIX = 'https://api.github.com/repos/';

export const DEFAULT_CONFIG = {
    githubUser: process.env.GITHUB_USER || '3y3y3y-huaiji',
    maxEvents: 300,
    excludeRepos: [],
    model: process.env.WEEKLY_REPORT_MODEL || 'nvidia/stepfun-ai/step-5-preview',
};

export function loadConfig(
    configPath = path.join(fileURLToPath(new URL('..', import.meta.url)), 'config', 'weekly-report.json'),
) {
    if (!fs.existsSync(configPath)) {
        return { ...DEFAULT_CONFIG };
    }
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
}

export function isoWeek(year, month, day) {
    // month 为 0-based；返回 { year, week }
    const date = new Date(Date.UTC(year, month, day));
    const dayNumber = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / DAY_MS + 1) / 7);
    return { year: date.getUTCFullYear(), week };
}

function formatBeijing(ms) {
    return new Date(ms + BEIJING_OFFSET_MS).toISOString().replace(/\.\d{3}Z$/, '+08:00');
}

function formatDate(ms) {
    return new Date(ms + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

// 周报周期：上一个完整的自然周（周一 00:00 至本周一 00:00，北京时间）
export function getReportRange(now = new Date()) {
    const beijing = new Date(now.getTime() + BEIJING_OFFSET_MS);
    const year = beijing.getUTCFullYear();
    const month = beijing.getUTCMonth();
    const day = beijing.getUTCDate();
    const daysSinceMonday = (beijing.getUTCDay() + 6) % 7;
    const thisMondayMs = Date.UTC(year, month, day) - BEIJING_OFFSET_MS - daysSinceMonday * DAY_MS;
    const untilMs = thisMondayMs;
    const sinceMs = untilMs - 7 * DAY_MS;
    const sinceBeijing = new Date(sinceMs + BEIJING_OFFSET_MS);
    const iso = isoWeek(sinceBeijing.getUTCFullYear(), sinceBeijing.getUTCMonth(), sinceBeijing.getUTCDate());

    return {
        since: formatBeijing(sinceMs),
        until: formatBeijing(untilMs),
        sinceMs,
        untilMs,
        sinceDate: formatDate(sinceMs),
        // search 的 created/merged 日期范围是闭区间，结束日取上周日
        untilDate: formatDate(untilMs - 1),
        isoYear: iso.year,
        isoWeek: iso.week,
        label: `${iso.year}-W${String(iso.week).padStart(2, '0')}`,
        publishDate: formatBeijing(now.getTime()),
    };
}

function repoNameFromApiUrl(url = '') {
    return url.startsWith(API_REPO_PREFIX) ? url.slice(API_REPO_PREFIX.length) : '';
}

function firstLine(message = '') {
    return message.split('\n')[0].trim();
}

function toMs(value) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
}

function ensureRepo(repos, name) {
    if (!repos.has(name)) {
        repos.set(name, {
            name,
            url: `https://github.com/${name}`,
            commits: [],
            pushEvents: [],
            pullRequests: [],
            issues: [],
            releases: [],
            other: [],
        });
    }
    return repos.get(name);
}

function upsertByUrl(items, item) {
    const existing = items.find((entry) => entry.url === item.url);
    if (!existing) {
        items.push(item);
        return;
    }
    if (item.roles) {
        existing.roles = [...new Set([...(existing.roles || []), ...item.roles])];
    }
}

function normalizeSearchPr(item, role) {
    return {
        number: item.number,
        title: item.title,
        url: item.html_url,
        state: item.state,
        draft: Boolean(item.draft),
        roles: [role],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        closedAt: item.closed_at,
        mergedAt: item.pull_request?.merged_at ?? null,
        repo: repoNameFromApiUrl(item.repository_url),
    };
}

function normalizeSearchIssue(item) {
    return {
        number: item.number,
        title: item.title,
        url: item.html_url,
        state: item.state,
        roles: ['opened'],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        closedAt: item.closed_at,
        repo: repoNameFromApiUrl(item.repository_url),
    };
}

function normalizeEvent(event, repos, ignored) {
    const repoName = event.repo?.name;
    if (!repoName) {
        return;
    }
    const repo = ensureRepo(repos, repoName);
    const payload = event.payload || {};

    switch (event.type) {
        case 'PushEvent': {
            const push = {
                ref: payload.ref || '',
                size: payload.size || 0,
                distinctSize: payload.distinct_size || 0,
                date: event.created_at,
            };
            repo.pushEvents.push(push);
            for (const commit of payload.commits || []) {
                if (!commit.sha || repo.commits.some((entry) => entry.sha === commit.sha)) {
                    continue;
                }
                repo.commits.push({
                    sha: commit.sha,
                    message: firstLine(commit.message),
                    url: `https://github.com/${repoName}/commit/${commit.sha}`,
                    date: event.created_at,
                });
            }
            break;
        }
        case 'PullRequestEvent': {
            const pr = payload.pull_request;
            if (!pr) {
                break;
            }
            upsertByUrl(repo.pullRequests, {
                number: pr.number,
                title: pr.title,
                url: pr.html_url,
                state: pr.state,
                draft: Boolean(pr.draft),
                roles: [payload.action || 'updated', ...(pr.merged_at ? ['merged'] : [])],
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                mergedAt: pr.merged_at ?? null,
                additions: pr.additions ?? null,
                deletions: pr.deletions ?? null,
                changedFiles: pr.changed_files ?? null,
            });
            break;
        }
        case 'PullRequestReviewEvent':
        case 'PullRequestReviewCommentEvent': {
            const pr = payload.pull_request;
            if (!pr) {
                break;
            }
            upsertByUrl(repo.pullRequests, {
                number: pr.number,
                title: pr.title,
                url: pr.html_url,
                state: pr.state,
                roles: ['reviewed'],
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                mergedAt: pr.merged_at ?? null,
            });
            break;
        }
        case 'IssuesEvent': {
            const issue = payload.issue;
            if (!issue) {
                break;
            }
            upsertByUrl(repo.issues, {
                number: issue.number,
                title: issue.title,
                url: issue.html_url,
                state: issue.state,
                roles: [payload.action || 'updated'],
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
                closedAt: issue.closed_at,
            });
            break;
        }
        case 'IssueCommentEvent': {
            const issue = payload.issue;
            if (!issue) {
                break;
            }
            upsertByUrl(repo.issues, {
                number: issue.number,
                title: issue.title,
                url: issue.html_url,
                state: issue.state,
                roles: ['commented'],
                createdAt: issue.created_at,
                updatedAt: issue.updated_at,
                closedAt: issue.closed_at,
                commentUrl: payload.comment?.html_url ?? null,
            });
            break;
        }
        case 'ReleaseEvent': {
            const release = payload.release;
            if (!release) {
                break;
            }
            upsertByUrl(repo.releases, {
                tag: release.tag_name,
                name: release.name || release.tag_name,
                url: release.html_url,
                action: payload.action || 'published',
                publishedAt: release.published_at,
            });
            break;
        }
        case 'CreateEvent':
        case 'DeleteEvent': {
            repo.other.push({
                type: event.type,
                refType: payload.ref_type || '',
                ref: payload.ref || '',
                date: event.created_at,
            });
            break;
        }
        case 'ForkEvent': {
            repo.other.push({
                type: 'ForkEvent',
                detail: payload.forkee?.full_name || '',
                date: event.created_at,
            });
            break;
        }
        case 'PublicEvent': {
            repo.other.push({ type: 'PublicEvent', date: event.created_at });
            break;
        }
        default:
            ignored.count += 1;
    }
}

export function buildActivity({
    user,
    range,
    events = [],
    createdPrs = [],
    mergedPrs = [],
    reviewedPrs = [],
    issues = [],
    maxEvents = 300,
    excludeRepos = [],
    warnings = [],
}) {
    const repos = new Map();
    const ignored = { count: 0 };
    const excluded = new Set(excludeRepos);

    const filteredEvents = events
        .filter((event) => {
            const time = toMs(event.created_at);
            const repoName = event.repo?.name;
            return (
                time !== null && time >= range.sinceMs && time < range.untilMs && repoName && !excluded.has(repoName)
            );
        })
        .slice(0, maxEvents);

    for (const event of filteredEvents) {
        normalizeEvent(event, repos, ignored);
    }

    const addPr = (item, role) => {
        if (!item.repo || excluded.has(item.repo)) {
            return;
        }
        const repo = ensureRepo(repos, item.repo);
        upsertByUrl(repo.pullRequests, { ...item, roles: [role] });
    };
    for (const item of createdPrs) {
        addPr(normalizeSearchPr(item, 'created'), 'created');
    }
    for (const item of mergedPrs) {
        addPr(normalizeSearchPr(item, 'merged'), 'merged');
    }
    for (const item of reviewedPrs) {
        addPr(normalizeSearchPr(item, 'reviewed'), 'reviewed');
    }
    for (const item of issues) {
        const issue = normalizeSearchIssue(item);
        if (!issue.repo || excluded.has(issue.repo)) {
            continue;
        }
        const repo = ensureRepo(repos, issue.repo);
        upsertByUrl(repo.issues, issue);
    }

    const repoList = [...repos.values()]
        .filter(
            (repo) =>
                repo.commits.length > 0 ||
                repo.pullRequests.length > 0 ||
                repo.issues.length > 0 ||
                repo.releases.length > 0 ||
                repo.other.length > 0,
        )
        .sort((a, b) => {
            const countA = a.commits.length + a.pullRequests.length + a.issues.length + a.releases.length;
            const countB = b.commits.length + b.pullRequests.length + b.issues.length + b.releases.length;
            return countB - countA || a.name.localeCompare(b.name);
        });

    const commitCount = repoList.reduce((total, repo) => total + repo.commits.length, 0);
    const releaseCount = repoList.reduce((total, repo) => total + repo.releases.length, 0);
    const activeDays = [
        ...new Set(
            filteredEvents
                .map((event) => toMs(event.created_at))
                .filter((time) => time !== null)
                .map((time) => formatDate(time)),
        ),
    ].sort();

    if (events.length > filteredEvents.length && filteredEvents.length === maxEvents) {
        warnings.push(`events 达到上限 ${maxEvents}，更早的活动可能未纳入`);
    }

    return {
        generatedAt: new Date().toISOString(),
        user,
        range: {
            since: range.since,
            until: range.until,
            label: range.label,
        },
        summary: {
            commits: commitCount,
            prsOpened: createdPrs.length,
            prsMerged: mergedPrs.length,
            prsReviewed: reviewedPrs.length,
            issuesOpened: issues.length,
            releases: releaseCount,
            repos: repoList.length,
            events: filteredEvents.length,
            activeDays: activeDays.length,
            total:
                commitCount + createdPrs.length + mergedPrs.length + reviewedPrs.length + issues.length + releaseCount,
        },
        repos: repoList,
        reviews: reviewedPrs.map((item) => normalizeSearchPr(item, 'reviewed')),
        warnings,
        meta: {
            source: 'GitHub public events + search API',
            ignoredEventTypes: ignored.count,
            maxEvents,
        },
    };
}

function ghApi(apiPath, { paginate = false, slurp = false } = {}) {
    const args = ['api', apiPath];
    if (paginate) {
        args.push('--paginate');
    }
    if (slurp) {
        args.push('--slurp');
    }
    try {
        const output = execFileSync('gh', args, {
            encoding: 'utf8',
            env: process.env,
            maxBuffer: 64 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const parsed = JSON.parse(output || 'null');
        if (paginate && slurp && Array.isArray(parsed)) {
            return parsed.flat();
        }
        return parsed;
    } catch (error) {
        const stderr = error.stderr?.toString().trim();
        throw new Error(`gh api ${apiPath} 失败${stderr ? `：${stderr}` : ''}`);
    }
}

function searchIssues(query, perPage = 100) {
    const apiPath = `search/issues?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=updated&order=desc`;
    const result = ghApi(apiPath);
    return Array.isArray(result?.items) ? result.items : [];
}

// events/public 的 PushEvent 不带 commits 明细，按分支 head + 时间窗补拉。
// compare API 在 rebase/force-push 时会返回成百上千条历史提交，不适合周报。
function enrichPushEvents(events, user, range, warnings) {
    const cache = new Map();
    for (const event of events) {
        if (event.type !== 'PushEvent') {
            continue;
        }
        const repoName = event.repo?.name;
        const head = event.payload?.head;
        if (!repoName || !head) {
            continue;
        }
        const key = `${repoName}:${head}`;
        if (!cache.has(key)) {
            try {
                const commits = ghApi(
                    `repos/${repoName}/commits?sha=${encodeURIComponent(head)}&since=${encodeURIComponent(
                        range.since,
                    )}&until=${encodeURIComponent(range.until)}&per_page=100`,
                );
                const list = Array.isArray(commits) ? commits : [];
                if (list.length >= 100) {
                    warnings.push(`${repoName} 本周提交达到 100 条上限，可能有遗漏`);
                }
                cache.set(
                    key,
                    list
                        .filter((commit) => commit.author?.login === user || commit.commit?.author?.name === user)
                        .map((commit) => ({ sha: commit.sha, message: commit.commit?.message || '' })),
                );
            } catch (error) {
                warnings.push(`${repoName} 提交明细拉取失败：${error.message}`);
                cache.set(key, []);
            }
        }
        event.payload.commits = cache.get(key);
    }
}

export function collectActivity({ user, range, maxEvents = 300, excludeRepos = [] }) {
    const warnings = [];
    const rawEvents = ghApi(`users/${encodeURIComponent(user)}/events/public?per_page=100`, {
        paginate: true,
        slurp: true,
    });
    const events = Array.isArray(rawEvents) ? rawEvents : [];
    const eventsInRange = events.filter((event) => {
        const time = toMs(event.created_at);
        return time !== null && time >= range.sinceMs && time < range.untilMs;
    });

    enrichPushEvents(eventsInRange, user, range, warnings);

    const dateRange = `${range.sinceDate}..${range.untilDate}`;
    const createdPrs = searchIssues(`author:${user} type:pr created:${dateRange}`);
    const mergedPrs = searchIssues(`author:${user} type:pr merged:${dateRange}`);
    const reviewedPrs = searchIssues(`reviewed-by:${user} type:pr updated:${dateRange}`);
    const issues = searchIssues(`author:${user} type:issue created:${dateRange}`);

    const activity = buildActivity({
        user,
        range,
        events: eventsInRange,
        createdPrs,
        mergedPrs,
        reviewedPrs,
        issues,
        maxEvents,
        excludeRepos,
        warnings,
    });

    if (activity.summary.total === 0) {
        warnings.push('本周没有公开 GitHub 活动');
    }

    return activity;
}

function parseArgs(argv) {
    const args = { output: '', user: '', now: '', maxEvents: 0 };
    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        const next = argv[index + 1];
        if (current === '--output' && next) {
            args.output = next;
            index += 1;
        } else if (current === '--user' && next) {
            args.user = next;
            index += 1;
        } else if (current === '--now' && next) {
            args.now = next;
            index += 1;
        } else if (current === '--max-events' && next) {
            args.maxEvents = Number(next);
            index += 1;
        }
    }
    return args;
}

export function main() {
    const args = parseArgs(process.argv.slice(2));
    const config = loadConfig();
    const user = args.user || process.env.GITHUB_USER || config.githubUser;
    const range = getReportRange(args.now ? new Date(args.now) : new Date());
    const activity = collectActivity({
        user,
        range,
        maxEvents: args.maxEvents || config.maxEvents,
        excludeRepos: config.excludeRepos,
    });
    const json = `${JSON.stringify(activity, null, 2)}\n`;

    if (args.output) {
        fs.writeFileSync(args.output, json, 'utf8');
        console.log(`活动摘要已写入 ${args.output}`);
    } else {
        process.stdout.write(json);
    }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
    main();
}

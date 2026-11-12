import test from 'node:test';
import assert from 'node:assert/strict';

import { buildActivity, getReportRange, isoWeek } from './collect-github-activity.mjs';

const RANGE = getReportRange(new Date('2026-11-16T08:00:00+08:00'));

test('getReportRange 覆盖上一个完整的北京时间自然周', () => {
    assert.equal(RANGE.since, '2026-11-09T00:00:00+08:00');
    assert.equal(RANGE.until, '2026-11-16T00:00:00+08:00');
    assert.equal(RANGE.sinceDate, '2026-11-09');
    assert.equal(RANGE.untilDate, '2026-11-15');
    assert.equal(RANGE.label, '2026-W46');
    assert.equal(RANGE.publishDate, '2026-11-16T08:00:00+08:00');
});

test('isoWeek 处理跨年边界', () => {
    assert.deepEqual(isoWeek(2026, 10, 9), { year: 2026, week: 46 });
    assert.deepEqual(isoWeek(2027, 0, 1), { year: 2026, week: 53 });
});

function searchPr({ number, title, url, repo, mergedAt = null, state = 'open' }) {
    return {
        number,
        title,
        html_url: url,
        repository_url: `https://api.github.com/repos/${repo}`,
        state,
        draft: false,
        created_at: '2026-11-10T10:00:00Z',
        updated_at: '2026-11-12T10:00:00Z',
        closed_at: mergedAt,
        pull_request: mergedAt ? { merged_at: mergedAt } : undefined,
    };
}

test('buildActivity 归并事件与搜索数据，并过滤范围外/排除仓库', () => {
    const events = [
        {
            type: 'PushEvent',
            created_at: '2026-11-10T02:00:00Z',
            repo: { name: 'demo/repo' },
            payload: {
                ref: 'refs/heads/main',
                size: 1,
                distinct_size: 1,
                commits: [{ sha: 'a1', message: 'feat: 第一行\n\n正文' }],
            },
        },
        {
            type: 'PullRequestEvent',
            created_at: '2026-11-10T03:00:00Z',
            repo: { name: 'demo/repo' },
            payload: {
                action: 'opened',
                pull_request: {
                    number: 7,
                    title: 'Add weekly report',
                    html_url: 'https://github.com/demo/repo/pull/7',
                    state: 'open',
                    draft: false,
                    created_at: '2026-11-10T03:00:00Z',
                    updated_at: '2026-11-10T03:00:00Z',
                    merged_at: null,
                },
            },
        },
        {
            type: 'ReleaseEvent',
            created_at: '2026-11-11T03:00:00Z',
            repo: { name: 'demo/repo' },
            payload: {
                action: 'published',
                release: {
                    tag_name: 'v1.0.0',
                    name: 'v1.0.0',
                    html_url: 'https://github.com/demo/repo/releases/tag/v1.0.0',
                    published_at: '2026-11-11T03:00:00Z',
                },
            },
        },
        {
            type: 'PushEvent',
            created_at: '2026-11-01T03:00:00Z',
            repo: { name: 'demo/repo' },
            payload: { commits: [{ sha: 'old', message: '范围外' }] },
        },
        {
            type: 'PushEvent',
            created_at: '2026-11-10T03:00:00Z',
            repo: { name: 'excluded/repo' },
            payload: { commits: [{ sha: 'x1', message: '被排除' }] },
        },
    ];

    const activity = buildActivity({
        user: 'tester',
        range: RANGE,
        events,
        createdPrs: [
            searchPr({
                number: 8,
                title: 'New feature',
                url: 'https://github.com/demo/repo/pull/8',
                repo: 'demo/repo',
            }),
        ],
        mergedPrs: [
            searchPr({
                number: 7,
                title: 'Add weekly report',
                url: 'https://github.com/demo/repo/pull/7',
                repo: 'demo/repo',
                mergedAt: '2026-11-12T10:00:00Z',
                state: 'closed',
            }),
        ],
        reviewedPrs: [
            searchPr({
                number: 9,
                title: 'Reviewed PR',
                url: 'https://github.com/other/repo/pull/9',
                repo: 'other/repo',
            }),
        ],
        issues: [
            {
                number: 3,
                title: 'Bug report',
                html_url: 'https://github.com/other/repo/issues/3',
                repository_url: 'https://api.github.com/repos/other/repo',
                state: 'open',
                created_at: '2026-11-10T10:00:00Z',
                updated_at: '2026-11-10T10:00:00Z',
                closed_at: null,
            },
        ],
        excludeRepos: ['excluded/repo'],
    });

    assert.equal(activity.summary.commits, 1);
    assert.equal(activity.summary.prsOpened, 1);
    assert.equal(activity.summary.prsMerged, 1);
    assert.equal(activity.summary.prsReviewed, 1);
    assert.equal(activity.summary.issuesOpened, 1);
    assert.equal(activity.summary.releases, 1);
    assert.equal(activity.summary.repos, 2);

    const demo = activity.repos.find((repo) => repo.name === 'demo/repo');
    const mergedPr = demo.pullRequests.find((pr) => pr.number === 7);
    assert.ok(mergedPr.roles.includes('opened'));
    assert.ok(mergedPr.roles.includes('merged'));
    assert.equal(demo.commits[0].message, 'feat: 第一行');
    assert.equal(activity.reviews.length, 1);
});

test('buildActivity 在 events 达到上限时给出警告', () => {
    const events = Array.from({ length: 5 }, (_, index) => ({
        type: 'PushEvent',
        created_at: '2026-11-10T02:00:00Z',
        repo: { name: 'demo/repo' },
        payload: { commits: [{ sha: `sha-${index}`, message: `commit ${index}` }] },
    }));
    const activity = buildActivity({
        user: 'tester',
        range: RANGE,
        events,
        maxEvents: 3,
    });
    assert.equal(activity.summary.commits, 3);
    assert.ok(activity.warnings.some((warning) => warning.includes('events 达到上限')));
});

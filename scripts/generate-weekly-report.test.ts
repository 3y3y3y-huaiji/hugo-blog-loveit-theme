import test from 'node:test';
import assert from 'node:assert/strict';

import { buildActivityDigest, parseReportOutput } from './generate-weekly-report.js';

const GOOD_BODY = '这周我把周报流水线接上了。'.repeat(80);

test('parseReportOutput 读取 TITLE / DESCRIPTION / BODY 标记', () => {
    const report = parseReportOutput(`TITLE: 这周终于把周报流水线接上了
DESCRIPTION: 一周的折腾记录，主要是 GitHub 活动采集和 OpenCode 接入。
BODY:
${GOOD_BODY}
END_OF_REPORT
`);
    assert.equal(report.title, '这周终于把周报流水线接上了');
    assert.match(report.description, /OpenCode/);
    assert.equal(report.body, GOOD_BODY);
});

test('parseReportOutput 兼容代码块与加粗标记', () => {
    const report = parseReportOutput(`\`\`\`markdown
**TITLE:** 标题
**DESCRIPTION:** 摘要
**BODY:**
${GOOD_BODY}
END_OF_REPORT
\`\`\``);
    assert.equal(report.title, '标题');
    assert.equal(report.description, '摘要');
    assert.equal(report.body, GOOD_BODY);
});

test('parseReportOutput 在缺少标记或正文过短时失败', () => {
    assert.throws(() => parseReportOutput('只有一段没有标记的正文'), /缺少 TITLE/);
    assert.throws(() => parseReportOutput('TITLE: 标题\nDESCRIPTION: 摘要\nBODY:\n太短\nEND_OF_REPORT'), /正文过短/);
});

test('buildActivityDigest 折叠重复提交并按活跃度排序主战场仓库', () => {
    const digest = buildActivityDigest({
        range: { since: '2026-11-02T00:00:00+08:00', until: '2026-11-09T00:00:00+08:00', label: '2026-W45' },
        summary: { total: 5 },
        repos: [
            {
                name: 'user/small-repo',
                url: 'https://github.com/user/small-repo',
                commits: [{ sha: 'aaa', message: 'chore: tweak', url: 'https://example.com/aaa', date: '2026-11-03' }],
                pullRequests: [],
                issues: [],
                releases: [],
            },
            {
                name: 'user/main-repo',
                url: 'https://github.com/user/main-repo',
                commits: [
                    { sha: '111', message: 'fix: scalar width', url: 'https://example.com/111', date: '2026-11-03' },
                    { sha: '222', message: 'fix: scalar width', url: 'https://example.com/222', date: '2026-11-04' },
                    { sha: '333', message: 'test: add cases', url: 'https://example.com/333', date: '2026-11-05' },
                ],
                pullRequests: [{ number: 12, title: 'Fix width' }],
                issues: [],
                releases: [],
            },
        ],
        reviews: [],
        warnings: [],
    });

    assert.equal(digest.rankedRepos[0].name, 'user/main-repo');
    assert.equal(digest.rankedRepos[0].tier, 'primary');
    assert.equal(digest.rankedRepos[0].rawCommitCount, 3);
    assert.equal(digest.rankedRepos[0].dedupedCommits.length, 2);
    assert.equal(digest.rankedRepos[0].dedupedCommits[0].repeatCount, 2);
    assert.equal(digest.rankedRepos[0].dedupedCommits[0].sha, '222');
});

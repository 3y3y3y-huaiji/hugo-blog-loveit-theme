import test from 'node:test';
import assert from 'node:assert/strict';

import { parseReportOutput } from './generate-weekly-report.js';

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

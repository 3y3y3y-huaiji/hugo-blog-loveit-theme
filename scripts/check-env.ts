#!/usr/bin/env node
// 打印实际环境与项目依赖版本，用于核对 README 的「环境基线」，避免文档靠猜。

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { ROOT } from './root.js';

function commandVersion(commandLine: string): string {
    try {
        return execSync(commandLine, {
            encoding: 'utf8',
            env: process.env,
            stdio: ['ignore', 'pipe', 'ignore'],
        })
            .trim()
            .split('\n')[0];
    } catch {
        return 'NOT FOUND';
    }
}

function packageVersion(name: string): string {
    const packageJson = path.join(ROOT, 'node_modules', name, 'package.json');
    if (!fs.existsSync(packageJson)) {
        return 'NOT INSTALLED';
    }
    return JSON.parse(fs.readFileSync(packageJson, 'utf8')).version;
}

function readText(fileName: string): string {
    const filePath = path.join(ROOT, fileName);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : 'MISSING';
}

const rows: Array<[string, string]> = [
    ['OS', `${os.type()} ${os.release()} (${os.arch()})`],
    ['PowerShell', commandVersion('pwsh -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"')],
    ['Node.js', process.version],
    ['npm', commandVersion('npm -v')],
    ['pnpm', commandVersion('pnpm -v')],
    ['Git', commandVersion('git --version')],
    ['GitHub CLI', commandVersion('gh --version')],
    ['Hugo', commandVersion('hugo version')],
    ['OpenCode', commandVersion('opencode --version')],
    ['npm registry', commandVersion('npm config get registry')],
    ['Babel', packageVersion('@babel/core')],
    ['TypeScript', packageVersion('typescript')],
    ['ESLint', packageVersion('eslint')],
    ['Prettier', packageVersion('prettier')],
    ['typescript-eslint', packageVersion('typescript-eslint')],
    ['wrangler', packageVersion('wrangler')],
    ['dotenv', packageVersion('dotenv')],
    [
        'packageManager',
        readText('package.json') === 'MISSING' ? 'MISSING' : JSON.parse(readText('package.json')).packageManager,
    ],
    ['.node-version', readText('.node-version')],
    ['.ci-node-version', readText('.ci-node-version')],
    ['.hugo-version', readText('.hugo-version')],
];

const width = Math.max(...rows.map(([name]) => name.length));
for (const [name, value] of rows) {
    console.log(`${name.padEnd(width)}  ${value}`);
}

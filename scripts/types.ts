export interface WeeklyConfig {
    githubUser: string;
    maxEvents: number;
    excludeRepos: string[];
    model: string;
}

export interface ReportRange {
    since: string;
    until: string;
    sinceMs: number;
    untilMs: number;
    sinceDate: string;
    untilDate: string;
    isoYear: number;
    isoWeek: number;
    label: string;
    publishDate: string;
}

export interface PostInput {
    fileName: string;
    raw: string;
}

export interface FrontMatter {
    format: 'toml' | 'yaml';
    data: string;
    body: string;
}

export interface ReportOutput {
    title: string;
    description: string;
    body: string;
}

// GitHub REST/Search API 返回结构动态，集中在此处隔离 any。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiRecord = Record<string, any>;

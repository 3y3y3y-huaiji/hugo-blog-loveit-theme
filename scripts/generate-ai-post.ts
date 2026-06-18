import * as fs from 'fs';
import * as path from 'path';
import Parser from 'rss-parser';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// 加载本地环境变量 (.env 文件)
dotenv.config();

// 指定的 4 大大模型列表
const MODEL_POOL = [
  "deepseek-ai/deepseek-v4-pro",
  "minimaxai/minimax-m3",
  "moonshotai/kimi-k2.6",
  "z-ai/glm-5.1"
];

// 科技热点 RSS 订阅源
const RSS_FEEDS = [
  "https://sspai.com/feed",                   // 少数派
  "https://www.solidot.org/index.rss",        // Solidot 奇客
  "https://news.ycombinator.com/rss",         // Hacker News
  "https://techcrunch.com/feed/",             // TechCrunch
  "https://36kr.com/feed",                    // 36氪
  "https://www.ithome.com/rss/",              // IT之家
  "https://www.theverge.com/rss/index.xml",   // The Verge
  "https://www.wired.com/feed/rss",           // Wired
  "https://feed.infoq.com/",                  // InfoQ
  "https://www.geekpark.net/rss"              // 极客公园
];

// 默认备用热点主题 (如果 RSS 抓取失败)
const FALLBACK_TOPICS = [
  { title: "大语言模型的轻量化趋势与端侧部署实践", snippet: "探讨近年来 Llama, Gemma, Phi 等端侧模型的发展及其在手机和PC端的本地化部署方案" },
  { title: "AI Agent（智能体）在企业工作流中的演进与挑战", snippet: "分析 Multi-Agent 多智能体协同系统在业务场景中的落地障碍与主流解决框架" },
  { title: "深度推理模型（如 DeepSeek R1）的强化学习技术解析", snippet: "剖析基于规则与自我博弈的强化学习在让 AI 具备 logic 推理和深思熟虑能力方面的作用" },
  { title: "跨平台框架与 Web GPU 的发展对前端渲染带来的变革", snippet: "探讨 WebGPU 规范如何赋予浏览器直接调用硬件 GPU 的能力，加速前端 AI 渲染推理" }
];

async function getHotTopic(): Promise<{ title: string; snippet: string }> {
  const parser = new Parser();
  console.log("正在尝试抓取科技 RSS 订阅源以获取热点资讯...");
  
  // 随机打乱订阅源顺序，防止每次都首选同一个网站的热点
  const shuffledFeeds = [...RSS_FEEDS].sort(() => Math.random() - 0.5);
  
  for (const url of shuffledFeeds) {
    try {
      console.log(`正在读取订阅源: ${url}`);
      const feed = await parser.parseURL(url);
      const items = feed.items.filter(item => item.title);
      if (items.length > 0) {
        // 随机选择一条资讯
        const randomIndex = Math.floor(Math.random() * Math.min(items.length, 10));
        const item = items[randomIndex];
        console.log(`成功从 RSS 源获取热点：【${item.title}】`);
        return {
          title: item.title || "未知热点",
          snippet: item.contentSnippet || item.content || "暂无相关详细简述"
        };
      }
    } catch (error) {
      console.warn(`读取订阅源 ${url} 失败:`, (error as Error).message);
    }
  }

  // RSS 全部抓取失败时的安全降级
  console.log("所有 RSS 订阅源获取失败，启用内置的备用科技热点...");
  const randomIndex = Math.floor(Math.random() * FALLBACK_TOPICS.length);
  return FALLBACK_TOPICS[randomIndex];
}

async function main() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error("错误：未检测到环境变量 NVIDIA_API_KEY，无法调用 API。");
    process.exit(1);
  }

  // 1. 获取热点话题
  const topic = await getHotTopic();

  // 2. 准备大模型候选池并随机打乱顺序（实现随机首选 + 自动顺序回退）
  const shuffledModels = [...MODEL_POOL].sort(() => Math.random() - 0.5);
  console.log(`大模型候选顺序已生成：${shuffledModels.map(m => m.split('/').pop()).join(' -> ')}`);

  // 3. 初始化 OpenAI 兼容的 NVIDIA API 客户端 (设置 2 分钟超时和最多 1 次重试以防长时间挂起)
  const openai = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: apiKey,
    timeout: 120 * 1000,
    maxRetries: 1
  });

  const prompt = `你是一个资深的科技博客作家。请针对以下科技动态/热点话题，撰写一篇深入、专业且富有趣味性的中文分析博客文章。

话题标题: ${topic.title}
话题背景简述: ${topic.snippet}

请严格遵守以下输出格式：
第一行：文章的中文标题（不要包含 markdown 格式，只写标题文本）
第二行：一行文章摘要/描述，字数在150字以内
从第三行开始：文章的详细正文，使用 Markdown 格式。正文应包含：
- 引人入胜的导言
- 深度技术分析或多角度思考
- 清晰的排版，配合恰当的 Markdown 小标题 (##, ###)
- 若涉及代码，请务必写出高亮格式的代码块（如 \`\`\`typescript, \`\`\`go 等）
- 总结与对未来的展望

注意：绝对不要在你的输出中包含任何 \`\`\`toml 或 \`\`\`yaml 等 Hugo 前置元数据代码块，也不要输出任何前置注释。直接输出文章标题和摘要。`;

  try {
    let response = null;
    let selectedModel = "";

    for (const model of shuffledModels) {
      selectedModel = model;
      console.log(`正在向 NVIDIA API 提交撰写请求，尝试模型: 【${selectedModel}】...`);
      try {
        response = await openai.chat.completions.create({
          model: selectedModel,
          messages: [
            { role: 'system', content: '你是一位富有洞察力的前沿技术博主，精通前沿软件开发、大模型、AI、云计算等技术。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4096
        });
        console.log(`模型 【${selectedModel}】 响应成功！`);
        break;
      } catch (error) {
        console.warn(`模型 【${selectedModel}】 调用失败: ${(error as Error).message}。将尝试下一个备用模型...`);
      }
    }

    if (!response) {
      throw new Error("所有候选大模型均调用失败，无法生成博文。");
    }

    const output = response.choices[0]?.message?.content;
    if (!output) {
      throw new Error("模型响应内容为空");
    }

    // 4. 解析模型输出，分离标题、摘要和正文
    const rawLines = output.trim().split('\n');
    // 跳过开头的空行
    const lines = rawLines.filter((line, idx) => {
      if (idx === 0 && line.trim() === '') return false;
      // 找到第一行非空内容后保留所有行
      return true;
    });
    // 去除首行可能的 Markdown 标题符号、引号等
    const cleanLine = (s: string) => s.replace(/^(#+\s*|[【「]|"|")|("|$|[」】]|["'])$/g, '').trim();

    let title = cleanLine(lines[0] || '');
    let summary = (lines[1] || '').trim();
    let contentStartLine = 2;

    // 如果首行解析后为空或首行仍是空行，尝试后续行
    if (!title) {
      for (let i = 1; i < Math.min(lines.length, 5); i++) {
        const candidate = cleanLine(lines[i]);
        if (candidate) {
          title = candidate;
          summary = (lines[i + 1] || '').trim();
          contentStartLine = i + 2;
          break;
        }
      }
    }
    // 最终兜底
    if (!title) {
      title = topic.title;
      summary = topic.snippet;
      contentStartLine = 0;
    }

    // 提取正文内容
    let bodyContent = lines.slice(contentStartLine).join('\n').trim();

    // 移除正文开头可能被模型重复输出的 Markdown 标题
    if (bodyContent.startsWith('# ')) {
      const nextNewLine = bodyContent.indexOf('\n');
      if (nextNewLine !== -1) {
        bodyContent = bodyContent.substring(nextNewLine).trim();
      }
    }

    // 格式化输出文件名和日期（使用北京时间 UTC+8）
    const now = new Date();
    const bjOffset = 8 * 60 * 60 * 1000;
    const bjDate = new Date(now.getTime() + bjOffset);
    const isoDateStr = bjDate.toISOString().replace('Z', '+08:00');
    const fileNameDate = bjDate.getUTCFullYear() + '-' + String(bjDate.getUTCMonth() + 1).padStart(2, '0') + '-' + String(bjDate.getUTCDate()).padStart(2, '0');
    
    // 生成干净的文件名（保留中文，去除特殊符号）
    const safeTitle = title.replace(/[\\\/:*?"<>|\n\r]/g, '').substring(0, 30).trim() || 'ai-post';
    const postFileName = `ai-generated-${fileNameDate}-${safeTitle}.md`;
    const postFilePath = path.join(__dirname, '../content/posts', postFileName);

    // 5. 拼装符合 Hugo TOML 规范的 Front Matter 以及模型署名后缀
    const tomlFrontMatter = `+++
title = "${title.replace(/"/g, '\\"')}"
date = ${isoDateStr}
draft = false
tags = ["AI Generated", "${selectedModel.split('/').pop()}"]
categories = ["AI博客", "前沿技术"]
description = "${summary.replace(/"/g, '\\"')}"
author = "AI Writer"
+++

${bodyContent}

---

*本文由 NVIDIA API Catalog 托管的 **${selectedModel}** 模型自动撰写并生成发布。*
`;

    // 6. 写入文件到 posts 目录
    const postsDir = path.dirname(postFilePath);
    if (!fs.existsSync(postsDir)) {
      fs.mkdirSync(postsDir, { recursive: true });
    }

    fs.writeFileSync(postFilePath, tomlFrontMatter, 'utf8');
    console.log(`\n🎉 自动博文撰写成功！`);
    console.log(`生成文件: ${postFilePath}`);
    console.log(`文章标题: ${title}`);
    console.log(`撰写模型: ${selectedModel}`);
  } catch (error) {
    console.error("调用大模型写入博客文章失败:", (error as Error).message);
    process.exit(1);
  }
}

main();

import * as fs from 'fs';
import * as path from 'path';
import Parser from 'rss-parser';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// 加载本地环境变量 (.env 文件)
dotenv.config();

// 指定的 5 大大模型列表
const MODEL_POOL = [
  "deepseek-ai/deepseek-v4-pro",
  "minimaxai/minimax-m3",
  "moonshotai/kimi-k2.6",
  "z-ai/glm-5.1",
  "google/gemma-4-31b-it"
];

// 科技热点 RSS 订阅源
const RSS_FEEDS = [
  "https://sspai.com/feed",                   // 少数派
  "https://www.solidot.org/index.rss",        // Solidot 奇客
  "https://news.ycombinator.com/rss",         // Hacker News
  "https://techcrunch.com/feed/"              // TechCrunch
];

// 默认备用热点主题 (如果 RSS 抓取失败)
const FALLBACK_TOPICS = [
  { title: "大语言模型的轻量化趋势与端侧部署实践", snippet: "探讨近年来 Llama, Gemma, Phi 等端侧模型的发展及其在手机和PC端的本地化部署方案" },
  { title: "AI Agent（智能体）在企业工作流中的演进与挑战", snippet: "分析 Multi-Agent 多智能体协同系统在业务场景中的落地障碍与主流解决框架" },
  { title: "深度推理模型（如 DeepSeek R1）的强化学习技术解析", snippet: "剖析基于规则与自我博弈的强化学习在让 AI 具备逻辑推理和深思熟虑能力方面的作用" },
  { title: "跨平台框架与 Web GPU 的发展对前端渲染带来的变革", snippet: "探讨 WebGPU 规范如何赋予浏览器直接调用硬件 GPU 的能力，加速前端 AI 渲染推理" }
];

async function getHotTopic(): Promise<{ title: string; snippet: string }> {
  const parser = new Parser();
  console.log("正在尝试抓取科技 RSS 订阅源以获取热点资讯...");
  
  for (const url of RSS_FEEDS) {
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

  // 2. 随机选择大模型
  const selectedModel = MODEL_POOL[Math.floor(Math.random() * MODEL_POOL.length)];
  console.log(`本次博客撰写由大模型资源池随机指派，选中模型：【${selectedModel}】`);

  // 3. 初始化 OpenAI 兼容的 NVIDIA API 客户端
  const openai = new OpenAI({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    apiKey: apiKey
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

  console.log(`正在向 NVIDIA API 提交撰写请求，模型: ${selectedModel} ...`);
  
  try {
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: '你是一位富有洞察力的前沿技术博主，精通前沿软件开发、大模型、AI、云计算等技术。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2548
    });

    const output = response.choices[0]?.message?.content;
    if (!output) {
      throw new Error("模型响应内容为空");
    }

    // 4. 解析模型输出，分离标题、摘要和正文
    const lines = output.trim().split('\n');
    let title = lines[0].replace(/^(#+\s*|【|“|")|("|$|”|】)$/g, '').trim();
    let summary = lines[1].trim();
    let contentStartLine = 2;

    // 如果首行为空，寻找下一行作为标题
    if (!title && lines.length > 1) {
      title = lines[1].replace(/^(#+\s*|【|“|")|("|$|”|】)$/g, '').trim();
      summary = lines[2] ? lines[2].trim() : "";
      contentStartLine = 3;
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

    // 格式化输出文件名和日期
    const now = new Date();
    const isoDateStr = now.toISOString(); // yyyy-mm-ddThh:mm:ss.sssZ
    const fileNameDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    // 生成安全的文件名
    const safeTitle = title.replace(/[\\\/:*?"<>|]/g, '').substring(0, 30).trim() || 'ai-post';
    const postFileName = `ai-generated-${fileNameDate}-${encodeURIComponent(safeTitle).substring(0, 20)}.md`;
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

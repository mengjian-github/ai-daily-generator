import { NextResponse } from "next/server";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_ENDPOINT, isOpenRouterEnabled } from "@/config/openrouter";
import { articleToMarkdown, buildTemplateArticle, CLOSE_LEAD, INTRO_LEAD } from "@/lib/articleBuilder";
import { GeneratedArticle, Topic } from "@/types/news";

const PLACEHOLDER_IMAGE_PATTERN = /placehold\.co/i;

interface GeneratePayload {
    topics: Topic[];
    useLLM?: boolean;
}

interface OpenRouterResponse {
    choices?: Array<{
        message?: {
            content?: string | Array<{ type: string; text: string }>;
        };
    }>;
}

type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

function sanitizeTopics(topics: Topic[]): Topic[] {
    return topics.map((topic) => {
        const sanitized: Topic = {
            id: topic.id,
            title: topic.title,
            summary: topic.summary,
            url: "",
            image: topic.image && !PLACEHOLDER_IMAGE_PATTERN.test(topic.image) ? topic.image : "",
            video: undefined,
            sourceUrl: topic.sourceUrl,
            publishedAt: topic.publishedAt
        };

        if (topic.url && topic.url.trim()) {
            sanitized.url = topic.url.trim();
        }

        return sanitized;
    });
}

function extractArticleFromMarkdown(markdown: string): GeneratedArticle {
    const lines = markdown.split(/\r?\n/);
    let title = "今日 AI 观察";
    let subtitle: string | undefined;
    let heroImage: string | undefined;
    const blocks: GeneratedArticle["blocks"] = [];
    const paragraphBuffer: string[] = [];
    let listBuffer: string[] | null = null;
    let listOrdered = false;

    function flushParagraph() {
        if (paragraphBuffer.length === 0) return;
        const content = paragraphBuffer.join("\n").trim();
        if (content) {
            blocks.push({
                type: "paragraph",
                content
            });
        }
        paragraphBuffer.length = 0;
    }

    function flushList() {
        if (!listBuffer || listBuffer.length === 0) return;
        blocks.push({
            type: "list",
            style: listOrdered ? "ordered" : "unordered",
            items: listBuffer
        });
        listBuffer = null;
        listOrdered = false;
    }

    function flushAll() {
        flushParagraph();
        flushList();
    }

    for (const line of lines) {
        const trimmedLine = line.trimEnd();
        if (line.startsWith("# ")) {
            flushAll();
            title = trimmedLine.replace(/^#\s*/, "").trim();
            continue;
        }
        if (trimmedLine.startsWith("_") && trimmedLine.endsWith("_") && trimmedLine.length > 2 && !subtitle) {
            flushAll();
            subtitle = trimmedLine.slice(1, -1).trim();
            continue;
        }
        const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (imageMatch) {
            const [, altText, url] = imageMatch;
            const resolvedUrl = url.trim();
            if (!heroImage) {
                heroImage = resolvedUrl;
            }
            flushParagraph();
            flushList();
            blocks.push({
                type: "image",
                url: resolvedUrl,
                alt: altText?.trim() || undefined,
                caption: altText?.trim() || undefined
            });
            continue;
        }
        if (!trimmedLine) {
            flushAll();
            continue;
        }

        if (trimmedLine.startsWith("## ")) {
            flushAll();
            blocks.push({
                type: "heading",
                level: 2,
                content: trimmedLine.replace(/^##\s*/, "").trim()
            });
            continue;
        }

        if (trimmedLine.startsWith("### ")) {
            flushAll();
            blocks.push({
                type: "heading",
                level: 3,
                content: trimmedLine.replace(/^###\s*/, "").trim()
            });
            continue;
        }

        if (trimmedLine.startsWith(">")) {
            flushAll();
            blocks.push({
                type: "quote",
                content: trimmedLine.replace(/^>\s?/, "").trim()
            });
            continue;
        }

        const orderedMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
        if (orderedMatch) {
            flushParagraph();
            const item = orderedMatch[1].trim();
            if (!listBuffer) {
                listBuffer = [];
                listOrdered = true;
            }
            if (!listOrdered) {
                flushList();
                listBuffer = [];
                listOrdered = true;
            }
            listBuffer.push(item);
            continue;
        }

        const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.*)$/);
        if (unorderedMatch) {
            flushParagraph();
            const item = unorderedMatch[1].trim();
            if (!listBuffer) {
                listBuffer = [];
                listOrdered = false;
            }
            if (listOrdered) {
                flushList();
                listBuffer = [];
                listOrdered = false;
            }
            listBuffer.push(item);
            continue;
        }

        paragraphBuffer.push(trimmedLine);
    }

    flushAll();

    const now = new Date();
    const fallback = buildTemplateArticle([]);
    const excerptParagraph = blocks.find((block) => block.type === "paragraph") as { content: string } | undefined;

    const hasClosing = blocks.some(
        (block) => block.type === "paragraph" && block.content.includes(CLOSE_LEAD)
    );
    if (!hasClosing) {
        blocks.push({
            type: "paragraph",
            content: CLOSE_LEAD
        });
    }

    return {
        ...fallback,
        title,
        subtitle,
        heroImage,
        excerpt: subtitle ?? excerptParagraph?.content ?? fallback.excerpt,
        publishedAt: new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(now),
        blocks: blocks.length > 0 ? blocks : fallback.blocks,
        sources: []
    };
}

interface OpenRouterResult {
    article: GeneratedArticle | null;
    error?: string;
}

async function sendOpenRouter(messages: ChatMessage[], maxTokens = 4000): Promise<{ content?: string; error?: string; raw?: string }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return {
            error: "OPENROUTER_API_KEY 未配置，无法调用 DeepSeek。"
        };
    }

    const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
            "X-Title": process.env.OPENROUTER_APP_TITLE ?? "AI Daily Generator"
        },
        body: JSON.stringify({
            model: DEFAULT_OPENROUTER_MODEL,
            temperature: 0.3,
            max_tokens: maxTokens,
            messages
        })
    });

    const rawText = await response.text();

    if (!response.ok) {
        const message = `OpenRouter API error ${response.status}: ${rawText.slice(0, 500)}`;
        console.error(message);
        return {
            error: message,
            raw: rawText
        };
    }

    let data: OpenRouterResponse;
    try {
        data = JSON.parse(rawText) as OpenRouterResponse;
    } catch (error) {
        console.error("Failed to parse OpenRouter response as JSON:", error, rawText.slice(0, 500));
        return {
            error: "OpenRouter 返回数据解析失败，请查看服务器日志。",
            raw: rawText
        };
    }

    const message = data.choices?.[0]?.message;
    if (!message) {
        console.error("OpenRouter response missing message:", rawText.slice(0, 500));
        return {
            error: "OpenRouter 未返回内容，请稍后重试。",
            raw: rawText
        };
    }

    let content = "";
    if (typeof message.content === "string") {
        content = message.content;
    } else if (Array.isArray(message.content)) {
        content = message.content.map((segment) => segment.text ?? "").join("");
    }

    if (!content.trim()) {
        console.error("OpenRouter returned empty content:", rawText.slice(0, 500));
        return {
            error: "OpenRouter 返回空白内容，请稍后重试。",
            raw: rawText
        };
    }

    return { content: content.trim(), raw: rawText };
}

async function callOpenRouter(markdownPrompt: string): Promise<OpenRouterResult> {
    const baseMessages: ChatMessage[] = [
        {
            role: "system",
            content: [
                "你是一位资深的中文科技媒体主笔，擅长用微信公众号文章风格写 AI 日报。",
                "请根据我提供的素材产出一篇完整的微信风格稿件，包含标题、导语、分段小标题、结尾金句。",
                `开篇第一句必须写“${INTRO_LEAD}”，全文保持真诚、客观、理性的表达，专注于事件本身的价值、风险与影响，句子宜短、贴近日常口语。`,
                "每个句子单独成段，用空行分隔，确保阅读节奏干净。",
                "严禁在文章中保留原文链接或引用原始 URL。",
                `全文需要以“${CLOSE_LEAD}”结尾。`,
                "请确保文章结构清晰，逻辑顺畅，以数据、事实和思考支撑观点，避免夸张语气与营销化措辞。",
                "输出必须是 Markdown，第一行是标题（# 开头），第二行可选写一句副标题。"
            ].join("\n")
        },
        { role: "user", content: markdownPrompt }
    ];

    const first = await sendOpenRouter(baseMessages);
    if (first.error) {
        return {
            article: null,
            error: first.error
        };
    }
    let combined = first.content ?? "";

    if (!combined.includes(CLOSE_LEAD)) {
        const continuationMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "assistant", content: combined },
            {
                role: "user",
                content: `请延续上文，补完尚未完成的部分，直到以“${CLOSE_LEAD}”收束。只输出续写内容，不要重复已写段落。`
            }
        ];
        const continuation = await sendOpenRouter(continuationMessages, 1200);
        if (continuation.content) {
            combined = `${combined}\n\n${continuation.content.trim()}`;
        } else if (continuation.error) {
            return {
                article: null,
                error: continuation.error
            };
        }
    }

    try {
        return {
            article: extractArticleFromMarkdown(combined.trim())
        };
    } catch (error) {
        console.error("Failed to extract article from markdown:", error);
        return {
            article: null,
            error: "解析模型生成的 Markdown 时出错，请查看服务器日志。"
        };
    }
}

function buildLLMPrompt(topics: Topic[]): string {
    const sanitizedTopics = sanitizeTopics(topics);
    const topicSection = sanitizedTopics
        .map((topic, index) => {
            const segments = [
                `### 选题 ${index + 1}：${topic.title}`,
                topic.publishedAt ? `发布时间：${topic.publishedAt}` : "",
                topic.image ? `配图地址：${topic.image}` : "",
                topic.summary ? `素材摘要：\n${topic.summary}` : ""
            ].filter(Boolean);
            return segments.join("\n");
        })
        .join("\n\n");

    return [
        "以下是我筛选后的资讯素材，请据此创作一篇完整的 AI 日报文章：",
        topicSection,
        "写作要求：",
        "- 文章必须是原创，不能照搬素材原文段落或列出外部链接。",
        `- 开篇第一句必须写“${INTRO_LEAD}”，整体保持真诚、客观、理性的科技评论语气。`,
        "- 先写一段导语，总结当天 AI 领域的核心议题与对行业的实际价值或影响。",
        "- 按素材顺序撰写正文，每个主题以“## 小标题”开头，后接 2-3 段叙述，强调事实、价值判断、潜在风险或机会，可穿插简洁要点列表。",
        "- 正文句子宜短且直接，贴近日常表达，每个句子独立成段，并用空行分隔。",
        "- 若素材提供“配图地址”，请在对应段落中插入 Markdown 图片（示例：`![说明](URL)`），说明可结合主题亮点。",
        `- 结尾需包含一句“${CLOSE_LEAD}”，并回顾当天的核心收获或需要跟进的要点。`,
        "- 用词保持克制，禁止夸张、营销或 emoji 表述。",
        "- 严禁输出任何 URL、二维码提示或引导读者点击链接。",
        "- 输出为 Markdown 格式。"
    ].join("\n\n");
}

export async function GET() {
    return NextResponse.json({
        openRouterEnabled: isOpenRouterEnabled(),
        model: DEFAULT_OPENROUTER_MODEL
    });
}

export async function POST(request: Request) {
    try {
        const payload = (await request.json()) as GeneratePayload;
        if (!payload.topics || payload.topics.length === 0) {
            return NextResponse.json(
                { error: "请至少选择一条资讯再生成日报。" },
                { status: 400 }
            );
        }

        const baseArticle = buildTemplateArticle(payload.topics);

        if (!payload.useLLM) {
            return NextResponse.json({
                article: baseArticle,
                markdown: articleToMarkdown(baseArticle),
                llmUsed: false
            });
        }

        if (!isOpenRouterEnabled()) {
            return NextResponse.json(
                {
                    error: "未配置 OPENROUTER_API_KEY，无法调用 LLM。",
                    article: baseArticle,
                    markdown: articleToMarkdown(baseArticle),
                    llmUsed: false
                },
                { status: 400 }
            );
        }

        const prompt = buildLLMPrompt(payload.topics);
        const { article: llmArticle, error: llmError } = await callOpenRouter(prompt);

        if (!llmArticle) {
            const message =
                llmError ??
                "调用 LLM 生成文章失败，已返回模板稿。";
            return NextResponse.json(
                {
                    error: message,
                    article: baseArticle,
                    markdown: articleToMarkdown(baseArticle),
                    llmUsed: false
                },
                { status: 502 }
            );
        }

        return NextResponse.json({
            article: llmArticle,
            markdown: articleToMarkdown(llmArticle),
            llmUsed: true
        });
    } catch (error) {
        console.error("Generate article error:", error);
        return NextResponse.json(
            { error: "生成日报时出现问题，请稍后再试。" },
            { status: 500 }
        );
    }
}

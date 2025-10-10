import { ArticleBlock, GeneratedArticle, Topic } from "@/types/news";

const PLACEHOLDER_PATTERN = /placehold\.co/i;

export const INTRO_LEAD = "大家好，我是孟健。";
export const CLOSE_LEAD = "今天关注的大事件就到这里，我们继续跟进它们对行业的实际影响。";

function splitIntoSentences(paragraph: string): string[] {
    const result: string[] = [];
    const parts = paragraph
        .split(/(?<=[。！？!?\.])\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
    parts.forEach((part) => {
        result.push(part);
    });
    if (result.length === 0) {
        result.push(paragraph.trim());
    }
    return result;
}

function getPublishedAt(date = new Date()): string {
    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short"
    }).format(date);
}

function sanitizeSummary(summary?: string): string[] {
    if (!summary) return [];
    const segments: string[] = [];
    const sentences = summary
        .split(/\n+/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    sentences.forEach((chunk) => {
        const parts = splitIntoSentences(chunk);
        if (parts.length > 0) {
            segments.push(...parts);
        }
    });
    return segments;
}

function pickHeroImage(topics: Topic[]): string | undefined {
    const topicWithImage = topics.find((topic) => topic.image && !PLACEHOLDER_PATTERN.test(topic.image));
    return topicWithImage?.image;
}

function buildTopicBlocks(topic: Topic, index: number): ArticleBlock[] {
    const blocks: ArticleBlock[] = [];
    blocks.push({
        type: "heading",
        level: 2,
        content: `${index + 1}. ${topic.title}`
    });

    const paragraphs = sanitizeSummary(topic.summary);
    if (paragraphs.length > 0) {
        paragraphs.forEach((paragraph) => {
            blocks.push({
                type: "paragraph",
                content: paragraph
            });
        });
    } else {
        blocks.push({
            type: "paragraph",
            content: "原文主要聚焦该事件的最新动态，建议通过原链接获取更详尽的技术细节。"
        });
    }

    if (topic.image && !PLACEHOLDER_PATTERN.test(topic.image)) {
        blocks.push({
            type: "image",
            url: topic.image,
            alt: topic.title,
            caption: "原文配图"
        });
    }

    return blocks;
}

export function buildTemplateArticle(
    topics: Topic[]
): GeneratedArticle {
    if (topics.length === 0) {
        const publishedAt = getPublishedAt();
        const introParagraphs = [
            INTRO_LEAD,
            "我会根据你勾选的内容整理一份聚焦价值与洞见的日报。"
        ];
        return {
            title: "今日 AI 观察",
            subtitle: "等待你精选的资讯",
            excerpt: introParagraphs.join(" "),
            publishedAt,
            blocks: [
                ...introParagraphs.map((content) => ({
                    type: "paragraph" as const,
                    content
                }))
            ],
            sources: []
        };
    }

    const publishedAt = getPublishedAt();
    const heroImage = pickHeroImage(topics);
    const introParagraphs = [
        INTRO_LEAD,
        `我整理了过去 24 小时里 ${topics.length} 条值得关注的 AI 动态，重点说清它们的实际价值与风险。`
    ];
    const excerpt = introParagraphs.join(" ");

    const blocks: ArticleBlock[] = introParagraphs.map((content) => ({
        type: "paragraph",
        content
    }));

    topics.forEach((topic, index) => {
        blocks.push(...buildTopicBlocks(topic, index));
    });

    blocks.push({
        type: "paragraph",
        content: CLOSE_LEAD
    });

    return {
        title: `今日 AI 观察｜${publishedAt}`,
        subtitle: "每日科技提醒",
        excerpt,
        publishedAt,
        heroImage,
        blocks,
        sources: []
    };
}

export function articleToMarkdown(article: GeneratedArticle): string {
    const lines: string[] = [];
    lines.push(`# ${article.title}`);
    if (article.subtitle) {
        lines.push(`_${article.subtitle}_`);
    }
    lines.push(`> 发布于：${article.publishedAt}`);
    lines.push("");
    lines.push(article.excerpt);
    lines.push("");

    if (article.heroImage) {
        lines.push(`![头图](${article.heroImage})`);
        lines.push("");
    }

    article.blocks.forEach((block) => {
        switch (block.type) {
            case "heading": {
                const prefix = block.level === 3 ? "###" : "##";
                lines.push(`${prefix} ${block.content}`);
                lines.push("");
                break;
            }
            case "paragraph":
                lines.push(block.content);
                lines.push("");
                break;
            case "quote":
                lines.push(`> ${block.content}`);
                if (block.attribution) {
                    lines.push(`> —— ${block.attribution}`);
                }
                lines.push("");
                break;
            case "list": {
                block.items.forEach((item, index) => {
                    const bullet = block.style === "ordered" ? `${index + 1}.` : "-";
                    lines.push(`${bullet} ${item}`);
                });
                lines.push("");
                break;
            }
            case "image":
                lines.push(`![${block.caption ?? block.alt ?? "配图"}](${block.url})`);
                lines.push("");
                break;
        }
    });

    return lines.join("\n").trim();
}

export type ArticleHeadingLevel = 2 | 3;

export interface Topic {
    id: number;
    title: string;
    summary: string;
    url: string;
    image: string;
    video?: string;
    sourceUrl?: string;
    publishedAt?: string;
}

export interface SourceArticle {
    title: string;
    date: string;
    description: string;
    source: string;
    url: string;
    image: string;
    topics: Topic[];
}

export type ArticleBlock =
    | {
        type: "heading";
        level: ArticleHeadingLevel;
        content: string;
    }
    | {
        type: "paragraph";
        content: string;
    }
    | {
        type: "image";
        url: string;
        alt?: string;
        caption?: string;
    }
    | {
        type: "quote";
        content: string;
        attribution?: string;
    }
    | {
        type: "list";
        style?: "unordered" | "ordered";
        items: string[];
    }
    | {
        type: "link";
        label: string;
        url: string;
        description?: string;
    };

export interface GeneratedArticle {
    title: string;
    subtitle?: string;
    excerpt: string;
    publishedAt: string;
    heroImage?: string;
    blocks: ArticleBlock[];
    sources: {
        title: string;
        url: string;
    }[];
}

export interface ArticleGenerationOptions {
    tone?: "neutral" | "enthusiastic" | "professional" | "casual";
    instructions?: string;
}

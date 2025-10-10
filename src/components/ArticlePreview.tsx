import Image from "next/image";
import { GeneratedArticle, ArticleBlock } from "@/types/news";
import { Link2 } from "lucide-react";

interface ArticlePreviewProps {
    article: GeneratedArticle;
}

function toDisplayUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (url.startsWith("/")) return url;
    if (url.startsWith("http")) {
        return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
}

function BlockRenderer({ block }: { block: ArticleBlock }) {
    switch (block.type) {
        case "heading":
            return (
                <h3 className="text-2xl font-semibold tracking-tight mt-12 first:mt-0">
                    {block.content}
                </h3>
            );
        case "paragraph":
            return (
                <p className="text-base leading-7 text-muted-foreground mt-4">
                    {block.content}
                </p>
            );
        case "quote":
            return (
                <blockquote className="mt-6 border-l-4 border-primary/60 pl-6 italic text-muted-foreground">
                    <p className="text-base leading-7">{block.content}</p>
                    {block.attribution && (
                        <cite className="mt-2 block text-sm not-italic text-muted-foreground/70">
                            —— {block.attribution}
                        </cite>
                    )}
                </blockquote>
            );
        case "list": {
            const ListTag = block.style === "ordered" ? "ol" : "ul";
            const listClass =
                block.style === "ordered"
                    ? "list-decimal"
                    : "list-disc";
            return (
                <ListTag
                    className={`mt-6 ml-6 space-y-2 text-muted-foreground ${listClass} marker:text-primary`}
                >
                    {block.items.map((item, index) => (
                        <li key={index} className="leading-7">
                            {item}
                        </li>
                    ))}
                </ListTag>
            );
        }
        case "image": {
            const displayUrl = toDisplayUrl(block.url);
            if (!displayUrl) return null;
            return (
                <figure className="mt-8">
                    <div className="relative w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30 shadow-sm">
                        <div className="relative aspect-[16/10] overflow-hidden">
                            <Image
                                src={displayUrl}
                                alt={block.alt || "配图"}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                sizes="(min-width: 1024px) 600px, 100vw"
                                priority={false}
                            />
                        </div>
                    </div>
                    {block.caption && (
                        <figcaption className="mt-3 text-sm text-muted-foreground">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            );
        }
        case "link":
            return (
                <a
                    href={block.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                    <Link2 className="h-4 w-4" />
                    {block.label || "阅读原文"}
                </a>
            );
        default:
            return null;
    }
}

const ArticlePreview = ({ article }: ArticlePreviewProps) => {
    const heroUrl = toDisplayUrl(article.heroImage);

    return (
        <article className="prose prose-neutral dark:prose-invert max-w-none">
            <header className="space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-primary/70">
                    {article.subtitle}
                </p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    {article.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{article.publishedAt}</span>
                    <span>·</span>
                    <span>{article.excerpt}</span>
                </div>
            </header>

            {heroUrl && (
                <figure className="mt-10">
                    <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/30 shadow-lg">
                        <div className="relative aspect-[16/9] overflow-hidden">
                            <Image
                                src={heroUrl}
                                alt="今日头图"
                                fill
                                priority
                                className="object-cover"
                                sizes="(min-width: 1024px) 720px, 100vw"
                            />
                        </div>
                    </div>
                </figure>
            )}

            <section className="mt-10 space-y-6">
                {article.blocks.map((block, index) => (
                    <BlockRenderer key={`${block.type}-${index}`} block={block} />
                ))}
            </section>

            {article.sources.length > 0 && (
                <footer className="mt-12 border-t border-border/60 pt-6">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        信息来源
                    </h4>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        {article.sources.map((source, index) => (
                            <li key={`${source.url}-${index}`}>
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                                >
                                    <Link2 className="h-4 w-4" />
                                    <span>{source.title}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </footer>
            )}
        </article>
    );
};

export default ArticlePreview;

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import FeatureStats from "@/components/FeatureStats";
import ThemeToggle from "@/components/ThemeToggle";
import ArticlePreview from "@/components/ArticlePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Loader2,
    RefreshCw,
    Sparkles,
    Filter,
    Copy,
    Check,
    Wand2,
    Image as ImageIcon,
    ExternalLink,
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Clock,
    ListChecks
} from "lucide-react";
import { articleToMarkdown, buildTemplateArticle } from "@/lib/articleBuilder";
import { GeneratedArticle, SourceArticle, Topic } from "@/types/news";

type DataSource = "daily" | "realtime";

const TOPICS_PER_PAGE_OPTIONS = [10, 20, 30, 40];

function formatNewsTime(value?: string) {
    if (!value) return "时间未知";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(date);
}

function mergeTopicsByOrder(orderMap: Map<number, number>, current: Topic[], additions: Topic[]) {
    const merged = new Map<number, Topic>();
    current.forEach((topic) => merged.set(topic.id, topic));
    additions.forEach((topic) => merged.set(topic.id, topic));
    return Array.from(merged.values()).sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
    });
}

export default function Home() {
    const [articles, setArticles] = useState<SourceArticle[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<DataSource>("realtime");
    const [copyState, setCopyState] = useState(false);
    const [copyError, setCopyError] = useState<string | null>(null);
    const [llmAvailable, setLlmAvailable] = useState(false);
    const [llmChecked, setLlmChecked] = useState(false);
    const [article, setArticle] = useState<GeneratedArticle | null>(null);
    const [markdown, setMarkdown] = useState("");
    const [articleLoading, setArticleLoading] = useState(false);
    const [articleError, setArticleError] = useState<string | null>(null);
    const [lastGenerationUsedLLM, setLastGenerationUsedLLM] = useState(false);

    const [searchTerm, setSearchTerm] = useState("");
    const [topicsPerPage, setTopicsPerPage] = useState<number>(TOPICS_PER_PAGE_OPTIONS[0]);
    const [currentPage, setCurrentPage] = useState(0);
    const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({});

    const mainReport = articles[0];
    const allTopics = useMemo(() => mainReport?.topics ?? [], [mainReport]);

    const orderMap = useMemo(
        () => new Map(allTopics.map((topic, index) => [topic.id, index])),
        [allTopics]
    );

    useEffect(() => {
        setCurrentPage(0);
        setSearchTerm("");
        setExpandedTopics({});
        setSelectedTopics([]);
        setArticle(null);
        setMarkdown("");
        setArticleError(null);
        setLastGenerationUsedLLM(false);
    }, [mainReport]);

    useEffect(() => {
        async function loadConfig() {
            try {
                const res = await fetch("/api/generate-article", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                setLlmAvailable(Boolean(data.openRouterEnabled));
            } catch {
                setLlmAvailable(false);
            } finally {
                setLlmChecked(true);
            }
        }
        loadConfig();
    }, []);

    const filteredTopics = useMemo(() => {
        if (!searchTerm.trim()) {
            return allTopics;
        }
        const keyword = searchTerm.trim().toLowerCase();
        return allTopics.filter((topic) =>
            [topic.title, topic.summary]
                .filter(Boolean)
                .some((field) => field.toLowerCase().includes(keyword))
        );
    }, [allTopics, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredTopics.length / topicsPerPage));

    useEffect(() => {
        if (currentPage > totalPages - 1) {
            setCurrentPage(Math.max(totalPages - 1, 0));
        }
    }, [currentPage, totalPages]);

    const paginatedTopics = useMemo(() => {
        const start = currentPage * topicsPerPage;
        return filteredTopics.slice(start, start + topicsPerPage);
    }, [filteredTopics, currentPage, topicsPerPage]);

    const selectedTopicIds = useMemo(
        () => new Set(selectedTopics.map((topic) => topic.id)),
        [selectedTopics]
    );

    useEffect(() => {
        if (selectedTopics.length === 0) {
            setArticle(null);
            setMarkdown("");
            setArticleError(null);
            setLastGenerationUsedLLM(false);
            return;
        }
        const template = buildTemplateArticle(selectedTopics);
        setArticle(template);
        setMarkdown(articleToMarkdown(template));
        setArticleError(null);
        setLastGenerationUsedLLM(false);
    }, [selectedTopics]);

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        setArticles([]);
        setSelectedTopics([]);
        setExpandedTopics({});
        setCopyError(null);
        setArticle(null);
        setMarkdown("");
        setArticleError(null);
        setLastGenerationUsedLLM(false);
        try {
            const res = await fetch(`/api/scrape?source=${dataSource}`, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "获取数据失败，请稍后重试。");
            } else {
                const fetchedArticles: SourceArticle[] = data.articles || [];
                setArticles(fetchedArticles);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "获取数据失败，请稍后重试。");
        } finally {
            setLoading(false);
        }
    };

    const handleTopicToggle = useCallback(
        (topic: Topic, checked: boolean) => {
            setSelectedTopics((prev) => {
                const exists = prev.some((t) => t.id === topic.id);
                if (checked) {
                    if (exists) return prev;
                    return mergeTopicsByOrder(orderMap, prev, [topic]);
                }
                if (!exists) return prev;
                return prev.filter((t) => t.id !== topic.id);
            });
        },
        [orderMap]
    );

    const selectTopics = useCallback(
        (targets: Topic[]) => {
            if (targets.length === 0) return;
            setSelectedTopics((prev) => mergeTopicsByOrder(orderMap, prev, targets));
        },
        [orderMap]
    );

    const handleSelectFiltered = () => selectTopics(filteredTopics);
    const handleSelectCurrentPage = () => selectTopics(paginatedTopics);

    const handleClearSelection = () => setSelectedTopics([]);

    const handleCopyArticle = async () => {
        try {
            setCopyError(null);
            if (!markdown.trim()) {
                setCopyError("没有可复制的内容，请先勾选素材或生成文章。");
                return;
            }
            await navigator.clipboard.writeText(markdown);
            setCopyState(true);
            setTimeout(() => setCopyState(false), 2000);
        } catch (err) {
            setCopyError(
                err instanceof Error ? `复制失败：${err.message}` : "复制失败，请稍后再试。"
            );
        }
    };

    const handleGenerateWithLLM = async () => {
        if (selectedTopics.length === 0) {
            setArticleError("请至少勾选一条资讯再生成日报。");
            return;
        }
        setArticleLoading(true);
        setArticleError(null);
        try {
            const res = await fetch("/api/generate-article", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topics: selectedTopics,
                    useLLM: true
                })
            });
            const data = await res.json();
            if (!res.ok) {
                if (data?.article) {
                    setArticle(data.article);
                    setMarkdown(data.markdown ?? articleToMarkdown(data.article));
                }
                setArticleError(data?.error || "调用 LLM 失败，请稍后重试。");
                setLastGenerationUsedLLM(Boolean(data?.llmUsed));
                return;
            }
            if (data?.article) {
                setArticle(data.article);
                setMarkdown(data.markdown ?? articleToMarkdown(data.article));
            }
            setLastGenerationUsedLLM(Boolean(data?.llmUsed));
        } catch (err) {
            setArticleError(err instanceof Error ? err.message : "调用 LLM 失败，请稍后再试。");
            setLastGenerationUsedLLM(false);
        } finally {
            setArticleLoading(false);
        }
    };

    const toggleExpandTopic = (topicId: number) => {
        setExpandedTopics((prev) => ({
            ...prev,
            [topicId]: !prev[topicId]
        }));
    };

    const renderTopicCard = (topic: Topic, index: number) => {
        const isSelected = selectedTopicIds.has(topic.id);
        const hasImage = topic.image && !topic.image.includes("placehold.co");
        const displayImage = hasImage
            ? topic.image.startsWith("http")
                ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}`
                : topic.image
            : null;
        const isExpanded = expandedTopics[topic.id];
        const summaryParagraphs = topic.summary
            ? topic.summary.split(/\n+/).filter((paragraph) => paragraph.trim().length > 0)
            : ["暂无摘要，建议查看原文获取更多细节。"];
        const shouldCollapse = !isExpanded && summaryParagraphs.length > 3;
        const visibleParagraphs = shouldCollapse ? summaryParagraphs.slice(0, 3) : summaryParagraphs;
        const showExpandToggle = summaryParagraphs.length > 3;

        return (
            <div
                key={topic.id}
                className={`rounded-xl border border-border/50 bg-card/70 p-4 transition-colors hover:border-primary/60 ${
                    isSelected ? "border-primary/70 bg-primary/10" : ""
                }`}
            >
                <div className="flex gap-4">
                    {displayImage && (
                        <div className="relative hidden h-28 w-40 overflow-hidden rounded-lg border border-border/40 bg-muted/40 sm:block">
                            <Image
                                src={displayImage}
                                alt={topic.title}
                                fill
                                className="object-cover"
                                sizes="160px"
                            />
                        </div>
                    )}
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <label className="flex cursor-pointer items-start gap-3">
                                <Checkbox
                                    id={`topic-${topic.id}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) =>
                                        handleTopicToggle(topic, checked === true)
                                    }
                                    className="mt-1"
                                />
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs uppercase tracking-[0.3em] text-primary/80">
                                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                                        </span>
                                        {topic.publishedAt && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {formatNewsTime(topic.publishedAt)}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="mt-1 text-base font-semibold leading-6 text-foreground">
                                        {topic.title}
                                    </h3>
                                </div>
                            </label>
                            <div className="flex flex-wrap gap-2 text-sm">
                                {topic.sourceUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="gap-1 text-muted-foreground hover:text-primary"
                                    >
                                        <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            AIbase 链接
                                        </a>
                                    </Button>
                                )}
                                {topic.url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        asChild
                                        className="gap-1"
                                    >
                                        <a href={topic.url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            项目/官网
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                            {visibleParagraphs.map((paragraph, paragraphIndex) => {
                                const trimmed = paragraph.trim();
                                if (trimmed.startsWith("关键要点：")) {
                                    const points = trimmed
                                        .replace("关键要点：", "")
                                        .split(/\d+\.\s*/i)
                                        .map((point) => point.trim())
                                        .filter(Boolean);
                                    return (
                                        <div
                                            key={`${topic.id}-points-${paragraphIndex}`}
                                            className="rounded-lg border border-border/40 bg-muted/30 p-3"
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                                                关键要点
                                            </p>
                                            <ul className="mt-2 space-y-1 text-sm">
                                                {points.map((point, pointIndex) => (
                                                    <li key={`${topic.id}-point-${pointIndex}`} className="flex gap-2">
                                                        <span className="text-primary">
                                                            {pointIndex + 1}.
                                                        </span>
                                                        <span>{point}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                }
                                return (
                                    <p key={`${topic.id}-paragraph-${paragraphIndex}`}>
                                        {trimmed}
                                    </p>
                                );
                            })}
                            {showExpandToggle && (
                                <button
                                    onClick={() => toggleExpandTopic(topic.id)}
                                    className="text-xs font-medium text-primary hover:text-primary/80"
                                >
                                    {isExpanded ? "收起内容" : `展开剩余 ${summaryParagraphs.length - 3} 段`}
                                </button>
                            )}
                        </div>
                        {topic.video && (
                            <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                含视频素材：若需要请从原文下载后单独分享。
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const pageStart = filteredTopics.length === 0 ? 0 : currentPage * topicsPerPage + 1;
    const pageEnd = Math.min((currentPage + 1) * topicsPerPage, filteredTopics.length);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
            <div className="container mx-auto px-4 py-10 lg:px-8">
                <header className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-sm font-medium text-primary">
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI 日报创作工作台
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                你来甄选素材，我来整合成一篇高密度日报
                            </h1>
                            <p className="max-w-2xl text-base text-muted-foreground">
                                从 AIbase 获取资讯后，可按关键词筛选、分页浏览并勾选重点。我会把选中的内容实时生成结构化图文稿，方便你复制或继续润色。
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Intl.DateTimeFormat("zh-CN", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric"
                                }).format(new Date())}
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4" />
                                当前选中 {selectedTopics.length} 条
                            </div>
                            {lastGenerationUsedLLM && (
                                <div className="flex items-center gap-2 text-primary">
                                    <Wand2 className="h-4 w-4" />
                                    已用 DeepSeek 精修
                                </div>
                            )}
                        </div>
                    </div>
                    <ThemeToggle />
                </header>

                <div className="mb-10 flex flex-wrap gap-3 rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur">
                    <button
                        onClick={() => setDataSource("daily")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            dataSource === "daily"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted/40"
                        }`}
                    >
                        AIbase 日报精选
                    </button>
                    <button
                        onClick={() => setDataSource("realtime")}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                            dataSource === "realtime"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted/40"
                        }`}
                    >
                        实时 24 小时资讯
                    </button>

                    <Button
                        onClick={fetchNews}
                        disabled={loading}
                        size="lg"
                        className="ml-auto flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 px-6 py-5 text-base text-primary-foreground shadow-lg transition-all hover:shadow-xl"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                正在获取资讯…
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-5 w-5" />
                                获取最新素材
                            </>
                        )}
                    </Button>
                </div>

                {error && (
                    <Alert className="mb-10 border-destructive/40 bg-destructive/10 text-destructive">
                        <AlertTitle>数据获取失败</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="mt-4 text-base text-muted-foreground">正在刷新资讯，请稍候…</p>
                    </div>
                )}

                {!loading && !mainReport && (
                    <div className="rounded-3xl border border-border/50 bg-card/50 p-12 text-center shadow-xl backdrop-blur">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="mt-6 text-2xl font-semibold">点击上方按钮获取今日资讯素材</h2>
                        <p className="mt-3 text-muted-foreground">
                            你可以随意勾选想要保留的条目，我会帮你生成一篇结构完整的日报文章。
                        </p>
                        <div className="mt-8">
                            <FeatureStats />
                        </div>
                    </div>
                )}

                {mainReport && (
                    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        <section className="space-y-6">
                            <Card className="border-border/50 bg-card/60 backdrop-blur">
                                <CardHeader className="border-b border-border/40 pb-5">
                                    <CardTitle className="flex flex-col gap-3 text-lg font-semibold md:flex-row md:items-start md:justify-between">
                                        <span>素材池 · {mainReport.title}</span>
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {mainReport.date}
                                        </span>
                                    </CardTitle>
                                    {mainReport.description && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {mainReport.description}
                                        </p>
                                    )}
                                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={handleSelectCurrentPage}
                                                disabled={paginatedTopics.length === 0}
                                                className="gap-1"
                                            >
                                                <ListChecks className="h-4 w-4" />
                                                全选当前页
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSelectFiltered}
                                                disabled={filteredTopics.length === 0}
                                            >
                                                全选筛选结果
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearSelection}
                                                disabled={selectedTopics.length === 0}
                                            >
                                                清空已选
                                            </Button>
                                            {mainReport.url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(mainReport.url, "_blank")}
                                                >
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    查看原始列表
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                            <div className="relative flex items-center">
                                                <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
                                                <input
                                                    type="search"
                                                    value={searchTerm}
                                                    onChange={(event) => {
                                                        setSearchTerm(event.target.value);
                                                        setCurrentPage(0);
                                                    }}
                                                    placeholder="搜索标题或摘要关键词"
                                                    className="w-full rounded-lg border border-border/50 bg-background/80 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-72"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    每页条数
                                                </span>
                                                <select
                                                    value={topicsPerPage}
                                                    onChange={(event) => {
                                                        setTopicsPerPage(Number(event.target.value));
                                                        setCurrentPage(0);
                                                    }}
                                                    className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-sm"
                                                >
                                                    {TOPICS_PER_PAGE_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    {paginatedTopics.length === 0 ? (
                                        <div className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
                                            {searchTerm
                                                ? "当前关键词没有匹配的资讯，试试其他关键词或清空筛选。"
                                                : "暂无资讯，请稍后刷新。"}
                                        </div>
                                    ) : (
                                        paginatedTopics.map((topic, index) =>
                                            renderTopicCard(topic, currentPage * topicsPerPage + index)
                                        )
                                    )}

                                    <div className="flex flex-col gap-3 border-t border-border/40 pt-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                                        <div>
                                            共 {filteredTopics.length} 条 · 正在查看{" "}
                                            {filteredTopics.length === 0
                                                ? "0"
                                                : `${pageStart}-${pageEnd}`}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                                                disabled={currentPage === 0}
                                                className="gap-1"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                上一页
                                            </Button>
                                            <span className="text-xs uppercase tracking-wide">
                                                第 {currentPage + 1} / {totalPages} 页
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))
                                                }
                                                disabled={currentPage >= totalPages - 1}
                                                className="gap-1"
                                            >
                                                下一页
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <section className="space-y-6">
                            <Card className="border-border/50 bg-card/60 backdrop-blur">
                                <CardHeader className="border-b border-border/40 pb-5">
                                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                        <ImageIcon className="h-5 w-5 text-primary" />
                                        日报文章生成
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        勾选左侧素材后，我会即时生成结构化文章。复制 Markdown 或调用 LLM 都会沿用我的常规写作风格。
                                    </p>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            写作说明
                                        </p>
                                        <p className="text-sm leading-6 text-muted-foreground">
                                            成稿保持客观、真诚的科技解读视角，重点分析事件的价值、风险与潜在影响，开头固定以“大家好，我是孟健。”展开。
                                            只需要继续在左侧挑选素材，然后在这里复制或调用 LLM 即可。
                                        </p>
                                    </div>

                                    {copyError && (
                                        <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
                                            <AlertTitle>复制失败</AlertTitle>
                                            <AlertDescription>{copyError}</AlertDescription>
                                        </Alert>
                                    )}

                                    {articleError && (
                                        <Alert className="border-destructive/40 bg-destructive/10 text-destructive">
                                            <AlertTitle>生成失败</AlertTitle>
                                            <AlertDescription>{articleError}</AlertDescription>
                                        </Alert>
                                    )}

                                    {!llmAvailable && llmChecked && (
                                        <Alert className="border-border/50 bg-muted/40 text-muted-foreground">
                                            <AlertTitle>尚未配置 LLM</AlertTitle>
                                            <AlertDescription>
                                                如需使用 anthropic/claude-sonnet-4.5，请在环境变量中设置
                                                <code className="mx-1 rounded bg-muted px-2 py-0.5 text-xs">
                                                    OPENROUTER_API_KEY
                                                </code>
                                                后重新加载页面。
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={handleCopyArticle}
                                            disabled={selectedTopics.length === 0 || !markdown}
                                            className="flex items-center gap-2"
                                        >
                                            {copyState ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            {copyState ? "已复制 Markdown" : "复制 Markdown"}
                                        </Button>
                                        <Button
                                            onClick={handleGenerateWithLLM}
                                            disabled={!llmAvailable || !selectedTopics.length || articleLoading}
                                            className="flex items-center gap-2"
                                        >
                                            {articleLoading ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    正在调用 LLM…
                                                </>
                                            ) : (
                                                <>
                                                    <Wand2 className="h-4 w-4" />
                                                    让 LLM 成稿
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="rounded-xl border border-border/50 bg-background/60 p-6 shadow-inner">
                                        {selectedTopics.length > 0 && article ? (
                                            <ArticlePreview article={article} />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
                                                <ImageIcon className="h-10 w-10 opacity-60" />
                                                <p className="text-sm">
                                                    勾选至少一条资讯，我会在这里生成完整的日报文章。
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

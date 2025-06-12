
"use client";

import { useState } from "react";
import FeatureStats from "@/components/FeatureStats";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Loader2,
    Terminal,
    Share2,
    Copy,
    Check,
    Newspaper,
    Image as ImageIcon,
    Link2,
    Sparkles,
    Wand2,
    Calendar,
    ExternalLink,

    Clock,
    TrendingUp,
    Palette,
    Play,
    Brain,
    Globe,
    Zap,
    RefreshCw,
} from "lucide-react";
import Image from 'next/image';

// Defines the structure of a single topic within the daily report
interface Topic {
    id: number;
    title: string;
    summary: string;
    url: string;
    image: string;
    video?: string;
}

// Defines the structure of the daily report article
interface Article {
    id: number;
    title: string;
    date: string;
    source: string;
    url: string;
    image: string;
    description?: string;
    topics?: Topic[];
}

interface FetchError {
    error: string;
    html?: string;
    screenshotUrl?: string;
}

export default function Home() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<FetchError | null>(null);
    const [activeTab, setActiveTab] = useState("wechat");
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

    const openingText = "#AI日课 ✨\n\n大家好，我来分享今日值得关注的 AI 动态 🚀";
    const closingText = "以上是最新 AI 精选资讯，大家 Get 了可以拍拍我哈～ 👏";

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        setArticles([]);
        setSelectedTopics([]);
        try {
            const res = await fetch("/api/scrape");
            const data = await res.json();

            if (!res.ok) {
                setError(data);
            } else {
                setArticles(data.articles);
                if (data.articles.length > 0 && data.articles[0].topics) {
                    setSelectedTopics(data.articles[0].topics);
                }
            }
        } catch (err) {
            setError({ error: err instanceof Error ? err.message : "获取数据时发生未知错误" });
        } finally {
            setLoading(false);
        }
    };

    const handleTopicSelection = (topic: Topic) => {
        setSelectedTopics((prev) =>
            prev.some((t) => t.id === topic.id)
                ? prev.filter((t) => t.id !== topic.id)
                : [...prev, topic]
        );
    };

    const copyToClipboard = (content: string, id: string) => {
        navigator.clipboard.writeText(content);
        setCopiedStates(prev => ({ ...prev, [id]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [id]: false }));
        }, 2000);
    };

    const CopyButton = ({ content, id }: { content: string, id: string }) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(content, id)}
            className="transition-all duration-200 hover:bg-primary/10 hover:scale-105 group"
        >
            {copiedStates[id] ?
                <Check className="h-4 w-4 text-green-500" /> :
                <Copy className="h-4 w-4 group-hover:text-primary transition-colors" />
            }
            <span className="ml-2 text-xs">
                {copiedStates[id] ? "已复制" : "复制"}
            </span>
        </Button>
    );

    const generateSocialContent = () => {
        const dailyReport = articles[0];
        if (!dailyReport) return "";

        // 使用与微信群格式一致的开头
        const header = `${openingText}\n\n`;

        const topicsContent = selectedTopics
            .map(
                (topic, index) =>
                    `${index + 1}. ${topic.title}` +
                    (topic.video ? `\n🎥 视频: ${topic.video}` : "") +
                    (topic.url ? `\n🔗 详情: ${topic.url}` : "")
            )
            .join("\n\n");
        const footer = `\n\n以上是今日 AI 精选资讯，觉得有用的朋友请点个赞支持一下～ 🙏✨`;
        return header + topicsContent + footer;
    };

    const renderSocialContent = () => {
        const content = generateSocialContent();
        return (
            <div className="space-y-6">
                <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-primary/20 rounded-lg">
                                <Share2 className="h-4 w-4 text-primary" />
                            </div>
                            <CardTitle className="text-lg font-semibold">
                                朋友圈/知识星球格式
                            </CardTitle>
                        </div>
                        <CopyButton content={content} id="social-main" />
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={content}
                            readOnly
                            rows={selectedTopics.length > 0 ? selectedTopics.length + 10 : 5}
                            className="w-full p-4 text-sm bg-background/80 border-border/50 rounded-lg font-mono resize-none focus:ring-2 focus:ring-primary/20"
                        />
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg">
                            <ImageIcon className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-semibold tracking-tight">配图素材</h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
                    </div>

                    <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
                        <CardContent className="p-6">
                            {selectedTopics.filter(topic =>
                                (topic.image && !topic.image.includes("placehold.co")) || topic.video
                            ).length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {selectedTopics.map((topic) => (
                                        <>
                                            {topic.image && !topic.image.includes("placehold.co") && (
                                                <div key={`img-social-${topic.id}`} className="group relative aspect-square">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                    <Image
                                                        src={topic.image.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}` : topic.image}
                                                        alt={topic.title}
                                                        fill
                                                        className="object-cover rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105"
                                                        draggable={true}
                                                        onContextMenu={(e) => e.stopPropagation()}
                                                        style={{
                                                            userSelect: 'auto',
                                                            WebkitUserSelect: 'auto',
                                                            MozUserSelect: 'auto'
                                                        }}
                                                    />
                                                    <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                        <p className="text-white text-xs font-medium truncate">{topic.title}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {topic.video && (
                                                <div key={`video-social-${topic.id}`} className="group relative aspect-square">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                    <video
                                                        src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`}
                                                        className="w-full h-full object-cover rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105"
                                                        onContextMenu={(e) => e.stopPropagation()}
                                                        style={{
                                                            userSelect: 'auto',
                                                            WebkitUserSelect: 'auto',
                                                            MozUserSelect: 'auto'
                                                        }}
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                                                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                                                            <Play className="h-6 w-6 text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                                        <p className="text-white text-xs font-medium truncate">{topic.title}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>暂无配图素材</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    const mainReport = articles.length > 0 ? articles[0] : null;



    return (
        <div className="min-h-screen text-foreground relative">
            <div className="container mx-auto p-4 md:p-8 lg:p-12">
                                 {/* 头部区域 */}
                 <header className="flex flex-col lg:flex-row justify-between items-center mb-16 space-y-8 lg:space-y-0">
                     {/* 主题切换按钮 - 固定在右上角 */}
                     <div className="fixed top-6 right-6 z-50 lg:hidden">
                         <ThemeToggle />
                     </div>
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
                            <div className="relative p-4 bg-gradient-to-r from-primary to-purple-600 rounded-2xl shadow-2xl">
                                <Brain className="h-10 w-10 text-white" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
                                AI Daily Generator
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                一键生成你的专属 AI 日报 ✨ 智能化内容创作助手
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                    <Globe className="h-4 w-4" />
                                    <span>AIbase 数据源</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Zap className="h-4 w-4" />
                                    <span>实时更新</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Wand2 className="h-4 w-4" />
                                    <span>智能格式化</span>
                                </div>
                            </div>
                        </div>
                    </div>

                                         <div className="flex flex-col sm:flex-row gap-4 items-center">
                         {/* 桌面端主题切换 */}
                         <div className="hidden lg:block">
                             <ThemeToggle />
                         </div>

                         <Button
                             onClick={fetchNews}
                             disabled={loading}
                             size="lg"
                             className="group relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-6 text-lg"
                         >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    正在获取最新资讯...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-3 h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
                                    获取最新日报
                                </>
                            )}
                        </Button>

                        {mainReport && (
                            <Button
                                variant="outline"
                                size="lg"
                                className="group border-border/50 hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 px-6 py-6"
                                onClick={() => window.open(mainReport.url, '_blank')}
                            >
                                <ExternalLink className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                查看原文
                            </Button>
                        )}
                    </div>
                </header>

                {/* 错误提示 */}
                {error && (
                    <Card className="mb-12 border-destructive/50 bg-gradient-to-r from-destructive/5 to-red-500/5 shadow-lg">
                        <CardHeader>
                            <AlertTitle className="flex items-center text-destructive">
                                <Terminal className="h-6 w-6 mr-3" />
                                获取数据时出错了
                            </AlertTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <AlertDescription className="text-destructive/80 text-base">
                                {error.error}
                            </AlertDescription>

                            {error.screenshotUrl && (
                                <Button variant="secondary" asChild className="hover:bg-secondary/80 transition-colors">
                                    <a href={error.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                        <ImageIcon className="h-5 w-5 mr-2"/>
                                        查看页面截图
                                    </a>
                                </Button>
                            )}

                            {error.html && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-lg">浏览器获取到的 HTML 源码:</h3>
                                    <Textarea
                                        value={error.html}
                                        readOnly
                                        rows={20}
                                        className="w-full p-4 font-mono text-xs bg-background/50 border-border/50 rounded-lg"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* 加载状态 */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
                            <Loader2 className="relative h-16 w-16 animate-spin text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold">正在获取最新 AI 资讯</h3>
                            <p className="text-muted-foreground">请稍候，我们正在为您整理今日精彩内容...</p>
                        </div>
                    </div>
                )}

                {/* 空状态 */}
                {!mainReport && !loading && (
                    <div className="text-center py-32 px-6 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-xl">
                        <div className="space-y-6">
                            <div className="relative mx-auto w-24 h-24">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full animate-pulse"></div>
                                <div className="relative flex items-center justify-center w-full h-full bg-primary/10 rounded-full">
                                    <Newspaper className="h-12 w-12 text-primary" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold tracking-tight">准备好开始了吗？</h2>
                                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                                    点击&ldquo;获取最新日报&rdquo;按钮，系统将自动从 AIbase 获取最新 AI 资讯，
                                    并为您智能整理成适合各种平台分享的格式。
                                </p>
                            </div>
                            <div className="flex items-center justify-center space-x-8 pt-6">
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>实时更新</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>热点追踪</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    <span>多格式输出</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 主要内容区域 */}
                {mainReport && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                        {/* 左侧：内容选择 */}
                        <div className="space-y-8">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500/20 to-primary/20 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-semibold tracking-tight">选择分享内容</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
                            </div>

                            {mainReport.topics && (
                                <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-xl overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-b border-border/50">
                                        <div className="flex items-center space-x-3">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <div>
                                                <CardTitle className="text-xl">{mainReport.title}</CardTitle>
                                                {mainReport.date && (
                                                    <p className="text-sm text-muted-foreground mt-1">{mainReport.date}</p>
                                                )}
                                            </div>
                                        </div>
                                        {mainReport.description && (
                                            <p className="text-muted-foreground leading-relaxed mt-4">{mainReport.description}</p>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Accordion type="multiple" className="w-full">
                                            {mainReport.topics.map((topic, index) => (
                                                <AccordionItem
                                                    value={`item-${topic.id}`}
                                                    key={topic.id}
                                                    className="border-border/30 hover:bg-primary/5 transition-colors"
                                                >
                                                    <div className="flex items-center space-x-4 w-full pr-6">
                                                        <Checkbox
                                                            id={`topic-${topic.id}`}
                                                            checked={selectedTopics.some((t) => t.id === topic.id)}
                                                            onCheckedChange={() => handleTopicSelection(topic)}
                                                            className="ml-6 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        />
                                                        <AccordionTrigger className="flex-1 text-left font-semibold text-base py-6 hover:no-underline">
                                                            <div className="flex items-center space-x-3">
                                                                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full">
                                                                    {index + 1}
                                                                </span>
                                                                <span>{topic.title}</span>
                                                            </div>
                                                        </AccordionTrigger>
                                                    </div>
                                                    <AccordionContent className="pb-6 pl-16 pr-6 space-y-6">
                                                        <div
                                                            className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: topic.summary.replace(/\\n/g, "<br />") }}
                                                        />

                                                        {topic.image && !topic.image.includes("placehold.co") && (
                                                            <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-lg group">
                                                                <Image
                                                                    src={`/api/image-proxy?url=${encodeURIComponent(topic.image)}`}
                                                                    alt={topic.title}
                                                                    width={600}
                                                                    height={400}
                                                                    className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            </div>
                                                        )}

                                                        {topic.video && (
                                                            <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-lg">
                                                                <video
                                                                    src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`}
                                                                    controls
                                                                    className="w-full"
                                                                />
                                                            </div>
                                                        )}

                                                        {topic.url && (
                                                            <Button
                                                                variant="link"
                                                                asChild
                                                                className="p-0 h-auto text-primary hover:text-primary/80"
                                                            >
                                                                <a
                                                                    href={topic.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center text-sm font-medium group"
                                                                >
                                                                    <Link2 className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                                                    查看详情
                                                                </a>
                                                            </Button>
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* 右侧：格式化输出 */}
                        {selectedTopics.length > 0 && (
                            <div className="space-y-8">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
                                        <Share2 className="h-5 w-5 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-semibold tracking-tight">复制格式化内容</h2>
                                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
                                </div>

                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm border border-border/50 shadow-lg">
                                        <TabsTrigger
                                            value="wechat"
                                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                                        >
                                            微信群格式
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="social"
                                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                                        >
                                            朋友圈/知识星球
                                        </TabsTrigger>
                                    </TabsList>

                                                                         <TabsContent value="wechat" className="mt-6 space-y-6">
                                         {/* 使用提示 */}
                                         {selectedTopics.some(topic => topic.video) && (
                                             <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                                                 <div className="flex items-start space-x-3">
                                                     <div className="p-1 bg-blue-500/20 rounded-full mt-0.5">
                                                         <Play className="h-4 w-4 text-blue-600" />
                                                     </div>
                                                     <div className="flex-1">
                                                         <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                                                             💡 视频发送提示
                                                         </h4>
                                                         <p className="text-xs text-blue-700 dark:text-blue-300">
                                                             视频文件需要单独发送，不会包含在文字消息中。请先发送文字内容，然后单独发送对应的视频文件。
                                                         </p>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* 开场白 */}
                                         <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-2 bg-blue-500/20 rounded-lg">
                                                        <Wand2 className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <CardTitle className="text-base font-medium">开场白</CardTitle>
                                                </div>
                                                <CopyButton content={openingText} id="wechat-opening" />
                                            </CardHeader>
                                            <CardContent>
                                                <Textarea
                                                    value={openingText}
                                                    readOnly
                                                    rows={3}
                                                    className="bg-background/80 border-border/50 font-mono text-sm resize-none"
                                                />
                                            </CardContent>
                                        </Card>

                                                                                 {/* 资讯内容 */}
                                         {selectedTopics.map((topic, index) => {
                                             const topicText = `${index + 1}、${topic.title}` +
                                                 (topic.url ? `\n🔗 详情: ${topic.url}` : "");
                                            return (
                                                <Card key={topic.id} className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
                                                    <CardHeader className="flex flex-row items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="p-2 bg-primary/20 rounded-lg">
                                                                <span className="text-xs font-bold text-primary">{index + 1}</span>
                                                            </div>
                                                            <CardTitle className="text-base font-medium">第 {index + 1} 条资讯</CardTitle>
                                                        </div>
                                                        <CopyButton content={topicText} id={`wechat-topic-${topic.id}`} />
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <Textarea
                                                            value={topicText}
                                                            readOnly
                                                            rows={3}
                                                            className="bg-background/80 border-border/50 font-mono text-sm resize-none"
                                                        />

                                                        {topic.image && !topic.image.includes("placehold.co") && (
                                                            <div className="space-y-2">
                                                                <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
                                                                    <ImageIcon className="h-4 w-4 mr-2" />
                                                                    配图:
                                                                </h4>
                                                                <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50 shadow-md group">
                                                                    <Image
                                                                        src={topic.image.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}` : topic.image}
                                                                        alt={topic.title}
                                                                        fill
                                                                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {topic.video && (
                                                                                                                         <div className="space-y-2">
                                                                 <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
                                                                     <Play className="h-4 w-4 mr-2" />
                                                                     视频 (单独发送):
                                                                 </h4>
                                                                <div className="relative rounded-lg overflow-hidden border border-border/50 shadow-md">
                                                                    <video
                                                                        src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`}
                                                                        controls
                                                                        className="w-full"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}

                                        {/* 结束语 */}
                                        <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 shadow-lg">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    </div>
                                                    <CardTitle className="text-base font-medium">结束语</CardTitle>
                                                </div>
                                                <CopyButton content={closingText} id="wechat-closing" />
                                            </CardHeader>
                                            <CardContent>
                                                <Textarea
                                                    value={closingText}
                                                    readOnly
                                                    rows={3}
                                                    className="bg-background/80 border-border/50 font-mono text-sm resize-none"
                                                />
                                            </CardContent>
                                        </Card>
                                    </TabsContent>

                                    <TabsContent value="social" className="mt-6">
                                        {renderSocialContent()}
                                    </TabsContent>
                                </Tabs>
                            </div>
                                                 )}
                     </div>
                 )}

                 {/* 功能特性展示 */}
                 {!mainReport && !loading && (
                     <div className="mt-24">
                         <FeatureStats />
                     </div>
                 )}
            </div>
        </div>
    );
}

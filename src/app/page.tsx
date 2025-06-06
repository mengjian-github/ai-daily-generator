"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

    const openingText =
        "#AI日课\n大家好，我来分享今日值得关注的 AI 动态";
    const closingText =
        "以上是最新 AI 精选资讯，大家 Get 了可以拍拍我哈～";

    const fetchNews = async () => {
        setLoading(true);
        setError(null);
        setArticles([]);
        setSelectedTopics([]);
        try {
            const res = await fetch("/api/scrape");
            const data = await res.json();

            if (!res.ok) {
                // This will now catch our detailed diagnostic error
                setError(data);
            } else {
                setArticles(data.articles);
                if (data.articles.length > 0 && data.articles[0].topics) {
                    setSelectedTopics(data.articles[0].topics);
                }
            }
        } catch (err) {
            setError({ error: err instanceof Error ? err.message : "An unknown error occurred." });
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
            size="icon"
            onClick={() => copyToClipboard(content, id)}
            className="transition-all"
        >
            {copiedStates[id] ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
    );

    const generateSocialContent = () => {
        const dailyReport = articles[0];
        if (!dailyReport) return "";

        const header = `【AI Daily】${dailyReport.title}\n${dailyReport.date}\n\n`;

        const topicsContent = selectedTopics
            .map(
                (topic, index) =>
                    `${index + 1}、${topic.title}` +
                    (topic.url ? `\n详情: ${topic.url}` : "")
            )
            .join("\n\n");
        return header + topicsContent;
    };

    const renderSocialContent = () => {
        const content = generateSocialContent();
        return (
            <div className="space-y-6">
                <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            朋友圈/知识星球格式
                        </CardTitle>
                        <CopyButton content={content} id="social-main" />
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={content}
                            readOnly
                            rows={selectedTopics.length > 0 ? selectedTopics.length + 10 : 5}
                            className="w-full p-3 text-sm bg-background/70 border-border rounded-md"
                        />
                    </CardContent>
                </Card>
                <h2 className="text-xl font-semibold tracking-tight mt-8">待发布媒体</h2>
                <Card className="bg-card/50 backdrop-blur-sm">
                    <CardContent className="flex flex-wrap gap-4 p-4">
                        {selectedTopics.map((topic) =>
                            topic.image && !topic.image.includes("placehold.co") && (
                                <div key={`img-social-${topic.id}`} className="relative w-40 h-40 group">
                                    <Image src={topic.image.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}` : topic.image} alt={topic.title} layout="fill" objectFit="cover" className="rounded-lg transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            )
                        )}
                        {selectedTopics.map((topic) =>
                            topic.video && (
                                <div key={`video-social-${topic.id}`} className="relative w-40 h-40 group">
                                    <video src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`} controls className="rounded-lg w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                </div>
                            )
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const mainReport = articles.length > 0 ? articles[0] : null;

    const allTopicIds = useMemo(() => {
        if (mainReport && mainReport.topics) {
            return mainReport.topics.map((topic) => `item-${topic.id}`);
        }
        return [];
    }, [mainReport]);

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"><div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/10 blur-2xl"></div></div>
            <main className="container mx-auto p-4 md:p-8">
                <header className="flex flex-col md:flex-row justify-between items-center mb-12">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <div className="p-3 bg-primary/20 rounded-lg">
                            <Newspaper className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">AI Daily Generator</h1>
                            <p className="text-muted-foreground">一键生成你的专属 AI 日报</p>
                        </div>
                    </div>
                    <Button onClick={fetchNews} disabled={loading} size="lg" className="group">
                        {loading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在获取...</>
                        ) : (
                            <><Sparkles className="mr-2 h-4 w-4 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12" />获取最新日报</>
                        )}
                    </Button>
                </header>

                {error && (
                     <Card className="mb-8 border-destructive bg-destructive/10">
                        <CardHeader>
                            <AlertTitle className="flex items-center text-destructive-foreground">
                                <Terminal className="h-5 w-5 mr-2" />
                                出错了！
                            </AlertTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <AlertDescription className="text-destructive-foreground/80">
                               {error.error}
                            </AlertDescription>

                            {error.screenshotUrl && (
                                <Button asChild variant="secondary">
                                    <a href={error.screenshotUrl} target="_blank" rel="noopener noreferrer">
                                        <ImageIcon className="h-5 w-5 mr-2"/>
                                        查看页面截图
                                    </a>
                                </Button>
                            )}

                            {error.html && (
                                <div>
                                    <h3 className="font-semibold mb-2">浏览器获取到的 HTML 源码:</h3>
                                    <Textarea value={error.html} readOnly rows={20} className="w-full p-2 font-mono text-xs bg-background/50 border-border rounded-md"/>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                )}

                {!mainReport && !loading && (
                    <div className="text-center py-24 px-6 rounded-lg bg-card/50 backdrop-blur-sm border border-border">
                        <div className="inline-block p-4 bg-primary/20 rounded-full mb-4">
                            <Newspaper className="h-10 w-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">准备好生成您的 AI 日报了吗？</h2>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            点击右上角的"获取最新日报"按钮，系统将自动从 AIbase 获取最新资讯，并为您整理好。
                        </p>
                    </div>
                )}

                {mainReport && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-semibold tracking-tight">1. 选择分享内容</h2>
                            {mainReport.topics && (
                                <Card className="bg-card/50 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl">{mainReport.title}</CardTitle>
                                        {mainReport.date && <p className="text-sm text-muted-foreground pt-2">{mainReport.date}</p>}
                                        <p className="text-sm text-muted-foreground pt-2">{mainReport.description}</p>
                                    </CardHeader>
                                    <CardContent>
                                        <Accordion type="multiple" className="w-full">
                                            {mainReport.topics.map((topic) => (
                                                <AccordionItem value={`item-${topic.id}`} key={topic.id} className="border-border/50">
                                                    <div className="flex items-center space-x-4 w-full pr-4">
                                                        <Checkbox
                                                            id={`topic-${topic.id}`}
                                                            checked={selectedTopics.some((t) => t.id === topic.id)}
                                                            onCheckedChange={() => handleTopicSelection(topic)}
                                                            className="ml-4"
                                                        />
                                                        <AccordionTrigger className="flex-1 text-left font-semibold text-base py-4">{topic.title}</AccordionTrigger>
                                                    </div>
                                                    <AccordionContent className="pb-4 pl-16 pr-4 text-muted-foreground space-y-4">
                                                        <div className="prose prose-sm max-w-none prose-invert" dangerouslySetInnerHTML={{ __html: topic.summary.replace(/\\n/g, "<br />") }} />

                                                        {topic.image && !topic.image.includes("placehold.co") && (
                                                            <div className="mt-4 rounded-lg overflow-hidden border border-border">
                                                                <Image src={`/api/image-proxy?url=${encodeURIComponent(topic.image)}`} alt={topic.title} width={600} height={400} className="w-full h-auto" />
                                                            </div>
                                                        )}
                                                        {topic.video && (
                                                            <div className="mt-4 rounded-lg overflow-hidden border border-border">
                                                                <video src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`} controls className="w-full" />
                                                            </div>
                                                        )}

                                                        {topic.url && (
                                                            <Button variant="link" asChild className="p-0 h-auto">
                                                                <a href={topic.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium text-primary/80 hover:text-primary">
                                                                    <Link2 className="mr-2 h-4 w-4" />
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
                        {selectedTopics.length > 0 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold tracking-tight">2. 复制格式化内容</h2>
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="wechat">微信群格式</TabsTrigger>
                                        <TabsTrigger value="social">朋友圈/知识星球</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="wechat" className="mt-4">
                                        <div className="space-y-4">
                                            <Card className="bg-card/50 backdrop-blur-sm">
                                                <CardHeader className="flex flex-row items-center justify-between">
                                                    <CardTitle className="text-base font-medium">1. 开场白</CardTitle>
                                                    <CopyButton content={openingText} id="wechat-opening" />
                                                </CardHeader>
                                                <CardContent>
                                                    <Textarea value={openingText} readOnly rows={3} className="bg-background/70" />
                                                </CardContent>
                                            </Card>
                                            {selectedTopics.map((topic, index) => {
                                                const topicText = `${index + 1}、${topic.title}` + (topic.video ? `\n视频: ${topic.video}` : "") + (topic.url ? `\n详情: ${topic.url}` : "");
                                                return (
                                                    <Card key={topic.id} className="bg-card/50 backdrop-blur-sm">
                                                        <CardHeader className="flex flex-row items-center justify-between">
                                                            <CardTitle className="text-base font-medium">{`${index + 2}. 第 ${index + 1} 条资讯`}</CardTitle>
                                                            <CopyButton content={topicText} id={`wechat-topic-${topic.id}`} />
                                                        </CardHeader>
                                                        <CardContent className="space-y-4">
                                                            <Textarea value={topicText} readOnly rows={3} className="bg-background/70" />
                                                            {topic.image && !topic.image.includes("placehold.co") && (
                                                                <div>
                                                                    <h3 className="text-sm font-semibold my-2 text-muted-foreground">发送图片:</h3>
                                                                    <div className="relative w-full h-56 rounded-lg overflow-hidden border border-border">
                                                                        <Image src={topic.image.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}` : topic.image} alt={topic.title} layout="fill" objectFit="contain" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {topic.video && (
                                                                <div>
                                                                    <h3 className="text-sm font-semibold my-2 text-muted-foreground">发送视频:</h3>
                                                                        <div className="relative w-full rounded-lg overflow-hidden border border-border">
                                                                            <video src={`/api/image-proxy?url=${encodeURIComponent(topic.video)}`} controls className="w-full" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                            <Card className="bg-card/50 backdrop-blur-sm">
                                                <CardHeader className="flex flex-row items-center justify-between">
                                                    <CardTitle className="text-base font-medium">{`${selectedTopics.length + 2}. 结束语`}</CardTitle>
                                                    <CopyButton content={closingText} id="wechat-closing" />
                                                </CardHeader>
                                                <CardContent>
                                                    <Textarea value={closingText} readOnly rows={3} className="bg-background/70" />
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="social" className="mt-4">
                                        {renderSocialContent()}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

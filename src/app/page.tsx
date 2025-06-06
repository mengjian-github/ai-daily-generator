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
    Newspaper,
    Image as ImageIcon,
    Link2,
} from "lucide-react";
import Image from 'next/image';

// Defines the structure of a single topic within the daily report
interface Topic {
    id: number;
    title: string;
    summary: string;
    url: string;
    image: string;
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

    const copyToClipboard = (content: string) => {
        navigator.clipboard.writeText(content);
    };

    const renderSocialContent = () => {
        const content = generateSocialContent();
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">
                            朋友圈/知识星球格式
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(content)}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={content}
                            readOnly
                            rows={selectedTopics.length > 0 ? selectedTopics.length + 10 : 5}
                            className="w-full p-2 text-sm bg-gray-50 border-gray-200 rounded-md"
                        />
                    </CardContent>
                </Card>
                <h2 className="text-xl font-semibold mt-8">待发布图片</h2>
                <Card>
                    <CardContent className="flex flex-wrap gap-4 pt-6">
                        {selectedTopics.map(
                            (topic) =>
                                topic.image &&
                                !topic.image.includes("placehold.co") && (
                                    <div
                                        key={`img-social-${topic.id}`}
                                        className="relative w-40 h-40"
                                    >
                                        <Image
                                            src={
                                                topic.image.startsWith("http")
                                                    ? `/api/image-proxy?url=${encodeURIComponent(
                                                          topic.image
                                                      )}`
                                                    : topic.image
                                            }
                                            alt={topic.title}
                                            layout="fill"
                                            objectFit="cover"
                                            className="rounded-lg"
                                        />
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
        <main className="container mx-auto p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8">
                <div className="flex items-center space-x-3 mb-4 md:mb-0">
                    <Newspaper className="h-8 w-8 text-blue-600" />
                    <h1 className="text-3xl font-bold tracking-tight">AI Daily Generator</h1>
                </div>
                <Button onClick={fetchNews} disabled={loading}>
                    {loading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />正在获取...</>
                    ) : ( "获取最新日报" )}
                </Button>
            </header>

            {error && (
                 <Card className="mb-8 border-red-500 bg-red-50/50">
                    <CardHeader>
                        <AlertTitle className="flex items-center text-red-700">
                            <Terminal className="h-5 w-5 mr-2" />
                            出错了！
                        </AlertTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <AlertDescription className="text-red-700">
                           {error.error}
                        </AlertDescription>

                        {error.screenshotUrl && (
                            <a href={error.screenshotUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                                <ImageIcon className="h-5 w-5 mr-2"/>
                                查看页面截图
                            </a>
                        )}

                        {error.html && (
                            <div>
                                <h3 className="font-semibold mb-2">浏览器获取到的 HTML 源码:</h3>
                                <Textarea value={error.html} readOnly rows={20} className="w-full p-2 font-mono text-xs bg-gray-900 text-gray-200 border-gray-700 rounded-md"/>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: News Selection */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold">1. 选择要分享的内容</h2>
                    {mainReport && mainReport.topics && (
                        <Card>
                            <CardHeader>
                                <CardTitle>{mainReport.title}</CardTitle>
                                {mainReport.date && (
                                    <p className="text-sm text-gray-500 pt-2">
                                        {mainReport.date}
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 pt-2">
                                    {mainReport.description}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <Accordion
                                    type="multiple"
                                    className="w-full"
                                    defaultValue={allTopicIds}
                                >
                                    {mainReport.topics.map((topic) => (
                                        <AccordionItem
                                            value={`item-${topic.id}`}
                                            key={topic.id}
                                        >
                                            <div className="flex items-center space-x-3 w-full">
                                                <Checkbox
                                                    id={`topic-${topic.id}`}
                                                    checked={selectedTopics.some(
                                                        (t) => t.id === topic.id
                                                    )}
                                                    onCheckedChange={() =>
                                                        handleTopicSelection(topic)
                                                    }
                                                    className="ml-4"
                                                />
                                                <AccordionTrigger className="flex-1">
                                                    <label
                                                        htmlFor={`topic-${topic.id}`}
                                                        className="flex-1 text-sm font-medium text-left leading-none cursor-pointer"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {topic.title}
                                                    </label>
                                                </AccordionTrigger>
                                            </div>
                                            <AccordionContent className="pl-8 pr-4 pb-4 space-y-4">
                                                {topic.image &&
                                                    !topic.image.includes(
                                                        "placehold.co"
                                                    ) && (
                                                        <div className="relative w-full h-48 rounded-lg overflow-hidden mt-2">
                                                            <Image
                                                                src={
                                                                    topic.image.startsWith(
                                                                        "http"
                                                                    )
                                                                        ? `/api/image-proxy?url=${encodeURIComponent(
                                                                              topic.image
                                                                          )}`
                                                                        : topic.image
                                                                }
                                                                alt={
                                                                    topic.title
                                                                }
                                                                layout="fill"
                                                                objectFit="cover"
                                                            />
                                                        </div>
                                                    )}
                                                <p className="text-sm text-gray-600 whitespace-pre-line">
                                                    {topic.summary}
                                                </p>
                                                {topic.url && (
                                                    <a
                                                        href={topic.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="flex items-center text-blue-500 hover:text-blue-700"
                                                    >
                                                        <Link2 className="h-4 w-4 mr-1" />
                                                        <span className="text-xs">
                                                            查看来源
                                                        </span>
                                                    </a>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column: Formatted Output */}
                {selectedTopics.length > 0 && (
                     <div className="space-y-6">
                        <h2 className="text-xl font-semibold">
                            2. 复制格式化内容
                        </h2>
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value="wechat">微信群格式</TabsTrigger>
                                <TabsTrigger value="social">朋友圈/知识星球</TabsTrigger>
                            </TabsList>
                            <TabsContent value="wechat" className="mt-4">
                                {/* WeChat individual cards */}
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">1. 复制开场白</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Textarea value={openingText} readOnly rows={3} />
                                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(openingText)}>
                                                <Copy className="h-4 w-4 mr-2" />复制
                                            </Button>
                                        </CardContent>
                                    </Card>
                                    {selectedTopics.map((topic, index) => {
                                        const topicText = `${index + 1}、${topic.title}` + (topic.url ? `\n详情: ${topic.url}` : "");
                                        return (
                                            <Card key={topic.id}>
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-medium">{` ${index + 2}. 分享第 ${index + 1} 条资讯`}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4">
                                                    <div>
                                                        <h3 className="text-xs font-semibold mb-2 text-gray-500">复制文本:</h3>
                                                        <Textarea value={topicText} readOnly rows={3} />
                                                        <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(topicText)}>
                                                            <Copy className="h-4 w-4 mr-2" />复制
                                                        </Button>
                                                    </div>
                                                    {topic.image && !topic.image.includes("placehold.co") && (
                                                        <div>
                                                            <h3 className="text-xs font-semibold mb-2 text-gray-500">发送图片:</h3>
                                                            <div className="relative w-full h-56">
                                                                <Image src={topic.image.startsWith("http") ? `/api/image-proxy?url=${encodeURIComponent(topic.image)}` : topic.image} alt={topic.title} layout="fill" objectFit="contain" className="rounded-lg" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-medium">{`${selectedTopics.length + 2}. 复制结束语`}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <Textarea value={closingText} readOnly rows={3} />
                                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyToClipboard(closingText)}>
                                                <Copy className="h-4 w-4 mr-2" />复制
                                            </Button>
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
        </main>
    );
}

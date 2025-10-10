"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, RefreshCw, Image as ImageIcon } from "lucide-react";

interface DailyAICardProps {
    onCopy?: (content: string) => void;
}

interface HitokotoResponse {
    id: number;
    hitokoto: string;
    type: string;
    from: string;
    from_who?: string;
    creator: string;
    created_at: string;
}

const DailyAICard: React.FC<DailyAICardProps> = ({ onCopy }) => {
    const [copied, setCopied] = useState(false);
    const [quote, setQuote] = useState<HitokotoResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [backgroundImage, setBackgroundImage] = useState<string>('');
    const [imageLoading, setImageLoading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const getCurrentDate = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekday = weekdays[now.getDay()];
        return `${year}.${month}.${day} ${weekday}`;
    };



    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return "早安";
        if (hour >= 12 && hour < 14) return "午安";
        if (hour >= 14 && hour < 18) return "下午好";
        if (hour >= 18 && hour < 22) return "晚安";
        return "夜深了";
    };

    // 获取氛围感背景图片 - 修复版本
    const fetchBackgroundImage = useCallback(async () => {
        setImageLoading(true);
        try {
            // 先获取图片
            const imageUrl = `https://picsum.photos/900/600?blur=2&random=${Date.now()}`;
            
            // 预加载图片并转换为blob URL，确保图片一致性
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            // 清理旧的blob URL
            if (backgroundImage && backgroundImage.startsWith('blob:')) {
                URL.revokeObjectURL(backgroundImage);
            }
            
            setBackgroundImage(blobUrl);
        } catch (error) {
            console.error('获取背景图片失败:', error);
            setBackgroundImage('');
        } finally {
            setImageLoading(false);
        }
    }, [backgroundImage]);

    const fetchQuote = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k');
            const data: HitokotoResponse = await response.json();
            setQuote(data);
        } catch (error) {
            console.error('获取每日寄语失败:', error);
            setQuote({
                id: 0,
                hitokoto: "今天也要元气满满地学习新知识呀！",
                type: "k",
                from: "AI日课",
                creator: "system",
                created_at: new Date().toISOString()
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuote();
        fetchBackgroundImage();
        
        // 清理函数：组件卸载时清理blob URL
        return () => {
            if (backgroundImage && backgroundImage.startsWith('blob:')) {
                URL.revokeObjectURL(backgroundImage);
            }
        };
    }, [fetchQuote, fetchBackgroundImage, backgroundImage]);

    // 清理旧的blob URL当背景图片改变时
    useEffect(() => {
        return () => {
            if (backgroundImage && backgroundImage.startsWith('blob:')) {
                URL.revokeObjectURL(backgroundImage);
            }
        };
    }, [backgroundImage]);

    const generateCardContent = () => {
        if (!quote) return '';
        const author = quote.from_who ? `${quote.from_who} · ${quote.from}` : quote.from;
        return `#AI日课\n\n${getCurrentDate()} ${getTimeGreeting()}\n\n"${quote.hitokoto}"\n\n— ${author}\n\n每日AI精选 · 保持学习`;
    };

    const copyToClipboard = async () => {
        try {
            if (cardRef.current) {
                const html2canvas = (await import('html2canvas')).default;
                
                // 等待图片完全加载
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const canvas = await html2canvas(cardRef.current, {
                    backgroundColor: '#1a1a1a',
                    scale: 2,
                    logging: false,
                    useCORS: false, // 使用blob URL不需要CORS
                    allowTaint: false,
                    width: cardRef.current.offsetWidth,
                    height: cardRef.current.offsetHeight,
                    onclone: (clonedDoc: Document) => {
                        // 确保克隆的文档中图片已加载
                        const images = clonedDoc.querySelectorAll('img');
                        images.forEach(img => {
                            img.style.display = 'block';
                            if (!img.alt) {
                                img.alt = '';
                            }
                        });
                    }
                });
                
                canvas.toBlob(async (blob: Blob | null) => {
                    if (blob) {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({
                                    'image/png': blob
                                })
                            ]);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            onCopy?.('图片已复制到剪贴板');
                        } catch {
                            await navigator.clipboard.writeText(generateCardContent());
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            onCopy?.('文本内容已复制到剪贴板');
                        }
                    }
                }, 'image/png');
            }
        } catch {
            try {
                await navigator.clipboard.writeText(generateCardContent());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                onCopy?.('文本内容已复制到剪贴板');
            } catch (err) {
                console.error('复制失败:', err);
            }
        }
    };

    const downloadAsImage = async () => {
        try {
            if (cardRef.current) {
                const html2canvas = (await import('html2canvas')).default;
                
                // 等待图片完全加载
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const canvas = await html2canvas(cardRef.current, {
                    backgroundColor: '#1a1a1a',
                    scale: 2,
                    logging: false,
                    useCORS: false, // 使用blob URL不需要CORS
                    allowTaint: false,
                    width: cardRef.current.offsetWidth,
                    height: cardRef.current.offsetHeight,
                    onclone: (clonedDoc: Document) => {
                        // 确保克隆的文档中图片已加载
                        const images = clonedDoc.querySelectorAll('img');
                        images.forEach(img => {
                            img.style.display = 'block';
                            if (!img.alt) {
                                img.alt = '';
                            }
                        });
                    }
                });
                
                const link = document.createElement('a');
                link.download = `AI日课-${getCurrentDate().replace(/[\s.]/g, '-')}.png`;
                link.href = canvas.toDataURL();
                link.click();
            }
        } catch (error) {
            console.error('下载失败:', error);
        }
    };

    const refreshAll = () => {
        fetchQuote();
        fetchBackgroundImage();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-semibold tracking-tight">每日AI早课</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchBackgroundImage}
                        disabled={imageLoading}
                        className="transition-all duration-200 hover:bg-primary/10"
                    >
                        <ImageIcon className={`h-4 w-4 ${imageLoading ? 'animate-spin' : ''}`} />
                        <span className="ml-2">换背景</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchQuote}
                        disabled={loading}
                        className="transition-all duration-200 hover:bg-primary/10"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="ml-2">换寄语</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshAll}
                        disabled={loading || imageLoading}
                        className="transition-all duration-200 hover:bg-primary/10"
                    >
                        <RefreshCw className={`h-4 w-4 ${(loading || imageLoading) ? 'animate-spin' : ''}`} />
                        <span className="ml-2">全部刷新</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        disabled={loading}
                        className="transition-all duration-200 hover:bg-primary/10"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                        <span className="ml-2">
                            {copied ? "已复制" : "复制"}
                        </span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadAsImage}
                        disabled={loading}
                        className="transition-all duration-200 hover:bg-primary/10"
                    >
                        <Download className="h-4 w-4" />
                        <span className="ml-2">下载</span>
                    </Button>
                </div>
            </div>

            <div 
                ref={cardRef}
                className="w-full max-w-2xl mx-auto relative overflow-hidden"
                style={{
                    aspectRatio: '4/3',
                    background: backgroundImage 
                        ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.5)), url(${backgroundImage})`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12 text-center">
                    {loading ? (
                        <div className="space-y-6">
                            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-white/60" />
                            <p className="text-white/60 text-lg">正在获取寄语...</p>
                        </div>
                    ) : quote ? (
                        <div className="space-y-12 max-w-xl">
                            {/* 标题 - 最突出 */}
                            <div className="space-y-4">
                                <h1 className="text-5xl font-bold tracking-wide">#AI日课</h1>
                            </div>

                            {/* 时间问候 - 次要但重要 */}
                            <div className="space-y-6">
                                <div className="text-xl text-white/80 font-light">
                                    {getCurrentDate()}
                                </div>
                                <div className="text-3xl font-semibold">
                                    {getTimeGreeting()}
                                </div>
                            </div>

                            {/* 寄语 - 核心内容 */}
                            <div className="space-y-8">
                                <blockquote className="text-xl font-medium leading-relaxed text-white/95 italic">
                                    &ldquo;{quote.hitokoto}&rdquo;
                                </blockquote>
                                <cite className="text-base text-white/60 font-light not-italic">
                                    — {quote.from_who ? `${quote.from_who}` : quote.from}
                                </cite>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default DailyAICard; 

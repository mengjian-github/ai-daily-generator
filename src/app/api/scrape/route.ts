import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const DAILY_URL = "https://www.aibase.com/zh/daily";
const REALTIME_URL = "https://news.aibase.com/zh/news";
const API_BASE = "https://mcpapi.aibase.cn/api/aiInfo/aiNews";

interface Article {
    title: string;
    date: string;
    description: string;
    source: string;
    url: string;
    image: string;
    topics: Topic[];
}

interface Topic {
    id: number;
    title: string;
    summary: string;
    url: string;
    image: string;
    video?: string;
}

async function fetchWithHeaders(url: string): Promise<string> {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Referer': 'https://news.aibase.com/zh/news',
        'Origin': 'https://news.aibase.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
}

async function getLatestDailyArticle(): Promise<Article> {
    try {
        // 1. 获取日报列表页面
        const listPageHtml = await fetchWithHeaders(DAILY_URL);
        const $list = cheerio.load(listPageHtml);

                        // 2. 找到最新的日报链接，确保是中文版本
        let latestDailyPath = $list('a[href*="/zh/daily/"]').first().attr('href');

        if (!latestDailyPath) {
            // 备用方案：查找包含daily的链接，然后确保是中文版本
            const dailyLinks = $list('a[href*="/daily/"]');
            dailyLinks.each((i, link) => {
                const href = $list(link).attr('href');
                if (href && (href.includes('/zh/') || !href.includes('/en/'))) {
                    latestDailyPath = href;
                    return false; // 停止循环
                }
            });
        }

        if (!latestDailyPath) {
            throw new Error("Could not find the link to the latest daily report");
        }

        // 确保链接是中文版本
        if (!latestDailyPath.includes('/zh/')) {
            // 如果链接不包含/zh/，转换为中文版本
            if (latestDailyPath.startsWith('/daily/')) {
                latestDailyPath = latestDailyPath.replace('/daily/', '/zh/daily/');
            } else if (latestDailyPath.match(/^\/\w+\/daily\//)) {
                // 如果是其他语言版本，替换为中文版本
                latestDailyPath = latestDailyPath.replace(/^\/\w+\/daily\//, '/zh/daily/');
            }
        }

        const latestDailyUrl = new URL(latestDailyPath, DAILY_URL).href;

        // 3. 获取日报详情页面
        const detailPageHtml = await fetchWithHeaders(latestDailyUrl);
        const $ = cheerio.load(detailPageHtml);

        // 4. 提取基本信息
        const article = $('article').first();
        if (article.length === 0) {
            throw new Error("Could not find article element");
        }

        const title = article.find('h1').text().trim() || '';

        // 尝试多种方式获取日期
        let dateText = '';
        const timeElement = article.find('time').first();
        if (timeElement.length > 0) {
            dateText = timeElement.attr('datetime') || timeElement.text().trim();
        }

        if (!dateText) {
            // 备用方案：查找日期格式的文本
            article.find('*').each((_, element) => {
                const text = $(element).text().trim();
                // 匹配日期格式：YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD 或 Jun 6, 2025等
                const dateMatch = text.match(/(?:202[0-9][-/.]\d{1,2}[-/.]\d{1,2})|(?:[A-Z][a-z]{2}\s+\d{1,2},?\s+202[0-9])|(?:\d{1,2}月\d{1,2}日)|(?:202[0-9]年\d{1,2}月\d{1,2}日)/);
                if (dateMatch && !dateText && text.length < 50) { // 确保不是长文本
                    dateText = dateMatch[0];
                    return false; // 相当于break
                }
            });

            // 如果还是没找到，使用当前日期
            if (!dateText) {
                const now = new Date();
                dateText = now.toISOString().split('T')[0]; // YYYY-MM-DD格式
            }
        }

        const description = article.find('p').first().text().trim() || '';
        const source = "AIbase 日报";
        const image = article.find('img').first().attr('src') || '';

        // 5. 提取主题内容
        const topics: Topic[] = [];
        let topicIndex = 0;

        article.find('p > strong').each((index, element) => {
            const $strong = $(element);
            const titleText = $strong.text().trim();

            // 检查是否是有效的主题标题（以数字开头）
            if (!/^\d+[、.]\s*/.test(titleText) && !titleText.includes('.')) {
                return; // 继续下一个
            }

            const title = titleText.replace(/^\d+[、.]\s*/, '').trim();
            let summary = '';
            let image = '';
            let video = '';
            let detailUrl = '';

            // 查找相关内容
            let $current = $strong.parent();

            while ($current.next().length > 0) {
                $current = $current.next();

                // 如果遇到下一个主题，停止
                const nextStrong = $current.find('strong').first();
                if (nextStrong.length > 0) {
                    const nextStrongText = nextStrong.text().trim();
                    if (/^\d+[、.]\s*/.test(nextStrongText)) {
                        break;
                    }
                }

                // 提取图片
                if ($current.is('p')) {
                    const img = $current.find('img').first();
                    if (img.length > 0 && !image) {
                        image = img.attr('src') || '';
                    }

                    // 提取视频
                    const videoElement = $current.find('video').first();
                    if (videoElement.length > 0 && !video) {
                        video = videoElement.attr('src') || videoElement.find('source').first().attr('src') || '';
                    }
                }

                // 提取摘要内容
                if ($current.is('blockquote')) {
                    const points: string[] = [];
                    $current.find('p').each((_, p) => {
                        const text = $(p).text().trim();
                        if (text && !text.startsWith('【AiBase提要')) {
                            if (text.startsWith('详情链接:')) {
                                detailUrl = text.replace('详情链接:', '').trim();
                            } else {
                                points.push(text);
                            }
                        }
                    });
                    summary = points.join('\n');
                } else if ($current.is('p')) {
                    const text = $current.text().trim();
                    if (text) {
                        summary += (summary ? '\n' : '') + text;
                    }
                }
            }

            if (title) {
                topics.push({
                    id: topicIndex++,
                    title,
                    summary,
                    url: detailUrl,
                    image: image || 'https://placehold.co/600x400/7d34ec/white?text=AI+Daily',
                    video
                });
            }
        });

        return {
            title,
            date: dateText,
            description,
            source,
            url: latestDailyUrl,
            image,
            topics
        };

    } catch (error) {
        console.error("Cheerio scraping error:", error);
        throw error;
    }
}

interface ApiResponse {
    code: number;
    msg: string;
    data: {
        totalCount: number;
        pageSize: number;
        pageNo: number;
        totalPage: number;
        list: ApiNewsItem[];
    };
}

interface ApiNewsItem {
    title: string;
    subtitle: string;
    thumb: string;
    sourceName: string;
    author: string;
    description: string;
    oid: number;
    createTime: string;
    pv: number;
}

async function getRealtimeNews(): Promise<Article> {
    try {
        const newsItems: Topic[] = [];
        const within24HoursItems: Topic[] = []; // 存储24小时内的新闻
        let topicIndex = 0;
        let page = 1;
        const maxPages = 10; // 增加页数以确保能找到足够的新闻
        const targetHours = 24; // 目标时间范围：24小时
        const minNewsCount = 20; // 最少新闻数量

        console.log('开始获取实时新闻数据（24小时内优先，不足20条则补充更早新闻）...');

        // 计算24小时前的时间
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - targetHours * 60 * 60 * 1000);
        console.log(`24小时时间范围: ${twentyFourHoursAgo.toLocaleString()} 至 ${now.toLocaleString()}`);

        while (page <= maxPages && newsItems.length < minNewsCount) {
            try {
                // 使用API获取数据
                const timestamp = Date.now();
                const apiUrl = `${API_BASE}?t=${timestamp}&langType=zh_cn&pageNo=${page}`;
                console.log(`正在获取第 ${page} 页数据: ${apiUrl}`);

                const response = await fetchWithHeaders(apiUrl);
                const data: ApiResponse = JSON.parse(response);

                if (data.code !== 200 || !data.data?.list) {
                    console.error(`第 ${page} 页API响应异常:`, data);
                    break;
                }

                console.log(`第 ${page} 页获取到 ${data.data.list.length} 条新闻`);

                // 处理API返回的新闻数据
                for (const item of data.data.list) {
                    if (newsItems.length >= minNewsCount) {
                        break; // 已经达到最少新闻数量，停止处理
                    }

                    // 解析新闻时间
                    const newsDate = new Date(item.createTime);
                    const isWithin24Hours = newsDate >= twentyFourHoursAgo;

                    // 构建新闻项目
                    const newsItem: Topic = {
                        id: topicIndex++,
                        title: item.title || '无标题',
                        summary: item.description || '暂无描述',
                        url: `https://news.aibase.com/zh/news/${item.oid}`,
                        image: item.thumb || 'https://placehold.co/600x400/7d34ec/white?text=AI+News',
                        video: undefined
                    };

                    if (isWithin24Hours) {
                        // 24小时内的新闻，优先添加
                        within24HoursItems.push(newsItem);
                        newsItems.push(newsItem);
                        console.log(`添加24小时内新闻: ${newsItem.title} (${item.createTime})`);
                    } else {
                        // 超过24小时的新闻，只有在不足20条时才添加
                        if (within24HoursItems.length < minNewsCount) {
                            newsItems.push(newsItem);
                            console.log(`补充较早新闻: ${newsItem.title} (${item.createTime})`);
                        } else {
                            console.log(`跳过较早新闻（已有足够24小时内新闻）: ${newsItem.title} (${item.createTime})`);
                        }
                    }
                }

                page++;
            } catch (pageError) {
                console.error(`获取第 ${page} 页失败:`, pageError);
                break;
            }
        }

        // 生成描述信息
        let description: string;
        const within24Count = within24HoursItems.length;
        const totalCount = newsItems.length;

        if (within24Count >= minNewsCount) {
            description = `最近24小时内为您精选了 ${totalCount} 条最新AI资讯，涵盖技术突破、产品发布、行业动态等多个方面。`;
            console.log(`返回 ${totalCount} 条新闻，全部为24小时内`);
        } else if (within24Count > 0) {
            const olderCount = totalCount - within24Count;
            description = `为您精选了 ${totalCount} 条最新AI资讯，其中 ${within24Count} 条为24小时内最新资讯，${olderCount} 条为较早优质资讯，涵盖技术突破、产品发布、行业动态等多个方面。`;
            console.log(`返回 ${totalCount} 条新闻，其中24小时内 ${within24Count} 条，较早 ${olderCount} 条`);
        } else {
            description = `为您精选了 ${totalCount} 条最新AI资讯，涵盖技术突破、产品发布、行业动态等多个方面。`;
            console.log(`返回 ${totalCount} 条新闻，无24小时内新闻`);
        }

        // 构建返回的文章数据
        const dateStr = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            title: `AI 实时资讯 - ${dateStr}`,
            date: dateStr,
            description,
            source: "AIbase新闻中心",
            url: REALTIME_URL,
            image: "https://www.aibase.com/favicon.ico",
            topics: newsItems
        };

    } catch (error) {
        console.error("Realtime news scraping error:", error);
        throw error;
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'realtime'; // 默认使用实时新闻

        let dailyReportArticle: Article;

        if (source === 'realtime') {
            dailyReportArticle = await getRealtimeNews();
        } else {
            dailyReportArticle = await getLatestDailyArticle();
        }

        return NextResponse.json({ articles: [dailyReportArticle] });
    } catch (error) {
        console.error("Scraping error:", error);
        const errorMessage = error instanceof Error ? error.message : "An error occurred during scraping";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const DAILY_URL = "https://www.aibase.com/zh/daily";
const REALTIME_URL = "https://www.aibase.com/zh/news";

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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
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

async function getRealtimeNews(): Promise<Article> {
    try {
        const newsItems: Topic[] = [];
        let topicIndex = 0;
        let page = 1;
        const maxPages = 5; // 最多爬取5页，避免无限循环
        const targetHours = 24; // 目标时间范围：24小时
        const pageSize = 20; // 每页20条

        // 使用真实的API端点
        const API_URL = "https://app.chinaz.com/djflkdsoisknfoklsyhownfrlewfknoiaewf/ai/GetAiInfoList.aspx";

        // 解析时间文本，返回分钟数
        function parseTimeToMinutes(timeText: string): number | null {
            // 匹配各种时间格式
            const patterns = [
                { regex: /(\d+)\s*分钟前/, multiplier: 1 },
                { regex: /(\d+)\s*小时前/, multiplier: 60 },
                { regex: /(\d+)\s*天前/, multiplier: 60 * 24 },
                { regex: /昨天/, multiplier: 60 * 24 }, // 昨天按24小时算
                { regex: /前天/, multiplier: 60 * 48 }, // 前天按48小时算
            ];

            for (const pattern of patterns) {
                const match = timeText.match(pattern.regex);
                if (match) {
                    if (pattern.regex.test('昨天') || pattern.regex.test('前天')) {
                        return pattern.multiplier;
                    }
                    return parseInt(match[1]) * pattern.multiplier;
                }
            }
            return null;
        }

        // 用于去重的 Set
        const seenNewsIds = new Set<string>();

        while (page <= maxPages) {
            try {
                // 使用API获取数据
                const apiUrl = `${API_URL}?flag=zh&type=1&page=${page}&pagesize=${pageSize}`;
                console.log(`正在获取第 ${page} 页数据: ${apiUrl}`);

                const response = await fetchWithHeaders(apiUrl);

                // 尝试解析JSON响应
                let data;
                try {
                    data = JSON.parse(response);
                } catch {
                    console.error(`第 ${page} 页JSON解析失败，尝试解析HTML`);
                    // 如果不是JSON，则回退到HTML解析
                    const $ = cheerio.load(response);

                    // 查找所有包含新闻ID的链接
                    const newsLinks = $('a').filter((_, el) => {
                        const href = $(el).attr('href');
                        return !!(href && href.match(/\/news\/\d+$/));
                    });

                    if (newsLinks.length === 0) {
                        console.log(`第 ${page} 页没有找到新闻链接，停止爬取`);
                        break;
                    }

                    let shouldContinue = true;

                    for (let i = 0; i < newsLinks.length; i++) {
                        const linkElement = newsLinks.eq(i);
                        const href = linkElement.attr('href');

                        if (!href) continue;

                        // 提取新闻ID用于去重
                        const newsIdMatch = href.match(/\/news\/(\d+)$/);
                        const newsId = newsIdMatch ? newsIdMatch[1] : href;

                        // 如果已经处理过这条新闻，跳过
                        if (seenNewsIds.has(newsId)) {
                            console.log(`跳过重复新闻: ${newsId}`);
                            continue;
                        }
                        seenNewsIds.add(newsId);

                                                        // 获取时间信息
                                const fullText = linkElement.text().trim();
                                const timeMatch = fullText.match(/(\d+\s*分钟前|\d+\s*小时前|\d+\s*天前|昨天|前天)/);

                                if (timeMatch) {
                                    const timeText = timeMatch[0];
                                    const minutes = parseTimeToMinutes(timeText);

                                    if (minutes !== null && minutes > targetHours * 60) {
                                        console.log(`发现超过24小时的新闻（${timeText}），停止爬取`);
                                        shouldContinue = false;
                                        break;
                                    }
                                }

                                // 构建完整的中文URL - 确保包含 /zh/
                                let newsUrl: string;
                                if (href.startsWith('http')) {
                                    newsUrl = href;
                                } else if (href.startsWith('/zh/')) {
                                    newsUrl = `https://www.aibase.com${href}`;
                                } else if (href.match(/^\/news\/\d+$/)) {
                                    // 如果是 /news/12345 格式，转换为 /zh/news/12345
                                    newsUrl = `https://www.aibase.com/zh${href}`;
                                } else {
                                    newsUrl = `https://www.aibase.com${href}`;
                                }

                                try {
                                    // 从链接元素中提取信息
                                    const title = linkElement.find('h3').text().trim();

                                    // 提取摘要 - 查找不包含时间信息的文本
                                    const fullTextForSummary = linkElement.text().trim();
                                    const summaryMatch = fullTextForSummary.match(/[^.]+(?:电影感|模型|AI|技术|发布|推出|测试|智能|数据|创新|应用|平台|系统|开发|研究|公司|产品).*/);
                                    let summary = summaryMatch ? summaryMatch[0].substring(0, 200) : fullTextForSummary.substring(0, 200);

                                    // 查找图片
                                    const imageElement = linkElement.find('img').first();
                                    const image = imageElement.attr('src') || '';

                                    if (title && summary) {
                                // 尝试从详情页获取真实的项目链接
                                let projectUrl = '';
                                try {
                                    const detailPageHtml = await fetchWithHeaders(newsUrl);
                                    const $detail = cheerio.load(detailPageHtml);
                                    const article = $detail('article').first();

                                    if (article.length > 0) {
                                        // 如果没有摘要，尝试从详情页获取
                                        if (!summary) {
                                            let detailContent = '';
                                            article.find('p').slice(0, 3).each((_, p) => {
                                                const text = $detail(p).text().trim();
                                                if (text &&
                                                    !text.includes('【AiBase提要') &&
                                                    !text.includes('图源备注') &&
                                                    !text.includes('欢迎来到【AI日报】') &&
                                                    text.length > 20) {
                                                    detailContent += (detailContent ? '\n' : '') + text;
                                                }
                                            });
                                            if (detailContent) {
                                                summary = detailContent.substring(0, 500) + '...';
                                            }
                                        }

                                        // 查找文章中的外部链接（项目真实链接）
                                        article.find('a').each((_, link) => {
                                            const href = $detail(link).attr('href');
                                            const linkText = $detail(link).text().trim();

                                            // 排除AIbase内部链接和标签链接
                                            if (href &&
                                                !href.includes('aibase.com') &&
                                                !href.includes('/zh/search/') &&
                                                !href.includes('/zh/news/') &&
                                                !href.startsWith('#') &&
                                                !href.startsWith('/') &&
                                                (href.startsWith('http://') || href.startsWith('https://')) &&
                                                linkText.length > 0) {
                                                projectUrl = href;
                                                return false; // 找到第一个有效链接就停止
                                            }
                                        });

                                        // 如果没有找到链接元素，尝试从段落中提取链接
                                        if (!projectUrl) {
                                            article.find('p').each((_, p) => {
                                                const text = $detail(p).text().trim();
                                                // 查找包含链接格式的文本（如"地址：https://..."）
                                                const urlMatch = text.match(/(?:地址|链接|网址|URL|官网|项目地址|体验地址|访问地址)[\s:：]*(https?:\/\/[^\s]+)/i);
                                                if (urlMatch && urlMatch[1]) {
                                                    const potentialUrl = urlMatch[1];
                                                    // 排除AIbase的链接
                                                    if (!potentialUrl.includes('aibase.com')) {
                                                        projectUrl = potentialUrl;
                                                        return false;
                                                    }
                                                }
                                            });
                                        }
                                    }
                                } catch {
                                    console.log(`无法获取详情页内容: ${newsUrl}`);
                                }

                                newsItems.push({
                                    id: topicIndex++,
                                    title,
                                    summary: summary.substring(0, 500) + (summary.length > 500 ? '...' : ''),
                                    url: projectUrl, // 使用真实的项目链接，如果没有则为空字符串
                                    image: image || 'https://placehold.co/600x400/7d34ec/white?text=AI+News',
                                    video: undefined
                                });
                            }
                        } catch (itemError) {
                            console.error(`Error processing news item:`, itemError);
                            continue;
                        }
                    }

                    if (!shouldContinue) {
                        break;
                    }
                    continue;
                }

                // 如果是JSON数据，处理JSON格式的响应
                if (Array.isArray(data)) {
                    // API直接返回的是数组格式
                    const newsList = data;

                    if (newsList.length === 0) {
                        console.log(`第 ${page} 页没有更多新闻，停止爬取`);
                        break;
                    }

                    let shouldContinue = true;

                    for (const newsItem of newsList) {
                        // 提取新闻ID用于去重
                        const newsId = newsItem.Id || newsItem.id || newsItem.newsid;

                        // 如果已经处理过这条新闻，跳过
                        if (seenNewsIds.has(String(newsId))) {
                            console.log(`跳过重复新闻: ${newsId}`);
                            continue;
                        }
                        seenNewsIds.add(String(newsId));

                        // 检查时间 - 使用 addtime 字段
                        if (newsItem.addtime) {
                            // 解析时间字符串，格式如 "2025-06-24 10:34:24"
                            const newsDate = new Date(newsItem.addtime);
                            const now = new Date();
                            const hoursAgo = (now.getTime() - newsDate.getTime()) / (1000 * 60 * 60);

                            if (hoursAgo > targetHours) {
                                console.log(`发现超过24小时的新闻（${newsItem.addtime}），停止爬取`);
                                shouldContinue = false;
                                break;
                            }
                        }

                        // 构建新闻URL
                        let newsUrl = newsItem.url;
                        if (!newsUrl && newsItem.Id) {
                            newsUrl = `https://www.aibase.com/zh/news/${newsItem.Id}`;
                        }

                        // 提取信息
                        const title = newsItem.title || '';
                        let summary = newsItem.description || '';

                        // 如果有HTML格式的summary，提取文本内容
                        if (newsItem.summary) {
                            const $summary = cheerio.load(newsItem.summary);
                            // 移除所有HTML标签，只保留文本
                            summary = $summary.root().text().trim();
                        }

                        const image = newsItem.thumb || newsItem.image || '';

                        if (title && newsUrl) {
                            // 尝试从详情页获取真实的项目链接
                            let projectUrl = '';
                            try {
                                const detailPageHtml = await fetchWithHeaders(newsUrl);
                                const $detail = cheerio.load(detailPageHtml);
                                const article = $detail('article').first();

                                if (article.length > 0) {
                                    // 如果没有摘要，尝试从详情页获取
                                    if (!summary) {
                                        let detailContent = '';
                                        article.find('p').slice(0, 3).each((_, p) => {
                                            const text = $detail(p).text().trim();
                                            if (text &&
                                                !text.includes('【AiBase提要') &&
                                                !text.includes('图源备注') &&
                                                !text.includes('欢迎来到【AI日报】') &&
                                                text.length > 20) {
                                                detailContent += (detailContent ? '\n' : '') + text;
                                            }
                                        });
                                        if (detailContent) {
                                            summary = detailContent.substring(0, 500) + '...';
                                        }
                                    }

                                    // 查找文章中的外部链接（项目真实链接）
                                    article.find('a').each((_, link) => {
                                        const href = $detail(link).attr('href');
                                        const linkText = $detail(link).text().trim();

                                        // 排除AIbase内部链接和标签链接
                                        if (href &&
                                            !href.includes('aibase.com') &&
                                            !href.includes('/zh/search/') &&
                                            !href.includes('/zh/news/') &&
                                            !href.startsWith('#') &&
                                            !href.startsWith('/') &&
                                            (href.startsWith('http://') || href.startsWith('https://')) &&
                                            linkText.length > 0) {
                                            projectUrl = href;
                                            return false; // 找到第一个有效链接就停止
                                        }
                                    });

                                    // 如果没有找到链接元素，尝试从段落中提取链接
                                    if (!projectUrl) {
                                        article.find('p').each((_, p) => {
                                            const text = $detail(p).text().trim();
                                            // 查找包含链接格式的文本（如"地址：https://..."）
                                            const urlMatch = text.match(/(?:地址|链接|网址|URL|官网|项目地址|体验地址|访问地址)[\s:：]*(https?:\/\/[^\s]+)/i);
                                            if (urlMatch && urlMatch[1]) {
                                                const potentialUrl = urlMatch[1];
                                                // 排除AIbase的链接
                                                if (!potentialUrl.includes('aibase.com')) {
                                                    projectUrl = potentialUrl;
                                                    return false;
                                                }
                                            }
                                        });
                                    }
                                }
                            } catch {
                                console.log(`无法获取详情页内容: ${newsUrl}`);
                            }

                            newsItems.push({
                                id: topicIndex++,
                                title,
                                summary: summary.substring(0, 500) + (summary.length > 500 ? '...' : ''),
                                url: projectUrl, // 使用真实的项目链接，如果没有则为空字符串
                                image: image || 'https://placehold.co/600x400/7d34ec/white?text=AI+News',
                                video: undefined
                            });
                        }
                    }

                    if (!shouldContinue) {
                        break;
                    }
                } else {
                    console.log(`第 ${page} 页数据格式不正确，不是数组格式`);
                    break;
                }

            } catch (pageError) {
                console.error(`获取第 ${page} 页失败:`, pageError);
                // 如果是第一页就失败，则抛出错误；否则继续处理已有数据
                if (page === 1) {
                    throw pageError;
                }
                break;
            }

            console.log(`第 ${page} 页爬取完成，已获取 ${newsItems.length} 条新闻（去重后）`);
            page++;
        }

        // 如果没有获取到任何新闻，返回错误
        if (newsItems.length === 0) {
            throw new Error('未能获取到任何新闻内容，请检查网页结构是否发生变化');
        }

        console.log(`总共获取了 ${newsItems.length} 条24小时内的新闻（去重后）`);

        // 返回整合的文章数据
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            title: `AI 实时资讯 - ${dateStr}`,
            date: dateStr,
            description: `最新 24 小时 AI 行业动态和技术进展（共 ${newsItems.length} 条）`,
            source: "AIbase 实时资讯",
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
        const source = searchParams.get('source') || 'daily';

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

import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

const DAILY_URL = "https://www.aibase.com/zh/daily";

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
            // 备用方案：在页面中搜索包含年份的文本
            article.find('*').each((_, element) => {
                const text = $(element).text().trim();
                if (text.includes('202') && text.match(/\d{4}/) && !dateText) {
                    dateText = text;
                    return false; // 相当于break
                }
            });
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

export async function GET() {
    try {
        const dailyReportArticle = await getLatestDailyArticle();
        return NextResponse.json({ articles: [dailyReportArticle] });
    } catch (error) {
        console.error("Scraping error:", error);
        const errorMessage = error instanceof Error ? error.message : "An error occurred during scraping";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

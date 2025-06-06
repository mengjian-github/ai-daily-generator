import { NextResponse } from "next/server";
import puppeteer, { Page } from "puppeteer";

const DAILY_URL = "https://www.aibase.com/zh/daily";

async function getLatestDailyArticle(page: Page) {
    await page.goto(DAILY_URL, { waitUntil: 'networkidle0' });

    const latestDailyUrl = await page.evaluate((url: string) => {
        const link = document.querySelector('main a[href^="/zh/daily/"]');
        if (link) {
            return new URL(link.getAttribute('href')!, url).href;
        }
        return null;
    }, DAILY_URL);


    if (!latestDailyUrl) {
        throw new Error("Could not find the link to the latest daily report on the main page.");
    }

    await page.goto(latestDailyUrl, { waitUntil: 'networkidle0' });

    const articleData = await page.evaluate(() => {
        const article = document.querySelector('article');
        if (!article) return null;

        const title = article.querySelector('h1')?.textContent?.trim() || '';
        const dateElement = article.querySelector('time, [datetime], .date'); // More robust date selector
        const dateText = dateElement ? (dateElement.getAttribute('datetime') || dateElement.textContent?.trim()) :
            Array.from(article.querySelectorAll('div > span')).find(span => span.textContent?.includes('202'))?.textContent?.trim() || '';


        const description = article.querySelector('p')?.textContent?.trim() || '';
        const source = "AIbase 日报";

        const topics = Array.from(article.querySelectorAll('p > strong')).map((strong, index) => {
            const titleElement = strong;
            const titleText = titleElement?.textContent?.trim() || '';

            // Skip if it's not a real topic entry
            if (!/^\d+、/.test(titleText) && !titleText.includes('.')) {
                return null;
            }
            const title = titleText.replace(/^\d+[、.]\s*/, '').trim();


            let summary = '';
            let image = '';
            let video = '';
            let detailUrl = '';

            let currentNode: Element | null = strong.parentElement;

            while (currentNode?.nextElementSibling) {
                currentNode = currentNode.nextElementSibling;
                if (currentNode.tagName === 'P' && (currentNode.querySelector('strong'))) {
                     const nextStrongText = currentNode.querySelector('strong')?.textContent?.trim() || '';
                     if (/^\d+[、.]\s*/.test(nextStrongText)) {
                        break; // Stop if we've hit the next numbered topic
                     }
                }

                if (currentNode.tagName === 'P') {
                     const imgInP = currentNode.querySelector('img');
                     if(imgInP && !image) {
                        image = imgInP.src;
                     }
                     const videoInP = currentNode.querySelector('video');
                     if(videoInP && !video) {
                        video = videoInP.src || videoInP.querySelector('source')?.src || '';
                     }
                }


                if (currentNode.tagName === 'BLOCKQUOTE') {
                    const points = Array.from(currentNode.querySelectorAll('p')).map(p => p.textContent?.trim());
                    points.shift(); // remove 【AiBase提要:】

                    const linkPoint = points.find(p => p && p.startsWith('详情链接:'));
                    if (linkPoint) {
                        detailUrl = linkPoint.replace('详情链接:', '').trim();
                    }
                    summary = points.filter(p => p && !p.startsWith('详情链接:')).join('\\n');
                } else if (currentNode.tagName === 'P') {
                    summary += (summary ? '\\n' : '') + currentNode.textContent?.trim();
                }

            }


            return {
                id: index,
                title: title,
                summary: summary,
                url: detailUrl, // Use the extracted detail url
                image: image || 'https://placehold.co/600x400/7d34ec/white?text=AI+Daily',
                video: video
            };
        }).filter(topic => topic && topic.title); // Filter out any empty or invalid topics

        return {
            title,
            date: dateText,
            description,
            source,
            url: window.location.href,
            image: (article.querySelector('img') as HTMLImageElement)?.src || '',
            topics,
        };
    });

    if (!articleData) {
        throw new Error("Failed to extract article data from the detail page. The page structure may have changed.");
    }

    return articleData;
}


export async function GET() {
    let browser = null;
    try {
                browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920x1080',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-extensions'
            ]
        });
        const page = await browser.newPage();

        const dailyReportArticle = await getLatestDailyArticle(page);

        return NextResponse.json({ articles: [dailyReportArticle] });

    } catch (error) {
        console.error("Playwright scraping error:", error);
        const errorMessage = error instanceof Error ? error.message : "An error occurred during scraping";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

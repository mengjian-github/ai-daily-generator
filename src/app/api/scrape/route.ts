import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function GET() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    const page = await context.newPage();

    // Navigate to the page and wait for it to be fully loaded
    await page.goto("https://news.aibase.cn/news", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // The content is now expected to be loaded, proceed with evaluation
    const articles = await page.evaluate(() => {
      const articles: any[] = [];
      document.querySelectorAll(".media.py-3").forEach((element, index) => {
        const titleElement = element.querySelector("h4.media-heading a");
        const title = titleElement?.textContent?.trim();
        let url = titleElement?.getAttribute("href");

        const imageElement = element.querySelector("img");
        let imageUrl = imageElement?.getAttribute("src");

        if (title && url && imageUrl) {
          if (url.startsWith("/")) {
            url = `https://news.aibase.cn${url}`;
          }
          if (imageUrl.startsWith("/")) {
            imageUrl = `https://news.aibase.cn${imageUrl}`;
          }

          articles.push({
            id: index,
            title: title,
            source: "AIbase News",
            url: url,
            image: imageUrl,
          });
        }
      });
      return articles;
    });

    if (articles.length === 0) {
      return NextResponse.json(
        {
          error:
            "No articles found. The scraper might need adjustments if the site structure has changed.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "An error occurred during scraping with Playwright" },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

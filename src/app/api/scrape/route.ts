import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET() {
  try {
    const response = await fetch("https://www.aibasedaohang.com/hot", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch AIbase page" },
        { status: 500 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const articles: any[] = [];
    $(".col-md-4.item").each((index, element) => {
      const titleElement = $(element).find("h2.title a");
      const title = titleElement.text().trim();
      const url = titleElement.attr("href");
      const imageElement = $(element).find(".card-img-top img");
      const imageUrl = imageElement.attr("src");

      if (title && url && imageUrl) {
        articles.push({
          id: index,
          title: title,
          source: "AIbase",
          url: `https://www.aibasedaohang.com${url}`,
          image: imageUrl,
        });
      }
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "An error occurred during scraping" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

/**
 * A robust resolver for Nuxt's __NUXT_DATA__ serialization format.
 * It recursively reconstructs the original data objects from the payload array.
 * @param indexedItem - The current item to resolve. Can be a primitive, object, or array.
 * @param payload - The complete __NUXT_DATA__ array.
 * @returns The fully resolved data structure.
 */
function resolve(indexedItem: any, payload: any[]): any {
    if (Array.isArray(indexedItem)) {
        // Handle Nuxt's reactive wrappers
        const [first, second] = indexedItem;
        if (["ShallowReactive", "Reactive", "Ref"].includes(first) && typeof second === 'number') {
            return resolve(payload[second], payload);
        }
        // Handle arrays of indices
        return indexedItem.map(itemIndex => resolve(payload[itemIndex], payload));
    }
    if (typeof indexedItem === 'object' && indexedItem !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key in indexedItem) {
            const index = indexedItem[key];
            newObj[key] = resolve(payload[index], payload);
        }
        return newObj;
    }
    // It's a primitive value (string, number, boolean), return as is.
    return indexedItem;
}


export async function GET() {
  try {
    const response = await fetch("https://news.aibase.cn/news", {
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
    const nuxtDataString = $("#__NUXT_DATA__").text();

    if (!nuxtDataString) {
      return NextResponse.json(
        { error: "Could not find __NUXT_DATA__ script tag." },
        { status: 500 }
      );
    }

    const nuxtDataPayload = JSON.parse(nuxtDataString);

    const dataPointerObject = nuxtDataPayload.find((item: any) =>
        typeof item === 'object' && item !== null && 'getAINewsList' in item
    );

    if (!dataPointerObject) {
         return NextResponse.json(
            { error: "Could not find the data entry point in __NUXT_DATA__." },
            { status: 500 }
        );
    }

    const resolvedData = resolve(dataPointerObject, nuxtDataPayload);
    const getAINewsListResponse = resolvedData.getAINewsList;

    // Final path correction
    const newsListData = getAINewsListResponse.data;

    if (!newsListData || !Array.isArray(newsListData.list)) {
      return NextResponse.json(
        { error: "Final resolved data is missing the 'list' array. The structure might have changed again." },
        { status: 500 }
      );
    }

    const articles = newsListData.list.map((item: any, index: number) => {
        return {
            id: item.id || index,
            title: item.title,
            source: item.sourcename || "AIbase News",
            url: `https://news.aibase.cn/news/${item.id}`,
            image: item.thumb
        }
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Scraping error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: `An error occurred during scraping: ${errorMessage}` },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get("url");

  if (!imageUrl) {
    return new NextResponse("URL parameter is required", { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        "Referer": "https://news.aibase.cn/",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch image", { status: response.status });
    }

    const imageBlob = await response.blob();
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "image/png");

    return new NextResponse(imageBlob, { status: 200, headers });

  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Error fetching image.", { status: 500 });
  }
}

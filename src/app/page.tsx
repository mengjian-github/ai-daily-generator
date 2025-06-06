"use client";

import { useState } from "react";

interface Article {
  id: number;
  title: string;
  source: string;
  url: string;
  image: string;
}

interface DebugInfo {
  screenshotUrl: string;
  htmlContent: string;
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticles, setSelectedArticles] = useState<Set<number>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const handleFetchNews = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);
    try {
      const response = await fetch("/api/scrape");
      const data = await response.json();
      if (!response.ok) {
        if (data.debugInfo) {
          setDebugInfo(data.debugInfo);
        }
        throw new Error(data.error || "Failed to fetch news");
      }
      setArticles(data.articles);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArticleSelection = (articleId: number) => {
    setSelectedArticles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(articleId)) {
        newSelection.delete(articleId);
      } else {
        newSelection.add(articleId);
      }
      return newSelection;
    });
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-bold text-gray-800">AI 日课生成器</h1>
            <button
              onClick={handleFetchNews}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? "正在获取..." : "获取最新动态"}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="text-left text-red-500 bg-red-100 p-4 rounded-md mb-8">
            <p className="font-bold">Error: {error}</p>
            {debugInfo && (
              <div className="mt-4">
                <p className="font-semibold">Debugging Information:</p>
                <a
                  href={debugInfo.screenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Screenshot (saved in public folder)
                </a>
                <p className="font-semibold mt-4">Received HTML Content:</p>
                <textarea
                  readOnly
                  className="w-full h-64 bg-red-50 text-red-700 p-2 mt-1 rounded text-xs font-mono"
                  value={debugInfo.htmlContent}
                />
              </div>
            )}
          </div>
        )}

        {articles.length === 0 && !isLoading && !error && (
          <div className="text-center text-gray-500 pt-16">
            <p>点击 "获取最新动态" 来加载 AI 资讯。</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <div
              key={article.id}
              onClick={() => toggleArticleSelection(article.id)}
              className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 ${
                selectedArticles.has(article.id)
                  ? "ring-2 ring-blue-500 scale-105"
                  : "hover:shadow-xl"
              }`}
            >
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500">{article.source}</p>
              </div>
            </div>
          ))}
        </div>

        {articles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              格式化输出
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-4">微信群格式</h3>
                <div className="space-y-4">
                  {articles
                    .filter((a) => selectedArticles.has(a.id))
                    .map((article, index) => (
                      <div key={article.id} className="text-sm">
                        <p className="font-semibold">
                          {index + 1}. {article.title}
                        </p>
                        <p className="text-gray-600 mt-1">
                          (图片请在下方单独复制)
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-4">朋友圈 / 知识星球格式</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="font-semibold">#AI日课</p>
                    <p>大家好，我来分享今日值得关注的 AI 动态</p>
                  </div>
                  <div className="pl-4">
                    {articles
                      .filter((a) => selectedArticles.has(a.id))
                      .map((article, index) => (
                        <p key={article.id}>
                          {index + 1}. {article.title}
                        </p>
                      ))}
                  </div>
                  <p className="text-gray-600 mt-2">
                    (配图如下，请自行保存)
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {articles
                      .filter((a) => selectedArticles.has(a.id))
                      .map((article) => (
                        <img
                          key={article.id}
                          src={article.image}
                          alt={article.title}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

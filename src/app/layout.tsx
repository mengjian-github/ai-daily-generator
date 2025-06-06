import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Daily Generator - 智能日报生成器",
  description: "一键生成专属 AI 日报，智能化内容创作助手。从 AIbase 获取最新 AI 资讯，自动格式化为适合各种平台分享的内容。",
  keywords: "AI日报,人工智能,资讯生成器,内容创作,AIbase,智能助手,自动化",
  authors: [{ name: "AI Daily Generator Team" }],
  creator: "AI Daily Generator",
  publisher: "AI Daily Generator",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ai-daily-generator.vercel.app'),
  openGraph: {
    title: "AI Daily Generator - 智能日报生成器",
    description: "一键生成专属 AI 日报，智能化内容创作助手",
    url: "https://ai-daily-generator.vercel.app",
    siteName: "AI Daily Generator",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "AI Daily Generator",
      },
    ],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Daily Generator - 智能日报生成器",
    description: "一键生成专属 AI 日报，智能化内容创作助手",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
          {/* 全局背景装饰 */}
          <div className="fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-primary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>

          {/* 主要内容 */}
          <main className="relative z-10">
            {children}
          </main>

          {/* 页脚 */}
          <footer className="relative z-10 border-t border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-primary to-purple-600 rounded-lg">
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 3L4 14h7v7l9-11h-7V3z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">AI Daily Generator</p>
                    <p className="text-xs text-muted-foreground">智能日报生成器</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <span>© 2024 AI Daily Generator</span>
                  <span>•</span>
                  <span>基于 AIbase 数据源</span>
                  <span>•</span>
                  <span>智能化内容创作</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

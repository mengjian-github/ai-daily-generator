# AI Daily Generator - 智能日报生成器 ✨

一款现代化的AI资讯日报生成工具，帮您快速获取、整理和分享最新的AI动态。

## 🌟 主要功能

### 📰 智能资讯抓取
- 自动从 AIbase 获取最新 AI 资讯
- 支持日更与实时 24 小时两种来源
- 图片通过代理服务稳定显示

### 🎯 手动甄选素材
- 可视化素材池逐条浏览
- 勾选保留内容即可构建稿件
- 支持图片、视频提示与原文链接

### 📝 一键生成图文日报
- 勾选后实时生成结构化文章，开头自动加入“大家好，我是孟健。”
- Markdown 一键复制，贴到任意平台

### 📚 详情补充
- 自动抓取 AIbase 详情页结构
- 提取关键信息、要点列表与外链
- 生成更完整的摘要内容

### 🧠 DeepSeek 微信风格写稿
- 一键调用 `deepseek/deepseek-chat-v3.1:free`
- 输出完整成稿，包含导语、分段小标题、配图与结尾升华，默认不附原文链接，直接可发

### 🎨 现代化界面
- 响应式设计，支持所有设备
- 明暗主题切换
- 优雅的动画和交互效果
- 渐变色彩和玻璃态效果

## 🛠️ 技术栈

- **前端框架**: Next.js 15 + React 19
- **样式方案**: Tailwind CSS + shadcn/ui
- **数据抓取**: Playwright
- **UI组件**: Radix UI
- **图标库**: Lucide React
- **字体**: Geist Sans & Mono

## 🚀 快速开始

### 环境要求
- Node.js 18+
- npm/yarn/pnpm

### 安装依赖
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 运行开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本
```bash
npm run build
npm start
```

## 📁 项目结构

```
ai-daily-generator/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   │   ├── scrape/     # 数据抓取接口
│   │   │   └── image-proxy/ # 图片代理接口
│   │   ├── globals.css     # 全局样式
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 主页面
│   ├── components/         # React 组件
│   │   ├── ui/            # UI 基础组件
│   │   ├── FeatureStats.tsx # 功能特性展示
│   │   └── ThemeToggle.tsx  # 主题切换
│   └── lib/               # 工具函数
├── public/                # 静态资源
└── README.md
```

## 🎮 使用指南

### 1. 获取最新素材
点击“获取最新素材”按钮，从 AIbase 抓取实时或日更资讯，等待素材池刷新完成。

### 2. 勾选保留条目
在左侧素材池中逐条查看内容，勾选想写进日报的资讯（可随时调整、支持全选与清空）。

### 3. 搜索与分页管理
利用搜索框快速定位关键词，或调整分页条数便于集中处理同类资讯。

### 4. 生成与复制
右侧实时预览成稿；需要 DeepSeek 润色时点击“让 LLM 成稿”，确认无误后复制 Markdown 粘贴到目标平台。

## ⚙️ 配置

| 变量 | 说明 |
| --- | --- |
| `OPENROUTER_API_KEY` | 必填，用于调用 deepseek 模型 |
| `OPENROUTER_MODEL` | 选填，默认为 `deepseek/deepseek-chat-v3.1:free` |
| `OPENROUTER_SITE_URL` / `OPENROUTER_APP_TITLE` | 选填，OpenRouter 统计用 |

## 🌈 主要特性

### 🎨 现代化设计
- 采用最新的设计趋势和交互模式
- 支持明暗主题自动切换
- 流畅的动画和过渡效果
- 响应式布局，完美适配各种设备

### ⚡ 高效创作体验
- 勾选素材即可生成文章，无需手动排版
- Markdown 导出便于粘贴到任何平台
- 错误提示与降级策略提升稳定性
- DeepSeek 成稿遵循公众号节奏，默认不输出原文链接

### 🔧 可扩展性
- 模块化的组件设计
- 清晰的代码结构
- 易于添加新的数据源与生成策略
- 保留 API 接口，方便扩展到其他 LLM 服务

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：
- 🐛 错误报告
- 💡 功能建议
- 📝 文档改进
- 🔧 代码贡献

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

- [AIbase](https://www.aibase.com/) - 提供优质的AI资讯数据源
- [Next.js](https://nextjs.org/) - 强大的React框架
- [Tailwind CSS](https://tailwindcss.com/) - 实用的CSS框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的UI组件库

---

**AI Daily Generator** - 让AI资讯分享变得简单高效 🚀

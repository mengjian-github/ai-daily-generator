# AI Daily Generator - 智能日报生成器 ✨

一款现代化的AI资讯日报生成工具，帮您快速获取、整理和分享最新的AI动态。

## 🌟 主要功能

### 📰 智能资讯抓取
- 自动从 AIbase 获取最新AI资讯
- 实时更新，确保信息时效性
- 智能内容识别和过滤

### 🎯 内容精选
- 可视化的内容选择界面
- 支持图片、视频等多媒体内容
- 智能摘要和链接提取

### 📱 多平台格式化
- **微信群格式**: 适合微信群分享的格式化内容
- **朋友圈/知识星球**: 精美的社交媒体格式
- **一键复制**: 快速复制到剪贴板

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

### 1. 获取最新资讯
点击"获取最新日报"按钮，系统将自动从 AIbase 抓取最新的AI资讯。

### 2. 选择分享内容
在左侧面板中，浏览并选择您感兴趣的资讯话题。每个话题都包含：
- 标题和摘要
- 相关图片或视频
- 详情链接

### 3. 格式化输出
在右侧面板中选择输出格式：
- **微信群格式**: 分段式内容，便于逐条发送
- **朋友圈格式**: 整合式内容，适合一次性分享

### 4. 一键复制
点击复制按钮，将格式化后的内容复制到剪贴板，然后粘贴到目标平台。

## 🌈 主要特性

### 🎨 现代化设计
- 采用最新的设计趋势和交互模式
- 支持明暗主题自动切换
- 流畅的动画和过渡效果
- 响应式布局，完美适配各种设备

### ⚡ 高性能
- 基于 Next.js 15 的最新特性
- 服务端渲染和静态生成
- 图片优化和懒加载
- 快速的数据获取和处理

### 🛡️ 可靠性
- 完善的错误处理机制
- 数据抓取失败时的降级策略
- 用户友好的错误提示

### 🔧 可扩展性
- 模块化的组件设计
- 清晰的代码结构
- 易于添加新的数据源
- 支持自定义格式化模板

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

## 🐳 Docker 部署说明

### 1. 构建镜像
```bash
docker build -t ai-daily-generator .
```

### 2. 运行容器
```bash
docker run -d -p 3000:3000 --name ai-daily-generator ai-daily-generator
```

### 3. 访问服务
浏览器打开 [http://localhost:3000](http://localhost:3000) 即可访问。

> 如需自定义环境变量，可在 `docker run` 时添加 `-e` 参数。

---

**AI Daily Generator** - 让AI资讯分享变得简单高效 🚀

"use client";

import { TrendingUp, Users, Clock, Zap, Target, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  color: string;
}

function StatCard({ icon, label, value, description, color }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 w-fit`}>
              {icon}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FeatureStats() {
  const stats = [
    {
      icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
      label: "数据源更新",
      value: "实时",
      description: "从 AIbase 获取最新 AI 资讯",
      color: "from-blue-500/20 to-blue-600/20"
    },
    {
      icon: <Users className="h-6 w-6 text-green-600" />,
      label: "支持平台",
      value: "3+",
      description: "微信群、朋友圈、知识星球",
      color: "from-green-500/20 to-green-600/20"
    },
    {
      icon: <Clock className="h-6 w-6 text-purple-600" />,
      label: "处理速度",
      value: "< 10s",
      description: "快速抓取并格式化内容",
      color: "from-purple-500/20 to-purple-600/20"
    },
    {
      icon: <Zap className="h-6 w-6 text-yellow-600" />,
      label: "智能筛选",
      value: "AI 驱动",
      description: "自动识别重要资讯内容",
      color: "from-yellow-500/20 to-yellow-600/20"
    },
    {
      icon: <Target className="h-6 w-6 text-red-600" />,
      label: "准确率",
      value: "95%+",
      description: "高质量内容识别和提取",
      color: "from-red-500/20 to-red-600/20"
    },
    {
      icon: <Share2 className="h-6 w-6 text-indigo-600" />,
      label: "一键分享",
      value: "多格式",
      description: "适配不同社交媒体平台",
      color: "from-indigo-500/20 to-indigo-600/20"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-purple-600 to-blue-600 bg-clip-text text-transparent">
          功能特性
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          我们为您提供专业、高效、智能的 AI 资讯整理服务
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
    </div>
  );
}

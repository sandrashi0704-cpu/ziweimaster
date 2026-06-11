# 紫微斗数 · 命盘排盘与解读引擎

> 基于倪海夏《天纪》教学体系的紫微斗数排盘系统，提供完整排盘算法、四化系统、格局分析、古籍原文查询及 AI 命盘解读能力。

---

## 项目简介

本项目是一个完整的紫微斗数命盘排盘与解读 Web 应用，基于 Next.js 构建。用户输入出生年月日时和性别即可获得完整的紫微斗数命盘，包含十二宫解读、四化分析、大限流年运势等信息。

### 核心功能

- **命盘排盘**：支持公历/农历出生日期输入，自动完成安命宫、定五行局、安十四主星、安辅星、排大限流年
- **四化分析**：禄权科忌四化飞星分布与解读
- **格局识别**：紫府同宫、杀破狼、机月同梁等经典格局自动判定
- **合盘分析**：双盘比对逻辑，分析两人命盘互动
- **古籍查询**：内置《紫微斗数全书》、《紫微斗数全集》、《骨髓赋》等经典古籍原文
- **命理百科**：14 主星 × 12 宫位的结构化知识数据
- **AI 解读**：结合大语言模型的智能命盘解读（需自行配置 API）

### 技术栈

- **框架**：Next.js 15 (App Router)
- **语言**：TypeScript
- **样式**：Tailwind CSS + CSS Variables 设计系统
- **排盘**：基于 iztro + lunar-javascript
- **动画**：Framer Motion

---

## 快速开始

```bash
# 克隆
git clone https://github.com/sandrashi0704-cpu/ziweimaster.git
cd ziweimaster

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 AI API Key（如需 AI 解读功能）

# 启动开发服务器
npm run dev
```

> 注意：开源版不含后端 API 路由 /api/interpret 等，AI 解读功能需自行实现接口。排盘算法和前-端界面可独立运行。

---

## 项目结构

```
├── app/                    # Next.js 页面路由
│   ├── chart/             # 命盘排盘工作台
│   ├── heming/            # 合盘分析页
│   ├── knowledge/         # 命理百科（14 主星 × 12 宫位）
│   ├── library/           # 古籍阅读器（全文搜索）
│   ├── preview/           # 命盘预览
│   ├── privacy/           # 隐私政策
│   └── terms/             # 服务条款
├── components/             # React 组件
│   ├── ChartBoard.tsx     # 命盘方格组件
│   ├── StarField.tsx      # 星曜面板组件
│   ├── PalaceCell.tsx     # 宫位单元格组件
│   ├── BirthForm.tsx      # 出生信息表单
│   ├── ChatPanel.tsx      # AI 对话面板
│   └── ...
├── lib/
│   ├── ziwei/             # 排盘算法与知识库
│   │   ├── algorithm.ts   # 核心排盘算法
│   │   ├── sihua.ts       # 四化系统
│   │   ├── patterns.ts    # 格局分析
│   │   ├── constants.ts   # 星曜常量
│   │   ├── cities.ts      # 中国城市经纬度
│   │   └── types.ts       # 类型定义
│   ├── classics/           # 古籍原文数据
│   ├── nihai/             # 倪海夏体系知识
│   └── seo/               # SEO 知识图谱
├── public/                 # 静态资源
└── ...
```

---

## 协议

本项目代码基于 MIT 协议开源，详见 [LICENSE](./LICENSE) 文件。

---

## 数据来源

本项目使用了 **紫微斗数开源样本数据集 v3.0**（518,400 条）

来源：https://github.com/Renhuai123/ziwei-doushu

作者：王多鱼AI

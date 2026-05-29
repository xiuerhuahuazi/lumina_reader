# Lumina Reader

AI 驱动的本地 RSS 阅读器，内置 [RSSHub](https://github.com/DIYgod/RSSHub) 订阅引擎。

## 架构

```
浏览器 → localhost:3000 (Express)
           ├── /              → React SPA 三栏阅读器
           ├── /api/*         → feeds/groups/articles REST API
           ├── /api/rsshub/routes → RSSHub 100+ 路由查询
           └── /rss/*         → RSSHub 代理（内部端口 1201）
```

- **前端**：React 19 + Tailwind CSS 4 + Vite
- **后端**：Express 5 + TypeScript（`server.ts` 单体服务）
- **数据库**：PostgreSQL（持久化）+ IndexedDB（本地状态缓存）
- **订阅引擎**：RSSHub（Hono 框架），提供 100+ 平台 RSS 路由

## 功能

- **三栏布局**：侧栏（订阅源 + 智能分组） → 文章列表 → 阅读器
- **RSSHub 集成**：FeedManager 内置「浏览 RSSHub」Tab，搜索平台、预览内容、一键订阅
- **智能分组**：基于关键词匹配自动归类文章（技术前沿、深度长文、轻快简讯等）
- **B站视频内嵌播放**：自动将 B站 iframe 替换为官方嵌入播放器，阅读器内直接观看
- **定时抓取**：5分钟/15分钟/30分钟/1小时/手动 五档频率
- **已读/星标**：状态持久化到 PostgreSQL + IndexedDB，刷新不丢失
- **快捷键**：J/K 导航、M 已读、F 聚焦模式、/ 搜索
- **持久化开关**：每个订阅源可独立开启/关闭内容持久化

## 前置要求

- **Node.js** ≥ 22
- **pnpm**（RSSHub 依赖管理）
- **PostgreSQL** 17+

## 快速开始

```bash
# 1. 克隆项目
git clone git@github.com:xiuerhuahuazi/lumina_reader.git
cd lumina_reader

# 2. 克隆 RSSHub（订阅引擎）
cd .. && git clone git@github.com:DIYgod/RSSHub.git
cd RSSHub && pnpm install && cd ../lumina_reader

# 3. 安装依赖
npm install

# 4. 创建数据库
createdb lumina_reader

# 5. 配置环境变量
cp .env.example .env
# 编辑 .env，至少设置 GEMINI_API_KEY（AI 功能需要，可留空使用基本功能）

# 6. 启动
bash start.sh
```

打开 `http://localhost:3000`。

### 手动启动

```bash
# 终端 1：启动 RSSHub
cd ../RSSHub && PORT=1201 npx tsx lib/index.ts

# 终端 2：启动 Lumina Reader
node --import tsx/esm server.ts
```

## 添加订阅源

1. 点击侧栏底部「管理订阅源」
2. **浏览 RSSHub** Tab：搜索平台 → 选路由 → 点订阅
3. **手动输入 URL** Tab：粘贴任意 RSS 地址

RSSHub 已内置 B站、知乎、GitHub、V2EX、36氪等 100+ 平台路由。

## 自定义 RSS 路由

在 `../RSSHub/lib/routes/` 下创建目录和路由文件：

```
lib/routes/myfeed/
  namespace.ts    # 命名空间定义
  index.ts        # 路由处理函数
```

重启 RSSHub 后即可在 FeedManager 中搜索到。

## 项目结构

```
lumina_reader/
  server.ts              # Express 服务入口（API + Vite 中间件 + RSSHub 代理）
  src/
    App.tsx              # 根组件（状态管理、筛选、快捷键）
    types.ts             # TypeScript 类型定义
    components/
      Sidebar.tsx        # 左侧栏（智能分组 + 原始源列表）
      ArticleList.tsx    # 中间文章列表
      Reader.tsx         # 右侧阅读器
      FeedManager.tsx    # 订阅源管理（浏览 RSSHub + 手动 URL 双 Tab）
      GroupManager.tsx   # 智能分组管理
    services/
      rsshub.ts          # RSSHub 路由查询客户端
    hooks/
      useArticleState.ts # 文章已读/星标状态（Dexie + SyncManager）
    db/
      localDb.ts         # IndexedDB 数据库（Dexie）
  start.sh               # 一键启动脚本（RSSHub + Lumina Reader）
```

## 许可证

[Apache-2.0](LICENSE)

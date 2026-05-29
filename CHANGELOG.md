# Changelog

本文件记录 Lumina Reader 项目变更。设计文档详细变更见 [doc/CHANGELOG.md](./doc/CHANGELOG.md)。

## [Unreleased]

### Added — 2026-05-29
- RSSHub 深度集成：统一端口 3000，Express 代理 /rss/* 到内部 RSSHub 实例（端口 1201），`server.ts` 启动脚本 `start.sh`
- RSSHub 路由浏览：FeedManager 新增「浏览 RSSHub」Tab，搜索平台、展开路由、一键订阅 (`src/components/FeedManager.tsx`)
- RSSHub 路由列表 API：`GET /api/rsshub/routes` 返回全部命名空间与路由 (`server.ts`)
- RSSHub `/routes.json` 端点：`app-bootstrap.tsx` 新增路由元数据查询，100+ 平台路由可通过 JSON 获取 (`../RSSHub/lib/app-bootstrap.tsx`)
- AI HOT 路由参数化：`/rss/aihot/feed/:type?` 支持 feed/all/daily 三种类型 (`../RSSHub/lib/routes/aihot/feed.ts`)
- Moerats B站路由：`/rss/moerats/bilibili/:id` 代理 moerats.com 的 B站 RSS 服务 (`../RSSHub/lib/routes/moerats/`)
- RSSHub 类型定义：`RSSHubRoute`、`RSSHubNamespace` 接口 (`src/types.ts`)
- RSSHub 前端服务层：`fetchRSSHubRoutes()` API 客户端 (`src/services/rsshub.ts`)
- 默认订阅源改为走 `/rss/aihot/feed` 本地代理 (`server.ts`)
- Reader 文章头部添加「原文链接」文字超链接，与来源、日期水平排列，用 `·` 分隔 (`src/components/Reader.tsx`)

### Fixed — 2026-05-29
- 修复 fetchFeed 内部 URL 拼接未去除 /rss/ 前缀导致 RSSHub 代理订阅返回 404 (`server.ts`)
- 修复 Reader 中原文链接按钮被移除后残留的 LinkIcon 引用导致 React 渲染崩溃白屏 (`src/components/Reader.tsx`)
- 修复 CDP 代理 IPv6 兼容性问题：代理原使用 127.0.0.1，macOS Chrome 绑定 [::1]，改用 /json/version 发现机制 (`~/.claude/skills/web-access/scripts/cdp-proxy.mjs`)
- B站视频 iframe 替换：将 `blackboard/html5mobileplayer.html`（B站防盗链，第三方不可播放）替换为 `player.bilibili.com/player.html` 官方嵌入播放器 (`server.ts`)
- React 性能优化：Sidebar/ArticleList/Reader 添加 React.memo 阻止无效重渲染，filteredArticles/feedsWithCounts/selectedArticle 改用 useMemo 稳定引用，navigateArticle 用 ref 替代动态依赖避免 useCallback 失效 (`App.tsx`, `Sidebar.tsx`, `ArticleList.tsx`, `Reader.tsx`)
- 修复 Sidebar 重构时 className 参数被误删导致 ReferenceError (`src/components/Sidebar.tsx`)
- 修复 Reader 滚动时 B站视频 iframe 重复刷新：dangerouslySetInnerHTML 改为 ref + useEffect 仅在内容变化时更新 DOM (`src/components/Reader.tsx`)

### Added — 2026-05-29
- 阅读元数据本地优先持久化架构：Dexie IndexedDB 本地数据库 + SyncManager 后台同步队列 + useArticleState 统一读写 hook (`src/db/localDb.ts`, `src/services/syncManager.ts`, `src/hooks/useArticleState.ts`)
- 已读/未读状态即时持久化到 IndexedDB，页面刷新后状态不丢失 (`src/App.tsx`)
- 星标状态持久化，Reader 中 Star 按钮可点击切换并填充 accent 色 (`src/components/Reader.tsx`)
- SyncManager 智能同步：2s 防抖批量写入、requestIdleCallback 空闲同步、beforeunload 关闭前推送、失败自动重试（最多 5 次）、页面隐藏时暂停
- BroadcastChannel 多 Tab 同步：一个 Tab 标记已读/星标后其他 Tab 实时更新 (`src/hooks/useArticleState.ts`)
- 启动时 IndexedDB 本地状态与服务端 PG 状态合并，本地优先策略

### Fixed — 2026-05-29
- 修复 `/api/articles/read` 和 `/api/articles/star` 端点互相覆盖状态的问题：新增 `updateArticleReadState`/`updateArticleStarState` 仅更新目标字段，read/star 操作不再互斥 (`src/db.ts`, `server.ts`)

### Added — 2026-05-28
- PostgreSQL 持久化层（`src/db.ts`）：feeds/groups/article_texts/article_states 四表，替代内存 Map 存储，重启数据不丢失 (`src/db.ts`, `server.ts`)
- 订阅源持久化开关：FeedManager 中每个 feed 可独立开启/关闭数据持久化，开启后文章正文自动写入 PG，关闭后已有数据保留不动 (`FeedManager.tsx`, `server.ts`, `App.tsx`)
- `persisted` 字段添加到 Feed 类型和 API 响应 (`src/types.ts`, `server.ts`)
- 文章阅读状态（isRead/isStarred）持久化到 article_states 表，重启后状态保留 (`server.ts`, `App.tsx`)
- article_texts 表 UNIQUE(feed_id, url) 去重约束，相同 feed+url 不产生重复记录
- 完成文章阅读状态处理：`toggleArticleRead` 集中管理已读/未读切换，j/k 导航和点击"上一篇/下一篇"自动标记目标文章为已读，M 键统一调用 toggle (`App.tsx`)
- Reader 工具栏添加已读/未读切换按钮（CheckCircle 图标），已读时填充 accent 色 (`Reader.tsx`)
- 侧边栏未读计数改为动态计算：feeds 从 articles 派生，系统分组和用户规则组基于关键词匹配实时统计未读数 (`Sidebar.tsx`, `App.tsx`)
- 文章列表未读指示线添加 transition 过渡动画（300ms opacity/background-color），标记已读时平滑消失 (`ArticleList.tsx`)
- 创建项目级前端 UI/交互 agent (`.claude/agents/ui-designer.md`)，负责审查和修复 UI 视觉与交互问题
- T01: 初始化 Vite + TypeScript + ESLint 基础工程（`index.html`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `src/main.tsx`）
- T01: 补齐应用入口骨架（`src/app/App.tsx`）
- T02: Dexie Schema v1 与数据库入口（`src/db/database.ts`）
- T02: repositories 初版（`src/db/repositories/{feedsRepo,articlesRepo,smartGroupsRepo,settingsRepo}.ts`）
- T02: 类型契约落位（`src/types/index.ts`）
- T03: 全局 CSS tokens 与 dark 主题（`src/styles/tokens.css`, `src/styles/themes/dark.css`, `src/styles/global.css`）
- T04: 三栏布局与可拖拽分隔条（`src/components/layout/{AppShell.tsx,ResizablePane.tsx,appShell.css}`）

### Fixed — 2026-05-28
- 修复 Vite 构建配置与 React 组件代码不匹配导致页面空白：将 vite.config.ts SolidJS 插件替换为 @vitejs/plugin-react，main.tsx 改用 React createRoot，tsconfig jsxImportSource 改为 react (`vite.config.ts`, `src/main.tsx`, `tsconfig.json`)
- 修复 Vite 配置缺少 @tailwindcss/vite 插件导致 Tailwind v4 样式全部失效，UI 无背景色/排版：添加 tailwindcss() 插件到 vite.config.ts plugins 数组 (`vite.config.ts`)
- 修复 Reader 底部"上一篇"/"下一篇"按钮无点击功能：新增 `onNavigatePrev`/`onNavigateNext` props 并绑定点击事件，位置计数器动态显示实际位置 (`Reader.tsx`, `App.tsx`)
- 修复 j/k 键盘快捷键在筛选状态下导航全量 articles 的问题：改为基于 `filteredArticles` 导航 (`App.tsx`)
- 修复右侧阅读面板不随列表选择加载文章内容的问题：`AppShell` 重新组合 `SidebarFeeds` + `ArticleList` + `ReadingPanel`，并恢复 `OPMLImporter` 为弹窗 (`AppShell.tsx`)
- `.listItem` 添加固定高度 `72px`，匹配虚拟滚动 ROW_HEIGHT 常量，防止行高偏移 (`appShell.css`)
- `ArticleContent` 移除 fallback `<p>` 包裹，统一使用 `innerHTML` 渲染，避免 HTML 源码裸露 (`ArticleContent.tsx`)
- 侧栏 feed 名称添加溢出省略号样式 (`.sidebar__name`) (`appShell.css`)
- 拖拽分隔条手柄添加 `user-select: none`，防止拖拽时触发文本选中 (`appShell.css`)
- 列表工具栏 hint 改为快捷键提示 (J/K nav · M read · S star · V open) (`ArticleList.tsx`)
- 阅读面板 "Open original" 链接添加 accent 色和下划线样式 (`.reader__meta a`) (`appShell.css`)
- Reader 空态提示在阅读区域内水平/垂直居中（`src/components/Reader.tsx`）
- Reader 阅读区高度链路修正，避免底部大空位（`src/App.tsx`, `src/components/Reader.tsx`）
- 焦点模式下关闭文章导致黑屏：关闭时自动退出焦点模式并恢复侧栏（`src/App.tsx`）

## [0.1.0] — 2026-05-28

### Added — T01-T04 基础框架
- T01: Vite + SolidJS + TypeScript + ESLint 项目初始化
- T02: Dexie Schema v1 + repositories (articles, feeds, smartGroups, settings)
- T03: CSS tokens + dark 主题 (`tokens.css`, `themes/dark.css`)
- T04: AppShell 三栏布局 + ResizablePane 拖拽分隔条

### Added — T05-T06 侧栏与 RSS
- T05: SidebarFeeds 组件（Smart Groups / Feeds 列表、失败感叹号 `consecutiveFailures >= 3`）
- T06: RSS 抓取 (`feedFetcher.ts`) + 定时刷新服务 (`feedRefreshTimer.ts`，Page Visibility API 降频)
- Vite CORS 代理中间件 (`/api/proxy`)，解决 dev 环境跨域抓取

### Added — T07-T08 列表与阅读
- T07: ArticleList 组件 + ArticleListItem 组件，集成虚拟滚动（52px 行高 + overscan）
- T08: ReadingPanel + ArticleContent 组件，集成 `@mozilla/readability` 全文提取 + `dompurify` 消毒
- 文章提取服务 (`articleExtractor.ts`)，dev 环境通过代理绕过 CORS

### Added — T09-T12 导入、设置、快捷键、测试
- T09: OPML 解析服务 (`opmlParser.ts`，fast-xml-parser) + OPMLImporter 导入预览 UI（拖拽/点击上传、去重、勾选导入）
- T10: settingsStore 响应式持久化，sidebarWidth/listWidth 自动保存
- T11: 全局快捷键 J/K（导航）、M（已读）、S（星标）、V（打开原文），带列表滚动跟随
- T12: Vitest 单元测试 17 个（feedFetcher 3, opmlParser 5, relativeTime 7, articleExtractor 2）
- `relativeTime.ts` 工具函数（刚刚/分钟前/小时前/天前/周前）

### Changed
- `App.tsx` 移除空的 Router 包裹，直接渲染 AppShell
- `AppShell.tsx` 拆分为 SidebarFeeds、ArticleList、ReadingPanel、OPMLImporter 四个独立组件
- `package.json` 中 `packageManager` 修正为合法 semver (`pnpm@9.0.0`)
- OPML 解析从 DOMParser 切换为 fast-xml-parser（兼顾 Node.js 测试环境）
- `seedFeeds.ts` 单 feed 失败不阻断其他 feed

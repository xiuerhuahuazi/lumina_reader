# Lumina Reader

An AI-powered local RSS reader with [RSSHub](https://github.com/DIYgod/RSSHub) built-in as the subscription engine.

## Architecture

```
Browser → localhost:3000 (Express)
           ├── /              → React SPA (three-column reader)
           ├── /api/*         → feeds/groups/articles REST API
           ├── /api/rsshub/routes → RSSHub 100+ route discovery
           └── /rss/*         → RSSHub proxy (internal port 1201)
```

- **Frontend**: React 19 + Tailwind CSS 4 + Vite
- **Backend**: Express 5 + TypeScript (`server.ts` monolithic service)
- **Database**: PostgreSQL (persistence) + IndexedDB (local state cache)
- **Subscription Engine**: RSSHub (Hono framework), 100+ platform RSS routes

## Features

- **Three-column layout**: Sidebar (feeds + smart groups) → Article list → Reader
- **RSSHub integration**: FeedManager with "Browse RSSHub" tab for searching platforms, previewing content, one-click subscribe
- **Smart groups**: Keyword-based auto-categorization (Tech, Long Reads, Quick News, etc.)
- **Bilibili video embedding**: Auto-replaces Bilibili iframes with official embed player for in-reader playback
- **Scheduled fetching**: 5min/15min/30min/1h/manual refresh intervals
- **Read/Star states**: Persisted to PostgreSQL + IndexedDB, survive page refresh
- **Keyboard shortcuts**: J/K navigate, M read, F focus mode, / search
- **Persistence toggle**: Enable/disable content persistence per feed

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** (for RSSHub dependency management)
- **PostgreSQL** 17+

## Quick Start

```bash
# 1. Clone the project
git clone git@github.com:xiuerhuahuazi/lumina_reader.git
cd lumina_reader

# 2. Clone RSSHub (subscription engine)
cd .. && git clone git@github.com:DIYgod/RSSHub.git
cd RSSHub && pnpm install && cd ../lumina_reader

# 3. Install dependencies
npm install

# 4. Create database
createdb lumina_reader

# 5. Configure environment
cp .env.example .env
# Edit .env, set GEMINI_API_KEY at minimum (can leave as placeholder for basic usage)

# 6. Start
bash start.sh
```

Open `http://localhost:3000`.

### Manual Start

```bash
# Terminal 1: Start RSSHub
cd ../RSSHub && PORT=1201 npx tsx lib/index.ts

# Terminal 2: Start Lumina Reader
node --import tsx/esm server.ts
```

## Adding Feeds

1. Click "管理订阅源" (Manage Feeds) at the bottom of the sidebar
2. **Browse RSSHub** tab: Search platform → pick route → click subscribe
3. **Manual URL** tab: Paste any RSS feed URL

RSSHub ships with 100+ platform routes including Bilibili, Zhihu, GitHub, V2EX, Hacker News, and more.

## Custom RSS Routes

Create route files under `../RSSHub/lib/routes/`:

```
lib/routes/myfeed/
  namespace.ts    # namespace definition
  index.ts        # route handler
```

Restart RSSHub and the new route will appear in FeedManager.

## Project Structure

```
lumina_reader/
  server.ts              # Express entry (API + Vite middleware + RSSHub proxy)
  src/
    App.tsx              # Root component (state, filtering, keyboard shortcuts)
    types.ts             # TypeScript type definitions
    components/
      Sidebar.tsx        # Left sidebar (smart groups + feed list)
      ArticleList.tsx    # Article list panel
      Reader.tsx         # Reading panel
      FeedManager.tsx    # Feed manager (Browse RSSHub + Manual URL tabs)
      GroupManager.tsx   # Smart group manager
    services/
      rsshub.ts          # RSSHub route discovery client
    hooks/
      useArticleState.ts # Article read/star state (Dexie + SyncManager)
    db/
      localDb.ts         # IndexedDB database (Dexie)
  start.sh               # One-click startup script (RSSHub + Lumina Reader)
```

## License

[Apache-2.0](LICENSE)

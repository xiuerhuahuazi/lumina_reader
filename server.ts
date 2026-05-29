import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Parser from "rss-parser";
import {
  initTables, getFeeds, upsertFeed, deleteFeed,
  getGroups, upsertGroup, deleteGroup,
  upsertArticleTexts, getArticleStates, upsertArticleState,
  updateArticleReadState, updateArticleStarState,
} from "./src/db";

const parser = new Parser();

// ─── RSSHub proxy config ───────────────────────────────────

const RSSHUB_PORT = 1201;

async function fetchRSSHubRoutes() {
  try {
    const resp = await fetch(`http://localhost:${RSSHUB_PORT}/routes.json`);
    return resp.ok ? await resp.json() : [];
  } catch {
    return [];
  }
}

// ─── Types ────────────────────────────────────────────────

type FetchFrequency = '5m' | '15m' | '30m' | '1h' | 'manual';

interface StoredFeed {
  id: string;
  name: string;
  feedUrl: string;
  fetchFrequency: FetchFrequency;
  persisted: boolean;
  errorMessage?: string;
  lastFetchedAt?: number;
  hasError: boolean;
  isStale: boolean;
  intervalId?: ReturnType<typeof setInterval>;
  cachedData?: any;
}

interface StoredGroup {
  id: string;
  name: string;
  rule: { kind: 'keyword' | 'manual'; config: any };
  feedIds: string[];
  sortOrder: number;
  isSystem: boolean;
}

// ─── In-memory cache (RSS content only) ───────────────────

const feedCache = new Map<string, StoredFeed>();
const groupCache = new Map<string, StoredGroup>();
let feedIdCounter = 0;
let groupIdCounter = 0;

// ─── Default data ─────────────────────────────────────────

const defaultFeeds: Omit<StoredFeed, 'intervalId' | 'hasError' | 'isStale' | 'lastFetchedAt'>[] = [
  { id: 'feed-0', name: 'AI HOT — 精选', feedUrl: '/rss/aihot/feed', fetchFrequency: '30m', persisted: false },
  { id: 'feed-1', name: 'AI HOT — 全部 AI 动态', feedUrl: '/rss/aihot/all', fetchFrequency: '1h', persisted: false },
  { id: 'feed-2', name: 'AI HOT 日报', feedUrl: '/rss/aihot/daily', fetchFrequency: '1h', persisted: false },
];

const defaultGroups: StoredGroup[] = [
  { id: 'g1', name: '今日摘要', rule: { kind: 'keyword', config: { keywords: [], matchTitle: true, matchSummary: true, matchTags: false } }, feedIds: [], sortOrder: 0, isSystem: true },
  { id: 'g2', name: '技术前沿', rule: { kind: 'keyword', config: { keywords: ['AI', '大模型', '开源', '架构', '编程'], matchTitle: true, matchSummary: true, matchTags: true } }, feedIds: [], sortOrder: 1, isSystem: true },
  { id: 'g3', name: '深度长文', rule: { kind: 'keyword', config: { keywords: ['深度', '分析', '报告', '研究'], matchTitle: true, matchSummary: false, matchTags: false } }, feedIds: [], sortOrder: 2, isSystem: true },
  { id: 'g4', name: '轻快简讯', rule: { kind: 'keyword', config: { keywords: ['快讯', '简讯', '发布', '更新'], matchTitle: true, matchSummary: false, matchTags: false } }, feedIds: [], sortOrder: 3, isSystem: true },
  { id: 'g5', name: '产品与设计', rule: { kind: 'keyword', config: { keywords: ['产品', '设计', 'UX', 'UI', '体验'], matchTitle: true, matchSummary: true, matchTags: true } }, feedIds: [], sortOrder: 4, isSystem: true },
  { id: 'g6', name: '播客与视频', rule: { kind: 'keyword', config: { keywords: ['播客', '视频', '直播', 'YouTube'], matchTitle: true, matchSummary: false, matchTags: true } }, feedIds: [], sortOrder: 5, isSystem: true },
  { id: 'g7', name: '我的规则组', rule: { kind: 'keyword', config: { keywords: [], matchTitle: true, matchSummary: true, matchTags: false } }, feedIds: [], sortOrder: 6, isSystem: true },
];

// ─── Feed fetching logic ──────────────────────────────────

const FREQ_MS: Record<FetchFrequency, number | null> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  'manual': null,
};

async function fetchFeed(entry: StoredFeed): Promise<any> {
  try {
    const url = entry.feedUrl.startsWith('/rss/')
      ? `http://localhost:${RSSHUB_PORT}${entry.feedUrl.replace(/^\/rss/, '')}`
      : entry.feedUrl;
    const data = await parser.parseURL(url);

    // Replace B站 iframe with official embed player (blackboard player blocked by Referer check)
    if (data?.items && (entry.feedUrl.includes('bilibili') || entry.feedUrl.includes('bili'))) {
      for (const item of data.items) {
        if (item.content) {
          item.content = item.content.replace(
            /<iframe[^>]*src="https?:\/\/www\.bilibili\.com\/blackboard\/[^"]*\?[^"]*bvid=(BV[a-zA-Z0-9]+)[^"]*"[^>]*><\/iframe>/g,
            (_, bvid) => `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&page=1" width="640" height="360" frameborder="0" allowfullscreen></iframe>`
          );
        }
      }
    }

    entry.cachedData = data;
    entry.lastFetchedAt = Date.now();
    entry.hasError = false;
    entry.errorMessage = undefined;
    entry.isStale = false;

    // Persist to PG if enabled
    await upsertFeed({
      id: entry.id,
      name: entry.name,
      feed_url: entry.feedUrl,
      fetch_frequency: entry.fetchFrequency,
      persisted: entry.persisted,
      error_message: null,
      last_fetched_at: entry.lastFetchedAt || null,
      has_error: false,
    });

    // Persist article texts if enabled
    if (entry.persisted && data?.items) {
      const articles = data.items.map((item: any) => ({
        id: item.guid || item.link || `${entry.id}-${Math.random().toString(36).slice(2)}`,
        feed_id: entry.id,
        title: item.title || 'Untitled',
        summary: (item.contentSnippet || item.content || '').substring(0, 500),
        content: item.content || item.contentSnippet || '',
        url: item.link || '',
        source: entry.name,
        tags: item.categories || [],
        published_at: item.isoDate || item.pubDate || 'Unknown Date',
      }));
      await upsertArticleTexts(articles);
    }

    return data;
  } catch (e: any) {
    console.error(`Error parsing feed ${entry.name}:`, e.message);
    entry.hasError = true;
    entry.errorMessage = e.message || 'Unknown error';
    await upsertFeed({
      id: entry.id,
      name: entry.name,
      feed_url: entry.feedUrl,
      fetch_frequency: entry.fetchFrequency,
      persisted: entry.persisted,
      error_message: entry.errorMessage,
      last_fetched_at: entry.lastFetchedAt || null,
      has_error: true,
    });
    return null;
  }
}

function scheduleFeed(entry: StoredFeed) {
  if (entry.intervalId) clearInterval(entry.intervalId);
  const ms = FREQ_MS[entry.fetchFrequency];
  if (ms !== null) {
    entry.intervalId = setInterval(() => fetchFeed(entry), ms);
  }
}

async function initDefaultData() {
  // Load feeds from DB
  const dbFeeds = await getFeeds();

  if (dbFeeds.length === 0) {
    // First run: seed defaults
    feedIdCounter = defaultFeeds.length;
    for (const df of defaultFeeds) {
      const entry: StoredFeed = { ...df, hasError: false, isStale: false };
      feedCache.set(entry.id, entry);
      await upsertFeed({
        id: entry.id,
        name: entry.name,
        feed_url: entry.feedUrl,
        fetch_frequency: entry.fetchFrequency,
        persisted: entry.persisted,
        error_message: null,
        last_fetched_at: null,
        has_error: false,
      });
      fetchFeed(entry).then(() => scheduleFeed(entry));
    }
  } else {
    // Restore from DB, re-fetch RSS content
    let maxId = 0;
    for (const df of dbFeeds) {
      const entry: StoredFeed = {
        id: df.id,
        name: df.name,
        feedUrl: df.feed_url,
        fetchFrequency: df.fetch_frequency as FetchFrequency,
        persisted: df.persisted,
        lastFetchedAt: df.last_fetched_at || undefined,
        hasError: df.has_error,
        isStale: false,
      };
      feedCache.set(entry.id, entry);
      fetchFeed(entry).then(() => scheduleFeed(entry));

      const num = parseInt(df.id.replace('feed-', ''), 10);
      if (!isNaN(num) && num >= maxId) maxId = num + 1;
    }
    feedIdCounter = maxId;
  }

  // Load groups from DB
  const dbGroups = await getGroups();

  if (dbGroups.length === 0) {
    groupIdCounter = defaultGroups.length;
    for (const dg of defaultGroups) {
      groupCache.set(dg.id, dg);
      await upsertGroup({
        id: dg.id,
        name: dg.name,
        rule_kind: dg.rule.kind,
        rule_config: dg.rule.config,
        is_system: dg.isSystem,
        sort_order: dg.sortOrder,
      });
    }
  } else {
    let maxGid = 0;
    for (const dg of dbGroups) {
      groupCache.set(dg.id, {
        id: dg.id,
        name: dg.name,
        rule: { kind: dg.rule_kind as 'keyword' | 'manual', config: dg.rule_config },
        feedIds: [],
        sortOrder: dg.sort_order,
        isSystem: dg.is_system,
      });
      const num = parseInt(dg.id.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= maxGid) maxGid = num + 1;
    }
    groupIdCounter = maxGid || defaultGroups.length;
  }
}

// ─── API response helpers ─────────────────────────────────

async function getArticleStatesMap(): Promise<Map<string, { isRead: boolean; isStarred: boolean }>> {
  const states = await getArticleStates();
  const map = new Map<string, { isRead: boolean; isStarred: boolean }>();
  for (const s of states) {
    map.set(s.guid, { isRead: s.is_read, isStarred: s.is_starred });
  }
  return map;
}

function feedToResponse(f: StoredFeed) {
  return {
    id: f.id,
    name: f.name,
    feedUrl: f.feedUrl,
    fetchFrequency: f.fetchFrequency,
    persisted: f.persisted,
    errorMessage: f.errorMessage || null,
    lastFetchedAt: f.lastFetchedAt || null,
    hasError: f.hasError,
    isStale: f.isStale,
    unreadCount: f.cachedData?.items?.length || 0,
  };
}

// ─── Start server ─────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  await initTables();
  await initDefaultData();

  // ── RSSHub proxy ────────────────────────────────────────

  app.use('/rss', async (req, res) => {
    try {
      // Strip /rss prefix - RSSHub serves routes at root
      const rssPath = req.originalUrl.replace(/^\/rss/, '');
      const targetUrl = `http://localhost:${RSSHUB_PORT}${rssPath}`;
      const resp = await fetch(targetUrl);
      res.status(resp.status);
      const ct = resp.headers.get('content-type') || 'application/xml';
      res.set('Content-Type', ct);
      res.send(await resp.text());
    } catch {
      res.status(502).json({ error: 'RSSHub unavailable' });
    }
  });

  app.get('/api/rsshub/routes', async (_req, res) => {
    const routes = await fetchRSSHubRoutes();
    res.json(routes);
  });

  // ── Feed APIs ──────────────────────────────────────────

  app.get("/api/feeds", async (_req, res) => {
    const feedList = Array.from(feedCache.values());
    const articleStates = await getArticleStatesMap();

    const parsedFeeds = feedList.map((f) => ({
      url: f.feedUrl,
      data: f.cachedData ? {
        ...f.cachedData,
        items: f.cachedData.items?.map((item: any) => {
          const guid = item.guid || item.link || '';
          const state = articleStates.get(guid);
          return {
            ...item,
            isRead: state?.isRead || false,
            isStarred: state?.isStarred || false,
          };
        }),
      } : null,
      errorMessage: f.errorMessage || null,
      hasError: f.hasError,
      id: f.id,
      name: f.name,
      fetchFrequency: f.fetchFrequency,
      persisted: f.persisted,
    }));
    res.json({ feeds: parsedFeeds });
  });

  app.post("/api/feeds", async (req, res) => {
    const { feedUrl, name, fetchFrequency } = req.body;
    if (!feedUrl) return res.status(400).json({ error: "feedUrl is required" });

    const id = `feed-${feedIdCounter++}`;
    const parsedName = name || feedUrl.replace(/^https?:\/\//, '').split('/')[0];
    const entry: StoredFeed = {
      id,
      name: parsedName,
      feedUrl,
      fetchFrequency: fetchFrequency || '30m',
      persisted: false,
      hasError: false,
      isStale: false,
    };
    feedCache.set(id, entry);
    await upsertFeed({
      id: entry.id,
      name: entry.name,
      feed_url: entry.feedUrl,
      fetch_frequency: entry.fetchFrequency,
      persisted: false,
      last_fetched_at: null,
      has_error: false,
    });
    await fetchFeed(entry);
    scheduleFeed(entry);

    res.json(feedToResponse(entry));
  });

  app.put("/api/feeds/:id", async (req, res) => {
    const entry = feedCache.get(req.params.id);
    if (!entry) return res.status(404).json({ error: "Feed not found" });

    const { name, feedUrl, fetchFrequency, persisted } = req.body;
    if (name !== undefined) entry.name = name;
    if (feedUrl !== undefined) entry.feedUrl = feedUrl;
    if (fetchFrequency !== undefined) {
      entry.fetchFrequency = fetchFrequency;
      scheduleFeed(entry);
      if (fetchFrequency !== 'manual' && !entry.cachedData) {
        await fetchFeed(entry);
      }
    }
    if (persisted !== undefined) {
      entry.persisted = persisted;
      // If persistence just enabled, save current cached articles
      if (persisted && entry.cachedData?.items) {
        const articles = entry.cachedData.items.map((item: any) => ({
          id: item.guid || item.link || `${entry.id}-${Math.random().toString(36).slice(2)}`,
          feed_id: entry.id,
          title: item.title || 'Untitled',
          summary: (item.contentSnippet || item.content || '').substring(0, 500),
          content: item.content || item.contentSnippet || '',
          url: item.link || '',
          source: entry.name,
          tags: item.categories || [],
          published_at: item.isoDate || item.pubDate || 'Unknown Date',
        }));
        await upsertArticleTexts(articles);
      }
    }

    await upsertFeed({
      id: entry.id,
      name: entry.name,
      feed_url: entry.feedUrl,
      fetch_frequency: entry.fetchFrequency,
      persisted: entry.persisted,
      error_message: entry.errorMessage || null,
      last_fetched_at: entry.lastFetchedAt || null,
      has_error: entry.hasError,
    });

    res.json(feedToResponse(entry));
  });

  app.delete("/api/feeds/:id", async (req, res) => {
    const entry = feedCache.get(req.params.id);
    if (!entry) return res.status(404).json({ error: "Feed not found" });
    if (entry.intervalId) clearInterval(entry.intervalId);
    feedCache.delete(req.params.id);
    await deleteFeed(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/feeds/:id/refresh", async (req, res) => {
    const entry = feedCache.get(req.params.id);
    if (!entry) return res.status(404).json({ error: "Feed not found" });
    await fetchFeed(entry);
    res.json(feedToResponse(entry));
  });

  app.get("/api/feeds/list", (_req, res) => {
    res.json(Array.from(feedCache.values()).map(feedToResponse));
  });

  // ── Group APIs ──────────────────────────────────────────

  app.get("/api/groups", (_req, res) => {
    res.json(Array.from(groupCache.values()));
  });

  app.post("/api/groups", async (req, res) => {
    const { name, rule } = req.body;
    if (!name || !rule) return res.status(400).json({ error: "name and rule are required" });

    const id = `ug-${groupIdCounter++}`;
    const group: StoredGroup = {
      id,
      name,
      rule: { kind: rule.kind, config: rule.config },
      feedIds: [],
      sortOrder: 10 + groupIdCounter,
      isSystem: false,
    };
    groupCache.set(id, group);
    await upsertGroup({
      id: group.id,
      name: group.name,
      rule_kind: group.rule.kind,
      rule_config: group.rule.config,
      is_system: false,
      sort_order: group.sortOrder,
    });
    res.json(group);
  });

  app.put("/api/groups/:id", async (req, res) => {
    const group = groupCache.get(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.isSystem) return res.status(403).json({ error: "Cannot edit system group" });

    const { name, rule } = req.body;
    if (name !== undefined) group.name = name;
    if (rule !== undefined) group.rule = { kind: rule.kind, config: rule.config };
    await upsertGroup({
      id: group.id,
      name: group.name,
      rule_kind: group.rule.kind,
      rule_config: group.rule.config,
      is_system: false,
      sort_order: group.sortOrder,
    });
    res.json(group);
  });

  app.delete("/api/groups/:id", async (req, res) => {
    const group = groupCache.get(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.isSystem) return res.status(403).json({ error: "Cannot delete system group" });
    groupCache.delete(req.params.id);
    await deleteGroup(req.params.id);
    res.json({ success: true });
  });

  // ── Article state APIs ──────────────────────────────────

  app.post("/api/articles/read", async (req, res) => {
    const { guid, feedId, isRead } = req.body;
    if (!guid) return res.status(400).json({ error: "guid is required" });
    await updateArticleReadState(guid, feedId || '', !!isRead);
    res.json({ success: true });
  });

  app.post("/api/articles/star", async (req, res) => {
    const { guid, feedId, title, content, url, source, summary, tags, publishedAt } = req.body;
    if (!guid) return res.status(400).json({ error: "guid is required" });

    await updateArticleStarState(guid, feedId || '', true);

    if (title && url) {
      await upsertArticleTexts([{
        id: guid,
        feed_id: feedId || '',
        title,
        summary: summary || '',
        content: content || '',
        url,
        source: source || '',
        tags: tags || [],
        published_at: publishedAt || '',
      }]);
    }

    res.json({ success: true });
  });

  app.post("/api/articles/unstar", async (req, res) => {
    const { guid } = req.body;
    if (!guid) return res.status(400).json({ error: "guid is required" });
    await updateArticleStarState(guid, '', false);
    res.json({ success: true });
  });

  // ── Vite middleware ─────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  database: 'lumina_reader',
  host: '/var/run/postgresql',
});

export interface DbFeed {
  id: string;
  name: string;
  feed_url: string;
  fetch_frequency: string;
  persisted: boolean;
  error_message: string | null;
  last_fetched_at: number | null;
  has_error: boolean;
}

export interface DbGroup {
  id: string;
  name: string;
  rule_kind: string;
  rule_config: any;
  is_system: boolean;
  sort_order: number;
}

export interface DbArticleText {
  id: string;
  feed_id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  source: string;
  tags: string[];
  published_at: string;
}

export interface DbArticleState {
  guid: string;
  feed_id: string;
  is_read: boolean;
  is_starred: boolean;
}

// ── Table initialization ──────────────────────────────────

export async function initTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      fetch_frequency TEXT NOT NULL DEFAULT '30m',
      persisted BOOLEAN DEFAULT FALSE,
      error_message TEXT,
      last_fetched_at BIGINT,
      has_error BOOLEAN DEFAULT FALSE,
      is_stale BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rule_kind TEXT NOT NULL DEFAULT 'keyword',
      rule_config JSONB NOT NULL DEFAULT '{}',
      is_system BOOLEAN DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS article_texts (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      url TEXT NOT NULL,
      source TEXT DEFAULT '',
      tags TEXT[] DEFAULT '{}',
      published_at TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(feed_id, url)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS article_states (
      guid TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      is_starred BOOLEAN DEFAULT FALSE
    )
  `);
}

// ── Feed CRUD ─────────────────────────────────────────────

export async function getFeeds(): Promise<DbFeed[]> {
  const result = await pool.query('SELECT * FROM feeds ORDER BY created_at');
  return result.rows.map(r => ({
    id: r.id,
    name: r.name,
    feed_url: r.feed_url,
    fetch_frequency: r.fetch_frequency,
    persisted: r.persisted,
    error_message: r.error_message,
    last_fetched_at: r.last_fetched_at ? Number(r.last_fetched_at) : null,
    has_error: r.has_error,
  }));
}

export async function upsertFeed(feed: DbFeed): Promise<void> {
  await pool.query(
    `INSERT INTO feeds (id, name, feed_url, fetch_frequency, persisted, error_message, last_fetched_at, has_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       feed_url = EXCLUDED.feed_url,
       fetch_frequency = EXCLUDED.fetch_frequency,
       persisted = EXCLUDED.persisted,
       error_message = EXCLUDED.error_message,
       last_fetched_at = EXCLUDED.last_fetched_at,
       has_error = EXCLUDED.has_error`,
    [feed.id, feed.name, feed.feed_url, feed.fetch_frequency, feed.persisted, feed.error_message, feed.last_fetched_at, feed.has_error]
  );
}

export async function deleteFeed(id: string): Promise<void> {
  await pool.query('DELETE FROM feeds WHERE id = $1', [id]);
}

// ── Group CRUD ────────────────────────────────────────────

export async function getGroups(): Promise<DbGroup[]> {
  const result = await pool.query('SELECT * FROM groups ORDER BY sort_order');
  return result.rows.map(r => ({
    id: r.id,
    name: r.name,
    rule_kind: r.rule_kind,
    rule_config: r.rule_config,
    is_system: r.is_system,
    sort_order: r.sort_order,
  }));
}

export async function upsertGroup(group: DbGroup): Promise<void> {
  await pool.query(
    `INSERT INTO groups (id, name, rule_kind, rule_config, is_system, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       rule_kind = EXCLUDED.rule_kind,
       rule_config = EXCLUDED.rule_config,
       sort_order = EXCLUDED.sort_order`,
    [group.id, group.name, group.rule_kind, JSON.stringify(group.rule_config), group.is_system, group.sort_order]
  );
}

export async function deleteGroup(id: string): Promise<void> {
  await pool.query('DELETE FROM groups WHERE id = $1', [id]);
}

// ── Article texts (persisted content) ─────────────────────

export async function upsertArticleTexts(articles: DbArticleText[]): Promise<number> {
  if (articles.length === 0) return 0;
  let inserted = 0;
  for (const a of articles) {
    const result = await pool.query(
      `INSERT INTO article_texts (id, feed_id, title, summary, content, url, source, tags, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (feed_id, url) DO NOTHING`,
      [a.id, a.feed_id, a.title, a.summary, a.content, a.url, a.source, a.tags, a.published_at]
    );
    if (result.rowCount && result.rowCount > 0) inserted++;
  }
  return inserted;
}

export async function getArticleTextsByFeed(feedId: string): Promise<DbArticleText[]> {
  const result = await pool.query(
    'SELECT * FROM article_texts WHERE feed_id = $1 ORDER BY published_at DESC',
    [feedId]
  );
  return result.rows.map(r => ({
    id: r.id,
    feed_id: r.feed_id,
    title: r.title,
    summary: r.summary,
    content: r.content,
    url: r.url,
    source: r.source,
    tags: r.tags,
    published_at: r.published_at,
  }));
}

// ── Article states (read/star) ─────────────────────────────

export async function getArticleStates(): Promise<DbArticleState[]> {
  const result = await pool.query('SELECT * FROM article_states');
  return result.rows.map(r => ({
    guid: r.guid,
    feed_id: r.feed_id,
    is_read: r.is_read,
    is_starred: r.is_starred,
  }));
}

export async function upsertArticleState(state: DbArticleState): Promise<void> {
  await pool.query(
    `INSERT INTO article_states (guid, feed_id, is_read, is_starred)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guid) DO UPDATE SET
       is_read = EXCLUDED.is_read,
       is_starred = EXCLUDED.is_starred`,
    [state.guid, state.feed_id, state.is_read, state.is_starred]
  );
}

export async function updateArticleReadState(guid: string, feedId: string, isRead: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO article_states (guid, feed_id, is_read, is_starred)
     VALUES ($1, $2, $3, false)
     ON CONFLICT (guid) DO UPDATE SET
       is_read = $3`,
    [guid, feedId, isRead]
  );
}

export async function updateArticleStarState(guid: string, feedId: string, isStarred: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO article_states (guid, feed_id, is_read, is_starred)
     VALUES ($1, $2, false, $3)
     ON CONFLICT (guid) DO UPDATE SET
       is_starred = $3`,
    [guid, feedId, isStarred]
  );
}

export async function batchUpsertArticleStates(states: DbArticleState[]): Promise<void> {
  for (const s of states) {
    await upsertArticleState(s);
  }
}

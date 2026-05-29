import Dexie, { type Table } from 'dexie';

export interface LocalArticleState {
  guid: string;
  feedId: string;
  isRead: boolean;
  isStarred: boolean;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

export interface SyncEntry {
  id?: number;
  guid: string;
  feedId: string;
  type: 'read' | 'unread' | 'star' | 'unstar';
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
}

class LuminaLocalDb extends Dexie {
  articleStates!: Table<LocalArticleState, string>;
  syncQueue!: Table<SyncEntry, number>;

  constructor() {
    super('lumina_reader');
    this.version(1).stores({
      articleStates: 'guid, feedId, syncStatus, updatedAt',
      syncQueue: '++id, guid, type, createdAt',
    });
  }
}

const db = new LuminaLocalDb();

// ── ArticleStateStore ─────────────────────────────────────

export const articleStateStore = {
  async getAll(): Promise<LocalArticleState[]> {
    return db.articleStates.toArray();
  },

  async getByGuid(guid: string): Promise<LocalArticleState | undefined> {
    return db.articleStates.get(guid);
  },

  async upsert(state: Omit<LocalArticleState, 'updatedAt' | 'syncStatus'> & { syncStatus?: LocalArticleState['syncStatus'] }): Promise<void> {
    const existing = await db.articleStates.get(state.guid);
    await db.articleStates.put({
      guid: state.guid,
      feedId: state.feedId,
      isRead: state.isRead,
      isStarred: state.isStarred,
      updatedAt: Date.now(),
      syncStatus: state.syncStatus ?? 'pending',
    });
  },

  async batchUpsert(states: (Omit<LocalArticleState, 'updatedAt' | 'syncStatus'> & { syncStatus?: LocalArticleState['syncStatus'] })[]): Promise<void> {
    const now = Date.now();
    await db.articleStates.bulkPut(
      states.map(s => ({
        guid: s.guid,
        feedId: s.feedId,
        isRead: s.isRead,
        isStarred: s.isStarred,
        updatedAt: now,
        syncStatus: s.syncStatus ?? 'pending',
      }))
    );
  },

  async getPendingSyncs(): Promise<LocalArticleState[]> {
    return db.articleStates.where('syncStatus').equals('pending').toArray();
  },

  async markSynced(guids: string[]): Promise<void> {
    await db.articleStates.where('guid').anyOf(guids).modify({ syncStatus: 'synced' });
  },

  async markConflicts(guids: string[]): Promise<void> {
    await db.articleStates.where('guid').anyOf(guids).modify({ syncStatus: 'conflict' });
  },
};

// ── SyncQueue ─────────────────────────────────────────────

export const syncQueue = {
  async enqueue(entry: Omit<SyncEntry, 'id' | 'createdAt' | 'retryCount'> & { retryCount?: number }): Promise<number> {
    return db.syncQueue.put({
      guid: entry.guid,
      feedId: entry.feedId,
      type: entry.type,
      payload: entry.payload,
      createdAt: Date.now(),
      retryCount: entry.retryCount ?? 0,
    });
  },

  async dequeue(id: number): Promise<void> {
    await db.syncQueue.delete(id);
  },

  async peek(limit: number = 50): Promise<SyncEntry[]> {
    return db.syncQueue.orderBy('createdAt').limit(limit).toArray();
  },

  async clear(): Promise<void> {
    await db.syncQueue.clear();
  },

  async count(): Promise<number> {
    return db.syncQueue.count();
  },

  async updateRetry(id: number, retryCount: number): Promise<void> {
    await db.syncQueue.update(id, { retryCount });
  },
};

export { db };

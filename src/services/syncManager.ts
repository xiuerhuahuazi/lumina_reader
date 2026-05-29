import { syncQueue, articleStateStore } from '../db/localDb';

const MAX_RETRIES = 5;
const DEBOUNCE_MS = 2000;

type VoidCallback = () => void;

class SyncManager {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private listeners: Set<VoidCallback> = new Set();
  private paused = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushSync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.paused = false;
          this.flush();
        } else {
          this.paused = true;
        }
      });
      this.scheduleIdleFlush();
    }
  }

  onChange(cb: VoidCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async enqueue(entry: {
    guid: string;
    feedId: string;
    type: 'read' | 'unread' | 'star' | 'unstar';
    payload: Record<string, any>;
  }): Promise<void> {
    await syncQueue.enqueue(entry);
    this.debounceFlush();
  }

  private debounceFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  }

  private scheduleIdleFlush(): void {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        this.flush();
        this.scheduleIdleFlush();
      }, { timeout: 30000 });
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || this.paused) return;
    this.flushing = true;

    try {
      const entries = await syncQueue.peek(50);
      if (entries.length === 0) { this.flushing = false; return; }

      // Deduplicate: keep only the last operation per guid
      const latestByGuid = new Map<string, typeof entries[0]>();
      const allIds = new Set<number>();
      for (const entry of entries) {
        latestByGuid.set(entry.guid, entry);
        allIds.add(entry.id!);
      }

      const dispatchedIds = new Set<number>();

      for (const entry of latestByGuid.values()) {
        try {
          await this.dispatch(entry);
          dispatchedIds.add(entry.id!);
        } catch {
          const newRetry = entry.retryCount + 1;
          if (newRetry >= MAX_RETRIES) {
            await articleStateStore.markConflicts([entry.guid]);
            dispatchedIds.add(entry.id!);
          } else {
            await syncQueue.updateRetry(entry.id!, newRetry);
          }
        }
      }

      // Remove all handled entries (both dispatched and superseded) from queue
      for (const id of allIds) {
        await syncQueue.dequeue(id);
      }

      // Mark article states as synced for successfully dispatched guids
      const succeededGuids = [...latestByGuid.values()]
        .filter(e => dispatchedIds.has(e.id!))
        .map(e => e.guid);
      if (succeededGuids.length > 0) {
        await articleStateStore.markSynced(succeededGuids);
      }

      this.notifyListeners();
    } finally {
      this.flushing = false;
    }
  }

  private async dispatch(entry: { guid: string; feedId: string; type: string; payload: Record<string, any> }): Promise<void> {
    switch (entry.type) {
      case 'read':
      case 'unread': {
        const res = await fetch('/api/articles/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guid: entry.guid,
            feedId: entry.feedId,
            isRead: entry.type === 'read',
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        break;
      }
      case 'star': {
        const res = await fetch('/api/articles/star', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry.payload),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        break;
      }
      case 'unstar': {
        const res = await fetch('/api/articles/unstar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guid: entry.guid }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        break;
      }
    }
  }

  private flushSync(): void {
    // Blocking sync flush on page close using sendBeacon
    const entries = syncQueue.peek(50); // Fire-and-forget — best effort
    // sendBeacon is not used here because we need the async flush which
    // beforeunload allows for fetch with keepalive in modern browsers
    this.flush();
  }

  private notifyListeners(): void {
    for (const cb of this.listeners) {
      try { cb(); } catch { /* swallow */ }
    }
  }
}

export const syncManager = new SyncManager();

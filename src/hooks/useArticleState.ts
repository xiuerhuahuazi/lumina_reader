import { useCallback, useRef, useEffect } from 'react';
import { articleStateStore, type LocalArticleState } from '../db/localDb';
import { syncManager } from '../services/syncManager';
import type { Article } from '../types';

const BC_CHANNEL = 'lumina-article-state';

interface ArticleStatePatch {
  guid: string;
  isRead?: boolean;
  isStarred?: boolean;
}

interface UseArticleStateOptions {
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
}

export function useArticleState({ articles, setArticles }: UseArticleStateOptions) {
  const articlesRef = useRef(articles);
  articlesRef.current = articles;
  const bcRef = useRef<BroadcastChannel | null>(null);

  // ── BroadcastChannel: multi-tab sync ──────────────────

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const bc = new BroadcastChannel(BC_CHANNEL);
    bcRef.current = bc;

    bc.onmessage = (event: MessageEvent<ArticleStatePatch>) => {
      const { guid, isRead, isStarred } = event.data;
      setArticles(prev => prev.map(a => {
        if (a.id !== guid) return a;
        return {
          ...a,
          ...(isRead !== undefined ? { isRead } : {}),
          ...(isStarred !== undefined ? { isStarred } : {}),
        };
      }));
    };

    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, [setArticles]);

  const broadcast = useCallback((patch: ArticleStatePatch) => {
    bcRef.current?.postMessage(patch);
  }, []);

  const updateLocalArticle = useCallback((guid: string, patch: Partial<Pick<Article, 'isRead' | 'isStarred'>>) => {
    setArticles(prev => prev.map(a =>
      a.id === guid ? { ...a, ...patch } : a
    ));
  }, [setArticles]);

  const markRead = useCallback(async (guid: string, feedId?: string) => {
    updateLocalArticle(guid, { isRead: true });
    broadcast({ guid, isRead: true });
    await articleStateStore.upsert({ guid, feedId: feedId || '', isRead: true, isStarred: false });
    syncManager.enqueue({ guid, feedId: feedId || '', type: 'read', payload: {} });
  }, [updateLocalArticle, broadcast]);

  const markUnread = useCallback(async (guid: string, feedId?: string) => {
    updateLocalArticle(guid, { isRead: false });
    broadcast({ guid, isRead: false });
    await articleStateStore.upsert({ guid, feedId: feedId || '', isRead: false, isStarred: false });
    syncManager.enqueue({ guid, feedId: feedId || '', type: 'unread', payload: {} });
  }, [updateLocalArticle, broadcast]);

  const toggleRead = useCallback(async (guid: string, feedId?: string) => {
    const article = articlesRef.current.find(a => a.id === guid);
    const newRead = !article?.isRead;
    updateLocalArticle(guid, { isRead: newRead });
    broadcast({ guid, isRead: newRead });
    await articleStateStore.upsert({ guid, feedId: feedId || '', isRead: newRead, isStarred: article?.isStarred || false });
    syncManager.enqueue({ guid, feedId: feedId || '', type: newRead ? 'read' : 'unread', payload: {} });
  }, [updateLocalArticle, broadcast]);

  const toggleStar = useCallback(async (guid: string, feedId?: string) => {
    const article = articlesRef.current.find(a => a.id === guid);
    if (!article) return;
    const newStarred = !article.isStarred;
    updateLocalArticle(guid, { isStarred: newStarred });
    broadcast({ guid, isStarred: newStarred });

    const state = await articleStateStore.getByGuid(guid);
    await articleStateStore.upsert({
      guid,
      feedId: feedId || state?.feedId || '',
      isRead: article.isRead,
      isStarred: newStarred,
    });

    if (newStarred) {
      syncManager.enqueue({
        guid,
        feedId: feedId || '',
        type: 'star',
        payload: {
          guid,
          feedId: feedId || '',
          title: article.title,
          content: article.content,
          url: article.url,
          source: article.source,
          summary: article.summary,
          tags: article.tags,
          publishedAt: article.publishedAt,
        },
      });
    } else {
      syncManager.enqueue({ guid, feedId: feedId || '', type: 'unstar', payload: {} });
    }
  }, [updateLocalArticle, broadcast]);

  return { markRead, markUnread, toggleRead, toggleStar };
}

// ── Merge local Dexie state into server state ──────────────

export async function loadLocalStates(
  articles: Article[]
): Promise<Article[]> {
  try {
    const localStates = await articleStateStore.getAll();
    if (localStates.length === 0) return articles;

    const localMap = new Map<string, LocalArticleState>();
    for (const s of localStates) {
      localMap.set(s.guid, s);
    }

    return articles.map(a => {
      const local = localMap.get(a.id);
      if (!local) return a;
      // Local state always wins (most recent user action)
      return {
        ...a,
        isRead: local.isRead,
        isStarred: local.isStarred,
      };
    });
  } catch {
    return articles;
  }
}

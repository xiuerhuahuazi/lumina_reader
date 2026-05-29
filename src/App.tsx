/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ArticleList from './components/ArticleList';
import Reader from './components/Reader';
import FeedManager from './components/FeedManager';
import GroupManager from './components/GroupManager';
import { Article, Feed, SmartGroup, FetchFrequency } from './types';
import { cn } from './utils';
import { Menu } from 'lucide-react';
import { useArticleState, loadLocalStates } from './hooks/useArticleState';

const FEED_COLORS = ['#e53e3e', '#3182ce', '#319795', '#dd6b20'];

export default function App() {
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [groups, setGroups] = useState<SmartGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modal states
  const [showFeedManager, setShowFeedManager] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);

  // Mobile states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ── Data loading ──────────────────────────────────────

  const loadFeeds = async () => {
    const response = await fetch('/api/feeds');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();

    const allArticles: Article[] = [];
    const parsedFeeds: Feed[] = [];
    const seenIds = new Set<string>();

    data.feeds.forEach((feedData: any) => {
      const feed = feedData.data;
      const sourceName = feedData.name || feed?.title || 'Untitled Feed';

      const currentFeed: Feed = {
        id: feedData.id,
        name: sourceName,
        unreadCount: 0,
        iconLetter: sourceName.substring(0, 1).toUpperCase(),
        iconColor: FEED_COLORS[parsedFeeds.length % FEED_COLORS.length],
        hasError: feedData.hasError,
        isStale: false,
        feedUrl: feedData.url,
        fetchFrequency: feedData.fetchFrequency,
        persisted: feedData.persisted || false,
        errorMessage: feedData.errorMessage || undefined,
      };

      let count = 0;
      if (feed) {
        feed.items?.forEach((item: any) => {
          const articleId = item.guid || item.link || `${feedData.id}-${count}`;
          if (seenIds.has(articleId)) return;
          seenIds.add(articleId);

          allArticles.push({
            id: articleId,
            title: item.title || 'Untitled',
            source: sourceName,
            summary: item.contentSnippet || item.content || '',
            content: item.content || item.contentSnippet || '',
            url: item.link || '',
            publishedAt: item.isoDate ? new Date(item.isoDate).toLocaleString() : (item.pubDate || 'Unknown Date'),
            isRead: item.isRead || false,
            isStarred: item.isStarred || false,
            tags: item.categories || [],
          });
          count++;
        });

        if (feed.items && feed.items.length > 0) {
          const latestDateStr = feed.items[0].isoDate || feed.items[0].pubDate;
          if (latestDateStr) {
            const latestDate = new Date(latestDateStr);
            if ((Date.now() - latestDate.getTime()) > 3 * 24 * 60 * 60 * 1000) {
              currentFeed.isStale = true;
            }
          }
        }
      }

      currentFeed.unreadCount = count;
      parsedFeeds.push(currentFeed);
    });

    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const merged = await loadLocalStates(allArticles);
    setArticles(merged);
    setFeeds(parsedFeeds);
  };

  const loadGroups = async () => {
    const response = await fetch('/api/groups');
    if (response.ok) {
      setGroups(await response.json());
    }
  };

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadFeeds(), loadGroups()]);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // ── Feed CRUD handlers ────────────────────────────────

  const handleAddFeed = async (data: { feedUrl: string; name?: string; fetchFrequency?: FetchFrequency }) => {
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await loadFeeds();
    }
  };

  const handleUpdateFeed = async (id: string, data: { name?: string; feedUrl?: string; fetchFrequency?: FetchFrequency; persisted?: boolean }) => {
    const res = await fetch(`/api/feeds/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await loadFeeds();
    }
  };

  const handleDeleteFeed = async (id: string) => {
    const res = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadFeeds();
    }
  };

  const handleRefreshFeed = async (id: string) => {
    await fetch(`/api/feeds/${id}/refresh`);
    await loadFeeds();
  };

  // ── Group CRUD handlers ───────────────────────────────

  const handleAddGroup = async (data: { name: string; rule: any }) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await loadGroups();
    }
  };

  const handleUpdateGroup = async (id: string, data: { name?: string; rule?: any }) => {
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await loadGroups();
    }
  };

  const handleDeleteGroup = async (id: string) => {
    const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadGroups();
      if (selectedGroupId === id) setSelectedGroupId(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────

  const selectedArticle = useMemo(
    () => articles.find(a => a.id === selectedArticleId) || null,
    [articles, selectedArticleId]
  );

  const { markRead, markUnread, toggleRead, toggleStar } = useArticleState({ articles, setArticles });

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (selectedSource) {
      result = result.filter(a => a.source === selectedSource);
    }
    if (selectedGroupId) {
      const group = groups.find(g => g.id === selectedGroupId);
      if (group && group.rule.kind === 'keyword' && 'keywords' in group.rule.config) {
        const { keywords, matchTitle, matchSummary, matchTags } = group.rule.config;
        if (keywords && keywords.length > 0) {
          result = result.filter(a => {
            return keywords.some(kw => {
              const lowerKw = kw.toLowerCase();
              if (matchTitle && a.title.toLowerCase().includes(lowerKw)) return true;
              if (matchSummary && a.summary.toLowerCase().includes(lowerKw)) return true;
              if (matchTags && a.tags.some(t => t.toLowerCase().includes(lowerKw))) return true;
              return false;
            });
          });
        }
      }
    }
    return result;
  }, [articles, selectedSource, selectedGroupId, groups]);

  const filteredArticlesRef = useRef(filteredArticles);
  filteredArticlesRef.current = filteredArticles;

  const navigateArticle = useCallback((direction: 'prev' | 'next') => {
    const currentList = filteredArticlesRef.current;
    const idx = currentList.findIndex(a => a.id === selectedArticleId);
    let targetId: string | null = null;
    if (direction === 'next' && idx >= 0 && idx < currentList.length - 1) {
      targetId = currentList[idx + 1].id;
    } else if (direction === 'prev' && idx > 0) {
      targetId = currentList[idx - 1].id;
    }
    if (targetId) {
      setSelectedArticleId(targetId);
      markRead(targetId);
    }
  }, [selectedArticleId, markRead]);

  const filteredIndex = filteredArticles.findIndex(a => a.id === selectedArticleId);
  const filteredTotal = filteredArticles.length;

  const handleSelectSource = (sourceName: string | null) => {
    setSelectedSource(prev => prev === sourceName ? null : sourceName);
  };

  const handleSelectGroup = (groupId: string | null) => {
    setSelectedGroupId(prev => prev === groupId ? null : groupId);
    setSelectedSource(null); // clear source filter when selecting group
  };

  const handleSmartGroupClick = () => {
    setSelectedGroupId(null);
    setSelectedSource(null);
  };

  // ── Keyboard shortcuts ────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          navigateArticle('next');
          break;
        case 'k':
          navigateArticle('prev');
          break;
        case 'f':
          if (selectedArticleId) {
            setIsFocused(prev => !prev);
          }
          break;
        case 'm':
          if (selectedArticleId) {
            toggleRead(selectedArticleId);
          }
          break;
        case '/':
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticleId, navigateArticle, toggleRead]);

  const handleSelectArticle = (article: Article) => {
    setSelectedArticleId(article.id);
    if (!article.isRead) {
      markRead(article.id);
    }
  };

  // ── Dynamic unread counts ──────────────────────────────

  const feedsWithCounts = useMemo(() => feeds.map(f => ({
    ...f,
    unreadCount: articles.filter(a => a.source === f.name && !a.isRead).length,
  })), [feeds, articles]);

  // ── Render ────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full bg-lumina-bg overflow-hidden text-lumina-text relative">

      {/* Background Focus Overlay */}
      <div className={cn(
        "absolute inset-0 bg-lumina-accent/5 backdrop-blur-3xl z-30 pointer-events-none transition-opacity duration-500",
        isFocused ? "opacity-100" : "opacity-0"
      )} />

      {/* Mobile Header (Hidden on Desktop) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-14 border-b border-lumina-border bg-lumina-bg z-20 flex items-center px-4 justify-between">
        <Menu
          className="w-5 h-5 text-lumina-text-muted"
          onClick={() => setIsSidebarOpen(true)}
        />
        <h1 className="font-medium">Lumina</h1>
        <div className="w-5" />
      </div>

      {/* Main Layout */}
      <div className="flex w-full h-full pt-14 md:pt-0">

        {/* Left Sidebar */}
        <div className={cn(
          "h-full z-10 transition-all duration-300 md:relative absolute bg-lumina-bg shadow-xl md:shadow-none",
          isFocused ? "w-0 opacity-0 -translate-x-full md:-translate-x-0 overflow-hidden" : "w-[220px] opacity-100",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          <Sidebar
            feeds={feedsWithCounts}
            groups={groups}
            articles={articles}
            selectedSource={selectedSource}
            selectedGroupId={selectedGroupId}
            onSelectSource={handleSelectSource}
            onSelectGroup={handleSelectGroup}
            onSmartGroupClick={handleSmartGroupClick}
            onOpenFeedManager={() => setShowFeedManager(true)}
            onOpenGroupManager={() => setShowGroupManager(true)}
          />
        </div>

        {/* Article List */}
        <div className={cn(
          "h-full z-10 bg-lumina-bg transition-max-width duration-300 flex flex-col",
          isFocused ? "w-0 opacity-0 min-w-0 md:min-w-0 border-none overflow-hidden" : "md:flex-none flex-1 lg:max-w-[420px]"
        )}>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-lumina-text-muted/60 text-sm space-x-3">
              <div className="flex space-x-1.5 h-12 items-center">
                <div className="w-1.5 h-1.5 bg-lumina-accent/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-lumina-accent/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-lumina-accent/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>同步最新文章中...</span>
            </div>
          ) : (
            <ArticleList
              articles={filteredArticles}
              onSelectArticle={handleSelectArticle}
              selectedArticleId={selectedArticleId}
            />
          )}
        </div>

        {/* Reader Panel */}
        <div className={cn(
          "z-40 h-full flex flex-col flex-1 min-h-0 transition-all duration-500 bg-lumina-bg",
          isFocused ? "fixed inset-0 pt-0 bg-transparent" : "relative"
        )}>
          <Reader
            article={selectedArticle}
            onClose={() => {
              setSelectedArticleId(null);
              if (isFocused) setIsFocused(false);
              setIsSidebarOpen(false);
            }}
            onToggleFocus={() => setIsFocused(!isFocused)}
            isFocused={isFocused}
            onNavigatePrev={() => navigateArticle('prev')}
            onNavigateNext={() => navigateArticle('next')}
            currentIndex={filteredIndex}
            totalCount={filteredTotal}
            onToggleRead={() => selectedArticleId && toggleRead(selectedArticleId)}
            onToggleStar={() => selectedArticleId && toggleStar(selectedArticleId)}
            isRead={selectedArticle?.isRead}
            isStarred={selectedArticle?.isStarred}
          />
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Feed Manager Modal */}
      {showFeedManager && (
        <FeedManager
          feeds={feeds}
          onAdd={handleAddFeed}
          onUpdate={handleUpdateFeed}
          onDelete={handleDeleteFeed}
          onRefresh={handleRefreshFeed}
          onClose={() => setShowFeedManager(false)}
        />
      )}

      {/* Group Manager Modal */}
      {showGroupManager && (
        <GroupManager
          groups={groups}
          onAdd={handleAddGroup}
          onUpdate={handleUpdateGroup}
          onDelete={handleDeleteGroup}
          onClose={() => setShowGroupManager(false)}
        />
      )}
    </div>
  );
}

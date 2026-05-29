import { useState, useEffect, useMemo } from "react";
import { Plus, X, Edit2, Trash2, RefreshCw, CircleAlert, Database, Search, Compass, Link, ArrowLeft } from "lucide-react";
import { Feed, FetchFrequency, RSSHubNamespace, RSSHubRoute } from "../types";
import { cn } from "../utils";
import { fetchRSSHubRoutes } from "../services/rsshub";

interface FeedManagerProps {
  feeds: Feed[];
  onAdd: (data: { feedUrl: string; name?: string; fetchFrequency?: FetchFrequency }) => void;
  onUpdate: (id: string, data: { name?: string; feedUrl?: string; fetchFrequency?: FetchFrequency; persisted?: boolean }) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onClose: () => void;
}

const FREQ_OPTIONS: { value: FetchFrequency; label: string }[] = [
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: 'manual', label: '手动' },
];

type TabMode = 'browse' | 'manual';

export default function FeedManager({ feeds, onAdd, onUpdate, onDelete, onRefresh, onClose }: FeedManagerProps) {
  const [tab, setTab] = useState<TabMode>('browse');

  // Browse RSSHub state
  const [namespaces, setNamespaces] = useState<RSSHubNamespace[]>([]);
  const [search, setSearch] = useState('');
  const [selectedNS, setSelectedNS] = useState<RSSHubNamespace | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual form state (shared with browse's "subscribe" action)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formUrl, setFormUrl] = useState('');
  const [formName, setFormName] = useState('');
  const [formFreq, setFormFreq] = useState<FetchFrequency>('30m');

  useEffect(() => {
    fetchRSSHubRoutes().then((data) => {
      setNamespaces(data);
      setLoading(false);
    });
  }, []);

  const filteredNS = useMemo(() => {
    if (!search.trim()) return namespaces;
    const q = search.toLowerCase();
    return namespaces.filter(
      (ns) =>
        ns.name.toLowerCase().includes(q) ||
        ns.namespace.toLowerCase().includes(q) ||
        ns.routes.some((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    );
  }, [namespaces, search]);

  const resetForm = () => {
    setFormUrl('');
    setFormName('');
    setFormFreq('30m');
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (f: Feed) => {
    setFormUrl(f.feedUrl || '');
    setFormName(f.name);
    setFormFreq(f.fetchFrequency || '30m');
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formUrl.trim()) return;
    if (editingId) {
      onUpdate(editingId, { name: formName, feedUrl: formUrl, fetchFrequency: formFreq });
    } else {
      onAdd({ feedUrl: formUrl, name: formName || undefined, fetchFrequency: formFreq });
    }
    resetForm();
  };

  const quickSubscribe = (route: RSSHubRoute, nsName: string) => {
    setFormUrl(route.path);
    setFormName(route.name);
    setFormFreq('30m');
    setTab('manual');
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-lumina-bg border border-lumina-border rounded-lg shadow-2xl flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-lumina-border-light shrink-0">
          <h2 className="text-base font-medium text-lumina-text">管理订阅源</h2>
          <button onClick={onClose} className="text-lumina-text-muted hover:text-lumina-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-lumina-border-light shrink-0">
          <button
            onClick={() => setTab('browse')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors border-b-2",
              tab === 'browse'
                ? "border-lumina-accent text-lumina-accent"
                : "border-transparent text-lumina-text-muted hover:text-lumina-text"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            浏览 RSSHub
          </button>
          <button
            onClick={() => setTab('manual')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors border-b-2",
              tab === 'manual'
                ? "border-lumina-accent text-lumina-accent"
                : "border-transparent text-lumina-text-muted hover:text-lumina-text"
            )}
          >
            <Link className="w-3.5 h-3.5" />
            手动输入 URL
          </button>
        </div>

        {/* Tab content */}
        {tab === 'browse' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedNS ? (
              /* Route list for selected namespace */
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <button
                  onClick={() => setSelectedNS(null)}
                  className="flex items-center gap-1 text-xs text-lumina-text-muted hover:text-lumina-text mb-3 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  返回平台列表
                </button>
                <h3 className="text-sm font-medium text-lumina-text mb-1">{selectedNS.name}</h3>
                <p className="text-xs text-lumina-text-muted mb-3">{selectedNS.namespace}</p>
                <div className="space-y-2">
                  {selectedNS.routes.map((route) => (
                    <div
                      key={route.path}
                      className="flex items-start justify-between gap-3 p-2.5 rounded-md border border-lumina-border-light hover:bg-lumina-hover transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-lumina-text truncate">{route.name}</div>
                        {route.description && (
                          <div className="text-xs text-lumina-text-muted mt-0.5 line-clamp-2">{stripMarkdown(route.description)}</div>
                        )}
                        <div className="text-[10px] text-lumina-text-muted/60 mt-1 truncate">{route.path}</div>
                      </div>
                      <button
                        onClick={() => quickSubscribe(route, selectedNS.name)}
                        className="shrink-0 px-2.5 py-1 text-xs bg-lumina-accent/20 text-lumina-accent border border-lumina-accent/30 rounded hover:bg-lumina-accent/30 transition-colors"
                      >
                        订阅
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Browse namespaces */
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lumina-text-muted/60" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜索平台或关键词..."
                    className="w-full bg-lumina-border-light border border-lumina-border rounded-md py-1.5 pl-8 pr-3 text-sm text-lumina-text placeholder:text-lumina-text-muted/40 focus:outline-none focus:border-lumina-accent/50 transition-colors"
                  />
                </div>
                {loading ? (
                  <p className="text-sm text-lumina-text-muted text-center py-8">加载 RSSHub 路由中...</p>
                ) : filteredNS.length === 0 ? (
                  <p className="text-sm text-lumina-text-muted text-center py-8">未找到匹配的平台</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredNS.map((ns) => (
                      <button
                        key={ns.namespace}
                        onClick={() => setSelectedNS(ns)}
                        className="text-left p-2.5 rounded-md border border-lumina-border-light hover:bg-lumina-hover hover:border-lumina-border transition-colors"
                      >
                        <div className="text-sm text-lumina-text truncate">{ns.name}</div>
                        <div className="text-[10px] text-lumina-text-muted/60 mt-0.5">{ns.namespace} · {ns.routes.length} 个路由</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Manual URL tab */
          <>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {feeds.length === 0 ? (
                <p className="text-sm text-lumina-text-muted text-center py-8">暂无订阅源，使用下方表单添加</p>
              ) : (
                feeds.map((f) => (
                  <div key={f.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-lumina-hover transition-colors relative">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ backgroundColor: `${f.iconColor}20`, color: f.iconColor }}
                    >
                      {f.iconLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-lumina-text truncate">{f.name}</span>
                        {f.isStale && <span className="w-1.5 h-1.5 rounded-full bg-lumina-text-muted/50 shrink-0" />}
                        {f.hasError && <CircleAlert className="w-3.5 h-3.5 text-red-400 shrink-0" title={f.errorMessage || '获取失败'} />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-lumina-text-muted">
                        <span className="truncate">{f.feedUrl || '—'}</span>
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-lumina-active text-lumina-text-muted">
                          {FREQ_OPTIONS.find(o => o.value === (f.fetchFrequency || '30m'))?.label || '30分钟'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0 mr-1">
                      <button
                        onClick={() => onUpdate(f.id, { persisted: !f.persisted })}
                        className={cn(
                          "p-1 rounded transition-colors",
                          f.persisted ? "text-lumina-accent" : "text-lumina-text-muted opacity-0 group-hover:opacity-100 hover:text-lumina-text"
                        )}
                        title={f.persisted ? '已开启持久化，点击关闭' : '持久化该源的文章数据'}
                      >
                        <Database className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => onRefresh(f.id)} className="p-1.5 text-lumina-text-muted hover:text-lumina-text rounded transition-colors" title="立即刷新">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => startEdit(f)} className="p-1.5 text-lumina-text-muted hover:text-lumina-text rounded transition-colors" title="编辑">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmDelete(f.id)} className="p-1.5 text-lumina-text-muted hover:text-red-400 rounded transition-colors" title="删除">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {confirmDelete === f.id && (
                      <div className="absolute inset-0 flex items-center justify-end gap-2 px-3 bg-lumina-bg/90 rounded-md z-10">
                        <span className="text-xs text-lumina-text-muted">确认删除？</span>
                        <button onClick={() => { onDelete(f.id); setConfirmDelete(null); }} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded">删除</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-lumina-text-muted hover:text-lumina-text px-2 py-1 rounded">取消</button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add/Edit Form */}
            <div className="border-t border-lumina-border-light px-5 py-4 shrink-0">
              {!showForm ? (
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-lumina-text-muted hover:text-lumina-text border border-dashed border-lumina-border rounded-md hover:border-lumina-text-muted/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加订阅源
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-lumina-text-muted mb-1">RSS 订阅地址</label>
                    <input
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://example.com/feed.xml 或 /rss/aihot/feed"
                      className="w-full bg-lumina-border-light border border-lumina-border rounded-md py-1.5 px-3 text-sm text-lumina-text placeholder:text-lumina-text-muted/40 focus:outline-none focus:border-lumina-accent/50 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-lumina-text-muted mb-1">名称（可选）</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="自定义名称"
                      className="w-full bg-lumina-border-light border border-lumina-border rounded-md py-1.5 px-3 text-sm text-lumina-text placeholder:text-lumina-text-muted/40 focus:outline-none focus:border-lumina-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-lumina-text-muted mb-1.5">抓取频率</label>
                    <div className="flex gap-1">
                      {FREQ_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFormFreq(opt.value)}
                          className={cn(
                            "flex-1 py-1 text-xs rounded-md border transition-colors",
                            formFreq === opt.value
                              ? "border-lumina-accent/40 bg-lumina-accent/10 text-lumina-accent"
                              : "border-lumina-border text-lumina-text-muted hover:text-lumina-text hover:border-lumina-text-muted/30"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSubmit}
                      disabled={!formUrl.trim()}
                      className="flex-1 py-1.5 text-sm bg-lumina-accent/20 text-lumina-accent border border-lumina-accent/30 rounded-md hover:bg-lumina-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {editingId ? '保存修改' : '添加'}
                    </button>
                    <button onClick={resetForm} className="px-4 py-1.5 text-sm text-lumina-text-muted hover:text-lumina-text border border-lumina-border rounded-md transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~#>]/g, '')
    .replace(/::: ?\w+/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

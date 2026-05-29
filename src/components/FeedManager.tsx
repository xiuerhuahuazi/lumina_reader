import { useState } from "react";
import { Plus, X, Edit2, Trash2, RefreshCw, CircleAlert, Database } from "lucide-react";
import { Feed, FetchFrequency } from "../types";
import { cn } from "../utils";

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

export default function FeedManager({ feeds, onAdd, onUpdate, onDelete, onRefresh, onClose }: FeedManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formUrl, setFormUrl] = useState('');
  const [formName, setFormName] = useState('');
  const [formFreq, setFormFreq] = useState<FetchFrequency>('30m');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md max-h-[80vh] bg-lumina-bg border border-lumina-border rounded-lg shadow-2xl flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-lumina-border-light shrink-0">
          <h2 className="text-base font-medium text-lumina-text">管理订阅源</h2>
          <button onClick={onClose} className="text-lumina-text-muted hover:text-lumina-text transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feed List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {feeds.length === 0 ? (
            <p className="text-sm text-lumina-text-muted text-center py-8">暂无订阅源，点击下方按钮添加</p>
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
                  <button
                    onClick={() => onRefresh(f.id)}
                    className="p-1.5 text-lumina-text-muted hover:text-lumina-text rounded transition-colors"
                    title="立即刷新"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startEdit(f)}
                    className="p-1.5 text-lumina-text-muted hover:text-lumina-text rounded transition-colors"
                    title="编辑"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(f.id)}
                    className="p-1.5 text-lumina-text-muted hover:text-red-400 rounded transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Delete confirm inline */}
                {confirmDelete === f.id && (
                  <div className="absolute inset-0 flex items-center justify-end gap-2 px-3 bg-lumina-bg/90 rounded-md z-10">
                    <span className="text-xs text-lumina-text-muted">确认删除？</span>
                    <button
                      onClick={() => { onDelete(f.id); setConfirmDelete(null); }}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-lumina-text-muted hover:text-lumina-text px-2 py-1 rounded"
                    >
                      取消
                    </button>
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
                  placeholder="https://example.com/feed.xml"
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
                <button
                  onClick={resetForm}
                  className="px-4 py-1.5 text-sm text-lumina-text-muted hover:text-lumina-text border border-lumina-border rounded-md transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

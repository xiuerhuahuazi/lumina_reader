import { useState } from "react";
import { Plus, X, Edit2, Trash2, Tag } from "lucide-react";
import { SmartGroup, SmartGroupRule } from "../types";
import { cn } from "../utils";

interface GroupManagerProps {
  groups: SmartGroup[];
  onAdd: (data: { name: string; rule: SmartGroupRule }) => void;
  onUpdate: (id: string, data: { name?: string; rule?: SmartGroupRule }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function GroupManager({ groups, onAdd, onUpdate, onDelete, onClose }: GroupManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [ruleKind, setRuleKind] = useState<'keyword' | 'manual'>('keyword');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [matchTitle, setMatchTitle] = useState(true);
  const [matchSummary, setMatchSummary] = useState(true);
  const [matchTags, setMatchTags] = useState(false);
  const [selectedFeedIds, setSelectedFeedIds] = useState<string[]>([]);

  const userGroups = groups.filter(g => !g.isSystem);

  const resetForm = () => {
    setFormName('');
    setRuleKind('keyword');
    setKeywords([]);
    setKeywordInput('');
    setMatchTitle(true);
    setMatchSummary(true);
    setMatchTags(false);
    setSelectedFeedIds([]);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (g: SmartGroup) => {
    setFormName(g.name);
    setRuleKind(g.rule.kind);
    if (g.rule.kind === 'keyword' && 'keywords' in g.rule.config) {
      setKeywords(g.rule.config.keywords || []);
      setMatchTitle(g.rule.config.matchTitle ?? true);
      setMatchSummary(g.rule.config.matchSummary ?? true);
      setMatchTags(g.rule.config.matchTags ?? false);
    } else if (g.rule.kind === 'manual' && 'feedIds' in g.rule.config) {
      setSelectedFeedIds(g.rule.config.feedIds || []);
    }
    setEditingId(g.id);
    setShowForm(true);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleSubmit = () => {
    if (!formName.trim()) return;
    const rule: SmartGroupRule = ruleKind === 'keyword'
      ? { kind: 'keyword', config: { keywords, matchTitle, matchSummary, matchTags } }
      : { kind: 'manual', config: { feedIds: selectedFeedIds } };

    if (editingId) {
      onUpdate(editingId, { name: formName, rule });
    } else {
      onAdd({ name: formName, rule });
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
          <h2 className="text-base font-medium text-lumina-text">管理规则组</h2>
          <button
            onClick={onClose}
            aria-label="关闭弹窗"
            className="text-lumina-text-muted hover:text-lumina-text transition-colors focus-visible:ring-1 focus-visible:ring-lumina-accent/30 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {userGroups.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-8 h-8 text-lumina-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-lumina-text-muted mb-1">还没有自定义规则组</p>
              <p className="text-xs text-lumina-text-muted/60 mb-4">创建一个规则组，按关键词自动归类文章</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm text-lumina-accent border border-lumina-accent/30 rounded-md hover:bg-lumina-accent/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建规则组
              </button>
            </div>
          ) : (
            userGroups.map((g) => (
              <div key={g.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-lumina-hover transition-colors relative">
                <div className="w-5 h-5 rounded bg-lumina-accent/15 flex items-center justify-center shrink-0">
                  <Tag className="w-3 h-3 text-lumina-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-lumina-text truncate block">{g.name}</span>
                  <span className="text-xs text-lumina-text-muted">
                    {g.rule.kind === 'keyword' && 'keywords' in g.rule.config
                      ? `关键词: ${(g.rule.config.keywords || []).join(', ') || '未设置'}`
                      : '手动选择订阅源'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => startEdit(g)}
                    className="p-1.5 text-lumina-text-muted hover:text-lumina-text rounded transition-colors focus-visible:ring-1 focus-visible:ring-lumina-accent/30"
                    title="编辑规则组"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(g.id)}
                    className="p-1.5 text-lumina-text-muted hover:text-red-400 rounded transition-colors focus-visible:ring-1 focus-visible:ring-lumina-accent/30"
                    title="删除规则组"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {confirmDelete === g.id && (
                  <div className="absolute inset-0 flex items-center justify-end gap-2 px-3 bg-lumina-bg/90 rounded-md z-10">
                    <span className="text-xs text-lumina-text-muted">确认删除？</span>
                    <button
                      onClick={() => { onDelete(g.id); setConfirmDelete(null); }}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                    >删除</button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-lumina-text-muted hover:text-lumina-text px-2 py-1 rounded"
                    >取消</button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Form */}
        <div className="border-t border-lumina-border-light px-5 py-4 shrink-0">
          {/* Create button — collapses with transition when form is shown */}
          <div className={cn(
            "transition-all duration-200 ease-out overflow-hidden",
            showForm ? "max-h-0 opacity-0" : "max-h-20 opacity-100"
          )}>
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-lumina-text-muted hover:text-lumina-text border border-dashed border-lumina-border rounded-md hover:border-lumina-text-muted/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建规则组
            </button>
          </div>

          {/* Form — expands with transition when shown */}
          <div className={cn(
            "transition-all duration-200 ease-out overflow-hidden",
            showForm ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-lumina-text-muted mb-1">规则组名称</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：AI 技术追踪"
                  className="w-full bg-lumina-border-light border border-lumina-border rounded-md py-1.5 px-3 text-sm text-lumina-text placeholder:text-lumina-text-muted/40 focus:outline-none focus:border-lumina-accent/50 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs text-lumina-text-muted mb-1.5">规则类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRuleKind('keyword')}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded-md border transition-colors",
                      ruleKind === 'keyword'
                        ? "border-lumina-accent/40 bg-lumina-accent/10 text-lumina-accent"
                        : "border-lumina-border text-lumina-text-muted hover:text-lumina-text"
                    )}
                  >
                    关键词匹配
                  </button>
                  <button
                    onClick={() => setRuleKind('manual')}
                    className={cn(
                      "flex-1 py-1.5 text-xs rounded-md border transition-colors",
                      ruleKind === 'manual'
                        ? "border-lumina-accent/40 bg-lumina-accent/10 text-lumina-accent"
                        : "border-lumina-border text-lumina-text-muted hover:text-lumina-text"
                    )}
                  >
                    手动选择
                  </button>
                </div>
              </div>

              {ruleKind === 'keyword' ? (
                <>
                  <div>
                    <label className="block text-xs text-lumina-text-muted mb-1">关键词</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                        placeholder="输入后回车添加"
                        className="flex-1 bg-lumina-border-light border border-lumina-border rounded-md py-1.5 px-3 text-sm text-lumina-text placeholder:text-lumina-text-muted/40 focus:outline-none focus:border-lumina-accent/50 transition-colors"
                      />
                      <button
                        onClick={addKeyword}
                        className="px-3 py-1.5 text-xs text-lumina-accent border border-lumina-accent/30 rounded-md hover:bg-lumina-accent/10 transition-colors"
                      >添加</button>
                    </div>
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {keywords.map(kw => (
                          <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-lumina-accent/15 text-lumina-accent">
                            {kw}
                            <button
                              onClick={() => removeKeyword(kw)}
                              className="hover:text-lumina-text focus-visible:ring-1 focus-visible:ring-lumina-accent/30 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-lumina-text-muted mb-1.5">匹配范围</label>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { key: 'matchTitle', label: '标题', value: matchTitle, set: setMatchTitle },
                        { key: 'matchSummary', label: '摘要', value: matchSummary, set: setMatchSummary },
                        { key: 'matchTags', label: '标签', value: matchTags, set: setMatchTags },
                      ].map((opt) => (
                        <label key={opt.key} htmlFor={`rule-${opt.key}`} className="flex items-center gap-2 cursor-pointer">
                          <input
                            id={`rule-${opt.key}`}
                            type="checkbox"
                            checked={opt.value}
                            onChange={(e) => opt.set(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-lumina-border bg-lumina-border-light accent-lumina-accent"
                          />
                          <span className="text-xs text-lumina-text-muted">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-xs text-lumina-text-muted/60">
                    手动选择模式下，可指定该规则组包含的订阅源。此功能将在后续版本中完善。
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSubmit}
                  disabled={!formName.trim()}
                  className="flex-1 py-1.5 text-sm bg-lumina-accent/20 text-lumina-accent border border-lumina-accent/30 rounded-md hover:bg-lumina-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {editingId ? '保存修改' : '创建'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-1.5 text-sm text-lumina-text-muted hover:text-lumina-text border border-lumina-border rounded-md transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

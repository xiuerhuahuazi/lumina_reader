import { cn } from "../utils";
import { mockGroups, mockTags } from "../mockData";
import { Feed, SmartGroup, Article } from "../types";
import type { ReactNode } from "react";
import {
  Sun, Cpu, BookOpen, Zap, PenTool, PlayCircle,
  Menu, Plus, ChevronDown, CircleAlert, Tag
} from "lucide-react";

interface SidebarProps {
  className?: string;
  feeds?: Feed[];
  groups?: SmartGroup[];
  articles?: Article[];
  selectedSource?: string | null;
  selectedGroupId?: string | null;
  onSelectSource?: (sourceName: string | null) => void;
  onSelectGroup?: (groupId: string | null) => void;
  onSmartGroupClick?: () => void;
  onOpenFeedManager?: () => void;
  onOpenGroupManager?: () => void;
}

const iconMap: Record<string, ReactNode> = {
  Sun: <Sun className="w-4 h-4" />,
  Cpu: <Cpu className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  Zap: <Zap className="w-4 h-4" />,
  PenTool: <PenTool className="w-4 h-4" />,
  PlayCircle: <PlayCircle className="w-4 h-4" />,
};

export default function Sidebar({
  className,
  feeds = [],
  groups = [],
  articles = [],
  selectedSource,
  selectedGroupId,
  onSelectSource,
  onSelectGroup,
  onSmartGroupClick,
  onOpenFeedManager,
  onOpenGroupManager,
}: SidebarProps) {
  const userGroups = groups.filter(g => !g.isSystem);
  const systemGroups = groups.filter(g => g.isSystem);
  const hasActiveFilter = !!selectedSource || !!selectedGroupId;

  const countUnreadForGroup = (group: SmartGroup) => {
    if (!group.rule || group.rule.kind !== 'keyword' || !('keywords' in group.rule.config)) return 0;
    const { keywords, matchTitle, matchSummary, matchTags } = group.rule.config;
    if (!keywords || keywords.length === 0) return 0;
    return articles.filter(a => !a.isRead && keywords.some(kw => {
      const lowerKw = kw.toLowerCase();
      if (matchTitle && a.title.toLowerCase().includes(lowerKw)) return true;
      if (matchSummary && a.summary.toLowerCase().includes(lowerKw)) return true;
      if (matchTags && a.tags.some(t => t.toLowerCase().includes(lowerKw))) return true;
      return false;
    })).length;
  };

  // Merge system mock groups (with icons) with API system groups (with rules/counts)
  const systemGroupsWithCounts = mockGroups.map(mg => {
    const apiGroup = systemGroups.find(g => g.id === mg.id);
    return {
      ...mg,
      unreadCount: apiGroup ? countUnreadForGroup(apiGroup) : mg.unreadCount,
    };
  });

  return (
    <div className={cn("w-[220px] h-full border-r border-lumina-border flex flex-col pt-4 overflow-y-auto select-none", className)}>
      <div className="px-4 pb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight">Lumina Reader</h1>
        <Menu className="w-5 h-5 text-lumina-text-muted hover:text-lumina-text transition-colors cursor-pointer" />
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-8">

        {/* Smart Groups */}
        <div>
          <div className="px-2 pb-2 flex items-center justify-between text-xs text-lumina-text-muted font-medium">
            <span>智能分组</span>
            <Plus
                className="w-3.5 h-3.5 cursor-pointer hover:text-lumina-text transition-colors"
                onClick={onOpenGroupManager}
              />
          </div>
          <div className="space-y-0.5">
            {/* System groups (g1-g6) */}
            {systemGroupsWithCounts.map((group) => (
              <div
                key={group.id}
                onClick={onSmartGroupClick}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm group",
                  group.id === "g1" && !hasActiveFilter ? "bg-lumina-active text-lumina-text" : "text-lumina-text/80 hover:bg-lumina-hover"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(group.id === "g1" && !hasActiveFilter ? "text-lumina-accent" : "text-lumina-text-muted")}>
                    {iconMap[group.iconName]}
                  </span>
                  <span>{group.name}</span>
                </div>
                <span className={cn("text-xs", group.id === "g1" && !hasActiveFilter ? "text-lumina-text/60" : "text-lumina-text-muted")}>
                  {group.unreadCount}
                </span>
              </div>
            ))}

            {/* Divider before user groups */}
            {userGroups.length > 0 && (
              <div className="my-1 mx-2 border-t border-lumina-border-light" />
            )}

            {/* User-created rule groups */}
            {userGroups.map((group) => (
              <div
                key={group.id}
                onClick={() => onSelectGroup?.(group.id)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm group",
                  selectedGroupId === group.id
                    ? "bg-lumina-active text-lumina-text"
                    : "text-lumina-text/80 hover:bg-lumina-hover"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn(
                    "shrink-0",
                    selectedGroupId === group.id ? "text-lumina-accent" : "text-lumina-text-muted"
                  )}>
                    <Tag className="w-4 h-4" />
                  </span>
                  <span className="truncate" title={group.name}>{group.name}</span>
                </div>
                <span className={cn(
                  "text-xs shrink-0",
                  selectedGroupId === group.id ? "text-lumina-text/60" : "text-lumina-text-muted"
                )}>
                  {countUnreadForGroup(group)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feeds */}
        <div>
          <div className="px-2 pb-2 flex items-center justify-between text-xs text-lumina-text-muted font-medium">
            <span>原始源</span>
            <Plus
              className="w-3.5 h-3.5 cursor-pointer hover:text-lumina-text transition-colors"
              onClick={onOpenFeedManager}
            />
          </div>
          <div className="space-y-0.5">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                onClick={() => onSelectSource?.(feed.name)}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm text-lumina-text/80 hover:bg-lumina-hover group",
                  selectedSource === feed.name && "bg-lumina-active text-lumina-text"
                )}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: `${feed.iconColor}20`, color: feed.iconColor }}
                  >
                    {feed.iconLetter}
                  </div>
                  <span className="truncate">{feed.name}</span>
                  {feed.isStale && <span className="w-1.5 h-1.5 rounded-full bg-lumina-text-muted/50 shrink-0" />}
                  {feed.hasError && <CircleAlert className="w-3.5 h-3.5 text-lumina-text-muted shrink-0" title={feed.errorMessage || '获取失败'} />}
                </div>
                <span className="text-xs text-lumina-text-muted shrink-0">
                  {feed.unreadCount}
                </span>
              </div>
            ))}
            <div
              className="flex items-center gap-2.5 px-2 py-1.5 mt-1 rounded-md cursor-pointer text-sm text-lumina-text-muted hover:text-lumina-text"
              onClick={onOpenFeedManager}
            >
              <ChevronDown className="w-4 h-4" />
              <span>管理订阅源</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="p-4 mt-auto border-t border-lumina-border-light">
        <div className="text-xs text-lumina-text-muted font-medium mb-3">标签云</div>
        <div className="flex flex-wrap gap-x-3 gap-y-2">
          {mockTags.map(tag => (
            <span key={tag} className="text-[11px] text-lumina-text-muted/70 hover:text-lumina-text cursor-pointer transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

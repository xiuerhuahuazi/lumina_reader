import { useState } from "react";
import { cn } from "../utils";
import { Search, LayoutList, Grip, ChevronRight } from "lucide-react";
import { Article } from "../types";

interface ArticleListProps {
  className?: string;
  articles: Article[];
  onSelectArticle: (article: Article) => void;
  selectedArticleId: string | null;
}

export default function ArticleList({ className, articles, onSelectArticle, selectedArticleId }: ArticleListProps) {
  const [onlyUnread, setOnlyUnread] = useState(false);
  
  const filteredArticles = onlyUnread ? articles.filter(a => !a.isRead) : articles;

  return (
    <div className={cn("min-w-[340px] max-w-[420px] w-full h-full border-r border-lumina-border flex flex-col", className)}>
      
      {/* Search & Top Bar */}
      <div className="p-4 flex flex-col gap-4 border-b border-lumina-border-light shrink-0">
        <div className="relative group">
          <Search className="absolute text-lumina-text-muted w-4 h-4 left-3 top-1/2 -translate-y-1/2 group-focus-within:text-lumina-text transition-colors" />
          <input 
            type="text" 
            placeholder="显示上周关于系统设计的文章" 
            className="w-full bg-lumina-border-light border border-lumina-border rounded-md py-1.5 pl-9 pr-8 text-sm placeholder:text-lumina-text-muted/50 focus:outline-none focus:border-lumina-text-muted/30 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 border border-lumina-border px-1.5 py-0.5 rounded text-[10px] text-lumina-text-muted">
            /
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-lumina-text-muted">
          <div className="flex items-center gap-2">
            <span>仅未读</span>
            <button 
              className={cn(
                "w-8 h-4 rounded-full relative transition-colors duration-200", 
                onlyUnread ? "bg-lumina-accent" : "bg-lumina-border"
              )}
              onClick={() => setOnlyUnread(!onlyUnread)}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-3 h-3 bg-lumina-bg rounded-full transition-transform duration-200",
                onlyUnread ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 text-lumina-text hover:bg-lumina-hover rounded transition-colors">
              <LayoutList className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-lumina-text hover:bg-lumina-hover rounded transition-colors">
              <Grip className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Today's Summary Toggle */}
        <div className="px-4 py-3 flex items-center gap-2 text-sm text-lumina-text-muted cursor-pointer hover:text-lumina-text border-b border-lumina-border-light transition-colors">
          <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
          <span>今日摘要 <span className="text-xs opacity-60 ml-2">(过去 24 小时 · {articles.filter(a => !a.isRead).length} 篇未读)</span></span>
        </div>

        {/* Summary Content */}
        <div className="px-5 py-3 pt-1 text-sm text-lumina-text/80 space-y-2 mb-2 border-b border-lumina-border-light">
           1. Google 发布了新一代多模态模型 Gemini 1.5，显著提升长文本和视频理解能力。<br/>
           2. 字节跳动开源了高性能向量数据库 VEDb，针对大规模检索场景优化。<br/>
           3. 苹果 WWDC24 宣布 iOS 18 将强化隐私控制与 AI 本地化处理能力。
           <div className="text-xs text-lumina-text-muted text-right mt-2 cursor-pointer hover:text-lumina-text transition-colors">展开 <ChevronRight className="w-3 h-3 inline rotate-90" /></div>
        </div>

        {/* Article Items */}
        <div className="flex flex-col">
          {filteredArticles.map((article) => (
            <div 
              key={article.id}
              onClick={() => onSelectArticle(article)}
              className={cn(
                "relative px-5 py-4 cursor-pointer border-b border-lumina-border-light/50 transition-colors duration-200 group",
                selectedArticleId === article.id ? "bg-lumina-active" : "hover:bg-lumina-hover"
              )}
            >
              {/* Unread Indicator */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300",
                !article.isRead ? "bg-lumina-accent opacity-100" : "bg-transparent opacity-0"
              )} />
              
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={cn(
                  "text-[15px] font-medium leading-snug truncate pr-4", 
                  !article.isRead ? "text-lumina-text" : "text-lumina-text-muted"
                )}>
                  {article.title}
                </h3>
                <span className="text-xs text-lumina-text-muted shrink-0 tabular-nums">
                  {article.publishedAt}
                </span>
              </div>
              
              <div className="text-[13px] text-lumina-text-muted mb-1 text-opacity-80">
                {article.source}
              </div>
              
              <p className={cn(
                "text-[13.5px] leading-relaxed line-clamp-2",
                !article.isRead ? "text-lumina-text/60" : "text-lumina-text-muted/60"
              )}>
                {article.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

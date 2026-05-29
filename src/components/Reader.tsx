import { useState, useEffect } from "react";
import { cn } from "../utils";
import { Article } from "../types";
import {
  ChevronLeft, Mail, Star, Type, Link as LinkIcon, Maximize, MoreHorizontal, X, CheckCircle
} from "lucide-react";

interface ReaderProps {
  article: Article | null;
  onClose: () => void;
  className?: string;
  onToggleFocus: () => void;
  isFocused: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
  onToggleRead?: () => void;
  isRead?: boolean;
}

export default function Reader({ article, onClose, className, onToggleFocus, isFocused, onNavigatePrev, onNavigateNext, currentIndex, totalCount, onToggleRead, isRead }: ReaderProps) {
  const [scrollY, setScrollY] = useState(0);
  const [isSerif, setIsSerif] = useState(true);

  // Transition effect state
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (article) {
      setIsVisible(false);
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [article]);

  const handleOpenSource = () => {
    if (article?.url) {
      window.open(article.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!article) {
    return (
      <div
        className={cn(
          "flex-1 w-full h-full flex flex-col items-center justify-center text-lumina-text-muted bg-lumina-bg",
          className
        )}
      >
        <Mail className="w-12 h-12 mb-4 opacity-20" strokeWidth={1} />
        <p className="text-sm opacity-60">选择一篇文章开始阅读</p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "w-full h-full min-h-0 flex justify-center bg-lumina-bg overflow-y-auto relative transition-all duration-300",
        className,
        !isVisible && "opacity-0 translate-x-4",
        isVisible && "opacity-100 translate-x-0"
      )}
      onScroll={(e) => setScrollY((e.target as HTMLDivElement).scrollTop)}
    >
      
      {/* Top Action Bar (Sticky, gradually appears on scroll) */}
      <div 
        className={cn(
          "fixed top-0 max-w-[720px] w-full px-8 py-3 flex items-center justify-between z-10 bg-lumina-bg/80 backdrop-blur-md transition-opacity duration-300",
          scrollY > 40 ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-lumina-text-muted hover:text-lumina-text">
          <ChevronLeft className="w-4 h-4" />
          <span>返回</span>
        </button>
        <div className="flex items-center gap-4 text-lumina-text-muted">
          <button className="hover:text-lumina-text"><Mail className="w-4 h-4" /></button>
          <button className="hover:text-lumina-text"><Star className="w-4 h-4" /></button>
          <button className="hover:text-lumina-text" onClick={onToggleRead} title={isRead ? '标为未读' : '标为已读'}>
            <CheckCircle className={cn("w-4 h-4", isRead && "text-lumina-accent")} />
          </button>
          <button className="hover:text-lumina-text" onClick={() => setIsSerif(!isSerif)}><Type className="w-4 h-4" /></button>
          <button className="hover:text-lumina-text" onClick={handleOpenSource}><LinkIcon className="w-4 h-4" /></button>
          <button className="hover:text-lumina-text" onClick={onToggleFocus}><Maximize className="w-4 h-4" /></button>
          <button className="hover:text-lumina-text"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[720px] w-full px-8 py-16 pb-32">
        
        {/* Top actions when scrolled up */}
        <div 
          className={cn(
            "flex items-center justify-between mb-12 text-lumina-text-muted transition-opacity duration-200",
            scrollY > 40 && "opacity-0 pointer-events-none"
          )}
        >
          <button onClick={onClose} className="flex items-center gap-1.5 text-sm hover:text-lumina-text">
            <ChevronLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-5">
            <button className="hover:text-lumina-text focus:outline-none"><Mail className="w-4 h-4" /></button>
            <button className="hover:text-lumina-text focus:outline-none"><Star className="w-4 h-4" /></button>
            <button className="hover:text-lumina-text focus:outline-none" onClick={onToggleRead} title={isRead ? '标为未读' : '标为已读'}>
              <CheckCircle className={cn("w-4 h-4", isRead && "text-lumina-accent")} />
            </button>
            <button className="hover:text-lumina-text focus:outline-none flex font-serif italic font-semibold text-lg items-center" onClick={() => setIsSerif(!isSerif)}>
               <span className="leading-none text-base mr-0.5">A</span>a
            </button>
            <button className="hover:text-lumina-text focus:outline-none" onClick={handleOpenSource}><LinkIcon className="w-4 h-4" /></button>
            <button className="hover:text-lumina-text focus:outline-none" onClick={onToggleFocus}><Maximize className="w-4 h-4" /></button>
            <button className="hover:text-lumina-text focus:outline-none"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight leading-tight mb-5 text-lumina-text">
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-lumina-text-muted mb-6">
            <span>{article.source}</span>
            <span>·</span>
            <span className="tabular-nums">{article.publishedAt}</span>
            {article.source === "The Verge" && <span>·</span>}
            {article.source === "The Verge" && <span>作者：Victoria Song</span>}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded bg-lumina-active text-[13px] text-lumina-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Article Body */}
        <div 
          className={cn(
            "prose prose-invert prose-lumina max-w-none leading-[1.7] text-[16px] sm:text-[17px] pb-10",
            isSerif ? "font-serif" : "font-sans"
          )}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

      </div>

      {/* Floating Right Sidebar (Annotations) */}
      <div className="hidden fixed right-6 top-1/4 w-64 bg-lumina-bg border border-lumina-border shadow-xl rounded-lg overflow-hidden flex-col z-20">
         <div className="flex items-center justify-between px-4 py-3 border-b border-lumina-border-light text-sm text-lumina-text">
            <div className="flex gap-4">
              <span className="cursor-pointer border-b border-transparent hover:text-lumina-text">批注</span>
              <span className="text-lumina-text-muted cursor-pointer hover:text-lumina-text">高亮</span>
            </div>
            <X className="w-4 h-4 text-lumina-text-muted cursor-pointer hover:text-lumina-text" />
         </div>
         <div className="p-4 space-y-5 flex-1 overflow-y-auto">
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-4 rounded-full border border-lumina-accent text-lumina-accent flex items-center justify-center text-[9px]">1</span>
              </div>
              <p className="text-lumina-text-muted leading-relaxed mb-2">这里提到的 100 万 token 上下文窗口，是目前公开中最大的一。</p>
              <span className="text-[10px] text-lumina-text-muted/50">今天 09:45</span>
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-4 rounded-full border border-lumina-accent text-lumina-accent flex items-center justify-center text-[9px]">2</span>
              </div>
              <p className="text-lumina-text-muted leading-relaxed mb-2">信息丢失是关键问题，值得在系统设计中重点关注。</p>
              <span className="text-[10px] text-lumina-text-muted/50">今天 09:47</span>
            </div>
         </div>
         <div className="p-3 border-t border-lumina-border-light">
           <button className="w-full py-2 bg-lumina-hover text-lumina-text text-sm rounded flex items-center justify-center gap-2 hover:bg-lumina-active transition-colors">
             <span className="text-lumina-text-muted">+</span> 写批注
           </button>
         </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="fixed bottom-0 max-w-[720px] w-full px-8 py-4 bg-gradient-to-t from-lumina-bg via-lumina-bg to-transparent flex justify-between items-center text-xs text-lumina-text-muted">
         <button className="flex items-center gap-1 hover:text-lumina-text" onClick={onNavigatePrev}>
           <ChevronLeft className="w-3.5 h-3.5" /> 上一篇 (K)
         </button>
         <span>{currentIndex != null && totalCount != null ? `${currentIndex + 1} / ${totalCount}` : ''}</span>
         <button className="flex items-center gap-1 hover:text-lumina-text" onClick={onNavigateNext}>
           下一篇 (J) <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
         </button>
      </div>

    </div>
  );
}

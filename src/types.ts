export interface Article {
  id: string;
  title: string;
  source: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: string;
  isRead: boolean;
  isStarred: boolean;
  tags: string[];
}

export interface Feed {
  id: string;
  name: string;
  unreadCount: number;
  hasError?: boolean;
  isStale?: boolean;
  iconLetter?: string;
  iconColor?: string;
  feedUrl?: string;
  siteUrl?: string;
  fetchFrequency?: FetchFrequency;
  persisted?: boolean;
  errorMessage?: string;
}

export interface Group {
  id: string;
  name: string;
  iconName: string;
  unreadCount: number;
}

// ─── Smart Group ────────────────────────────────────────

export interface SmartGroup {
  id: string;
  name: string;
  rule: SmartGroupRule;
  feedIds: string[];
  sortOrder: number;
  isSystem: boolean;
}

export interface SmartGroupRule {
  kind: 'keyword' | 'manual';
  config: KeywordRuleConfig | ManualRuleConfig;
}

export interface KeywordRuleConfig {
  keywords: string[];
  matchTitle: boolean;
  matchSummary: boolean;
  matchTags: boolean;
}

export interface ManualRuleConfig {
  feedIds: string[];
}

export type FetchFrequency = '5m' | '15m' | '30m' | '1h' | 'manual';

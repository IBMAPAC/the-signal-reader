export type DigestArticle = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  category: string;
  publishedDate: string;
  sourcePriority: number;
  relevanceScore: number;
};

export type DigestPayload = {
  generatedAt: string;
  timeBudgetMinutes?: { daily: number; weekly: number };
  total: number;
  articles: DigestArticle[];
};

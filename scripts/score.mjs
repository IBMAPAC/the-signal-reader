// Ported from your iOS app (ScoringService.swift + CrossReference.swift)
// Node/JS implementation used by scripts/buildDigest.mjs

export const KEYWORDS = {
  fieldCTO: ["enterprise", "client", "customer", "deal", "revenue", "roi", "tco", "business case", "digital transformation", "modernization", "migration", "cto", "cio", "ciso", "ceo", "board", "c-suite", "executive", "leadership", "ibm", "watsonx", "red hat", "openshift", "consulting", "services", "hybrid cloud", "multicloud", "kubernetes", "containerization", "api", "integration", "microservices", "platform", "cost reduction", "efficiency", "automation", "productivity", "competitive advantage", "innovation", "growth"],
  apac: ["singapore", "australia", "japan", "korea", "india", "indonesia", "malaysia", "thailand", "vietnam", "philippines", "new zealand", "hong kong", "taiwan", "asia pacific", "apac", "asean", "asia", "pacific rim", "mas", "apra", "rbi", "fsa", "pdpc", "imda"],
  urgency: ["ai agent", "agentic", "autonomous", "llm", "large language model", "gpt", "claude", "gemini", "copilot", "watsonx", "generative ai", "gen ai", "foundation model", "ai governance", "responsible ai", "ai ethics", "ai safety", "ai regulation", "ai act", "ai policy", "cybersecurity", "security", "breach", "vulnerability", "zero trust", "ransomware", "threat", "attack", "quantum safe", "encryption", "identity", "data sovereignty", "data localization", "data residency", "gdpr", "pdpa", "pipl", "privacy", "compliance", "breaking", "urgent", "critical", "announced", "launched"],
  competitive: ["microsoft", "azure", "google cloud", "gcp", "aws", "amazon web services", "accenture", "deloitte", "kpmg", "pwc", "ey", "mckinsey", "bcg", "bain", "tcs", "infosys", "wipro", "cognizant", "capgemini", "salesforce", "servicenow", "snowflake", "databricks", "palantir", "oracle", "sap", "vmware", "dell", "hpe", "openai", "anthropic", "google deepmind", "meta ai", "cohere", "partnership", "acquisition", "merger", "contract", "deal", "wins", "loses", "expands", "launches"],
  architecture: ["kubernetes", "openshift", "docker", "container", "cloud native", "serverless", "microservices", "api", "integration", "middleware", "event-driven", "data fabric", "data mesh", "lakehouse", "data platform", "hybrid cloud", "multicloud", "edge", "5g", "devops", "devsecops", "sre", "platform engineering"],
  governanceTerms: ["ai governance", "responsible ai", "ai safety", "ai ethics", "ai regulation"],
  sovereigntyTerms: ["data sovereignty", "data localization", "data residency", "cross-border"],
  topicKeywordGroups: [["openai", "gpt", "chatgpt"], ["anthropic", "claude"], ["google", "gemini", "deepmind"], ["microsoft", "copilot", "azure ai"], ["ai agent", "agentic", "autonomous agent"], ["llm", "large language model", "foundation model"], ["ai regulation", "ai act", "ai governance"], ["data privacy", "gdpr", "pdpa", "pipl"], ["data sovereignty", "data localization"], ["ibm", "watsonx", "red hat"], ["aws", "amazon web services", "bedrock"], ["accenture"], ["deloitte"], ["kubernetes", "container", "openshift"], ["quantum", "quantum computing"], ["semiconductor", "chip", "nvidia"]]
};

export function normalizeForComparison(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function calculateSimilarity(text1, text2) {
  const w1 = new Set(normalizeForComparison(text1).split(" ").filter(Boolean));
  const w2 = new Set(normalizeForComparison(text2).split(" ").filter(Boolean));
  if (w1.size === 0 || w2.size === 0) return 0;
  let intersection = 0;
  for (const w of w1) if (w2.has(w)) intersection++;
  const union = new Set([...w1, ...w2]).size;
  return intersection / union;
}

export function calculateKeywordScore(text, keywords) {
  const lower = (text || "").toLowerCase();
  let weightedScore = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      weightedScore += kw.length / 10.0;
    }
  }
  const maxPossible = keywords.length * 0.5;
  return Math.min(1.0, maxPossible > 0 ? weightedScore / maxPossible : 0);
}

export function calculateUrgencyScore(text) {
  let score = calculateKeywordScore(text, KEYWORDS.urgency);

  for (const term of KEYWORDS.governanceTerms) {
    if ((text || "").toLowerCase().includes(term)) {
      score = Math.min(1.0, score + 0.15);
      break;
    }
  }

  for (const term of KEYWORDS.sovereigntyTerms) {
    if ((text || "").toLowerCase().includes(term)) {
      score = Math.min(1.0, score + 0.15);
      break;
    }
  }

  return score;
}

export function normalizeWeights(w) {
  const apac = w.apacEnabled ? w.apacWeight : 0;
  const total = w.fieldCTOWeight + apac + w.urgencyWeight + w.noveltyWeight + w.credibilityWeight;
  if (!total || total <= 0) return w;
  return {
    ...w,
    fieldCTOWeight: w.fieldCTOWeight / total,
    apacWeight: w.apacEnabled ? w.apacWeight / total : 0,
    urgencyWeight: w.urgencyWeight / total,
    noveltyWeight: w.noveltyWeight / total,
    credibilityWeight: w.credibilityWeight / total,
  };
}

export function detectIndustry(text, industries) {
  const lower = (text || "").toLowerCase();
  const rank = (t) => (t === "tier1" ? 1 : t === "tier2" ? 2 : 3);
  const sorted = [...industries].filter(i => i.isEnabled).sort((a,b) => rank(a.tier) - rank(b.tier));
  for (const ind of sorted) {
    for (const kw of (ind.keywords || [])) {
      if (lower.includes(String(kw).toLowerCase())) return ind;
    }
  }
  return null;
}

export function detectClient(text, clients) {
  const lower = (text || "").toLowerCase();
  for (const c of clients) {
    if (!c.isEnabled) continue;
    const terms = [c.name, ...(c.aliases || [])].map(s => String(s).toLowerCase());
    for (const term of terms) {
      if (term && lower.includes(term)) return c;
    }
  }
  return null;
}

export function detectCrossReferences(articles) {
  const crossRefs = [];
  for (const group of KEYWORDS.topicKeywordGroups) {
    const matching = articles.filter(a => {
      const t = `${a.title} ${a.summary || ""}`.toLowerCase();
      return group.some(k => t.includes(k));
    });
    const uniqueSources = new Set(matching.map(a => a.sourceName));
    if (uniqueSources.size >= 2) {
      const boost = calculateCrossRefBoost(uniqueSources.size);
      crossRefs.push({
        topic: group[0] || "unknown",
        sourceCount: uniqueSources.size,
        relevanceBoost: boost,
        articleIds: new Set(matching.map(a => a.id))
      });
    }
  }
  crossRefs.sort((a,b) => b.sourceCount - a.sourceCount);
  return crossRefs;
}

function calculateCrossRefBoost(sourceCount) {
  if (sourceCount === 2) return 0.15;
  if (sourceCount === 3) return 0.25;
  if (sourceCount === 4) return 0.35;
  return Math.min(0.50, sourceCount * 0.10);
}

export function crossRefBoostForArticle(articleId, crossRefs) {
  let total = 0;
  for (const cr of crossRefs) {
    if (cr.articleIds?.has(articleId)) total += cr.relevanceBoost;
  }
  return Math.min(0.50, total);
}

export function noveltyScoreForTitle(title, recentTitles) {
  const normalized = normalizeForComparison(title);
  for (const recent of recentTitles) {
    const sim = calculateSimilarity(normalized, recent);
    if (sim > 0.7) return 0.2;
    if (sim > 0.5) return 0.5;
  }
  return 1.0;
}

export function estimateReadingMinutes(summary) {
  const words = String(summary || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(10, Math.floor(words / 150) + 1));
}

export function scoreArticle(article, ctx) {
  const text = `${article.title} ${article.summary || ""}`.toLowerCase();

  const fieldCTOScore = calculateKeywordScore(text, KEYWORDS.fieldCTO);
  const apacScore = ctx.weights.apacEnabled ? calculateKeywordScore(text, KEYWORDS.apac) : 0;
  const urgencyScore = calculateUrgencyScore(text);
  const noveltyScore = noveltyScoreForTitle(article.title, ctx.recentTitles);
  const credibilityScore = (ctx.sourceCredibility[article.sourceName] ?? 0.7);

  const competitiveBonus = calculateKeywordScore(text, KEYWORDS.competitive) * 0.1;
  const architectureBonus = calculateKeywordScore(text, KEYWORDS.architecture) * 0.05;

  const priorityBoost = article.priority === 1 ? 0.20 : article.priority === 2 ? 0.10 : 0.0;

  const matchedIndustry = detectIndustry(text, ctx.industries);
  const industryBoost = matchedIndustry ? (matchedIndustry.boost || 0) : 0;

  const matchedClient = detectClient(text, ctx.clients);
  const clientBoost = matchedClient ? 0.25 : 0;

  const crossRefBoost = crossRefBoostForArticle(article.id, ctx.crossRefs);

  const w = normalizeWeights(ctx.weights);
  let total = (fieldCTOScore * w.fieldCTOWeight)
            + (apacScore * w.apacWeight)
            + (urgencyScore * w.urgencyWeight)
            + (noveltyScore * w.noveltyWeight)
            + (credibilityScore * w.credibilityWeight);

  total = Math.min(1.0, total + competitiveBonus + architectureBonus + priorityBoost + industryBoost + clientBoost + crossRefBoost);

  return {
    relevanceScore: total,
    breakdown: {
      fieldCTOScore, apacScore, urgencyScore, noveltyScore, credibilityScore,
      competitiveBonus, architectureBonus, priorityBoost, industryBoost, clientBoost, crossRefBoost
    },
    matchedIndustry: matchedIndustry ? { industry: matchedIndustry.industry, tier: matchedIndustry.tier } : null,
    matchedClient: matchedClient ? { name: matchedClient.name } : null,
    estimatedReadingMinutes: estimateReadingMinutes(article.summary),
    crossReferenceBoost: crossRefBoost
  };
}

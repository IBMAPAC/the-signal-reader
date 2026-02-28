import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";

import { detectCrossReferences, scoreArticle } from "./score.mjs";

const parser = new Parser({
  timeout: 20000,
  headers: { "User-Agent": "the-signal-reader/1.0" },
});

const ROOT = process.cwd();

const CFG_DIR = path.join(ROOT, "scripts", "defaultConfig");
const OUT_DIR = path.join(ROOT, "web", "public", "data");

const SOURCES_PATH = path.join(CFG_DIR, "sources.json");
const SETTINGS_PATH = path.join(CFG_DIR, "settings.json");
const INDUSTRIES_PATH = path.join(CFG_DIR, "industries.json");
const CLIENTS_PATH = path.join(CFG_DIR, "clients.json");

const OUT_DIGEST = path.join(OUT_DIR, "digest.json");
const OUT_SOURCES = path.join(OUT_DIR, "sources.json");
const OUT_SETTINGS = path.join(OUT_DIR, "settings.json");
const OUT_INDUSTRIES = path.join(OUT_DIR, "industries.json");
const OUT_CLIENTS = path.join(OUT_DIR, "clients.json");

function stableId(url) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `a_${(h >>> 0).toString(16)}`;
}

function clampText(s, max = 320) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

function isDailySource(source) {
  return source.digestType === "daily" || source.digestType === "both";
}
function isWeeklySource(source) {
  return source.digestType === "weekly" || source.digestType === "both";
}

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const sources = (await readJson(SOURCES_PATH, [])).filter((s) => s.isEnabled);
  const settings = await readJson(SETTINGS_PATH, null);
  const industries = await readJson(INDUSTRIES_PATH, []);
  const clientsWrap = await readJson(CLIENTS_PATH, { clients: [] });
  const clients = clientsWrap.clients || [];

  if (!settings) throw new Error("Missing scripts/defaultConfig/settings.json");

  const weights = settings.scoringWeights;
  const timeBudget = settings.timeBudget;

  // Seed recent titles from previous digest for novelty scoring.
  const prev = await readJson(OUT_DIGEST, null);
  const recentTitles = new Set();
  if (prev?.daily?.articles) for (const a of prev.daily.articles) recentTitles.add(String(a.title || "").toLowerCase());
  if (prev?.weekly?.articles) for (const a of prev.weekly.articles) recentTitles.add(String(a.title || "").toLowerCase());

  const sourceCredibility = Object.fromEntries(
    sources.map((s) => [s.name, typeof s.credibilityScore === "number" ? s.credibilityScore : 0.7])
  );

  // Fetch all feeds concurrently
  const fetches = await Promise.allSettled(
    sources.map(async (s) => {
      const feed = await parser.parseURL(s.url);
      const items = feed.items || [];
      return items
        .filter((it) => it.title && it.link)
        .map((it) => {
          const url = String(it.link);
          const published = it.isoDate ? new Date(it.isoDate) : new Date();
          return {
            id: stableId(url),
            title: String(it.title),
            summary: clampText(it.contentSnippet || it.content || ""),
            url,
            sourceName: s.name,
            category: s.category,
            publishedDate: published.toISOString(),
            priority: s.priority,
          };
        });
    })
  );

  const rawArticles = [];
  for (const r of fetches) {
    if (r.status === "fulfilled") rawArticles.push(...r.value);
  }

  // Deduplicate by URL
  const byUrl = new Map();
  for (const a of rawArticles) byUrl.set(a.url, a);
  const articles = [...byUrl.values()];

  // Cross-reference detection (pre-scoring)
  const crossRefs = detectCrossReferences(
    articles.map((a) => ({ ...a, publishedDate: new Date(a.publishedDate) }))
  );

  // Score each article
  const scored = articles.map((a) => {
    const scoredInfo = scoreArticle(a, {
      weights,
      recentTitles,
      sourceCredibility,
      industries,
      clients,
      crossRefs,
    });

    return {
      ...a,
      sourcePriority: a.priority,
      relevanceScore: Number(scoredInfo.relevanceScore.toFixed(4)),
      estimatedReadingMinutes: scoredInfo.estimatedReadingMinutes,
      matchedIndustry: scoredInfo.matchedIndustry,
      matchedClient: scoredInfo.matchedClient,
      crossReferenceBoost: scoredInfo.crossReferenceBoost,
      _breakdown: scoredInfo.breakdown,
    };
  });

  // Apply currency cutoffs (mirrors DigestViewModel)
  const now = Date.now();
  const dailyCutoff = now - timeBudget.dailyCurrencyHours * 60 * 60 * 1000;
  const weeklyCutoff = now - timeBudget.weeklyCurrencyDays * 24 * 60 * 60 * 1000;

  const dailyPool = scored
    .filter((a) => new Date(a.publishedDate).getTime() >= dailyCutoff)
    .filter((a) => {
      const s = sources.find((x) => x.name === a.sourceName);
      return s ? isDailySource(s) : true;
    })
    .sort((a, b) => a.sourcePriority - b.sourcePriority || b.relevanceScore - a.relevanceScore);

  const weeklyPool = scored
    .filter((a) => new Date(a.publishedDate).getTime() >= weeklyCutoff)
    .filter((a) => {
      const s = sources.find((x) => x.name === a.sourceName);
      return s ? isWeeklySource(s) : true;
    })
    .sort((a, b) => a.sourcePriority - b.sourcePriority || b.relevanceScore - a.relevanceScore);

  // Daily: pick until minutes budget
  let totalMinutes = 0;
  const daily = [];
  for (const a of dailyPool) {
    if (totalMinutes + a.estimatedReadingMinutes <= timeBudget.dailyMinutes) {
      daily.push(a);
      totalMinutes += a.estimatedReadingMinutes;
    }
  }

  // Weekly: cap per source, stop at weekly count
  const weekly = [];
  const sourceCount = {};
  const maxPerSource = 2;
  for (const a of weeklyPool) {
    const c = sourceCount[a.sourceName] || 0;
    if (c < maxPerSource) {
      weekly.push(a);
      sourceCount[a.sourceName] = c + 1;
    }
    if (weekly.length >= timeBudget.weeklyArticleCount) break;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    scoringWeights: weights,
    timeBudget,
    totals: { all: scored.length, daily: daily.length, weekly: weekly.length },
    daily: { minutesBudget: timeBudget.dailyMinutes, totalMinutes, articles: daily.map(stripInternals) },
    weekly: { articleCountBudget: timeBudget.weeklyArticleCount, articles: weekly.map(stripInternals) },
    crossReferences: crossRefs.map((cr) => ({
      topic: cr.topic,
      sourceCount: cr.sourceCount,
      relevanceBoost: cr.relevanceBoost,
    })),
  };

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Publish config into public data (so UI can render Sources etc.)
  await fs.writeFile(OUT_SOURCES, JSON.stringify(sources, null, 2), "utf8");
  await fs.writeFile(OUT_SETTINGS, JSON.stringify(settings, null, 2), "utf8");
  await fs.writeFile(OUT_INDUSTRIES, JSON.stringify(industries, null, 2), "utf8");
  await fs.writeFile(OUT_CLIENTS, JSON.stringify({ clients }, null, 2), "utf8");

  await fs.writeFile(OUT_DIGEST, JSON.stringify(payload, null, 2), "utf8");

  console.log(`✅ Wrote ${OUT_DIGEST} (daily=${daily.length}, weekly=${weekly.length}, total=${scored.length})`);
}

function stripInternals(a) {
  const { _breakdown, priority, ...rest } = a;
  return rest;
}

main().catch((e) => {
  console.error("❌ buildDigest failed:", e);
  process.exit(1);
});

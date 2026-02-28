import fs from "node:fs/promises";
import path from "node:path";
import Parser from "rss-parser";

const parser = new Parser({ timeout: 20000 });

const ROOT = process.cwd();
const sourcesPath = path.join(ROOT, "scripts/defaultConfig/sources.json");
const settingsPath = path.join(ROOT, "scripts/defaultConfig/settings.json");
const outPath = path.join(ROOT, "web/public/data/digest.json");

const normalize = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();

const fieldKeywords = [
  "enterprise","modernization","migration","hybrid cloud","kubernetes","openshift",
  "agentic","ai agent","llm","foundation model","governance","sovereign","regulation",
  "security","zero trust","ransomware","cio","cto","ciso","finops","observability"
];

const apacKeywords = [
  "apac","asean","singapore","australia","japan","korea","india","indonesia",
  "malaysia","thailand","vietnam","philippines","hong kong","taiwan"
];

const urgencyKeywords = [
  "agentic","autonomous","zero-day","breach","ai act","regulation","sanction",
  "vulnerability","ransomware","critical","exploit","patched","cve"
];

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function keywordScore(text, keywords) {
  let hits = 0;
  for (const k of keywords) if (text.includes(normalize(k))) hits++;
  return Math.min(1, hits / 6);
}

function recencyScore(date) {
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 12) return 1.0;
  if (hours <= 24) return 0.85;
  if (hours <= 72) return 0.65;
  if (hours <= 168) return 0.4;
  return 0.2;
}

function stableId(url) {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `a_${(h >>> 0).toString(16)}`;
}

function scoreArticle(text, sourceCred, pubDate, w, seenTitles) {
  const field = keywordScore(text, fieldKeywords) * w.fieldCtoKeywordWeight;
  const apac = keywordScore(text, apacKeywords) * w.apacWeight;
  const urg = keywordScore(text, urgencyKeywords) * w.urgencyWeight;
  const cred = clamp01(sourceCred ?? 1.0) * w.credibilityWeight;
  const rec = recencyScore(pubDate) * w.recencyWeight;

  const titleKey = normalize(text).split(" ").slice(0, 18).join(" ");
  const dupPenalty = seenTitles.has(titleKey) ? -Math.abs(w.duplicatePenalty) : 0;

  seenTitles.add(titleKey);
  return field + apac + urg + cred + rec + dupPenalty;
}

async function main() {
  const sources = JSON.parse(await fs.readFile(sourcesPath, "utf8")).filter(s => s.enabled);
  const settings = JSON.parse(await fs.readFile(settingsPath, "utf8"));
  const w = settings.weights;

  const seenTitles = new Set();
  const all = [];

  const results = await Promise.allSettled(
    sources.map(async (s) => {
      const feed = await parser.parseURL(s.url);
      const items = feed.items || [];
      return items.map((it) => {
        const url = it.link || "";
        const title = it.title || "";
        if (!url || !title) return null;

        const summary = it.contentSnippet || it.content || "";
        const published = it.isoDate ? new Date(it.isoDate) : new Date();
        const text = normalize(`${title} ${summary}`);
        const score = scoreArticle(text, s.credibility, published, w, seenTitles);

        return {
          id: stableId(url),
          title,
          summary: (summary || "").toString().slice(0, 280),
          url,
          sourceName: s.name,
          category: s.category,
          publishedDate: published.toISOString(),
          sourcePriority: s.priority,
          relevanceScore: Number(score.toFixed(4))
        };
      }).filter(Boolean);
    })
  );

  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);

  const byUrl = new Map();
  for (const a of all) byUrl.set(a.url, a);
  const deduped = [...byUrl.values()];

  deduped.sort((a, b) =>
    (b.relevanceScore - a.relevanceScore) ||
    (new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
  );

  const payload = {
    generatedAt: new Date().toISOString(),
    timeBudgetMinutes: settings.timeBudgetMinutes,
    total: deduped.length,
    articles: deduped.slice(0, 200)
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outPath} (${payload.articles.length} articles)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

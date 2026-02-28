import { useEffect, useMemo, useState } from "react";
import {
  Grid, Column,
  Tabs, Tab,
  Search, Dropdown, Tag, Tile, InlineLoading, Button, ToastNotification,
} from "@carbon/react";
import { Renew, Launch } from "@carbon/icons-react";

type Article = {
  id: string;
  title: string;
  summary?: string;
  url: string;
  sourceName: string;
  category: string;
  publishedDate: string;
  sourcePriority: number;
  relevanceScore: number;
  estimatedReadingMinutes: number;
  matchedIndustry?: { industry: string; tier: string } | null;
  matchedClient?: { name: string } | null;
  crossReferenceBoost?: number;
};

type DigestPayload = {
  generatedAt: string;
  scoringWeights: any;
  timeBudget: any;
  totals: { all: number; daily: number; weekly: number };
  daily: { minutesBudget: number; totalMinutes: number; articles: Article[] };
  weekly: { articleCountBudget: number; articles: Article[] };
  crossReferences: Array<{ topic: string; sourceCount: number; relevanceBoost: number }>;
};

const ALL = "All";

export default function DigestPage() {
  const [data, setData] = useState<DigestPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [source, setSource] = useState<string>(ALL);

  const [activeTab, setActiveTab] = useState<"daily" | "weekly">("daily");

  const load = async () => {
    setErr(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/digest.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DigestPayload;
      setData(json);
    } catch (e: any) {
      setErr("Couldn’t load digest data. If you just deployed, wait a minute and refresh.");
      setData(null);
    }
  };

  useEffect(() => { load(); }, []);

  const allArticles = useMemo(() => {
    if (!data) return [];
    return activeTab === "daily" ? data.daily.articles : data.weekly.articles;
  }, [data, activeTab]);

  const categories = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const a of allArticles) set.add(a.category);
    return Array.from(set).sort((a, b) => (a === ALL ? -1 : b === ALL ? 1 : a.localeCompare(b)));
  }, [allArticles]);

  const sources = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const a of allArticles) set.add(a.sourceName);
    return Array.from(set).sort((a, b) => (a === ALL ? -1 : b === ALL ? 1 : a.localeCompare(b)));
  }, [allArticles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allArticles.filter(a => {
      const okCat = category === ALL || a.category === category;
      const okSrc = source === ALL || a.sourceName === source;
      const hay = `${a.title} ${a.summary ?? ""} ${a.sourceName}`.toLowerCase();
      const okQ = !q || hay.includes(q);
      return okCat && okSrc && okQ;
    });
  }, [allArticles, query, category, source]);

  const headerTag = useMemo(() => {
    if (!data?.generatedAt) return "Not updated yet";
    const dt = new Date(data.generatedAt);
    return `Updated ${dt.toLocaleString()}`;
  }, [data]);

  if (!data && !err) {
    return (
      <div className="reader-max" style={{ paddingTop: 16 }}>
        <InlineLoading description="Loading digest…" />
      </div>
    );
  }

  return (
    <Grid fullWidth>
      <Column sm={4} md={8} lg={16}>
        <div className="reader-max" style={{ paddingTop: 8 }}>
          {err && (
            <div style={{ marginBottom: 16 }}>
              <ToastNotification
                kind="error"
                title="Data not available"
                subtitle={err}
                timeout={0}
              />
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Tag type="cool-gray">{headerTag}</Tag>
              {data?.totals && (
                <Tag type="gray">
                  {activeTab === "daily" ? `${data.totals.daily} daily` : `${data.totals.weekly} weekly`}
                </Tag>
              )}
            </div>

            <Button kind="ghost" size="sm" renderIcon={Renew} onClick={load}>
              Refresh
            </Button>
          </div>

          import { Tabs, TabList, Tab } from "@carbon/react";
          
          // ...
          
          <Tabs
            selectedIndex={selectedIndex}
            onChange={({ selectedIndex }: { selectedIndex: number }) => setSelectedIndex(selectedIndex)}
          >
            <TabList aria-label="Sections">
              <Tab>Digest</Tab>
              <Tab>Sources</Tab>
              <Tab>Settings</Tab>
            </TabList>
          </Tabs>
          
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
            <Search
              size="lg"
              labelText="Search"
              placeholder="Search articles, sources, keywords"
              onChange={(e: any) => setQuery(e.target.value)}
            />
            <Dropdown
              id="category"
              titleText="Category"
              label={ALL}
              items={categories}
              selectedItem={category}
              onChange={({ selectedItem }: any) => setCategory(selectedItem)}
            />
            <Dropdown
              id="source"
              titleText="Source"
              label={ALL}
              items={sources}
              selectedItem={source}
              onChange={({ selectedItem }: any) => setSource(selectedItem)}
            />
          </div>

          {data && activeTab === "daily" && (
            <div style={{ marginBottom: 12, opacity: 0.85 }}>
              Time budget: <b>{data.daily.minutesBudget} min</b> • Selected: <b>{data.daily.totalMinutes} min</b>
            </div>
          )}

          <div className="article-grid">
            {filtered.map((a) => (
              <Tile key={a.id} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.3 }}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
                      {a.title}
                    </a>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Tag type="cool-gray">{a.category}</Tag>
                    {a.matchedIndustry?.industry && <Tag type="purple">🏢 {a.matchedIndustry.industry}</Tag>}
                    {a.matchedClient?.name && <Tag type="magenta">👤 {a.matchedClient.name}</Tag>}
                  </div>
                </div>

                {a.summary && (
                  <div style={{ opacity: 0.85, marginTop: 8, lineHeight: 1.45 }}>
                    {a.summary}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 10, opacity: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                  <span>{a.sourceName}</span>
                  <span>•</span>
                  <span>{new Date(a.publishedDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{a.estimatedReadingMinutes} min</span>
                  <span>•</span>
                  <span>Score {a.relevanceScore.toFixed(2)}</span>

                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription="Open"
                    renderIcon={Launch}
                    onClick={() => window.open(a.url, "_blank", "noopener,noreferrer")}
                    style={{ marginLeft: "auto" }}
                  />
                </div>
              </Tile>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ marginTop: 24, opacity: 0.8 }}>
              No matches. Try clearing filters or search.
            </div>
          )}
        </div>
      </Column>
    </Grid>
  );
}

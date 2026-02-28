import { useEffect, useMemo, useState } from "react";
import {
  Theme,
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Content,
  Tabs,
  TabList,
  Tab,
  Grid,
  Column,
  Search,
  Dropdown,
  Tag,
  Tile,
  InlineLoading,
} from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import type { DigestPayload, DigestArticle } from "./types";

const categories = ["All", "AI", "APAC", "Security", "Sovereignty", "Platforms", "Competitive"];

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [digest, setDigest] = useState<DigestPayload | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");
  const [refreshing, setRefreshing] = useState(false);

  async function loadDigest() {
    const url = `${import.meta.env.BASE_URL}data/digest.json`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as DigestPayload;
    setDigest(data);
  }

  useEffect(() => {
    loadDigest().catch(() => setDigest({ generatedAt: "", total: 0, articles: [] }));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = digest?.articles ?? [];
    return list.filter((a) => {
      const okCat = cat === "All" || a.category === cat;
      const okQ =
        !q ||
        (a.title + " " + a.summary + " " + a.sourceName)
          .toLowerCase()
          .includes(q);
      return okCat && okQ;
    });
  }, [digest, query, cat]);

  return (
    <Theme theme="g100">
      <Header aria-label="The Signal Reader">
        <HeaderName href={import.meta.env.BASE_URL} prefix="">
          The Signal Reader
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Reload"
            tooltipAlignment="end"
            onClick={async () => {
              setRefreshing(true);
              try {
                await loadDigest();
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <Renew size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <Content>
        <div className="signal-container">
          <Tabs
            selectedIndex={selectedIndex}
            onChange={(e: { selectedIndex: number }) => setSelectedIndex(e.selectedIndex)}
          >
            <TabList aria-label="Sections">
              <Tab>Digest</Tab>
              <Tab>Sources</Tab>
              <Tab>Settings</Tab>
            </TabList>
          </Tabs>

          {selectedIndex === 0 && (
            <Grid fullWidth style={{ marginTop: 16 }}>
              <Column sm={4} md={8} lg={16}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <Search
                    size="lg"
                    labelText="Search"
                    placeholder="Search articles, sources, keywords"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                  />
                  <Dropdown
                    id="category"
                    titleText="Category"
                    label="All"
                    items={categories}
                    selectedItem={cat}
                    onChange={({ selectedItem }: { selectedItem: string }) => setCat(selectedItem)}
                  />
                  <Tag type="gray">
                    Updated{" "}
                    {digest?.generatedAt
                      ? new Date(digest.generatedAt).toLocaleString()
                      : "—"}
                  </Tag>
                  {refreshing && <InlineLoading description="Reloading" />}
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {(filtered ?? []).map((a: DigestArticle) => (
                    <Tile key={a.id} style={{ padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 600, fontSize: 16, lineHeight: "1.35" }}>
                          <a href={a.url} target="_blank" rel="noreferrer">
                            {a.title}
                          </a>
                        </div>
                        <Tag type="cool-gray">{a.category}</Tag>
                      </div>
                      {a.summary && (
                        <div style={{ opacity: 0.85, marginTop: 8 }}>
                          {a.summary}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10, marginTop: 10, opacity: 0.75, flexWrap: "wrap" }}>
                        <span>{a.sourceName}</span>
                        <span>•</span>
                        <span>{new Date(a.publishedDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Score {a.relevanceScore.toFixed(2)}</span>
                      </div>
                    </Tile>
                  ))}
                  {!digest && <InlineLoading description="Loading digest" />}
                  {digest && filtered.length === 0 && (
                    <Tile style={{ padding: 16 }}>No matches.</Tile>
                  )}
                </div>
              </Column>
            </Grid>
          )}

          {selectedIndex === 1 && (
            <Tile style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Sources</div>
              <div style={{ opacity: 0.85 }}>
                Edit <code>scripts/defaultConfig/sources.json</code> in the repo and commit.
              </div>
              <div style={{ opacity: 0.85, marginTop: 8 }}>
                Then run <b>Actions → Refresh Digest Data</b> once to regenerate <code>digest.json</code>.
              </div>
            </Tile>
          )}

          {selectedIndex === 2 && (
            <Tile style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Settings</div>
              <div style={{ opacity: 0.85 }}>
                Adjust weights/time budget in <code>scripts/defaultConfig/settings.json</code>.
              </div>
            </Tile>
          )}
        </div>
      </Content>
    </Theme>
  );
}

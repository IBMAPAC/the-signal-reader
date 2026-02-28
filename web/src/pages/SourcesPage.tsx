import { useEffect, useMemo, useState } from "react";
import {
  Grid, Column, Search, Dropdown, Tag, Tile, InlineLoading, Button,
} from "@carbon/react";
import { Launch } from "@carbon/icons-react";

type Source = {
  name: string;
  url: string;
  category: string;
  priority: number;
  credibilityScore: number;
  digestType: "daily" | "weekly" | "both";
  isEnabled: boolean;
  isUserAdded: boolean;
};

const ALL = "All";

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/sources.json`)
      .then(r => r.json())
      .then(setSources)
      .catch(() => setSources([]));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>([ALL]);
    for (const s of sources ?? []) set.add(s.category);
    return Array.from(set).sort((a, b) => (a === ALL ? -1 : b === ALL ? 1 : a.localeCompare(b)));
  }, [sources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sources ?? []).filter(s => {
      const okCat = category === ALL || s.category === category;
      const hay = `${s.name} ${s.category} ${s.url}`.toLowerCase();
      const okQ = !q || hay.includes(q);
      return okCat && okQ;
    });
  }, [sources, query, category]);

  if (!sources) {
    return (
      <div className="reader-max" style={{ paddingTop: 16 }}>
        <InlineLoading description="Loading sources…" />
      </div>
    );
  }

  return (
    <Grid fullWidth>
      <Column sm={4} md={8} lg={16}>
        <div className="reader-max" style={{ paddingTop: 8 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "16px 0" }}>
            <Search
              size="lg"
              labelText="Search"
              placeholder="Search sources"
              onChange={(e: any) => setQuery(e.target.value)}
            />
            <Dropdown
              id="cat"
              titleText="Category"
              label={ALL}
              items={categories}
              selectedItem={category}
              onChange={({ selectedItem }: any) => setCategory(selectedItem)}
            />
            <Tag type="gray">{filtered.length} sources</Tag>
          </div>

          <div className="article-grid">
            {filtered.map((s) => (
              <Tile key={s.url} style={{ padding: 16, opacity: s.isEnabled ? 1 : 0.6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 600 }}>
                    {s.name}
                    {!s.isEnabled && <span style={{ marginLeft: 8, opacity: 0.8 }}>(disabled)</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Tag type="cool-gray">{s.category}</Tag>
                    <Tag type="gray">P{s.priority}</Tag>
                    <Tag type="green">{s.digestType}</Tag>
                    <Tag type="purple">{Math.round(s.credibilityScore * 100)}% cred</Tag>
                  </div>
                </div>

                <div style={{ marginTop: 8, opacity: 0.85, wordBreak: "break-word" }}>
                  {s.url}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Launch}
                    onClick={() => window.open(s.url, "_blank", "noopener,noreferrer")}
                  >
                    Open feed
                  </Button>
                </div>
              </Tile>
            ))}
          </div>

          <div style={{ marginTop: 24, opacity: 0.85 }}>
            To change sources, edit <b>scripts/defaultConfig/sources.json</b> in the repo and push to <b>main</b>.
          </div>
        </div>
      </Column>
    </Grid>
  );
}
